#!/usr/bin/env bash
# E2E da importação no simulador iOS: entra no app, coloca um CSV de fatura na pasta do app
# (como o iOS faz no "Abrir com o Kash") e abre a importação com esse arquivo.
# O login limpa os dados do app, então o arquivo é copiado entre os dois passos do Maestro.
# Uso: e2e/import.sh   (MAESTRO_DEVICE=<udid> para escolher o simulador)
set -euo pipefail
cd "$(dirname "$0")/.."
APP_ID="${APP_ID:-com.andreloureiro.kash}"
UDID="${MAESTRO_DEVICE:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"
run() { maestro --device "$UDID" test "e2e/import/$1" --env APP_ID="$APP_ID"; }

(cd ../.. && supabase db reset >/dev/null 2>&1)
run 1-login.yaml

# fatura do mês passado: um parcelamento (2/12), uma compra à vista e o pagamento
prev() { date -v1d -v-1m -v+"$(($1 - 1))"d +%Y-%m-%d; }
dir="$(xcrun simctl get_app_container "$UDID" "$APP_ID" data)/Documents"
mkdir -p "$dir"
printf 'date,title,amount\n%s,Dm*Streamingx - Parcela 2/12,22.90\n%s,EBW*Spotify - NuPay,23.90\n%s,Pagamento recebido,-558.95\n' "$(prev 5)" "$(prev 13)" "$(prev 14)" > "$dir/fatura-e2e.csv"
file="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote("file://" + sys.argv[1], safe=""))' "$dir/fatura-e2e.csv")"

# o caminho tem "%" e "=" (o --env do Maestro não repassa): vai direto numa cópia do fluxo
tmp="$(mktemp -d)"
sed "s|__FILE__|$file|" e2e/import/2-open-csv.yaml > "$tmp/2-open-csv.yaml"
maestro --device "$UDID" test "$tmp/2-open-csv.yaml" --env APP_ID="$APP_ID"
rm -rf "$tmp"
echo "✅ importação"
