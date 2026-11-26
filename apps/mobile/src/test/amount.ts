import { fireEvent, screen } from '@testing-library/react-native';

/**
 * Digita no AmountField como no teclado numérico: cada item acrescenta dígitos ao texto atual
 * ('5', '00') ou apaga o último ('del').
 */
export async function typeAmount(testID: string, keys: string[]): Promise<void> {
  for (const k of keys) {
    const input = screen.getByTestId(`${testID}-input`);
    const current: string = input.props.value ?? '';
    await fireEvent.changeText(input, k === 'del' ? current.slice(0, -1) : current + k);
  }
}
