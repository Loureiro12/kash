begin;
select plan(9);

select tests.create_user('undo@test.com', 'Undo') as u \gset
select tests.login_as(:'u');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000020', 'Conta', 2000);
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000020', 'Principal', '0000', 1000, 10, 20);
insert into public.invoices (id, card_id, month, total) values ('44444444-4444-4444-8444-000000000001', '22222222-2222-4222-8222-000000000020', '2026-09', 300);

-- pagar fatura
select public.pay_invoice('44444444-4444-4444-8444-000000000001', '11111111-1111-4111-8111-000000000020') as tx \gset
select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-000000000020'), 1700::numeric, 'pagamento debita a conta');
select is((select category from public.transactions where id = :'tx'), 'Fatura', 'lançamento com categoria Fatura');
select is((select paid_at from public.invoices where id = '44444444-4444-4444-8444-000000000001'), public.kash_today(), 'fatura marcada como paga hoje');
select is(public.pay_invoice('44444444-4444-4444-8444-000000000001', '11111111-1111-4111-8111-000000000020'), :'tx'::uuid, 'pagar de novo devolve o mesmo lançamento');

-- excluir o pagamento reabre a fatura; desfazer restaura o lançamento
select public.soft_delete_transaction(:'tx') as grp \gset
select is((select paid_tx_id from public.invoices where id = '44444444-4444-4444-8444-000000000001'), null, 'excluir o pagamento reabre a fatura');
select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-000000000020'), 2000::numeric, 'saldo devolvido');
select is(public.undo_delete_transaction(:'grp'), 1, 'undo restaura 1 lançamento');
select is((select deleted_at from public.transactions where id = :'tx'), null, 'lançamento ativo de novo');

-- excluir o parcelamento inteiro marca o plano como excluído (o desfazer limpa a marca)
select public.add_installment_purchase('TV', 'Outros', '22222222-2222-4222-8222-000000000020', 600, 3) as plan \gset
select public.soft_delete_transaction((select id from public.transactions where plan_id = :'plan' limit 1), 'plan') as grp2 \gset
select isnt((select deleted_at from public.plans where id = :'plan'), null, 'parcelamento marcado como excluído ao excluir todas as parcelas');

select * from finish();
rollback;
