import { extras } from '@/content/landing';
import { Container } from '../ui/Container';
import styles from './Extras.module.css';

export function Extras() {
  return (
    <Container as="section" className={styles.section} aria-labelledby="extras-title">
      <h2 id="extras-title" className={styles.title}>
        E ainda tem tudo isso.
      </h2>
      <ul className={styles.grid}>
        {extras.map((e) => (
          <li key={e.title} className={styles.cell}>
            <h3 className={styles.cellTitle}>{e.title}</h3>
            <p className={styles.cellText}>{e.text}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
