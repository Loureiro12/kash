import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, IconButton, Input, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';
import { isValidEmail } from './validation';

/** Esqueci a senha — pede o e-mail e confirma o envio do link (simulado). */
export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const request = useKashStore((s) => s.authRequest);
  const requestPasswordReset = useKashStore((s) => s.requestPasswordReset);
  const resetAuthRequest = useKashStore((s) => s.resetAuthRequest);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView testID="forgot-screen" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 24 }}>
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Voltar" testID="forgot-back" />
        {sentTo ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }} testID="forgot-sent">
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.posSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Icon name="check" size={30} color={colors.accentText} strokeWidth={2.6} />
            </View>
            <Text variant="pageTitle" align="center">
              E-mail enviado
            </Text>
            <Text variant="body" color="muted" align="center" style={{ maxWidth: 300 }}>
              Se {sentTo} tiver uma conta no Kash, você recebe um link pra criar uma senha nova. Vale por 30 minutos.
            </Text>
            <Button label="Reenviar e-mail" variant="secondary" size="md" fullWidth={false} onPress={() => void requestPasswordReset(sentTo)} loading={loading} style={{ marginTop: 14 }} testID="forgot-resend" />
          </View>
        ) : (
          <>
            <Text variant="heroTitle" style={{ marginTop: 26 }}>
              Esqueceu a senha?
            </Text>
            <Text variant="subtitle" color="muted" style={{ marginTop: 6 }}>
              A gente manda um link pra você criar uma nova.
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
          <Button label="Voltar pro login" onPress={() => router.back()} testID="forgot-done" />
        ) : (
          <Button label="Enviar link" onPress={() => void submit()} loading={loading} testID="forgot-submit" haptic="medium" />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
