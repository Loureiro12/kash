import type { Plan, Tx } from '@kash/domain';
import { guessCsvMapping, parseBrDate, parseBrNumber, parseCsv, readCsv } from '../csv';
import { amountInText, classifyLine, detectInstallment, guessCategory, normalizeMerchant, stableId, suggestTitle } from '../normalize';
import { parseOfx } from '../ofx';
import { buildImportPlan, learnedRules, statementMonthOf, toAccountItems, toCardItems, type ImportPlanInput } from '../plan';
import { redactStatementText } from '../redact';
import type { ParsedStatement } from '../types';

const today = new Date(2026, 9, 10, 10); // 10 out 2026
const categories = ['Comida', 'Transporte', 'Lazer', 'Mercado', 'Assinaturas', 'Outros'];

describe('parcelas nas descrições (formatos dos bancos)', () => {
  it.each([
    ['Dm*Helphbomaxcom - Parcela 2/12', 2, 12, 'Dm*Helphbomaxcom'], // Nubank
    ['38826725Ramon (Parcela 12 de 12)', 12, 12, '38826725Ramon'], // Inter
    ['CP PARC DUO GOURMET (Parcela 06 de 12)', 6, 12, 'CP PARC DUO GOURMET'],
    ['MOVIDA RAC BHPC 02 DE 02', 2, 2, 'MOVIDA RAC BHPC'], // Caixa
    ['AIRBNB * HM8BDQD 05 DE 06', 5, 6, 'AIRBNB * HM8BDQD'],
    ['PgConta CARTOE 03/12', 3, 12, 'PgConta CARTOE'], // Itaú
    ['LOJA X PARC 03/10', 3, 10, 'LOJA X'],
  ])('%s', (text, current, total, rest) => {
    expect(detectInstallment(text)).toEqual({ current, total, rest });
  });

  it('não confunde valores e datas com parcela', () => {
    expect(detectInstallment('Github, Inc.')).toBeNull();
    expect(detectInstallment('TagItau *RecargaSAO')).toBeNull();
    expect(detectInstallment('LOJA 99/12')).toBeNull();
    expect(detectInstallment('Pagamento em 14 SET')).toBeNull();
  });
});

describe('nomes e categorias sem IA', () => {
  it('chave do estabelecimento ignora parcela, intermediário e números', () => {
    expect(normalizeMerchant('Mercadolivre*Mercadol - Parcela 1/3')).toBe('mercadolivre mercadol');
    expect(normalizeMerchant('EBW*Spotify - NuPay')).toBe('spotify');
    expect(normalizeMerchant('MP*GUILBIKES')).toBe('guilbikes');
    expect(normalizeMerchant('HOSTGATOR 07 DE 12')).toBe(normalizeMerchant('HOSTGATOR 08 DE 12'));
  });

  it('nome amigável', () => {
    expect(suggestTitle('EBW*Spotify - NuPay')).toBe('Spotify');
    expect(suggestTitle('Dm*Helphbomaxcom - Parcela 2/12')).toBe('HBO Max');
    expect(suggestTitle('Mercadolivre*Mercadol - Parcela 1/3')).toBe('Mercado Livre');
    expect(suggestTitle('POSTO WAP LTDA')).toBe('Posto Wap LTDA');
    expect(suggestTitle('Apple.Com/Bill')).toBe('Apple (App Store/iCloud)');
    expect(suggestTitle('IOF de "Github, Inc."')).toBe('IOF de "Github, Inc."');
  });

  it('categoria por palavra-chave, só se existir na lista', () => {
    expect(guessCategory('POSTO WAP LTDA', categories, 'Outros')).toBe('Transporte');
    expect(guessCategory('SUPER NOSSO PAMPULHA F', categories, 'Outros')).toBe('Mercado');
    expect(guessCategory('PIZZA PARA VOCE', categories, 'Outros')).toBe('Comida');
    expect(guessCategory('EBW*Spotify', ['Outros'], 'Outros')).toBe('Outros');
    expect(guessCategory('Dm*Helphbomaxcom - Parcela 2/12', categories, 'Outros')).toBe('Assinaturas');
    expect(guessCategory('Apple.Com/Bill', categories, 'Outros')).toBe('Assinaturas');
    expect(guessCategory('IOF de "Github, Inc."', categories, 'Mercado')).toBe('Outros');
  });

  it('classifica pelo sinal e palavras-chave', () => {
    expect(classifyLine('Pagamento em 14 SET', -558.95, 'card')).toBe('payment');
    expect(classifyLine('AJUSTE CRED PARC S/ JUROS', -0.04, 'card')).toBe('refund');
    expect(classifyLine('IOF de "Github, Inc."', 1.88, 'card')).toBe('fee');
    expect(classifyLine('Casar *Pre*Sente - Parcela 1/3', 153.45, 'card')).toBe('installment');
    expect(classifyLine('PIX RECEBIDO', -100, 'account')).toBe('income');
  });

  it('conferência: o valor aparece no texto do documento', () => {
    const text = '05 SET Loja R$ 22,90\n06 SET Outra 1.234,56D\nTotal 6.500,73';
    expect(amountInText(22.9, text)).toBe(true);
    expect(amountInText(1234.56, text)).toBe(true);
    expect(amountInText(2.9, text)).toBe(false);
    expect(amountInText(500.73, text)).toBe(false);
  });

  it('id estável', () => {
    expect(stableId('a|b')).toBe(stableId('a|b'));
    expect(stableId('a|b')).not.toBe(stableId('a|c'));
  });
});

describe('OFX', () => {
  const ofx = `OFXHEADER:100
<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>NU PAGAMENTOS</ORG></FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><ACCTID>12345-6</ACCTID></BANKACCTFROM><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005000000[-3:BRT]<TRNAMT>3000.00<FITID>abc1<MEMO>Transferência recebida - EMPRESA X</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261006<TRNAMT>-89.90<FITID>abc2<NAME>Compra no débito<MEMO>PADARIA &amp; CAFE</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

  it('extrato de conta: entrada e saída com o FITID', () => {
    const s = parseOfx(ofx);
    expect(s).toMatchObject({ kind: 'account', format: 'ofx', issuer: 'NU PAGAMENTOS' });
    expect(s.lines).toEqual([
      { date: '2026-10-05', description: 'Transferência recebida - EMPRESA X', amount: -3000, kind: 'income', bankId: 'abc1' },
      { date: '2026-10-06', description: 'Compra no débito - PADARIA & CAFE', amount: 89.9, kind: 'purchase', bankId: 'abc2' },
    ]);
  });

  it('fatura de cartão em OFX', () => {
    const card = `<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><CCACCTFROM><ACCTID>XXXX1234</ACCTID></CCACCTFROM><BANKTRANLIST>
<STMTTRN><DTPOSTED>20260915<TRNAMT>-50.97<FITID>f1<MEMO>Mercadolivre*Mercadol - Parcela 1/3</STMTTRN>
<STMTTRN><DTPOSTED>20260914<TRNAMT>558.95<FITID>f2<MEMO>Pagamento recebido</STMTTRN>
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;
    const s = parseOfx(card);
    expect(s.kind).toBe('card');
    expect(s.cardLast4s).toEqual(['1234']);
    expect(s.lines.map((l) => [l.kind, l.amount, l.installment?.current])).toEqual([
      ['payment', -558.95, undefined],
      ['installment', 50.97, 1],
    ]);
  });
});

describe('CSV', () => {
  it('números e datas brasileiros', () => {
    expect(parseBrNumber('1.234,56')).toBe(1234.56);
    expect(parseBrNumber('-R$ 10,00')).toBe(-10);
    expect(parseBrNumber('10.50')).toBe(10.5);
    expect(parseBrNumber('(12,00)')).toBe(-12);
    expect(parseBrDate('05/10/2026')).toBe('2026-10-05');
    expect(parseBrDate('5/9/26')).toBe('2026-09-05');
    expect(parseBrDate('2026-10-05')).toBe('2026-10-05');
  });

  it('fatura no formato "date,title,amount" (compras positivas)', () => {
    const table = readCsv('date,title,amount\n2026-09-05,Dm*Helphbomaxcom - Parcela 2/12,22.90\n2026-09-14,Pagamento recebido,-558.95\n2026-09-13,"EBW*Spotify, NuPay",23.90\n');
    const mapping = guessCsvMapping(table, 'card');
    expect(mapping).toEqual({ date: 0, description: 1, amount: 2, expensesArePositive: true });
    const s = parseCsv(table, mapping!, 'card');
    expect(s.lines.map((l) => [l.kind, l.amount, l.description])).toEqual([
      ['installment', 22.9, 'Dm*Helphbomaxcom - Parcela 2/12'],
      ['payment', -558.95, 'Pagamento recebido'],
      ['purchase', 23.9, 'EBW*Spotify, NuPay'],
    ]);
  });

  it('extrato com ";" e valor com sinal (entrada positiva)', () => {
    const table = readCsv('Data Lançamento;Descrição;Valor;Saldo\n05/10/2026;Pix recebido;3.000,00;3.100,00\n06/10/2026;Compra no débito - Mercado;-89,90;3.010,10\n');
    const mapping = guessCsvMapping(table, 'account')!;
    expect(mapping).toMatchObject({ date: 0, description: 1, amount: 2, expensesArePositive: false });
    expect(parseCsv(table, mapping, 'account').lines.map((l) => [l.kind, l.amount])).toEqual([
      ['income', -3000],
      ['purchase', 89.9],
    ]);
  });

  it('sem cabeçalhos conhecidos pede o mapeamento', () => {
    expect(guessCsvMapping(readCsv('a,b,c\n1,2,3'), 'card')).toBeNull();
  });
});

/** fatura de "setembro" (vence 13/10), como as do Nubank/Itaú, com valores fictícios */
const septemberInvoice: ParsedStatement = {
  kind: 'card',
  format: 'pdf',
  dueDate: '2026-10-13',
  total: 300.5,
  cardLast4s: ['1670'],
  lines: [
    { date: '2026-09-05', description: 'Dm*Streamingx - Parcela 2/12', amount: 20, kind: 'installment', installment: { current: 2, total: 12 } },
    { date: '2026-09-05', description: 'Mp *Lojafinal - Parcela 3/3', amount: 80, kind: 'installment', installment: { current: 3, total: 3 } },
    { date: '2026-09-15', description: 'Mercadolivre*Mercadol - Parcela 1/3', amount: 90, kind: 'installment', installment: { current: 1, total: 3 } },
    { date: '2026-09-13', description: 'EBW*Spotify - NuPay', amount: 21.9, kind: 'purchase' },
    { date: '2026-09-21', description: 'IOF de "Servico"', amount: 1.5, kind: 'fee' },
    { date: '2026-10-03', description: 'CAFE DO PONTO', amount: 12, kind: 'purchase' },
    { date: '2026-10-03', description: 'CAFE DO PONTO', amount: 12, kind: 'purchase' },
    { date: '2026-09-25', description: 'LOJA DEVOLVIDA', amount: 41.79, kind: 'purchase' },
    { date: '2026-09-26', description: 'LOJA DEVOLVIDA', amount: -41.79, kind: 'refund' },
    { date: '2026-09-14', description: 'Pagamento em 14 SET', amount: -500, kind: 'payment' },
    { date: '2026-09-14', description: 'Parcela futura - Parcela 4/12', amount: 20, kind: 'ignore' },
  ],
};

const base = (over: Partial<ImportPlanInput> = {}): ImportPlanInput => ({
  statement: septemberInvoice,
  target: { type: 'card', id: 'card1' },
  mode: 'installments',
  today,
  categories,
  rules: [],
  existing: { plans: [], txs: [] },
  ...over,
});

describe('revisão da fatura', () => {
  it('competência: mês antes do vencimento', () => {
    expect(statementMonthOf(septemberInvoice)).toBe('2026-09');
    expect(statementMonthOf({ ...septemberInvoice, dueDate: undefined })).toBe('2026-10');
  });

  it('"Só parceladas": parcelas em aberto viram parcelamento na parcela de agora; o resto fica de fora com motivo', () => {
    const plan = buildImportPlan(base());
    expect(plan).toMatchObject({ statementMonth: '2026-09', allowAll: true, mode: 'installments' });
    const bySection = (s: string) => plan.rows.filter((r) => r.section === s).map((r) => r.originalTitle);
    expect(bySection('installment')).toEqual(['Dm*Streamingx - Parcela 2/12', 'Mercadolivre*Mercadol - Parcela 1/3']);
    const hbo = plan.rows[0]!;
    expect(hbo).toMatchObject({ include: true, kashDate: '2026-10-01', installment: { current: 2, total: 12, currentNow: 3, remaining: 10, lastMonth: 'julho de 2027' } });
    expect(hbo.pastDate).toBeUndefined();
    const reasons = Object.fromEntries(plan.rows.filter((r) => r.section === 'ignored').map((r) => [r.originalTitle, r.reason]));
    expect(reasons['Mp *Lojafinal - Parcela 3/3']).toBe('Parcelamento já quitado (última parcela em setembro)');
    expect(reasons['EBW*Spotify - NuPay']).toBe('Compra à vista (modo "Só parceladas")');
    expect(reasons['LOJA DEVOLVIDA']).toBe('Compra estornada na mesma fatura');
    expect(reasons['Pagamento em 14 SET']).toBe('Pagamento da fatura');
    expect(reasons['Parcela futura - Parcela 4/12']).toMatch(/Não é um lançamento/);
    expect(toCardItems(plan.rows)).toEqual([
      expect.objectContaining({ type: 'plan', title: 'Streamingx', per: 20, installments: 12, current: 3, current_date: '2026-10-01' }),
      expect.objectContaining({ type: 'plan', title: 'Mercado Livre', per: 90, installments: 3, current: 2 }),
    ]);
  });

  it('"Tudo" na fatura recente: compras à vista no mês da fatura e a parcela da própria fatura', () => {
    const plan = buildImportPlan(base({ mode: 'all' }));
    const purchases = plan.rows.filter((r) => r.section === 'purchase');
    expect(purchases.map((r) => [r.title, r.kashDate, r.category])).toEqual([
      ['Spotify', '2026-09-13', 'Assinaturas'],
      ['IOF de "Servico"', '2026-09-21', 'Outros'],
      ['Cafe Do Ponto', '2026-09-30', 'Comida'],
      ['Cafe Do Ponto', '2026-09-30', 'Comida'],
    ]);
    // duas compras iguais no mesmo dia não colidem
    expect(new Set(purchases.map((r) => r.externalId)).size).toBe(4);
    expect(plan.rows[0]!.pastDate).toBe('2026-09-05');
    expect(toCardItems(plan.rows)[0]).toMatchObject({ past_date: '2026-09-05', past_installment: 2 });
    expect(plan.check).toEqual({ included: 157.4, statementTotal: 300.5 });
  });

  it('fatura antiga: só parcelamentos, mesmo pedindo "Tudo"', () => {
    const july = { ...septemberInvoice, dueDate: '2026-08-15' };
    const plan = buildImportPlan(base({ statement: july, mode: 'all' }));
    expect(plan).toMatchObject({ statementMonth: '2026-07', allowAll: false, mode: 'installments' });
    expect(plan.rows.find((r) => r.originalTitle === 'EBW*Spotify - NuPay')?.reason).toBe('Compra à vista de fatura antiga (só parcelamentos entram)');
    // 2/12 em julho → 5/12 em outubro; 1/3 em julho → quitado em setembro
    expect(plan.rows[0]!.installment?.currentNow).toBe(5);
    expect(plan.rows.find((r) => r.originalTitle.startsWith('Mercadolivre'))?.section).toBe('ignored');
  });

  it('mesmo parcelamento em outra fatura tem o mesmo id (não duplica ao importar o mês seguinte)', () => {
    const october = { ...septemberInvoice, dueDate: '2026-11-13', lines: [{ ...septemberInvoice.lines[0]!, installment: { current: 3, total: 12 }, description: 'Dm*Streamingx - Parcela 3/12' }] };
    const a = buildImportPlan(base()).rows[0]!;
    const b = buildImportPlan(base({ statement: october })).rows[0]!;
    expect(b.installment?.currentNow).toBe(3);
    expect(b.externalId).toBe(a.externalId);
  });

  it('parcelamento parecido já cadastrado à mão e compra igual no mês começam desmarcados', () => {
    const plans: Plan[] = [{ id: 'p', title: 'Streaming', category: 'Assinaturas', cardId: 'card1', installments: 12, current: 3, perInstallment: 20 }];
    const txs: Tx[] = [{ id: 't', title: 'Spotify', category: 'Assinaturas', amount: -21.9, date: '2026-09-13', sourceId: 'card1' }];
    const plan = buildImportPlan(base({ mode: 'all', existing: { plans, txs } }));
    expect(plan.rows[0]).toMatchObject({ duplicate: true, include: false });
    expect(plan.rows.find((r) => r.title === 'Spotify')).toMatchObject({ duplicate: true, include: false });
  });

  it('regras aprendidas mandam no nome e na categoria; o que a pessoa muda vira regra', () => {
    const rules = [{ pattern: 'mercadolivre mercadol', title: 'Fone (Mercado Livre)', category: 'Lazer' }];
    const plan = buildImportPlan(base({ rules }));
    const ml = plan.rows.find((r) => r.originalTitle.startsWith('Mercadolivre'))!;
    expect([ml.title, ml.category]).toEqual(['Fone (Mercado Livre)', 'Lazer']);
    const edited = plan.rows.map((r) => (r.key === '0' ? { ...r, title: 'Max', category: 'Lazer' } : r));
    expect(learnedRules(edited, plan.rows)).toEqual([{ pattern: 'streamingx', title: 'Max', category: 'Lazer' }]);
  });

  it('sugestões da IA entram quando não há regra', () => {
    const statement = { ...septemberInvoice, lines: [{ ...septemberInvoice.lines[3]!, suggestedTitle: 'Spotify Premium', suggestedCategory: 'Lazer' }] };
    const row = buildImportPlan(base({ statement, mode: 'all' })).rows[0]!;
    expect([row.title, row.category]).toEqual(['Spotify Premium', 'Lazer']);
  });
});

describe('revisão do extrato da conta', () => {
  const statement: ParsedStatement = {
    kind: 'account',
    format: 'ofx',
    cardLast4s: [],
    lines: [
      { date: '2026-10-05', description: 'Pix recebido EMPRESA', amount: -3000, kind: 'income', bankId: 'fit1' },
      { date: '2026-10-06', description: 'Pagamento fatura cartão', amount: 558.95, kind: 'purchase', bankId: 'fit2' },
      { date: '2026-10-07', description: 'Supermercado BH', amount: 120, kind: 'purchase' },
    ],
  };

  it('entrada, pagamento de fatura e gasto; id do banco quando houver', () => {
    const plan = buildImportPlan(base({ statement, target: { type: 'account', id: 'acc1' } }));
    expect(plan.rows.map((r) => [r.section, r.category, r.externalId.slice(0, 4)])).toEqual([
      ['income', 'Entrada', 'ofx:'],
      ['purchase', 'Fatura', 'ofx:'],
      ['purchase', 'Mercado', expect.any(String)],
    ]);
    expect(toAccountItems(plan.rows).map((i) => i.amount)).toEqual([3000, -558.95, -120]);
    expect(plan.check.included).toBe(2321.05);
  });
});

describe('texto do PDF antes da IA', () => {
  it('tira CPF, cartão, endereço, CEP, código de barras e o nome do titular', () => {
    const text = [
      'ANDRÉ SOUZA TESTE',
      'R PONTALINA 156',
      '30882520 BELO HORIZONTE MG',
      'CPF 123.456.789-09',
      'Cartão 4831.XXXX.XXXX.1777',
      '5364****6320 18/09/2026 R$ 1.854,75',
      '10498.18824 62002.131241 38709.001119 1 00000000000000',
      'Olá, André Souza! Sua fatura chegou',
      '05 SET Padaria São João R$ 22,90',
    ].join('\n');
    const out = redactStatementText(text, { names: ['André Souza Teste'] });
    expect(out).not.toMatch(/123\.456|PONTALINA|30882520|4831|5364|10498|Souza/i);
    expect(out).toContain('•••• 1777');
    expect(out).toContain('•••• 6320 18/09/2026 R$ 1.854,75');
    expect(out).toContain('Padaria São João R$ 22,90');
    expect(out).toContain('TITULAR');
  });
});
