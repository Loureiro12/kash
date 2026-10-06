import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Pressable, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';
import { validateLogin } from './validation';

/** Tela 2 — Login com validação, carregando e erros (auth simulada nesta fase). */
export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signIn = useKashStore((s) => s.signIn);
  const request = useKashStore((s) => s.authRequest);
  const resetAuthRequest = useKashStore((s) => s.resetAuthRequest);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const passwordRef = useRef<TextInput>(null);
  const loading = request.status === 'loading';

  useEffect(() => () => resetAuthRequest(), [resetAuthRequest]);

  const submit = async () => {
    const next = validateLogin(email, password);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const ok = await signIn({ email, password });
    // credencial inválida: limpa só a senha pra nova tentativa
    if (!ok) setPassword('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        testID="login-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 56, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 24 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="pageTitle" color="onAccent">
            K
          </Text>
        </View>
        <Text variant="heroTitle" style={{ marginTop: 26 }}>
          Bem-vindo de volta
        </Text>
        <Text variant="subtitle" color="muted" style={{ marginTop: 6 }}>
          Entre pra ver como anda sua grana.
        </Text>

        <View style={{ gap: 12, marginTop: 32 }}>
          <Input
            testID="login-email"
            label="E-mail ou celular"
            height={52}
            placeholder="voce@email.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
           
          />
          <Input
            ref={passwordRef}
            testID="login-password"
            label="Senha"
            height={52}
            placeholder="••••••••"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
           
          />
          <Pressable accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'flex-end' }} testID="login-forgot" onPress={() => router.push('/forgot')}>
            <Text variant="bodyMedium" color="accentText">
              Esqueci a senha
            </Text>
          </Pressable>
          {request.status === 'error' && request.error ? (
            <View accessibilityRole="alert" testID="login-error" style={{ padding: 14, borderRadius: 14, backgroundColor: colors.negSoft }}>
              <Text variant="bodyMedium" color="neg">
                {request.error}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1 }} />

        <Button label="Entrar" onPress={() => void submit()} loading={loading} testID="login-submit" haptic="medium" />
        <Button label="Criar conta grátis" variant="secondary" size="md" onPress={() => router.push('/signup')} disabled={loading} testID="login-signup" style={{ marginTop: 10 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
