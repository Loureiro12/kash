import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Card, Icon, ListRow, PageHeader, Pressable, Screen, Text, useTheme } from '@/design-system';
import { APP_VERSION } from '@/lib/appVersion';
import { useKashStore } from '@/store';

const FAQ = [
  { q: 'O Kash acessa minha conta do banco?', a: 'Não. Você lança tudo manualmente; não pedimos senha de banco nem usamos Open Finance.' },
  { q: 'Como funciona o parcelamento no cartão?', a: 'Ao lançar um gasto no cartão você escolhe o número de parcelas. A primeira entra hoje e as outras aparecem na Previsão, mês a mês.' },
  { q: 'Como registro dinheiro que passei de uma conta pra outra?', a: 'Use Transferir (em Contas bancárias ou na opção Transferência do Lançar gasto). O saldo sai de uma conta e entra na outra, e não conta como gasto nem como entrada.' },
  { q: 'O que acontece quando marco uma conta fixa como paga?', a: 'O Kash cria o lançamento do mês: na fatura, se a conta for cobrada no cartão, ou debitando o saldo, se for na conta.' },
  {
    q: 'Dá pra lançar um gasto tocando nas costas do iPhone?',
    a: 'Dá. No app Ajustes, abra Acessibilidade › Toque › Toque Atrás e escolha Toque Duplo (ou Triplo). Na lista, em Atalhos, escolha "Lançar gasto" ou "Lançar entrada" do Kash. Se elas não aparecerem, abra o app Atalhos, toque em Kash e adicione a ação aos seus atalhos. Também funciona com a Siri ("Lançar gasto no Kash") e no botão de Ação.',
    ios: true,
  },
  { q: 'Meus dados ficam salvos onde?', a: 'Em servidores criptografados no Brasil, conforme a LGPD. Você pode apagar tudo em Perfil → Excluir conta.' },
] as const;

/** perguntas só de iPhone (atalhos) não aparecem no Android */
const FAQ_VISIBLE = FAQ.filter((item) => !('ios' in item) || Platform.OS === 'ios');

const SUPPORT_EMAIL = 'oi@kash.app';

/** Perfil › Ajuda e suporte — perguntas frequentes e contato. */
export function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const showToast = useKashStore((s) => s.showToast);
  const [open, setOpen] = useState<number | null>(null);

  const contact = async (subject: string) => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else showToast(`Escreva pra ${SUPPORT_EMAIL}`);
    } catch {
      showToast(`Escreva pra ${SUPPORT_EMAIL}`);
    }
  };

  return (
    <Screen testID="help-screen" header={<PageHeader title="Ajuda e suporte" onBack={() => router.back()} testID="help" />}>
      <Text variant="section" style={{ marginTop: 6 }}>
        Perguntas frequentes
      </Text>
      <Card padding={0} style={{ marginTop: 12, overflow: 'hidden' }}>
        {FAQ_VISIBLE.map((item, i) => {
          const expanded = open === i;
          return (
            <Animated.View key={item.q} layout={LinearTransition.duration(200)} style={{ borderBottomWidth: i < FAQ_VISIBLE.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
              <Pressable
                onPress={() => setOpen(expanded ? null : i)}
                testID={`help-faq-${i}`}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={item.q}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16 }}
              >
                <Text variant="title" style={{ flex: 1 }}>
                  {item.q}
                </Text>
                <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
                  <Icon name="chevron-right" size={16} color={colors.muted} strokeWidth={2} />
                </View>
              </Pressable>
              {expanded ? (
                <Text variant="body" color="muted" style={{ paddingHorizontal: 16, paddingBottom: 15 }} testID={`help-faq-${i}-answer`}>
                  {item.a}
                </Text>
              ) : null}
            </Animated.View>
          );
        })}
      </Card>

      <Text variant="section" style={{ marginTop: 24 }}>
        Fale com a gente
      </Text>
      <Card padding={0} style={{ marginTop: 12, overflow: 'hidden' }}>
        <ListRow title="Enviar uma dúvida" subtitle={SUPPORT_EMAIL} onPress={() => contact('Dúvida sobre o Kash')} testID="help-contact" />
        <ListRow title="Reportar um problema" subtitle="Conta o que aconteceu e a gente resolve" onPress={() => contact('Problema no Kash')} divider={false} testID="help-report" />
      </Card>
      <Text variant="meta" color="muted" align="center" style={{ marginTop: 24 }}>
        Kash {APP_VERSION}
      </Text>
    </Screen>
  );
}
