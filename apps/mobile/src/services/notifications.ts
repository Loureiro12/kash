import type { Reminder } from '@kash/domain';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificações locais (lembretes). Camada fina sobre o expo-notifications: o domínio decide
 * O QUE lembrar (`planReminders`); aqui só pedimos permissão e agendamos/cancelamos.
 */

export const REMINDERS_CHANNEL = 'reminders';

// Com o app aberto a notificação ainda aparece como banner (sem som/badge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function hasNotificationPermission(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

/** Pede permissão (só mostra o diálogo do sistema se ainda não foi decidido). */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return next.granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
    name: 'Lembretes',
    description: 'Contas fixas, faturas e depósitos das metas',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

const localDate = (iso: string) => {
  const [date = '', time = '09:00'] = iso.split('T');
  const [y = 2000, m = 1, d = 1] = date.split('-').map(Number);
  const [h = 9, min = 0] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
};

let chain: Promise<void> = Promise.resolve();

/**
 * Substitui todos os lembretes agendados pelos da lista. Chamadas concorrentes são serializadas,
 * então a última lista sempre vence.
 */
export function syncScheduledReminders(reminders: Reminder[]): Promise<void> {
  chain = chain.then(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (__DEV__) console.log(`[kash] lembretes agendados: ${reminders.length}`, reminders.map((r) => `${r.id} @ ${r.at}`));
    if (reminders.length === 0) return;
    await ensureChannel();
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { route: r.route, kind: r.kind } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: localDate(r.at), channelId: REMINDERS_CHANNEL },
      });
    }
  });
  return chain;
}

export const cancelAllReminders = () => syncScheduledReminders([]);

/** Rota guardada na notificação tocada, se houver. */
export function routeFromResponse(response: Notifications.NotificationResponse | null | undefined): string | null {
  const route = response?.notification.request.content.data?.route;
  return typeof route === 'string' && route.startsWith('/') ? route : null;
}
