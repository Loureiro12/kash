begin;
select plan(8);

select tests.create_user('parc@test.com', 'Parc') as u \gset
select tests.login_as(:'u');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000070', 'Cartão', '7070', 5000, 10, 20);
update public.profiles set last_rollover_month = public.month_key(public.kash_today()) where id = :'u';

-- compra com a 1ª parcela há 8 meses: entra direto na 9/12, só esta é lançada
select public.add_installment_purchase('Celular', 'Outros', '22222222-2222-4222-8222-000000000070', 1200, 12, public.kash_today(), 9) as plan \gset
select is((select current from public.plans where id = :'plan'), 9, 'plano começa na parcela 9');
select is((select count(*) from public.transactions where plan_id = :'plan'), 1::bigint, 'só a parcela do mês é lançada');
select is((select title from public.transactions where plan_id = :'plan'), 'Celular (9/12)', 'título com a parcela atual');
select is((select amount from public.transactions where plan_id = :'plan'), -100.00::numeric, 'valor da parcela');

-- virada de mês segue a partir dela
update public.profiles set last_rollover_month = public.month_key((public.kash_today() - interval '1 month')::date) where id = :'u';
select public.ensure_rollover();
select is((select current from public.plans where id = :'plan'), 10, 'virada lança a parcela 10');

-- chamada antiga (sem p_current) continua começando na 1
select public.add_installment_purchase('TV', 'Outros', '22222222-2222-4222-8222-000000000070', 600, 3) as tv \gset
select is((select current from public.plans where id = :'tv'), 1, 'padrão continua 1');

-- limites
select throws_ok($$select public.add_installment_purchase('X', 'Outros', '22222222-2222-4222-8222-000000000070', 100, 2, public.kash_today(), 3)$$, '23514', null, 'parcela além do total é recusada');
select throws_ok($$select public.add_installment_purchase('X', 'Outros', '22222222-2222-4222-8222-000000000070', 100, 2, public.kash_today(), 0)$$, '23514', null, 'parcela 0 é recusada');

select * from finish();
rollback;
