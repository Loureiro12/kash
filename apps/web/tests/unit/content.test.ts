import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extras, faqs, features, finalCta, hero, nav, pillars } from '@/content/landing';
import { formatLongDate, privacySections } from '@/content/privacy';
import { site } from '@/content/site';

const publicDir = join(__dirname, '../../public');

describe('conteúdo da landing', () => {
  it('tem as quantidades do handoff', () => {
    expect(pillars).toHaveLength(3);
    expect(features).toHaveLength(3);
    expect(extras).toHaveLength(6);
    expect(faqs).toHaveLength(6);
  });

  it('âncoras do menu apontam para seções que existem', () => {
    const ids = ['recursos', 'privacidade', 'perguntas'];
    expect(nav.map((n) => n.href.slice(1))).toEqual(ids);
  });

  it('toda captura tem arquivo em /public e texto alternativo', () => {
    for (const shot of [hero.screen, ...features.map((f) => f.screen)]) {
      expect(existsSync(join(publicDir, shot.src)), shot.src).toBe(true);
      expect(shot.alt.length).toBeGreaterThan(20);
    }
  });

  it('não promete o navegador enquanto a versão web não existe', () => {
    if (site.webApp) return;
    expect(finalCta.text).not.toMatch(/navegador/);
    expect(faqs.map((f) => f.q + f.a).join(' ')).not.toMatch(/navegador|web\b/);
  });
});

describe('política de privacidade', () => {
  it('11 seções com ids únicos (âncoras do índice)', () => {
    expect(privacySections).toHaveLength(11);
    expect(new Set(privacySections.map((s) => s.id)).size).toBe(11);
    for (const s of privacySections) expect(s.paragraphs.length + (s.list?.length ?? 0)).toBeGreaterThan(0);
  });

  it('data por extenso', () => {
    expect(formatLongDate('2026-10-01')).toBe('1 de outubro de 2026');
  });
});
