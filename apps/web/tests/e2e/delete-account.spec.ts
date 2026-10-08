import AxeBuilder from '@axe-core/playwright';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import WebSocket from 'ws';

// supabase-js no Node 20 precisa de um WebSocket (realtime), mesmo sem usar
if (!('WebSocket' in globalThis)) Object.assign(globalThis, { WebSocket });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasBackend = !!(url && anon && service);

test.describe('excluir conta pelo site', () => {
  test('página explica o que é apagado, tem alternativa por e-mail e é acessível', async ({ page }) => {
    await page.goto('/excluir-conta');
    await expect(page).toHaveTitle('Excluir conta · Kash');
    await expect(page.getByRole('heading', { level: 1, name: 'Excluir sua conta' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'O que é apagado' })).toBeVisible();
    await expect(page.getByTestId('delete-by-email')).toHaveAttribute('href', /^mailto:privacidade@kash\.app\?subject=/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  });

  test('rodapé e política levam à página', async ({ page }) => {
    await page.goto('/privacidade');
    await page.getByRole('article').getByRole('link', { name: 'página Excluir conta' }).click();
    await expect(page).toHaveURL(/\/excluir-conta$/);
  });

  test('sem backend configurado, oferece só o pedido por e-mail', async ({ page }) => {
    test.skip(hasBackend, 'backend local disponível');
    await page.goto('/excluir-conta');
    await expect(page.getByTestId('delete-unavailable')).toBeVisible();
  });

  test.describe('com o Supabase local', () => {
    test.skip(!hasBackend, 'Supabase local não está rodando');

    test('valida campos e recusa senha errada', async ({ page }) => {
      await page.goto('/excluir-conta');
      await page.getByTestId('delete-continue').click();
      await expect(page.getByTestId('delete-error')).toHaveText('Digite o e-mail da sua conta.');
      await page.getByTestId('delete-email-input').fill('lara@email.com');
      await page.getByTestId('delete-password-input').fill('senha-errada');
      await page.getByTestId('delete-continue').click();
      await expect(page.getByTestId('delete-error')).toHaveText('E-mail ou senha incorretos.');
      await expect(page.getByTestId('delete-signin')).toBeVisible();
    });

    test('entra, cancela sem excluir, entra de novo e exclui de verdade', async ({ page }, info) => {
      const admin = createClient(url!, service!, { auth: { persistSession: false } });
      const email = `excluir-${info.project.name}-${Date.now()}@kash.test`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: 'senha-123456', email_confirm: true, user_metadata: { name: 'Teste' } });
      expect(error).toBeNull();

      const signIn = async () => {
        await page.getByTestId('delete-email-input').fill(email);
        await page.getByTestId('delete-password-input').fill('senha-123456');
        await page.getByTestId('delete-continue').click();
        await expect(page.getByTestId('delete-confirm')).toBeVisible();
      };

      await page.goto('/excluir-conta');
      await signIn();
      await expect(page.getByTestId('delete-email')).toHaveText(email);
      await expect(page.getByTestId('delete-submit')).toBeDisabled();
      await page.getByTestId('delete-cancel').click();
      await expect(page.getByTestId('delete-signin')).toBeVisible();
      expect((await admin.auth.admin.getUserById(data.user!.id)).data.user).not.toBeNull();

      await signIn();
      await page.getByTestId('delete-ack').check();
      await page.getByTestId('delete-submit').click();
      await expect(page.getByTestId('delete-done')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Conta excluída' })).toBeFocused();

      // a conta deixou de existir e não dá mais pra entrar
      expect((await admin.auth.admin.getUserById(data.user!.id)).data.user).toBeNull();
      const again = await createClient(url!, anon!, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: 'senha-123456' });
      expect(again.error).not.toBeNull();
    });
  });
});
