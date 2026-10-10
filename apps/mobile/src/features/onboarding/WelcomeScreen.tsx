import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, MoneyInput, Pressable, ProgressBar, Screen, Text, useTheme } from '@/design-system';
import { formatBRL } from '@kash/domain';
import { useKashStore } from '@/store';

const STEPS = 3;
/** sugestões rápidas de limite mensal (iguais às da web) */
export const BUDGET_PRESETS = [1000, 2000, 3000, 5000] as const;

/**
 * Boas-vindas do primeiro acesso: 3 passos curtos (contas, cartão, limite). Usa os mesmos sheets
 * de cadastro; tudo é salvo na hora, então sair no meio não perde nada.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useKashStore((s) => s.user);
  const accounts = useKashStore((s) => s.accounts);
  const cards = useKashStore((s) => s.cards);
  const currentBudget = useKashStore((s) => s.settings.monthlyBudget);
  const openSheet = useKashStore((s) => s.openSheet);
  const finishOnboarding = useKashStore((s) => s.finishOnboarding);
  const showToast = useKashStore((s) => s.showToast);
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState(currentBudget);
  const firstName = user.name.split(' ')[0] || 'oi';

  const finish = (skip: boolean) => {
    finishOnboarding(skip ? undefined : budget);
    if (!skip) showToast(`Tudo pronto, ${firstName}! Agora lance seu primeiro gasto.`);
    router.replace('/');
  };

  const header = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="meta" color="muted" testID="welcome-step">
          Passo {step} de {STEPS}
        </Text>
        <Pressable onPress={() => finish(true)} testID="welcome-skip" accessibilityRole="button" accessibilityLabel="Pular as boas-vindas" hitSlop={10}>
          <Text variant="chip" color="accentText">
            Pular
          </Text>
        </Pressable>
      </View>
      <ProgressBar pct={(step / STEPS) * 100} height={6} />
    </View>
  );

  return (
    <Screen testID="welcome-screen" header={header} withTabBar={false}>
      {step === 1 ? (
        <View style={{ gap: 16, marginTop: 14 }}>
          <Text variant="chip" color="accentText">
            Boas-vindas, {firstName}!
          </Text>
          <Text variant="heroTitle">Onde fica seu dinheiro hoje?</Text>
          <Text variant="body" color="muted">
            Cadastre sua conta corrente, poupança ou carteira com o saldo de hoje. O Kash parte daí: cada gasto e entrada atualiza o saldo.
          </Text>
          {accounts.length > 0 ? (
            <Card padding={[4, 16]} testID="welcome-accounts">
              {accounts.map((a, i) => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < accounts.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="title" numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text variant="meta" color="muted" numberOfLines={1}>
                      {a.kind}
                    </Text>
                  </View>
                  <Text variant="value">{formatBRL(a.balance)}</Text>
                </View>
              ))}
            </Card>
          ) : null}
          <Button label={accounts.length ? '+ Outra conta' : '+ Adicionar conta'} variant={accounts.length ? 'secondary' : 'primary'} onPress={() => openSheet('addAccount')} testID="welcome-add-account" />
          {accounts.length ? <Button label="Continuar" onPress={() => setStep(2)} testID="welcome-next" /> : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 16, marginTop: 14 }}>
          <Text variant="heroTitle">Você usa cartão de crédito?</Text>
          <Text variant="body" color="muted">
            Com o cartão no Kash, você acompanha a fatura do mês, o limite disponível e as parcelas que ainda vão cair.
          </Text>
          {cards.length > 0 ? (
            <Card padding={[4, 16]} testID="welcome-cards">
              {cards.map((c, i) => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < cards.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="title" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text variant="meta" color="muted">
                      •••• {c.last4}
                    </Text>
                  </View>
                  <Text variant="meta" color="muted">
                    limite {formatBRL(c.limit)}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
          <Button label={cards.length ? '+ Outro cartão' : '+ Adicionar cartão'} variant={cards.length ? 'secondary' : 'primary'} onPress={() => openSheet('addCard')} testID="welcome-add-card" />
          <Button label={cards.length ? 'Continuar' : 'Não uso cartão'} variant={cards.length ? 'primary' : 'secondary'} onPress={() => setStep(3)} testID="welcome-next" />
          <Pressable onPress={() => setStep(1)} testID="welcome-back" accessibilityRole="button" accessibilityLabel="Voltar" style={{ alignSelf: 'flex-start' }}>
            <Text variant="chip" color="accentText">
              ← Voltar
            </Text>
          </Pressable>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 16, marginTop: 14 }}>
          <Text variant="heroTitle">Quanto você quer gastar por mês?</Text>
          <Text variant="body" color="muted">
            É o seu limite mensal. O Kash mostra quanto sobra até o fim do mês e quanto já está comprometido nos próximos. Dá pra mudar depois em Perfil.
          </Text>
          <MoneyInput label="Limite por mês" value={budget} onChangeValue={setBudget} testID="welcome-budget" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BUDGET_PRESETS.map((v) => (
              <Chip key={v} label={formatBRL(v).replace(',00', '')} selected={budget === v} onPress={() => setBudget(v)} testID={`welcome-budget-${v}`} />
            ))}
          </View>
          <Button label="Concluir" onPress={() => finish(false)} disabled={!(budget > 0)} testID="welcome-finish" haptic="medium" />
          <Pressable onPress={() => setStep(2)} testID="welcome-back" accessibilityRole="button" accessibilityLabel="Voltar" style={{ alignSelf: 'flex-start' }}>
            <Text variant="chip" color="accentText">
              ← Voltar
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
