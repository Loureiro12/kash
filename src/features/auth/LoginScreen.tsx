import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Pressable, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';

/** Tela 2 — Login. Ambos os botões levam ao app (sem auth real nesta fase). */
export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const login = useKashStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

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
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Input
            ref={passwordRef}
            testID="login-password"
            label="Senha"
            height={52}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={login}
          />
          <Pressable accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'flex-end' }} testID="login-forgot">
            <Text variant="bodyMedium" color="accentText">
              Esqueci a senha
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        <Button label="Entrar" onPress={login} testID="login-submit" haptic="medium" />
        <Button label="Criar conta grátis" variant="secondary" size="md" onPress={login} testID="login-signup" style={{ marginTop: 10 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
