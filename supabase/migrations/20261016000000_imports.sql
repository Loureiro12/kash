-- Importar fatura do cartão (PDF/OFX/CSV) ou extrato da conta (OFX/CSV).
-- - transactions/plans guardam o nome original (`original_title`), a importação de origem (`import_id`)
--   e um identificador estável (`external_id`) que impede importar a mesma linha duas vezes.
-- - `imports`: histórico, com "desfazer importação".
-- - `merchant_rules`: o que a pessoa renomeou/categorizou vira regra para as próximas importações.
-- A leitura do arquivo e a montagem dos itens acontecem no cliente (@kash/importers); aqui só gravamos.

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_type public.source_type not null,
  source_id uuid not null,
  file_name text not null default '',
  format text not null check (format in ('pdf', 'ofx', 'csv')),
  -- mês de competência da fatura (yyyy-mm); extrato de conta usa o mês mais recente das linhas
  statement_month text check (statement_month ~ '^[0-9]{4}-[0-9]{2}$'),
  tx_count int not null default 0,
  plan_count int not null default 0,
  skipped_count int not null default 0,
  -- extrato com "manter o saldo de hoje": quanto a abertura da conta foi ajustada (o desfazer devolve)
  balance_adjustment numeric(12,2) not null default 0,
  undone_at timestamptz,
  created_at timestamptz not null default now()
);
create index imports_user_idx on public.imports (user_id, created_at desc);
alter table public.imports enable row level security;
create policy "imports: dono" on public.imports for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger imports_user_id before insert on public.imports for each row execute function public.set_user_id();

alter table public.transactions
  add column original_title text,
  add column import_id uuid references public.imports (id) on delete set null,
  add column external_id text;
create unique index transactions_external_idx on public.transactions (user_id, source_id, external_id)
  where external_id is not null and deleted_at is null;

alter table public.plans
  add column original_title text,
  add column import_id uuid references public.imports (id) on delete set null,
  add column external_id text;
create unique index plans_external_idx on public.plans (user_id, card_id, external_id)
  where external_id is not null and deleted_at is null;

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- descrição normalizada do banco (sem "parcela x/y", números e símbolos): ver normalizeMerchant
  pattern text not null check (length(pattern) between 1 and 120),
  title text not null check (length(trim(title)) between 1 and 80),
  category public.tx_category,
  updated_at timestamptz not null default now(),
  unique (user_id, pattern)
);
alter table public.merchant_rules enable row level security;
create policy "merchant_rules: dono" on public.merchant_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger merchant_rules_user_id before insert on public.merchant_rules for each row execute function public.set_user_id();

-- ---------------------------------------------------------------------------
-- Recalcula as faturas fechadas (meses anteriores ao atual) que receberam lançamentos importados.
-- Fatura já paga fica como está (o pagamento registrado é do valor antigo).
-- ---------------------------------------------------------------------------
create or replace function public.refresh_card_invoices(p_card_id uuid, p_months text[])
returns void language plpgsql as $$
declare
  m text;
  v_total numeric(12,2);
begin
  foreach m in array coalesce(p_months, '{}') loop
    if m >= public.month_key(public.kash_today()) then continue; end if;
    select coalesce(sum(-t.amount), 0) into v_total
      from public.transactions t
     where t.source_type = 'card' and t.source_id = p_card_id and t.deleted_at is null and t.amount < 0
       and public.month_key(t.date) = m;
    if v_total = 0 then
      -- tudo do mês saiu (ex.: desfazer importação): a fatura em aberto deixa de existir
      delete from public.invoices where card_id = p_card_id and month = m and paid_tx_id is null;
      continue;
    end if;
    insert into public.invoices (card_id, month, total) values (p_card_id, m, v_total)
    on conflict (card_id, month) do update set total = excluded.total where public.invoices.paid_tx_id is null;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Fatura do cartão. Itens (jsonb):
--   {type:'plan', title, original_title, category, per, installments, current, current_date,
--    external_id, past_date?, past_installment?}  → parcelamento com a parcela do mês atual
--    (e, no modo "tudo", a parcela da própria fatura no mês dela)
--   {type:'tx', title, original_title, category, amount (positivo), date, external_id} → compra à vista
-- Linhas já importadas (mesmo external_id) são puladas. Devolve o id da importação.
-- ---------------------------------------------------------------------------
create or replace function public.import_card_statement(p_card_id uuid, p_file_name text, p_format text, p_statement_month text, p_items jsonb)
returns uuid language plpgsql as $$
declare
  v_import uuid;
  v_plan uuid;
  v_tx uuid;
  i jsonb;
  v_txs int := 0;
  v_plans int := 0;
  v_skipped int := 0;
  v_months text[] := '{}';
begin
  if not exists (select 1 from public.cards where id = p_card_id) then raise exception 'card not found' using errcode = 'P0002'; end if;
  insert into public.imports (source_type, source_id, file_name, format, statement_month)
  values ('card', p_card_id, coalesce(p_file_name, ''), p_format, p_statement_month) returning id into v_import;

  for i in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if i ->> 'type' = 'plan' then
      insert into public.plans (card_id, title, category, installments, current, per_installment, original_title, import_id, external_id)
      values (p_card_id, i ->> 'title', i ->> 'category', (i ->> 'installments')::int, (i ->> 'current')::int, (i ->> 'per')::numeric,
              i ->> 'original_title', v_import, i ->> 'external_id')
      on conflict (user_id, card_id, external_id) where external_id is not null and deleted_at is null do nothing
      returning id into v_plan;
      if v_plan is null then v_skipped := v_skipped + 1; continue; end if;
      insert into public.transactions (title, category, amount, date, source_type, source_id, plan_id, original_title, import_id)
      values (format('%s (%s/%s)', i ->> 'title', i ->> 'current', i ->> 'installments'), i ->> 'category', -(i ->> 'per')::numeric,
              (i ->> 'current_date')::date, 'card', p_card_id, v_plan, i ->> 'original_title', v_import);
      v_months := v_months || public.month_key((i ->> 'current_date')::date);
      if i ? 'past_date' and i ->> 'past_date' is not null then
        insert into public.transactions (title, category, amount, date, source_type, source_id, plan_id, original_title, import_id)
        values (format('%s (%s/%s)', i ->> 'title', i ->> 'past_installment', i ->> 'installments'), i ->> 'category', -(i ->> 'per')::numeric,
                (i ->> 'past_date')::date, 'card', p_card_id, v_plan, i ->> 'original_title', v_import);
        v_txs := v_txs + 1;
        v_months := v_months || public.month_key((i ->> 'past_date')::date);
      end if;
      v_plans := v_plans + 1;
      v_plan := null;
    else
      insert into public.transactions (title, category, amount, date, source_type, source_id, original_title, import_id, external_id)
      values (i ->> 'title', i ->> 'category', -abs((i ->> 'amount')::numeric), (i ->> 'date')::date, 'card', p_card_id,
              i ->> 'original_title', v_import, i ->> 'external_id')
      on conflict (user_id, source_id, external_id) where external_id is not null and deleted_at is null do nothing
      returning id into v_tx;
      if v_tx is null then v_skipped := v_skipped + 1; continue; end if;
      v_txs := v_txs + 1;
      v_months := v_months || public.month_key((i ->> 'date')::date);
      v_tx := null;
    end if;
  end loop;

  perform public.refresh_card_invoices(p_card_id, (select array_agg(distinct m) from unnest(v_months) m));
  update public.imports set tx_count = v_txs, plan_count = v_plans, skipped_count = v_skipped where id = v_import;
  return v_import;
end $$;

-- ---------------------------------------------------------------------------
-- Extrato da conta. Itens: {title, original_title, category, amount (com sinal: entrada > 0), date, external_id}.
-- p_keep_balance: o saldo de hoje não muda (a abertura da conta absorve o histórico importado).
-- ---------------------------------------------------------------------------
create or replace function public.import_account_statement(p_account_id uuid, p_file_name text, p_format text, p_items jsonb, p_keep_balance boolean default true)
returns uuid language plpgsql as $$
declare
  v_import uuid;
  v_tx uuid;
  i jsonb;
  v_amount numeric(12,2);
  v_sum numeric(12,2) := 0;
  v_txs int := 0;
  v_skipped int := 0;
  v_last date;
begin
  if not exists (select 1 from public.accounts where id = p_account_id) then raise exception 'account not found' using errcode = 'P0002'; end if;
  insert into public.imports (source_type, source_id, file_name, format)
  values ('account', p_account_id, coalesce(p_file_name, ''), p_format) returning id into v_import;

  for i in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_amount := round((i ->> 'amount')::numeric, 2);
    if v_amount = 0 then v_skipped := v_skipped + 1; continue; end if;
    insert into public.transactions (title, category, amount, date, source_type, source_id, original_title, import_id, external_id)
    values (i ->> 'title', case when v_amount > 0 then 'Entrada' else i ->> 'category' end, v_amount, (i ->> 'date')::date, 'account', p_account_id,
            i ->> 'original_title', v_import, i ->> 'external_id')
    on conflict (user_id, source_id, external_id) where external_id is not null and deleted_at is null do nothing
    returning id into v_tx;
    if v_tx is null then v_skipped := v_skipped + 1; continue; end if;
    v_sum := v_sum + v_amount;
    v_txs := v_txs + 1;
    v_last := greatest(coalesce(v_last, (i ->> 'date')::date), (i ->> 'date')::date);
    v_tx := null;
  end loop;

  if p_keep_balance and v_sum <> 0 then
    update public.accounts set opening_balance = opening_balance - v_sum where id = p_account_id;
  end if;
  update public.imports
     set tx_count = v_txs, skipped_count = v_skipped, statement_month = public.month_key(v_last),
         balance_adjustment = case when p_keep_balance then -v_sum else 0 end
   where id = v_import;
  return v_import;
end $$;

-- Desfaz uma importação inteira: lançamentos e parcelamentos dela saem, a abertura da conta volta
-- e as faturas fechadas afetadas são recalculadas.
create or replace function public.undo_import(p_import_id uuid)
returns int language plpgsql as $$
declare
  imp public.imports%rowtype;
  v_group uuid := gen_random_uuid();
  v_count int;
  v_months text[];
begin
  select * into imp from public.imports where id = p_import_id and undone_at is null for update;
  if not found then raise exception 'import not found' using errcode = 'P0002'; end if;
  select array_agg(distinct public.month_key(date)) into v_months from public.transactions where import_id = p_import_id and deleted_at is null;
  update public.transactions set deleted_at = now(), deleted_group = v_group where import_id = p_import_id and deleted_at is null;
  get diagnostics v_count = row_count;
  update public.plans set deleted_at = now(), deleted_group = v_group where import_id = p_import_id and deleted_at is null;
  if imp.source_type = 'account' and imp.balance_adjustment <> 0 then
    update public.accounts set opening_balance = opening_balance - imp.balance_adjustment where id = imp.source_id;
  end if;
  if imp.source_type = 'card' then perform public.refresh_card_invoices(imp.source_id, v_months); end if;
  update public.imports set undone_at = now() where id = p_import_id;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Leitura de PDF com IA: registro de uso (limite diário por pessoa e custo). Só o service role escreve.
-- ---------------------------------------------------------------------------
create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null default 'import',
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index ai_calls_user_idx on public.ai_calls (user_id, created_at desc);
alter table public.ai_calls enable row level security;
create policy "ai_calls: dono lê" on public.ai_calls for select using (user_id = auth.uid());
