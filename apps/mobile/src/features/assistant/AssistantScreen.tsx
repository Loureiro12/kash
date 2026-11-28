import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSISTANT_LIMITS, ASSISTANT_SUGGESTIONS, formatBRL, relativeDayLabel, round2, type TxProposal } from '@kash/domain';
import { Button, Chip, Icon, IconButton, Pressable, Text, fontFamily, layout, radii, staticColors, useKeyboardInset, useTheme } from '@/design-system';
import { DATA_SOURCE } from '@/data/source';
import { now } from '@/lib/clock';
import { useCategories, useKashStore } from '@/store';
import { assistantConsent, type ProposalStatus } from './chatStorage';
import { choosePhotoSource, pickReceiptPhoto, type PhotoSource, type ReceiptPhoto } from './receiptPhoto';
import { RichText } from './RichText';
import { useAssistantChat } from './useAssistantChat';

/**
 * Assistente do Kash: chat com o Claude sobre as finanças da pessoa ("vale a pena comprar?",
 * "onde economizo?"). Na primeira vez pede autorização para enviar o resumo financeiro.
 */
export function AssistantScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [consent, setConsent] = useState<boolean | null>(null);
  // aberto pelo "Ler comprovante" do lançamento: já vai para a câmera/galeria
  const { foto, texto } = useLocalSearchParams<{ foto?: string; texto?: string }>();
  const initialPhoto: PhotoSource | undefined = foto === 'camera' || foto === 'galeria' ? foto : undefined;

  useEffect(() => {
    void assistantConsent.get().then(setConsent);
  }, []);

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.screenPaddingX, paddingTop: insets.top + layout.screenPaddingTopExtra, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Voltar" testID="assistant-back" />
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="sparkles" size={18} color={staticColors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleLg" testID="assistant-title">
          Assistente Kash
        </Text>
        <Text variant="micro" color="muted">
          Com IA (Claude) · olha os seus dados do Kash
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="assistant-screen">
      {header}
      {consent === null ? null : consent ? (
        <Chat initialPhoto={initialPhoto} initialText={typeof texto === 'string' && texto.trim() ? texto.trim().slice(0, 300) : undefined} />
      ) : (
        <Consent
          onAccept={() => {
            void assistantConsent.set(true);
            setConsent(true);
          }}
          onDecline={() => router.back()}
        />
      )}
    </View>
  );
}

function Consent({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={{ padding: layout.screenPaddingX, paddingBottom: insets.bottom + 24, gap: 14 }} testID="assistant-consent">
      <Text variant="pageTitle" style={{ marginTop: 8 }}>
        Pergunte sobre o seu dinheiro
      </Text>
      <Text variant="lead" color="muted">
        “Vale a pena comprar esse celular em 10x?”, “onde dá pra economizar?”, “quanto posso gastar por dia?”. O assistente responde olhando os seus números.
      </Text>
      <View style={{ gap: 10, padding: 16, borderRadius: radii.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
        <Text variant="bodySemibold">Como funciona</Text>
        <Text variant="body" color="muted">
          • Para responder, um resumo das suas contas, cartões, gastos, parcelas, contas fixas e metas vai junto com cada pergunta para a Anthropic (empresa do Claude), que processa e não usa para treinar modelos.
        </Text>
        <Text variant="body" color="muted">
          • Não enviamos seu e-mail, celular, sobrenome nem números de cartão. A conversa fica só neste aparelho.
        </Text>
        <Text variant="body" color="muted">
          • Quando você manda a foto de um comprovante ou nota, a imagem vai para o Claude ler e não é guardada (nem no aparelho, nem no servidor). Ela pode ter dados impressos, como CPF na nota.
        </Text>
        <Text variant="body" color="muted">
          • São respostas geradas por IA: confira antes de decidir. Não substitui um profissional.
        </Text>
      </View>
      <Button label="Começar" onPress={onAccept} testID="assistant-consent-accept" />
      <Button label="Agora não" variant="ghost" size="md" onPress={onDecline} testID="assistant-consent-decline" />
    </ScrollView>
  );
}

function Chat({ initialPhoto, initialText }: { initialPhoto?: PhotoSource; initialText?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, loaded, sending, error, remaining, send, retry, reset, confirmProposal, editProposal, dismissProposal } = useAssistantChat();
  // Android edge-to-edge: o campo de mensagem sobe acima do teclado
  const keyboardInset = useKeyboardInset();
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<ReceiptPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const autoPhoto = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const remote = DATA_SOURCE === 'remote';
  // aberto pelo widget/atalho com o app frio: espera os dados do servidor (o resumo não pode ir com os de exemplo)
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');
  const canSend = remote && ready && !sending && !preparing;
  const hasInput = !!draft.trim() || !!photo;

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, sending, error]);

  const submit = (text = draft, suggested = false, image = photo) => {
    if ((!text.trim() && !image) || !canSend) return;
    setDraft('');
    setPhoto(null);
    void send(text, suggested, image?.image);
  };

  /** tira/escolhe a foto e reduz no aparelho; `autoSend` envia direto (vindo do "Ler comprovante") */
  const attach = async (source?: PhotoSource, autoSend = false) => {
    setPhotoError(null);
    const from = source ?? (await choosePhotoSource());
    if (!from) return;
    setPreparing(true);
    try {
      const picked = await pickReceiptPhoto(from);
      if (!picked) return;
      if (autoSend) submit('', false, picked);
      else setPhoto(picked);
    } catch {
      setPhotoError('Não deu pra abrir essa foto. Tente outra.');
    } finally {
      setPreparing(false);
    }
  };

  // vindo da Siri ("Lançar no Kash") ou do link `…://lancar?texto=`: envia o texto uma vez
  const autoText = useRef(false);
  useEffect(() => {
    if (!initialText || autoText.current || !remote || !ready || !loaded) return;
    autoText.current = true;
    submit(initialText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText, remote, ready, loaded]);

  // vindo do lançamento: abre a câmera/galeria uma vez, quando os dados já carregaram
  useEffect(() => {
    if (!initialPhoto || autoPhoto.current || !remote || !ready || !loaded) return;
    autoPhoto.current = true;
    void attach(initialPhoto, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhoto, remote, ready, loaded]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingBottom: keyboardInset }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: layout.screenPaddingX, gap: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled" testID="assistant-messages">
        {loaded && messages.length === 0 ? (
          <View style={{ gap: 12, marginTop: 8 }} testID="assistant-empty">
            <Text variant="titleBold">Oi! Como posso ajudar com as suas finanças?</Text>
            <Text variant="body" color="muted">
              Toque numa sugestão, escreva a sua pergunta ou peça pra lançar um gasto: “gastei 45 no iFood no Nubank”.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="📷 Lançar pela foto de um comprovante" onPress={canSend ? () => void attach() : undefined} testID="assistant-suggestion-photo" />
              {ASSISTANT_SUGGESTIONS.map((s, i) => (
                <Chip key={s} label={s} onPress={canSend ? () => submit(s, true) : undefined} testID={`assistant-suggestion-${i}`} />
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((m, i) => (
          <React.Fragment key={m.id}>
            <Bubble role={m.role} content={m.content} photo={m.photo} testID={`assistant-msg-${i}`} />
            {m.proposals?.map((p, j) => (
              <ProposalCard
                key={j}
                proposal={p.proposal}
                status={p.status}
                onConfirm={() => confirmProposal(m.id, j)}
                onEdit={() => editProposal(m.id, j)}
                onDismiss={() => dismissProposal(m.id, j)}
                testID={`assistant-proposal-${i}-${j}`}
              />
            ))}
          </React.Fragment>
        ))}

        {sending ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.card, backgroundColor: colors.surface }} testID="assistant-typing" accessibilityLabel="O assistente está pensando" accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.muted} />
            <Text variant="meta" color="muted">
              {messages[messages.length - 1]?.photo ? 'Lendo a foto…' : 'Analisando seus números…'}
            </Text>
          </View>
        ) : null}

        {photoError ? (
          <Text variant="body" color="neg" testID="assistant-photo-error" accessibilityLiveRegion="assertive">
            {photoError}
          </Text>
        ) : null}

        {error ? (
          <View style={{ gap: 10, padding: 14, borderRadius: radii.card, backgroundColor: colors.negSoft }} testID="assistant-error" accessibilityLiveRegion="assertive">
            <Text variant="body" color="neg">
              {error}
            </Text>
            {messages[messages.length - 1]?.role === 'user' ? <Button label="Tentar de novo" variant="secondary" size="xs" fullWidth={false} onPress={() => void retry()} testID="assistant-retry" /> : null}
          </View>
        ) : null}

        {messages.length > 0 && !sending ? (
          <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="Começar uma nova conversa" hitSlop={8} style={{ alignSelf: 'center', marginTop: 4 }} testID="assistant-new">
            <Text variant="meta" color="accentText">
              Nova conversa
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: layout.screenPaddingX, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: colors.line, gap: 6, backgroundColor: colors.bg }}>
        {!remote ? (
          <Text variant="micro" color="neg">
            O assistente precisa da sua conta conectada.
          </Text>
        ) : !ready ? (
          <Text variant="micro" color="muted" testID="assistant-loading">
            Carregando seus dados…
          </Text>
        ) : remaining !== null && remaining <= 10 ? (
          <Text variant="micro" color="muted" testID="assistant-remaining">
            {remaining === 0 ? 'Acabaram as perguntas de hoje. Volte amanhã!' : `${remaining} ${remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje`}
          </Text>
        ) : null}
        {photo || preparing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} testID="assistant-photo-preview">
            {photo ? (
              <Image source={{ uri: photo.uri }} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface2 }} accessibilityIgnoresInvertColors accessible={false} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 }}>
                <ActivityIndicator size="small" color={colors.muted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text variant="bodySemibold">{photo ? 'Foto do comprovante' : 'Preparando a foto…'}</Text>
              <Text variant="micro" color="muted">
                {photo ? 'Diga algo a mais se quiser (ex.: “foi no Nubank em 3x”)' : 'Reduzindo no aparelho antes de enviar'}
              </Text>
            </View>
            {photo ? <IconButton icon="close" size={32} subtle onPress={() => setPhoto(null)} accessibilityLabel="Remover a foto" testID="assistant-photo-remove" /> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Pressable
            onPress={() => void attach()}
            disabled={!canSend}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Anexar foto de comprovante"
            accessibilityHint="Tire ou escolha a foto de uma nota, cupom ou comprovante para lançar"
            accessibilityState={{ disabled: !canSend }}
            testID="assistant-photo"
            style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: canSend ? 1 : 0.4 }}
          >
            <Icon name="camera" size={20} color={colors.text} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={photo ? 'Algo a acrescentar? (opcional)' : 'Pergunte ou lance: “gastei 30 no Uber”'}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={ASSISTANT_LIMITS.messageChars}
            editable={remote}
            accessibilityLabel="Sua pergunta para o assistente"
            testID="assistant-input"
            style={{ flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, color: colors.text, fontFamily: fontFamily.regular, fontSize: 15 }}
          />
          <Pressable
            onPress={() => submit()}
            disabled={!hasInput || !canSend}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Enviar foto' : 'Enviar pergunta'}
            accessibilityState={{ disabled: !hasInput || !canSend }}
            testID="assistant-send"
            style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, opacity: !hasInput || !canSend ? 0.4 : 1 }}
          >
            <Icon name="send" size={20} color={staticColors.ink} />
          </Pressable>
        </View>
        <Text variant="micro" color="muted" align="center">
          Respostas geradas por IA a partir dos seus dados. Confira antes de decidir.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ role, content, photo, testID }: { role: 'user' | 'assistant'; content: string; photo?: boolean; testID: string }) {
  const { colors } = useTheme();
  const mine = role === 'user';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${mine ? 'Você' : 'Assistente'}${photo ? ', com foto' : ''}: ${content.replace(/\*\*/g, '')}`}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: radii.card,
        borderBottomRightRadius: mine ? 6 : radii.card,
        borderBottomLeftRadius: mine ? radii.card : 6,
        backgroundColor: mine ? colors.accent : colors.surface,
        borderWidth: mine ? 0 : 1,
        borderColor: colors.line,
      }}
    >
      {photo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }} testID={`${testID}-photo`}>
          <Icon name="camera" size={14} color={staticColors.ink} />
          <Text variant="microSemibold" color={staticColors.ink}>
            Foto do comprovante
          </Text>
        </View>
      ) : null}
      {mine ? (
        <Text variant="subtitle" color={staticColors.ink}>
          {content}
        </Text>
      ) : (
        <RichText text={content} />
      )}
    </View>
  );
}

const STATUS_LABEL: Record<Exclude<ProposalStatus, 'pending'>, string> = {
  saved: 'Lançado ✓',
  edited: 'Aberto para editar',
  dismissed: 'Descartado',
};

/** Lançamento proposto pelo assistente: nada é salvo sem a pessoa tocar em "Lançar" */
export function ProposalCard({ proposal: p, status, onConfirm, onEdit, onDismiss, testID }: { proposal: TxProposal; status: ProposalStatus; onConfirm: () => void; onEdit: () => void; onDismiss: () => void; testID: string }) {
  const { colors } = useTheme();
  const { colors: categoryColors } = useCategories();
  const source = useKashStore((s) => s.cards.find((c) => c.id === p.sourceId)?.name ?? s.accounts.find((a) => a.id === p.sourceId)?.name ?? '');
  const income = p.kind === 'income';
  const pending = status === 'pending';
  const details = [income ? 'Entrada' : p.category, source, relativeDayLabel(p.date, now())].filter(Boolean).join(' · ');
  return (
    <View
      testID={testID}
      style={{ alignSelf: 'flex-start', width: '88%', gap: 10, padding: 14, borderRadius: radii.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: pending ? colors.accent : colors.line, opacity: status === 'dismissed' ? 0.55 : 1 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: income ? colors.accentText : (categoryColors[p.category] ?? colors.muted) }} />
        <Text variant="metaMedium" color="muted" style={{ flex: 1 }}>
          {income ? 'Entrada proposta' : 'Gasto proposto'}
        </Text>
        {!pending ? (
          <Text variant="chip" color={status === 'saved' ? 'accentText' : 'muted'} testID={`${testID}-status`}>
            {STATUS_LABEL[status]}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="amountMedium" color={income ? 'accentText' : 'text'} testID={`${testID}-amount`}>
          {income ? '+' : '−'}
          {formatBRL(p.amount)}
        </Text>
        <Text variant="bodySemibold">{p.title}</Text>
        <Text variant="meta" color="muted" testID={`${testID}-details`}>
          {details}
          {p.installments > 1 ? ` · ${p.installments}x de ${formatBRL(round2(p.amount / p.installments))}` : ''}
        </Text>
      </View>
      {pending ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Lançar" size="xs" fullWidth={false} onPress={onConfirm} testID={`${testID}-confirm`} haptic="medium" />
          <Button label="Editar" variant="secondary" size="xs" fullWidth={false} onPress={onEdit} testID={`${testID}-edit`} />
          <Button label="Descartar" variant="ghost" size="xs" fullWidth={false} onPress={onDismiss} testID={`${testID}-dismiss`} />
        </View>
      ) : null}
    </View>
  );
}
