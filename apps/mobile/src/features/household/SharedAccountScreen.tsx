import { acceptHouseholdInvite, cancelHouseholdInvites, createHouseholdInvite, getHousehold, leaveHousehold, toKashError, updateHouseholdSettings } from '@kash/supabase-client';
import { formatInviteCode, householdPeople, inviteMessage, relativeDayLabel, VIEW_SCOPE_LABEL, type NotifyScope, type ViewScope } from '@kash/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Avatar, Button, Card, Input, PageHeader, Screen, SegmentedControl, Switch, Text, useTheme } from '@/design-system';
import { queryKeys } from '@/data/keys';
import { queryClient } from '@/data/queryClient';
import { now } from '@/lib/clock';
import { registerPushToken, requestNotificationPermission } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';

/** depois de convite/entrar/sair: atualiza o espaço e recarrega os dados (agora com o do casal) */
async function refreshHousehold() {
  useKashStore.getState().setHousehold(await getHousehold(supabase));
  await queryClient.invalidateQueries({ queryKey: queryKeys.snapshotRoot });
}

/**
 * Perfil › Conta compartilhada: convidar o par (código + link), entrar com um convite e, já juntos,
 * escolher o que cada um vê, os avisos e sair.
 */
export function SharedAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ codigo?: string }>();
  const household = useKashStore((s) => s.household);
  const userId = useKashStore((s) => s.userId);
  const people = householdPeople(household, userId);
  return (
    <Screen testID="shared-screen" withTabBar={false} header={<PageHeader title="Conta compartilhada" onBack={() => router.back()} testID="shared" />}>
      {people.active ? <Together /> : <Invite initialCode={typeof params.codigo === 'string' ? params.codigo : ''} />}
    </Screen>
  );
}

function Invite({ initialCode }: { initialCode: string }) {
  const { colors } = useTheme();
  const household = useKashStore((s) => s.household);
  const user = useKashStore((s) => s.user);
  const showToast = useKashStore((s) => s.showToast);
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [busy, setBusy] = useState<'invite' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invite = household?.invite ?? null;

  const createInvite = async () => {
    setBusy('invite');
    setError(null);
    try {
      const created = await createHouseholdInvite(supabase);
      await refreshHousehold();
      track('household_invite', {});
      await Share.share({ message: inviteMessage(created.code, user.name) });
    } catch (err) {
      setError(toKashError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    setBusy('join');
    setError(null);
    try {
      await acceptHouseholdInvite(supabase, code);
      await refreshHousehold();
      track('household_join', {});
      // avisos dos lançamentos do par: pede a permissão e registra este aparelho
      if (await requestNotificationPermission()) await registerPushToken();
      showToast('Pronto! Agora vocês dividem a conta.');
    } catch (err) {
      setError(toKashError(err).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 14, marginTop: 8 }}>
      <Card padding={18} style={{ gap: 10 }}>
        <Text variant="titleLg">Dividam as finanças do casal</Text>
        {[
          'Contas, cartões, contas fixas e metas do casal: os dois veem e lançam.',
          'A cada gasto ou entrada no compartilhado, a outra pessoa recebe um aviso.',
          'O que é só seu continua só seu, a menos que você escolha mostrar.',
          'Cada um escolhe a própria visão: tudo, o seu e o do casal, ou só o do casal.',
        ].map((t) => (
          <Text key={t} variant="body" color="muted">
            • {t}
          </Text>
        ))}
      </Card>

      {invite ? (
        <Card padding={18} style={{ gap: 10, borderWidth: 1, borderColor: colors.accentText }} testID="shared-invite">
          <Text variant="metaMedium" color="muted">
            Convite pendente
          </Text>
          <Text variant="heroTitle" testID="shared-invite-code" selectable>
            {formatInviteCode(invite.code)}
          </Text>
          <Text variant="meta" color="muted">
            Vale até {relativeDayLabel(invite.expiresAt.slice(0, 10), now()).toLowerCase()}. A outra pessoa abre o link no celular com o Kash ou digita o código em Perfil › Conta compartilhada.
          </Text>
          <Button label="Mandar o convite" onPress={() => void Share.share({ message: inviteMessage(invite.code, user.name) })} testID="shared-invite-share" />
          <Button
            label="Cancelar convite"
            variant="ghost"
            size="md"
            onPress={() =>
              void cancelHouseholdInvites(supabase)
                .then(refreshHousehold)
                .catch((err) => setError(toKashError(err).message))
            }
            testID="shared-invite-cancel"
          />
        </Card>
      ) : (
        <Button label={busy === 'invite' ? 'Criando o convite…' : 'Convidar alguém'} onPress={() => void createInvite()} disabled={!!busy} testID="shared-invite-create" haptic="medium" />
      )}

      <Card padding={18} style={{ gap: 10 }}>
        <Text variant="bodySemibold">Recebeu um convite?</Text>
        <Input height={48} placeholder="Código de 8 letras (ex.: ABCD EFGH)" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={9} testID="shared-code" />
        <Button label={busy === 'join' ? 'Entrando…' : 'Entrar na conta compartilhada'} variant="secondary" onPress={() => void join()} disabled={!!busy || code.replace(/\s+/g, '').length !== 8} testID="shared-join" />
      </Card>

      {error ? (
        <Text variant="body" color="neg" testID="shared-error" accessibilityLiveRegion="assertive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const SEE_OPTIONS: { value: ViewScope; label: string; testID: string }[] = [
  { value: 'all', label: VIEW_SCOPE_LABEL.all, testID: 'shared-view-all' },
  { value: 'mine_shared', label: 'Meu + casal', testID: 'shared-view-mine' },
  { value: 'shared', label: 'Só casal', testID: 'shared-view-shared' },
];

function Together() {
  const { colors } = useTheme();
  const household = useKashStore((s) => s.household)!;
  const userId = useKashStore((s) => s.userId);
  const setViewScope = useKashStore((s) => s.setViewScope);
  const setHousehold = useKashStore((s) => s.setHousehold);
  const showToast = useKashStore((s) => s.showToast);
  const { me, partner } = householdPeople(household, userId);
  if (!me || !partner) return null;
  const partnerName = partner.name.split(/\s+/)[0] ?? partner.name;

  // preferências: muda na hora e salva no servidor (desfaz se falhar)
  const save = (patch: Partial<typeof me>, input: Parameters<typeof updateHouseholdSettings>[1]) => {
    const before = household;
    setHousehold({ ...household, members: household.members.map((m) => (m.userId === me.userId ? { ...m, ...patch } : m)) });
    void updateHouseholdSettings(supabase, input).catch((err) => {
      setHousehold(before);
      showToast(toKashError(err).message);
    });
  };

  const leave = () =>
    Alert.alert(
      'Sair da conta compartilhada?',
      `O que vocês dividem fica com ${partnerName}, inclusive o que você lançou nas contas do casal. Seus dados pessoais continuam com você.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () =>
            void leaveHousehold(supabase)
              .then(refreshHousehold)
              .then(() => showToast('Você saiu da conta compartilhada'))
              .catch((err) => showToast(toKashError(err).message)),
        },
      ],
    );

  return (
    <View style={{ gap: 14, marginTop: 8 }}>
      <Card padding={18} style={{ gap: 12 }} testID="shared-members">
        <Text variant="titleLg">{household.name}</Text>
        {[me, partner].map((m) => (
          <View key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar initial={m.name[0] ?? '?'} size={40} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySemibold">{m.userId === me.userId ? `${m.name} (você)` : m.name}</Text>
              <Text variant="micro" color="muted">
                {m.sharePersonal ? 'mostra também o pessoal' : 'mostra só o do casal'}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card padding={18} style={{ gap: 10 }}>
        <Text variant="bodySemibold">O que eu vejo no app</Text>
        <SegmentedControl<ViewScope>
          value={me.viewScope}
          onChange={(scope) => {
            setViewScope(scope);
            track('household_view', { scope });
          }}
          options={SEE_OPTIONS}
          testID="shared-view"
        />
        <Text variant="micro" color="muted" testID="shared-view-hint">
          {me.viewScope === 'all'
            ? `Seu, do casal${partner.sharePersonal ? ` e o pessoal de ${partnerName} (só leitura)` : ''}.`
            : me.viewScope === 'mine_shared'
              ? 'O seu e o do casal.'
              : 'Só as contas, cartões, contas fixas e metas do casal. Ideal para planejar juntos.'}
        </Text>
      </Card>

      <Card padding={18} style={{ gap: 10 }}>
        <Text variant="bodySemibold">O que {partnerName} vê de mim</Text>
        <SegmentedControl<'shared' | 'all'>
          value={me.sharePersonal ? 'all' : 'shared'}
          onChange={(v) => save({ sharePersonal: v === 'all' }, { sharePersonal: v === 'all' })}
          options={[
            { value: 'shared', label: 'Só o do casal', testID: 'shared-mine-shared' },
            { value: 'all', label: 'Tudo (só leitura)', testID: 'shared-mine-all' },
          ]}
          testID="shared-mine"
        />
        <Text variant="micro" color="muted">
          {me.sharePersonal ? `${partnerName} vê suas contas e lançamentos pessoais, mas não consegue alterar.` : `Suas contas e lançamentos pessoais ficam só com você.`}
        </Text>
      </Card>

      <Card padding={18} style={{ gap: 10 }}>
        <Text variant="bodySemibold">Avisos de {partnerName}</Text>
        <SegmentedControl<NotifyScope>
          value={me.notifyScope}
          onChange={(v) => save({ notifyScope: v }, { notifyScope: v })}
          options={[
            { value: 'shared', label: 'Do casal', testID: 'shared-notify-shared' },
            { value: 'all_visible', label: 'Tudo que vejo', testID: 'shared-notify-all' },
            { value: 'off', label: 'Desligado', testID: 'shared-notify-off' },
          ]}
          testID="shared-notify"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: me.notifyScope === 'off' ? 0.5 : 1 }}>
          <Text variant="body" style={{ flex: 1 }}>
            Mostrar o valor no aviso
          </Text>
          <Switch value={me.notifyValues} onValueChange={(v) => save({ notifyValues: v }, { notifyValues: v })} testID="shared-notify-values" accessibilityLabel="Mostrar o valor no aviso" />
        </View>
        <Text variant="micro" color="muted">
          Ex.: “{partnerName} lançou {me.notifyValues ? 'R$ 45,90' : 'um gasto'} · iFood (Comida)”. Os avisos chegam mesmo com o app fechado.
        </Text>
      </Card>

      <Card padding={18} style={{ gap: 6, borderWidth: 1, borderColor: colors.line }}>
        <Text variant="bodySemibold">Como compartilhar</Text>
        <Text variant="body" color="muted">
          Ao criar uma conta, cartão, conta fixa ou meta, ligue “Compartilhar com {partnerName}”. Para uma que já existe, abra e ligue. O que for lançado nela fica do casal.
        </Text>
      </Card>

      <Button label="Sair da conta compartilhada" variant="dangerSoft" size="md" onPress={leave} testID="shared-leave" />
    </View>
  );
}
