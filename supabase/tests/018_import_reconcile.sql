begin;
select plan(14);

select tests.create_user('rec-a@test.com', 'Ana') as a \gset
select tests.login_as(:'a');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000180', 'Nubank', '1670', 5000, 5, 13);
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000180', 'Corrente', 1000);
select public.month_key(public.kash_today()) as cur \gset
-- lançamentos que a Ana fez à mão
insert into public.transactions (id, title, category, amount, date, source_type, source_id) values
  ('33333333-3333-4333-8333-000000000181', 'Mercado', 'Mercado', -120, date_trunc('month', public.kash_today())::date + 3, 'card', '22222222-2222-4222-8222-000000000180'),
  ('33333333-3333-4333-8333-000000000182', 'Padaria', 'Comida', -25, date_trunc('month', public.kash_today())::date + 8, 'card', '22222222-2222-4222-8222-000000000180'),
  ('33333333-3333-4333-8333-000000000183', 'Feira', 'Mercado', -79.9, date_trunc('month', public.kash_today())::date + 5, 'account', '11111111-1111-4111-8111-000000000180');

-- fatura: mercado conferido (mantém), padaria conferida com correção, e uma compra nova
select public.import_card_statement('22222222-2222-4222-8222-000000000180', 'fatura.csv', 'csv', :'cur', jsonb_build_array(
  jsonb_build_object('type', 'match', 'tx_id', '33333333-3333-4333-8333-000000000181', 'external_id', 'ext-mercado', 'original_title', 'MERCADO BH 123'),
  jsonb_build_object('type', 'match', 'tx_id', '33333333-3333-4333-8333-000000000182', 'external_id', 'ext-padaria', 'original_title', 'PADARIA PAO BOM',
    'amount', 24.5, 'date', date_trunc('month', public.kash_today())::date + 9),
  jsonb_build_object('type', 'tx', 'title', 'Farmácia', 'original_title', 'FARMACIA X', 'category', 'Outros', 'amount', 40, 'date', date_trunc('month', public.kash_today())::date + 10, 'external_id', 'ext-farmacia')
)) as imp \gset

select is((select count(*)::int from public.transactions where source_id = '22222222-2222-4222-8222-000000000180' and deleted_at is null), 3, 'conferir não cria lançamento: 2 da Ana + 1 novo');
select is((select (title, amount, external_id, original_title)::text from public.transactions where id = '33333333-3333-4333-8333-000000000181'),
          '(Mercado,-120.00,ext-mercado,"MERCADO BH 123")', 'mantém o nome e o valor da Ana e vincula ao arquivo');
select is((select (amount, date - date_trunc('month', public.kash_today())::date)::text from public.transactions where id = '33333333-3333-4333-8333-000000000182'),
          '(-24.50,9)', 'correção: valor e data da fatura');
select is((select (tx_count, matched_count)::text from public.imports where id = :'imp'), '(1,2)', 'conta o que entrou e o que foi conferido');

-- reimportar a mesma fatura: nada muda (os vínculos já existem)
select public.import_card_statement('22222222-2222-4222-8222-000000000180', 'fatura.csv', 'csv', :'cur', jsonb_build_array(
  jsonb_build_object('type', 'match', 'tx_id', '33333333-3333-4333-8333-000000000181', 'external_id', 'ext-mercado', 'original_title', 'MERCADO BH 123'),
  jsonb_build_object('type', 'tx', 'title', 'Farmácia', 'category', 'Outros', 'amount', 40, 'date', date_trunc('month', public.kash_today())::date + 10, 'external_id', 'ext-farmacia')
)) as again \gset
select is((select (tx_count, matched_count, skipped_count)::text from public.imports where id = :'again'), '(0,0,2)', 'reimportar não vincula nem cria de novo');

-- desfazer: a compra nova sai e os lançamentos da Ana voltam como eram
select public.undo_import(:'imp');
select is((select count(*)::int from public.transactions where source_id = '22222222-2222-4222-8222-000000000180' and deleted_at is null), 2, 'desfazer tira só o que foi criado');
select is((select (amount, external_id, original_title)::text from public.transactions where id = '33333333-3333-4333-8333-000000000181'), '(-120.00,,)', 'mercado perde o vínculo');
select is((select (amount, date - date_trunc('month', public.kash_today())::date)::text from public.transactions where id = '33333333-3333-4333-8333-000000000182'), '(-25.00,8)', 'padaria volta ao valor e à data da Ana');

-- extrato da conta mantendo o saldo de hoje: corrigir o valor também não mexe no saldo
select public.import_account_statement('11111111-1111-4111-8111-000000000180', 'extrato.ofx', 'ofx', jsonb_build_array(
  jsonb_build_object('type', 'match', 'tx_id', '33333333-3333-4333-8333-000000000183', 'external_id', 'ofx:a2', 'original_title', 'SUPERMERCADO', 'amount', -80, 'date', date_trunc('month', public.kash_today())::date + 5)
), true) as acc \gset
select is((select amount from public.transactions where id = '33333333-3333-4333-8333-000000000183'), -80.00::numeric, 'extrato: valor corrigido');
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-000000000180'), 920.10::numeric, 'saldo de hoje mantido (1000 − 79,90 de antes)');
select public.undo_import(:'acc');
select is((select (amount, external_id)::text from public.transactions where id = '33333333-3333-4333-8333-000000000183'), '(-79.90,)', 'desfazer devolve o valor da Ana');
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-000000000180'), 920.10::numeric, 'e o saldo continua o mesmo');

-- sinal trocado (entrada contra saída) não é conferido
select public.import_account_statement('11111111-1111-4111-8111-000000000180', 'x', 'csv', jsonb_build_array(
  jsonb_build_object('type', 'match', 'tx_id', '33333333-3333-4333-8333-000000000183', 'external_id', 'x1', 'original_title', 'X', 'amount', 80)
), true) as wrong \gset
select is((select (matched_count, skipped_count)::text from public.imports where id = :'wrong'), '(0,1)', 'entrada não confere com saída');

-- lançamento de outra pessoa não pode ser vinculado
select tests.create_user('rec-b@test.com', 'Bia') as b \gset
select tests.login_as(:'b');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000189', 'Da Bia', '0001', 1000, 5, 13);
select public.import_card_statement('22222222-2222-4222-8222-000000000189', 'x', 'csv', :'cur', jsonb_build_array(
  jsonb_build_object('type', 'match', 'tx_id', '33333333-3333-4333-8333-000000000181', 'external_id', 'roubo', 'original_title', 'X')
)) as other \gset
select is((select (matched_count, skipped_count)::text from public.imports where id = :'other'), '(0,1)', 'não vincula lançamento de outra pessoa');

select * from finish();
rollback;
