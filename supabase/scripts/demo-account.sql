-- Conta de demonstração do Kash: APAGA os dados da conta indicada e cria ~6 meses de uso realista,
-- cobrindo todas as funcionalidades (contas, cartões com cor, parcelados novos e antigos, faturas pagas e
-- uma a pagar, contas fixas pagas e a pagar, transferências, metas em vários estados, categorias próprias,
-- limite dividido, nomes aprendidos da importação, lançamentos de hoje e da semana).
--
-- A conta precisa existir (cadastre pelo app ou pela web). O login dela não muda.
-- Uso:
--   psql "<url do banco>" -v ON_ERROR_STOP=1 -v email='pessoa@exemplo.com' -f supabase/scripts/demo-account.sql
-- Pode rodar de novo quando quiser "rejuvenescer" a demo: as datas são relativas a hoje.
-- Os valores aleatórios usam semente fixa, então cada execução gera os mesmos lançamentos.

\if :{?email}
\else
  \echo 'Informe o e-mail da conta: -v email=pessoa@exemplo.com'
  \quit
\endif

begin;

select set_config('kash.demo_email', :'email', true);

-- dia `day` do mês `o` (0 = atual, -1 = anterior…), limitado ao último dia do mês
create function pg_temp.d(o int, day int) returns date language sql stable as $$
  select least(
    (date_trunc('month', public.kash_today()) + make_interval(months => o))::date + (day - 1),
    (date_trunc('month', public.kash_today()) + make_interval(months => o + 1) - interval '1 day')::date)
$$;

create function pg_temp.at(d date) returns timestamptz language sql volatile as $$
  select least(((d + time '08:00' + random() * interval '13 hours') at time zone 'America/Sao_Paulo'), now())
$$;

do $$
declare
  v_email text := current_setting('kash.demo_email');
  v_uid uuid;
  v_today date := public.kash_today();
  v_day int := extract(day from public.kash_today())::int;
  acc1 uuid; acc2 uuid; acc3 uuid; acc4 uuid;
  card1 uuid; card2 uuid;
  p_iphone uuid; p_sofa uuid; p_tenis uuid;
  g_viagem uuid; g_reserva uuid; g_fone uuid;
  b record; r record; i record;
  o int; k int; v_last int; v_dim int; v_date date; v_amount numeric;
  v_months text[];
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'Conta % não encontrada: cadastre pelo app ou pela web antes', v_email;
  end if;
  perform setseed(0.42);

  -- as RPCs usam auth.uid(): age como a pessoa só nesta transação
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform public.reset_my_data();
  -- sem um aviso de tempo real por linha: um só no fim
  perform set_config('kash.silent_realtime', 'on', true);

  -- perfil e preferências ---------------------------------------------------
  update public.profiles
     set name = case when trim(name) = '' then 'Marina Costa' else name end,
         monthly_budget = 5600,
         card_budget = 2800,
         onboarding_done_at = now(),
         checklist_hidden_at = now(),
         hide_values = false,
         bill_reminder = true,
         last_rollover_month = public.month_key(v_today)
   where id = v_uid;

  -- categorias próprias (além das 6 padrão)
  insert into public.categories (user_id, name, color) values
    (v_uid, 'Casa', '#F6AD55'),
    (v_uid, 'Saúde', '#4FD1C5'),
    (v_uid, 'Educação', '#F6E05E');

  -- contas e cartões ----------------------------------------------------------
  insert into public.accounts (user_id, name, kind, institution, opening_balance, color, position) values
    (v_uid, 'Conta corrente', 'corrente', 'Nubank', 0, '#8A05BE', 0) returning id into acc1;
  insert into public.accounts (user_id, name, kind, institution, opening_balance, color, position) values
    (v_uid, 'Poupança', 'poupanca', 'Caixa', 0, '#6BC5FF', 1) returning id into acc2;
  insert into public.accounts (user_id, name, kind, institution, opening_balance, color, position) values
    (v_uid, 'Carteira', 'carteira', 'Dinheiro em espécie', 0, '#FFB86B', 2) returning id into acc3;
  insert into public.accounts (user_id, name, kind, institution, opening_balance, color, position) values
    (v_uid, 'Tesouro Selic', 'investimento', 'Reserva de emergência', 0, '#7EE0A8', 3) returning id into acc4;

  insert into public.cards (user_id, name, last4, credit_limit, closing_day, due_day, gradient, color, position) values
    (v_uid, 'Nubank', '4821', 4500, 28, 5, 'purple', '#8A05BE', 0) returning id into card1;
  insert into public.cards (user_id, name, last4, credit_limit, closing_day, due_day, gradient, color, position) values
    (v_uid, 'Inter', '1107', 2000, 21, 28, 'graphite', null, 1) returning id into card2;

  -- parcelados ----------------------------------------------------------------
  -- iPhone: 12x, comprado há 4 meses (parcela 5 agora)
  insert into public.plans (user_id, card_id, title, category, installments, current, per_installment)
  values (v_uid, card1, 'iPhone 15', 'Outros', 12, 5, 399.90) returning id into p_iphone;
  for k in 1..5 loop
    v_date := pg_temp.d(k - 5, case when k = 1 then 14 else 1 end);
    insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, plan_id, created_at)
    values (v_uid, format('iPhone 15 (%s/12)', k), 'Outros', -399.90, v_date, 'card', card1, p_iphone, pg_temp.at(v_date));
  end loop;
  -- sofá: compra antiga (10x, 1ª parcela há 7 meses): as anteriores ao histórico não viram lançamento
  insert into public.plans (user_id, card_id, title, category, installments, current, per_installment)
  values (v_uid, card1, 'Sofá', 'Casa', 10, 8, 189.00) returning id into p_sofa;
  for k in 3..8 loop
    v_date := pg_temp.d(k - 8, 1);
    insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, plan_id, created_at)
    values (v_uid, format('Sofá (%s/10)', k), 'Casa', -189.00, v_date, 'card', card1, p_sofa, pg_temp.at(v_date));
  end loop;
  -- tênis: 4x no Inter, comprado no mês passado
  insert into public.plans (user_id, card_id, title, category, installments, current, per_installment)
  values (v_uid, card2, 'Tênis de corrida', 'Lazer', 4, 2, 112.25) returning id into p_tenis;
  for k in 1..2 loop
    v_date := pg_temp.d(k - 2, case when k = 1 then 20 else 1 end);
    insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, plan_id, created_at)
    values (v_uid, format('Tênis de corrida (%s/4)', k), 'Lazer', -112.25, v_date, 'card', card2, p_tenis, pg_temp.at(v_date));
  end loop;

  -- contas fixas ----------------------------------------------------------------
  insert into public.bills (user_id, name, amount, due_day, category, source_type, source_id) values
    (v_uid, 'Aluguel', 1350.00, 10, 'Casa', 'account', acc1),
    (v_uid, 'Academia', 99.90, 7, 'Saúde', 'account', acc1),
    (v_uid, 'Curso de inglês', 189.00, 12, 'Educação', 'account', acc1),
    (v_uid, 'Internet', 99.90, 15, 'Casa', 'card', card1),
    (v_uid, 'Netflix', 39.90, 18, 'Assinaturas', 'card', card1),
    (v_uid, 'Plano do celular', 59.90, 20, 'Assinaturas', 'card', card2),
    (v_uid, 'Spotify', 21.90, 27, 'Assinaturas', 'card', card2),
    (v_uid, 'Condomínio', 420.00, 29, 'Casa', 'account', acc1);
  for b in select * from public.bills where user_id = v_uid loop
    -- meses anteriores: pagas no vencimento
    for o in -5..-1 loop
      v_date := pg_temp.d(o, b.due_day);
      insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, created_at)
      values (v_uid, b.name, b.category, -b.amount, v_date, b.source_type, b.source_id, pg_temp.at(v_date));
    end loop;
    -- mês atual: as que já venceram estão pagas; as próximas ficam "a pagar"
    if b.due_day <= v_day then
      perform public.pay_bill(b.id, pg_temp.d(0, b.due_day));
    end if;
  end loop;

  -- entradas ---------------------------------------------------------------------
  for o in -5..0 loop
    v_date := pg_temp.d(o, 5);
    if v_date <= v_today then
      insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, created_at)
      values (v_uid, 'Salário', 'Entrada', 6200, v_date, 'account', acc1, pg_temp.at(v_date));
    end if;
  end loop;
  for r in select * from (values (-4, 18, 900.00, 'Freela de design'), (-2, 18, 650.00, 'Freela de design'), (0, 18, 1200.00, 'Freela de design'),
                                 (-1, 23, 45.00, 'Pix da Ju (jantar)'), (-3, 12, 120.00, 'Venda no Enjoei')) as x(o, day, amount, title) loop
    v_date := pg_temp.d(r.o, r.day);
    if v_date <= v_today then
      insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, created_at)
      values (v_uid, r.title, 'Entrada', r.amount, v_date, 'account', acc1, pg_temp.at(v_date));
    end if;
  end loop;

  -- gastos do dia a dia (valores e dias sorteados com semente fixa) ---------------
  for o in -5..0 loop
    v_dim := extract(day from pg_temp.d(o, 31))::int;
    v_last := case when o = 0 then v_day else v_dim end;
    for r in select * from (values
        ('iFood', 'Comida', 'card', 1, 32, 78, 6),
        ('Restaurante', 'Comida', 'card', 1, 55, 130, 2),
        ('Almoço no trabalho', 'Comida', 'account', 1, 24, 39, 9),
        ('Padaria', 'Comida', 'account', 3, 8, 26, 7),
        ('Mercado Extra', 'Mercado', 'card', 1, 140, 320, 3),
        ('Hortifruti', 'Mercado', 'account', 1, 28, 70, 2),
        ('Uber', 'Transporte', 'card', 2, 14, 42, 6),
        ('Posto Shell', 'Transporte', 'card', 1, 150, 230, 1),
        ('Recarga do bilhete', 'Transporte', 'account', 1, 50, 50, 1),
        ('Cinema', 'Lazer', 'card', 2, 38, 72, 1),
        ('Bar com amigos', 'Lazer', 'card', 1, 60, 160, 1),
        ('Farmácia', 'Saúde', 'card', 1, 22, 95, 1),
        ('Shopee', 'Outros', 'card', 2, 30, 120, 1)
      ) as x(title, cat, st, src, lo, hi, n) loop
      for k in 1..r.n loop
        -- no mês atual, só a fração dos dias que já passaram (mantém o ritmo realista)
        continue when o = 0 and random() > v_last::numeric / v_dim;
        v_date := pg_temp.d(o, 1 + floor(random() * v_last)::int);
        v_amount := round((r.lo + random() * (r.hi - r.lo))::numeric, 0) - case when random() < 0.5 then 0.10 else 0 end;
        insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, created_at)
        values (v_uid, r.title, r.cat, -greatest(v_amount, 1), v_date, r.st::public.source_type,
                case r.st when 'card' then (array[card1, card2])[r.src] else (array[acc1, acc2, acc3, acc4])[r.src] end,
                pg_temp.at(v_date));
      end loop;
    end loop;
  end loop;

  -- hoje e ontem sempre com movimento (atalhos "Hoje" e "Esta semana" do Início)
  insert into public.transactions (user_id, title, category, amount, date, source_type, source_id, created_at) values
    (v_uid, 'Café da manhã', 'Comida', -14.90, v_today, 'account', acc3, least(now(), (v_today + time '08:10') at time zone 'America/Sao_Paulo')),
    (v_uid, 'Uber pro trabalho', 'Transporte', -23.40, v_today, 'card', card2, least(now(), (v_today + time '08:40') at time zone 'America/Sao_Paulo')),
    (v_uid, 'Almoço', 'Comida', -34.90, v_today, 'account', acc1, least(now(), (v_today + time '12:30') at time zone 'America/Sao_Paulo')),
    (v_uid, 'Mercado Extra', 'Mercado', -187.35, v_today - 1, 'card', card1, ((v_today - 1) + time '19:20') at time zone 'America/Sao_Paulo'),
    (v_uid, 'Livro de finanças', 'Educação', -49.90, v_today - 2, 'card', card2, ((v_today - 2) + time '21:05') at time zone 'America/Sao_Paulo');

  -- transferências entre contas ---------------------------------------------------
  for o in -5..0 loop
    if pg_temp.d(o, 2) <= v_today then
      perform public.create_transfer(acc1, acc3, 200, pg_temp.d(o, 2), 'Saque');
    end if;
    if pg_temp.d(o, 6) <= v_today then
      perform public.create_transfer(acc1, acc2, 600, pg_temp.d(o, 6), 'Guardar pra viagem');
    end if;
  end loop;
  perform public.create_transfer(acc1, acc4, 500, pg_temp.d(-3, 28), 'Aplicação Tesouro Selic');
  perform public.create_transfer(acc1, acc4, 500, pg_temp.d(-1, 28), 'Aplicação Tesouro Selic');

  -- metas ---------------------------------------------------------------------------
  -- viagem: depósito todo dia 6 (este mês já feito)
  insert into public.goals (user_id, name, target, saved, monthly, color, account_id, deposit_day)
  values (v_uid, 'Viagem pra Floripa', 6000, 0, 600, '#6BC5FF', acc2, 6) returning id into g_viagem;
  for o in -5..0 loop
    if pg_temp.d(o, 6) <= v_today then
      perform public.record_goal_deposit(g_viagem, 600, acc2, pg_temp.d(o, 6));
    end if;
  end loop;
  -- reserva: depósito no dia 28 (ainda vai chegar este mês)
  insert into public.goals (user_id, name, target, saved, monthly, color, account_id, deposit_day, last_deposit_date)
  values (v_uid, 'Reserva de emergência', 15000, 8400, 500, '#7EE0A8', acc4, 28, pg_temp.d(-1, 28)) returning id into g_reserva;
  -- fone: depósito do dia 15 deste mês ainda pendente (mostra o lembrete)
  insert into public.goals (user_id, name, target, saved, monthly, color, account_id, deposit_day, last_deposit_date)
  values (v_uid, 'Fone com cancelamento de ruído', 1200, 480, 160, '#D98BFF', acc1, 15, pg_temp.d(-1, 15)) returning id into g_fone;
  -- notebook: meta concluída
  insert into public.goals (user_id, name, target, saved, monthly, color, account_id, last_deposit_date)
  values (v_uid, 'Notebook novo', 4500, 4500, 0, '#C6F432', acc2, pg_temp.d(-2, 10));

  -- faturas fechadas: Nubank todas pagas (vence dia 5); Inter com a do mês passado a pagar (vence dia 28)
  select array_agg(public.month_key(pg_temp.d(x, 1)) order by x) into v_months from generate_series(-5, -1) x;
  perform public.refresh_card_invoices(card1, v_months);
  perform public.refresh_card_invoices(card2, v_months);
  for i in select inv.*, c.due_day from public.invoices inv join public.cards c on c.id = inv.card_id where inv.user_id = v_uid order by inv.month loop
    continue when i.card_id = card2 and i.month = v_months[5];
    o := (extract(year from to_date(i.month, 'YYYY-MM')) * 12 + extract(month from to_date(i.month, 'YYYY-MM'))
          - extract(year from v_today) * 12 - extract(month from v_today))::int;
    perform public.pay_invoice(i.id, acc1, pg_temp.d(o + 1, i.due_day));
  end loop;

  -- nomes aprendidos na importação (Perfil não mostra; a próxima importação já usa)
  insert into public.merchant_rules (user_id, pattern, title, category) values
    (v_uid, 'ifood', 'iFood', 'Comida'),
    (v_uid, 'uber trip', 'Uber', 'Transporte'),
    (v_uid, 'mercado extra', 'Mercado Extra', 'Mercado'),
    (v_uid, 'netflix com', 'Netflix', 'Assinaturas'),
    (v_uid, 'drogasil', 'Farmácia', 'Saúde');

  -- saldos de hoje: a abertura fecha a conta com um saldo redondo
  update public.accounts a
     set opening_balance = t.target - coalesce((select sum(x.amount) from public.transactions x
                                                 where x.source_type = 'account' and x.source_id = a.id and x.deleted_at is null), 0)
    from (values (acc1, 3184.37), (acc2, 4950.00), (acc3, 86.50), (acc4, 9400.00)) as t(id, target)
   where a.id = t.id;

  perform set_config('kash.silent_realtime', 'off', true);
  -- os aparelhos abertos dessa conta recarregam tudo
  begin
    perform realtime.send(jsonb_build_object('table', 'all', 'op', 'reset'), 'changed', 'user:' || v_uid::text, true);
  exception when others then
    raise warning 'demo-account: %', sqlerrm;
  end;
  perform set_config('request.jwt.claims', '', true);

  raise notice 'Demo pronta para % (%): % lançamentos', v_email, v_uid, (select count(*) from public.transactions where user_id = v_uid);
end $$;

commit;
