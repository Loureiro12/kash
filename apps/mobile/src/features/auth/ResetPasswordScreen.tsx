import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';
import { MIN_PASSWORD, passwordStrength } from './validation';

/** Nova senha — aberta pelo link do e-mail de recuperação (estado de auth `recovery`). */
export function ResetPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const request = useKashStore((s) => s.authRequest);
  const complete = useKashStore((s) => s.completePasswordRecovery);
  const cancel = useKashStore((s) => s.cancelPasswordRecovery);
  const resetAuthRequest = useKashStore((s) => s.resetAuthRequest);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<TextInput>(null);
  const loading = request.status === 'loading';
  const strength = passwordStrength(password);

  useEffect(() => () => resetAuthRequest(), [resetAuthRequest]);

  const submit = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(`Pelo menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (confirm !== password) {
      setError('As senhas não conferem.');
      return;
    }
    setError(null);
    await complete(password);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView testID="reset-screen" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 24 }}>
        <Text variant="heroTitle" style={{ marginTop: 26 }}>
          Crie uma nova senha
        </Text>
        <Text variant="subtitle" color="muted" style={{ marginTop: 6 }}>
          Ela passa a valer agora, em todos os seus aparelhos.
        </Text>
        <View style={{ gap: 12, marginTop: 28 }}>
          <Input
            testID="reset-password"
            label={`Nova senha (mín. ${MIN_PASSWORD} caracteres)`}
            height={52}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            secureTextEntry
            textContentType="oneTimeCode"
            autoComplete="off"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          {strength.label ? (
            <Text variant="meta" color={strength.score >= 2 ? 'pos' : 'muted'} testID="reset-strength">
              {strength.label}
            </Text>
          ) : null}
          <Input
            ref={confirmRef}
            testID="reset-confirm"
            label="Confirmar nova senha"
            height={52}
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              setError(null);
            }}
            secureTextEntry
            textContentType="oneTimeCode"
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            error={error}
          />
          {request.status === 'error' && request.error ? (
            <View accessibilityRole="alert" testID="reset-error" style={{ padding: 14, borderRadius: 14, backgroundColor: colors.negSoft }}>
              <Text variant="bodyMedium" color="neg">
                {request.error}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Button label="Salvar nova senha" onPress={() => void submit()} loading={loading} testID="reset-submit" haptic="medium" />
          <Button label="Voltar pro login" variant="secondary" onPress={() => void cancel()} disabled={loading} testID="reset-cancel" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
