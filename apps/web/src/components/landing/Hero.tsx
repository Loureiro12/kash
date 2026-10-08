import { hero } from '@/content/landing';
import { site } from '@/content/site';
import { Container } from '../ui/Container';
import { PhoneShot } from '../ui/PhoneShot';
import { StoreBadges } from '../ui/StoreBadges';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <Container as="section" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <p className={styles.badge}>{hero.badge}</p>
        <h1 id="hero-title" className={styles.title}>
          {hero.title}
        </h1>
        <p className={styles.lead}>{hero.lead}</p>
        <div id="baixar" className={styles.download}>
          <StoreBadges />
        </div>
        {site.webApp ? (
          <p className={styles.web}>
            Prefere o computador? <a href={site.webApp}>Use o Kash no navegador →</a>
          </p>
        ) : null}
      </div>
      <PhoneShot src={hero.screen.src} alt={hero.screen.alt} size="hero" preload glow />
    </Container>
  );
}
