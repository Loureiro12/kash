import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero, seções e metadados', async ({ page }) => {
    await expect(page).toHaveTitle(/Kash/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sua grana, sem mistério.' })).toBeVisible();
    for (const id of ['recursos', 'privacidade', 'perguntas']) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /finanças/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/);
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(ld ?? '[]')[1]['@type']).toBe('FAQPage');
  });

  test('sem rolagem horizontal', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('"Baixar grátis" leva aos botões das lojas', async ({ page }) => {
    await page.getByTestId('nav-cta').click();
    await expect(page.getByTestId('badge-app-store')).toBeInViewport();
    await expect(page).toHaveURL(/#baixar$/);
  });

  test('FAQ: a primeira começa aberta e só uma fica aberta por vez', async ({ page }) => {
    const first = page.getByTestId('faq-0');
    const second = page.getByTestId('faq-1');
    await expect(first).toHaveAttribute('open', '');
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    await expect(first).not.toHaveAttribute('open');
    await expect(second.getByText('A gente nunca pede senha de banco')).toBeVisible();
  });

  test('capturas do app carregam com texto alternativo', async ({ page }) => {
    const imgs = page.locator('main img');
    await expect(imgs).toHaveCount(4);
    for (const img of await imgs.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('alt', /Kash/);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
  });

  test('link da política abre a página de privacidade', async ({ page }) => {
    await page.getByTestId('privacy-link').click();
    await expect(page).toHaveURL(/\/privacidade$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible();
  });

  test('acessibilidade (axe): nada sério ou crítico', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test('menu: links âncora visíveis só a partir do tablet', async ({ page }, info) => {
  await page.goto('/');
  const link = page.getByRole('navigation', { name: 'Seções' }).getByRole('link', { name: 'Perguntas' });
  if (info.project.name === 'mobile') {
    await expect(link).toBeHidden();
  } else {
    await link.click();
    await expect(page.locator('#perguntas')).toBeInViewport();
  }
});
