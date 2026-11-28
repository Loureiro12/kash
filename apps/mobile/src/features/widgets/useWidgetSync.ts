import { widgetSummary, type WidgetSummary } from '@kash/domain';
import { ExtensionStorage } from '@bacons/apple-targets';
import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { now } from '@/lib/clock';
import { useKashStore } from '@/store';
import { ANDROID_WIDGET_NAME, KashAndroidWidget } from './KashAndroidWidget';
import { IOS_APP_GROUP, IOS_WIDGET_KIND, writeWidgetSummary } from './widgetStore';

/** Manda os números para os widgets (iOS: App Group + recarregar; Android: guardar + redesenhar). */
export async function syncWidgets(data: WidgetSummary | null): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      const storage = new ExtensionStorage(IOS_APP_GROUP);
      if (data) storage.set('summary', { ...data, hidden: data.hidden ? 1 : 0, over: data.over ? 1 : 0 });
      else storage.remove('summary');
      ExtensionStorage.reloadWidget(IOS_WIDGET_KIND);
    } else if (Platform.OS === 'android') {
      await writeWidgetSummary(data);
      await requestWidgetUpdate({ widgetName: ANDROID_WIDGET_NAME, renderWidget: () => React.createElement(KashAndroidWidget, { data }) });
    }
  } catch {
    // widget é extra: nunca atrapalha o app
  }
}

/**
 * Área logada: mantém os widgets com o gasto de hoje e o que sobra no mês, sempre que os dados mudam.
 * Ao sair da conta, o widget volta a "Entre no app".
 */
export function useWidgetSync() {
  const txs = useKashStore((s) => s.txs);
  const cards = useKashStore((s) => s.cards);
  const monthlyBudget = useKashStore((s) => s.settings.monthlyBudget);
  const cardBudget = useKashStore((s) => s.settings.cardBudget);
  const hideValues = useKashStore((s) => s.settings.hideValues);
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');
  const summary = useMemo(
    () => (ready ? widgetSummary({ txs, cardIds: cards.map((c) => c.id), settings: { monthlyBudget, cardBudget, hideValues } }, now()) : null),
    [ready, txs, cards, monthlyBudget, cardBudget, hideValues],
  );
  const signature = summary ? JSON.stringify(summary) : '';

  useEffect(() => {
    if (summary) void syncWidgets(summary);
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  // saiu da área logada (logout): limpa os números do widget
  useEffect(() => () => void syncWidgets(null), []);
}
