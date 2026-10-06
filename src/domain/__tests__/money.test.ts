import { applyKeypadKey, digitsToAmount, formatBRL, formatMoney, HIDDEN_VALUE, parseMoneyInput, round2 } from '../money';

describe('formatBRL', () => {
  it('formata com separador de milhar e 2 casas', () => {
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(4225.5)).toBe('R$ 4.225,50');
    expect(formatBRL(1000000)).toBe('R$ 1.000.000,00');
  });
  it('ignora o sinal', () => {
    expect(formatBRL(-14.5)).toBe('R$ 14,50');
  });
  it('arredonda centavos', () => {
    expect(formatBRL(199.9 * 7)).toBe('R$ 1.399,30');
  });
});

describe('formatMoney', () => {
  it('oculta valores quando pedido', () => {
    expect(formatMoney(10, true)).toBe(HIDDEN_VALUE);
    expect(formatMoney(10, false)).toBe('R$ 10,00');
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1234.56', 1234.56],
    ['R$ 50', 50],
    ['', 0],
    ['abc', 0],
    ['2500', 2500],
  ])('%s → %s', (raw, expected) => {
    expect(parseMoneyInput(raw)).toBe(expected);
  });
});

describe('teclado numérico', () => {
  it('digita em centavos', () => {
    let d = '';
    for (const k of ['1', '2', '5', '0']) d = applyKeypadKey(d, k);
    expect(digitsToAmount(d)).toBe(12.5);
  });
  it('apaga com del e remove zeros à esquerda', () => {
    expect(applyKeypadKey('125', 'del')).toBe('12');
    expect(applyKeypadKey('', '0')).toBe('');
    expect(applyKeypadKey('', '00')).toBe('');
  });
  it('limita a 8 dígitos', () => {
    expect(applyKeypadKey('12345678', '9')).toBe('12345678');
    expect(applyKeypadKey('1234567', '00')).toBe('1234567');
  });
});

describe('round2', () => {
  it('arredonda para 2 casas', () => {
    expect(round2(1200 / 7)).toBe(171.43);
  });
});
