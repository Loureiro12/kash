-- Kash — schema v1
-- Convenções: todas as tabelas de domínio têm user_id (= auth.uid()) com RLS; dinheiro em numeric(12,2);
-- escritas multi-linha passam por funções SQL (RPC) que rodam com os privilégios do usuário (security invoker).

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.account_kind as enum ('corrente', 'poupanca', 'carteira', 'investimento');
create type public.source_type as enum ('account', 'card');
create type public.card_gradient as enum ('green', 'graphite', 'blue', 'purple');

-- categorias: mesmos rótulos do domínio (@kash/domain). 'Entrada' e 'Fatura' só em lançamentos.
create domain public.tx_category as text
  check (value in ('Comida', 'Transporte', 'Lazer', 'Mercado', 'Assinaturas', 'Outros', 'Entrada', 'Fatura'));
create domain public.expense_category as text
  check (value in ('Comida', 'Transporte', 'Lazer', 'Mercado', 'Assinaturas', 'Outros'));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.set_user_id()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id = auth.uid();
  end if;
  return new;
end $$;

-- "hoje" no fuso do produto
create or replace function public.kash_today()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create or replace function public.month_key(d date)
returns text language sql immutable as $$
  select to_char(d, 'YYYY-MM')
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  hide_values boolean not null default false,
  bill_reminder boolean not null default true,
  monthly_budget numeric(12,2) not null default 1800 check (monthly_budget > 0),
  biometrics boolean not null default true,
  currency text not null default 'BRL' check (currency in ('BRL')),
  last_rollover_month text not null default public.month_key(public.kash_today()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: dono" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- cria o perfil quando o usuário é criado no Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- accounts / cards
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind public.account_kind not null default 'corrente',
  institution text not null default '',
  opening_balance numeric(12,2) not null default 0,
  color text not null default '#C6F432',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts (user_id, position);
alter table public.accounts enable row level security;
create policy "accounts: dono" on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger accounts_user_id before insert on public.accounts for each row execute function public.set_user_id();
create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  credit_limit numeric(12,2) not null check (credit_limit > 0),
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  gradient public.card_gradient not null default 'green',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_user_idx on public.cards (user_id, position);
alter table public.cards enable row level security;
create policy "cards: dono" on public.cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger cards_user_id before insert on public.cards for each row execute function public.set_user_id();
create trigger cards_updated_at before update on public.cards for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plans (parcelamentos) / bills (contas fixas) / goals / invoices
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  title text not null,
  category public.expense_category not null,
  installments int not null check (installments between 2 and 24),
  current int not null default 1 check (current >= 0),
  per_installment numeric(12,2) not null check (per_installment > 0),
  created_at timestamptz not null default now(),
  constraint plans_current_lte_installments check (current <= installments)
);
create index plans_user_idx on public.plans (user_id, card_id);
alter table public.plans enable row level security;
create policy "plans: dono" on public.plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger plans_user_id before insert on public.plans for each row execute function public.set_user_id();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  total numeric(12,2) not null check (total >= 0),
  paid_tx_id uuid,
  paid_at date,
  created_at timestamptz not null default now(),
  unique (card_id, month)
);
create index invoices_user_idx on public.invoices (user_id, card_id, month);
alter table public.invoices enable row level security;
create policy "invoices: dono" on public.invoices for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger invoices_user_id before insert on public.invoices for each row execute function public.set_user_id();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  category public.tx_category not null,
  -- negativo = saída, positivo = entrada
  amount numeric(12,2) not null check (amount <> 0),
  date date not null default public.kash_today(),
  source_type public.source_type not null,
  source_id uuid not null,
  plan_id uuid references public.plans (id) on delete cascade,
  -- soft delete (único lugar com "desfazer"); deleted_group agrupa parcelas excluídas juntas
  deleted_at timestamptz,
  deleted_group uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tx_sign_matches_category check (
    (category = 'Entrada' and amount > 0) or (category <> 'Entrada' and amount < 0)
  ),
  constraint tx_income_only_accounts check (category <> 'Entrada' or source_type = 'account')
);
create index transactions_user_date_idx on public.transactions (user_id, date desc) where deleted_at is null;
create index transactions_source_idx on public.transactions (user_id, source_type, source_id) where deleted_at is null;
alter table public.transactions enable row level security;
create policy "transactions: dono" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger transactions_user_id before insert on public.transactions for each row execute function public.set_user_id();
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();

alter table public.invoices
  add constraint invoices_paid_tx_fk foreign key (paid_tx_id) references public.transactions (id) on delete set null;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  due_day int not null check (due_day between 1 and 31),
  category public.expense_category not null default 'Outros',
  source_type public.source_type,
  source_id uuid,
  -- lançamento do pagamento do mês corrente (null = a pagar)
  paid_tx_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bills_source_pair check ((source_type is null) = (source_id is null))
);
create index bills_user_idx on public.bills (user_id, due_day);
alter table public.bills enable row level security;
create policy "bills: dono" on public.bills for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger bills_user_id before insert on public.bills for each row execute function public.set_user_id();
create trigger bills_updated_at before update on public.bills for each row execute function public.set_updated_at();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target numeric(12,2) not null check (target > 0),
  saved numeric(12,2) not null default 0 check (saved >= 0),
  monthly numeric(12,2) not null default 0 check (monthly >= 0),
  color text not null default '#6BC5FF',
  account_id uuid references public.accounts (id) on delete set null,
  deposit_day int check (deposit_day between 1 and 31),
  last_deposit_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_saved_lte_target check (saved <= target)
);
create index goals_user_idx on public.goals (user_id);
alter table public.goals enable row level security;
create policy "goals: dono" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger goals_user_id before insert on public.goals for each row execute function public.set_user_id();
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
-- saldo = abertura + Σ lançamentos ativos da conta (entradas, saídas e pagamentos de fatura)
create view public.account_balances with (security_invoker = true) as
  select a.id as account_id,
         a.user_id,
         (a.opening_balance + coalesce(sum(t.amount), 0))::numeric(12,2) as balance
    from public.accounts a
    left join public.transactions t
      on t.source_type = 'account' and t.source_id = a.id and t.deleted_at is null
   group by a.id;

create view public.accounts_with_balance with (security_invoker = true) as
  select a.*, b.balance
    from public.accounts a
    join public.account_balances b on b.account_id = a.id;

-- fatura atual = Σ saídas ativas do cartão no mês corrente
create view public.card_usage with (security_invoker = true) as
  select c.id as card_id,
         c.user_id,
         coalesce(sum(-t.amount) filter (where t.date >= date_trunc('month', public.kash_today())::date), 0)::numeric(12,2) as used
    from public.cards c
    left join public.transactions t
      on t.source_type = 'card' and t.source_id = c.id and t.deleted_at is null and t.amount < 0
   group by c.id;

-- ---------------------------------------------------------------------------
-- RPCs (security invoker: RLS continua valendo)
-- ---------------------------------------------------------------------------

-- Lança um gasto parcelado: cria o plano e a primeira parcela. Retorna o id do plano.
create or replace function public.add_installment_purchase(
  p_title text, p_category public.expense_category, p_card_id uuid, p_total numeric, p_installments int, p_date date default public.kash_today()
) returns uuid language plpgsql as $$
declare
  v_plan uuid;
  v_per numeric(12,2);
begin
  if p_installments < 2 then
    raise exception 'installments must be >= 2';
  end if;
  v_per := round(p_total / p_installments, 2);
  insert into public.plans (card_id, title, category, installments, current, per_installment)
  values (p_card_id, p_title, p_category, p_installments, 1, v_per)
  returning id into v_plan;
  insert into public.transactions (title, category, amount, date, source_type, source_id, plan_id)
  values (format('%s (1/%s)', p_title, p_installments), p_category, -v_per, p_date, 'card', p_card_id, v_plan);
  return v_plan;
end $$;

-- Marca a conta fixa como paga criando o lançamento do mês.
create or replace function public.pay_bill(p_bill_id uuid, p_date date default public.kash_today())
returns uuid language plpgsql as $$
declare
  b public.bills%rowtype;
  v_tx uuid;
begin
  select * into b from public.bills where id = p_bill_id for update;
  if not found then raise exception 'bill not found'; end if;
  if b.paid_tx_id is not null then return b.paid_tx_id; end if;
  if b.source_type is null then raise exception 'bill has no source'; end if;
  insert into public.transactions (title, category, amount, date, source_type, source_id)
  values (b.name, b.category, -b.amount, p_date, b.source_type, b.source_id)
  returning id into v_tx;
  update public.bills set paid_tx_id = v_tx where id = p_bill_id;
  return v_tx;
end $$;

-- Desfaz o pagamento: apaga o lançamento gerado.
create or replace function public.unpay_bill(p_bill_id uuid)
returns void language plpgsql as $$
declare
  v_tx uuid;
begin
  select paid_tx_id into v_tx from public.bills where id = p_bill_id for update;
  if v_tx is null then return; end if;
  update public.bills set paid_tx_id = null where id = p_bill_id;
  delete from public.transactions where id = v_tx;
end $$;

-- Paga a fatura debitando a conta; lançamento de categoria 'Fatura' (não é gasto do mês).
create or replace function public.pay_invoice(p_invoice_id uuid, p_account_id uuid, p_date date default public.kash_today())
returns uuid language plpgsql as $$
declare
  i public.invoices%rowtype;
  v_card_name text;
  v_tx uuid;
begin
  select * into i from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'invoice not found'; end if;
  if i.paid_tx_id is not null then return i.paid_tx_id; end if;
  select name into v_card_name from public.cards where id = i.card_id;
  insert into public.transactions (title, category, amount, date, source_type, source_id)
  values (format('Fatura %s', v_card_name), 'Fatura', -i.total, p_date, 'account', p_account_id)
  returning id into v_tx;
  update public.invoices set paid_tx_id = v_tx, paid_at = p_date where id = p_invoice_id;
  return v_tx;
end $$;

-- Registra um depósito numa meta (sem passar do alvo).
create or replace function public.record_goal_deposit(p_goal_id uuid, p_amount numeric, p_account_id uuid default null, p_date date default public.kash_today())
returns void language plpgsql as $$
begin
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  update public.goals
     set saved = least(target, saved + p_amount),
         last_deposit_date = p_date,
         account_id = coalesce(p_account_id, account_id)
   where id = p_goal_id;
  if not found then raise exception 'goal not found'; end if;
end $$;

-- Exclui um cartão com lançamentos, parcelamentos e faturas; contas fixas cobradas nele ficam sem origem.
create or replace function public.delete_card(p_card_id uuid)
returns void language plpgsql as $$
begin
  update public.bills set source_type = null, source_id = null where source_type = 'card' and source_id = p_card_id;
  delete from public.transactions where source_type = 'card' and source_id = p_card_id;
  delete from public.cards where id = p_card_id; -- plans/invoices caem por cascade
end $$;

-- Exclui uma conta com seus lançamentos; contas fixas e metas ligadas ficam sem conta.
create or replace function public.delete_account(p_account_id uuid)
returns void language plpgsql as $$
begin
  update public.bills set source_type = null, source_id = null where source_type = 'account' and source_id = p_account_id;
  delete from public.transactions where source_type = 'account' and source_id = p_account_id;
  delete from public.accounts where id = p_account_id; -- goals.account_id vira null por FK
end $$;

-- Soft delete de lançamento ('single') ou de todas as parcelas do plano ('plan'). Retorna o grupo (para desfazer).
create or replace function public.soft_delete_transaction(p_tx_id uuid, p_scope text default 'single')
returns uuid language plpgsql as $$
declare
  t public.transactions%rowtype;
  v_group uuid := gen_random_uuid();
begin
  select * into t from public.transactions where id = p_tx_id and deleted_at is null for update;
  if not found then raise exception 'transaction not found'; end if;
  if t.plan_id is not null and p_scope = 'plan' then
    update public.transactions set deleted_at = now(), deleted_group = v_group where plan_id = t.plan_id and deleted_at is null;
    update public.plans set current = 0 where id = t.plan_id;
  else
    update public.transactions set deleted_at = now(), deleted_group = v_group where id = p_tx_id;
    if t.plan_id is not null then
      update public.plans set current = greatest(0, current - 1) where id = t.plan_id;
    end if;
  end if;
  -- pagamento de conta fixa / fatura volta a "em aberto" (ligação é refeita no undo)
  update public.bills set paid_tx_id = null where paid_tx_id in (select id from public.transactions where deleted_group = v_group);
  update public.invoices set paid_tx_id = null, paid_at = null where paid_tx_id in (select id from public.transactions where deleted_group = v_group);
  return v_group;
end $$;

-- Desfaz uma exclusão pelo grupo: restaura lançamentos e religa conta fixa/fatura pelo título+data quando possível.
create or replace function public.undo_delete_transaction(p_group uuid)
returns int language plpgsql as $$
declare
  v_count int;
  r record;
begin
  update public.transactions set deleted_at = null, deleted_group = null where deleted_group = p_group and deleted_at is not null;
  get diagnostics v_count = row_count;
  for r in select distinct plan_id from public.transactions where deleted_group is null and plan_id is not null and id in (
             select id from public.transactions where plan_id is not null) loop
    update public.plans p set current = (select count(*) from public.transactions where plan_id = p.id and deleted_at is null) where p.id = r.plan_id;
  end loop;
  return v_count;
end $$;

-- Virada de mês do usuário corrente: fecha faturas, zera contas fixas pagas e lança parcelas; idempotente.
create or replace function public.ensure_rollover()
returns int language plpgsql as $$
declare
  v_uid uuid := auth.uid();
  v_last text;
  v_current text := public.month_key(public.kash_today());
  v_month date;
  v_closed text;
  v_processed int := 0;
  c record;
  p record;
begin
  select last_rollover_month into v_last from public.profiles where id = v_uid for update;
  if v_last is null or v_last >= v_current then return 0; end if;
  v_month := (to_date(v_last, 'YYYY-MM') + interval '1 month')::date;
  while public.month_key(v_month) <= v_current loop
    v_closed := public.month_key((v_month - interval '1 month')::date);
    -- 1. fatura fechada do mês anterior, por cartão
    for c in select id from public.cards where user_id = v_uid loop
      insert into public.invoices (card_id, month, total)
      select c.id, v_closed, coalesce(sum(-t.amount), 0)
        from public.transactions t
       where t.source_type = 'card' and t.source_id = c.id and t.deleted_at is null and t.amount < 0
         and public.month_key(t.date) = v_closed
      having coalesce(sum(-t.amount), 0) > 0
      on conflict (card_id, month) do nothing;
    end loop;
    -- 2. contas fixas voltam a "a pagar"
    update public.bills set paid_tx_id = null where user_id = v_uid and paid_tx_id is not null;
    -- 3. próxima parcela de cada plano
    for p in select * from public.plans where user_id = v_uid and current < installments for update loop
      insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, plan_id)
      values (v_uid, format('%s (%s/%s)', p.title, p.current + 1, p.installments), p.category, -p.per_installment, v_month, 'card', p.card_id, p.id);
      update public.plans set current = current + 1 where id = p.id;
    end loop;
    v_processed := v_processed + 1;
    v_month := (v_month + interval '1 month')::date;
  end loop;
  update public.profiles set last_rollover_month = v_current where id = v_uid;
  return v_processed;
end $$;

-- Versão para o agendador: roda a virada para todos os usuários (security definer, não exposta via API).
create or replace function public.rollover_all()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_total int := 0;
begin
  for v_uid in select id from public.profiles where last_rollover_month < public.month_key(public.kash_today()) loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    v_total := v_total + public.ensure_rollover();
  end loop;
  return v_total;
end $$;
revoke execute on function public.rollover_all() from anon, authenticated;

-- diariamente às 03:05 UTC (00:05 em Brasília)
select cron.schedule('kash-rollover-daily', '5 3 * * *', $$select public.rollover_all()$$);
