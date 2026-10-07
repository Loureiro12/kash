#!/usr/bin/env bash
# Roda cada fluxo Maestro com o banco local recém-resetado (seed), porque as escritas do app persistem.
# Uso: e2e/run.sh [arquivos de fluxo...]   (sem argumentos roda todos em e2e/flows)
# MAESTRO_DEVICE=<udid|emulator-5554> escolhe o aparelho quando há mais de um conectado.
set -o pipefail
cd "$(dirname "$0")/.."
APP_ID="${APP_ID:-com.andreloureiro.kash}"
device_flag=()
if [ -n "${MAESTRO_DEVICE:-}" ]; then device_flag=(--device "$MAESTRO_DEVICE"); fi
flows=("$@")
if [ ${#flows[@]} -eq 0 ]; then flows=(e2e/flows/*.yaml); fi
failed=()
for flow in "${flows[@]}"; do
  echo "▶ reset do banco + $flow"
  (cd ../.. && supabase db reset >/dev/null 2>&1) || { echo "falha ao resetar o banco"; exit 1; }
  if maestro "${device_flag[@]}" test "$flow" --env APP_ID="$APP_ID"; then
    echo "✅ $flow"
  else
    echo "❌ $flow"
    failed+=("$flow")
  fi
done
echo
echo "Resumo: $(( ${#flows[@]} - ${#failed[@]} ))/${#flows[@]} fluxos passaram"
for f in "${failed[@]}"; do echo "  falhou: $f"; done
[ ${#failed[@]} -eq 0 ]
