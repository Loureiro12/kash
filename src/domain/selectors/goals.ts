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
  const eta = done ? 'Meta batida!' : `Faltam ~${monthsLeft} ${monthsLeft === 1 ? 'mês' : 'meses'} nesse ritmo`;
  return { pct, monthsLeft, eta, done };
}

export const totalSaved = (goals: Goal[]): number => round2(goals.reduce((a, g) => a + g.saved, 0));

/** Soma `amount` sem ultrapassar o alvo. */
export function addToGoal(goal: Goal, amount: number): Goal {
  return { ...goal, saved: round2(Math.min(goal.target, goal.saved + amount)) };
}
