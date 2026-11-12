import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, Icon, Input, Text, useTheme } from '@/design-system';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { useExportData } from './useExportData';

/** palavra que a pessoa digita para liberar o botão */
export const RESET_WORD = 'ZERAR';

const ERASED = 'Contas, cartões e faturas · todos os lançamentos e parcelados · contas fixas e metas · importações e nomes aprendidos.';
const KEPT = 'Seu login, nome, celular, tema e lembretes. As categorias e o limite mensal voltam ao padrão.';

/** Sheet — Zerar meus dados (recomeçar do zero com o mesmo login). */
export function ResetDataSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'resetData');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <ResetDataForm key={nonce} visible={visible} onCancel={closeSheet} />;
}

function ResetDataForm({ visible, onCancel }: { visible: boolean; onCancel: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const resetData = useKashStore((s) => s.resetData);
  const { exportData, exporting } = useExportData();
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmed = word.trim().toUpperCase() === RESET_WORD;

  const confirm = async () => {
    setBusy(true);
    const ok = await resetData();
    if (!ok) {
      setBusy(false);
      return;
    }
    track('reset_data', {});
    // no Início, sem contas, as boas-vindas aparecem de novo
    router.navigate('/');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onCancel}
      testID="sheet-reset-data"
      footer={
        <>
          <Button label="Zerar meus dados" variant="danger" disabled={!confirmed} loading={busy} onPress={() => void confirm()} testID="reset-confirm" haptic="medium" />
          <Button label="Cancelar" variant="ghost" size="md" onPress={onCancel} testID="reset-cancel" style={{ height: 50 }} />
        </>
      }
    >
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.negSoft, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
        <Icon name="trash" size={24} color={colors.neg} />
      </View>
      <Text variant="pageTitle">Zerar seus dados?</Text>
      <Text variant="body" color="muted">
        Você continua com a mesma conta, mas recomeça do zero. Não dá pra desfazer.
      </Text>
      <View style={{ gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} testID="reset-summary">
        <Text variant="bodySemibold">O que é apagado</Text>
        <Text variant="meta" color="muted">
          {ERASED}
        </Text>
        <Text variant="bodySemibold" style={{ marginTop: 8 }}>
          O que fica
        </Text>
        <Text variant="meta" color="muted">
          {KEPT}
        </Text>
      </View>
      <Button label={exporting ? 'Preparando o arquivo…' : 'Exportar meus dados antes'} variant="secondary" size="md" disabled={exporting} onPress={() => void exportData()} testID="reset-export" />
      <Input
        label={`Para confirmar, digite ${RESET_WORD}`}
        value={word}
        onChangeText={setWord}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        placeholder={RESET_WORD}
        testID="reset-word"
        accessibilityLabel={`Digite ${RESET_WORD} para confirmar`}
      />
    </BottomSheet>
  );
}
