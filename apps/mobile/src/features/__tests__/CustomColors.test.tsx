import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { AddAccountSheet } from '@/features/accounts/AddAccountSheet';
import { AddCardSheet } from '@/features/cards/AddCardSheet';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

beforeEach(() => {
  useKashStore.getState().reset();
});

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

async function pickCustom(prefix: 'card' | 'account', hex: string) {
  await press(`add-${prefix}-color-custom`);
  expect(screen.getByTestId(`${prefix}-color-picker`)).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId(`${prefix}-color-picker-hex`), hex);
  await press(`${prefix}-color-picker-confirm`);
}

describe('cor personalizada do cartão', () => {
  it('escolhe pelo código, marca o "Personalizar" e grava a cor', async () => {
    await act(async () => useKashStore.getState().openSheet('addCard'));
    await renderWithTheme(<AddCardSheet />);
    await fireEvent.changeText(screen.getByTestId('add-card-name'), 'Cartão roxo');
    await fireEvent.changeText(screen.getByTestId('add-card-last4'), '1234');
    await fireEvent.changeText(screen.getByTestId('add-card-limit'), '100000');

    await pickCustom('card', '#1a237e');
    expect(screen.queryByTestId('card-color-picker')).toBeNull();
    expect(screen.getByTestId('add-card-color-custom')).toBeSelected();
    expect(screen.getByTestId('add-card-color-green')).not.toBeSelected();

    await press('add-card-save');
    expect(useKashStore.getState().cards.at(-1)).toMatchObject({ name: 'Cartão roxo', color: '#1A237E' });
  });

  it('código inválido não pode ser usado; cancelar mantém a cor anterior', async () => {
    await act(async () => useKashStore.getState().openSheet('addCard'));
    await renderWithTheme(<AddCardSheet />);
    await press('add-card-color-custom');
    await fireEvent.changeText(screen.getByTestId('card-color-picker-hex'), '#12');
    expect(screen.getByText('Use o formato #RRGGBB')).toBeOnTheScreen();
    expect(screen.getByTestId('card-color-picker-confirm')).toBeDisabled();
    await press('card-color-picker-cancel');
    expect(screen.getByTestId('add-card-color-green')).toBeSelected();
  });

  it('editar um cartão com cor própria e voltar a um gradiente pronto limpa a cor', async () => {
    const id = useKashStore.getState().cards[0]!.id;
    useKashStore.setState((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, color: '#FF5733' } : c)) }));
    await act(async () => useKashStore.getState().openEdit({ kind: 'card', id }));
    await renderWithTheme(<AddCardSheet />);
    expect(screen.getByTestId('add-card-color-custom')).toBeSelected();
    await press('add-card-color-blue');
    await press('add-card-save');
    expect(useKashStore.getState().cards.find((c) => c.id === id)).toMatchObject({ gradientId: 'blue', color: undefined });
  });
});

describe('cor personalizada da conta', () => {
  it('grava a cor escolhida; ao editar, cor fora da paleta aparece como personalizada', async () => {
    await act(async () => useKashStore.getState().openSheet('addAccount'));
    await renderWithTheme(<AddAccountSheet />);
    await fireEvent.changeText(screen.getByTestId('add-account-name'), 'Conta laranja');
    await pickCustom('account', 'ff8a3d');
    await press('add-account-save');
    const acc = useKashStore.getState().accounts.at(-1)!;
    expect(acc).toMatchObject({ name: 'Conta laranja', color: '#FF8A3D' });

    await act(async () => useKashStore.getState().openEdit({ kind: 'account', id: acc.id }));
    expect(screen.getByTestId('add-account-color-custom')).toBeSelected();
    expect(screen.getByTestId('add-account-color-0')).not.toBeSelected();
  });
});
