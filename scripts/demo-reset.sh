#!/usr/bin/env bash
# Recria os dados da conta de demonstração (APAGA os dados atuais dessa conta).
# Uso:
#   pnpm demo:reset dedeloureiro003@gmail.com            # produção (projeto ligado no Supabase CLI)
#   pnpm demo:reset dedeloureiro003@gmail.com --local    # Supabase local
set -euo pipefail

email="${1:-}"
target="${2:---linked}"
if [[ ! "$email" =~ ^[^@[:space:]\']+@[^@[:space:]\']+\.[^@[:space:]\']+$ ]]; then
  echo "Informe o e-mail da conta: pnpm demo:reset pessoa@exemplo.com [--local]" >&2
  exit 1
fi
if [[ "$target" != "--linked" && "$target" != "--local" ]]; then
  echo "Destino inválido: use --local ou nada (produção)" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
sql="$(mktemp -t kash-demo).sql"
trap 'rm -f "$sql"' EXIT

# o `supabase db query` não entende comandos do psql: tira o bloco \if…\endif e preenche o e-mail
python3 - "$root/supabase/scripts/demo-account.sql" "$sql" "$email" <<'EOF'
import sys
src, out, email = sys.argv[1:]
s = open(src).read()
start = s.index('\\if :{?email}')
end = s.index('\\endif') + len('\\endif')
s = s[:start] + s[end:]
s = s.replace(":'email'", "'" + email + "'")
open(out, 'w').write(s)
EOF

if [[ "$target" == "--linked" ]]; then
  read -r -p "Isto APAGA e recria os dados de $email em PRODUÇÃO. Continuar? [s/N] " ok
  [[ "$ok" == "s" || "$ok" == "S" ]] || { echo "Cancelado."; exit 1; }
fi

cd "$root"
if [[ "$target" == "--local" ]]; then
  # o modo local do `db query` não aceita vários comandos num envio: usa o psql com o script original
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -q -v ON_ERROR_STOP=1 -v email="$email" \
    -f "$root/supabase/scripts/demo-account.sql" >/dev/null
else
  supabase db query --linked -f "$sql" >/dev/null
fi
echo "Demo recriada para $email."
