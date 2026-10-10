begin;
select plan(6);

select tests.create_user('rt-a@test.com', 'Ana') as a \gset
select tests.create_user('rt-b@test.com', 'Bia') as b \gset

-- escrita da Ana gera aviso no canal dela (insert, update e delete)
select tests.login_as(:'a');
insert into public.bills (id, name, amount, due_day) values ('44444444-4444-4444-8444-000000000120', 'Internet', 99.9, 10);
update public.bills set amount = 109.9 where id = '44444444-4444-4444-8444-000000000120';
delete from public.bills where id = '44444444-4444-4444-8444-000000000120';
update public.profiles set theme = 'light' where id = :'a';
select tests.logout();

select is((select count(*)::int from realtime.messages where topic = 'user:' || :'a' and payload ->> 'table' = 'bills'), 3, 'insert, update e delete avisam o canal da dona');
select ok((select bool_and(private) from realtime.messages where topic = 'user:' || :'a'), 'avisos vão em canal privado');
select is((select array_agg(payload ->> 'op' order by payload ->> 'op') from realtime.messages where topic = 'user:' || :'a' and payload ->> 'table' = 'bills'), array['delete', 'insert', 'update'], 'operação vai no aviso');
select ok(exists(select 1 from realtime.messages where topic = 'user:' || :'a' and payload ->> 'table' = 'profiles' and payload ->> 'op' = 'update'), 'perfil (tema, nome…) também avisa');
select ok((select not (payload ? 'amount') from realtime.messages where topic = 'user:' || :'a' limit 1), 'o aviso não carrega os dados do registro');

-- a Bia não lê o canal da Ana
select tests.login_as(:'b');
select is((select count(*)::int from realtime.messages where topic = 'user:' || :'a'), 0, 'outra pessoa não lê o canal');

select * from finish();
rollback;
