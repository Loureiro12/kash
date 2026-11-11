import { act } from '@testing-library/react-native';
import { installTelemetryEvents } from '@/data/telemetryEvents';
import { useKashStore } from '@/store';

jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));
const { track } = jest.requireMock('@/services/telemetry') as { track: jest.Mock };

describe('eventos de uso ligados às ações', () => {
  beforeAll(() => {
    useKashStore.getState().reset();
    installTelemetryEvents();
  });
  beforeEach(() => track.mockClear());

  it('lançamento: tipo, origem e parcelas, sem valor nem nome', () => {
    const s = useKashStore.getState();
    const card = s.cards[0]!;
    act(() => s.addTransaction({ kind: 'expense', amountCents: 12_000, category: 'Mercado', sourceId: card.id, note: 'Feira do mês', installments: 3 }));
    expect(track).toHaveBeenCalledWith('add_transaction', { kind: 'expense', source_type: 'card', installments: 3 });
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/Feira|12000|120/);
  });

  it('limite dividido e conta fixa paga', () => {
    act(() => useKashStore.getState().setBudgets(1500, 500));
    expect(track).toHaveBeenCalledWith('budget_set', { split: true });
    const bill = useKashStore.getState().bills.find((b) => !b.paid)!;
    act(() => useKashStore.getState().toggleBillPaid(bill.id));
    expect(track).toHaveBeenCalledWith('pay_bill', {});
    track.mockClear();
    // desmarcar não conta como pagamento
    act(() => useKashStore.getState().toggleBillPaid(bill.id));
    expect(track).not.toHaveBeenCalled();
  });
});
