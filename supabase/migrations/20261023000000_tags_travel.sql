-- Tags (app 1.3.0): marcar lançamentos com uma tag livre ("Viagem Floripa") e ver o total dela,
-- separado das categorias. "Modo viagem": enquanto ligado, os lançamentos novos já recebem a tag.
-- Uma tag por lançamento; sem tabela própria (a lista de tags vem dos lançamentos).

alter table public.transactions
  add column tag text check (tag is null or char_length(btrim(tag)) between 1 and 30);
create index transactions_user_tag_idx on public.transactions (user_id, tag) where tag is not null;

-- modo viagem: tag ativa e, opcionalmente, até quando (inclusive); vale em todos os aparelhos
alter table public.profiles
  add column travel_tag text check (travel_tag is null or char_length(btrim(travel_tag)) between 1 and 30),
  add column travel_until date;
