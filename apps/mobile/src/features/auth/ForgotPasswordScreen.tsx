import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, IconButton, Input, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';
import { RECOVERY_CODE_PATTERN } from '@kash/supabase-client';
import { isValidEmail } from './validation';

/** Esqueci a senha — pede o e-mail, envia um código e troca o código por uma sessão de recuperação. */
export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const request = useKashStore((s) => s.authRequest);
  const requestPasswordReset = useKashStore((s) => s.requestPasswordReset);
  const verifyRecoveryCode = useKashStore((s) => s.verifyRecoveryCode);
  const showToast = useKashStore((s) => s.showToast);
  const resetAuthRequest = useKashStore((s) => s.resetAuthRequest);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const digits = code.replace(/\D/g, '');
  const codeReady = RECOVERY_CODE_PATTERN.test(digits);
  const loading = request.status === 'loading';

  useEffect(() => () => resetAuthRequest(), [resetAuthRequest]);

  const submit = async () => {
    if (!isValidEmail(email)) {
      setError('Esse e-mail não parece válido.');
      return;
    }
    setError(null);
    const ok = await requestPasswordReset(email);
    if (ok) setSentTo(email.trim());
  };

  // código certo → estado `recovery`, e a navegação protegida abre a tela de nova senha
  const verify = async () => {
    if (!sentTo || !codeReady) return;
    await verifyRecoveryCode(sentTo, digits);
  };

  const resend = async () => {
    if (!sentTo) return;
    setCode('');
    if (await requestPasswordReset(sentTo)) showToast('Enviamos um código novo');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView testID="forgot-screen" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 24 }}>
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Voltar" testID="forgot-back" />
        {sentTo ? (
          <View style={{ flex: 1 }} testID="forgot-sent">
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.posSoft, alignItems: 'center', justifyContent: 'center', marginTop: 26 }}>
              <Icon name="check" size={26} color={colors.accentText} strokeWidth={2.6} />
            </View>
            <Text variant="heroTitle" style={{ marginTop: 18 }}>
              Confira seu e-mail
            </Text>
            <Text variant="subtitle" color="muted" style={{ marginTop: 6 }}>
              Se {sentTo} tiver uma conta no Kash, chega um código pra você criar uma senha nova. Ele vale por 1 hora.
            </Text>
            <View style={{ gap: 12, marginTop: 28 }}>
              <Input
                testID="forgot-code"
                label="Código"
                height={52}
                placeholder="000000"
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/\D/g, '').slice(0, 8));
                  if (request.status === 'error') resetAuthRequest();
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={() => void verify()}
                style={{ letterSpacing: 6, fontSize: 20 }}
                accessibilityHint="Código numérico enviado por e-mail"
              />
              {request.status === 'error' && request.error ? (
                <View accessibilityRole="alert" testID="forgot-error" style={{ padding: 14, borderRadius: 14, backgroundColor: colors.negSoft }}>
                  <Text variant="bodyMedium" color="neg">
                    {request.error}
                  </Text>
                </View>
              ) : null}
              <Button label="Não chegou? Reenviar código" variant="secondary" size="md" fullWidth={false} onPress={() => void resend()} disabled={loading} style={{ alignSelf: 'flex-start' }} testID="forgot-resend" />
            </View>
            <View style={{ flex: 1 }} />
          </View>
        ) : (
          <>
            <Text variant="heroTitle" style={{ marginTop: 26 }}>
              Esqueceu a senha?
            </Text>
            <Text variant="subtitle" color="muted" style={{ marginTop: 6 }}>
              A gente manda um código pro seu e-mail pra você criar uma nova.
            </Text>
            <View style={{ gap: 12, marginTop: 28 }}>
              <Input testID="forgot-email" label="E-mail" height={52} placeholder="voce@email.com" value={email} onChangeText={(v) => { setEmail(v); setError(null); }} error={error} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={() => void submit()} />
              {request.status === 'error' && request.error ? (
                <View accessibilityRole="alert" testID="forgot-error" style={{ padding: 14, borderRadius: 14, backgroundColor: colors.negSoft }}>
                  <Text variant="bodyMedium" color="neg">
                    {request.error}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1 }} />
          </>
        )}
        {sentTo ? (
          <View style={{ gap: 10 }}>
            <Button label="Confirmar código" onPress={() => void verify()} disabled={!codeReady} loading={loading} testID="forgot-verify" haptic="medium" />
            <Button label="Voltar pro login" variant="secondary" onPress={() => router.back()} testID="forgot-done" />
          </View>
        ) : (
          <Button label="Enviar código" onPress={() => void submit()} loading={loading} testID="forgot-submit" haptic="medium" />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
