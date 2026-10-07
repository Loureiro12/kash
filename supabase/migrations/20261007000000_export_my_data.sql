-- Exportação de dados do usuário corrente (direito previsto na política de privacidade).
-- Roda com os privilégios de quem chama: a RLS garante que só os próprios dados entram.
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
    'accounts',     (select coalesce(jsonb_agg(to_jsonb(a) order by a.position, a.created_at), '[]'::jsonb) from public.accounts a),
    'cards',        (select coalesce(jsonb_agg(to_jsonb(c) order by c.position, c.created_at), '[]'::jsonb) from public.cards c),
    'plans',        (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]'::jsonb) from public.plans p),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date, t.created_at), '[]'::jsonb) from public.transactions t),
    'bills',        (select coalesce(jsonb_agg(to_jsonb(b) order by b.due_day, b.created_at), '[]'::jsonb) from public.bills b),
    'goals',        (select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at), '[]'::jsonb) from public.goals g),
    'invoices',     (select coalesce(jsonb_agg(to_jsonb(i) order by i.month), '[]'::jsonb) from public.invoices i)
  );
$$;

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;
