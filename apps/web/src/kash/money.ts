import { formatBRL } from '@kash/domain';

/** Texto exibido no campo de dinheiro: vazio para 0, "R$ 1.234,56" ou "-R$ 50,00". */
export function maskedMoney(value: number): string {
  if (value === 0) return '';
  return `${value < 0 ? '-' : ''}${formatBRL(value)}`;
}

/** valor do "Lançar gasto" digitado em centavos, até 8 dígitos (R$ 999.999,99) — handoff */
export const MAX_AMOUNT_DIGITS = 8;

/** Texto do campo → dígitos dos centavos ("R$ 12,90" + "5" → "12905"). */
export const digitsFrom = (text: string) => text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_AMOUNT_DIGITS);

export const amountFromDigits = (digits: string) => (digits ? parseInt(digits, 10) / 100 : 0);
