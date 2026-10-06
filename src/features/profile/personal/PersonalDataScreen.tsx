import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { Avatar, Button, Input, PageHeader, Screen, Text } from '@/design-system';
import { useKashStore } from '@/store';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Perfil › Dados pessoais — nome, e-mail e celular. */
export function PersonalDataScreen() {
  const router = useRouter();
  const user = useKashStore((s) => s.user);
  const updateUser = useKashStore((s) => s.updateUser);
  const showToast = useKashStore((s) => s.showToast);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const changed = name.trim() !== user.name || email.trim() !== user.email || phone.trim() !== user.phone;
  const valid = name.trim().length >= 2 && isEmail(email);
  const canSave = changed && valid;

  const onSave = () => {
    if (!canSave) return;
    updateUser({ name, email, phone });
    showToast('Dados atualizados');
    router.back();
  };

  return (
    <Screen testID="personal-screen" header={<PageHeader title="Dados pessoais" onBack={() => router.back()} testID="personal" />}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 10 }}>
        <Avatar initial={(name.trim()[0] ?? user.name[0]) || 'K'} size={56} />
        <Text variant="meta" color="muted">
          A inicial do seu nome vira seu avatar.
        </Text>
      </View>
      <View style={{ gap: 14, marginTop: 24 }}>
        <Input label="Nome" height={52} value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()} testID="personal-name" />
        <Input
          ref={emailRef}
          label="E-mail"
          height={52}
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => phoneRef.current?.focus()}
          testID="personal-email"
        />
        {email.length > 0 && !isEmail(email) ? (
          <Text variant="meta" color="neg" testID="personal-email-error">
            Esse e-mail não parece válido.
          </Text>
        ) : null}
        <Input ref={phoneRef} label="Celular" height={52} value={phone} onChangeText={setPhone} placeholder="(11) 90000-0000" keyboardType="phone-pad" returnKeyType="done" testID="personal-phone" />
      </View>
      <Button label="Salvar alterações" onPress={onSave} disabled={!canSave} testID="personal-save" style={{ marginTop: 28 }} haptic="medium" />
    </Screen>
  );
}
