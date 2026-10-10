-- Transferência entre contas: dois lançamentos ligados por `transfer_id` (saída na origem, entrada no
-- destino), categoria de sistema 'Transferência'. Saldos continuam vindo da soma dos lançamentos; relatórios
-- e totais de gasto/entrada ignoram a categoria (regras em @kash/domain). Criar, editar e excluir mexem
-- sempre nas duas pernas (RPCs abaixo), e o desfazer restaura as duas.

alter table public.transactions add column transfer_id uuid;
create index transactions_transfer_idx on public.transactions (transfer_id) where transfer_id is not null;

-- sinal: entrada > 0, transferência tem os dois sinais (uma perna de cada), o resto < 0
alter table public.transactions drop constraint tx_sign_matches_category;
alter table public.transactions add constraint tx_sign_matches_category check (
  (category = 'Entrada' and amount > 0)
  or (category = 'Transferência' and transfer_id is not null)
  or (category not in ('Entrada', 'Transferência') and amount < 0)
);
-- só entre contas, e só com a categoria de sistema
alter table public.transactions add constraint tx_transfer_shape check (
  transfer_id is null or (category = 'Transferência' and source_type = 'account' and plan_id is null)
);

-- nome reservado: nenhuma categoria do usuário pode se chamar "Transferência" (NOT VALID: não barra a migração
-- se algum dado antigo já tiver o nome; vale para tudo que for gravado daqui pra frente)
alter domain public.expense_category drop constraint expense_category_check;
alter domain public.expense_category add constraint expense_category_check
  check (length(trim(value)) between 1 and 24 and lower(value) not in ('entrada', 'fatura', 'transferência')) not valid;
alter table public.categories add constraint categories_name_not_transfer check (lower(name) <> 'transferência') not valid;

-- ---------------------------------------------------------------------------
-- RPCs (security invoker: a RLS garante que as contas são da pessoa)
-- ---------------------------------------------------------------------------
create or replace function public.create_transfer(p_from uuid, p_to uuid, p_amount numeric, p_date date default public.kash_today(), p_title text default null)
returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
  v_title text := coalesce(nullif(trim(p_title), ''), 'Transferência');
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be > 0' using errcode = '23514'; end if;
  if p_from = p_to then raise exception 'origin and destination must differ' using errcode = '23514'; end if;
  if (select count(*) from public.accounts where id in (p_from, p_to)) <> 2 then raise exception 'account not found' using errcode = 'P0002'; end if;
  insert into public.transactions (title, category, amount, date, source_type, source_id, transfer_id) values
    (v_title, 'Transferência', -round(p_amount, 2), p_date, 'account', p_from, v_id),
    (v_title, 'Transferência', round(p_amount, 2), p_date, 'account', p_to, v_id);
  return v_id;
end $$;

create or replace function public.update_transfer(p_transfer_id uuid, p_from uuid, p_to uuid, p_amount numeric, p_date date, p_title text default null)
returns void language plpgsql as $$
declare
  v_title text := coalesce(nullif(trim(p_title), ''), 'Transferência');
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be > 0' using errcode = '23514'; end if;
  if p_from = p_to then raise exception 'origin and destination must differ' using errcode = '23514'; end if;
  if (select count(*) from public.accounts where id in (p_from, p_to)) <> 2 then raise exception 'account not found' using errcode = 'P0002'; end if;
  update public.transactions set title = v_title, amount = -round(p_amount, 2), date = p_date, source_id = p_from
   where transfer_id = p_transfer_id and amount < 0 and deleted_at is null;
  if not found then raise exception 'transfer not found' using errcode = 'P0002'; end if;
  update public.transactions set title = v_title, amount = round(p_amount, 2), date = p_date, source_id = p_to
   where transfer_id = p_transfer_id and amount > 0 and deleted_at is null;
end $$;

-- excluir uma perna da transferência leva a outra junto (mesmo grupo → o desfazer restaura as duas)
create or replace function public.soft_delete_transaction(p_tx_id uuid, p_scope text default 'single')
returns uuid language plpgsql as $$
declare
  t public.transactions%rowtype;
  v_group uuid := gen_random_uuid();
begin
  select * into t from public.transactions where id = p_tx_id and deleted_at is null for update;
  if not found then raise exception 'transaction not found'; end if;
  if t.transfer_id is not null then
    update public.transactions set deleted_at = now(), deleted_group = v_group where transfer_id = t.transfer_id and deleted_at is null;
  elsif t.plan_id is not null and p_scope = 'plan' then
    update public.transactions set deleted_at = now(), deleted_group = v_group where plan_id = t.plan_id and deleted_at is null;
    -- o contador fica como está: o desfazer só limpa a marca
    update public.plans set deleted_at = now(), deleted_group = v_group where id = t.plan_id;
  else
    -- uma parcela só: o parcelamento segue e a próxima mantém a numeração
    update public.transactions set deleted_at = now(), deleted_group = v_group where id = p_tx_id;
  end if;
  -- pagamento de conta fixa / fatura volta a "em aberto" (ligação é refeita no undo)
  update public.bills set paid_tx_id = null where paid_tx_id in (select id from public.transactions where deleted_group = v_group);
  update public.invoices set paid_tx_id = null, paid_at = null where paid_tx_id in (select id from public.transactions where deleted_group = v_group);
  return v_group;
end $$;
