import { act, renderHook } from '@testing-library/react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { Tx } from '@kash/domain';
import { useWidgetSync } from '@/features/widgets/useWidgetSync';
import { widgetTaskHandler } from '@/features/widgets/widgetTaskHandler';
import { WIDGET_STORAGE_KEY } from '@/features/widgets/widgetStore';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';

const store = (ExtensionStorage as unknown as { __store: Record<string, Record<string, unknown>> }).__store;
const tx = (date: string, amount: number): Tx => ({ id: `${date}${amount}`, title: 'x', category: 'Comida', amount, date, sourceId: 'acc1' });

beforeEach(async () => {
  setClock(new Date(2026, 10, 28, 15));
  await AsyncStorage.clear();
  delete store.summary;
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ userId: 'u-1', txs: [tx('2026-11-28', -45.9), tx('2026-11-10', -1000)], settings: { ...s.settings, monthlyBudget: 1800, cardBudget: 0, hideValues: false }, ui: { ...s.ui, dataStatus: 'ready' } }));
  jest.clearAllMocks();
});
afterEach(() => {
  Platform.OS = 'ios';
});
afterAll(() => setClock(null));

describe('widgets', () => {
  it('iOS: grava os números no App Group e recarrega o widget; atualiza a cada lançamento', async () => {
    Platform.OS = 'ios';
    await renderHook(() => useWidgetSync());
    await act(async () => {});
    expect(store.summary).toMatchObject({ today: 'R$ 45,90', left: 'R$ 754,10', leftLabel: 'Sobram no mês', pct: 58, hidden: 0, over: 0, day: '2026-11-28' });
    expect(ExtensionStorage.reloadWidget).toHaveBeenCalledWith('KashSummaryWidget');
    await act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 1000, category: 'Comida', sourceId: 'acc1', note: '', installments: 1 }));
    await act(async () => {});
    expect(store.summary).toMatchObject({ today: 'R$ 55,90' });
  });

  it('ocultar valores esconde no widget; carregando não grava; sair da conta limpa', async () => {
    useKashStore.setState((s) => ({ ui: { ...s.ui, dataStatus: 'loading' } }));
    const { unmount } = await renderHook(() => useWidgetSync());
    await act(async () => {});
    expect(store.summary).toBeUndefined();
    await act(() => useKashStore.setState((s) => ({ settings: { ...s.settings, hideValues: true }, ui: { ...s.ui, dataStatus: 'ready' } })));
    await act(async () => {});
    expect(store.summary).toMatchObject({ hidden: 1 });
    expect(String(store.summary!.today)).not.toContain('45');
    await act(() => unmount());
    await act(async () => {});
    expect(store.summary).toBeUndefined();
  });

  it('Android: guarda para a tarefa do widget e pede o redesenho; a tarefa lê e marca números velhos', async () => {
    Platform.OS = 'android';
    await renderHook(() => useWidgetSync());
    await act(async () => {});
    expect(JSON.parse((await AsyncStorage.getItem(WIDGET_STORAGE_KEY))!)).toMatchObject({ today: 'R$ 45,90' });
    expect(requestWidgetUpdate).toHaveBeenCalledWith(expect.objectContaining({ widgetName: 'KashSummary' }));

    const renderWidget = jest.fn();
    await widgetTaskHandler({ widgetAction: 'WIDGET_UPDATE', widgetInfo: { widgetName: 'KashSummary', widgetId: 1, width: 300, height: 200 } as never, renderWidget });
    expect(renderWidget.mock.calls[0]![0].props).toMatchObject({ stale: false });
    // no dia seguinte, sem abrir o app: números velhos
    setClock(new Date(2026, 10, 29, 9));
    renderWidget.mockClear();
    await widgetTaskHandler({ widgetAction: 'WIDGET_UPDATE', widgetInfo: { widgetName: 'KashSummary', widgetId: 1, width: 300, height: 200 } as never, renderWidget });
    expect(renderWidget.mock.calls[0]![0].props).toMatchObject({ data: expect.objectContaining({ today: 'R$ 45,90' }), stale: true });
  });
});
