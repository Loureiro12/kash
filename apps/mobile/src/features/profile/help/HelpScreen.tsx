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
  {
    q: 'Como coloco o Kash na tela inicial ou na tela bloqueada?',
    a: 'Toque e segure num espaço vazio da tela inicial, toque em Editar › Adicionar widget e procure Kash. O widget pequeno abre o assistente; o médio tem Perguntar e Lançar gasto. Na tela bloqueada: toque e segure nela, Personalizar › Tela Bloqueada › Adicionar widgets › Kash. O widget não mostra valores.',
    ios: true,
  },
  {
    q: 'Como divido as finanças com meu parceiro ou parceira?',
    a: 'Em Perfil › Conta compartilhada, toque em “Convidar alguém” e mande o convite. A outra pessoa abre o link (ou digita o código) no Kash dela. Depois, ao criar uma conta, cartão, conta fixa ou meta, ligue “Compartilhar com…”: os dois veem e lançam nela, e cada lançamento avisa a outra pessoa. Cada um escolhe o que vê (tudo, o seu e o do casal, ou só o do casal) e se mostra também o pessoal, só para leitura.',
  },
  {
    q: 'Dá pra lançar falando com a Siri?',
    a: 'Dá. Diga “E aí Siri, lançar no Kash”; ela pergunta o que lançar e você responde, por exemplo, “gastei 30 no Uber no Nubank”. O Kash abre direto na confirmação, com valor, categoria, cartão e data: é só tocar em Lançar. Também funciona digitando para a Siri e no app Atalhos. Usa o assistente (precisa autorizar a IA na primeira vez).',
    ios: true,
  },
  {
    q: 'Como separo os gastos de uma viagem?',
    a: 'Use uma tag: ao lançar, toque em “+ Tag” e escreva, por exemplo, “Viagem Floripa”. Em Relatório › Tags e modo viagem você vê o total, por dia e por categoria. Ligando o modo viagem, todo lançamento novo já vem com a tag até o dia que você escolher.',
  },
  {
    q: 'Como anoto quem me deve?',
    a: 'Em Contas › A receber, toque em “+ Anotar”: quem, quanto, do quê e quando cobrar. No dia, o Kash te lembra; “Cobrar” abre uma mensagem pronta para mandar pelo WhatsApp. Para dividir uma conta já lançada, abra o lançamento e toque em “Dividir com amigos”. Quando a pessoa pagar, toque em “Recebi” para lançar a entrada na conta.',
  },
  {
    q: 'Posso guardar a foto do comprovante no lançamento?',
    a: 'Pode. Abra o lançamento e toque em “Anexar comprovante” (câmera ou galeria). A foto fica guardada num espaço privado da sua conta; toque nela para ver, trocar ou remover.',
  },
  {
    q: 'O que é a retrospectiva do mês?',
    a: 'No começo de cada mês, o Kash mostra o seu mês anterior: quanto entrou e saiu, quanto sobrou, onde mais gastou e a comparação com o mês antes dele. Dá pra compartilhar como imagem, com ou sem os valores. Fica no Início nos primeiros dias do mês e no Relatório, ao ver um mês que já passou.',
  },
  {
    q: 'O widget mostra meus gastos?',
    a: 'O widget “Gastos do Kash” mostra quanto saiu hoje e quanto sobra no limite do mês, com atalhos para lançar e perguntar. Ele atualiza sempre que você abre o app ou lança algo. Com “ocultar valores” ligado, aparecem pontinhos; na tela bloqueada do iPhone, os valores só aparecem desbloqueado. No Android, segure a tela inicial › Widgets › Kash.',
  },
  {
    q: 'O Kash encontra minhas assinaturas?',
    a: 'Encontra. Quando a mesma cobrança aparece todo mês (streaming, academia, apps), em dias e valores parecidos, ela aparece em Contas › Fixas com o custo no ano. Toque em "Virar conta fixa" para receber lembrete e ver na previsão; se a deste mês já foi lançada, a conta já entra como paga, sem lançar de novo. Se o preço subir, o Kash avisa.',
  },
  {
    q: 'Que alertas de gastos o Kash manda?',
    a: 'Com as notificações permitidas, o Kash avisa quando você chega a 80% do limite do mês e quando passa dele (e do limite do cartão, se ele for dividido), quando o ritmo do mês indica que você vai passar do limite e quando uma categoria fica bem acima do normal na semana. No domingo às 19h chega o resumo da semana. Cada aviso vem uma vez só. Tudo é calculado no seu celular; ligue ou desligue em Perfil › Preferências.',
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
