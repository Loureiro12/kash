import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('política de privacidade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacidade');
  });

  test('título, data, resumo e 11 seções', async ({ page }) => {
    await expect(page).toHaveTitle('Política de privacidade · Kash');
    await expect(page.getByText('Última atualização: 1 de outubro de 2026')).toBeVisible();
    await expect(page.getByText('Resumo rápido')).toBeVisible();
    await expect(page.locator('article section h2')).toHaveCount(11);
  });

  test('índice leva à seção (no celular, abrindo o bloco recolhível)', async ({ page }, info) => {
    const toc = info.project.name === 'mobile' ? page.getByTestId('toc-mobile') : page.getByTestId('toc-desktop');
    if (info.project.name === 'mobile') {
      await expect(page.getByTestId('toc-desktop')).toBeHidden();
      await toc.locator('summary').click();
    }
    await toc.getByRole('link', { name: '9. Seus direitos' }).click();
    await expect(page).toHaveURL(/#direitos$/);
    await expect(page.getByRole('heading', { name: '9. Seus direitos' })).toBeInViewport();
  });

  test('voltar ao site e e-mail do encarregado', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'privacidade@kash.app' })).toHaveAttribute('href', 'mailto:privacidade@kash.app');
    await page.getByRole('link', { name: '← Voltar ao site' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('sem rolagem horizontal e acessível (axe)', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test('SEO: sitemap, robots e 404', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/privacidade');
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  const res = await page.goto('/nao-existe');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Página não encontrada.' })).toBeVisible();
});
