import { finalCta } from '@/content/landing';
import { site } from '@/content/site';
import { Container } from '../ui/Container';
import styles from './FinalCta.module.css';
import { StoreLink } from '@/components/telemetry/StoreLink';

function StoreButton({ label, url, available, store }: { label: string; url: string; available: boolean; store: 'app_store' | 'google_play' }) {
  return available ? (
    <StoreLink store={store} placement="final_cta" href={url} className={styles.solid} rel="noopener" target="_blank">
      {label}
    </StoreLink>
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
          <StoreButton label="App Store" store="app_store" {...site.stores.appStore} />
          <StoreButton label="Google Play" store="google_play" {...site.stores.googlePlay} />
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
