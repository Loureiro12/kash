begin;
select plan(6);

select tests.create_user('cor@test.com', 'Cor') as u \gset
select tests.login_as(:'u');

insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000080', 'Cartão', '8080', 1000, 10, 20);
select is((select color from public.cards where id = '22222222-2222-4222-8222-000000000080'), null, 'cartão sem cor própria usa o gradiente');

update public.cards set color = '#FF5733' where id = '22222222-2222-4222-8222-000000000080';
select is((select color from public.cards where id = '22222222-2222-4222-8222-000000000080'), '#FF5733', 'cartão aceita cor #RRGGBB');
select throws_ok($$update public.cards set color = 'vermelho' where id = '22222222-2222-4222-8222-000000000080'$$, '23514', null, 'cor inválida no cartão é recusada');
select throws_ok($$update public.cards set color = '#ff5733' where id = '22222222-2222-4222-8222-000000000080'$$, '23514', null, 'cartão exige maiúsculas (o app normaliza)');

select lives_ok($$insert into public.accounts (name, color) values ('Conta', '#12abEF')$$, 'conta aceita qualquer #RRGGBB');
select throws_ok($$insert into public.accounts (name, color) values ('Conta', 'azul')$$, '23514', null, 'cor inválida na conta é recusada');

select * from finish();
rollback;
