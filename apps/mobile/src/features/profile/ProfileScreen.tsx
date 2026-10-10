import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Avatar, Button, Card, ListRow, PageHeader, Screen, Switch, Text } from '@/design-system';
import { formatBRL } from '@kash/domain';
import { useToggleBillReminder } from '@/features/notifications';
import { APP_VERSION } from '@/lib/appVersion';
import { useKashStore } from '@/store';
import { useExportData } from './useExportData';

/** Tela 9 — Perfil (página interna). */
export function ProfileScreen() {
  const router = useRouter();
  const user = useKashStore((s) => s.user);
  const settings = useKashStore((s) => s.settings);
  const categoryCount = useKashStore((s) => s.categories.length);
  const toggleTheme = useKashStore((s) => s.toggleTheme);
  const toggleBillReminder = useToggleBillReminder();
  const toggleEmail = useKashStore((s) => s.toggleEmailReminder);
  const setChecklistHidden = useKashStore((s) => s.setChecklistHidden);
  const showToast = useKashStore((s) => s.showToast);
  const toggleEmailReminder = () => {
    const on = !settings.emailReminder;
    toggleEmail();
    showToast(on ? `Lembretes por e-mail ligados: chegam às 9h em ${user.email}` : 'Lembretes por e-mail desligados');
  };
  const logout = useKashStore((s) => s.logout);
  const openSheet = useKashStore((s) => s.openSheet);
  const { exportData, exporting } = useExportData();

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
        <ListRow title="Limite mensal" value={formatBRL(settings.monthlyBudget)} onPress={() => router.push('/profile/budget')} testID="profile-budget" />
        <ListRow title="Categorias" value={`${categoryCount}`} onPress={() => router.push('/profile/categories')} divider={false} testID="profile-categories" />
      </Group>

      <Eyebrow>Preferências</Eyebrow>
      <Group>
        <ListRow title="Tema escuro" trailing={<Switch value={settings.theme === 'dark'} onValueChange={toggleTheme} testID="profile-theme-switch" accessibilityLabel="Tema escuro" />} onPress={toggleTheme} testID="profile-theme" />
        <ListRow
          title="Lembrete de contas"
          subtitle="Notificação 2 dias antes do vencimento"
          trailing={<Switch value={settings.billReminder} onValueChange={(v) => void toggleBillReminder(v)} testID="profile-reminder-switch" accessibilityLabel="Lembrete de contas" />}
          onPress={() => void toggleBillReminder()}
          testID="profile-reminder"
        />
        <ListRow
          title="Lembrete por e-mail"
          subtitle={settings.emailReminder ? `Às 9h em ${user.email}` : 'E-mail às 9h, 2 dias antes do vencimento'}
          trailing={<Switch value={settings.emailReminder} onValueChange={toggleEmailReminder} testID="profile-email-reminder-switch" accessibilityLabel="Lembrete por e-mail" />}
          onPress={toggleEmailReminder}
          testID="profile-email-reminder"
        />
        <ListRow title="Moeda" value="Real (R$)" divider={false} onPress={() => router.push('/profile/currency')} testID="profile-currency" />
      </Group>

      <Eyebrow>Sobre</Eyebrow>
      <Group>
        <ListRow title="Termos de uso" onPress={() => router.push('/terms')} testID="profile-terms" />
        <ListRow title="Política de privacidade" onPress={() => router.push('/privacy')} testID="profile-privacy" />
        <ListRow title="Exportar meus dados" subtitle={exporting ? 'Preparando o arquivo…' : 'Arquivo JSON com tudo que você lançou'} onPress={() => void exportData()} testID="profile-export" />
        <ListRow title="Ajuda e suporte" onPress={() => router.push('/profile/help')} testID="profile-help" />
        {settings.checklistHidden ? (
          <ListRow
            title="Primeiros passos"
            subtitle="Mostrar de novo o guia no Início"
            onPress={() => {
              setChecklistHidden(false);
              router.navigate('/');
            }}
            testID="profile-show-checklist"
          />
        ) : null}
        <ListRow title="Versão" value={APP_VERSION} chevron={false} divider={false} testID="profile-version" />
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
