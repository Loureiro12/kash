import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, CheckCircle, IconButton, Input, Pressable, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';
import { passwordStrength, validateSignup } from './validation';

/** Cadastro — nome, e-mail, senha com força, aceite dos termos. */
export function SignupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signUp = useKashStore((s) => s.signUp);
  const request = useKashStore((s) => s.authRequest);
  const resetAuthRequest = useKashStore((s) => s.resetAuthRequest);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateSignup>>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const loading = request.status === 'loading';
  const strength = passwordStrength(password);

  useEffect(() => () => resetAuthRequest(), [resetAuthRequest]);

  const submit = () => {
    const next = validateSignup(name, email, password, accepted);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    void signUp({ name, email, password });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        testID="signup-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 24 }}
      >
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Voltar" testID="signup-back" />
        <Text variant="heroTitle" style={{ marginTop: 26 }}>
          Criar conta
        </Text>
        <Text variant="subtitle" color="muted" style={{ marginTop: 6 }}>
          Grátis, sem cartão e sem acessar seu banco.
        </Text>

        <View style={{ gap: 12, marginTop: 28 }}>
          <Input testID="signup-name" label="Nome" height={52} placeholder="Como quer ser chamado" value={name} onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }} error={errors.name} autoCapitalize="words" textContentType="name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()} />
          <Input ref={emailRef} testID="signup-email" label="E-mail" height={52} placeholder="voce@email.com" value={email} onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }} error={errors.email} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordRef.current?.focus()} />
          <Input ref={passwordRef} testID="signup-password" label="Senha" height={52} placeholder="Pelo menos 6 caracteres" value={password} onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }} error={errors.password} secureTextEntry textContentType="oneTimeCode" autoComplete="off" returnKeyType="done" onSubmitEditing={submit} />
          {password.length > 0 ? (
            <View style={{ gap: 6 }} testID="signup-strength">
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= strength.score ? (strength.score <= 1 ? colors.neg : colors.accent) : colors.surface2 }} />
                ))}
              </View>
              <Text variant="micro" color="muted">
                {strength.label}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => { setAccepted((v) => !v); if (errors.terms) setErrors((e) => ({ ...e, terms: undefined })); }}
            testID="signup-terms"
            haptic="selection"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: errors.terms ? colors.neg : colors.line, marginTop: 4 }}
          >
            <CheckCircle checked={accepted} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Li e aceito os Termos de uso e a Política de privacidade
            </Text>
          </Pressable>
          {errors.terms ? (
            <Text variant="meta" color="neg" testID="signup-terms-error">
              {errors.terms}
            </Text>
          ) : null}
          {request.status === 'error' && request.error ? (
            <View accessibilityRole="alert" testID="signup-error" style={{ padding: 14, borderRadius: 14, backgroundColor: colors.negSoft }}>
              <Text variant="bodyMedium" color="neg">
                {request.error}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        <Button label="Criar conta" onPress={submit} loading={loading} testID="signup-submit" haptic="medium" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
