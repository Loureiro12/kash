import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <Container as="main" size="narrow">
      <div style={{ minHeight: '80dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <Logo href="/" />
        <h1 style={{ fontSize: 'clamp(36px, 9vw, 56px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1 }}>Página não encontrada.</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 17 }}>O endereço pode ter mudado. Volte para o início e siga de lá.</p>
        <Link href="/" style={{ fontWeight: 600 }}>
          ← Voltar ao site
        </Link>
      </div>
    </Container>
  );
}
