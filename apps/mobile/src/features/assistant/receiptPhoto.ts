import type { AssistantImage } from '@kash/supabase-client';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export type PhotoSource = 'camera' | 'galeria';

export interface ReceiptPhoto {
  /** arquivo local (só para mostrar a miniatura nesta sessão) */
  uri: string;
  image: AssistantImage;
}

/**
 * Lado maior da foto enviada: o Claude reduz acima disso de qualquer jeito, então mandar maior
 * só gasta dados e tempo. Cupom fiscal comprido continua legível.
 */
export const RECEIPT_MAX_SIDE = 1568;

function askSettings(what: string) {
  Alert.alert(`Sem acesso ${what}`, `Para lançar pela foto, permita o acesso ${what} do Kash nos Ajustes.`, [
    { text: 'Agora não', style: 'cancel' },
    { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
  ]);
}

/**
 * Tira ou escolhe a foto de um comprovante e prepara para enviar: reduz para no máximo
 * 1568 px de lado e JPEG 70% (fica em ~200–400 KB). Sem EXIF (não leva localização).
 * Devolve null se a pessoa cancelar ou negar a permissão.
 */
export async function pickReceiptPhoto(source: PhotoSource): Promise<ReceiptPhoto | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      askSettings('à câmera');
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  const w = asset.width || RECEIPT_MAX_SIDE;
  const h = asset.height || RECEIPT_MAX_SIDE;
  const scale = Math.min(1, RECEIPT_MAX_SIDE / Math.max(w, h));
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (scale < 1) ctx.resize(w >= h ? { width: Math.round(w * scale) } : { height: Math.round(h * scale) });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) return null;
  return { uri: saved.uri, image: { mediaType: 'image/jpeg', data: saved.base64 } };
}

/** "Tirar foto" ou "Escolher da galeria" (cancelar → null) */
export function choosePhotoSource(): Promise<PhotoSource | null> {
  return new Promise((resolve) => {
    Alert.alert('Foto do comprovante', 'Nota fiscal, cupom, recibo ou comprovante de Pix/cartão.', [
      { text: 'Tirar foto', onPress: () => resolve('camera') },
      { text: 'Escolher da galeria', onPress: () => resolve('galeria') },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
