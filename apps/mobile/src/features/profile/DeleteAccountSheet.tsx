import React, { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, CheckCircle, Icon, Pressable, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';

/** Sheet — Confirmar exclusão da conta. */
export function DeleteAccountSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'deleteAccount');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <DeleteAccountForm key={nonce} visible={visible} onCancel={closeSheet} />;
}

function DeleteAccountForm({ visible, onCancel }: { visible: boolean; onCancel: () => void }) {
  const { colors } = useTheme();
  const deleteAccount = useKashStore((s) => s.deleteAccount);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <BottomSheet
      visible={visible}
      onClose={onCancel}
      testID="sheet-delete-account"
      footer={
        <>
          <Button
        label="Excluir definitivamente"
        variant="danger"
        disabled={!confirmed}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          const ok = await deleteAccount();
          if (!ok) setBusy(false);
        }}
        testID="delete-confirm"
        haptic="medium"
      />
          <Button label="Cancelar" variant="ghost" size="md" onPress={onCancel} testID="delete-cancel" style={{ height: 50 }} />
        </>
      }
    >
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.negSoft, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
        <Icon name="trash" size={24} color={colors.neg} />
      </View>
      <Text variant="pageTitle">Excluir sua conta?</Text>
      <Text variant="body" color="muted">
        Isso apaga para sempre seus lançamentos, cartões, contas fixas e metas. Não dá pra desfazer.
      </Text>
      <Pressable
        onPress={() => setConfirmed((v) => !v)}
        testID="delete-confirm-checkbox"
        haptic="selection"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginTop: 4 }}
      >
        <CheckCircle checked={confirmed} shape="square" />
        <Text variant="bodyMedium" style={{ flex: 1 }}>
          Entendi que vou perder todos os meus dados
        </Text>
      </Pressable>
    </BottomSheet>
  );
}
