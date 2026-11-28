import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetSummary } from '@kash/domain';

/**
 * Os números do widget guardados no aparelho. No Android, o widget é desenhado por uma tarefa em
 * segundo plano (sem o app aberto), que lê daqui. No iOS vão para o App Group (ver syncWidgets).
 */
export const WIDGET_STORAGE_KEY = 'kash.widget.summary';
export const IOS_APP_GROUP = 'group.com.andreloureiro.kash';
export const IOS_WIDGET_KIND = 'KashSummaryWidget';

export async function readWidgetSummary(): Promise<WidgetSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WidgetSummary) : null;
  } catch {
    return null;
  }
}

export async function writeWidgetSummary(data: WidgetSummary | null): Promise<void> {
  try {
    if (data) await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(data));
    else await AsyncStorage.removeItem(WIDGET_STORAGE_KEY);
  } catch {
    // sem storage: o widget só não atualiza
  }
}
