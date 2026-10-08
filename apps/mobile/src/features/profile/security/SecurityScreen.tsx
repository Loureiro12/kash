import { useRouter } from 'expo-router';
import React from 'react';
import { Card, ListRow, PageHeader, Screen, Switch, Text } from '@/design-system';
import { useBiometricSupport, useBiometricToggle } from '@/features/security/useBiometrics';
import { useKashStore } from '@/store';

/** Perfil › Segurança — trocar a senha e entrar com Face ID / Touch ID / digital. */
export function SecurityScreen() {
  const router = useRouter();
  const openSheet = useKashStore((s) => s.openSheet);
  const support = useBiometricSupport();
  const { enabled, toggle, busy } = useBiometricToggle(support);
  const label = support?.label ?? 'biometria';
  const unavailable = support !== null && (!support.hasHardware || !support.enrolled);

  const subtitle = !support
    ? 'Verificando o aparelho…'
    : !support.hasHardware
      ? 'Este aparelho não tem biometria'
      : !support.enrolled
        ? `Cadastre o ${label} nos Ajustes do aparelho pra usar`
        : enabled
          ? `O app pede o ${label} ao abrir e ao voltar depois de 30 s`
          : `Use o ${label} em vez da senha ao abrir o app`;

  return (
    <Screen testID="security-screen" header={<PageHeader title="Segurança" onBack={() => router.back()} testID="security" />}>
      <Text variant="eyebrow" color="muted" style={{ marginTop: 10, marginBottom: 10, marginLeft: 4 }}>
        Acesso
      </Text>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <ListRow title="Alterar senha" subtitle="Confirme a senha atual e escolha uma nova" onPress={() => openSheet('changePassword')} testID="security-password" />
        <ListRow
          title={`Entrar com ${label}`}
          subtitle={subtitle}
          trailing={
            <Switch
              value={enabled}
              onValueChange={(v) => void toggle(v)}
              testID="security-biometrics-switch"
              accessibilityLabel={`Entrar com ${label}`}
            />
          }
          onPress={busy ? undefined : () => void toggle()}
          divider={false}
          testID="security-biometrics"
        />
      </Card>
      {unavailable && enabled ? (
        <Text variant="meta" color="neg" style={{ marginTop: 8, marginLeft: 4 }} testID="security-biometrics-warning">
          O {label} foi removido deste aparelho. Desative ou cadastre de novo.
        </Text>
      ) : null}

      <Card variant="surface2" radius="card" padding={16} style={{ marginTop: 18, gap: 6 }} testID="security-tip">
        <Text variant="titleBold">Dica</Text>
        <Text variant="body" color="muted">
          O Kash nunca pede sua senha por e-mail ou mensagem. Se alguém pedir, não é a gente.
        </Text>
      </Card>
    </Screen>
  );
}
