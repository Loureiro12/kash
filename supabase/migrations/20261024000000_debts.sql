-- "Quem me deve" (app 1.3.0): dinheiro emprestado a alguém e contas divididas, com lembrete para
-- cobrar. Não mexe no saldo ao registrar (o gasto da conta dividida já foi lançado); ao receber, a
-- pessoa pode lançar a entrada numa conta (settle_debt), e desfazer apaga essa entrada (unsettle_debt).
-- Também: exportação e "Zerar meus dados" passam a incluir as dívidas e o modo viagem (tags).

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person text not null check (char_length(btrim(person)) between 1 and 40),
  description text not null default '' check (char_length(description) <= 60),
  amount numeric(12,2) not null check (amount > 0),
  -- emprestei (lent) ou dividi uma conta (split)
  kind text not null default 'lent' check (kind in ('lent', 'split')),
  date date not null default public.kash_today(),
  -- quando cobrar (lembrete no app)
  due_date date,
  settled_at date,
  -- entrada lançada ao receber (apagada se desfizer)
  settled_tx_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index debts_user_idx on public.debts (user_id, settled_at);
alter table public.debts enable row level security;
create policy "debts: dono" on public.debts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger debts_realtime after insert or update or delete on public.debts for each row execute function public.notify_user_change();

-- Recebi: marca como pago e, com `p_account_id`, lança a entrada na conta.
create or replace function public.settle_debt(p_debt_id uuid, p_account_id uuid default null, p_date date default public.kash_today())
returns uuid language plpgsql as $$
declare
  d public.debts%rowtype;
  v_tx uuid;
begin
  select * into d from public.debts where id = p_debt_id for update;
  if not found then raise exception 'debt not found'; end if;
  if d.settled_at is not null then return d.settled_tx_id; end if;
  if p_account_id is not null then
    insert into public.transactions (title, category, amount, date, source_type, source_id)
    values (left(case when d.description <> '' then format('%s pagou: %s', d.person, d.description) else format('%s pagou', d.person) end, 80),
            'Entrada', d.amount, p_date, 'account', p_account_id)
    returning id into v_tx;
  end if;
  update public.debts set settled_at = p_date, settled_tx_id = v_tx where id = p_debt_id;
  return v_tx;
end $$;

-- Desfaz o "recebi": volta a pendente e apaga a entrada lançada por ele.
create or replace function public.unsettle_debt(p_debt_id uuid)
returns void language plpgsql as $$
declare
  v_tx uuid;
begin
  select settled_tx_id into v_tx from public.debts where id = p_debt_id for update;
  if not found then raise exception 'debt not found'; end if;
  update public.debts set settled_at = null, settled_tx_id = null where id = p_debt_id;
  if v_tx is not null then delete from public.transactions where id = v_tx; end if;
end $$;

revoke all on function public.settle_debt(uuid, uuid, date) from public, anon;
grant execute on function public.settle_debt(uuid, uuid, date) to authenticated;
revoke all on function public.unsettle_debt(uuid) from public, anon;
grant execute on function public.unsettle_debt(uuid) to authenticated;

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
  update public.invoices set paid_tx_id = null where user_id = v_uid and paid_tx_id is not null;
  delete from public.debts where user_id = v_uid;
  delete from public.transactions where user_id = v_uid;
  delete from public.invoices where user_id = v_uid;
  delete from public.plans where user_id = v_uid;
  delete from public.bills where user_id = v_uid;
  delete from public.goals where user_id = v_uid;
  delete from public.cards where user_id = v_uid;
  delete from public.accounts where user_id = v_uid;
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
    'accounts',     (select coalesce(jsonb_agg(to_jsonb(a) order by a.position, a.created_at), '[]'::jsonb) from public.accounts a),
    'cards',        (select coalesce(jsonb_agg(to_jsonb(c) order by c.position, c.created_at), '[]'::jsonb) from public.cards c),
    'plans',        (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]'::jsonb) from public.plans p),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date, t.created_at), '[]'::jsonb) from public.transactions t),
    'bills',        (select coalesce(jsonb_agg(to_jsonb(b) order by b.due_day, b.created_at), '[]'::jsonb) from public.bills b),
    'goals',        (select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at), '[]'::jsonb) from public.goals g),
    'invoices',     (select coalesce(jsonb_agg(to_jsonb(i) order by i.month), '[]'::jsonb) from public.invoices i),
    'debts',        (select coalesce(jsonb_agg(to_jsonb(d) order by d.date, d.created_at), '[]'::jsonb) from public.debts d),
    'reminder_emails', (select coalesce(jsonb_agg(jsonb_build_object('day', r.day, 'items', r.items, 'sent_at', r.sent_at) order by r.day), '[]'::jsonb)
                          from public.reminder_emails r where r.user_id = auth.uid())
  );
$$;
