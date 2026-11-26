import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { typeAmount } from '@/test/amount';
import { renderWithTheme } from '@/test/render';

beforeEach(async () => {
  setClock(new Date(2026, 9, 15, 10));
  useKashStore.getState().reset();
  await act(async () => useKashStore.getState().openSheet('expense'));
});

afterEach(() => useKashStore.getState().hideToast());
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('TransactionSheet', () => {
  it('rascunho (proposta do assistente aberta para editar) preenche valor, descrição, origem, data e parcelas', async () => {
    const card = useKashStore.getState().cards[0]!;
    await act(async () => useKashStore.getState().openNewTransaction('expense', { amountCents: 30000, category: 'Lazer', sourceId: card.id, note: 'Fone', date: '2026-10-14', installments: 3 }));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByText('R$ 300,00')).toBeOnTheScreen();
    expect(screen.getByTestId('expense-note')).toHaveDisplayValue('Fone');
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('3x de R$ 100,00');
    await press('expense-save');
    expect(useKashStore.getState().plans.at(-1)).toMatchObject({ title: 'Fone', category: 'Lazer', cardId: card.id, installments: 3 });
    // o próximo lançamento novo nasce limpo
    await act(async () => useKashStore.getState().openSheet('expense'));
    expect(useKashStore.getState().ui.newTxDraft).toBeNull();
  });

  it('compra parcelada antiga: 1ª parcela há 8 meses lança só a 9/12 e mostra o que já foi pago', async () => {
    await renderWithTheme(<TransactionSheet />);
    await typeAmount('expense-amount', ['1', '2', '0', '0', '0', '0']);
    for (let i = 0; i < 11; i++) await press('expense-inst-inc');
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('12x de R$ 100,00');
    expect(screen.queryByTestId('expense-plan-summary')).toBeNull();

    // 15 out 2026 → 1ª parcela em fev/26
    for (let i = 0; i < 8; i++) await press('expense-first-month-prev');
    expect(screen.getByTestId('expense-first-month-label')).toHaveTextContent('fev/26');
    expect(screen.getByTestId('expense-plan-summary')).toHaveTextContent('8 parcelas já pagas (fev/26 a set/26) ficam fora. Lança a 9/12 agora; faltam 4 até janeiro: R$ 400,00.');

    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Celular');
    await press('expense-save');
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Celular (9/12)', amount: -100, sourceId: 'card1', date: '2026-10-15' });
    expect(s.plans.at(-1)).toMatchObject({ title: 'Celular', installments: 12, current: 9, perInstallment: 100 });
    expect(s.txs.filter((t) => t.planId === s.plans.at(-1)!.id)).toHaveLength(1);
    expect(s.ui.toast).toBe('Parcela 9/12 lançada · 8 já pagas');
  });

  it('modo "Parcela": o valor digitado é o de cada parcela', async () => {
    await renderWithTheme(<TransactionSheet />);
    await typeAmount('expense-amount', ['1', '5', '0', '0', '0']);
    for (let i = 0; i < 5; i++) await press('expense-inst-inc');
    await press('expense-value-mode-parcela');
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('6x de R$ 150,00');
    await press('expense-save');
    expect(useKashStore.getState().plans.at(-1)).toMatchObject({ installments: 6, perInstallment: 150, current: 1 });
  });

  it('compra já quitada não pode ser salva', async () => {
    await renderWithTheme(<TransactionSheet />);
    await typeAmount('expense-amount', ['3', '0', '0', '0', '0']);
    await press('expense-inst-inc');
    await press('expense-inst-inc');
    for (let i = 0; i < 3; i++) await press('expense-first-month-prev');
    expect(screen.getByTestId('expense-plan-summary')).toHaveTextContent('Essa compra já foi toda paga: a última parcela caiu em set/26.');
    expect(screen.getByTestId('expense-save')).toBeDisabled();
  });

  it('digita valor, parcela no cartão e salva', async () => {
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('expense-save')).toBeDisabled();

    await typeAmount('expense-amount', ['1', '2', '0', '0', '0', '0']);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 1.200,00');

    // origem padrão é o primeiro cartão → linha de parcelamento visível
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('À vista');
    await press('expense-inst-inc');
    await press('expense-inst-inc');
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('3x de R$ 400,00');

    await press('chip-cat-Lazer');
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Show');
    await press('expense-save');

    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Show (1/3)', category: 'Lazer', amount: -400, sourceId: 'card1' });
    expect(s.ui.toast).toBe('3x de R$ 400,00 no cartão');
    expect(s.ui.sheet).toBeNull();
  });

  it('em conta não mostra parcelamento e debita saldo', async () => {
    await renderWithTheme(<TransactionSheet />);
    await press('chip-src-acc1');
    expect(screen.queryByTestId('expense-installments')).toBeNull();
    await typeAmount('expense-amount', ['5', '00']);
    await press('expense-save');
    expect(useKashStore.getState().accounts[0]?.balance).toBe(2335.5);
    expect(useKashStore.getState().ui.toast).toBe('R$ 5,00 lançado em Comida');
  });

  it('entrada: só contas, sem categorias, credita saldo', async () => {
    await renderWithTheme(<TransactionSheet />);
    await press('tx-kind-income');
    expect(screen.queryByTestId('chip-cat-Comida')).toBeNull();
    expect(screen.queryByTestId('chip-src-card1')).toBeNull();
    await typeAmount('expense-amount', ['1', '00', '00']);
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Mesada');
    await press('expense-save');
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Mesada', category: 'Entrada', amount: 100, sourceId: 'acc1' });
    expect(s.accounts[0]?.balance).toBe(2440.5);
  });

  it('data: abre o calendário, atalho Ontem, dia do mês e nada de futuro', async () => {
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('expense-date-label')).toHaveTextContent('Hoje');
    expect(screen.queryByTestId('expense-date-picker')).toBeNull();
    await press('expense-date');
    await press('expense-date-picker-ontem');
    expect(screen.getByTestId('expense-date-label')).toHaveTextContent('Ontem');
    expect(screen.queryByTestId('expense-date-picker')).toBeNull();

    await press('expense-date');
    expect(screen.getByTestId('expense-date-picker-calendar-month')).toHaveTextContent('outubro 2026');
    expect(screen.getByTestId('expense-date-picker-calendar-day-2026-10-20')).toBeDisabled();
    expect(screen.getByTestId('expense-date-picker-calendar-next')).toBeDisabled();
    await press('expense-date-picker-calendar-prev');
    expect(screen.getByTestId('expense-date-picker-calendar-month')).toHaveTextContent('setembro 2026');
    await press('expense-date-picker-calendar-day-2026-09-28');
    expect(screen.getByTestId('expense-date-label')).toHaveTextContent('28 set');

    await press('chip-src-acc1');
    await typeAmount('expense-amount', ['9', '90']);
    await press('expense-save');
    expect(useKashStore.getState().txs[0]).toMatchObject({ amount: -9.9, date: '2026-09-28' });
  });

  it('sem teclado próprio: o valor é digitado no teclado do sistema e apagar tira o último dígito', async () => {
    await renderWithTheme(<TransactionSheet />);
    expect(screen.queryByTestId('keypad')).toBeNull();
    const input = screen.getByTestId('expense-amount-input');
    expect(input.props.keyboardType).toBe('number-pad');
    await typeAmount('expense-amount', ['1', '4', '5', '0']);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 14,50');
    await typeAmount('expense-amount', ['del']);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 1,45');
  });

  it('descrição já usada traz a categoria e a origem daquela vez, sem passar por cima da escolha manual', async () => {
    await renderWithTheme(<TransactionSheet />);
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'recarga do bilhete');
    expect(screen.getByTestId('chip-cat-Transporte')).toBeSelected();
    expect(screen.getByTestId('chip-src-acc1')).toBeSelected();
    // escolheu à mão: a próxima sugestão não troca
    await press('chip-cat-Lazer');
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Mercado da esquina');
    expect(screen.getByTestId('chip-cat-Lazer')).toBeSelected();
  });

  it('Transferência leva valor, descrição e data; e dá para voltar', async () => {
    await renderWithTheme(<TransactionSheet />);
    await typeAmount('expense-amount', ['50', '00']);
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Reserva');
    await press('tx-kind-transfer');
    const ui = useKashStore.getState().ui;
    expect(ui.sheet).toBe('transfer');
    expect(ui.transferDraft).toEqual({ amountCents: 5000, note: 'Reserva', date: '2026-10-15' });
  });

  it('edição: pré-preenche, salva alterações e exclui com desfazer', async () => {
    await act(async () => useKashStore.getState().openTransaction('tx1'));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 14,50');
    expect(screen.getByTestId('expense-note').props.value).toBe('Almoço no RU');
    expect(screen.queryByTestId('tx-kind-income')).toBeNull();
    await typeAmount('expense-amount', ['0']);
    await press('expense-save');
    expect(useKashStore.getState().txs.find((t) => t.id === 'tx1')?.amount).toBe(-145);
    expect(useKashStore.getState().ui.toast).toBe('Lançamento atualizado');
  });
});
