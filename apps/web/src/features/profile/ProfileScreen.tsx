'use client';

import { formatBRL } from '@kash/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Button, Card, Group, GroupRow, Switch } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';
import p from './profile.module.css';

export const WEB_VERSION = '1.0.0';

/** Perfil: identidade, conta, preferências, sobre, sair e excluir conta. */
export function ProfileScreen() {
  const { user, settings, categories } = useKash();
  const actions = useKashActions();
  const router = useRouter();
  const openModal = useUi((st) => st.openModal);
  const [exporting, setExporting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dark = settings.theme === 'dark';

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    await actions.exportData();
    setExporting(false);
  };
  const logout = async () => {
    setLeaving(true);
    await actions.signOut();
    router.replace(routes.login);
  };

  return (
    <>
      <PageHeader title="Perfil" subtitle="Sua conta, preferências e informações legais." />
      <div className={s.grid2}>
        <div className={s.stack}>
          <Card className={p.identity} testID="profile-identity">
            <Avatar name={user.name} size={60} />
            <div className={p.identityText}>
              <span className={p.name}>{user.name}</span>
              <span className={s.muted} style={{ fontSize: 13 }}>
                {user.email}
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push(routes.personal)} testID="profile-edit">
              Editar
            </Button>
          </Card>

          <Group title="Conta">
            <GroupRow title="Dados pessoais" value="Nome, e-mail, celular" href={routes.personal} testID="profile-personal" />
            <GroupRow title="Segurança" value="Senha" href={routes.security} testID="profile-security" />
            <GroupRow title="Limite mensal" value={formatBRL(settings.monthlyBudget)} href={routes.budget} testID="profile-budget" />
            <GroupRow title="Categorias" value={`${categories.length}`} href={routes.categories} testID="profile-categories" />
          </Group>

          <Group title="Preferências">
            <GroupRow title="Tema escuro" trailing={<Switch checked={dark} onChange={(on) => void actions.updateSettings({ theme: on ? 'dark' : 'light' })} label="Tema escuro" testID="profile-theme-switch" />} />
            <GroupRow
              title="Lembrete de contas"
              subtitle={settings.emailReminder ? `E-mail para ${user.email}, 2 dias antes do vencimento` : 'E-mail 2 dias antes do vencimento'}
              trailing={
                <Switch
                  checked={settings.emailReminder}
                  onChange={(on) => void actions.updateSettings({ emailReminder: on }, on ? `Lembretes por e-mail ligados: chegam às 9h em ${user.email}` : 'Lembretes por e-mail desligados')}
                  label="Lembrete de contas por e-mail"
                  testID="profile-reminder-switch"
                />
              }
            />
            <GroupRow title="Moeda" value="Real (R$)" href={routes.currency} testID="profile-currency" />
          </Group>
        </div>

        <div className={s.stack}>
          <Group title="Sobre">
            <GroupRow title="Termos de uso" href={routes.terms} testID="profile-terms" />
            <GroupRow title="Política de privacidade" href={routes.privacy} testID="profile-privacy" />
            <GroupRow title="Exportar meus dados" subtitle={exporting ? 'Preparando o arquivo…' : 'Arquivo JSON com tudo que você lançou'} onClick={() => void exportData()} testID="profile-export" />
            <GroupRow title="Ajuda e suporte" href={routes.help} testID="profile-help" />
            {settings.checklistHidden ? (
              <GroupRow
                title="Primeiros passos"
                subtitle="Mostrar de novo o guia no Início"
                onClick={() => void actions.updateSettings({ checklistHidden: false }).then((ok) => ok && router.push(routes.home))}
                testID="profile-show-checklist"
              />
            ) : null}
            <GroupRow title="Versão" value={`Web ${WEB_VERSION}`} testID="profile-version" />
          </Group>
          <div className={p.buttons}>
            <Button variant="surface" size="md" onClick={() => void logout()} loading={leaving} testID="profile-logout">
              Sair da conta
            </Button>
            <Button variant="dangerSoft" size="md" onClick={() => openModal({ name: 'deleteAccount' })} testID="profile-delete">
              Excluir conta
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
