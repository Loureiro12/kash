import Link from 'next/link';
import { privacyCallout } from '@/content/landing';
import { Container } from '../ui/Container';
import { Eyebrow } from '../ui/Eyebrow';
import styles from './PrivacyCallout.module.css';

export function PrivacyCallout() {
  return (
    <Container as="section" id="privacidade" className={styles.section} aria-labelledby="privacy-title">
      <div className={styles.card}>
        <div className={styles.copy}>
          <Eyebrow>{privacyCallout.eyebrow}</Eyebrow>
          <h2 id="privacy-title" className={styles.title}>
            {privacyCallout.title}
          </h2>
          <p className={styles.text}>{privacyCallout.text}</p>
          <Link href="/privacidade" className={styles.link} data-testid="privacy-link">
            Ler a política de privacidade →
          </Link>
        </div>
        <ul className={styles.points}>
          {privacyCallout.points.map((p) => (
            <li key={p} className={styles.point}>
              <span className={styles.dot} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
