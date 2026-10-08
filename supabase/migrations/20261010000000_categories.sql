-- Categorias do usuário: cada pessoa tem sua lista (nome + cor), pode criar, renomear e excluir.
-- Lançamentos, contas fixas e parcelamentos continuam guardando o NOME da categoria; renomear e
-- excluir são RPCs que atualizam essas linhas na mesma transação. 'Entrada' e 'Fatura' são
-- categorias de sistema (só em lançamentos) e não podem ser usadas como nome.

-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 24 and name = trim(name) and lower(name) not in ('entrada', 'fatura')),
  color text not null check (color ~ '^#[0-9A-F]{6}$'),
  -- -1 (padrão) = "no fim da lista"; o gatilho troca pela próxima posição livre
  position int not null default -1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_user_name_idx on public.categories (user_id, lower(name));
create index categories_user_idx on public.categories (user_id, position);
alter table public.categories enable row level security;
create policy "categories: dono" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.set_category_position()
returns trigger language plpgsql as $$
begin
  if new.position < 0 then
    select coalesce(max(position) + 1, 0) into new.position from public.categories where user_id = new.user_id;
  end if;
  return new;
end $$;

-- a ordem importa: primeiro o dono, depois a posição (que depende do dono)
create trigger categories_a_user_id before insert on public.categories for each row execute function public.set_user_id();
create trigger categories_b_position before insert on public.categories for each row execute function public.set_category_position();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Categorias padrão (novos usuários e os que já existem)
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_categories(p_uid uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.categories (user_id, name, color, position)
  select p_uid, d.name, d.color, d.pos
    from (values
      ('Comida', '#FFB86B', 0), ('Transporte', '#6BC5FF', 1), ('Lazer', '#D98BFF', 2),
      ('Mercado', '#7EE0A8', 3), ('Assinaturas', '#FF8FB1', 4), ('Outros', '#AAB2BF', 5)
    ) as d(name, color, pos)
  on conflict do nothing;
$$;
revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  perform public.seed_default_categories(new.id);
  return new;
end $$;

select public.seed_default_categories(id) from public.profiles;

-- ---------------------------------------------------------------------------
-- Nomes livres nas colunas de categoria
-- ---------------------------------------------------------------------------
-- tx_category: qualquer nome válido (inclui 'Entrada' e 'Fatura'); expense_category: idem, menos os de sistema.
alter domain public.tx_category drop constraint tx_category_check;
alter domain public.tx_category add constraint tx_category_check check (length(trim(value)) between 1 and 24);
alter domain public.expense_category drop constraint expense_category_check;
alter domain public.expense_category add constraint expense_category_check check (length(trim(value)) between 1 and 24 and lower(value) not in ('entrada', 'fatura'));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
-- Renomeia/recolore. Ao mudar o nome, leva junto lançamentos (inclusive excluídos, para o desfazer),
-- contas fixas e parcelamentos; títulos iguais ao nome antigo (lançados sem descrição) também mudam.
create or replace function public.update_category(p_id uuid, p_name text, p_color text)
returns void language plpgsql as $$
declare
  v_old text;
  v_new text := trim(p_name);
begin
  select name into v_old from public.categories where id = p_id for update;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  update public.categories set name = v_new, color = upper(p_color) where id = p_id;
  if v_old <> v_new then
    update public.transactions set category = v_new where user_id = auth.uid() and category = v_old;
    update public.transactions set title = v_new where user_id = auth.uid() and category = v_new and title = v_old;
    update public.bills set category = v_new where user_id = auth.uid() and category = v_old;
    update public.plans set category = v_new where user_id = auth.uid() and category = v_old;
    update public.plans set title = v_new where user_id = auth.uid() and category = v_new and title = v_old;
  end if;
end $$;

-- Exclui a categoria. Se estiver em uso, p_move_to (outra categoria do usuário) recebe os registros.
-- A última categoria não pode ser excluída.
create or replace function public.delete_category(p_id uuid, p_move_to text default null)
returns void language plpgsql as $$
declare
  v_name text;
  v_in_use boolean;
begin
  select name into v_name from public.categories where id = p_id for update;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.categories where user_id = auth.uid()) <= 1 then
    raise exception 'cannot delete the last category' using errcode = '23514';
  end if;
  v_in_use := exists (select 1 from public.transactions where user_id = auth.uid() and category = v_name)
           or exists (select 1 from public.bills where user_id = auth.uid() and category = v_name)
           or exists (select 1 from public.plans where user_id = auth.uid() and category = v_name);
  if v_in_use then
    if p_move_to is null or p_move_to = v_name
       or not exists (select 1 from public.categories where user_id = auth.uid() and name = p_move_to) then
      raise exception 'category in use: choose another category to move its records' using errcode = '23503';
    end if;
    update public.transactions set category = p_move_to where user_id = auth.uid() and category = v_name;
    update public.bills set category = p_move_to where user_id = auth.uid() and category = v_name;
    update public.plans set category = p_move_to where user_id = auth.uid() and category = v_name;
  end if;
  delete from public.categories where id = p_id;
end $$;

-- ---------------------------------------------------------------------------
-- Exportação inclui as categorias
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'format', 'kash-export/1',
    'exported_at', now(),
    'user', (select jsonb_build_object('id', p.id, 'name', p.name, 'email', auth.jwt() ->> 'email', 'phone', p.phone, 'created_at', p.created_at)
               from public.profiles p where p.id = auth.uid()),
    'settings', (select jsonb_build_object('theme', p.theme, 'hide_values', p.hide_values, 'bill_reminder', p.bill_reminder,
                                           'monthly_budget', p.monthly_budget, 'biometrics', p.biometrics, 'currency', p.currency)
                   from public.profiles p where p.id = auth.uid()),
    'categories',   (select coalesce(jsonb_agg(to_jsonb(c) order by c.position), '[]'::jsonb) from public.categories c),
    'accounts',     (select coalesce(jsonb_agg(to_jsonb(a) order by a.position, a.created_at), '[]'::jsonb) from public.accounts a),
    'cards',        (select coalesce(jsonb_agg(to_jsonb(c) order by c.position, c.created_at), '[]'::jsonb) from public.cards c),
    'plans',        (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]'::jsonb) from public.plans p),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date, t.created_at), '[]'::jsonb) from public.transactions t),
    'bills',        (select coalesce(jsonb_agg(to_jsonb(b) order by b.due_day, b.created_at), '[]'::jsonb) from public.bills b),
    'goals',        (select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at), '[]'::jsonb) from public.goals g),
    'invoices',     (select coalesce(jsonb_agg(to_jsonb(i) order by i.month), '[]'::jsonb) from public.invoices i)
  );
$$;
