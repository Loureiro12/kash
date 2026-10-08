import { pillars } from '@/content/landing';
import { Container } from '../ui/Container';
import styles from './Pillars.module.css';

export function Pillars() {
  return (
    <Container as="section" className={styles.grid} aria-label="Por que o Kash">
      {pillars.map((p) => (
        <article key={p.title} className={styles.card}>
          <h2 className={styles.title}>{p.title}</h2>
          <p className={styles.text}>{p.text}</p>
        </article>
      ))}
    </Container>
  );
}
