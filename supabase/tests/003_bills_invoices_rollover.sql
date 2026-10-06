begin;
select plan(14);

select tests.create_user('roll@test.com', 'Roll') as u \gset
select tests.login_as(:'u');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000010', 'Conta', 1000);
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000010', 'Cartão', '0000', 1000, 10, 20);
insert into public.bills (id, name, amount, due_day, category, source_type, source_id) values
  ('33333333-3333-4333-8333-000000000001', 'Internet', 99.90, 10, 'Assinaturas', 'card', '22222222-2222-4222-8222-000000000010'),
  ('33333333-3333-4333-8333-000000000002', 'Academia', 80, 15, 'Lazer', 'account', '11111111-1111-4111-8111-000000000010');

-- pagar conta fixa no cartão
select lives_ok($$select public.pay_bill('33333333-3333-4333-8333-000000000001')$$, 'pay_bill');
select is((select count(*) from public.transactions where title = 'Internet' and source_type = 'card' and amount = -99.90), 1::bigint, 'pagamento gera lançamento na fatura com a categoria da conta');
select isnt((select paid_tx_id from public.bills where id = '33333333-3333-4333-8333-000000000001'), null, 'conta marcada como paga');
select is((select used from public.card_usage where card_id = '22222222-2222-4222-8222-000000000010'), 99.90::numeric, 'entra na fatura atual');
-- pagar de novo é idempotente
select public.pay_bill('33333333-3333-4333-8333-000000000001');
select is((select count(*) from public.transactions where title = 'Internet'), 1::bigint, 'pay_bill repetido não duplica');
-- desmarcar remove o lançamento
select public.unpay_bill('33333333-3333-4333-8333-000000000001');
select is((select count(*) from public.transactions where title = 'Internet'), 0::bigint, 'unpay_bill apaga o lançamento');

-- conta paga na conta bancária debita o saldo
select public.pay_bill('33333333-3333-4333-8333-000000000002');
select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-000000000010'), 920::numeric, 'pagar na conta debita o saldo');

-- parcelado: plano + primeira parcela
select public.add_installment_purchase('Notebook', 'Outros', '22222222-2222-4222-8222-000000000010', 1200, 6) as plan \gset
select is((select per_installment from public.plans where id = :'plan'), 200::numeric, 'parcela = total/n');
select is((select title from public.transactions where plan_id = :'plan'), 'Notebook (1/6)', 'primeira parcela lançada');

-- virada de mês: simula último processamento há dois meses
update public.profiles set last_rollover_month = public.month_key((date_trunc('month', public.kash_today()) - interval '2 months')::date) where id = :'u';
-- um gasto no cartão no mês passado para fechar fatura
insert into public.transactions (title, category, amount, date, source_type, source_id)
  values ('Mês passado', 'Lazer', -150, (date_trunc('month', public.kash_today()) - interval '10 days')::date, 'card', '22222222-2222-4222-8222-000000000010');

select is(public.ensure_rollover(), 2, 'processa dois meses');
select is((select total from public.invoices where card_id = '22222222-2222-4222-8222-000000000010' and month = public.month_key((date_trunc('month', public.kash_today()) - interval '1 month')::date)), 350::numeric, 'fatura do mês passado = gasto do mês (150) + parcela lançada pela virada anterior (200)');
select is((select paid_tx_id from public.bills where id = '33333333-3333-4333-8333-000000000002'), null, 'contas fixas voltam a "a pagar"');
select is((select current from public.plans where id = :'plan'), 3, 'duas parcelas lançadas (1 → 3)');
select is(public.ensure_rollover(), 0, 'segunda chamada no mesmo mês não faz nada');

select * from finish();
rollback;
