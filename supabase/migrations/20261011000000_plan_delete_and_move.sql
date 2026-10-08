-- Parcelamentos: exclusão de verdade, desfazer correto e troca de cartão.
--
-- Antes: excluir "todas as parcelas" só zerava `current`, então o parcelamento voltava em
-- "parcelas em aberto" e a virada de mês relançava a parcela 1. Excluir "só esta parcela"
-- voltava o contador (a mesma parcela era relançada no mês seguinte) e o desfazer recalculava
-- `current` contando lançamentos, o que quebra parcelamentos iniciados no meio (p_current > 1).
-- Trocar o cartão de uma parcela não levava o parcelamento junto.

alter table public.plans
  add column deleted_at timestamptz,
  add column deleted_group uuid;

-- Dados já afetados: parcelamento sem nenhuma parcela ativa conta como excluído.
update public.plans p
   set deleted_at = now()
 where p.deleted_at is null
   and not exists (select 1 from public.transactions t where t.plan_id = p.id and t.deleted_at is null);

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

create or replace function public.undo_delete_transaction(p_group uuid)
returns int language plpgsql as $$
declare
  v_count int;
begin
  update public.transactions set deleted_at = null, deleted_group = null where deleted_group = p_group and deleted_at is not null;
  get diagnostics v_count = row_count;
  update public.plans set deleted_at = null, deleted_group = null where deleted_group = p_group;
  return v_count;
end $$;

-- Leva o parcelamento inteiro (e as parcelas já lançadas, inclusive excluídas) para outro cartão.
create or replace function public.move_plan_to_card(p_plan_id uuid, p_card_id uuid)
returns void language plpgsql as $$
begin
  if not exists (select 1 from public.plans where id = p_plan_id and deleted_at is null) then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.cards where id = p_card_id) then
    raise exception 'card not found' using errcode = 'P0002';
  end if;
  update public.plans set card_id = p_card_id where id = p_plan_id;
  update public.transactions set source_type = 'card', source_id = p_card_id where plan_id = p_plan_id;
end $$;

-- Virada de mês: ignora parcelamentos excluídos.
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
    for p in select * from public.plans where user_id = v_uid and deleted_at is null and current < installments for update loop
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
