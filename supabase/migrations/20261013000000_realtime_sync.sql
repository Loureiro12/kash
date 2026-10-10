-- Sincronização em tempo real (app e web): toda escrita nas tabelas do usuário manda um aviso curto
-- ("bills mudou") para o canal privado `user:<id>` via Realtime Broadcast. Os clientes ouvem esse canal
-- e refazem o snapshot. Só o dono assina o próprio canal (policy em realtime.messages).
-- Broadcast em vez de postgres_changes: lá os DELETE ignoram RLS e vão para todos os assinantes da tabela.

create or replace function public.notify_user_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_uid text := case when tg_table_name = 'profiles' then v_row ->> 'id' else v_row ->> 'user_id' end;
begin
  if v_uid is not null then
    begin
      perform realtime.send(jsonb_build_object('table', tg_table_name, 'op', lower(tg_op)), 'changed', 'user:' || v_uid, true);
    exception when others then
      -- o aviso é melhor esforço: nunca derruba a escrita do usuário
      raise warning 'notify_user_change: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'categories', 'accounts', 'cards', 'plans', 'invoices', 'transactions', 'bills', 'goals'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_realtime', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.notify_user_change()', t || '_realtime', t);
  end loop;
end $$;

-- quem pode ouvir: só o dono do canal `user:<id>` (canal privado; o token do usuário é checado pelo Realtime)
drop policy if exists "kash: canal do próprio usuário" on realtime.messages;
create policy "kash: canal do próprio usuário" on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'user:' || (select auth.uid())::text);
