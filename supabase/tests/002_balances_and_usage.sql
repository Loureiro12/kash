begin;
select plan(6);

select tests.create_user('bal@test.com', 'Bal') as u \gset
select tests.login_as(:'u');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000001', 'Conta', 100);
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000001', 'Cartão', '0000', 1000, 10, 20);

insert into public.transactions (title, category, amount, source_type, source_id) values
  ('Gasto', 'Comida', -30, 'account', '11111111-1111-4111-8111-000000000001'),
  ('Entrada', 'Entrada', 50, 'account', '11111111-1111-4111-8111-000000000001'),
  ('No cartão', 'Lazer', -40, 'card', '22222222-2222-4222-8222-000000000001');

select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-000000000001'), 120::numeric, 'saldo = abertura + entradas − saídas');
select is((select used from public.card_usage where card_id = '22222222-2222-4222-8222-000000000001'), 40::numeric, 'fatura atual soma saídas do cartão no mês');

-- lançamento excluído (soft) sai do saldo
select public.soft_delete_transaction((select id from public.transactions where title = 'Gasto'));
select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-000000000001'), 150::numeric, 'soft delete não conta no saldo');

-- gasto de outro mês não entra na fatura atual
insert into public.transactions (title, category, amount, date, source_type, source_id) values
  ('Antigo', 'Lazer', -10, public.kash_today() - interval '45 days', 'card', '22222222-2222-4222-8222-000000000001');
select is((select used from public.card_usage where card_id = '22222222-2222-4222-8222-000000000001'), 40::numeric, 'fatura atual ignora meses anteriores');

-- constraints
select throws_ok($$insert into public.transactions (title, category, amount, source_type, source_id) values ('x', 'Entrada', 10, 'card', '22222222-2222-4222-8222-000000000001')$$, '23514', null, 'entrada não pode ir pra cartão');
select throws_ok($$insert into public.transactions (title, category, amount, source_type, source_id) values ('x', 'Comida', 10, 'account', '11111111-1111-4111-8111-000000000001')$$, '23514', null, 'gasto precisa ser negativo');

select * from finish();
rollback;
