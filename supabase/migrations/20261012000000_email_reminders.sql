-- Lembretes por e-mail (Kash web): 2 dias antes do vencimento de contas fixas e faturas, e no dia do
-- depósito das metas — as mesmas regras de `planReminders` (@kash/domain) que o app usa para o push.
-- É opt-in (`email_reminder`, desligado por padrão); `bill_reminder` continua sendo o push do celular.
-- Um cron diário (09:00 de Brasília) chama a Edge Function `send-reminders`, que envia pelo Resend.

alter table public.profiles add column email_reminder boolean not null default false;

-- um e-mail por pessoa por dia, no máximo (o envio é idempotente mesmo se o cron rodar de novo)
create table public.reminder_emails (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  items int not null check (items > 0),
  sent_at timestamptz not null default now(),
  primary key (user_id, day)
);
-- a pessoa só lê o próprio histórico (exportação de dados); quem escreve é o service role
alter table public.reminder_emails enable row level security;
create policy "reminder_emails: dono lê" on public.reminder_emails for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- O que avisar em `p_day`: uma linha por pessoa (com lembrete ligado e ainda sem e-mail no dia).
-- ---------------------------------------------------------------------------
create or replace function public.reminder_digest(p_day date default public.kash_today())
returns table (user_id uuid, email text, name text, items jsonb)
language sql stable security definer set search_path = '' as $$
  with target as (
    -- REMINDER_DAYS_BEFORE = 2
    select (p_day + 2) as due,
           (date_trunc('month', p_day + 2) + interval '1 month - 1 day')::date as due_month_end,
           (date_trunc('month', p_day) + interval '1 month - 1 day')::date as today_month_end
  ),
  bill_items as (
    -- vencimento no mês do alvo (dia 31 vira o último dia do mês). `paid_tx_id` é do mês corrente:
    -- se o alvo cai no mês seguinte, a conta conta como a pagar.
    select b.user_id,
           jsonb_build_object('kind', 'bill', 'title', b.name, 'amount', b.amount, 'due', t.due,
                              'source', coalesce(c.name, a.name)) as item
      from public.bills b
      cross join target t
      left join public.cards c on b.source_type = 'card' and c.id = b.source_id
      left join public.accounts a on b.source_type = 'account' and a.id = b.source_id
     where least(b.due_day, extract(day from t.due_month_end)::int) = extract(day from t.due)::int
       and (b.paid_tx_id is null or date_trunc('month', t.due) <> date_trunc('month', p_day))
  ),
  invoice_items as (
    -- fatura fechada vence no mês seguinte ao de competência, no dia do cartão (até 28; igual ao invoiceView)
    select i.user_id,
           jsonb_build_object('kind', 'invoice', 'title', c.name, 'amount', i.total, 'due', t.due, 'month', i.month) as item
      from public.invoices i
      join public.cards c on c.id = i.card_id
      cross join target t
     where i.paid_tx_id is null
       and i.total > 0
       and ((to_date(i.month || '-01', 'YYYY-MM-DD') + interval '1 month')::date + (least(c.due_day, 28) - 1)) = t.due
  ),
  goal_items as (
    -- dia do depósito (hoje), se a meta não foi batida e ainda não teve depósito no mês
    select g.user_id,
           jsonb_build_object('kind', 'goal', 'title', g.name, 'amount', g.monthly, 'due', p_day) as item
      from public.goals g
      cross join target t
     where g.deposit_day is not null
       and g.saved < g.target
       and least(g.deposit_day, extract(day from t.today_month_end)::int) = extract(day from p_day)::int
       and (g.last_deposit_date is null or date_trunc('month', g.last_deposit_date) <> date_trunc('month', p_day))
  ),
  all_items as (
    select * from bill_items union all select * from invoice_items union all select * from goal_items
  )
  select p.id, u.email::text, p.name,
         jsonb_agg(x.item order by x.item ->> 'kind', x.item ->> 'title')
    from all_items x
    join public.profiles p on p.id = x.user_id
    join auth.users u on u.id = p.id
   where p.email_reminder
     and u.email is not null
     and not exists (select 1 from public.reminder_emails r where r.user_id = p.id and r.day = p_day)
   group by p.id, u.email, p.name
$$;

create or replace function public.mark_reminder_sent(p_user_id uuid, p_day date, p_items int)
returns void language sql security definer set search_path = '' as $$
  insert into public.reminder_emails (user_id, day, items) values (p_user_id, p_day, p_items)
  on conflict (user_id, day) do nothing
$$;

-- só o servidor (Edge Function com service role) usa estas funções
revoke all on function public.reminder_digest(date) from public, anon, authenticated;
revoke all on function public.mark_reminder_sent(uuid, date, int) from public, anon, authenticated;
grant execute on function public.reminder_digest(date) to service_role;
grant execute on function public.mark_reminder_sent(uuid, date, int) to service_role;

-- ---------------------------------------------------------------------------
-- Agendamento: pg_cron chama a Edge Function via pg_net. URL e segredo ficam no Vault
-- (`kash_project_url` e `kash_reminders_secret`); sem eles (ex.: local) o cron não faz nada.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.dispatch_reminders()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'kash_project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'kash_reminders_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-kash-cron', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function public.dispatch_reminders() from public, anon, authenticated;

-- 12:00 UTC = 09:00 em Brasília (REMINDER_HOUR); reagendar com o mesmo nome substitui
select cron.schedule('kash-email-reminders', '0 12 * * *', 'select public.dispatch_reminders()');

-- ---------------------------------------------------------------------------
-- Exportação inclui a nova preferência
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'format', 'kash-export/1',
    'exported_at', now(),
    'user', (select jsonb_build_object('id', p.id, 'name', p.name, 'email', auth.jwt() ->> 'email', 'phone', p.phone, 'created_at', p.created_at)
               from public.profiles p where p.id = auth.uid()),
    'settings', (select jsonb_build_object('theme', p.theme, 'hide_values', p.hide_values, 'bill_reminder', p.bill_reminder,
                                           'email_reminder', p.email_reminder,
                                           'monthly_budget', p.monthly_budget, 'biometrics', p.biometrics, 'currency', p.currency)
                   from public.profiles p where p.id = auth.uid()),
    'categories',   (select coalesce(jsonb_agg(to_jsonb(c) order by c.position), '[]'::jsonb) from public.categories c),
    'accounts',     (select coalesce(jsonb_agg(to_jsonb(a) order by a.position, a.created_at), '[]'::jsonb) from public.accounts a),
    'cards',        (select coalesce(jsonb_agg(to_jsonb(c) order by c.position, c.created_at), '[]'::jsonb) from public.cards c),
    'plans',        (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]'::jsonb) from public.plans p),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date, t.created_at), '[]'::jsonb) from public.transactions t),
    'bills',        (select coalesce(jsonb_agg(to_jsonb(b) order by b.due_day, b.created_at), '[]'::jsonb) from public.bills b),
    'goals',        (select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at), '[]'::jsonb) from public.goals g),
    'invoices',     (select coalesce(jsonb_agg(to_jsonb(i) order by i.month), '[]'::jsonb) from public.invoices i),
    'reminder_emails', (select coalesce(jsonb_agg(jsonb_build_object('day', r.day, 'items', r.items, 'sent_at', r.sent_at) order by r.day), '[]'::jsonb)
                          from public.reminder_emails r where r.user_id = auth.uid())
  );
$$;
