import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Avatar, Button, Card, ListRow, PageHeader, Screen, Switch, Text } from '@/design-system';
import { formatBRL } from '@kash/domain';
import { useKashStore } from '@/store';

/** Tela 9 — Perfil (página interna). */
export function ProfileScreen() {
  const router = useRouter();
  const user = useKashStore((s) => s.user);
  const settings = useKashStore((s) => s.settings);
  const toggleTheme = useKashStore((s) => s.toggleTheme);
  const toggleBillReminder = useKashStore((s) => s.toggleBillReminder);
  const logout = useKashStore((s) => s.logout);
  const openSheet = useKashStore((s) => s.openSheet);

  return (
    <Screen testID="profile-screen" header={<PageHeader title="Perfil" onBack={() => router.back()} testID="profile" />}>
      <Card padding={18} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }} testID="profile-identity">
        <Avatar initial={user.name[0] ?? 'K'} size={56} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="titleLg">{user.name}</Text>
          <Text variant="meta" color="muted" numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <Button label="Editar" variant="secondary" size="xs" fullWidth={false} onPress={() => router.push('/profile/personal')} testID="profile-edit" />
      </Card>

      <Eyebrow>Conta</Eyebrow>
      <Group>
        <ListRow title="Dados pessoais" value="Nome, e-mail, celular" onPress={() => router.push('/profile/personal')} testID="profile-personal" />
        <ListRow title="Segurança" value="Senha, biometria" onPress={() => router.push('/profile/security')} testID="profile-security" />
        <ListRow title="Limite mensal" value={formatBRL(settings.monthlyBudget)} onPress={() => router.push('/profile/budget')} divider={false} testID="profile-budget" />
      </Group>

      <Eyebrow>Preferências</Eyebrow>
      <Group>
        <ListRow title="Tema escuro" trailing={<Switch value={settings.theme === 'dark'} onValueChange={toggleTheme} testID="profile-theme-switch" accessibilityLabel="Tema escuro" />} onPress={toggleTheme} testID="profile-theme" />
        <ListRow
          title="Lembrete de contas"
          subtitle="Aviso 2 dias antes do vencimento"
          trailing={<Switch value={settings.billReminder} onValueChange={toggleBillReminder} testID="profile-reminder-switch" accessibilityLabel="Lembrete de contas" />}
          onPress={toggleBillReminder}
          testID="profile-reminder"
        />
        <ListRow title="Moeda" value="Real (R$)" divider={false} onPress={() => router.push('/profile/currency')} testID="profile-currency" />
      </Group>

      <Eyebrow>Sobre</Eyebrow>
      <Group>
        <ListRow title="Termos de uso" onPress={() => router.push('/terms')} testID="profile-terms" />
        <ListRow title="Política de privacidade" onPress={() => router.push('/privacy')} testID="profile-privacy" />
        <ListRow title="Ajuda e suporte" onPress={() => router.push('/profile/help')} testID="profile-help" />
        <ListRow title="Versão" value="1.0.0" chevron={false} divider={false} testID="profile-version" />
      </Group>

      <View style={{ gap: 10, marginTop: 24 }}>
        <Button label="Sair da conta" variant="surface" size="md" onPress={() => void logout()} testID="profile-logout" />
        <Button label="Excluir conta" variant="dangerSoft" size="md" onPress={() => openSheet('deleteAccount')} testID="profile-delete" />
      </View>
    </Screen>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text variant="eyebrow" color="muted" style={{ marginTop: 24, marginBottom: 10, marginLeft: 4 }}>
      {children}
    </Text>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      {children}
    </Card>
  );
}
