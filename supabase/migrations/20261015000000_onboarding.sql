-- Primeiro acesso guiado (Kash web): boas-vindas em 3 passos e o card "Primeiros passos" no Início.
-- Estado no perfil (e não no navegador) para valer em qualquer aparelho; o app pode adotar depois.

alter table public.profiles add column onboarding_done_at timestamptz;
alter table public.profiles add column checklist_hidden_at timestamptz;

-- quem já usa o Kash não passa pelas boas-vindas; quem já lançou algo não vê o card
update public.profiles p set onboarding_done_at = now()
 where exists (select 1 from public.accounts a where a.user_id = p.id);
update public.profiles p set checklist_hidden_at = now()
 where exists (select 1 from public.transactions t where t.user_id = p.id);
