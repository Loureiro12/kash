-- Login social (Apple e Google): o perfil nasce com o nome que o provedor manda.
-- Google: `name`/`full_name`; Apple pela web: `full_name` só no primeiro login (no app iOS o nome
-- chega depois, pelo próprio app). Cadastro por e-mail continua mandando `name`.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''));
  perform public.seed_default_categories(new.id);
  return new;
end $$;
