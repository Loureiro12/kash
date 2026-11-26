import { nextSpendingAlert, planReminders, spendingAlerts, weeklySummaryReminder } from '@kash/domain';
import { useRouter } from 'expo-router';
import { useLastNotificationResponse } from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { now } from '@/lib/clock';
import { cancelAllReminders, hasNotificationPermission, presentAlertNow, requestNotificationPermission, routeFromResponse, syncScheduledReminders } from '@/services/notifications';
import { useKashStore } from '@/store';
import { sentAlerts, useAlertPrefs, type AlertPrefs } from './alertPrefs';

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
  const txs = useKashStore((s) => s.txs);
  const monthlyBudget = useKashStore((s) => s.settings.monthlyBudget);
  const cardBudget = useKashStore((s) => s.settings.cardBudget);
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');
  const weekly = useAlertPrefs((s) => s.weekly && s.loaded);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void useAlertPrefs.getState().load();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  // `tick` entra só para recalcular com o "agora" novo
  const plan = useMemo(() => {
    const at = now();
    const list = planReminders({ bills, invoices, cards, goals, settings: { billReminder } }, at);
    // resumo da semana (domingo 19h) com os números de agora; reagendado quando os lançamentos mudam
    const summary = weekly && ready ? weeklySummaryReminder({ txs, cardIds: cards.map((c) => c.id), settings: { monthlyBudget, cardBudget } }, at) : null;
    return summary ? [...list, summary] : list;
  }, [bills, invoices, cards, goals, billReminder, txs, monthlyBudget, cardBudget, weekly, ready, tick]); // eslint-disable-line react-hooks/exhaustive-deps
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

/**
 * Alertas de gastos (limite 80%/100%, ritmo do mês, categoria acima do normal): sempre que os
 * lançamentos mudam (inclusive vindos da web pelo realtime) ou o app volta ao primeiro plano,
 * calcula o que vale agora e mostra o mais importante ainda não avisado. Cada aviso sai uma vez só.
 */
export function useSpendingAlerts() {
  const userId = useKashStore((s) => s.userId);
  const txs = useKashStore((s) => s.txs);
  const bills = useKashStore((s) => s.bills);
  const cards = useKashStore((s) => s.cards);
  const monthlyBudget = useKashStore((s) => s.settings.monthlyBudget);
  const cardBudget = useKashStore((s) => s.settings.cardBudget);
  // só com os dados de verdade (nunca com os de exemplo do carregamento)
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');
  const enabled = useAlertPrefs((s) => s.spending && s.loaded);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void useAlertPrefs.getState().load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  const alerts = useMemo(
    () => (enabled && ready && userId ? spendingAlerts({ txs, cardIds: cards.map((c) => c.id), settings: { monthlyBudget, cardBudget }, bills }, now()) : []),
    [enabled, ready, userId, txs, bills, cards, monthlyBudget, cardBudget, tick], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const signature = alerts.map((a) => a.id).join('|');

  useEffect(() => {
    if (!signature || !userId) return;
    let cancelled = false;
    void (async () => {
      if (!(await hasNotificationPermission())) return;
      const sent = await sentAlerts.get(userId);
      const { alert, markSent } = nextSpendingAlert(alerts, sent);
      if (__DEV__) console.log(`[kash] alertas de gastos: ${alerts.map((a) => a.id).join(', ')} → ${alert?.id ?? 'nada novo'}`);
      if (cancelled || !alert) return;
      await sentAlerts.add(userId, markSent);
      await presentAlertNow(alert);
    })();
    return () => {
      cancelled = true;
    };
  }, [signature, userId]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Liga/desliga "Alertas de gastos" ou "Resumo da semana". Ao ligar, pede a permissão do sistema;
 * se negada, fica desligado e um toast leva aos Ajustes.
 */
export function useToggleAlertPref() {
  const showToast = useKashStore((s) => s.showToast);
  return useCallback(
    async (key: keyof AlertPrefs, on: boolean) => {
      if (on && !(await requestNotificationPermission())) {
        showToast('Permita notificações nos Ajustes pra receber os alertas', { label: 'Abrir', onPress: () => void Linking.openSettings() });
        return;
      }
      useAlertPrefs.getState().set(key, on);
    },
    [showToast],
  );
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
