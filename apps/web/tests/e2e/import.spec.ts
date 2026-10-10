import AxeBuilder from '@axe-core/playwright';
import { createClient } from '@supabase/supabase-js';
import { createAccount, createCard, createKashClient, signIn } from '@kash/supabase-client';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import WebSocket from 'ws';

if (!('WebSocket' in globalThis)) Object.assign(globalThis, { WebSocket });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = 'senha-123456';

/** datas relativas a hoje (as regras dependem do mês da fatura) */
const now = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prev = (day: number) => iso(new Date(now.getFullYear(), now.getMonth() - 1, day));
const thisMonth = (day: number) => iso(new Date(now.getFullYear(), now.getMonth(), day));
const br = (isoDate: string) => isoDate.split('-').reverse().join('/');

async function setup(info: TestInfo, prefix: string) {
  const admin = createClient(url!, service!, { auth: { persistSession: false } });
  const email = `${prefix}-${info.project.name}-${Date.now()}-${Math.round(Math.random() * 1e4)}@kash.test`;
  const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { name: 'Lara Teste Mendes' } });
  await admin.from('profiles').update({ onboarding_done_at: new Date().toISOString(), checklist_hidden_at: new Date().toISOString() }).eq('id', data.user!.id);
  const db = createKashClient({ url: url!, anonKey: anon!, options: { auth: { persistSession: false } } });
  await signIn(db, { email, password: PASSWORD });
  return { email, db };
}

async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('home-title')).toBeVisible();
}

async function seriousA11y(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.target} ${v.nodes[0]?.any[0]?.message ?? ''}`);
}

/** PDF mínimo de verdade (uma página, texto simples) para o pdf.js ler no navegador */
function makePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[()\\]/g, (m) => `\\${m}`);
  const content = `BT /F1 11 Tf 40 780 Td ${lines.map((l, i) => `${i ? '0 -16 Td ' : ''}(${esc(l)}) Tj`).join(' ')} ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

test.describe('importar fatura e extrato', () => {
  test.skip(!url || !service, 'Supabase local não está rodando');

  test('CSV da fatura: só parceladas, renomear, reimportar sem duplicar e desfazer', async ({ page }, info) => {
    const { email, db } = await setup(info, 'imp-csv');
    const card = await createCard(db, { name: 'Roxinho', last4: '1670', limit: 6400, closingDay: 5, dueDay: 13, gradientId: 'purple' });
    await login(page, email);
    const csv = ['date,title,amount', `${prev(5)},Dm*Streamingx - Parcela 2/12,22.90`, `${prev(15)},Mercadolivre*Mercadol - Parcela 1/3,90.93`, `${prev(13)},EBW*Spotify - NuPay,23.90`, `${prev(14)},Pagamento recebido,-558.95`, `${prev(5)},Mp *Lojafinal - Parcela 3/3,88.46`].join('\n');

    await page.goto('/app/cartoes');
    await page.getByTestId('cards-import').click();
    await expect(page.getByTestId('page-title')).toHaveText('Importar');
    await expect(page.getByTestId(`import-target-${card.id}`)).toHaveAttribute('aria-checked', 'true');
    expect(await seriousA11y(page)).toEqual([]);
    await page.getByTestId('import-file').setInputFiles({ name: 'fatura.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByTestId('import-read').click();

    await expect(page.getByTestId('import-installments')).toContainText('(2 de 2)');
    expect(await seriousA11y(page)).toEqual([]);
    const ignored = page.getByTestId('import-ignored');
    await ignored.locator('summary').click();
    await expect(ignored).toContainText('Pagamento da fatura');
    await expect(ignored).toContainText('Parcelamento já quitado');
    await expect(ignored).toContainText('Compra à vista (modo "Só parceladas")');
    await expect(page.getByTestId('import-installments')).toContainText('3/12 agora');

    // renomeia o streaming (nome original continua visível)
    await page.getByTestId('import-row-0-title').fill('Max (streaming)');
    await expect(page.getByTestId('import-row-0')).toContainText('Dm*Streamingx - Parcela 2/12');
    await page.getByTestId('import-save').click();
    await expect(page.getByTestId('import-done')).toContainText('2 parcelamentos criados');

    await page.goto('/app/cartoes');
    await expect(page.getByTestId('cards-plans')).toContainText('Max (streaming)');
    await expect(page.getByText('3 de 12 pagas')).toBeVisible();

    // de novo o mesmo arquivo: o nome vem da regra aprendida e nada é duplicado
    await page.getByTestId('cards-import').click();
    await page.getByTestId('import-file').setInputFiles({ name: 'fatura.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByTestId('import-read').click();
    await expect(page.getByTestId('import-row-0-title')).toHaveValue('Max (streaming)');
    await expect(page.getByTestId('import-installments')).toContainText('possível duplicado');
    await expect(page.getByTestId('import-installments')).toContainText('(0 de 2)');
    await expect(page.getByTestId('import-save')).toBeDisabled();

    // desfazer pelo histórico
    await page.getByTestId('import-cancel').click();
    await page.getByTestId('import-history').getByRole('button', { name: 'Desfazer' }).first().click();
    await page.getByTestId('confirm-yes').click();
    await expect(page.getByTestId('toast-message')).toHaveText('Importação desfeita');
    await expect(page.getByTestId('import-history')).toContainText('desfeita');
  });

  test('"Tudo" na fatura mais recente: compras entram e a fatura fica pronta para pagar', async ({ page }, info) => {
    const { email, db } = await setup(info, 'imp-tudo');
    await createCard(db, { name: 'Roxinho', last4: '1670', limit: 6400, closingDay: 5, dueDay: 13, gradientId: 'purple' });
    await createAccount(db, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 1000, color: '#C6F432' });
    await login(page, email);
    const csv = ['date,title,amount', `${prev(5)},Dm*Streamingx - Parcela 2/12,22.90`, `${prev(13)},EBW*Spotify - NuPay,23.90`, `${prev(20)},POSTO WAP LTDA,100.00`].join('\n');
    await page.goto('/app/importar');
    await page.getByTestId('import-file').setInputFiles({ name: 'fatura.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByTestId('import-read').click();
    await page.getByTestId('import-mode-all').click();
    await expect(page.getByTestId('import-purchases')).toContainText('(2 de 2)');
    await expect(page.getByTestId('import-row-2-category')).toHaveValue('Transporte');
    await expect(page.getByTestId('import-total')).toContainText('1 parcelamento e 2 lançamentos · R$ 146,80');
    await page.getByTestId('import-save').click();
    await expect(page.getByTestId('import-done')).toBeVisible();
    await page.goto('/app/cartoes');
    // fatura do mês passado: compras + a parcela daquele mês
    await expect(page.getByTestId('cards-invoice-total')).toHaveText('R$ 146,80');
    await expect(page.getByTestId('cards-invoice-pay')).toBeVisible();
  });

  test('OFX do extrato mantendo o saldo de hoje', async ({ page }, info) => {
    const { email, db } = await setup(info, 'imp-ofx');
    const acc = await createAccount(db, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 1000, color: '#C6F432' });
    await login(page, email);
    const ofx = `OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>${thisMonth(2).replace(/-/g, '')}<TRNAMT>3000.00<FITID>a1<MEMO>Pix recebido EMPRESA X</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>${thisMonth(3).replace(/-/g, '')}<TRNAMT>-120.00<FITID>a2<MEMO>Supermercado BH</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    await page.goto('/app/contas');
    await page.getByTestId('accounts-import').click();
    await expect(page.getByTestId(`import-target-${acc.id}`)).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('import-file').setInputFiles({ name: 'extrato.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from(ofx) });
    await page.getByTestId('import-read').click();
    await expect(page.getByTestId('import-incomes')).toContainText('Pix recebido EMPRESA X');
    await expect(page.getByTestId('import-keep-balance')).toBeChecked();
    await page.getByTestId('import-save').click();
    await expect(page.getByTestId('import-done')).toBeVisible();
    await page.goto('/app/contas');
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ 1.000,00');
    await page.goto('/app/lancamentos');
    await expect(page.getByTestId('tx-total-income')).toHaveText('+ R$ 3.000,00');
  });

  test('PDF: lê no navegador, manda só o texto limpo para a IA e confere os valores', async ({ page }, info) => {
    const { email, db } = await setup(info, 'imp-pdf');
    const card = await createCard(db, { name: 'Roxinho', last4: '1670', limit: 6400, closingDay: 5, dueDay: 13, gradientId: 'purple' });
    await login(page, email);
    const due = thisMonth(13);
    const pdf = makePdf([
      'LARA TESTE MENDES',
      'CPF 123.456.789-09',
      `Vencimento ${br(due)}  Total R$ 46,80`,
      `${br(prev(5))} Dm*Streamingx - Parcela 2/12 R$ 22,90`,
      `${br(prev(13))} EBW*Spotify - NuPay R$ 23,90`,
    ]);
    let sentText = '';
    await page.route('**/functions/v1/import-assist', async (route) => {
      sentText = (route.request().postDataJSON() as { text: string }).text;
      await route.fulfill({
        json: {
          statement: {
            kind: 'card',
            format: 'pdf',
            issuer: 'Banco Teste',
            dueDate: due,
            total: 46.8,
            cardLast4s: ['1670'],
            lines: [
              { date: prev(5), description: 'Dm*Streamingx - Parcela 2/12', amount: 22.9, kind: 'installment', installment: { current: 2, total: 12 }, suggestedTitle: 'Streaming X', suggestedCategory: 'Assinaturas' },
              { date: prev(13), description: 'EBW*Spotify - NuPay', amount: 23.9, kind: 'purchase', suggestedTitle: 'Spotify' },
              { date: prev(14), description: 'Linha inventada', amount: 99.99, kind: 'purchase' },
            ],
          },
        },
      });
    });
    await page.goto('/app/importar');
    await page.getByTestId(`import-target-${card.id}`).click();
    await page.getByTestId('import-file').setInputFiles({ name: 'fatura.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByTestId('import-read').click();
    await expect(page.getByTestId('import-error')).toContainText('autorize');
    await page.getByTestId('import-ai-consent').check();
    await page.getByTestId('import-read').click();
    await expect(page.getByTestId('import-summary')).toContainText('Banco Teste');
    expect(sentText).toContain('Dm*Streamingx - Parcela 2/12');
    expect(sentText).not.toMatch(/123\.456|LARA TESTE MENDES/);
    await expect(page.getByTestId('import-row-0-title')).toHaveValue('Streaming X');
    await page.getByTestId('import-mode-all').click();
    // valor que não está no documento fica marcado para conferir
    await expect(page.getByTestId('import-row-2')).toContainText('conferir valor');
    await expect(page.getByTestId('import-row-1')).not.toContainText('conferir valor');
  });
});
