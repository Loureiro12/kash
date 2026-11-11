'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/telemetry';

/** Erro ao renderizar uma página: registra no Analytics (evento `exception`) e oferece tentar de novo. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <main id="conteudo" style={{ minHeight: '80dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24, textAlign: 'center' }} data-testid="error-page">
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em' }}>Algo deu errado.</h1>
      <p style={{ color: 'var(--text-soft)', maxWidth: 420 }}>Já registramos o problema. Tente de novo; seus dados estão salvos.</p>
      <button type="button" onClick={reset} style={{ height: 48, padding: '0 22px', borderRadius: 14, border: 0, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        Tentar de novo
      </button>
    </main>
  );
}
