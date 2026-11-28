begin;
select plan(12);

select tests.create_user('deb@test.com', 'Deb') as u \gset
select tests.login_as(:'u');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000030', 'Conta', 100);

-- tags e modo viagem
insert into public.transactions (title, category, amount, date, source_type, source_id, tag)
  values ('Pousada', 'Lazer', -300, public.kash_today(), 'account', '11111111-1111-4111-8111-000000000030', 'Viagem Floripa');
select is((select tag from public.transactions where title = 'Pousada'), 'Viagem Floripa', 'lançamento guarda a tag');
select throws_ok($$insert into public.transactions (title, category, amount, date, source_type, source_id, tag) values ('x', 'Lazer', -1, public.kash_today(), 'account', '11111111-1111-4111-8111-000000000030', '   ')$$, '23514', null, 'tag vazia é recusada');
update public.profiles set travel_tag = 'Viagem Floripa', travel_until = public.kash_today() + 3 where id = :'u';
select is((select travel_tag from public.profiles where id = :'u'), 'Viagem Floripa', 'modo viagem no perfil');

-- quem me deve
insert into public.debts (id, person, description, amount, kind) values ('55555555-5555-4555-8555-000000000001', 'João', 'jantar', 60, 'split');
select public.settle_debt('55555555-5555-4555-8555-000000000001', '11111111-1111-4111-8111-000000000030') as tx \gset
select is((select title from public.transactions where id = :'tx'), 'João pagou: jantar', 'receber lança a entrada');
select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-000000000030'), -140::numeric, 'entrada soma no saldo (100 − 300 + 60)');
select isnt((select settled_at from public.debts where id = '55555555-5555-4555-8555-000000000001'), null, 'fica como recebida');
select is(public.settle_debt('55555555-5555-4555-8555-000000000001', '11111111-1111-4111-8111-000000000030'), :'tx'::uuid, 'receber de novo não duplica');
select public.unsettle_debt('55555555-5555-4555-8555-000000000001');
select is((select count(*) from public.transactions where id = :'tx'), 0::bigint, 'desfazer apaga a entrada');
-- receber sem lançar entrada
select is(public.settle_debt('55555555-5555-4555-8555-000000000001'), null, 'só marcar como recebida, sem entrada');

-- exportar e zerar
select ok(jsonb_array_length(public.export_my_data() -> 'debts') = 1, 'exportação inclui as dívidas');
select public.reset_my_data();
select is((select count(*) from public.debts), 0::bigint, 'zerar apaga as dívidas');

-- outra pessoa não vê
select tests.create_user('outra@test.com', 'Outra') as o \gset
select tests.login_as(:'o');
select is((select count(*) from public.debts), 0::bigint, 'RLS: não vê dívidas de outra pessoa');

select * from finish();
rollback;
