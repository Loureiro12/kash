begin;
select plan(17);

select tests.create_user('tr-a@test.com', 'Ana') as a \gset
select tests.create_user('tr-b@test.com', 'Bia') as b \gset

-- conta da Bia (para tentar transferir para ela)
select tests.login_as(:'b');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000139', 'Conta da Bia', 0);

select tests.login_as(:'a');
insert into public.accounts (id, name, opening_balance) values
  ('11111111-1111-4111-8111-000000000130', 'Corrente', 1000),
  ('11111111-1111-4111-8111-000000000131', 'Poupança', 0),
  ('11111111-1111-4111-8111-000000000132', 'Carteira', 50);
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000130', 'Roxo', '4821', 3000, 28, 10);

create temp view bal as select id, balance from public.accounts_with_balance;
grant select on bal to authenticated;

select public.create_transfer('11111111-1111-4111-8111-000000000130', '11111111-1111-4111-8111-000000000131', 200, '2026-10-10', 'Reserva') as t \gset

select is((select count(*)::int from public.transactions where transfer_id = :'t'), 2, 'duas pernas ligadas');
select is((select balance from bal where id = '11111111-1111-4111-8111-000000000130'), 800.00::numeric, 'origem perde o valor');
select is((select balance from bal where id = '11111111-1111-4111-8111-000000000131'), 200.00::numeric, 'destino ganha o valor');
select is((select array_agg(distinct category::text) from public.transactions where transfer_id = :'t'), array['Transferência']::text[], 'categoria de sistema');
select is((select title from public.transactions where transfer_id = :'t' limit 1), 'Reserva', 'descrição nas duas pernas');

-- validações
select throws_ok($$select public.create_transfer('11111111-1111-4111-8111-000000000130', '11111111-1111-4111-8111-000000000130', 10)$$, '23514', null, 'origem e destino iguais');
select throws_ok($$select public.create_transfer('11111111-1111-4111-8111-000000000130', '11111111-1111-4111-8111-000000000131', 0)$$, '23514', null, 'valor zero');
select throws_ok($$select public.create_transfer('11111111-1111-4111-8111-000000000130', '11111111-1111-4111-8111-000000000139', 10)$$, 'P0002', null, 'não transfere para conta de outra pessoa');
select throws_ok($$insert into public.transactions (title, category, amount, source_type, source_id) values ('x', 'Transferência', -10, 'account', '11111111-1111-4111-8111-000000000130')$$, '23514', null, 'categoria Transferência só com transfer_id');
select throws_ok($$insert into public.transactions (title, category, amount, source_type, source_id, transfer_id) values ('x', 'Transferência', -10, 'card', '22222222-2222-4222-8222-000000000130', gen_random_uuid())$$, '23514', null, 'transferência só entre contas');
select throws_ok($$insert into public.categories (name, color) values ('transferência', '#AAB2BF')$$, '23514', null, 'nome reservado para categoria');

-- editar: valor, data e contas mudam nas duas pernas
select public.update_transfer(:'t', '11111111-1111-4111-8111-000000000132', '11111111-1111-4111-8111-000000000131', 30, '2026-10-09', '');
select is((select balance from bal where id = '11111111-1111-4111-8111-000000000130'), 1000.00::numeric, 'origem antiga volta ao saldo');
select is((select balance from bal where id = '11111111-1111-4111-8111-000000000132'), 20.00::numeric, 'nova origem');
select is((select title from public.transactions where transfer_id = :'t' and amount > 0), 'Transferência', 'sem descrição vira "Transferência"');

-- excluir uma perna leva a outra; desfazer restaura as duas
select public.soft_delete_transaction((select id from public.transactions where transfer_id = :'t' and amount > 0)) as g \gset
select is((select count(*)::int from public.transactions where transfer_id = :'t' and deleted_at is null), 0, 'excluir apaga as duas pernas');
select is((select balance from bal where id = '11111111-1111-4111-8111-000000000131'), 0.00::numeric, 'saldo do destino volta');
select public.undo_delete_transaction(:'g');
select is((select count(*)::int from public.transactions where transfer_id = :'t' and deleted_at is null), 2, 'desfazer restaura as duas');

select * from finish();
rollback;
