-- Limite do mês dividido: parte para os cartões (fatura do mês) e o restante (contas).
-- `monthly_budget` continua sendo o total; `card_budget` = 0 quer dizer limite não dividido.
-- Sem amarrar card_budget <= monthly_budget no banco: versões antigas do app só mudam o total, e o
-- domínio usa min(card_budget, monthly_budget) — o restante nunca fica negativo.
alter table public.profiles add column card_budget numeric(12,2) not null default 0 check (card_budget >= 0);

create or replace function public.export_my_data()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'format', 'kash-export/1',
    'exported_at', now(),
    'user', (select jsonb_build_object('id', p.id, 'name', p.name, 'email', auth.jwt() ->> 'email', 'phone', p.phone, 'created_at', p.created_at)
               from public.profiles p where p.id = auth.uid()),
    'settings', (select jsonb_build_object('theme', p.theme, 'hide_values', p.hide_values, 'bill_reminder', p.bill_reminder,
                                           'email_reminder', p.email_reminder,
                                           'monthly_budget', p.monthly_budget, 'card_budget', p.card_budget, 'biometrics', p.biometrics, 'currency', p.currency)
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
