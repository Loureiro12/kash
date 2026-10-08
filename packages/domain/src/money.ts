/**
 * Formatação monetária determinística (não depende de Intl do runtime).
 * `formatBRL(1234.5)` → "R$ 1.234,50". Sempre valor absoluto; o sinal é
 * responsabilidade de quem exibe (− / +).
 */
export function formatBRL(value: number): string {
  const abs = Math.abs(value);
  const cents = Math.round(abs * 100);
  const int = Math.floor(cents / 100);
  const frac = cents % 100;
  const intStr = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${intStr},${frac.toString().padStart(2, '0')}`;
}

export const HIDDEN_VALUE = 'R$ ••••';

/** Formata respeitando a preferência "ocultar valores". */
export function formatMoney(value: number, hidden: boolean): string {
  return hidden ? HIDDEN_VALUE : formatBRL(value);
}

/** Converte string digitada ("1.234,56", "1234.56", "R$ 50") em número. */
export function parseMoneyInput(raw: string): number {
  const cleaned = String(raw).replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  // Se tem vírgula, trata vírgula como decimal e ponto como milhar (pt-BR).
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Maior valor aceito por um campo com máscara: R$ 999.999.999,99 (11 dígitos de centavos). */
export const MAX_MONEY_DIGITS = 11;

/**
 * Texto de um campo com máscara de dinheiro → valor. Só os dígitos contam e entram pelos centavos,
 * como numa maquininha: "5" → 0,05 · "R$ 0,051" → 0,51 · "R$ 12,3" (apagou um dígito) → 1,23.
 * Colar "1.234,56" também funciona (→ 1234,56).
 */
export function moneyFromTyped(text: string): number {
  const digits = String(text).replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_MONEY_DIGITS);
  return digits ? parseInt(digits, 10) / 100 : 0;
}

/** Dígitos do teclado (centavos) → valor. "1250" → 12.5 */
export function digitsToAmount(digits: string): number {
  const cents = parseInt(digits || '0', 10);
  return cents / 100;
}

/** Aplica uma tecla do teclado numérico à string de dígitos (máx. 8). */
export function applyKeypadKey(digits: string, key: string, maxDigits = 8): string {
  if (key === 'del') return digits.slice(0, -1);
  if (digits.length >= maxDigits) return digits;
  const next = (digits + key).replace(/^0+/, '');
  return next.length > maxDigits ? digits : next;
}

/** Arredonda para 2 casas (parcela). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
