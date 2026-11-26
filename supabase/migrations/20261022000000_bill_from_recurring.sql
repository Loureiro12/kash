-- Assinaturas detectadas (app 1.2.0): "Virar conta fixa" cria a conta e, se a cobrança deste mês
-- já foi lançada (à mão ou importada), marca como paga LIGANDO a esse lançamento, sem criar outro.
-- Desmarcar uma conta ligada não apaga o lançamento (ele não foi gerado pela conta fixa).

alter table public.bills add column paid_tx_linked boolean not null default false;

-- Liga um lançamento já existente como o pagamento do mês da conta fixa.
create or replace function public.link_bill_payment(p_bill_id uuid, p_tx_id uuid)
returns void language plpgsql as $$
begin
  -- RLS: só enxerga a própria conta e os próprios lançamentos
  if not exists (
    select 1 from public.transactions
     where id = p_tx_id and amount < 0 and transfer_id is null
       and date_trunc('month', date) = date_trunc('month', public.kash_today())
  ) then
    raise exception 'transaction not found';
  end if;
  update public.bills set paid_tx_id = p_tx_id, paid_tx_linked = true where id = p_bill_id and paid_tx_id is null;
  if not found then raise exception 'bill not found or already paid'; end if;
end $$;
revoke all on function public.link_bill_payment(uuid, uuid) from public, anon;
grant execute on function public.link_bill_payment(uuid, uuid) to authenticated;

-- pay_bill: o lançamento é gerado pela conta (não ligado)
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
  update public.bills set paid_tx_id = v_tx, paid_tx_linked = false where id = p_bill_id;
  return v_tx;
end $$;

-- unpay_bill: só apaga o lançamento que a própria conta gerou
create or replace function public.unpay_bill(p_bill_id uuid)
returns void language plpgsql as $$
declare
  v_tx uuid;
  v_linked boolean;
begin
  select paid_tx_id, paid_tx_linked into v_tx, v_linked from public.bills where id = p_bill_id for update;
  if v_tx is null then return; end if;
  update public.bills set paid_tx_id = null, paid_tx_linked = false where id = p_bill_id;
  if not v_linked then
    delete from public.transactions where id = v_tx;
  end if;
end $$;
