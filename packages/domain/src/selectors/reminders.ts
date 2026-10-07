import { addDays, monthName, toISODate } from '../dates';
import { formatBRL } from '../money';
import type { Bill, Card, Goal, Invoice, Settings } from '../types';
import { depositStatus } from './goals';
import { invoiceView } from './rollover';

export type ReminderKind = 'bill' | 'invoice' | 'goal-deposit' | 'invoices-closed';

export interface Reminder {
  /** estável por entidade+data, para reagendar sem duplicar */
  id: string;
  kind: ReminderKind;
  title: string;
  body: string;
  /** ISO datetime local (yyyy-mm-ddThh:mm) */
  at: string;
  /** rota do app ao tocar na notificação */
  route: string;
}

export interface ReminderInput {
  bills: Bill[];
  invoices: Invoice[];
  cards: Card[];
  goals: Goal[];
  settings: Pick<Settings, 'billReminder'>;
}

/** Quantos dias antes do vencimento avisar (copy do app: "Aviso 2 dias antes do vencimento"). */
export const REMINDER_DAYS_BEFORE = 2;
/** Hora local dos avisos. */
export const REMINDER_HOUR = 9;
/** iOS limita a 64 notificações pendentes; deixamos folga. */
export const MAX_REMINDERS = 48;

const at = (d: Date) => `${toISODate(d)}T${String(REMINDER_HOUR).padStart(2, '0')}:00`;
const dateOn = (year: number, month: number, day: number) => new Date(year, month, Math.min(day, daysInMonth(year, month)));
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const isFuture = (d: Date, now: Date) => d.getTime() > now.getTime();

/**
 * Planeja os lembretes a partir do estado atual. Função pura: o app agenda exatamente esta lista
 * (cancelando as anteriores), então não há duplicação nem lembrete de algo já pago.
 */
export function planReminders(input: ReminderInput, now: Date): Reminder[] {
  if (!input.settings.billReminder) return [];
  const out: Reminder[] = [];

  // contas fixas: 2 dias antes do vencimento deste mês (se ainda não pagas) ou do próximo
  for (const bill of input.bills) {
    for (const offset of [0, 1]) {
      const month = now.getMonth() + offset;
      const due = dateOn(now.getFullYear(), month, bill.dueDay);
      const remindAt = addDays(due, -REMINDER_DAYS_BEFORE);
      remindAt.setHours(REMINDER_HOUR, 0, 0, 0);
      const paidThisMonth = offset === 0 && bill.paid;
      if (paidThisMonth || !isFuture(remindAt, now)) continue;
      out.push({
        id: `bill:${bill.id}:${toISODate(due)}`,
        kind: 'bill',
        title: `${bill.name} vence em ${REMINDER_DAYS_BEFORE} dias`,
        body: `${formatBRL(bill.amount)} · dia ${due.getDate()}. Toque pra marcar como paga.`,
        at: at(remindAt),
        route: '/accounts',
      });
      break; // só o próximo vencimento de cada conta
    }
  }

  // faturas fechadas em aberto: 2 dias antes de vencer
  for (const invoice of input.invoices.filter((i) => !i.paid)) {
    const view = invoiceView(invoice, input.cards);
    const [y, m, d] = view.dueDate.split('-').map(Number);
    const due = new Date(y ?? now.getFullYear(), (m ?? 1) - 1, d ?? 1);
    const remindAt = addDays(due, -REMINDER_DAYS_BEFORE);
    remindAt.setHours(REMINDER_HOUR, 0, 0, 0);
    if (!isFuture(remindAt, now)) continue;
    out.push({
      id: `invoice:${invoice.id}`,
      kind: 'invoice',
      title: `Fatura do ${view.cardName} vence em ${REMINDER_DAYS_BEFORE} dias`,
      body: `${formatBRL(invoice.total)} · fatura de ${view.monthName}, vence ${view.dueLabel}.`,
      at: at(remindAt),
      route: '/cards',
    });
  }

  // metas: no dia do depósito, se ainda não depositou no mês
  for (const goal of input.goals) {
    if (!goal.depositDay || goal.saved >= goal.target) continue;
    for (const offset of [0, 1]) {
      const month = now.getMonth() + offset;
      const day = dateOn(now.getFullYear(), month, goal.depositDay);
      day.setHours(REMINDER_HOUR, 0, 0, 0);
      const depositedThisMonth = offset === 0 && depositStatus(goal, now).kind === 'done';
      if (depositedThisMonth || !isFuture(day, now)) continue;
      out.push({
        id: `goal:${goal.id}:${toISODate(day)}`,
        kind: 'goal-deposit',
        title: `Dia de guardar pra “${goal.name}”`,
        body: goal.monthly > 0 ? `${formatBRL(goal.monthly)} hoje e a meta continua no ritmo.` : 'Registre o depósito de hoje.',
        at: at(day),
        route: '/goals',
      });
      break;
    }
  }

  // virada de mês: faturas fecharam (dia 1º do próximo mês)
  if (input.cards.length > 0) {
    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1, REMINDER_HOUR, 0, 0, 0);
    out.push({
      id: `invoices-closed:${toISODate(first)}`,
      kind: 'invoices-closed',
      title: `Faturas de ${monthName(0, now)} fecharam`,
      body: 'Confira o valor de cada cartão e programe o pagamento.',
      at: at(first),
      route: '/cards',
    });
  }

  return out.sort((a, b) => (a.at < b.at ? -1 : 1)).slice(0, MAX_REMINDERS);
}

/** Próximo lembrete (para mostrar no Perfil), ou null. */
export function nextReminder(reminders: Reminder[]): Reminder | null {
  return reminders[0] ?? null;
}

/** "Internet, 8 out" */
export function reminderShortLabel(reminder: Reminder): string {
  const [date] = reminder.at.split('T');
  const [, m, d] = (date ?? '').split('-').map(Number);
  const month = new Date(2000, (m ?? 1) - 1, 1);
  const subject = reminder.kind === 'bill' ? reminder.title.replace(/ vence em .*$/, '') : reminder.kind === 'invoice' ? reminder.title.replace(/ vence em .*$/, '') : reminder.kind === 'goal-deposit' ? reminder.title.replace(/^Dia de guardar pra /, '') : reminder.title;
  return `${subject}, ${d} ${monthName(0, month).slice(0, 3)}`;
}

