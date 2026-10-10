import AxeBuilder from '@axe-core/playwright';
import { addInstallmentPurchase, createAccount, createBill, createCard, createGoal, createKashClient, createTransaction, signIn, updateSettings } from '@kash/supabase-client';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import WebSocket from 'ws';

// supabase-js no Node 20 precisa de um WebSocket (realtime), mesmo sem usar
if (!('WebSocket' in globalThis)) Object.assign(globalThis, { WebSocket });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasBackend = !!(url && anon && service);
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const PASSWORD = 'senha-123456';

async function createUser(info: TestInfo, prefix: string, name = 'Lara Mendes') {
  const admin = createClient(url!, service!, { auth: { persistSession: false } });
  const email = `${prefix}-${info.project.name}-${Date.now()}-${Math.round(Math.random() * 1e4)}@kash.test`;
  const { error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { name } });
  expect(error).toBeNull();
  return email;
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/entrar');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('home-title')).toBeVisible();
}

/** abre uma página do app e espera o título */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId('page-title').or(page.getByTestId('home-title')).first()).toBeVisible();
}

async function save(page: Page, buttonTestId: string, modalTestId: string) {
  await page.getByTestId(buttonTestId).click();
  await expect(page.getByTestId(modalTestId)).toHaveCount(0);
}

async function seriousA11y(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.target} ${v.nodes[0]?.any[0]?.message ?? ""}`);
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Kash web — sem sessão', () => {
  test('a área logada manda para o login, que é acessível', async ({ page }) => {
    test.skip(!hasBackend, 'Supabase local não está rodando');
    await page.goto('/app/cartoes');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Bem-vindo de volta' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    expect(await seriousA11y(page)).toEqual([]);
  });

  test('login valida campos e recusa senha errada', async ({ page }) => {
    test.skip(!hasBackend, 'Supabase local não está rodando');
    await page.goto('/entrar');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Informe seu e-mail.')).toBeVisible();
    await page.getByTestId('login-email').fill('ninguem@kash.test');
    await page.getByTestId('login-password').fill('errada-123');
    await page.getByTestId('login-password-toggle').click();
    await expect(page.getByTestId('login-password')).toHaveAttribute('type', 'text');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('E-mail ou senha incorretos.');
  });
});

test.describe('Kash web — com o Supabase local', () => {
  test.skip(!hasBackend, 'Supabase local não está rodando');

  test('criar conta leva ao início com o nome na saudação', async ({ page }, info) => {
    await page.goto('/criar-conta');
    await page.getByTestId('signup-name').fill('Bia Souza');
    await page.getByTestId('signup-email').fill(`signup-${info.project.name}-${Date.now()}@kash.test`);
    await page.getByTestId('signup-password').fill('Senha123!');
    await page.getByTestId('signup-submit').click();
    await expect(page.getByText('Precisa aceitar os termos pra continuar.')).toBeVisible();
    await page.getByTestId('signup-terms').check();
    await page.getByTestId('signup-submit').click();
    await expect(page.getByTestId('home-title')).toHaveText(/, Bia$/);
    await expect(page.getByTestId('home-txs-empty')).toBeVisible();
  });

  test('fluxo completo: conta, cartão, gasto, parcelado, editar, excluir e desfazer', async ({ page }, info) => {
    await login(page, await createUser(info, 'fluxo'));

    // conta bancária
    await open(page, '/app/contas');
    await page.getByTestId('accounts-empty-add').click();
    await page.getByTestId('add-account-name').fill('Conta do estágio');
    await page.getByTestId('add-account-bank').fill('Nubank');
    await page.getByTestId('add-account-balance').pressSequentially('150000');
    await expect(page.getByTestId('add-account-balance')).toHaveValue('R$ 1.500,00');
    await save(page, 'add-account-save', 'modal-account');
    await expect(page.getByTestId('toast-message')).toHaveText('Conta “Conta do estágio” adicionada');
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ 1.500,00');

    // cartão
    await open(page, '/app/cartoes');
    await page.getByTestId('cards-empty-add').click();
    await expect(page.getByTestId('add-card-save')).toBeDisabled();
    await page.getByTestId('add-card-name').fill('Cartão roxo');
    await page.getByTestId('add-card-last4').fill('48a21');
    await expect(page.getByTestId('add-card-last4')).toHaveValue('4821');
    await page.getByTestId('add-card-limit').pressSequentially('300000');
    await page.getByTestId('add-card-closing').fill('28');
    await page.getByTestId('add-card-due').fill('5');
    await page.getByTestId('add-card-color-purple').click();
    await save(page, 'add-card-save', 'modal-card');
    await expect(page.getByTestId('cards-limit')).toContainText('Cartão roxo');

    // gasto à vista na conta (botão da tela) — debita o saldo
    await open(page, '/app');
    await page.getByTestId('home-empty-new-tx').click();
    await expect(page.getByTestId('expense-save')).toBeDisabled();
    await page.getByTestId('expense-amount').pressSequentially('5000');
    await expect(page.getByTestId('expense-amount')).toHaveValue('R$ 50,00');
    await page.getByTestId('chip-cat-Mercado').click();
    await page.getByRole('radio', { name: 'Conta do estágio' }).click();
    await page.getByTestId('expense-note').fill('Feira');
    await save(page, 'expense-save', 'modal-transaction');
    await expect(page.getByTestId('toast-message')).toHaveText('R$ 50,00 lançado em Mercado');
    await expect(page.getByTestId('home-balance')).toHaveText('R$ 1.450,00');

    // parcelado no cartão: 3x de R$ 400
    await page.getByTestId('home-new-tx').click();
    await page.getByTestId('expense-amount').pressSequentially('120000');
    await page.getByTestId('chip-cat-Lazer').click();
    await page.getByTestId('expense-inst-inc').click();
    await page.getByTestId('expense-inst-inc').click();
    await expect(page.getByTestId('expense-installments-label')).toHaveText('3x de R$ 400,00');
    await page.getByTestId('expense-note').fill('Tênis de corrida');
    await save(page, 'expense-save', 'modal-transaction');
    await expect(page.getByTestId('toast-message')).toHaveText('3x de R$ 400,00 no cartão');
    await open(page, '/app/cartoes');
    await expect(page.getByText('1 de 3 pagas')).toBeVisible();
    await open(page, '/app/previsao');
    await expect(page.getByTestId('forecast-month-total')).toHaveText('R$ 400,00');
    await page.getByTestId('forecast-month-3').click();
    await expect(page.getByTestId('forecast-month-total')).toHaveText('R$ 0,00');
    await expect(page.getByTestId('forecast-cumulative')).toHaveText('R$ 800,00');

    // editar o gasto da conta (valor) e conferir o saldo
    await open(page, '/app/lancamentos');
    await page.getByTestId('tx-search').fill('feira');
    await expect(page.getByTestId('tx-count')).toHaveText('1 lançamento');
    await page.getByRole('button', { name: /^Feira,/ }).click();
    await expect(page.getByRole('heading', { name: 'Editar lançamento' })).toBeVisible();
    await page.getByTestId('expense-amount').fill('');
    await page.getByTestId('expense-amount').pressSequentially('8000');
    await save(page, 'expense-save', 'modal-transaction');
    await expect(page.getByTestId('toast-message')).toHaveText('Lançamento atualizado');
    await expect(page.getByTestId('tx-total-spent')).toHaveText('− R$ 80,00');

    // excluir e desfazer
    await page.getByRole('button', { name: /^Feira,/ }).click();
    await page.getByTestId('expense-delete').click();
    await page.getByTestId('confirm-yes').click();
    await expect(page.getByTestId('toast-message')).toHaveText('Lançamento excluído');
    await expect(page.getByTestId('tx-empty')).toBeVisible();
    await page.getByTestId('toast-action').click();
    await expect(page.getByRole('button', { name: /^Feira,/ })).toBeVisible();

    // relatório por categoria
    await open(page, '/app/relatorio');
    await expect(page.getByTestId('report-cat-Lazer')).toContainText('R$ 400,00');
    await expect(page.getByTestId('report-cat-Mercado')).toContainText('R$ 80,00');
  });

  test('compra parcelada antiga: lança só a parcela do mês', async ({ page }, info) => {
    await login(page, await createUser(info, 'antiga'));
    await open(page, '/app/cartoes');
    await page.getByTestId('cards-empty-add').click();
    await page.getByTestId('add-card-name').fill('Principal');
    await page.getByTestId('add-card-last4').fill('1234');
    await page.getByTestId('add-card-limit').pressSequentially('500000');
    await save(page, 'add-card-save', 'modal-card');

    await page.keyboard.press('n');
    await expect(page.getByTestId('modal-transaction')).toBeVisible();
    await page.getByTestId('expense-amount').pressSequentially('80000');
    for (let i = 0; i < 7; i++) await page.getByTestId('expense-inst-inc').click();
    for (let i = 0; i < 4; i++) await page.getByTestId('expense-first-month-prev').click();
    await expect(page.getByTestId('expense-plan-summary')).toContainText('4 parcelas já pagas');
    await page.getByTestId('expense-note').fill('Celular');
    await save(page, 'expense-save', 'modal-transaction');
    await expect(page.getByTestId('toast-message')).toHaveText('Parcela 5/8 lançada · 4 já pagas');
    await expect(page.getByText('5 de 8 pagas')).toBeVisible();
  });

  test('contas fixas, metas, categorias e preferências', async ({ page }, info) => {
    await login(page, await createUser(info, 'extras'));
    await open(page, '/app/contas');
    await page.getByTestId('accounts-empty-add').click();
    await page.getByTestId('add-account-name').fill('Corrente');
    await page.getByTestId('add-account-balance').pressSequentially('100000');
    await save(page, 'add-account-save', 'modal-account');

    // conta fixa: criar e marcar como paga (debita a conta)
    await open(page, '/app/contas-fixas');
    await page.getByTestId('bills-empty-add').click();
    await page.getByTestId('add-bill-name').fill('Internet');
    await page.getByTestId('add-bill-amount').pressSequentially('9990');
    await page.getByTestId('add-bill-day').fill('10');
    await page.getByRole('radio', { name: 'Corrente' }).click();
    await save(page, 'add-bill-save', 'modal-bill');
    await expect(page.getByTestId('bills-paid-count')).toHaveText('0/1');
    await page.getByRole('checkbox', { name: /^Internet/ }).click();
    await expect(page.getByTestId('bills-paid-count')).toHaveText('1/1');
    await expect(page.getByRole('checkbox', { name: /^Internet/ })).toHaveAttribute('aria-checked', 'true');
    await open(page, '/app/contas');
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ 900,10');

    // meta: criar, guardar R$ 50
    await open(page, '/app/metas');
    await page.getByTestId('goals-empty-add').click();
    await page.getByTestId('add-goal-name').fill('Viagem');
    await page.getByTestId('add-goal-target').pressSequentially('100000');
    await page.getByTestId('add-goal-monthly').pressSequentially('20000');
    await expect(page.getByTestId('add-goal-eta')).toHaveText('Faltam 5 meses nesse ritmo');
    await save(page, 'add-goal-save', 'modal-goal');
    await page.getByRole('button', { name: '+ Guardar R$ 50' }).click();
    await expect(page.getByTestId('toast-message')).toHaveText('R$ 50,00 guardados em “Viagem”');
    await expect(page.getByTestId('goals-total')).toHaveText('R$ 50,00');

    // categoria nova aparece no lançamento
    await open(page, '/app/perfil/categorias');
    await page.getByTestId('categories-add').click();
    await page.getByTestId('category-name').fill('Pets');
    await save(page, 'category-save', 'modal-category');
    await expect(page.getByTestId('category-Pets')).toBeVisible();
    await page.keyboard.press('n');
    await expect(page.getByTestId('chip-cat-Pets')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-transaction')).toHaveCount(0);

    // ocultar valores e tema claro (persistem no perfil)
    await open(page, '/app/contas');
    await page.getByRole('button', { name: /Ocultar valores/ }).filter({ visible: true }).click();
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ ••••');
    await page.getByRole('button', { name: /Mostrar valores/ }).filter({ visible: true }).click();
    await open(page, '/app/perfil');
    // lembrete por e-mail: opt-in, desligado por padrão
    const reminder = page.getByTestId('profile-reminder-switch');
    await expect(reminder).toHaveAttribute('aria-checked', 'false');
    await reminder.click();
    await expect(page.getByTestId('toast-message')).toContainText('Lembretes por e-mail ligados');
    await expect(reminder).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('profile-theme-switch').click();
    await expect(page.locator('.kash-app')).toHaveAttribute('data-theme', 'light');
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page.getByTestId('page-title')).toBeVisible();
    await expect(page.locator('.kash-app')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('profile-reminder-switch')).toHaveAttribute('aria-checked', 'true');
    expect(await seriousA11y(page)).toEqual([]);

    // limite mensal
    await open(page, '/app/perfil/limite');
    await page.getByTestId('budget-input').fill('');
    await page.getByTestId('budget-input').pressSequentially('250000');
    await page.getByTestId('budget-save').click();
    await expect(page.getByTestId('profile-budget')).toContainText('R$ 2.500,00');
  });

  test('acessibilidade com dados, nos dois temas, e sem rolagem lateral', async ({ page }, info) => {
    test.setTimeout(90_000);
    const email = await createUser(info, 'a11y');
    // dados pela API, como o app faria
    const db = createKashClient({ url: url!, anonKey: anon!, options: { auth: { persistSession: false } } });
    await signIn(db, { email, password: PASSWORD });
    const acc = await createAccount(db, { name: 'Corrente', kind: 'Conta corrente', institution: 'Nubank', balance: 1200, color: '#6BC5FF' });
    const card = await createCard(db, { name: 'Roxo', last4: '4821', limit: 2000, closingDay: 28, dueDay: 5, gradientId: 'purple' });
    const today = new Date().toISOString().slice(0, 10);
    await createTransaction(db, { title: 'Feira', category: 'Mercado', amount: 80, date: today, sourceType: 'account', sourceId: acc.id });
    await createTransaction(db, { title: 'Mesada', category: 'Entrada', amount: 600, date: today, sourceType: 'account', sourceId: acc.id });
    await addInstallmentPurchase(db, { title: 'Tênis', category: 'Lazer', cardId: card.id, total: 600, installments: 3 });
    await createBill(db, { name: 'Internet', amount: 99.9, dueDay: 10, category: 'Assinaturas', source: { type: 'account', id: acc.id } });
    await createGoal(db, { name: 'Viagem', target: 1000, saved: 200, monthly: 100, color: '#C6F432', accountId: acc.id, depositDay: 1 });

    // sem transições: a troca de tema anima o fundo e o axe mediria cores intermediárias
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, email);
    const pages = ['/app', '/app/lancamentos', '/app/cartoes', '/app/contas', '/app/contas-fixas', '/app/metas', '/app/relatorio', '/app/previsao', '/app/perfil', '/app/perfil/categorias', '/app/perfil/ajuda', '/app/privacidade'];
    for (const theme of ['dark', 'light'] as const) {
      await updateSettings(db, { theme });
      for (const path of pages) {
        await open(page, path);
        await expect(page.locator('.kash-app')).toHaveAttribute('data-theme', theme);
        expect(await noOverflow(page), `${theme} ${path}`).toBeLessThanOrEqual(0);
        const v = await seriousA11y(page);
        if (v.length) await page.screenshot({ path: `test-results/a11y-${theme}-${path.replaceAll('/', '_')}-${info.project.name}.png` });
        expect(v, `${theme} ${path}`).toEqual([]);
      }
      await open(page, '/app');
      await page.getByRole('button', { name: /^Feira,/ }).click();
      await expect(page.getByTestId('modal-transaction')).toBeVisible();
      expect(await seriousA11y(page), `${theme} modal`).toEqual([]);
      await page.keyboard.press('Escape');
    }
  });

  test('tempo real: o que muda em outro aparelho aparece sem recarregar', async ({ page }, info) => {
    const email = await createUser(info, 'tempo-real');
    await login(page, email);
    await open(page, '/app/contas');
    await expect(page.getByTestId('accounts-empty-state')).toBeVisible();
    // "outro aparelho": o mesmo usuário escrevendo pela API
    const other = createKashClient({ url: url!, anonKey: anon!, options: { auth: { persistSession: false } } });
    await signIn(other, { email, password: PASSWORD });
    const acc = await createAccount(other, { name: 'Poupança do celular', kind: 'Poupança', institution: '', balance: 250, color: '#6BC5FF' });
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ 250,00', { timeout: 10_000 });
    await expect(page.getByText('Poupança do celular')).toBeVisible();
    await createTransaction(other, { title: 'Pix recebido', category: 'Entrada', amount: 100, date: new Date().toISOString().slice(0, 10), sourceType: 'account', sourceId: acc.id });
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ 350,00', { timeout: 10_000 });
  });

  test('transferência entre contas: cria, aparece numa linha só, não conta como gasto, edita e exclui', async ({ page }, info) => {
    const email = await createUser(info, 'transferencia');
    const db = createKashClient({ url: url!, anonKey: anon!, options: { auth: { persistSession: false } } });
    await signIn(db, { email, password: PASSWORD });
    await createAccount(db, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 1000, color: '#C6F432' });
    const poup = await createAccount(db, { name: 'Poupança', kind: 'Poupança', institution: '', balance: 0, color: '#6BC5FF' });
    await login(page, email);

    await open(page, '/app/contas');
    await page.getByTestId('accounts-transfer').click();
    await expect(page.getByTestId('transfer-save')).toBeDisabled();
    await page.getByTestId('transfer-amount').pressSequentially('20000');
    await page.getByRole('radio', { name: 'Poupança' }).last().click();
    await expect(page.getByTestId('transfer-preview')).toHaveText('Corrente fica com R$ 800,00 · Poupança fica com R$ 200,00.');
    await page.getByTestId('transfer-note').fill('Reserva');
    await save(page, 'transfer-save', 'modal-transfer');
    await expect(page.getByTestId('toast-message')).toHaveText('R$ 200,00 transferidos');
    await expect(page.getByTestId(`account-${poup.id}`)).toContainText('R$ 200,00');
    await expect(page.getByTestId('accounts-total')).toHaveText('R$ 1.000,00');

    // não é gasto nem entrada
    await open(page, '/app');
    await expect(page.getByTestId('home-income')).toHaveText('↑ R$ 0,00 entrou');
    await expect(page.getByTestId('home-spent')).toHaveText('↓ R$ 0,00 saiu');
    const row = page.getByRole('button', { name: /^Reserva, Hoje · Transferência · Corrente → Poupança, R\$ 200,00/ });
    await expect(row).toHaveCount(1);

    // filtro e edição (as duas pernas mudam juntas)
    await open(page, '/app/lancamentos');
    await page.getByTestId('tx-filter-transfer').click();
    await expect(page.getByTestId('tx-count')).toHaveText('1 lançamento');
    await page.getByRole('button', { name: /^Reserva,/ }).click();
    await expect(page.getByRole('heading', { name: 'Editar transferência' })).toBeVisible();
    await page.getByTestId('transfer-amount').fill('');
    await page.getByTestId('transfer-amount').pressSequentially('5000');
    await expect(page.getByTestId('transfer-preview')).toHaveText('Corrente fica com R$ 950,00 · Poupança fica com R$ 50,00.');
    await save(page, 'transfer-save', 'modal-transfer');
    await expect(page.getByTestId('toast-message')).toHaveText('Transferência atualizada');
    await expect(page.getByRole('button', { name: /^Reserva,.*R\$ 50,00/ })).toBeVisible();

    // excluir leva as duas pernas; desfazer traz de volta
    await page.getByRole('button', { name: /^Reserva,/ }).click();
    await page.getByTestId('transfer-delete').click();
    await page.getByTestId('confirm-yes').click();
    await expect(page.getByTestId('toast-message')).toHaveText('Transferência excluída');
    await expect(page.getByTestId('tx-empty')).toBeVisible();
    await page.getByTestId('toast-action').click();
    await expect(page.getByRole('button', { name: /^Reserva,/ })).toBeVisible();
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);

    // também pelo "Lançar gasto"
    await page.keyboard.press('n');
    await page.getByTestId('tx-kind-transfer').click();
    await expect(page.getByRole('dialog', { name: 'Transferir entre contas' })).toBeVisible();
    expect(await seriousA11y(page)).toEqual([]);
  });

  test('teclado: foco preso no modal, Esc fecha e devolve o foco', async ({ page }, info) => {
    await login(page, await createUser(info, 'teclado'));
    await open(page, '/app/cartoes');
    await page.getByTestId('cards-empty-add').click();
    const dialog = page.getByRole('dialog', { name: 'Novo cartão' });
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('add-card-name')).toBeFocused();
    for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('cards-empty-add')).toBeFocused();
  });

  test('menu recolhível no celular', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'só em tela estreita');
    await login(page, await createUser(info, 'menu'));
    await expect(page.getByTestId('sidebar')).toBeHidden();
    await page.getByTestId('menu-open').click();
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toHaveAttribute('aria-current', 'page');
    await page.getByTestId('nav-goals').click();
    await expect(page).toHaveURL(/\/app\/metas$/);
    await expect(page.getByTestId('sidebar')).toBeHidden();
    await page.getByTestId('fab-new-tx').click();
    await expect(page.getByTestId('modal-transaction')).toBeVisible();
  });

  test('alterar senha, sair e entrar com a nova', async ({ page }, info) => {
    const email = await createUser(info, 'senha');
    await login(page, email);
    await open(page, '/app/perfil/seguranca');
    await page.getByTestId('security-password').click();
    await page.getByTestId('cp-current').fill('errada-000');
    await page.getByTestId('cp-new').fill('nova-senha-123');
    await page.getByTestId('cp-confirm').fill('nova-senha-123');
    await page.getByTestId('cp-save').click();
    await expect(page.getByTestId('cp-error')).toHaveText('Senha atual incorreta.');
    await page.getByTestId('cp-current').fill(PASSWORD);
    await save(page, 'cp-save', 'modal-change-password');
    await expect(page.getByTestId('toast-message')).toHaveText('Senha alterada');
    await open(page, '/app/perfil');
    await page.getByTestId('profile-logout').click();
    await expect(page).toHaveURL(/\/entrar$/);
    await login(page, email, 'nova-senha-123');
  });

  test('esqueci a senha: código por e-mail e senha nova', async ({ page, request }, info) => {
    const email = await createUser(info, 'esqueci');
    await page.goto('/esqueci-senha');
    await page.getByTestId('forgot-email').fill(email);
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-sent')).toBeVisible();
    let code = '';
    await expect
      .poll(async () => {
        const res = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const list = (await res.json()) as { messages?: Array<{ ID: string }> };
        const id = list.messages?.[0]?.ID;
        if (!id) return '';
        const msg = (await (await request.get(`${MAILPIT}/api/v1/message/${id}`)).json()) as { Text?: string; HTML?: string };
        code = `${msg.Text ?? ''} ${msg.HTML ?? ''}`.match(/\b(\d{6,8})\b/)?.[1] ?? '';
        return code;
      }, { timeout: 15_000 })
      .not.toBe('');
    await page.getByTestId('forgot-code').fill(code);
    await page.getByTestId('forgot-verify').click();
    await expect(page.getByTestId('forgot-new-password')).toBeVisible();
    await page.getByTestId('reset-password').fill('recuperada-123');
    await page.getByTestId('reset-confirm').fill('recuperada-123');
    await page.getByTestId('reset-submit').click();
    await expect(page.getByTestId('home-title')).toBeVisible();
  });

  test('excluir conta pelo perfil volta ao login e apaga o acesso', async ({ page }, info) => {
    const email = await createUser(info, 'excluir-app');
    await login(page, email);
    await open(page, '/app/perfil');
    await page.getByTestId('profile-delete').click();
    await expect(page.getByTestId('delete-confirm')).toBeDisabled();
    await page.getByTestId('delete-confirm-check').check();
    await page.getByTestId('delete-confirm').click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('E-mail ou senha incorretos.');
  });
});
