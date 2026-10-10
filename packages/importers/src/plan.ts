import { monthKey, monthKeyName, monthKeyToDate, monthsBetween, round2, toISODate, type Plan, type Tx } from '@kash/domain';
import { detectInstallment, guessCategory, normalizeMerchant, stableId, suggestTitle } from './normalize';
import type { ParsedLine, ParsedStatement } from './types';

/** 'installments' = só os parcelamentos; 'all' = parcelamentos e compras à vista da fatura */
export type ImportMode = 'installments' | 'all';

export type RowSection = 'installment' | 'purchase' | 'income' | 'ignored';

export interface MerchantRule {
  pattern: string;
  title: string;
  category: string | null;
}

export interface ReviewRow {
  /** índice da linha no arquivo (estável enquanto a revisão está aberta) */
  key: string;
  section: RowSection;
  /** por que ficou de fora (só em 'ignored') */
  reason?: string;
  /** a pessoa marcou para importar */
  include: boolean;
  /** pode ser marcado? (linhas ignoradas por regra não podem) */
  selectable: boolean;
  /** data no arquivo e a data em que entra no Kash */
  date: string;
  kashDate: string;
  originalTitle: string;
  title: string;
  category: string;
  /** valor positivo (saída); entrada em conta também positivo, com section 'income' */
  amount: number;
  /** chave do estabelecimento (regras aprendidas) */
  pattern: string;
  installment?: {
    /** parcela na fatura importada */
    current: number;
    total: number;
    /** parcela que cai no mês atual (é a que o Kash lança agora) */
    currentNow: number;
    /** parcelas que ainda faltam, contando a do mês atual */
    remaining: number;
    /** mês da última parcela, por extenso */
    lastMonth: string;
  };
  /** no modo 'all': lança também a parcela da própria fatura, no mês dela */
  pastDate?: string;
  /** parece já existir no Kash (lançado à mão antes): começa desmarcado */
  duplicate: boolean;
  externalId: string;
}

export interface ImportPlanInput {
  statement: ParsedStatement;
  target: { type: 'card' | 'account'; id: string };
  mode: ImportMode;
  today: Date;
  /** mês de competência escolhido pela pessoa (sobrepõe o detectado) */
  statementMonth?: string;
  categories: readonly string[];
  rules: readonly MerchantRule[];
  existing: { plans: readonly Plan[]; txs: readonly Tx[] };
}

export interface ImportPlan {
  rows: ReviewRow[];
  /** mês de competência usado (fatura) */
  statementMonth: string | null;
  /** fatura recente (mês passado ou atual): pode importar "Tudo" */
  allowAll: boolean;
  mode: ImportMode;
  /** soma do que vai entrar × total informado pelo banco */
  check: { included: number; statementTotal: number | null };
}

const firstDay = (key: string) => `${key}-01`;
/** "julho" no ano atual, "julho de 2027" fora dele */
const monthLabel = (key: string, today: Date) => (key.slice(0, 4) === String(today.getFullYear()) ? monthKeyName(key) : `${monthKeyName(key)} de ${key.slice(0, 4)}`);
const lastDay = (key: string) => {
  const d = monthKeyToDate(key);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
/** prende a data dentro do mês (o Kash conta a fatura pelo mês do lançamento) */
const clampToMonth = (iso: string, key: string) => (iso.slice(0, 7) === key ? iso : iso < firstDay(key) ? firstDay(key) : lastDay(key));
const shiftMonth = (key: string, delta: number) => {
  const d = monthKeyToDate(key);
  return monthKey(new Date(d.getFullYear(), d.getMonth() + delta, 1));
};

/** Competência da fatura: a detectada, senão o mês anterior ao vencimento, senão o mês da última linha. */
export function statementMonthOf(statement: ParsedStatement): string | null {
  if (statement.statementMonth) return statement.statementMonth;
  if (statement.dueDate) return shiftMonth(statement.dueDate.slice(0, 7), -1);
  const last = statement.lines.map((l) => l.date).sort().at(-1);
  return last ? last.slice(0, 7) : null;
}

function nameAndCategory(line: ParsedLine & { suggestedTitle?: string; suggestedCategory?: string }, rules: Map<string, MerchantRule>, categories: readonly string[], fallback: string) {
  const pattern = normalizeMerchant(line.description);
  const rule = rules.get(pattern);
  const title = rule?.title ?? line.suggestedTitle ?? suggestTitle(line.description);
  const ruleCategory = rule?.category && (categories.includes(rule.category) || rule.category === 'Fatura') ? rule.category : null;
  const aiCategory = line.suggestedCategory && categories.includes(line.suggestedCategory) ? line.suggestedCategory : null;
  const category = ruleCategory ?? aiCategory ?? (line.kind === 'fee' && categories.includes('Outros') ? 'Outros' : guessCategory(line.description, categories, fallback));
  return { pattern, title, category };
}

/**
 * Monta a revisão da importação: o que entra (parcelamentos, compras, entradas), o que fica de fora
 * e por quê, já com nome amigável, categoria, parcela atual e aviso de possível duplicado.
 */
export function buildImportPlan(input: ImportPlanInput): ImportPlan {
  const { statement, target, today, categories, existing } = input;
  const currentMonth = monthKey(today);
  const fallback = categories.includes('Outros') ? 'Outros' : (categories[0] ?? 'Outros');
  const rules = new Map(input.rules.map((r) => [r.pattern, r]));
  const rows: ReviewRow[] = [];
  const seen = new Map<string, number>();
  /** mesma linha repetida no arquivo (ex.: dois cafés iguais no mesmo dia) ganha um sufixo */
  const occurrence = (base: string) => {
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  };

  if (target.type === 'account') {
    statement.lines.forEach((line, i) => {
      const { pattern, title, category } = nameAndCategory(line, rules, categories, fallback);
      const amount = Math.abs(line.amount);
      const isIncome = line.amount < 0;
      const externalId = line.bankId ? `ofx:${line.bankId}` : stableId(occurrence(`acc|${line.date}|${pattern}|${line.amount}`));
      const duplicate = existing.txs.some((t) => t.sourceId === target.id && t.date === line.date && Math.abs(Math.abs(t.amount) - amount) < 0.005 && Math.sign(t.amount) === (isIncome ? 1 : -1));
      const ignore = line.kind === 'ignore';
      rows.push({
        key: String(i),
        section: ignore ? 'ignored' : isIncome ? 'income' : 'purchase',
        ...(ignore ? { reason: 'Não é um lançamento' } : {}),
        include: !ignore && !duplicate,
        selectable: !ignore,
        date: line.date,
        kashDate: line.date,
        originalTitle: line.description,
        title,
        category: isIncome ? 'Entrada' : /\b(fatura|cartao|cartão)\b/i.test(line.description) && line.kind !== 'fee' ? 'Fatura' : category,
        amount,
        pattern,
        duplicate,
        externalId,
      });
    });
    const included = round2(rows.filter((r) => r.include).reduce((a, r) => a + (r.section === 'income' ? r.amount : -r.amount), 0));
    return { rows, statementMonth: null, allowAll: true, mode: 'all', check: { included, statementTotal: null } };
  }

  // ---------- fatura de cartão ----------
  const month = input.statementMonth ?? statementMonthOf(statement) ?? currentMonth;
  const allowAll = month >= shiftMonth(currentMonth, -1) && month <= currentMonth;
  const mode: ImportMode = allowAll ? input.mode : 'installments';
  const monthsSince = Math.max(0, monthsBetween(month, currentMonth));
  const cardTxs = existing.txs.filter((t) => t.sourceId === target.id);

  // compra estornada na mesma fatura (débito e crédito iguais): as duas ficam de fora
  const refunded = new Set<number>();
  statement.lines.forEach((l, i) => {
    if (l.kind !== 'refund') return;
    const j = statement.lines.findIndex((p, k) => !refunded.has(k) && k !== i && p.amount === -l.amount && normalizeMerchant(p.description) === normalizeMerchant(l.description));
    if (j >= 0) {
      refunded.add(i);
      refunded.add(j);
    }
  });

  statement.lines.forEach((line, i) => {
    const { pattern, title, category } = nameAndCategory(line, rules, categories, fallback);
    const base = { key: String(i), date: line.date, originalTitle: line.description, title, category, amount: Math.abs(line.amount), pattern };
    const ignored = (reason: string): ReviewRow => ({ ...base, section: 'ignored', reason, include: false, selectable: false, kashDate: line.date, duplicate: false, externalId: '' });

    if (refunded.has(i)) return rows.push(ignored('Compra estornada na mesma fatura'));
    if (line.kind === 'payment') return rows.push(ignored('Pagamento da fatura'));
    if (line.kind === 'refund') return rows.push(ignored('Estorno ou crédito'));
    if (line.kind === 'ignore') return rows.push(ignored('Não é um lançamento (ex.: parcela de fatura futura)'));

    const inst = line.installment ?? (line.kind === 'installment' ? detectInstallment(line.description) : null);
    if (inst) {
      const currentNow = inst.current + monthsSince;
      const lastMonthKey = shiftMonth(month, inst.total - inst.current);
      if (currentNow > inst.total) return rows.push(ignored(`Parcelamento já quitado (última parcela em ${monthLabel(lastMonthKey, today)})`));
      const firstMonth = shiftMonth(month, -(inst.current - 1));
      const per = round2(Math.abs(line.amount));
      const externalId = stableId(`plan|${pattern}|${inst.total}|${per}|${firstMonth}`);
      // parcelamento parecido já cadastrado à mão (mesmo cartão, nº de parcelas, valor e parcela atual)
      const duplicate = existing.plans.some((p) => p.cardId === target.id && p.installments === inst.total && Math.abs(p.perInstallment - per) < 0.01 && p.current === currentNow);
      return rows.push({
        ...base,
        amount: per,
        section: 'installment',
        include: !duplicate,
        selectable: true,
        kashDate: month === currentMonth ? clampToMonth(line.date, currentMonth) : firstDay(currentMonth),
        installment: { current: inst.current, total: inst.total, currentNow, remaining: inst.total - currentNow + 1, lastMonth: monthLabel(lastMonthKey, today) },
        ...(mode === 'all' && month < currentMonth ? { pastDate: clampToMonth(line.date, month) } : {}),
        duplicate,
        externalId,
      });
    }

    // compra à vista, juros, IOF…
    if (mode !== 'all') return rows.push(ignored(allowAll ? 'Compra à vista (modo "Só parceladas")' : 'Compra à vista de fatura antiga (só parcelamentos entram)'));
    const kashDate = clampToMonth(line.date, month);
    const amount = round2(Math.abs(line.amount));
    const externalId = stableId(occurrence(`card|${kashDate}|${pattern}|${amount}`));
    const duplicate = cardTxs.some((t) => t.date.slice(0, 7) === month && Math.abs(Math.abs(t.amount) - amount) < 0.005 && !t.planId);
    rows.push({ ...base, amount, section: 'purchase', include: !duplicate, selectable: true, kashDate, duplicate, externalId });
  });

  const included = round2(rows.filter((r) => r.include).reduce((a, r) => a + r.amount, 0));
  return { rows, statementMonth: month, allowAll, mode, check: { included, statementTotal: statement.total ?? null } };
}

/** Itens da RPC `import_card_statement`. */
export function toCardItems(rows: readonly ReviewRow[]) {
  return rows
    .filter((r) => r.include && r.section !== 'ignored')
    .map((r) =>
      r.section === 'installment' && r.installment
        ? {
            type: 'plan' as const,
            title: r.title.trim() || r.originalTitle,
            original_title: r.originalTitle,
            category: r.category,
            per: r.amount,
            installments: r.installment.total,
            current: r.installment.currentNow,
            current_date: r.kashDate,
            external_id: r.externalId,
            ...(r.pastDate && r.installment.current !== r.installment.currentNow ? { past_date: r.pastDate, past_installment: r.installment.current } : {}),
          }
        : { type: 'tx' as const, title: r.title.trim() || r.originalTitle, original_title: r.originalTitle, category: r.category, amount: r.amount, date: r.kashDate, external_id: r.externalId },
    );
}

/** Itens da RPC `import_account_statement` (entrada > 0, saída < 0). */
export function toAccountItems(rows: readonly ReviewRow[]) {
  return rows
    .filter((r) => r.include && r.section !== 'ignored')
    .map((r) => ({ title: r.title.trim() || r.originalTitle, original_title: r.originalTitle, category: r.category, amount: r.section === 'income' ? r.amount : -r.amount, date: r.kashDate, external_id: r.externalId }));
}

/** Regras novas: o que a pessoa renomeou ou recategorizou em relação à sugestão automática. */
export function learnedRules(rows: readonly ReviewRow[], suggested: readonly ReviewRow[]): MerchantRule[] {
  const byKey = new Map(suggested.map((r) => [r.key, r]));
  const out = new Map<string, MerchantRule>();
  for (const r of rows) {
    const before = byKey.get(r.key);
    if (!r.include || !before || !r.pattern) continue;
    if (r.title.trim() !== before.title || r.category !== before.category) {
      out.set(r.pattern, { pattern: r.pattern, title: r.title.trim() || before.title, category: r.section === 'income' ? null : r.category });
    }
  }
  return [...out.values()];
}
