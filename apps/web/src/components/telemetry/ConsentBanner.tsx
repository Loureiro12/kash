'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CONSENT_EVENT, readConsent, setConsent, telemetryConfigured } from '@/lib/telemetry';
import styles from './ConsentBanner.module.css';

/** evento para reabrir o banner (link "Preferências de cookies") */
export const OPEN_CONSENT_EVENT = 'kash:open-consent';

/**
 * Pergunta sobre cookies de análise (Google Analytics for Firebase e Firebase Performance).
 * Aparece até a pessoa escolher; o link "Preferências de cookies" do rodapé reabre.
 * Sem o Firebase configurado, não há cookie de análise e o banner não aparece.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!telemetryConfigured()) return;
    // decidir no cliente (a escolha fica no navegador); só depois de montar, sem diferença na hidratação
    const show = () => setOpen(true);
    if (readConsent() === null) queueMicrotask(show);
    const close = () => setOpen(false);
    window.addEventListener(OPEN_CONSENT_EVENT, show);
    window.addEventListener(CONSENT_EVENT, close);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, show);
      window.removeEventListener(CONSENT_EVENT, close);
    };
  }, []);

  if (!open) return null;
  return (
    <section className={styles.banner} role="region" aria-label="Cookies de análise" data-testid="consent-banner">
      <p className={styles.text}>
        Usamos cookies de análise (Google Analytics) para entender como o Kash é usado e melhorar o site. Nada de anúncios, e seus valores nunca vão junto. <Link href="/privacidade#cookies">Saiba mais</Link>.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setConsent('denied')} data-testid="consent-deny">
          Recusar
        </button>
        <button type="button" className={styles.primary} onClick={() => setConsent('granted')} data-testid="consent-accept">
          Aceitar
        </button>
      </div>
    </section>
  );
}

/** Link do rodapé que reabre a escolha. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className ?? styles.link} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} data-testid="consent-open">
      Preferências de cookies
    </button>
  );
}
