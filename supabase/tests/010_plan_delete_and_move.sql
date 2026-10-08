begin;
select plan(13);

select tests.create_user('plano@test.com', 'Plano') as u \gset
select tests.login_as(:'u');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values
  ('22222222-2222-4222-8222-0000000000a1', 'Cartão A', '1111', 5000, 10, 20),
  ('22222222-2222-4222-8222-0000000000a2', 'Cartão B', '2222', 5000, 10, 20);

-- excluir "todas as parcelas": some da lista e não volta na virada; desfazer restaura
select public.add_installment_purchase('TV', 'Outros', '22222222-2222-4222-8222-0000000000a1', 1200, 12, public.kash_today(), 9) as tv \gset
select public.soft_delete_transaction((select id from public.transactions where plan_id = :'tv'), 'plan') as grp \gset
select isnt((select deleted_at from public.plans where id = :'tv'), null, 'parcelamento excluído fica marcado');
select is((select current from public.plans where id = :'tv'), 9, 'contador preservado para o desfazer');
update public.profiles set last_rollover_month = public.month_key((public.kash_today() - interval '1 month')::date) where id = :'u';
select public.ensure_rollover();
select is((select count(*) from public.transactions where plan_id = :'tv' and deleted_at is null), 0::bigint, 'virada não relança parcelamento excluído');
select public.undo_delete_transaction(:'grp');
select is((select deleted_at from public.plans where id = :'tv'), null, 'desfazer restaura o parcelamento');
select is((select current from public.plans where id = :'tv'), 9, 'desfazer mantém a parcela 9 (não recalcula contando lançamentos)');

-- excluir "só esta parcela": contador não muda (a próxima segue a numeração)
select public.add_installment_purchase('Fone', 'Outros', '22222222-2222-4222-8222-0000000000a1', 300, 3) as fone \gset
select public.soft_delete_transaction((select id from public.transactions where plan_id = :'fone'), 'single');
select is((select current from public.plans where id = :'fone'), 1, 'excluir uma parcela não volta o contador');
select is((select deleted_at from public.plans where id = :'fone'), null, 'o parcelamento continua ativo');
update public.profiles set last_rollover_month = public.month_key((public.kash_today() - interval '1 month')::date) where id = :'u';
select public.ensure_rollover();
select is((select title from public.transactions where plan_id = :'fone' and deleted_at is null), 'Fone (2/3)', 'virada lança a parcela seguinte, sem repetir a excluída');

-- trocar de cartão move o parcelamento inteiro
select public.add_installment_purchase('Notebook', 'Outros', '22222222-2222-4222-8222-0000000000a1', 2400, 6) as nb \gset
select public.move_plan_to_card(:'nb', '22222222-2222-4222-8222-0000000000a2');
select is((select card_id from public.plans where id = :'nb'), '22222222-2222-4222-8222-0000000000a2'::uuid, 'parcelamento vai para o cartão B');
select is((select count(*) from public.transactions where plan_id = :'nb' and source_id = '22222222-2222-4222-8222-0000000000a2'), 1::bigint, 'parcelas lançadas vão junto');
update public.profiles set last_rollover_month = public.month_key((public.kash_today() - interval '1 month')::date) where id = :'u';
select public.ensure_rollover();
select is((select count(*) from public.transactions where plan_id = :'nb' and source_id = '22222222-2222-4222-8222-0000000000a1'), 0::bigint, 'próximas parcelas caem no cartão B');
select throws_ok($$select public.move_plan_to_card((select id from public.plans where title = 'Notebook'), '00000000-0000-4000-8000-000000000000')$$, 'P0002', null, 'cartão inexistente é recusado');

-- outra pessoa não move parcelamento alheio
select tests.create_user('outro@test.com', 'Outro') as o \gset
select tests.login_as(:'o');
select throws_ok(format($$select public.move_plan_to_card(%L, %L)$$, :'nb', '22222222-2222-4222-8222-0000000000a1'), 'P0002', null, 'não move parcelamento de outro usuário');

select * from finish();
rollback;
