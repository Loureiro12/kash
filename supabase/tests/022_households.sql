begin;
select plan(32);

select tests.create_user('ana@test.com', 'Ana Souza') as a \gset
select tests.create_user('bruno@test.com', 'Bruno Lima') as b \gset
select tests.create_user('carla@test.com', 'Carla') as c \gset

-- texto do aviso
select is(public.household_push_text('Ana', 'iFood', 'Comida', -45.9, true), 'Ana lançou R$ 45,90 · iFood (Comida)', 'aviso de gasto');
select is(public.household_push_text('Ana', 'Salário', 'Entrada', 3200, true), 'Ana registrou uma entrada de R$ 3.200,00 · Salário', 'aviso de entrada');
select is(public.household_push_text('Ana', 'Mercado', 'Mercado', -1234.5, false), 'Ana lançou um gasto · Mercado', 'aviso sem valor');

-- convite
select tests.login_as(:'a');
select public.create_household_invite() ->> 'code' as code \gset
select ok(:'code' ~ '^[A-Z0-9]{8}$', 'código de 8 caracteres');
select is(public.create_household_invite() ->> 'code', :'code', 'convite vigente é reaproveitado');
select throws_ok(format('select public.accept_household_invite(%L)', :'code'), '23514', null, 'não dá para aceitar o próprio convite');

select tests.login_as(:'b');
select throws_ok($$select public.accept_household_invite('ZZZZZZZZ')$$, 'P0002', null, 'código inválido');
select lives_ok(format('select public.accept_household_invite(%L)', lower(:'code')), 'Bruno entra (caixa não importa)');
select is(jsonb_array_length(public.household_overview() -> 'members'), 2, 'dois membros');
select is(public.household_overview() -> 'members' -> 0 ->> 'name', 'Ana Souza', 'nome de quem convidou');

-- cheio: ninguém mais entra
select tests.login_as(:'a');
select public.my_household() as h \gset
select throws_ok($$select public.create_household_invite()$$, '23514', null, 'espaço cheio não gera convite');

-- dados: Ana com uma conta pessoal e uma compartilhada; Bruno com uma pessoal
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-0000000000a1', 'Pessoal Ana', 500);
insert into public.accounts (id, name, opening_balance, household_id) values ('11111111-1111-4111-8111-0000000000a2', 'Casa', 1000, public.my_household());
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day, household_id) values ('22222222-2222-4222-8222-0000000000a1', 'Cartão da casa', '1234', 3000, 5, 12, public.my_household());
insert into public.push_tokens (token, platform) values ('ExponentPushToken[ana-aparelho]', 'ios');
select tests.login_as(:'b');
insert into public.accounts (id, name, opening_balance) values ('11111111-1111-4111-8111-0000000000b1', 'Pessoal Bruno', 200);

select is((select count(*) from public.accounts where id = '11111111-1111-4111-8111-0000000000a1'), 0::bigint, 'Bruno não vê a conta pessoal da Ana');
select is((select count(*) from public.accounts where id = '11111111-1111-4111-8111-0000000000a2'), 1::bigint, 'Bruno vê a conta compartilhada');

-- Bruno lança na conta da casa e no cartão da casa: herda o espaço, avisa a Ana
select count(*) as before_push from net.http_request_queue \gset
insert into public.transactions (title, category, amount, date, source_type, source_id)
  values ('Mercado', 'Mercado', -150, public.kash_today(), 'account', '11111111-1111-4111-8111-0000000000a2');
select isnt((select household_id from public.transactions where title = 'Mercado'), null, 'lançamento herda o espaço da conta');
select is((select count(*) from net.http_request_queue), :'before_push'::bigint + 1, 'aviso enviado para o aparelho da Ana');
select ok((select convert_from(body, 'UTF8') from net.http_request_queue order by id desc limit 1) like '%Bruno lançou R$ 150,00 · Mercado%', 'texto do aviso com o nome de quem lançou');
-- rajada: o segundo lançamento seguido não gera outro aviso
insert into public.transactions (title, category, amount, date, source_type, source_id)
  values ('Padaria', 'Comida', -20, public.kash_today(), 'card', '22222222-2222-4222-8222-0000000000a1');
select is((select count(*) from net.http_request_queue), :'before_push'::bigint + 1, 'rajada: um aviso a cada 20 s');

-- não dá para lançar na conta pessoal da Ana, mesmo vendo
select tests.login_as(:'a');
select lives_ok($$select public.update_household_settings(p_share_personal := true)$$, 'Ana mostra o pessoal');
select tests.login_as(:'b');
select is((select count(*) from public.accounts where id = '11111111-1111-4111-8111-0000000000a1'), 1::bigint, 'agora Bruno vê a conta pessoal da Ana');
select throws_ok($$insert into public.transactions (title, category, amount, date, source_type, source_id) values ('x', 'Lazer', -1, public.kash_today(), 'account', '11111111-1111-4111-8111-0000000000a1')$$, '42501', null, 'mas não lança nela');
update public.accounts set name = 'Hackeado' where id = '11111111-1111-4111-8111-0000000000a1';
select tests.login_as(:'a');
select is((select name from public.accounts where id = '11111111-1111-4111-8111-0000000000a1'), 'Pessoal Ana', 'nem altera a conta pessoal da Ana');
select is((select balance from public.account_balances where account_id = '11111111-1111-4111-8111-0000000000a2'), 850::numeric, 'saldo da conta da casa conta o lançamento do Bruno');
select is((select used from public.card_usage where card_id = '22222222-2222-4222-8222-0000000000a1'), 20::numeric, 'fatura do cartão da casa');

-- Carla, de fora, não vê nada
select tests.login_as(:'c');
select is((select count(*) from public.accounts), 0::bigint, 'RLS: quem está fora não vê nada do casal');
select is((select count(*) from public.transactions), 0::bigint, 'RLS: nem os lançamentos');
select throws_ok(format('insert into public.accounts (name, opening_balance, household_id) values (%L, 0, %L)', 'x', :'h'), '42501', null, 'não cria conta no espaço dos outros');

-- exportação da Ana: o dela e o compartilhado, nunca o pessoal do Bruno
select tests.login_as(:'b');
select public.update_household_settings(p_share_personal := true);
select tests.login_as(:'a');
select is((select count(*) from jsonb_array_elements(public.export_my_data() -> 'accounts') e where e ->> 'name' = 'Pessoal Bruno'), 0::bigint, 'exportação não leva o pessoal do outro');

-- "Zerar meus dados" mantém o compartilhado
select public.reset_my_data();
select is((select count(*) from public.accounts where household_id is not null), 1::bigint, 'zerar mantém a conta da casa');

-- Bruno sai: o que ele lançou no compartilhado fica com a Ana
select tests.login_as(:'b');
select public.leave_household();
select is((select count(*) from public.accounts where id = '11111111-1111-4111-8111-0000000000a2'), 0::bigint, 'quem saiu não vê mais a conta da casa');
select tests.login_as(:'a');
select is((select count(*) from public.transactions where title = 'Mercado' and user_id = :'a'::uuid), 1::bigint, 'lançamento dele no compartilhado passou para a Ana');

-- Bruno volta e a Ana exclui a conta: a conta da casa passa para ele (não some em cascata)
select public.create_household_invite() ->> 'code' as code2 \gset
select tests.login_as(:'b');
select public.accept_household_invite(:'code2');
select tests.logout();
delete from auth.users where id = :'a'::uuid;
select is((select user_id from public.accounts where id = '11111111-1111-4111-8111-0000000000a2'), :'b'::uuid, 'conta excluída: a conta da casa fica com o Bruno');
select is((select role from public.household_members where user_id = :'b'::uuid), 'owner', 'e ele vira o dono do espaço');

select * from finish();
rollback;
