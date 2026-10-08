import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { CategoriesScreen } from '@/features/categories/CategoriesScreen';
import { CategorySheet } from '@/features/categories/CategorySheet';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const st = () => useKashStore.getState();

beforeEach(() => {
  st().reset();
});

describe('Categorias', () => {
  it('lista com o uso de cada uma e abre a criação', async () => {
    await renderWithTheme(<CategoriesScreen />);
    expect(screen.getByTestId('category-Comida')).toBeOnTheScreen();
    const usage = st().txs.filter((t) => t.category === 'Comida').length;
    expect(screen.getByTestId('category-Comida')).toHaveTextContent(new RegExp(`${usage} lançamento`));
    await press('categories-add');
    expect(st().ui.sheet).toBe('category');
  });

  it('cria com cor escolhida; nome repetido mostra erro', async () => {
    await act(async () => st().openSheet('category'));
    await renderWithTheme(<CategorySheet />);
    await fireEvent.changeText(screen.getByTestId('category-name'), 'comida');
    expect(screen.getByText('Já existe uma categoria com esse nome.')).toBeOnTheScreen();
    expect(screen.getByTestId('category-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('category-name'), 'Pets');
    await press('category-color-3D8BFF');
    await press('category-save');
    expect(st().categories.at(-1)).toMatchObject({ name: 'Pets', color: '#3D8BFF' });
    expect(st().ui.toast).toBe('Categoria “Pets” criada');
  });

  it('renomear avisa quantos registros foram atualizados', async () => {
    const assin = st().categories.find((c) => c.name === 'Assinaturas')!;
    await act(async () => st().openEdit({ kind: 'category', id: assin.id }));
    await renderWithTheme(<CategorySheet />);
    expect(screen.getByTestId('category-usage')).toHaveTextContent(/Em uso:/);
    await fireEvent.changeText(screen.getByTestId('category-name'), 'Streaming');
    await press('category-save');
    expect(st().txs.some((t) => t.category === 'Assinaturas')).toBe(false);
    expect(st().ui.toast).toMatch(/^Categoria renomeada · .*atualizados$/);
  });

  it('excluir sem uso pede confirmação', async () => {
    await act(async () => st().addCategory({ name: 'Vazia', color: '#5C6B7A' }));
    const id = st().categories.at(-1)!.id;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.style === 'destructive')?.onPress?.());
    await act(async () => st().openEdit({ kind: 'category', id }));
    await renderWithTheme(<CategorySheet />);
    await press('category-delete');
    expect(alert).toHaveBeenCalled();
    expect(st().categories.some((c) => c.id === id)).toBe(false);
    alert.mockRestore();
  });

  it('excluir em uso pede o destino e move os registros', async () => {
    const comida = st().categories.find((c) => c.name === 'Comida')!;
    const used = st().txs.filter((t) => t.category === 'Comida').length;
    await act(async () => st().openEdit({ kind: 'category', id: comida.id }));
    await renderWithTheme(<CategorySheet />);
    await press('category-delete');
    expect(screen.getByTestId('category-delete-usage')).toHaveTextContent(/Escolha para qual categoria/);
    expect(screen.getByTestId('category-move-Outros')).toBeSelected();
    await press('category-move-Lazer');
    const lazerBefore = st().txs.filter((t) => t.category === 'Lazer').length;
    await press('category-delete-confirm');
    expect(st().categories.some((c) => c.id === comida.id)).toBe(false);
    expect(st().txs.filter((t) => t.category === 'Lazer')).toHaveLength(lazerBefore + used);
    expect(st().ui.toast).toMatch(/foram para Lazer$/);
  });
});
