import { useRouter } from 'expo-router';
import React from 'react';
import { Card, ListRow, PageHeader, Screen, Switch, Text } from '@/design-system';
import { useKashStore } from '@/store';

/** Perfil › Segurança — senha e biometria. */
export function SecurityScreen() {
  const router = useRouter();
  const biometrics = useKashStore((s) => s.settings.biometrics);
  const toggleBiometrics = useKashStore((s) => s.toggleBiometrics);
  const openSheet = useKashStore((s) => s.openSheet);

  return (
    <Screen testID="security-screen" header={<PageHeader title="Segurança" onBack={() => router.back()} testID="security" />}>
      <Text variant="eyebrow" color="muted" style={{ marginTop: 10, marginBottom: 10, marginLeft: 4 }}>
        Acesso
      </Text>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <ListRow title="Alterar senha" subtitle="Última alteração há 3 meses" onPress={() => openSheet('changePassword')} testID="security-password" />
        <ListRow
          title="Entrar com biometria"
          subtitle="Face ID ou Touch ID em vez da senha"
          trailing={<Switch value={biometrics} onValueChange={toggleBiometrics} testID="security-biometrics-switch" accessibilityLabel="Entrar com biometria" />}
          onPress={toggleBiometrics}
          divider={false}
          testID="security-biometrics"
        />
      </Card>

      <Card variant="surface2" radius="card" padding={16} style={{ marginTop: 18, gap: 6 }} testID="security-tip">
        <Text variant="titleBold">Dica</Text>
        <Text variant="body" color="muted">
          O Kash nunca pede sua senha por e-mail ou mensagem. Se alguém pedir, não é a gente.
        </Text>
      </Card>
    </Screen>
  );
}
