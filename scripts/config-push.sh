#!/usr/bin/env bash
# Aplica o config.toml ao projeto Supabase de produção.
# O plano gratuito sem SMTP próprio rejeita QUALQUER template de e-mail customizado (o push inteiro falha),
# então, por padrão, os templates ficam de fora. Com SMTP configurado no dashboard, rode com KASH_SMTP=1
# para enviar também o template de recuperação (deep link kash://reset-password?token_hash=…).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${SUPABASE_PROJECT_REF:?defina SUPABASE_PROJECT_REF}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/supabase"
cp -R supabase/templates "$tmp/supabase/"
if [ "${KASH_SMTP:-0}" = "1" ]; then
  cp supabase/config.toml "$tmp/supabase/config.toml"
else
  python3 scripts/strip-email-templates.py supabase/config.toml "$tmp/supabase/config.toml"
  echo "ℹ templates de e-mail omitidos (sem SMTP próprio); use KASH_SMTP=1 depois de configurar o SMTP"
fi
supabase config push --workdir "$tmp" --project-ref "$SUPABASE_PROJECT_REF" --yes
