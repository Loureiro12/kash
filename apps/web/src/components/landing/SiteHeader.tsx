import { nav } from '@/content/landing';
import { Container } from '../ui/Container';
import { Logo } from '../ui/Logo';
import styles from './SiteHeader.module.css';

/** Nav fixa. No celular: logo + "Baixar grátis"; a partir de 720px, os links âncora aparecem. */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Logo href="/" />
        <nav aria-label="Seções" className={styles.nav}>
          <ul className={styles.links}>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={styles.link}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href="#baixar" className={styles.cta} data-testid="nav-cta">
          Baixar grátis
        </a>
      </Container>
    </header>
  );
}
