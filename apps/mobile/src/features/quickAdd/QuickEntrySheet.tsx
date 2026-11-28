import { askAssistant, toKashError } from '@kash/supabase-client';
import { checkProposal, toISODate, type TxProposal } from '@kash/domain';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BottomSheet, Button, Text, radii, useTheme } from '@/design-system';
import { now } from '@/lib/clock';
import { supabase } from '@/services/supabase';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { ProposalCard } from '../assistant/AssistantScreen';
import type { ProposalStatus } from '../assistant/chatStorage';
import { RichText } from '../assistant/RichText';
import { currentContext, currentLedger } from '../assistant/useAssistantChat';

/**
 * "Lançar no Kash" pela Siri (ou o link `…://lancar?texto=`): o assistente interpreta o texto
 * ("gastei 30 no Uber") e o lançamento aparece aqui para confirmar, sem abrir o chat.
 */
export function QuickEntrySheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'quickEntry');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const text = useKashStore((s) => s.ui.quickEntryText);
  const closeSheet = useKashStore((s) => s.closeSheet);
  if (!text) return null;
  return <QuickEntry key={nonce} visible={visible} text={text} onClose={closeSheet} />;
}

type State = { status: 'loading' } | { status: 'done'; reply: string; proposals: { proposal: TxProposal; status: ProposalStatus }[] } | { status: 'error'; message: string };

function QuickEntry({ visible, text, onClose }: { visible: boolean; text: string; onClose: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const ledger = currentLedger();
        const res = await askAssistant(supabase, { messages: [{ role: 'user', content: text }], context: currentContext(), ledger });
        const today = toISODate(now());
        const proposals = (res.proposals ?? []).map((p) => checkProposal(p, ledger, today)).filter((p): p is TxProposal => p !== null);
        if (proposals.length) track('assistant_proposal', { action: 'shown' });
        if (alive) setState({ status: 'done', reply: res.reply, proposals: proposals.map((proposal) => ({ proposal, status: 'pending' as const })) });
      } catch (err) {
        if (alive) setState({ status: 'error', message: toKashError(err).message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [text, attempt]);

  const setStatus = (index: number, status: ProposalStatus) =>
    setState((s) => (s.status === 'done' ? { ...s, proposals: s.proposals.map((p, i) => (i === index ? { ...p, status } : p)) } : s));

  const confirm = (index: number) => {
    if (state.status !== 'done') return;
    const item = state.proposals[index];
    const p = item ? checkProposal(item.proposal, currentLedger(), toISODate(now())) : null;
    if (!p) return;
    useKashStore.getState().addTransaction({ kind: p.kind, amountCents: Math.round(p.amount * 100), category: p.category, sourceId: p.sourceId, note: p.title, installments: p.installments, date: p.date });
    track('assistant_proposal', { action: 'saved' });
    setStatus(index, 'saved');
    // um lançamento só: fecha sozinho depois de lançar
    const pending = state.proposals.filter((x, i) => i !== index && x.status === 'pending');
    if (pending.length === 0) {
      useKashStore.getState().showToast(`${p.title || 'Lançamento'} lançado`);
      onClose();
    }
  };

  const edit = (index: number) => {
    if (state.status !== 'done') return;
    const p = state.proposals[index]?.proposal;
    if (!p) return;
    track('assistant_proposal', { action: 'edited' });
    // troca este sheet pelo de lançamento, já preenchido
    useKashStore.getState().openNewTransaction(p.kind, { amountCents: Math.round(p.amount * 100), category: p.category, sourceId: p.sourceId, note: p.title, date: p.date, installments: p.installments });
  };

  const openChat = () => {
    onClose();
    router.push({ pathname: '/assistant', params: { texto: text } });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Lançar com o assistente" testID="sheet-quick-entry" gap={12}>
      <View style={{ padding: 12, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
        <Text variant="body" color="muted" testID="quick-entry-text">
          “{text}”
        </Text>
      </View>

      {state.status === 'loading' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }} testID="quick-entry-loading" accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.muted} />
          <Text variant="body" color="muted">
            Preparando o lançamento…
          </Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={{ gap: 10 }} testID="quick-entry-error">
          <Text variant="body" color="neg">
            {state.message}
          </Text>
          <Button label="Tentar de novo" variant="secondary" size="md" onPress={() => {
              setState({ status: 'loading' });
              setAttempt((a) => a + 1);
            }} testID="quick-entry-retry" />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {state.proposals.length === 0 ? <RichText text={state.reply} /> : null}
          {state.proposals.map((p, i) => (
            <ProposalCard
              key={i}
              proposal={p.proposal}
              status={p.status}
              onConfirm={() => confirm(i)}
              onEdit={() => edit(i)}
              onDismiss={() => {
                track('assistant_proposal', { action: 'dismissed' });
                setStatus(i, 'dismissed');
                if (state.proposals.every((x, j) => j === i || x.status !== 'pending')) onClose();
              }}
              testID={`quick-entry-proposal-${i}`}
            />
          ))}
          {state.proposals.length === 0 ? <Button label="Continuar no assistente" variant="secondary" size="md" onPress={openChat} testID="quick-entry-chat" /> : null}
        </View>
      )}
    </BottomSheet>
  );
}
