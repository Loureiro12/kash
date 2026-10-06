begin;
select plan(12);

-- dois usuários
select tests.create_user('a@test.com', 'A') as a \gset
select tests.create_user('b@test.com', 'B') as b \gset

select tests.login_as(:'a');
insert into public.accounts (id, name) values ('11111111-1111-4111-8111-111111111111', 'Conta A');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-222222222222', 'Cartão A', '1234', 1000, 10, 20);
insert into public.transactions (title, category, amount, source_type, source_id) values ('Café', 'Comida', -5, 'account', '11111111-1111-4111-8111-111111111111');

select is((select user_id from public.accounts where id = '11111111-1111-4111-8111-111111111111'), :'a'::uuid, 'user_id preenchido pelo trigger');
select is((select count(*) from public.accounts), 1::bigint, 'A vê a própria conta');
select is((select count(*) from public.transactions), 1::bigint, 'A vê o próprio lançamento');

-- B não enxerga nem altera nada de A
select tests.login_as(:'b');
select is((select count(*) from public.accounts), 0::bigint, 'B não vê contas de A');
select is((select count(*) from public.cards), 0::bigint, 'B não vê cartões de A');
select is((select count(*) from public.transactions), 0::bigint, 'B não vê lançamentos de A');
update public.accounts set name = 'hack' where id = '11111111-1111-4111-8111-111111111111';
select tests.logout();
select is((select name from public.accounts where id = '11111111-1111-4111-8111-111111111111'), 'Conta A', 'update de B não afeta A');
select tests.login_as(:'b');
delete from public.transactions where source_id = '11111111-1111-4111-8111-111111111111';
select tests.logout();
select is((select count(*) from public.transactions where user_id = :'a'), 1::bigint, 'delete de B não afeta A');

-- B não consegue inserir em nome de A
select tests.login_as(:'b');
select throws_ok(
  $$insert into public.accounts (user_id, name) values ('$$ || :'a' || $$', 'falsa')$$,
  '42501', null, 'insert com user_id de outro usuário é bloqueado pela RLS');

-- views respeitam RLS (security_invoker)
select is((select count(*) from public.accounts_with_balance), 0::bigint, 'B não vê saldos de A');
select tests.login_as(:'a');
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-111111111111'), (-5)::numeric, 'saldo de A visível para A');

-- perfil criado automaticamente com o nome do metadata
select tests.logout();
select is((select name from public.profiles where id = :'a'), 'A', 'perfil criado no cadastro');

select * from finish();
rollback;
