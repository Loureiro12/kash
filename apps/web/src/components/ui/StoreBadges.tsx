import { site, type StoreLink } from '@/content/site';
import styles from './StoreBadges.module.css';

function AppleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.2 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5l10.2 9.5L4 21.5c-.4-.2-.6-.6-.6-1.1V3.6c0-.5.2-.9.6-1.1zm11.6 10.8l2.6 2.4-11.5 6.6 8.9-9zm0-2.6l-8.9-9 11.5 6.6-2.6 2.4zm1.4 1.3l3-2.8 2.4 1.4c.8.5.8 1.3 0 1.8l-2.4 1.4-3-2.8z" />
    </svg>
  );
}

function Badge({ link, icon, small, soon, big, testId }: { link: StoreLink; icon: React.ReactNode; small: string; soon: string; big: string; testId: string }) {
  const body = (
    <>
      {icon}
      <span className={styles.text}>
        <span className={styles.small}>{link.available ? small : soon}</span>
        <span className={styles.big}>{big}</span>
      </span>
    </>
  );
  // sem app publicado na loja, não leva a uma página que não existe
  return link.available ? (
    <a href={link.url} className={styles.badge} data-testid={testId} rel="noopener" target="_blank">
      {body}
    </a>
  ) : (
    <span className={[styles.badge, styles.soon].join(' ')} data-testid={testId} aria-label={`${big}: em breve`}>
      {body}
    </span>
  );
}

/** Botões das lojas no estilo do hero (fundo claro). */
export function StoreBadges() {
  return (
    <div className={styles.row}>
      <Badge link={site.stores.appStore} icon={<AppleIcon />} small="Baixar na" soon="Em breve na" big="App Store" testId="badge-app-store" />
      <Badge link={site.stores.googlePlay} icon={<PlayIcon />} small="Disponível no" soon="Em breve no" big="Google Play" testId="badge-google-play" />
    </div>
  );
}
