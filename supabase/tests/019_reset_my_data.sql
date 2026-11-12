begin;
select plan(14);

select tests.create_user('reset-a@test.com', 'Ana') as a \gset
select tests.create_user('reset-b@test.com', 'Bia') as b \gset

-- Bia tem dados e não pode ser afetada
select tests.login_as(:'b');
insert into public.accounts (name, opening_balance) values ('Conta da Bia', 50);

-- Ana usa o Kash de tudo quanto é jeito
select tests.login_as(:'a');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000190', 'Nubank', '1670', 5000, 5, 13);
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000190', 'Corrente', 1000);
insert into public.transactions (title, category, amount, source_type, source_id) values
  ('Café', 'Comida', -5, 'account', '11111111-1111-4111-8111-000000000190'),
  ('Fone', 'Lazer', -300, 'card', '22222222-2222-4222-8222-000000000190');
select public.soft_delete_transaction((select id from public.transactions where title = 'Café'));
insert into public.bills (name, amount, due_day, category, source_type, source_id) values ('Internet', 100, 10, 'Casa', 'account', '11111111-1111-4111-8111-000000000190');
insert into public.goals (name, target, saved, monthly) values ('Viagem', 1000, 0, 50);
insert into public.categories (name, color) values ('Pets', '#FF00AA');
insert into public.merchant_rules (pattern, title, category) values ('IFOOD', 'iFood', 'Comida');
select public.import_card_statement('22222222-2222-4222-8222-000000000190', 'fatura.csv', 'csv', public.month_key(public.kash_today()), jsonb_build_array(
  jsonb_build_object('type', 'tx', 'title', 'Farmácia', 'original_title', 'FARMACIA X', 'category', 'Outros', 'amount', 40, 'date', public.kash_today(), 'external_id', 'ext-farm')
));
update public.profiles set monthly_budget = 3000, card_budget = 1000, onboarding_done_at = now(), checklist_hidden_at = now(), theme = 'light', phone = '31999990000' where id = :'a';
select count(*)::int as default_categories from public.categories where user_id = :'a' and name <> 'Pets' \gset

select public.reset_my_data();

select is((select count(*)::int from public.transactions where user_id = :'a'), 0, 'lançamentos apagados, inclusive os já excluídos');
select is((select count(*)::int from public.accounts where user_id = :'a'), 0, 'contas apagadas');
select is((select count(*)::int from public.cards where user_id = :'a'), 0, 'cartões apagados');
select is((select count(*)::int from public.invoices where user_id = :'a'), 0, 'faturas apagadas');
select is((select (select count(*) from public.bills where user_id = :'a') + (select count(*) from public.goals where user_id = :'a'))::int, 0, 'contas fixas e metas apagadas');
select is((select (select count(*) from public.imports where user_id = :'a') + (select count(*) from public.merchant_rules where user_id = :'a'))::int, 0, 'importações e regras aprendidas apagadas');
select is((select count(*)::int from public.categories where user_id = :'a'), :'default_categories'::int, 'categorias voltam ao padrão');
select is((select count(*)::int from public.categories where user_id = :'a' and name = 'Pets'), 0, 'categoria criada pela Ana some');
select is((select (monthly_budget, card_budget)::text from public.profiles where id = :'a'), '(1800.00,0.00)', 'limite mensal volta ao padrão, sem divisão');
select is((select (onboarding_done_at is null and checklist_hidden_at is null) from public.profiles where id = :'a'), true, 'boas-vindas e primeiros passos voltam');
select is((select (name, phone, theme)::text from public.profiles where id = :'a'), '(Ana,31999990000,light)', 'nome, celular e tema ficam');

-- dá pra recomeçar na hora
insert into public.accounts (name, opening_balance) values ('Nova conta', 10);
select is((select count(*)::int from public.accounts where user_id = :'a'), 1, 'recomeça normalmente');

select tests.login_as(:'b');
select is((select count(*)::int from public.accounts), 1, 'dados da Bia intactos');

select tests.logout();
select throws_ok('select public.reset_my_data()', '42501', null, 'sem login não zera nada');

select * from finish();
rollback;
