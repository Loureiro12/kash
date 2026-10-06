import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Button, Chip, Keypad, SegmentedControl, Switch, buildTheme, darkColors, lightColors, withAlpha } from '@/design-system';
import { renderWithTheme } from '@/test/render';

describe('tema', () => {
  it('buildTheme expõe cores por modo', () => {
    expect(buildTheme('dark').colors).toBe(darkColors);
    expect(buildTheme('light').colors).toBe(lightColors);
    expect(buildTheme('light').isDark).toBe(false);
  });
  it('withAlpha converte hex', () => {
    expect(withAlpha('#FFB86B', 0.15)).toBe('rgba(255,184,107,0.15)');
  });
});

describe('Button', () => {
  it('dispara onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar" onPress={onPress} testID="btn" />);
    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('não dispara quando disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar" onPress={onPress} testID="btn" disabled />);
    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn')).toBeDisabled();
  });
});

describe('Keypad', () => {
  it('emite teclas e apagar', async () => {
    const onKey = jest.fn();
    await renderWithTheme(<Keypad onKey={onKey} />);
    await fireEvent.press(screen.getByTestId('key-7'));
    await fireEvent.press(screen.getByTestId('key-00'));
    await fireEvent.press(screen.getByTestId('key-del'));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(['7', '00', 'del']);
  });
});

describe('Chip / SegmentedControl / Switch', () => {
  it('Chip reflete seleção', async () => {
    await renderWithTheme(<Chip label="Comida" selected testID="chip" />);
    expect(screen.getByTestId('chip')).toBeSelected();
  });
  it('SegmentedControl troca de valor', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SegmentedControl
        value="bank"
        onChange={onChange}
        options={[
          { value: 'bank', label: 'Bancárias', testID: 'seg-bank' },
          { value: 'bills', label: 'Fixas', testID: 'seg-bills' },
        ]}
      />,
    );
    await fireEvent.press(screen.getByTestId('seg-bills'));
    expect(onChange).toHaveBeenCalledWith('bills');
  });
  it('Switch alterna', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Switch value={false} onValueChange={onChange} testID="sw" />);
    await fireEvent.press(screen.getByTestId('sw'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
