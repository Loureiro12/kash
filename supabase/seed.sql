-- Seed de desenvolvimento/local: usuária Lara (lara@email.com / 123456) com os mesmos dados do app.
-- Também cria helpers de teste no schema `tests` (usados pelo pgTAP). Nunca roda em produção.

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- cria usuário no Auth (com identity, exigida para login por senha) e devolve o id
create or replace function tests.create_user(p_email text, p_name text, p_password text default '123456')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('name', p_name), now(), now(),
          '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
  return v_id;
end $$;

-- simula uma sessão autenticada (RLS passa a valer) na transação atual
create or replace function tests.login_as(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.logout()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- ---------------------------------------------------------------------------
-- Dados da Lara
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_today date := public.kash_today();
  acc1 uuid := 'a0000000-0000-4000-8000-000000000001';
  acc2 uuid := 'a0000000-0000-4000-8000-000000000002';
  acc3 uuid := 'a0000000-0000-4000-8000-000000000003';
  card1 uuid := 'c0000000-0000-4000-8000-000000000001';
  card2 uuid := 'c0000000-0000-4000-8000-000000000002';
  plan1 uuid := 'b0000000-0000-4000-8000-000000000001';
  plan2 uuid := 'b0000000-0000-4000-8000-000000000002';
begin
  if exists (select 1 from auth.users where email = 'lara@email.com') then return; end if;
  v_uid := tests.create_user('lara@email.com', 'Lara Mendes');
  update public.profiles set phone = '(11) 98765-4321' where id = v_uid;

  insert into public.accounts (id, user_id, name, kind, institution, opening_balance, color, position) values
    (acc1, v_uid, 'Conta corrente', 'corrente', 'Banco digital', 2340.50 - (600 + 850 - 14.50 - 60), '#C6F432', 0),
    (acc2, v_uid, 'Poupança', 'poupanca', 'Rende 100% CDI', 1800, '#6BC5FF', 1),
    (acc3, v_uid, 'Carteira', 'carteira', 'Dinheiro em espécie', 85, '#FFB86B', 2);

  insert into public.cards (id, user_id, name, last4, credit_limit, closing_day, due_day, gradient, position) values
    (card1, v_uid, 'Cartão principal', '4821', 2500, 28, 5, 'green', 0),
    (card2, v_uid, 'Cartão universitário', '1107', 800, 2, 10, 'graphite', 1);

  insert into public.plans (id, user_id, card_id, title, category, installments, current, per_installment) values
    (plan1, v_uid, card1, 'Celular novo', 'Outros', 12, 5, 199.90),
    (plan2, v_uid, card2, 'Tênis de corrida', 'Lazer', 6, 3, 89.90);

  insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, plan_id) values
    (v_uid, 'Almoço no RU', 'Comida', -14.50, v_today, 'account', acc1, null),
    (v_uid, 'Celular novo (5/12)', 'Outros', -199.90, v_today, 'card', card1, plan1),
    (v_uid, 'Tênis de corrida (3/6)', 'Lazer', -89.90, v_today - 1, 'card', card2, plan2),
    (v_uid, 'Uber pra facul', 'Transporte', -18.90, v_today, 'card', card1, null),
    (v_uid, 'Streaming de música', 'Assinaturas', -21.90, v_today - 1, 'card', card2, null),
    (v_uid, 'Mesada', 'Entrada', 600, v_today - 1, 'account', acc1, null),
    (v_uid, 'Mercado da esquina', 'Mercado', -86.30, v_today - 3, 'card', card1, null),
    (v_uid, 'Cinema com amigos', 'Lazer', -42, v_today - 4, 'card', card1, null),
    (v_uid, 'Freela de design', 'Entrada', 850, v_today - 4, 'account', acc1, null),
    (v_uid, 'Pizza sexta', 'Comida', -58, v_today - 6, 'card', card1, null),
    (v_uid, 'Recarga do bilhete', 'Transporte', -60, v_today - 7, 'account', acc1, null),
    (v_uid, 'Jogo na promoção', 'Lazer', -79.90, v_today - 8, 'card', card2, null);

  insert into public.bills (user_id, name, amount, due_day, category, source_type, source_id) values
    (v_uid, 'Aluguel da república', 650, 5, 'Outros', 'account', acc1),
    (v_uid, 'Internet', 99.90, 10, 'Assinaturas', 'card', card1),
    (v_uid, 'Streaming de vídeo', 34.90, 12, 'Assinaturas', 'card', card2),
    (v_uid, 'Academia', 89.90, 15, 'Lazer', 'account', acc1),
    (v_uid, 'Plano do celular', 49.90, 20, 'Assinaturas', 'card', card1);

  insert into public.goals (user_id, name, target, saved, monthly, color, account_id, deposit_day) values
    (v_uid, 'Viagem pra praia', 3000, 1240, 300, '#6BC5FF', acc2, 10),
    (v_uid, 'Fone novo', 900, 620, 150, '#D98BFF', acc1, 20),
    (v_uid, 'Reserva de emergência', 5000, 2100, 250, '#C6F432', acc2, 1);

  -- fatura do mês passado do cartão principal, fechada e em aberto
  insert into public.invoices (user_id, card_id, month, total)
  values (v_uid, card1, public.month_key((date_trunc('month', v_today) - interval '1 month')::date), 1240.30);
end $$;
