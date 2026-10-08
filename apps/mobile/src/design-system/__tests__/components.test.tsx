import { fireEvent, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Button, Chip, Input, Keypad, MoneyInput, SegmentedControl, Switch, buildTheme, darkColors, lightColors, withAlpha } from '@/design-system';
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

describe('Input com senha', () => {
  it('o olho alterna entre ocultar e mostrar a senha, com rótulo acessível', async () => {
    await renderWithTheme(<Input label="Senha" value="segredo" secureTextEntry testID="pwd" />);
    expect(screen.getByTestId('pwd').props.secureTextEntry).toBe(true);
    const toggle = screen.getByTestId('pwd-toggle');
    expect(toggle).toHaveAccessibleName('Mostrar senha');
    await fireEvent.press(toggle);
    expect(screen.getByTestId('pwd').props.secureTextEntry).toBe(false);
    expect(screen.getByTestId('pwd-toggle')).toHaveAccessibleName('Ocultar senha');
    await fireEvent.press(screen.getByTestId('pwd-toggle'));
    expect(screen.getByTestId('pwd').props.secureTextEntry).toBe(true);
  });
  it('sem secureTextEntry não há olho', async () => {
    await renderWithTheme(<Input label="Nome" value="x" testID="plain" />);
    expect(screen.queryByTestId('plain-toggle')).toBeNull();
  });
});

describe('MoneyInput', () => {
  function Harness({ initial = 0, onValue, allowNegative }: { initial?: number; onValue?: (v: number) => void; allowNegative?: boolean }) {
    const [value, setValue] = useState(initial);
    return (
      <MoneyInput
        label="Valor"
        value={value}
        onChangeValue={(v) => {
          setValue(v);
          onValue?.(v);
        }}
        allowNegative={allowNegative}
        testID="money"
      />
    );
  }

  it('vazio mostra o placeholder; dígitos entram pelos centavos e o campo mostra reais', async () => {
    const seen: number[] = [];
    await renderWithTheme(<Harness onValue={(v) => seen.push(v)} />);
    const field = () => screen.getByTestId('money');
    expect(field().props.value).toBe('');
    expect(field().props.placeholder).toBe('R$ 0,00');
    expect(field().props.keyboardType).toBe('number-pad');
    await fireEvent.changeText(field(), '1');
    expect(field().props.value).toBe('R$ 0,01');
    await fireEvent.changeText(field(), 'R$ 0,012');
    await fireEvent.changeText(field(), 'R$ 0,1250');
    await fireEvent.changeText(field(), 'R$ 12,500');
    expect(field().props.value).toBe('R$ 125,00');
    await fireEvent.changeText(field(), 'R$ 125,0');
    expect(field().props.value).toBe('R$ 12,50');
    expect(seen.at(-1)).toBe(12.5);
  });

  it('valor inicial vem formatado e o cursor fica no fim', async () => {
    await renderWithTheme(<Harness initial={2500} />);
    expect(screen.getByTestId('money').props.value).toBe('R$ 2.500,00');
    expect(screen.getByTestId('money').props.selection).toEqual({ start: 11, end: 11 });
  });

  it('com allowNegative, o ± troca o sinal e digitar mantém o sinal', async () => {
    await renderWithTheme(<Harness initial={-50} allowNegative />);
    const field = () => screen.getByTestId('money');
    expect(field().props.value).toBe('-R$ 50,00');
    await fireEvent.changeText(field(), '-R$ 50,001');
    expect(field().props.value).toBe('-R$ 500,01');
    await fireEvent.press(screen.getByTestId('money-sign'));
    expect(field().props.value).toBe('R$ 500,01');
    expect(screen.getByTestId('money-sign')).toHaveAccessibleName('Tornar negativo');
  });

  it('sem allowNegative não há botão de sinal', async () => {
    await renderWithTheme(<Harness />);
    expect(screen.queryByTestId('money-sign')).toBeNull();
  });
});
