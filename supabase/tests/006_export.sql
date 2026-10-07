begin;
select plan(8);

select tests.create_user('exp-a@test.com', 'Ana') as a \gset
select tests.create_user('exp-b@test.com', 'Bia') as b \gset

select tests.login_as(:'a');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000060', 'Conta', 100);
insert into public.transactions (title, category, amount, source_type, source_id) values ('Café', 'Comida', -5, 'account', '11111111-1111-4111-8111-000000000060');
insert into public.goals (name, target, saved, monthly) values ('Viagem', 1000, 0, 50);
select public.soft_delete_transaction((select id from public.transactions limit 1));

select public.export_my_data() as export_a \gset

select is((:'export_a')::jsonb ->> 'format', 'kash-export/1', 'formato versionado');
select is((:'export_a')::jsonb -> 'user' ->> 'name', 'Ana', 'perfil da própria usuária');
select is(jsonb_array_length((:'export_a')::jsonb -> 'accounts'), 1, 'contas da usuária');
select is(jsonb_array_length((:'export_a')::jsonb -> 'transactions'), 1, 'lançamentos incluem os excluídos (soft delete)');
select isnt((:'export_a')::jsonb -> 'transactions' -> 0 ->> 'deleted_at', null, 'lançamento excluído vem com deleted_at');
select is(jsonb_array_length((:'export_a')::jsonb -> 'goals'), 1, 'metas da usuária');

-- outra usuária só vê o próprio (vazio)
select tests.login_as(:'b');
select is(jsonb_array_length(public.export_my_data() -> 'accounts'), 0, 'B não exporta contas de A');
select is(public.export_my_data() -> 'user' ->> 'name', 'Bia', 'B exporta o próprio perfil');

select * from finish();
rollback;
