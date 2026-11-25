import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSISTANT_LIMITS, ASSISTANT_SUGGESTIONS } from '@kash/domain';
import { Button, Chip, Icon, IconButton, Pressable, Text, fontFamily, layout, radii, staticColors, useTheme } from '@/design-system';
import { DATA_SOURCE } from '@/data/source';
import { assistantConsent } from './chatStorage';
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
        <Chat />
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
          • São respostas geradas por IA: confira antes de decidir. Não substitui um profissional.
        </Text>
      </View>
      <Button label="Começar" onPress={onAccept} testID="assistant-consent-accept" />
      <Button label="Agora não" variant="ghost" size="md" onPress={onDecline} testID="assistant-consent-decline" />
    </ScrollView>
  );
}

function Chat() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, loaded, sending, error, remaining, send, retry, reset } = useAssistantChat();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const remote = DATA_SOURCE === 'remote';

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, sending, error]);

  const submit = (text = draft, suggested = false) => {
    if (!text.trim() || sending) return;
    setDraft('');
    void send(text, suggested);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: layout.screenPaddingX, gap: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled" testID="assistant-messages">
        {loaded && messages.length === 0 ? (
          <View style={{ gap: 12, marginTop: 8 }} testID="assistant-empty">
            <Text variant="titleBold">Oi! Como posso ajudar com as suas finanças?</Text>
            <Text variant="body" color="muted">
              Toque numa sugestão ou escreva a sua pergunta.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ASSISTANT_SUGGESTIONS.map((s, i) => (
                <Chip key={s} label={s} onPress={() => submit(s, true)} testID={`assistant-suggestion-${i}`} />
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((m, i) => (
          <Bubble key={m.id} role={m.role} content={m.content} testID={`assistant-msg-${i}`} />
        ))}

        {sending ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.card, backgroundColor: colors.surface }} testID="assistant-typing" accessibilityLabel="O assistente está pensando" accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.muted} />
            <Text variant="meta" color="muted">
              Analisando seus números…
            </Text>
          </View>
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
        ) : remaining !== null && remaining <= 10 ? (
          <Text variant="micro" color="muted" testID="assistant-remaining">
            {remaining === 0 ? 'Acabaram as perguntas de hoje. Volte amanhã!' : `${remaining} ${remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje`}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Pergunte sobre seus gastos…"
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
            disabled={!draft.trim() || sending || !remote}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Enviar pergunta"
            accessibilityState={{ disabled: !draft.trim() || sending || !remote }}
            testID="assistant-send"
            style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, opacity: !draft.trim() || sending || !remote ? 0.4 : 1 }}
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

function Bubble({ role, content, testID }: { role: 'user' | 'assistant'; content: string; testID: string }) {
  const { colors } = useTheme();
  const mine = role === 'user';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${mine ? 'Você' : 'Assistente'}: ${content.replace(/\*\*/g, '')}`}
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
