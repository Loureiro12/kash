import { attachmentUrl, removeAttachment, toKashError, uploadAttachment } from '@kash/supabase-client';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable as RNPressable, View } from 'react-native';
import { Button, Icon, Text, radii, staticColors, useTheme } from '@/design-system';
import { supabase } from '@/services/supabase';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { choosePhotoSource, pickReceiptPhoto } from '../assistant/receiptPhoto';

/** comprovante guardado: maior que o da leitura pela IA, para continuar legível */
const ATTACHMENT_MAX_SIDE = 2000;

/**
 * Comprovante do lançamento (Storage, bucket privado `receipts`): anexar pela câmera/galeria, ver em
 * tela cheia, trocar ou remover. Só em lançamento já salvo (precisa do id do servidor).
 */
export function AttachmentField({ txId, path }: { txId: string; path?: string }) {
  const { colors } = useTheme();
  const setTxAttachment = useKashStore((s) => s.setTxAttachment);
  const showToast = useKashStore((s) => s.showToast);
  // link temporário do comprovante atual (guardado junto com o caminho a que pertence)
  const [link, setLink] = useState<{ path: string; url: string } | null>(null);
  const url = link && link.path === path ? link.url : null;
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    let alive = true;
    if (path) void attachmentUrl(supabase, path).then((u) => alive && setLink({ path, url: u })).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [path]);

  const attach = async () => {
    const source = await choosePhotoSource();
    if (!source) return;
    setBusy(true);
    try {
      const photo = await pickReceiptPhoto(source, { maxSide: ATTACHMENT_MAX_SIDE, compress: 0.8 });
      if (!photo) return;
      const saved = await uploadAttachment(supabase, txId, photo.image.data);
      setTxAttachment(txId, saved);
      track('attachment_added', {});
      showToast('Comprovante anexado');
    } catch (err) {
      showToast(toKashError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!path) return;
    Alert.alert('Remover o comprovante?', 'A foto é apagada; o lançamento continua.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void removeAttachment(supabase, txId, path)
            .then(() => {
              setTxAttachment(txId, null);
              showToast('Comprovante removido');
            })
            .catch((err) => showToast(toKashError(err).message))
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  if (!path) {
    return (
      <Button
        label={busy ? 'Enviando o comprovante…' : 'Anexar comprovante'}
        variant="surface"
        size="md"
        disabled={busy}
        onPress={() => void attach()}
        testID="attachment-add"
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} testID="attachment">
      <RNPressable onPress={() => url && setViewing(true)} accessibilityRole="imagebutton" accessibilityLabel="Ver o comprovante" testID="attachment-open">
        {url ? (
          <Image source={{ uri: url }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.surface2 }} accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 }}>
            <ActivityIndicator size="small" color={colors.muted} />
          </View>
        )}
      </RNPressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySemibold">Comprovante</Text>
        <Text variant="micro" color="muted">
          Guardado com o lançamento. Toque na foto para ver.
        </Text>
      </View>
      {busy ? <ActivityIndicator color={colors.muted} /> : null}
      <Button label="Trocar" variant="ghost" size="xs" fullWidth={false} disabled={busy} onPress={() => void attach()} testID="attachment-replace" />
      <Button label="Remover" variant="ghost" size="xs" fullWidth={false} disabled={busy} onPress={remove} testID="attachment-remove" />

      <Modal visible={viewing && !!url} transparent animationType="fade" onRequestClose={() => setViewing(false)}>
        <RNPressable style={{ flex: 1, backgroundColor: staticColors.ink, alignItems: 'center', justifyContent: 'center' }} onPress={() => setViewing(false)} accessibilityLabel="Fechar o comprovante" testID="attachment-viewer">
          {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '85%' }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          <View style={{ position: 'absolute', top: 60, right: 20 }}>
            <Icon name="close" size={26} color={staticColors.inkOnLight} />
          </View>
        </RNPressable>
      </Modal>
    </View>
  );
}
