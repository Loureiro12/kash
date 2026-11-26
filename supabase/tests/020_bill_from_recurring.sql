begin;
select plan(9);

select tests.create_user('rec@test.com', 'Rec') as u \gset
select tests.login_as(:'u');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000020', 'Cartão', '0000', 1000, 10, 20);
insert into public.transactions (id, title, category, amount, date, source_type, source_id) values
  ('44444444-4444-4444-8444-000000000001', 'Netflix', 'Assinaturas', -39.90, public.kash_today(), 'card', '22222222-2222-4222-8222-000000000020'),
  ('44444444-4444-4444-8444-000000000002', 'Netflix', 'Assinaturas', -39.90, (public.kash_today() - interval '40 days')::date, 'card', '22222222-2222-4222-8222-000000000020');
insert into public.bills (id, name, amount, due_day, category, source_type, source_id) values
  ('33333333-3333-4333-8333-000000000020', 'Netflix', 39.90, 12, 'Assinaturas', 'card', '22222222-2222-4222-8222-000000000020');

-- lançamento de outro mês não serve como pagamento deste
select throws_ok($$select public.link_bill_payment('33333333-3333-4333-8333-000000000020', '44444444-4444-4444-8444-000000000002')$$, 'transaction not found', 'só a cobrança deste mês');

select lives_ok($$select public.link_bill_payment('33333333-3333-4333-8333-000000000020', '44444444-4444-4444-8444-000000000001')$$, 'liga a cobrança deste mês');
select is((select paid_tx_id from public.bills where id = '33333333-3333-4333-8333-000000000020'), '44444444-4444-4444-8444-000000000001'::uuid, 'conta fica paga com o lançamento existente');
select is((select count(*) from public.transactions where title = 'Netflix'), 2::bigint, 'não cria lançamento novo');
select throws_ok($$select public.link_bill_payment('33333333-3333-4333-8333-000000000020', '44444444-4444-4444-8444-000000000001')$$, 'bill not found or already paid', 'não liga duas vezes');

-- desmarcar uma conta ligada não apaga a cobrança real
select public.unpay_bill('33333333-3333-4333-8333-000000000020');
select is((select count(*) from public.transactions where id = '44444444-4444-4444-8444-000000000001'), 1::bigint, 'desmarcar mantém o lançamento ligado');

-- pagar pela conta fixa volta a gerar (e desmarcar apaga) o lançamento
select public.pay_bill('33333333-3333-4333-8333-000000000020') as gen \gset
select is((select paid_tx_linked from public.bills where id = '33333333-3333-4333-8333-000000000020'), false, 'pay_bill não é ligado');
select public.unpay_bill('33333333-3333-4333-8333-000000000020');
select is((select count(*) from public.transactions where id = :'gen'), 0::bigint, 'desmarcar apaga o lançamento gerado');

-- outra pessoa não liga a conta de ninguém
select tests.create_user('outro@test.com', 'Outro') as o \gset
select tests.login_as(:'o');
select throws_ok($$select public.link_bill_payment('33333333-3333-4333-8333-000000000020', '44444444-4444-4444-8444-000000000001')$$, 'transaction not found', 'RLS: lançamento de outra pessoa não aparece');

select * from finish();
rollback;
