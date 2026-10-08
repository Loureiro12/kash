begin;
select plan(20);

select tests.create_user('cat-a@test.com', 'Ana') as a \gset
select tests.create_user('cat-b@test.com', 'Bia') as b \gset

-- usuário novo nasce com as 6 categorias padrão, em ordem
select tests.login_as(:'a');
select is((select count(*) from public.categories), 6::bigint, 'usuário novo tem 6 categorias');
select is((select string_agg(name, ',' order by position) from public.categories), 'Comida,Transporte,Lazer,Mercado,Assinaturas,Outros', 'na ordem padrão');

-- criar: vai para o fim; nome repetido (sem diferenciar maiúsculas), reservado ou vazio é recusado
insert into public.categories (name, color) values ('Pets', '#FF8A3D');
select is((select position from public.categories where name = 'Pets'), 6, 'nova categoria vai para o fim');
select throws_ok($$insert into public.categories (name, color) values ('pets', '#000000')$$, '23505', null, 'nome repetido é recusado');
select throws_ok($$insert into public.categories (name, color) values ('Entrada', '#000000')$$, '23514', null, 'nome reservado é recusado');
select throws_ok($$insert into public.categories (name, color) values ('', '#000000')$$, '23514', null, 'nome vazio é recusado');
select throws_ok($$insert into public.categories (name, color) values ('Uma categoria com nome longo demais', '#000000')$$, '23514', null, 'nome longo é recusado');

-- lançamento, conta fixa e parcelamento aceitam a categoria nova
insert into public.accounts (id, name) values ('11111111-1111-4111-8111-000000000090', 'Conta');
insert into public.cards (id, name, last4, credit_limit, closing_day, due_day) values ('22222222-2222-4222-8222-000000000090', 'Cartão', '9090', 1000, 10, 20);
insert into public.transactions (title, category, amount, source_type, source_id) values
  ('Pets', 'Pets', -50, 'account', '11111111-1111-4111-8111-000000000090'),
  ('Ração', 'Pets', -80, 'account', '11111111-1111-4111-8111-000000000090');
insert into public.bills (name, amount, due_day, category, source_type, source_id) values ('Plano pet', 39.9, 5, 'Pets', 'card', '22222222-2222-4222-8222-000000000090');
select public.add_installment_purchase('Arranhador', 'Pets', '22222222-2222-4222-8222-000000000090', 300, 3);
select throws_ok($$insert into public.bills (name, amount, due_day, category) values ('X', 10, 5, 'Fatura')$$, '23514', null, 'conta fixa não aceita categoria de sistema');

-- renomear leva junto lançamentos, contas fixas, parcelamentos e títulos iguais ao nome antigo
select public.update_category((select id from public.categories where name = 'Pets'), '  Bichos ', '#ff8a3d');
select is((select color from public.categories where name = 'Bichos'), '#FF8A3D', 'renomeia, apara espaços e normaliza a cor');
select is((select count(*) from public.transactions where category = 'Bichos'), 3::bigint, 'lançamentos acompanham o novo nome');
select is((select count(*) from public.transactions where title = 'Bichos'), 1::bigint, 'título igual ao nome antigo também muda');
select is((select title from public.transactions where title = 'Ração'), 'Ração', 'título com descrição não muda');
select is((select category from public.bills where name = 'Plano pet'), 'Bichos', 'conta fixa acompanha');
select is((select category from public.plans where title = 'Arranhador'), 'Bichos', 'parcelamento acompanha');

-- excluir em uso exige destino; com destino, move tudo e apaga
select throws_ok($$select public.delete_category((select id from public.categories where name = 'Bichos'))$$, '23503', null, 'em uso sem destino é recusado');
select public.delete_category((select id from public.categories where name = 'Bichos'), 'Outros');
select is((select count(*) from public.categories where name = 'Bichos'), 0::bigint, 'categoria excluída');
select is((select count(*) from public.transactions where category = 'Outros'), 3::bigint, 'lançamentos foram para Outros');

-- outra usuária não vê nem altera as categorias de A
select tests.login_as(:'b');
select is((select count(*) from public.categories where name = 'Outros'), 1::bigint, 'B só vê as próprias');
select throws_ok($$select public.update_category((select id from public.categories where user_id <> auth.uid() limit 1), 'x', '#000000')$$, 'P0002', null, 'B não renomeia categoria de A');

-- não dá para excluir a última
delete from public.categories where name <> 'Outros';
select throws_ok($$select public.delete_category((select id from public.categories where name = 'Outros'))$$, '23514', null, 'a última categoria não pode ser excluída');

select * from finish();
rollback;
