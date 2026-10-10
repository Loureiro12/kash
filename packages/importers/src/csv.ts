import { classifyLine, detectInstallment } from './normalize';
import type { ParsedLine, ParsedStatement } from './types';

export interface CsvMapping {
  date: number;
  description: number;
  amount: number;
  /** o banco mostra compras como valor positivo (fatura) ou negativo (extrato)? */
  expensesArePositive: boolean;
}

export interface CsvTable {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

/** Divide uma linha CSV respeitando aspas. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function readCsv(text: string): CsvTable {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const first = lines[0] ?? '';
  const delimiter = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : first.includes('\t') ? '\t' : ',';
  const [headers = [], ...rows] = lines.map((l) => splitLine(l, delimiter));
  return { headers, rows: rows.filter((r) => r.some((c) => c)), delimiter };
}

/** "1.234,56", "-R$ 10,00", "10.50", "(12,00)" → número */
export function parseBrNumber(raw: string): number | null {
  const s = raw.replace(/\s|R\$/g, '');
  if (!s) return null;
  const negative = /^-|^\(.*\)$|-$/.test(s);
  const digits = s.replace(/[()\-+]/g, '');
  const normalized = digits.includes(',') ? digits.replace(/\./g, '').replace(',', '.') : digits;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** "05/10/2026", "2026-10-05", "05/10/26" → ISO */
export function parseBrDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    return `${y}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  }
  return null;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const DATE_HEADERS = ['data', 'date', 'data lancamento', 'data de lancamento', 'dt'];
const DESC_HEADERS = ['descricao', 'title', 'titulo', 'historico', 'lancamento', 'estabelecimento', 'description', 'memo'];
const AMOUNT_HEADERS = ['valor', 'amount', 'valor (r$)', 'valor r$', 'quantia'];

/**
 * Adivinha as colunas pelos cabeçalhos (Nubank, Inter, Itaú, C6…). null quando não dá para ter certeza:
 * a tela pede para a pessoa indicar as colunas.
 */
export function guessCsvMapping(table: CsvTable, kind: 'card' | 'account'): CsvMapping | null {
  const h = table.headers.map(norm);
  const find = (names: string[]) => h.findIndex((x) => names.includes(x) || names.some((n) => x.startsWith(n)));
  const date = find(DATE_HEADERS);
  const description = find(DESC_HEADERS);
  const amount = find(AMOUNT_HEADERS);
  if (date < 0 || description < 0 || amount < 0 || new Set([date, description, amount]).size < 3) return null;
  // fatura (ex.: Nubank "date,title,amount") lista compras positivas; extrato tem entradas positivas
  return { date, description, amount, expensesArePositive: kind === 'card' };
}

/** Linhas de um CSV já mapeado. */
export function parseCsv(table: CsvTable, mapping: CsvMapping, kind: 'card' | 'account'): ParsedStatement {
  const lines: ParsedLine[] = [];
  for (const row of table.rows) {
    const date = parseBrDate(row[mapping.date] ?? '');
    const value = parseBrNumber(row[mapping.amount] ?? '');
    const description = (row[mapping.description] ?? '').trim();
    if (!date || value === null || value === 0 || !description) continue;
    const amount = Math.round((mapping.expensesArePositive ? value : -value) * 100) / 100;
    const installment = kind === 'card' ? detectInstallment(description) : null;
    lines.push({
      date,
      description,
      amount,
      kind: classifyLine(description, amount, kind),
      ...(installment ? { installment: { current: installment.current, total: installment.total } } : {}),
    });
  }
  return { kind, format: 'csv', cardLast4s: [], lines };
}
