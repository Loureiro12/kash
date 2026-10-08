-- Cores personalizadas: o cartão pode ter uma cor própria (substitui o gradiente pronto) e a cor da
-- conta passa a ser validada como #RRGGBB. O app grava sempre em maiúsculas.
alter table public.cards
  add column color text check (color is null or color ~ '^#[0-9A-F]{6}$');

comment on column public.cards.color is 'Cor personalizada (#RRGGBB). Quando preenchida, o app gera o gradiente a partir dela e ignora `gradient`.';

-- NOT VALID: vale para escritas novas sem reprovar linhas antigas (todas vieram da paleta do app).
alter table public.accounts
  add constraint accounts_color_hex check (color ~* '^#[0-9a-f]{6}$') not valid;
