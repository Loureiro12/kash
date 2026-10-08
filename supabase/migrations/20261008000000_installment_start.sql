-- Compra parcelada começada no passado: o app informa qual parcela cai no mês atual (p_current).
-- As parcelas anteriores são consideradas pagas e não geram lançamento; a virada de mês segue a partir dela.
-- p_current tem padrão 1, então chamadas antigas (sem o parâmetro) continuam iguais.
drop function if exists public.add_installment_purchase(text, public.expense_category, uuid, numeric, int, date);

create or replace function public.add_installment_purchase(
  p_title text,
  p_category public.expense_category,
  p_card_id uuid,
  p_total numeric,
  p_installments int,
  p_date date default public.kash_today(),
  p_current int default 1
) returns uuid language plpgsql as $$
declare
  v_plan uuid;
  v_per numeric(12,2);
begin
  if p_installments < 2 then
    raise exception 'installments must be >= 2';
  end if;
  if p_current < 1 or p_current > p_installments then
    raise exception 'current installment must be between 1 and %', p_installments using errcode = '23514';
  end if;
  v_per := round(p_total / p_installments, 2);
  insert into public.plans (card_id, title, category, installments, current, per_installment)
  values (p_card_id, p_title, p_category, p_installments, p_current, v_per)
  returning id into v_plan;
  insert into public.transactions (title, category, amount, date, source_type, source_id, plan_id)
  values (format('%s (%s/%s)', p_title, p_current, p_installments), p_category, -v_per, p_date, 'card', p_card_id, v_plan);
  return v_plan;
end $$;
