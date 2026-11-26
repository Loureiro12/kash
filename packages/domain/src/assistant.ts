import { addDays, longDate, monthName, toISODate } from './dates';
import { formatBRL, round2 } from './money';
import { budgetSplit } from './selectors/budget';
import { cardUsage } from './selectors/cards';
import { forecast } from './selectors/forecast';
import { goalProgress } from './selectors/goals';
import { periodReport } from './selectors/periodReport';
import { detectRecurring } from './selectors/recurring';
import { previousMonthsSpent } from './selectors/report';
import { invoiceView } from './selectors/rollover';
import { isTransfer, type Account, type Bill, type Card, type Goal, type Invoice, type Plan, type Settings, type Tx, type User } from './types';

/**
 * Assistente financeiro (Claude): o resumo dos dados da pessoa que vai junto de cada conversa.
 * Só o que ajuda a responder "vale a pena comprar?", "como estão meus gastos?" etc. — nada de e-mail,
 * celular ou número de cartão; da pessoa vai só o primeiro nome. Texto compacto, em português.
 */
export interface AssistantInput {
  user: Pick<User, 'name'>;
  settings: Pick<Settings, 'monthlyBudget' | 'cardBudget'>;
  accounts: Account[];
  cards: Card[];
  txs: Tx[];
  plans: Plan[];
  bills: Bill[];
  goals: Goal[];
  invoices: Invoice[];
}

/** perguntas prontas da tela vazia */
export const ASSISTANT_SUGGESTIONS = [
  'Como estão meus gastos este mês?',
  'Vale a pena comprar um celular de R$ 2.000 em 10x?',
  'Onde eu posso economizar?',
  'Quanto posso gastar por dia até o fim do mês?',
  'Consigo bater minhas metas no prazo?',
] as const;

/** limites do que vai para o servidor (o servidor confere de novo) */
export const ASSISTANT_LIMITS = {
  /** mensagens da conversa enviadas (as mais recentes) */
  history: 20,
  /** caracteres por mensagem da pessoa */
  messageChars: 1500,
  /** lançamentos recentes no resumo */
  recentTxs: 120,
  /** caracteres do resumo */
  contextChars: 24000,
} as const;

const money = formatBRL;
const day = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

export function buildAssistantContext(input: AssistantInput, now: Date): string {
  const { accounts, cards, txs, plans, bills, goals, invoices, settings } = input;
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);
  const firstName = input.user.name.trim().split(/\s+/)[0] ?? '';

  push(`Hoje: ${longDate(now)} (${toISODate(now)}).`);
  if (firstName) push(`Nome: ${firstName}.`);

  // contas e saldo
  const balance = round2(accounts.reduce((a, x) => a + x.balance, 0));
  push('', `## Contas (saldo total ${money(balance)})`);
  if (accounts.length === 0) push('- nenhuma conta cadastrada');
  for (const a of accounts) push(`- ${a.name} (${a.kind}): ${money(a.balance)}`);

  // cartões
  push('', '## Cartões');
  if (cards.length === 0) push('- nenhum cartão cadastrado');
  for (const c of cards) {
    const u = cardUsage(c, txs, now);
    push(`- ${c.name}: limite ${money(c.limit)}, fatura atual ${money(u.used)}, disponível ${money(u.available)}, fecha dia ${c.closingDay}, vence dia ${c.dueDay}`);
  }
  const unpaid = invoices.filter((i) => !i.paid && i.total > 0).map((i) => invoiceView(i, cards));
  if (unpaid.length) {
    push('Faturas fechadas a pagar:');
    for (const i of unpaid) push(`- ${i.cardName} (${i.monthName}): ${money(i.total)}, vence ${i.dueLabel}`);
  }

  // mês atual e limite
  const month = periodReport(txs, 'month', 0, now, { monthlyBudget: settings.monthlyBudget });
  const split = budgetSplit(txs, cards.map((c) => c.id), settings, now);
  push('', `## ${monthName(0, now)} até agora`);
  push(`- Gastou ${money(month.spent)} (${month.count} gastos), entrou ${money(month.income)}. ${month.delta.message}.`);
  push(`- Limite mensal: ${money(settings.monthlyBudget)}. ${split.total.status.message}.`);
  if (split.card && split.rest) {
    push(`- Limite dividido: cartão ${money(split.card.spent)} de ${money(split.card.budget)}; restante (débito, Pix, dinheiro) ${money(split.rest.spent)} de ${money(split.rest.budget)}.`);
  }
  if (month.budget?.projected != null) push(`- ${month.budget.message}.`);
  if (month.categories.length) push(`- Por categoria: ${month.categories.map((c) => `${c.name} ${money(c.amount)} (${c.pct}%)`).join('; ')}.`);
  const week = periodReport(txs, 'week', 0, now, { monthlyBudget: settings.monthlyBudget });
  push(`- Esta semana: ${money(week.spent)}. ${week.delta.message}.`);

  // histórico
  const prev = previousMonthsSpent(txs, now, 3);
  if (prev.some((v) => v > 0)) {
    push('', '## Gastos dos meses anteriores');
    prev.forEach((v, i) => push(`- ${monthName(i - prev.length, now)}: ${money(v)}`));
  }
  const lastMonth = periodReport(txs, 'month', -1, now);
  if (lastMonth.categories.length) push(`- ${monthName(-1, now)} por categoria: ${lastMonth.categories.slice(0, 6).map((c) => `${c.name} ${money(c.amount)}`).join('; ')}.`);

  // compromissos
  const fixed = bills.filter((b) => b.amount > 0);
  if (fixed.length) {
    push('', `## Contas fixas (${money(round2(fixed.reduce((a, b) => a + b.amount, 0)))} por mês)`);
    for (const b of [...fixed].sort((a, b) => a.dueDay - b.dueDay)) push(`- ${b.name}: ${money(b.amount)}, dia ${b.dueDay}${b.paid ? ' (paga este mês)' : ' (a pagar este mês)'}${b.sourceType === 'card' ? ', no cartão' : ''}`);
  }
  // assinaturas e cobranças que se repetem nos lançamentos e ainda não são conta fixa
  const recurring = detectRecurring(txs, bills, now).filter((c) => !c.isBill);
  if (recurring.length) {
    push('', `## Cobranças recorrentes detectadas, ainda não cadastradas como conta fixa (${money(round2(recurring.reduce((a, c) => a + c.amount, 0)))} por mês)`);
    for (const c of recurring.slice(0, 10)) push(`- ${c.title}: ${money(c.amount)}, por volta do dia ${c.dueDay}, há ${c.months} meses${c.priceChange ? ` (subiu de ${money(c.priceChange.from)})` : ''}`);
  }
  const open = plans.filter((p) => p.current < p.installments);
  if (open.length) {
    push('', '## Parcelamentos em aberto');
    for (const p of open) push(`- ${p.title}: ${p.current}/${p.installments} de ${money(p.perInstallment)} (faltam ${money(round2((p.installments - p.current) * p.perInstallment))})`);
  }
  const next = forecast(plans, bills, cards, now, accounts);
  if (next.some((m) => m.total > 0)) {
    push('', '## Já comprometido nos próximos meses (parcelas + contas fixas)');
    for (const m of next) push(`- ${m.name}: ${money(m.total)} (parcelas ${money(m.installments)}, contas fixas ${money(m.bills)})`);
  }

  // metas
  if (goals.length) {
    push('', '## Metas');
    for (const g of goals) {
      const p = goalProgress(g);
      push(`- ${g.name}: guardado ${money(g.saved)} de ${money(g.target)} (${p.pct}%), aporte planejado ${money(g.monthly)}/mês${p.done ? ', concluída' : p.eta ? `, previsão: ${p.eta}` : ''}`);
    }
  }

  // lançamentos recentes (últimos 60 dias, mais recentes primeiro)
  const since = toISODate(addDays(now, -60));
  const recent = txs
    .filter((t) => t.date >= since && !isTransfer(t))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, ASSISTANT_LIMITS.recentTxs);
  if (recent.length) {
    const sourceName = (t: Tx) => cards.find((c) => c.id === t.sourceId)?.name ?? accounts.find((a) => a.id === t.sourceId)?.name ?? '';
    push('', `## Lançamentos dos últimos 60 dias (${recent.length} mais recentes)`);
    for (const t of recent) push(`- ${day(t.date)} ${t.title.slice(0, 40)} | ${t.category} | ${t.amount < 0 ? '-' : '+'}${money(Math.abs(t.amount))} | ${sourceName(t)}`);
  }

  const text = lines.join('\n');
  return text.length > ASSISTANT_LIMITS.contextChars ? text.slice(0, ASSISTANT_LIMITS.contextChars) : text;
}

/* ---------- Lançamento assistido ---------- */

/** opções que o assistente pode usar para propor um lançamento (sem números de cartão) */
export interface AssistantLedger {
  /** categorias de gasto da pessoa (sem as do sistema) */
  categories: string[];
  sources: { id: string; name: string; type: 'card' | 'account' }[];
}

export function assistantLedger(categories: readonly { name: string }[], cards: Card[], accounts: Account[]): AssistantLedger {
  return {
    categories: categories.map((c) => c.name).filter((n) => n !== 'Entrada' && n !== 'Fatura' && n !== 'Transferência'),
    sources: [...cards.map((c) => ({ id: c.id, name: c.name, type: 'card' as const })), ...accounts.map((a) => ({ id: a.id, name: a.name, type: 'account' as const }))],
  };
}

/** lançamento proposto pelo assistente; só entra no app quando a pessoa confirma */
export interface TxProposal {
  kind: 'expense' | 'income';
  /** reais, positivo */
  amount: number;
  title: string;
  category: string;
  sourceId: string;
  /** yyyy-mm-dd */
  date: string;
  /** 1 = à vista (parcelado só no cartão) */
  installments: number;
}

export const MAX_PROPOSAL_INSTALLMENTS = 24;

/**
 * Confere uma proposta contra o que existe agora no app (a conta pode ter sido excluída, a categoria
 * renomeada…) e ajusta o que dá: data no futuro vira hoje, parcelas fora do cartão viram à vista,
 * categoria desconhecida vira "Outros". Devolve null quando não dá pra lançar.
 */
export function checkProposal(raw: unknown, ledger: AssistantLedger, today: string): TxProposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const kind = p.kind === 'income' ? 'income' : p.kind === 'expense' ? 'expense' : null;
  const amount = typeof p.amount === 'number' && Number.isFinite(p.amount) ? round2(Math.abs(p.amount)) : 0;
  const source = ledger.sources.find((s) => s.id === p.sourceId);
  if (!kind || amount <= 0 || amount > 10_000_000 || !source) return null;
  // entrada só em conta
  if (kind === 'income' && source.type !== 'account') return null;
  const title = typeof p.title === 'string' ? p.title.trim().slice(0, 60) : '';
  const category =
    kind === 'income'
      ? 'Entrada'
      : typeof p.category === 'string' && ledger.categories.includes(p.category)
        ? p.category
        : ledger.categories.includes('Outros')
          ? 'Outros'
          : (ledger.categories[0] ?? 'Outros');
  const date = typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date <= today ? p.date : today;
  const n = typeof p.installments === 'number' && Number.isInteger(p.installments) ? p.installments : 1;
  const installments = kind === 'expense' && source.type === 'card' ? Math.min(MAX_PROPOSAL_INSTALLMENTS, Math.max(1, n)) : 1;
  return { kind, amount, title: title || (kind === 'income' ? 'Entrada' : category), category, sourceId: source.id, date, installments };
}

/** "Gasto de R$ 45,00 · iFood · Comida · Nubank · 25/11 · 3x" (vai no histórico para o assistente saber o que foi proposto) */
export function describeProposal(p: TxProposal, ledger: AssistantLedger): string {
  const source = ledger.sources.find((s) => s.id === p.sourceId)?.name ?? '';
  return [`${p.kind === 'income' ? 'Entrada' : 'Gasto'} de ${money(p.amount)}`, p.title, p.kind === 'expense' ? p.category : null, source, day(p.date), p.installments > 1 ? `${p.installments}x` : null].filter(Boolean).join(' · ');
}
