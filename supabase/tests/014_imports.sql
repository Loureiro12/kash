begin;
select plan(20);

select tests.create_user('imp-a@test.com', 'Ana') as a \gset
select tests.create_user('imp-b@test.com', 'Bia') as b \gset

select tests.login_as(:'b');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000149', 'Da Bia', '0001', 1000, 5, 13);

select tests.login_as(:'a');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000140', 'Nubank', '1670', 6400, 5, 13);
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000140', 'Corrente', 1000);

-- fatura de "mês passado" (competência) com uma compra à vista e um parcelado 2/12 → plano na 3/12 agora
select public.month_key((public.kash_today() - interval '1 month')::date) as prev \gset
select public.month_key(public.kash_today()) as cur \gset
select public.import_card_statement('22222222-2222-4222-8222-000000000140', 'nubank.pdf', 'pdf', :'prev', jsonb_build_array(
  jsonb_build_object('type', 'plan', 'title', 'HBO Max', 'original_title', 'Dm*Helphbomaxcom - Parcela 2/12', 'category', 'Assinaturas',
    'per', 22.90, 'installments', 12, 'current', 3, 'current_date', public.kash_today(), 'external_id', 'plan-hbo',
    'past_date', (date_trunc('month', public.kash_today()) - interval '25 days')::date, 'past_installment', 2),
  jsonb_build_object('type', 'tx', 'title', 'Spotify', 'original_title', 'EBW*Spotify - NuPay', 'category', 'Assinaturas',
    'amount', 23.90, 'date', (date_trunc('month', public.kash_today()) - interval '20 days')::date, 'external_id', 'tx-spotify')
)) as imp \gset

select is((select count(*)::int from public.plans where import_id = :'imp'), 1, 'parcelamento criado');
select is((select current from public.plans where import_id = :'imp'), 3, 'parcela atual = a da fatura + meses que passaram');
select is((select original_title from public.plans where import_id = :'imp'), 'Dm*Helphbomaxcom - Parcela 2/12', 'nome original guardado no plano');
select is((select count(*)::int from public.transactions where import_id = :'imp'), 3, 'parcela do mês atual + parcela da fatura + compra à vista');
select is((select title from public.transactions where import_id = :'imp' and public.month_key(date) = :'cur'), 'HBO Max (3/12)', 'parcela do mês atual com o nome escolhido');
select is((select original_title from public.transactions where external_id = 'tx-spotify'), 'EBW*Spotify - NuPay', 'nome original guardado no lançamento');
select is((select total from public.invoices where card_id = '22222222-2222-4222-8222-000000000140' and month = :'prev'), 46.80::numeric, 'fatura fechada do mês recalculada (pode pagar pelo Kash)');
select is((select array[tx_count, plan_count, skipped_count] from public.imports where id = :'imp'), array[2, 1, 0], 'contagens da importação');

-- importar de novo a mesma fatura não duplica nada
select public.import_card_statement('22222222-2222-4222-8222-000000000140', 'nubank.pdf', 'pdf', :'prev', jsonb_build_array(
  jsonb_build_object('type', 'plan', 'title', 'HBO', 'original_title', 'x', 'category', 'Assinaturas', 'per', 22.90, 'installments', 12, 'current', 3, 'current_date', public.kash_today(), 'external_id', 'plan-hbo'),
  jsonb_build_object('type', 'tx', 'title', 'Spotify', 'original_title', 'x', 'category', 'Assinaturas', 'amount', 23.90, 'date', public.kash_today(), 'external_id', 'tx-spotify')
)) as imp2 \gset
select is((select array[tx_count, plan_count, skipped_count] from public.imports where id = :'imp2'), array[0, 0, 2], 'reimportar pula o que já existe');
select is((select count(*)::int from public.plans where card_id = '22222222-2222-4222-8222-000000000140' and deleted_at is null), 1, 'continua um parcelamento só');

-- desfazer a importação
select public.undo_import(:'imp');
select is((select count(*)::int from public.transactions where import_id = :'imp' and deleted_at is null), 0, 'desfazer tira os lançamentos');
select is((select count(*)::int from public.plans where import_id = :'imp' and deleted_at is null), 0, 'desfazer tira o parcelamento');
select is((select count(*)::int from public.invoices where card_id = '22222222-2222-4222-8222-000000000140' and month = :'prev'), 0, 'fatura fechada sem lançamentos some');
select isnt((select undone_at from public.imports where id = :'imp'), null, 'importação marcada como desfeita');
select throws_ok(format('select public.undo_import(%L)', :'imp'), 'P0002', null, 'não desfaz duas vezes');

-- depois de desfeita, a mesma linha pode ser importada de novo
select public.import_card_statement('22222222-2222-4222-8222-000000000140', 'nubank.pdf', 'pdf', :'prev', jsonb_build_array(
  jsonb_build_object('type', 'tx', 'title', 'Spotify', 'original_title', 'x', 'category', 'Assinaturas', 'amount', 23.90, 'date', public.kash_today(), 'external_id', 'tx-spotify')
)) as imp3 \gset
select is((select tx_count from public.imports where id = :'imp3'), 1, 'reimporta depois de desfazer');

-- extrato da conta mantendo o saldo de hoje
select public.import_account_statement('11111111-1111-4111-8111-000000000140', 'extrato.ofx', 'ofx', jsonb_build_array(
  jsonb_build_object('title', 'Salário', 'original_title', 'PIX RECEBIDO EMPRESA', 'category', 'Outros', 'amount', 3000, 'date', '2026-09-05', 'external_id', 'fit-1'),
  jsonb_build_object('title', 'Aluguel', 'original_title', 'PIX ENVIADO IMOBILIARIA', 'category', 'Outros', 'amount', -1200, 'date', '2026-09-10', 'external_id', 'fit-2')
), true) as acc \gset
select is((select balance from public.accounts_with_balance where id = '11111111-1111-4111-8111-000000000140'), 1000.00::numeric, 'saldo de hoje não muda');
select is((select category::text from public.transactions where external_id = 'fit-1'), 'Entrada', 'crédito vira entrada');
select public.undo_import(:'acc');
select is((select opening_balance from public.accounts where id = '11111111-1111-4111-8111-000000000140'), 1000.00::numeric, 'desfazer devolve a abertura da conta');

-- não importa em cartão de outra pessoa
select throws_ok($$select public.import_card_statement('22222222-2222-4222-8222-000000000149', 'x', 'csv', null, '[]'::jsonb)$$, 'P0002', null, 'cartão de outra pessoa');

select * from finish();
rollback;
