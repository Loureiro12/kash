import Link from 'next/link';
import { site } from '@/content/site';
import { Container } from '../ui/Container';
import { Logo } from '../ui/Logo';
import styles from './SiteFooter.module.css';

/** Rodapé compartilhado (landing e páginas de documento). */
export function SiteFooter({ size = 'default' }: { size?: 'default' | 'doc' }) {
  const year = 2026;
  return (
    <footer className={styles.footer}>
      <Container size={size} className={styles.inner}>
        <Logo size="sm" />
        <p>© {year} Kash</p>
        <ul className={styles.links}>
          <li>
            <Link href="/privacidade">Política de privacidade</Link>
          </li>
          <li>
            <Link href="/excluir-conta">Excluir conta</Link>
          </li>
          {site.termsUrl ? (
            <li>
              <Link href={site.termsUrl}>Termos de uso</Link>
            </li>
          ) : null}
          <li>
            <a href={`mailto:${site.emails.contact}`}>{site.emails.contact}</a>
          </li>
        </ul>
      </Container>
    </footer>
  );
}
