begin;
select plan(4);

-- perfis que nascem do login social (o Supabase grava o que o provedor manda em raw_user_meta_data)
create function pg_temp.new_user(meta jsonb) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_id::text || '@social.test', '{"provider":"google"}', meta, now(), now());
  return v_id;
end $$;

select pg_temp.new_user('{"full_name":"Ana Google","name":"Ana Google"}') as google \gset
select pg_temp.new_user('{"full_name":"Bia Apple"}') as apple \gset
select pg_temp.new_user('{}') as nameless \gset
select is((select name from public.profiles where id = :'google'), 'Ana Google', 'Google: nome do provedor');
select is((select name from public.profiles where id = :'apple'), 'Bia Apple', 'Apple pela web: full_name');
select is((select name from public.profiles where id = :'nameless'), '', 'sem nome (Apple no app): fica vazio até o app mandar');
select ok((select count(*) from public.categories c join public.profiles p on p.id = c.user_id where p.name = 'Ana Google') > 0, 'categorias padrão criadas também');

select * from finish();
rollback;
