import { finalCta } from '@/content/landing';
import { site } from '@/content/site';
import { Container } from '../ui/Container';
import styles from './FinalCta.module.css';

function StoreButton({ label, url, available }: { label: string; url: string; available: boolean }) {
  return available ? (
    <a href={url} className={styles.solid} rel="noopener" target="_blank">
      {label}
    </a>
  ) : (
    <span className={[styles.solid, styles.soon].join(' ')}>
      {label} <small>em breve</small>
    </span>
  );
}

export function FinalCta() {
  return (
    <Container as="section" className={styles.section} aria-labelledby="cta-title">
      <div className={styles.block}>
        <h2 id="cta-title" className={styles.title}>
          {finalCta.title}
        </h2>
        <p className={styles.text}>{finalCta.text}</p>
        <div className={styles.actions}>
          <StoreButton label="App Store" {...site.stores.appStore} />
          <StoreButton label="Google Play" {...site.stores.googlePlay} />
          {site.webApp ? (
            <a href={site.webApp} className={styles.outline}>
              Usar no navegador
            </a>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
