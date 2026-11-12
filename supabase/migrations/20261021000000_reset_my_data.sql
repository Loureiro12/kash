-- "Zerar meus dados": a pessoa recomeça do zero sem criar outra conta.
-- Apaga tudo o que é financeiro (contas, cartões, faturas, lançamentos — inclusive os excluídos —,
-- parcelados, contas fixas, metas, importações e regras de nomes aprendidas), volta as categorias e o
-- limite mensal ao padrão e reabre as boas-vindas. Ficam: login, nome, celular, tema, lembretes,
-- moeda, o registro de e-mails de lembrete enviados e o uso da IA (o limite diário não zera).

-- Aviso de tempo real: durante o reset, um aviso só no fim em vez de um por linha apagada.
create or replace function public.notify_user_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_uid text := case when tg_table_name = 'profiles' then v_row ->> 'id' else v_row ->> 'user_id' end;
begin
  if v_uid is not null and coalesce(current_setting('kash.silent_realtime', true), '') <> 'on' then
    begin
      perform realtime.send(jsonb_build_object('table', tg_table_name, 'op', lower(tg_op)), 'changed', 'user:' || v_uid, true);
    exception when others then
      -- o aviso é melhor esforço: nunca derruba a escrita do usuário
      raise warning 'notify_user_change: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

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
