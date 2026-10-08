#!/usr/bin/env bash
# E2E da biometria no simulador iOS: o Maestro dirige a tela e este script faz o papel do rosto,
# cadastrando o Face ID e respondendo "reconhecido" quando o app pede (notifyutil do simulador).
# Uso: e2e/biometrics.sh   (MAESTRO_DEVICE=<udid> para escolher o simulador)
set -euo pipefail
cd "$(dirname "$0")/.."
APP_ID="${APP_ID:-com.andreloureiro.kash}"
UDID="${MAESTRO_DEVICE:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"
sim() { xcrun simctl spawn "$UDID" notifyutil "$@"; }
face_match() { sleep "${1:-3}"; sim -p com.apple.BiometricKit_Sim.pearl.match; }
face_nomatch() { sleep "${1:-3}"; sim -p com.apple.BiometricKit_Sim.pearl.nomatch; }
run() { maestro --device "$UDID" test "e2e/biometrics/$1" --env APP_ID="$APP_ID"; }

(cd ../.. && supabase db reset >/dev/null 2>&1)
# Face ID cadastrado no simulador
sim -s com.apple.BiometricKit.enrollmentChanged 1
sim -p com.apple.BiometricKit.enrollmentChanged

run 1-enable.yaml
face_match 2          # confirma a ativação
run 2-enabled.yaml    # reabre o app: ele pede o Face ID depois da splash
face_match 1          # destrava
run 3-unlocked.yaml   # reabre de novo: pede o Face ID
face_nomatch 1        # rosto não reconhecido: o sistema oferece cancelar
run 4-password.yaml
echo "✅ biometria"
