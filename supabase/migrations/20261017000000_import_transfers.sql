-- Extrato importado com transferências entre as próprias contas.
-- Item `type = 'transfer'`: a linha entra como perna de transferência na conta importada e a outra
-- perna vai para `counterpart_account_id`. Com `link_tx_id`, o outro lado já estava no Kash (gasto ou
-- entrada comum, lançado à mão ou importado antes) e vira a outra perna, em vez de criar uma nova.
-- O desfazer apaga as pernas criadas, devolve o lançamento ligado ao que era e as aberturas das contas.

alter table public.imports
  -- lançamentos que viraram perna de transferência: [{ "tx_id", "category" }] (o desfazer restaura)
  add column linked jsonb not null default '[]'::jsonb,
  -- "manter o saldo de hoje" nas contas do outro lado: { "<account id>": ajuste na abertura }
  add column counterpart_adjustments jsonb not null default '{}'::jsonb;

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
begin
  if not exists (select 1 from public.accounts where id = p_account_id) then raise exception 'account not found' using errcode = 'P0002'; end if;
  insert into public.imports (source_type, source_id, file_name, format)
  values ('account', p_account_id, coalesce(p_file_name, ''), p_format) returning id into v_import;

  for i in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
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
         linked = v_linked, counterpart_adjustments = v_adj
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
begin
  select * into imp from public.imports where id = p_import_id and undone_at is null for update;
  if not found then raise exception 'import not found' using errcode = 'P0002'; end if;
  select array_agg(distinct public.month_key(date)) into v_months from public.transactions where import_id = p_import_id and deleted_at is null;
  update public.transactions set deleted_at = now(), deleted_group = v_group where import_id = p_import_id and deleted_at is null;
  get diagnostics v_count = row_count;
  update public.plans set deleted_at = now(), deleted_group = v_group where import_id = p_import_id and deleted_at is null;
  -- lançamentos que viraram a outra perna voltam a ser o que eram
  for l in select * from jsonb_array_elements(imp.linked) loop
    update public.transactions set category = l ->> 'category', transfer_id = null where id = (l ->> 'tx_id')::uuid;
  end loop;
  if imp.source_type = 'account' and imp.balance_adjustment <> 0 then
    update public.accounts set opening_balance = opening_balance - imp.balance_adjustment where id = imp.source_id;
  end if;
  for k in select jsonb_object_keys(imp.counterpart_adjustments) loop
    update public.accounts set opening_balance = opening_balance - (imp.counterpart_adjustments ->> k)::numeric where id = k::uuid;
  end loop;
  if imp.source_type = 'card' then perform public.refresh_card_invoices(imp.source_id, v_months); end if;
  update public.imports set undone_at = now() where id = p_import_id;
  return v_count;
end $$;
