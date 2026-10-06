begin;
select plan(9);

select tests.create_user('del@test.com', 'Del') as u \gset
select tests.login_as(:'u');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000030', 'Conta', 500);
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000030', 'Cartão', '0000', 1000, 10, 20);
insert into public.transactions (title, category, amount, source_type, source_id) values
  ('No cartão', 'Lazer', -40, 'card', '22222222-2222-4222-8222-000000000030'),
  ('Na conta', 'Comida', -10, 'account', '11111111-1111-4111-8111-000000000030');
insert into public.bills (id, name, amount, due_day, source_type, source_id) values ('33333333-3333-4333-8333-000000000030', 'Internet', 99.90, 10, 'card', '22222222-2222-4222-8222-000000000030');
insert into public.goals (id, name, target, saved, monthly, account_id, deposit_day) values ('55555555-5555-4555-8555-000000000001', 'Viagem', 1000, 100, 50, '11111111-1111-4111-8111-000000000030', 10);

-- excluir cartão: lançamentos somem, conta fixa fica sem origem
select public.delete_card('22222222-2222-4222-8222-000000000030');
select is((select count(*) from public.transactions where source_type = 'card'), 0::bigint, 'lançamentos do cartão apagados');
select is((select source_id from public.bills where id = '33333333-3333-4333-8333-000000000030'), null, 'conta fixa sem origem');

-- depósito na meta respeita o alvo e marca a data
select public.record_goal_deposit('55555555-5555-4555-8555-000000000001', 950);
select is((select saved from public.goals where id = '55555555-5555-4555-8555-000000000001'), 1000::numeric, 'guardado limitado ao alvo');
select is((select last_deposit_date from public.goals where id = '55555555-5555-4555-8555-000000000001'), public.kash_today(), 'data do depósito registrada');

-- excluir conta: lançamentos somem, meta fica sem conta
select public.delete_account('11111111-1111-4111-8111-000000000030');
select is((select count(*) from public.transactions), 0::bigint, 'lançamentos da conta apagados');
select is((select account_id from public.goals where id = '55555555-5555-4555-8555-000000000001'), null, 'meta sem conta');

-- constraints
select throws_ok($$insert into public.bills (name, amount, due_day) values ('x', 10, 32)$$, '23514', null, 'dia 32 inválido');
select throws_ok($$insert into public.goals (name, target, saved) values ('x', 100, 200)$$, '23514', null, 'guardado acima do alvo inválido');
select throws_ok($$insert into public.cards (name, last4, credit_limit, closing_day, due_day) values ('x', '12', 100, 1, 1)$$, '23514', null, 'last4 precisa de 4 dígitos');

select * from finish();
rollback;
