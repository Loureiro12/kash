import type { Reminder } from '@kash/domain';
import { removePushToken, savePushToken } from '@kash/supabase-client';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/services/supabase';
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

export const ALERTS_CHANNEL = 'alerts';

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
    name: 'Lembretes',
    description: 'Contas fixas, faturas, depósitos das metas e o resumo da semana',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Mostra um alerta de gastos agora (limite, ritmo, categoria). O id é o do alerta: repetir o
 * mesmo id substitui em vez de duplicar.
 */
export async function presentAlertNow(alert: { id: string; title: string; body: string; route: string; kind: string }): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL, {
      name: 'Alertas de gastos',
      description: 'Limite do mês, ritmo de gastos e categorias acima do normal',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: alert.id,
    content: { title: alert.title, body: alert.body, data: { route: alert.route, kind: alert.kind } },
    trigger: Platform.OS === 'android' ? { channelId: ALERTS_CHANNEL } : null,
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

/** canal dos avisos do casal (Android): importância alta, aparece como banner */
export const HOUSEHOLD_CHANNEL = 'household';
let registeredToken: string | null = null;

/**
 * Registra este aparelho para os avisos da conta compartilhada (push pelo servidor, Expo Push).
 * Só com a permissão de notificações já concedida; sem projeto EAS ou em simulador, não faz nada.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!(await hasNotificationPermission())) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(HOUSEHOLD_CHANNEL, {
        name: 'Conta compartilhada',
        description: 'Gastos e entradas lançados pela outra pessoa',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;
    await savePushToken(supabase, token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
    return token;
  } catch {
    // simulador sem push, sem rede: tenta de novo na próxima abertura
    return null;
  }
}

/** Sair da conta: este aparelho para de receber os avisos. */
export async function unregisterPushToken(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await removePushToken(supabase, token);
  } catch {
    // sem rede: o token expira sozinho quando o Expo deixar de aceitá-lo
  }
}
