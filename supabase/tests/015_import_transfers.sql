begin;
select plan(16);

select tests.create_user('impt-a@test.com', 'Ana') as a \gset
select tests.create_user('impt-b@test.com', 'Bia') as b \gset

select tests.login_as(:'b');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000159', 'Da Bia', 0);

select tests.login_as(:'a');
insert into public.accounts (id, name, opening_balance) values
  ('11111111-1111-4111-8111-000000000150', 'Corrente', 1000),
  ('11111111-1111-4111-8111-000000000151', 'Poupança', 5000),
  ('11111111-1111-4111-8111-000000000152', 'Nubank', 300);
-- entrada de R$ 200 na Nubank lançada antes (é o outro lado de um Pix da corrente)
insert into public.transactions (id, title, category, amount, date, source_type, source_id)
values ('33333333-3333-4333-8333-000000000150', 'Pix', 'Entrada', 200, '2026-09-07', 'account', '11111111-1111-4111-8111-000000000152');

-- extrato da corrente: aplicação na poupança (cria a perna lá), Pix para a Nubank (liga no que existe) e um gasto
select public.import_account_statement('11111111-1111-4111-8111-000000000150', 'corrente.ofx', 'ofx', jsonb_build_array(
  jsonb_build_object('type', 'transfer', 'title', 'Para a poupança', 'original_title', 'APLICACAO POUPANCA', 'amount', -500, 'date', '2026-09-05',
    'external_id', 'fit-1', 'counterpart_account_id', '11111111-1111-4111-8111-000000000151'),
  jsonb_build_object('type', 'transfer', 'title', 'Para a Nubank', 'original_title', 'PIX ENVIADO ANA', 'amount', -200, 'date', '2026-09-06',
    'external_id', 'fit-2', 'counterpart_account_id', '11111111-1111-4111-8111-000000000152', 'link_tx_id', '33333333-3333-4333-8333-000000000150'),
  jsonb_build_object('type', 'tx', 'title', 'Mercado', 'original_title', 'SUPERMERCADO', 'category', 'Outros', 'amount', -80, 'date', '2026-09-08', 'external_id', 'fit-3')
), true) as imp \gset

select is((select count(*)::int from public.transactions where import_id = :'imp'), 4, 'duas pernas na corrente, uma criada na poupança e o gasto');
select is((select count(*)::int from public.transactions t join public.transactions o on o.transfer_id = t.transfer_id and o.id <> t.id
            where t.source_id = '11111111-1111-4111-8111-000000000150' and t.transfer_id is not null), 2, 'as duas transferências têm o outro lado');
select is((select category::text from public.transactions where id = '33333333-3333-4333-8333-000000000150'), 'Transferência', 'entrada da Nubank virou a outra perna');
select is((select amount from public.transactions where source_id = '11111111-1111-4111-8111-000000000151'), 500.00::numeric, 'perna da poupança com o valor oposto');
select is((select original_title from public.transactions where source_id = '11111111-1111-4111-8111-000000000151'), 'APLICACAO POUPANCA', 'perna criada guarda o texto do banco');
-- "manter o saldo de hoje": nenhuma das três contas muda de saldo
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-000000000150'), 1000.00::numeric, 'corrente mantém o saldo');
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-000000000151'), 5000.00::numeric, 'poupança mantém o saldo');
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-000000000152'), 500.00::numeric, 'Nubank: só a entrada que já existia');
select is((select tx_count from public.imports where id = :'imp'), 3, 'conta as linhas do extrato');

-- reimportar não duplica (nem cria outra perna)
select public.import_account_statement('11111111-1111-4111-8111-000000000150', 'corrente.ofx', 'ofx', jsonb_build_array(
  jsonb_build_object('type', 'transfer', 'title', 'Para a poupança', 'amount', -500, 'date', '2026-09-05', 'external_id', 'fit-1', 'counterpart_account_id', '11111111-1111-4111-8111-000000000151')
), true) as again \gset
select is((select count(*)::int from public.transactions where source_id = '11111111-1111-4111-8111-000000000151' and deleted_at is null), 1, 'reimportar não cria outra perna');

-- desfazer: pernas criadas saem, a entrada ligada volta, saldos e aberturas voltam
select public.undo_import(:'imp');
select is((select category::text from public.transactions where id = '33333333-3333-4333-8333-000000000150'), 'Entrada', 'entrada ligada volta a ser entrada');
select is((select transfer_id from public.transactions where id = '33333333-3333-4333-8333-000000000150'), null, 'e perde a ligação');
select is((select opening_balance from public.accounts where id = '11111111-1111-4111-8111-000000000151'), 5000.00::numeric, 'abertura da poupança volta');
select is((select opening_balance from public.accounts where id = '11111111-1111-4111-8111-000000000150'), 1000.00::numeric, 'abertura da corrente volta');

-- não liga lançamento nem cria perna em conta de outra pessoa
select throws_ok($$select public.import_account_statement('11111111-1111-4111-8111-000000000150', 'x', 'csv', jsonb_build_array(
  jsonb_build_object('type', 'transfer', 'amount', -10, 'date', '2026-09-05', 'counterpart_account_id', '11111111-1111-4111-8111-000000000159')), true)$$,
  'P0002', null, 'conta do outro lado precisa ser da pessoa');
select throws_ok($$select public.import_account_statement('11111111-1111-4111-8111-000000000150', 'x', 'csv', jsonb_build_array(
  jsonb_build_object('type', 'transfer', 'amount', -10, 'date', '2026-09-05', 'counterpart_account_id', '11111111-1111-4111-8111-000000000150')), true)$$,
  'P0002', null, 'outro lado não pode ser a própria conta');

select * from finish();
rollback;
