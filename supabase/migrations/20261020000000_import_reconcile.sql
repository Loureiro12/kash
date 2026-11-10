-- Conferência na importação: linha da fatura/extrato que corresponde a um lançamento que a pessoa já
-- fez vira um item `type = 'match'`: o lançamento dela ganha o id do banco (`external_id`) e o nome
-- original, e, se pedido, o valor e a data do arquivo. Nada é criado. O desfazer devolve o lançamento
-- como estava (valor, data, nome original) e tira o vínculo.

alter table public.imports add column matched_count int not null default 0;

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
  v_link public.transactions%rowtype;
  v_linked jsonb := '[]'::jsonb;
  v_matched int := 0;
begin
  if not exists (select 1 from public.cards where id = p_card_id) then raise exception 'card not found' using errcode = 'P0002'; end if;
  insert into public.imports (source_type, source_id, file_name, format, statement_month)
  values ('card', p_card_id, coalesce(p_file_name, ''), p_format, p_statement_month) returning id into v_import;

  for i in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if i ->> 'type' = 'match' then
      -- compra que a pessoa já lançou: vincula ao arquivo (e corrige valor/data se pedido)
      select * into v_link from public.transactions
       where id = (i ->> 'tx_id')::uuid and source_type = 'card' and source_id = p_card_id and deleted_at is null
         and plan_id is null and transfer_id is null and external_id is null
       for update;
      if not found or exists (select 1 from public.transactions where source_id = p_card_id and external_id = i ->> 'external_id' and deleted_at is null) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      v_linked := v_linked || jsonb_build_array(jsonb_build_object('kind', 'match', 'tx_id', v_link.id, 'original_title', v_link.original_title, 'amount', v_link.amount, 'date', v_link.date));
      update public.transactions
         set external_id = i ->> 'external_id',
             original_title = coalesce(original_title, i ->> 'original_title'),
             amount = case when i ? 'amount' then -abs(round((i ->> 'amount')::numeric, 2)) else amount end,
             date = case when i ? 'date' then (i ->> 'date')::date else date end
       where id = v_link.id;
      v_months := v_months || public.month_key(v_link.date) || public.month_key(coalesce((i ->> 'date')::date, v_link.date));
      v_matched := v_matched + 1;
    elsif i ->> 'type' = 'plan' then
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
  update public.imports set tx_count = v_txs, plan_count = v_plans, skipped_count = v_skipped, matched_count = v_matched, linked = v_linked where id = v_import;
  return v_import;
end $$;

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
  v_cp uuid;
  v_transfer uuid;
  v_link public.transactions%rowtype;
  v_linked jsonb := '[]'::jsonb;
  v_adj jsonb := '{}'::jsonb;
  k text;
  v_matched int := 0;
  v_new numeric(12,2);
begin
  if not exists (select 1 from public.accounts where id = p_account_id) then raise exception 'account not found' using errcode = 'P0002'; end if;
  insert into public.imports (source_type, source_id, file_name, format)
  values ('account', p_account_id, coalesce(p_file_name, ''), p_format) returning id into v_import;

  for i in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if i ->> 'type' = 'match' then
      -- gasto/entrada que a pessoa já lançou: vincula ao arquivo (e corrige valor/data se pedido)
      select * into v_link from public.transactions
       where id = (i ->> 'tx_id')::uuid and source_type = 'account' and source_id = p_account_id and deleted_at is null
         and plan_id is null and transfer_id is null and external_id is null
       for update;
      v_new := case when i ? 'amount' then round((i ->> 'amount')::numeric, 2) else v_link.amount end;
      if v_link.id is null or sign(v_new) <> sign(v_link.amount)
         or exists (select 1 from public.transactions where source_id = p_account_id and external_id = i ->> 'external_id' and deleted_at is null) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      v_linked := v_linked || jsonb_build_array(jsonb_build_object('kind', 'match', 'tx_id', v_link.id, 'original_title', v_link.original_title, 'amount', v_link.amount, 'date', v_link.date));
      update public.transactions
         set external_id = i ->> 'external_id',
             original_title = coalesce(original_title, i ->> 'original_title'),
             amount = v_new,
             date = case when i ? 'date' then (i ->> 'date')::date else date end
       where id = v_link.id;
      -- "manter o saldo de hoje": a correção de valor também não mexe no saldo
      v_sum := v_sum + (v_new - v_link.amount);
      v_matched := v_matched + 1;
      v_link := null;
      continue;
    end if;
    v_amount := round((i ->> 'amount')::numeric, 2);
    if v_amount = 0 then v_skipped := v_skipped + 1; continue; end if;

    if i ->> 'type' = 'transfer' then
      v_cp := (i ->> 'counterpart_account_id')::uuid;
      if v_cp is null or v_cp = p_account_id or not exists (select 1 from public.accounts where id = v_cp) then
        raise exception 'counterpart account not found' using errcode = 'P0002';
      end if;
      v_transfer := gen_random_uuid();
      insert into public.transactions (title, category, amount, date, source_type, source_id, original_title, import_id, external_id, transfer_id)
      values (coalesce(nullif(trim(i ->> 'title'), ''), 'Transferência'), 'Transferência', v_amount, (i ->> 'date')::date, 'account', p_account_id,
              i ->> 'original_title', v_import, i ->> 'external_id', v_transfer)
      on conflict (user_id, source_id, external_id) where external_id is not null and deleted_at is null do nothing
      returning id into v_tx;
      if v_tx is null then v_skipped := v_skipped + 1; continue; end if;

      -- o outro lado já existe: só serve se ainda é um lançamento comum, da conta indicada e com o valor oposto
      v_link := null;
      if i ? 'link_tx_id' then
        select * into v_link from public.transactions
         where id = (i ->> 'link_tx_id')::uuid and source_type = 'account' and source_id = v_cp and deleted_at is null
           and transfer_id is null and plan_id is null and amount = -v_amount
         for update;
      end if;
      if v_link.id is not null then
        v_linked := v_linked || jsonb_build_array(jsonb_build_object('tx_id', v_link.id, 'category', v_link.category));
        update public.transactions set category = 'Transferência', transfer_id = v_transfer where id = v_link.id;
      else
        insert into public.transactions (title, category, amount, date, source_type, source_id, original_title, import_id, transfer_id)
        values (coalesce(nullif(trim(i ->> 'title'), ''), 'Transferência'), 'Transferência', -v_amount, (i ->> 'date')::date, 'account', v_cp,
                i ->> 'original_title', v_import, v_transfer);
        -- "manter o saldo de hoje" vale também para a conta do outro lado
        if p_keep_balance then
          v_adj := jsonb_set(v_adj, array[v_cp::text], to_jsonb(coalesce((v_adj ->> v_cp::text)::numeric, 0) + v_amount));
        end if;
      end if;
    else
      insert into public.transactions (title, category, amount, date, source_type, source_id, original_title, import_id, external_id)
      values (i ->> 'title', case when v_amount > 0 then 'Entrada' else i ->> 'category' end, v_amount, (i ->> 'date')::date, 'account', p_account_id,
              i ->> 'original_title', v_import, i ->> 'external_id')
      on conflict (user_id, source_id, external_id) where external_id is not null and deleted_at is null do nothing
      returning id into v_tx;
      if v_tx is null then v_skipped := v_skipped + 1; continue; end if;
    end if;

    v_sum := v_sum + v_amount;
    v_txs := v_txs + 1;
    v_last := greatest(coalesce(v_last, (i ->> 'date')::date), (i ->> 'date')::date);
    v_tx := null;
  end loop;

  if p_keep_balance and v_sum <> 0 then
    update public.accounts set opening_balance = opening_balance - v_sum where id = p_account_id;
  end if;
  for k in select jsonb_object_keys(v_adj) loop
    update public.accounts set opening_balance = opening_balance + (v_adj ->> k)::numeric where id = k::uuid;
  end loop;
  update public.imports
     set tx_count = v_txs, skipped_count = v_skipped, statement_month = public.month_key(v_last),
         balance_adjustment = case when p_keep_balance then -v_sum else 0 end,
         linked = v_linked, counterpart_adjustments = v_adj, matched_count = v_matched
   where id = v_import;
  return v_import;
end $$;

create or replace function public.undo_import(p_import_id uuid)
returns int language plpgsql as $$
declare
  imp public.imports%rowtype;
  v_group uuid := gen_random_uuid();
  v_count int;
  v_months text[];
  l jsonb;
  k text;
  v_cur date;
begin
  select * into imp from public.imports where id = p_import_id and undone_at is null for update;
  if not found then raise exception 'import not found' using errcode = 'P0002'; end if;
  select array_agg(distinct public.month_key(date)) into v_months from public.transactions where import_id = p_import_id and deleted_at is null;
  update public.transactions set deleted_at = now(), deleted_group = v_group where import_id = p_import_id and deleted_at is null;
  get diagnostics v_count = row_count;
  update public.plans set deleted_at = now(), deleted_group = v_group where import_id = p_import_id and deleted_at is null;
  -- lançamentos ligados a esta importação voltam a ser o que eram
  for l in select * from jsonb_array_elements(imp.linked) loop
    if l ->> 'kind' = 'match' then
      -- conferido: perde o vínculo com o arquivo e recupera valor, data e nome original de antes
      select date into v_cur from public.transactions where id = (l ->> 'tx_id')::uuid;
      update public.transactions
         set external_id = null, original_title = l ->> 'original_title', amount = (l ->> 'amount')::numeric, date = (l ->> 'date')::date
       where id = (l ->> 'tx_id')::uuid;
      v_months := coalesce(v_months, '{}') || public.month_key(v_cur) || public.month_key((l ->> 'date')::date);
    else
      -- perna de transferência (extrato): volta a ser o gasto/entrada de antes
      update public.transactions set category = l ->> 'category', transfer_id = null where id = (l ->> 'tx_id')::uuid;
    end if;
  end loop;
  if imp.source_type = 'account' and imp.balance_adjustment <> 0 then
    update public.accounts set opening_balance = opening_balance - imp.balance_adjustment where id = imp.source_id;
  end if;
  for k in select jsonb_object_keys(imp.counterpart_adjustments) loop
    update public.accounts set opening_balance = opening_balance - (imp.counterpart_adjustments ->> k)::numeric where id = k::uuid;
  end loop;
  if imp.source_type = 'card' then perform public.refresh_card_invoices(imp.source_id, (select array_agg(distinct m) from unnest(v_months) m where m is not null)); end if;
  update public.imports set undone_at = now() where id = p_import_id;
  return v_count;
end $$;
