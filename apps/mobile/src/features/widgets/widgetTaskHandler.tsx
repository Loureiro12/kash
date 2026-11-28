import { toISODate } from '@kash/domain';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { now } from '@/lib/clock';
import { KashAndroidWidget } from './KashAndroidWidget';
import { readWidgetSummary } from './widgetStore';

/**
 * Android: o sistema pede o desenho do widget (adicionado, atualização a cada 30 min, redimensionado).
 * Lê os números guardados pelo app; os cliques abrem links do app (OPEN_URI), sem passar por aqui.
 */
export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const data = await readWidgetSummary();
  renderWidget(<KashAndroidWidget data={data} stale={!!data && data.day !== toISODate(now())} />);
}
