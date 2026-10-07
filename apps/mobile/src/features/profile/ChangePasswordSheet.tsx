import React, { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { BottomSheet, Button, Input, Text } from '@/design-system';
import { useKashStore } from '@/store';

const MIN_LENGTH = 8;

/** Sheet — Alterar senha: confirma a senha atual no servidor e grava a nova. */
export function ChangePasswordSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'changePassword');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <ChangePasswordForm key={nonce} visible={visible} onClose={closeSheet} />;
}

function ChangePasswordForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const showToast = useKashStore((s) => s.showToast);
  const changePassword = useKashStore((s) => s.changePassword);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSave = current.length > 0 && next.length >= MIN_LENGTH && confirm === next;

  const onSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setServerError(null);
    const error = await changePassword(current, next);
    setSaving(false);
    if (error) {
      setServerError(error);
      return;
    }
    onClose();
    showToast('Senha alterada');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Alterar senha"
      testID="sheet-change-password"
      footer={<Button label="Salvar nova senha" onPress={() => void onSave()} disabled={!canSave} loading={saving} testID="cp-save" haptic="medium" />}
    >
      <Input label="Senha atual" labelSize="sm" value={current} onChangeText={(v) => { setCurrent(v); setServerError(null); }} secureTextEntry textContentType="password" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => nextRef.current?.focus()} testID="cp-current" />
      <Input
        ref={nextRef}
        label={`Nova senha (mín. ${MIN_LENGTH} caracteres)`}
        labelSize="sm"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        textContentType="oneTimeCode"
        autoComplete="off"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        testID="cp-new"
      />
      <Input ref={confirmRef} label="Confirmar nova senha" labelSize="sm" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="oneTimeCode" autoComplete="off" returnKeyType="done" testID="cp-confirm" />
      {serverError ? (
        <Text variant="meta" color="neg" testID="cp-error">
          {serverError}
        </Text>
      ) : tooShort ? (
        <Text variant="meta" color="neg" testID="cp-error">
          A nova senha precisa ter pelo menos {MIN_LENGTH} caracteres.
        </Text>
      ) : mismatch ? (
        <Text variant="meta" color="neg" testID="cp-error">
          As senhas não conferem.
        </Text>
      ) : null}
    </BottomSheet>
  );
}
