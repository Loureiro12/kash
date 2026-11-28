-- Conta compartilhada do casal (app 1.3.0).
--
-- Um "espaço" (household) de até 2 pessoas, criado por convite com código. Cada conta, cartão, conta
-- fixa ou meta pode ser compartilhada (household_id); lançamentos, parcelados e faturas herdam o
-- household da conta/cartão em que acontecem. Regras de acesso:
--   • compartilhado: as duas pessoas leem e escrevem;
--   • pessoal: só o dono escreve; a outra pessoa só lê se o dono permitir (share_personal).
-- Todo lançamento no espaço compartilhado gera um push no celular da outra pessoa (Expo Push).
-- Os dados continuam com o user_id de quem criou: a virada de mês (por dono e pelo cron) segue igual.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nossa conta' check (char_length(btrim(name)) between 1 and 40),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  -- uma pessoa participa de um espaço só
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- a outra pessoa vê meus dados pessoais (só leitura)?
  share_personal boolean not null default false,
  -- o que eu vejo no app: tudo / o meu e o compartilhado / só o compartilhado
  view_scope text not null default 'all' check (view_scope in ('all', 'mine_shared', 'shared')),
  -- avisos dos lançamentos da outra pessoa: no espaço compartilhado, também os pessoais que ela me mostra, ou nenhum
  notify_scope text not null default 'shared' check (notify_scope in ('shared', 'all_visible', 'off')),
  -- mostrar o valor no aviso (desligado: "Ana lançou um gasto")
  notify_values boolean not null default true,
  joined_at timestamptz not null default now()
);
create index household_members_household_idx on public.household_members (household_id);

create table public.household_invites (
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- tokens de push (Expo) de cada aparelho da pessoa
create table public.push_tokens (
  token text primary key check (char_length(token) between 10 and 200),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "push_tokens: dono" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- registro dos avisos enviados (limita a rajada: importação de extrato vira um aviso só)
create table public.household_push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index household_push_log_idx on public.household_push_log (user_id, sent_at desc);
alter table public.household_push_log enable row level security;

-- ---------------------------------------------------------------------------
-- Funções de acesso (security definer: leem household_members sem depender da RLS dela)
-- ---------------------------------------------------------------------------
create or replace function public.my_household()
returns uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

-- pode ler: é meu, é do meu espaço, ou é pessoal da outra pessoa e ela compartilha o pessoal
create or replace function public.kash_can_read(p_owner uuid, p_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_owner = auth.uid()
      or (p_household is not null and p_household = public.my_household())
      or exists (
           select 1 from public.household_members m
            where m.user_id = p_owner and m.share_personal
              and m.household_id = public.my_household()
         )
$$;

-- pode escrever: é meu ou é do meu espaço
create or replace function public.kash_can_write(p_owner uuid, p_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_owner = auth.uid() or (p_household is not null and p_household = public.my_household())
$$;

-- usadas nas políticas de acesso: quem consulta precisa poder executá-las (sem sessão, devolvem falso)
revoke all on function public.my_household() from public;
revoke all on function public.kash_can_read(uuid, uuid) from public;
revoke all on function public.kash_can_write(uuid, uuid) from public;
grant execute on function public.my_household() to anon, authenticated, service_role;
grant execute on function public.kash_can_read(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.kash_can_write(uuid, uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- household_id nas tabelas de dados e as novas regras de acesso
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'cards', 'plans', 'invoices', 'transactions', 'bills', 'goals'] loop
    execute format('alter table public.%I add column household_id uuid references public.households (id) on delete set null', t);
    execute format('create index %I on public.%I (household_id) where household_id is not null', t || '_household_idx', t);
    execute format('drop policy if exists %I on public.%I', t || ': dono', t);
    execute format('create policy %I on public.%I for select using (public.kash_can_read(user_id, household_id))', t || ': ler', t);
    execute format('create policy %I on public.%I for insert with check (public.kash_can_write(user_id, household_id))', t || ': criar', t);
    execute format('create policy %I on public.%I for update using (public.kash_can_write(user_id, household_id)) with check (public.kash_can_write(user_id, household_id))', t || ': alterar', t);
    execute format('create policy %I on public.%I for delete using (public.kash_can_write(user_id, household_id))', t || ': apagar', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Herança do household e checagem da origem
-- ---------------------------------------------------------------------------
-- Lançamento: herda o household da conta/cartão. Só pode acontecer numa conta/cartão em que a pessoa
-- pode escrever (ver a conta pessoal da outra pessoa não dá direito de lançar nela).
create or replace function public.tx_inherit_household()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_household uuid;
begin
  if new.source_type = 'account' then
    select user_id, household_id into v_owner, v_household from public.accounts where id = new.source_id;
  else
    select user_id, household_id into v_owner, v_household from public.cards where id = new.source_id;
  end if;
  if v_owner is null then
    return new; -- origem inexistente: a FK/validação de sempre responde
  end if;
  -- auth.uid() nulo = cron/serviço (virada de mês): confia
  if auth.uid() is not null and tg_op = 'INSERT' and not (v_owner = auth.uid() or (v_household is not null and v_household = public.my_household())) then
    raise exception 'source not allowed' using errcode = '42501';
  end if;
  new.household_id := v_household;
  return new;
end $$;
create trigger transactions_household before insert or update of source_id, source_type on public.transactions
  for each row execute function public.tx_inherit_household();

-- parcelado e fatura: herdam do cartão
create or replace function public.card_child_inherit_household()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select household_id into new.household_id from public.cards where id = new.card_id;
  return new;
end $$;
create trigger plans_household before insert or update of card_id on public.plans for each row execute function public.card_child_inherit_household();
create trigger invoices_household before insert on public.invoices for each row execute function public.card_child_inherit_household();

-- conta fixa cobrada numa conta/cartão compartilhado é compartilhada
create or replace function public.bill_inherit_household()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid;
begin
  if new.source_type = 'account' then
    select household_id into v_household from public.accounts where id = new.source_id;
  elsif new.source_type = 'card' then
    select household_id into v_household from public.cards where id = new.source_id;
  end if;
  if v_household is not null then new.household_id := v_household; end if;
  return new;
end $$;
create trigger bills_household before insert or update of source_id, source_type on public.bills for each row execute function public.bill_inherit_household();

-- compartilhar (ou deixar de compartilhar) uma conta/cartão leva os lançamentos, parcelados e faturas juntos
create or replace function public.cascade_source_household()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.household_id is not distinct from old.household_id then return new; end if;
  if tg_table_name = 'accounts' then
    update public.transactions set household_id = new.household_id where source_type = 'account' and source_id = new.id;
    update public.bills set household_id = new.household_id where source_type = 'account' and source_id = new.id;
  else
    update public.transactions set household_id = new.household_id where source_type = 'card' and source_id = new.id;
    update public.plans set household_id = new.household_id where card_id = new.id;
    update public.invoices set household_id = new.household_id where card_id = new.id;
    update public.bills set household_id = new.household_id where source_type = 'card' and source_id = new.id;
  end if;
  return new;
end $$;
create trigger accounts_household_cascade after update of household_id on public.accounts for each row execute function public.cascade_source_household();
create trigger cards_household_cascade after update of household_id on public.cards for each row execute function public.cascade_source_household();

-- só dá para marcar como compartilhado no próprio espaço
create or replace function public.check_household_target()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.household_id is not null and auth.uid() is not null and new.household_id is distinct from public.my_household() then
    raise exception 'household not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'cards', 'bills', 'goals'] loop
    execute format('create trigger %I before insert or update of household_id on public.%I for each row execute function public.check_household_target()', t || '_household_target', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Tempo real: o aviso de mudança também vai para a outra pessoa quando a linha é do espaço
-- compartilhado (ou é pessoal de quem compartilha o pessoal)
-- ---------------------------------------------------------------------------
create or replace function public.notify_user_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_uid text := case when tg_table_name = 'profiles' then v_row ->> 'id' else v_row ->> 'user_id' end;
  v_household uuid := nullif(v_row ->> 'household_id', '')::uuid;
  v_target uuid;
begin
  if v_uid is null or coalesce(current_setting('kash.silent_realtime', true), '') = 'on' then
    return null;
  end if;
  for v_target in
    select v_uid::uuid
    union
    select m.user_id from public.household_members m
     where m.household_id = v_household
    union
    select other.user_id from public.household_members me
      join public.household_members other on other.household_id = me.household_id and other.user_id <> me.user_id
     where me.user_id = v_uid::uuid and me.share_personal and tg_table_name <> 'profiles'
  loop
    begin
      perform realtime.send(jsonb_build_object('table', tg_table_name, 'op', lower(tg_op)), 'changed', 'user:' || v_target::text, true);
    exception when others then
      raise warning 'notify_user_change: %', sqlerrm;
    end;
  end loop;
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Push: lançamento no espaço compartilhado → aviso no celular da outra pessoa
-- ---------------------------------------------------------------------------
-- Texto do aviso (puro, testável): "Ana lançou R$ 45,90 · iFood (Comida)"
create or replace function public.household_push_text(p_name text, p_title text, p_category text, p_amount numeric, p_show_values boolean)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_amount > 0 then
      format('%s registrou uma entrada%s · %s', p_name,
             case when p_show_values then ' de R$ ' || replace(replace(replace(to_char(p_amount, 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.') else '' end,
             p_title)
    else
      format('%s lançou %s · %s%s', p_name,
             case when p_show_values then 'R$ ' || replace(replace(replace(to_char(abs(p_amount), 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.') else 'um gasto' end,
             p_title,
             case when p_category is not null and p_category <> p_title then ' (' || p_category || ')' else '' end)
  end
$$;

create or replace function public.notify_household_tx()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid := coalesce(auth.uid(), new.user_id);
  v_name text;
  v_share_personal boolean;
  v_household uuid;
  r record;
  v_messages jsonb := '[]'::jsonb;
begin
  -- só lançamentos feitos por uma pessoa (não a virada de mês nem transferências entre contas)
  if auth.uid() is null or new.transfer_id is not null or new.category = 'Fatura' then
    return null;
  end if;
  select m.household_id, m.share_personal into v_household, v_share_personal from public.household_members m where m.user_id = v_author;
  if v_household is null then return null; end if;
  if new.household_id is null and not v_share_personal then return null; end if;
  select split_part(coalesce(nullif(btrim(p.name), ''), 'Seu par'), ' ', 1) into v_name from public.profiles p where p.id = v_author;

  for r in
    select m.user_id, m.notify_values, m.notify_scope
      from public.household_members m
     where m.household_id = v_household and m.user_id <> v_author
       and m.notify_scope <> 'off'
       and (new.household_id is not null or m.notify_scope = 'all_visible')
       -- rajada (importação, vários lançamentos seguidos): um aviso a cada 20 s por pessoa
       and not exists (select 1 from public.household_push_log l where l.user_id = m.user_id and l.sent_at > now() - interval '20 seconds')
  loop
    select v_messages || coalesce(jsonb_agg(jsonb_build_object(
             'to', t.token,
             'title', case when new.household_id is not null then 'Conta compartilhada' else 'Kash' end,
             'body', public.household_push_text(v_name, new.title, new.category::text, new.amount, r.notify_values),
             'sound', 'default',
             'channelId', 'household',
             'data', jsonb_build_object('route', '/transactions', 'kind', 'household-tx')
           )), '[]'::jsonb)
      into v_messages
      from public.push_tokens t where t.user_id = r.user_id;
    insert into public.household_push_log (user_id) values (r.user_id);
  end loop;

  if jsonb_array_length(v_messages) > 0 then
    begin
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
        body := v_messages,
        timeout_milliseconds := 5000
      );
    exception when others then
      -- aviso é melhor esforço: nunca derruba o lançamento
      raise warning 'notify_household_tx: %', sqlerrm;
    end;
  end if;
  return null;
end $$;
create trigger transactions_household_push after insert on public.transactions for each row execute function public.notify_household_tx();

-- ---------------------------------------------------------------------------
-- Convite, entrar, ajustes e sair
-- ---------------------------------------------------------------------------
-- Gera (ou devolve o vigente) código de convite; cria o espaço na primeira vez.
create or replace function public.create_household_invite()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_code text;
  v_invite public.household_invites%rowtype;
begin
  if v_uid is null then raise exception 'não autenticado' using errcode = '42501'; end if;
  select household_id into v_household from public.household_members where user_id = v_uid;
  if v_household is null then
    insert into public.households (created_by) values (v_uid) returning id into v_household;
    insert into public.household_members (household_id, user_id, role) values (v_household, v_uid, 'owner');
  end if;
  if (select count(*) from public.household_members where household_id = v_household) >= 2 then
    raise exception 'household full' using errcode = '23514';
  end if;
  select * into v_invite from public.household_invites
   where household_id = v_household and used_at is null and expires_at > now()
   order by created_at desc limit 1;
  if not found then
    loop
      v_code := upper(substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=OI01', ''), 1, 8));
      exit when char_length(v_code) = 8 and not exists (select 1 from public.household_invites where code = v_code);
    end loop;
    insert into public.household_invites (code, household_id, created_by) values (v_code, v_household, v_uid) returning * into v_invite;
  end if;
  return jsonb_build_object('code', v_invite.code, 'expires_at', v_invite.expires_at, 'household_id', v_household);
end $$;

-- Cancela os convites pendentes.
create or replace function public.cancel_household_invites()
returns void language sql security definer set search_path = '' as $$
  delete from public.household_invites where household_id = public.my_household() and used_at is null
$$;

-- Entra no espaço de quem convidou. Quem estava sozinho num espaço próprio sai dele antes.
create or replace function public.accept_household_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.household_invites%rowtype;
  v_current uuid;
begin
  if v_uid is null then raise exception 'não autenticado' using errcode = '42501'; end if;
  select * into v_invite from public.household_invites where code = upper(btrim(p_code)) for update;
  if not found or v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'invite invalid' using errcode = 'P0002';
  end if;
  if v_invite.created_by = v_uid then raise exception 'own invite' using errcode = '23514'; end if;
  select household_id into v_current from public.household_members where user_id = v_uid;
  if v_current = v_invite.household_id then return v_current; end if;
  if v_current is not null then
    if (select count(*) from public.household_members where household_id = v_current) > 1 then
      raise exception 'already in household' using errcode = '23514';
    end if;
    -- espaço só dela: some (o que estava compartilhado volta a ser pessoal)
    delete from public.households where id = v_current;
  end if;
  if (select count(*) from public.household_members where household_id = v_invite.household_id) >= 2 then
    raise exception 'household full' using errcode = '23514';
  end if;
  insert into public.household_members (household_id, user_id, role) values (v_invite.household_id, v_uid, 'member');
  update public.household_invites set used_by = v_uid, used_at = now() where code = v_invite.code;
  perform realtime.send(jsonb_build_object('table', 'household', 'op', 'join'), 'changed', 'user:' || v_invite.created_by::text, true);
  return v_invite.household_id;
end $$;

-- Como está o espaço: membros (com nome), convite pendente e as minhas preferências.
create or replace function public.household_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when h.id is null then null else jsonb_build_object(
    'id', h.id,
    'name', h.name,
    'members', (select jsonb_agg(jsonb_build_object(
                  'user_id', m.user_id, 'name', coalesce(nullif(btrim(p.name), ''), 'Sem nome'), 'role', m.role,
                  'share_personal', m.share_personal, 'view_scope', m.view_scope,
                  'notify_scope', m.notify_scope, 'notify_values', m.notify_values, 'joined_at', m.joined_at
                ) order by m.joined_at)
                  from public.household_members m left join public.profiles p on p.id = m.user_id
                 where m.household_id = h.id),
    'invite', (select jsonb_build_object('code', i.code, 'expires_at', i.expires_at)
                 from public.household_invites i
                where i.household_id = h.id and i.used_at is null and i.expires_at > now()
                order by i.created_at desc limit 1)
  ) end
  from (select 1) one
  left join public.households h on h.id = public.my_household()
$$;

-- Minhas preferências no espaço (o que mostro, o que vejo, os avisos) e o nome do espaço.
create or replace function public.update_household_settings(
  p_share_personal boolean default null, p_view_scope text default null, p_notify_scope text default null, p_notify_values boolean default null, p_name text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.household_members
     set share_personal = coalesce(p_share_personal, share_personal),
         view_scope = coalesce(p_view_scope, view_scope),
         notify_scope = coalesce(p_notify_scope, notify_scope),
         notify_values = coalesce(p_notify_values, notify_values)
   where user_id = v_uid;
  if not found then raise exception 'not in household' using errcode = 'P0002'; end if;
  if p_name is not null then
    update public.households set name = btrim(p_name) where id = public.my_household();
  end if;
end $$;

-- Sai do espaço. O que eu criei no compartilhado fica com a outra pessoa (passa a ser dela);
-- se eu era a última, o espaço some e o compartilhado volta a ser pessoal de quem criou.
create or replace function public.leave_household_for(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid;
  v_other uuid;
  t text;
begin
  select household_id into v_household from public.household_members where user_id = p_user;
  if v_household is null then return; end if;
  select user_id into v_other from public.household_members where household_id = v_household and user_id <> p_user limit 1;
  perform set_config('kash.silent_realtime', 'on', true);
  if v_other is not null then
    foreach t in array array['accounts', 'cards', 'plans', 'invoices', 'transactions', 'bills', 'goals'] loop
      execute format('update public.%I set user_id = $1 where user_id = $2 and household_id = $3', t) using v_other, p_user, v_household;
    end loop;
    delete from public.household_members where user_id = p_user;
    update public.household_members set role = 'owner' where user_id = v_other;
  else
    delete from public.households where id = v_household;
  end if;
  perform set_config('kash.silent_realtime', 'off', true);
  if v_other is not null then
    perform realtime.send(jsonb_build_object('table', 'all', 'op', 'reset'), 'changed', 'user:' || v_other::text, true);
  end if;
end $$;

create or replace function public.leave_household()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'não autenticado' using errcode = '42501'; end if;
  perform public.leave_household_for(auth.uid());
end $$;

revoke all on function public.create_household_invite() from public, anon;
revoke all on function public.cancel_household_invites() from public, anon;
revoke all on function public.accept_household_invite(text) from public, anon;
revoke all on function public.household_overview() from public, anon;
revoke all on function public.update_household_settings(boolean, text, text, boolean, text) from public, anon;
revoke all on function public.leave_household() from public, anon;
revoke all on function public.leave_household_for(uuid) from public, anon, authenticated;
revoke all on function public.notify_household_tx() from public, anon, authenticated;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.cancel_household_invites() to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.household_overview() to authenticated;
grant execute on function public.update_household_settings(boolean, text, text, boolean, text) to authenticated;
grant execute on function public.leave_household() to authenticated;

-- as tabelas do espaço só são lidas e alteradas pelas funções acima
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
create policy "households: membro lê" on public.households for select using (id = public.my_household());
create policy "household_members: do meu espaço" on public.household_members for select using (household_id = public.my_household());

-- tempo real nas preferências do espaço (entrar/sair/mudar a visão)
create trigger household_members_realtime after insert or update or delete on public.household_members
  for each row execute function public.notify_user_change();

-- ---------------------------------------------------------------------------
-- "Zerar meus dados": só o pessoal (o compartilhado continua com o casal)
-- ---------------------------------------------------------------------------
create or replace function public.reset_my_data()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;

  perform set_config('kash.silent_realtime', 'on', true);

  -- ordem pelas chaves estrangeiras: faturas apontam para lançamentos; lançamentos para parcelados,
  -- contas, cartões e importações
  update public.invoices set paid_tx_id = null where user_id = v_uid and household_id is null and paid_tx_id is not null;
  delete from public.debts where user_id = v_uid;
  delete from public.transactions where user_id = v_uid and household_id is null;
  delete from public.invoices where user_id = v_uid and household_id is null;
  delete from public.plans where user_id = v_uid and household_id is null;
  delete from public.bills where user_id = v_uid and household_id is null;
  delete from public.goals where user_id = v_uid and household_id is null;
  delete from public.cards where user_id = v_uid and household_id is null;
  delete from public.accounts where user_id = v_uid and household_id is null;
  delete from public.imports where user_id = v_uid;
  delete from public.merchant_rules where user_id = v_uid;
  delete from public.categories where user_id = v_uid;
  perform public.seed_default_categories(v_uid);

  update public.profiles
     set monthly_budget = default,
         card_budget = default,
         onboarding_done_at = null,
         checklist_hidden_at = null,
         travel_tag = null,
         travel_until = null,
         last_rollover_month = public.month_key(public.kash_today())
   where id = v_uid;

  perform set_config('kash.silent_realtime', 'off', true);
  -- um aviso só: os outros aparelhos da pessoa recarregam tudo
  begin
    perform realtime.send(jsonb_build_object('table', 'all', 'op', 'reset'), 'changed', 'user:' || v_uid::text, true);
  exception when others then
    raise warning 'reset_my_data: %', sqlerrm;
  end;
end $$;

revoke all on function public.reset_my_data() from public, anon;
grant execute on function public.reset_my_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Exportação: o meu e o compartilhado (nunca o pessoal da outra pessoa), mais o espaço
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'format', 'kash-export/1',
    'exported_at', now(),
    'user', (select jsonb_build_object('id', p.id, 'name', p.name, 'email', auth.jwt() ->> 'email', 'phone', p.phone, 'created_at', p.created_at)
               from public.profiles p where p.id = auth.uid()),
    'settings', (select jsonb_build_object('theme', p.theme, 'hide_values', p.hide_values, 'bill_reminder', p.bill_reminder,
                                           'email_reminder', p.email_reminder,
                                           'monthly_budget', p.monthly_budget, 'card_budget', p.card_budget, 'biometrics', p.biometrics, 'currency', p.currency,
                                           'travel_tag', p.travel_tag, 'travel_until', p.travel_until)
                   from public.profiles p where p.id = auth.uid()),
    'categories',   (select coalesce(jsonb_agg(to_jsonb(c) order by c.position), '[]'::jsonb) from public.categories c),
    'accounts',     (select coalesce(jsonb_agg(to_jsonb(a) order by a.position, a.created_at), '[]'::jsonb) from public.accounts a where public.kash_can_write(a.user_id, a.household_id)),
    'cards',        (select coalesce(jsonb_agg(to_jsonb(c) order by c.position, c.created_at), '[]'::jsonb) from public.cards c where public.kash_can_write(c.user_id, c.household_id)),
    'plans',        (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]'::jsonb) from public.plans p where public.kash_can_write(p.user_id, p.household_id)),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date, t.created_at), '[]'::jsonb) from public.transactions t where public.kash_can_write(t.user_id, t.household_id)),
    'bills',        (select coalesce(jsonb_agg(to_jsonb(b) order by b.due_day, b.created_at), '[]'::jsonb) from public.bills b where public.kash_can_write(b.user_id, b.household_id)),
    'goals',        (select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at), '[]'::jsonb) from public.goals g where public.kash_can_write(g.user_id, g.household_id)),
    'invoices',     (select coalesce(jsonb_agg(to_jsonb(i) order by i.month), '[]'::jsonb) from public.invoices i where public.kash_can_write(i.user_id, i.household_id)),
    'household', public.household_overview(),
    'debts',        (select coalesce(jsonb_agg(to_jsonb(d) order by d.date, d.created_at), '[]'::jsonb) from public.debts d),
    'reminder_emails', (select coalesce(jsonb_agg(jsonb_build_object('day', r.day, 'items', r.items, 'sent_at', r.sent_at) order by r.day), '[]'::jsonb)
                          from public.reminder_emails r where r.user_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Conta excluída (pelo app ou pelo painel): o compartilhado passa para a outra pessoa antes de
-- a exclusão em cascata apagar as linhas de quem saiu
-- ---------------------------------------------------------------------------
create or replace function public.handoff_household_on_user_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.leave_household_for(old.id);
  return old;
end $$;
create trigger on_auth_user_deleted_household before delete on auth.users for each row execute function public.handoff_household_on_user_delete();

-- a view foi criada com `a.*` (colunas fixadas na criação): recria para trazer o household_id
drop view public.accounts_with_balance;
create view public.accounts_with_balance with (security_invoker = true) as
  select a.*, b.balance
    from public.accounts a
    join public.account_balances b on b.account_id = a.id;
grant select on public.accounts_with_balance to anon, authenticated, service_role;
