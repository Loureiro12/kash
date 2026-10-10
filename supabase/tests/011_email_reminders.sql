begin;
select plan(16);

select tests.create_user('lem-a@test.com', 'Ana') as a \gset
select tests.create_user('lem-b@test.com', 'Bia') as b \gset

-- Ana: lembrete por e-mail ligado
select tests.login_as(:'a');
update public.profiles set email_reminder = true where id = :'a';
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-000000000110', 'Corrente', 1000);
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000110', 'Roxo', '4821', 3000, 28, 10);
insert into public.transactions (id, title, category, amount, date, source_type, source_id)
  values ('33333333-3333-4333-8333-000000000110', 'Luz', 'Outros', -90, '2026-10-02', 'account', '11111111-1111-4111-8111-000000000110');
insert into public.bills (name, amount, due_day, source_type, source_id) values ('Internet', 99.9, 10, 'account', '11111111-1111-4111-8111-000000000110');
insert into public.bills (name, amount, due_day, paid_tx_id) values ('Luz', 90, 10, '33333333-3333-4333-8333-000000000110');
insert into public.bills (name, amount, due_day) values ('Academia', 80, 15);
insert into public.bills (name, amount, due_day, paid_tx_id) values ('Aluguel', 900, 1, '33333333-3333-4333-8333-000000000110');
insert into public.bills (name, amount, due_day) values ('Streaming', 39.9, 31);
insert into public.invoices (card_id, month, total) values ('22222222-2222-4222-8222-000000000110', '2026-09', 450);
insert into public.goals (name, target, saved, monthly, deposit_day) values ('Viagem', 1000, 100, 50, 8);
insert into public.goals (name, target, saved, monthly, deposit_day, last_deposit_date) values ('Reserva', 1000, 100, 50, 8, '2026-10-01');
insert into public.goals (name, target, saved, monthly, deposit_day) values ('Batida', 100, 100, 50, 8);

-- Bia: tem conta vencendo, mas não ligou o lembrete
select tests.login_as(:'b');
insert into public.bills (name, amount, due_day) values ('Internet da Bia', 100, 10);

-- a pessoa não chama a função (só o servidor)
select throws_ok($$select * from public.reminder_digest('2026-10-08')$$, '42501', null, 'usuária comum não lê o digest');

select tests.logout();

-- 08/10: avisa o que vence em 10/10 e os depósitos de hoje
create temp table d as select * from public.reminder_digest('2026-10-08');
select is((select count(*)::int from d), 1, 'só quem ligou o lembrete recebe');
select is((select email from d), 'lem-a@test.com', 'e-mail da Ana');
select is((select name from d), 'Ana', 'nome para a saudação');
select is((select jsonb_array_length(items) from d), 3, 'conta a pagar, fatura e depósito do dia');
select ok((select items @> '[{"kind":"bill","title":"Internet","source":"Corrente","due":"2026-10-10"}]' from d), 'conta fixa a pagar, com onde é cobrada');
select ok((select not items @> '[{"title":"Luz"}]' from d), 'conta já paga no mês não entra');
select ok((select not items @> '[{"title":"Academia"}]' from d), 'conta que vence em outro dia não entra');
select ok((select items @> '[{"kind":"invoice","title":"Roxo","month":"2026-09","due":"2026-10-10"}]' from d), 'fatura fechada vence no dia do cartão do mês seguinte');
select ok((select items @> '[{"kind":"goal","title":"Viagem"}]' from d), 'meta no dia do depósito');
select ok((select not items @> '[{"title":"Reserva"}]' and not items @> '[{"title":"Batida"}]' from d), 'meta já depositada no mês ou batida não entra');

-- já enviado no dia: não repete
select public.mark_reminder_sent(:'a', '2026-10-08', 3);
select public.mark_reminder_sent(:'a', '2026-10-08', 3);
select is((select count(*)::int from public.reminder_digest('2026-10-08')), 0, 'um e-mail por dia, no máximo');
select is((select count(*)::int from public.reminder_emails where user_id = :'a'), 1, 'registro idempotente');

-- 30/10 → 01/11: a conta paga em outubro volta a ser lembrada para novembro
select ok((select items @> '[{"title":"Aluguel","due":"2026-11-01"}]' from public.reminder_digest('2026-10-30')), 'vencimento no mês seguinte ignora o pagamento do mês atual');
-- 28/11 → 30/11: dia 31 vira o último dia de novembro
select ok((select items @> '[{"title":"Streaming","due":"2026-11-30"}]' from public.reminder_digest('2026-11-28')), 'dia 31 vence no último dia do mês curto');

-- exportação inclui a preferência
select tests.login_as(:'a');
select is((public.export_my_data() -> 'settings' ->> 'email_reminder')::boolean, true, 'exportação traz email_reminder');

select * from finish();
rollback;
