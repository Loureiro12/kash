import Link from 'next/link';
import { Container } from '../ui/Container';
import { Logo } from '../ui/Logo';
import styles from './DocHeader.module.css';

/** Header das páginas de documento (privacidade, termos…). */
export function DocHeader() {
  return (
    <header className={styles.header}>
      <Container size="doc" className={styles.inner}>
        <Logo href="/" />
        <Link href="/" className={styles.back}>
          ← Voltar ao site
        </Link>
      </Container>
    </header>
  );
}
