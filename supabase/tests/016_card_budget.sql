begin;
select plan(4);

select tests.create_user('budget-a@test.com', 'Ana') as a \gset
select tests.login_as(:'a');

select is((select card_budget from public.profiles where id = :'a'), 0.00::numeric, 'começa sem divisão');
update public.profiles set monthly_budget = 2500, card_budget = 1800 where id = :'a';
select is((select card_budget from public.profiles where id = :'a'), 1800.00::numeric, 'grava a parte do cartão');
select is((public.export_my_data() -> 'settings' ->> 'card_budget')::numeric, 1800.00::numeric, 'vai na exportação dos dados');
select throws_ok($$update public.profiles set card_budget = -1 where id = auth.uid()$$, '23514', null, 'não aceita valor negativo');

select * from finish();
rollback;
