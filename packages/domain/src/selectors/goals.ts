import { isSameMonth, monthName } from '../dates';
import { round2 } from '../money';
import type { Goal } from '../types';

export interface GoalProgress {
  pct: number;
  monthsLeft: number;
  eta: string;
  done: boolean;
}

/** pct = saved/target; ETA = ceil((target − saved)/monthly) meses. */
export function goalProgress(goal: Goal): GoalProgress {
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
  const monthsLeft = goal.monthly > 0 ? Math.max(0, Math.ceil((goal.target - goal.saved) / goal.monthly)) : 0;
  const done = goal.saved >= goal.target;
  const eta = done ? 'Meta batida!' : `Faltam ${monthsLeft} ${monthsLeft === 1 ? 'mês' : 'meses'} nesse ritmo`;
  return { pct, monthsLeft, eta, done };
}

export const totalSaved = (goals: Goal[]): number => round2(goals.reduce((a, g) => a + g.saved, 0));

/** Soma `amount` sem ultrapassar o alvo. */
export function addToGoal(goal: Goal, amount: number): Goal {
  return { ...goal, saved: round2(Math.min(goal.target, goal.saved + amount)) };
}

export type DepositStatus =
  | { kind: 'none' }
  | { kind: 'upcoming'; day: number }
  | { kind: 'due'; day: number }
  | { kind: 'done'; day: number; date: string };

/**
 * Situação do depósito mensal:
 * - done: já registrado neste mês · due: o dia chegou e ainda não foi registrado · upcoming: ainda não chegou.
 */
export function depositStatus(goal: Goal, now: Date): DepositStatus {
  if (!goal.depositDay) return { kind: 'none' };
  const day = goal.depositDay;
  if (goal.lastDepositDate && isSameMonth(goal.lastDepositDate, now)) return { kind: 'done', day, date: goal.lastDepositDate };
  if (now.getDate() >= day) return { kind: 'due', day };
  return { kind: 'upcoming', day };
}

export function depositLabel(status: DepositStatus, now: Date): string {
  switch (status.kind) {
    case 'none':
      return 'Sem dia de depósito';
    case 'upcoming':
      return `Próximo depósito dia ${status.day}`;
    case 'due':
      return `Depósito de ${monthName(0, now)} pendente`;
    case 'done':
      return `Depósito de ${monthName(0, now)} feito`;
  }
}

/** Registra um depósito: soma (sem passar do alvo) e marca a data. */
export function recordDeposit(goal: Goal, amount: number, date: string, accountId?: string): Goal {
  return { ...addToGoal(goal, amount), lastDepositDate: date, accountId: accountId ?? goal.accountId };
}
