import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura do teclado que a tela precisa reservar embaixo, só no Android.
 * O app roda "edge-to-edge" (padrão do SDK 57): o Android não encolhe a janela quando o teclado abre,
 * então quem tem campo de texto soma este valor ao espaço de baixo. No iOS o `KeyboardAvoidingView`
 * já cuida disso e o valor é sempre 0.
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
