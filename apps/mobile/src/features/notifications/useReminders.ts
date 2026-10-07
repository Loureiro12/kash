import { planReminders } from '@kash/domain';
import { useRouter } from 'expo-router';
import { useLastNotificationResponse } from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { now } from '@/lib/clock';
import { cancelAllReminders, hasNotificationPermission, requestNotificationPermission, routeFromResponse, syncScheduledReminders } from '@/services/notifications';
import { useKashStore } from '@/store';

/**
 * Mantém as notificações locais iguais ao plano do domínio: sempre que contas, faturas, metas ou a
 * preferência mudam (ou o app volta ao primeiro plano, pois os dias passam), reagenda tudo.
 * Ao sair da área logada, cancela.
 */
export function useReminderSync() {
  const bills = useKashStore((s) => s.bills);
  const invoices = useKashStore((s) => s.invoices);
  const cards = useKashStore((s) => s.cards);
  const goals = useKashStore((s) => s.goals);
  const billReminder = useKashStore((s) => s.settings.billReminder);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  // `tick` entra só para recalcular com o "agora" novo
  const plan = useMemo(() => planReminders({ bills, invoices, cards, goals, settings: { billReminder } }, now()), [bills, invoices, cards, goals, billReminder, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const signature = JSON.stringify(plan);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const allowed = plan.length > 0 && (await hasNotificationPermission());
      if (cancelled) return;
      await syncScheduledReminders(allowed ? plan : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void cancelAllReminders(), []);
}

/** Abre a tela certa quando o usuário toca numa notificação (app aberto, em segundo plano ou fechado). */
export function useNotificationRouting() {
  const router = useRouter();
  const response = useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const route = routeFromResponse(response);
    const key = response?.notification.request.identifier ?? null;
    if (!route || !key || handled.current === key) return;
    handled.current = key;
    router.push(route as never);
  }, [response, router]);
}

/**
 * Liga/desliga "Lembrete de contas". Ao ligar, pede a permissão do sistema; se negada,
 * a preferência fica desligada e um toast leva aos Ajustes.
 */
export function useToggleBillReminder() {
  const enabled = useKashStore((s) => s.settings.billReminder);
  const toggle = useKashStore((s) => s.toggleBillReminder);
  const showToast = useKashStore((s) => s.showToast);
  return useCallback(
    async (next?: boolean) => {
      const turnOn = next ?? !enabled;
      if (turnOn) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          showToast('Permita notificações nos Ajustes pra receber lembretes', { label: 'Abrir', onPress: () => void Linking.openSettings() });
          return;
        }
      }
      if (turnOn !== enabled) toggle();
    },
    [enabled, toggle, showToast],
  );
}
