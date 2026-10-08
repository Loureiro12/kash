import { features } from '@/content/landing';
import { CheckList } from '../ui/CheckList';
import { Container } from '../ui/Container';
import { Eyebrow } from '../ui/Eyebrow';
import { PhoneShot } from '../ui/PhoneShot';
import styles from './Features.module.css';

/** Recursos: texto + captura. No celular empilha (texto primeiro); no desktop alterna o lado. */
export function Features() {
  return (
    <Container as="section" id="recursos" className={styles.list} aria-label="Recursos">
      {features.map((f) => (
        <article key={f.id} id={f.id} className={[styles.row, f.reverse ? styles.reverse : ''].join(' ')} aria-labelledby={`${f.id}-title`}>
          <div className={styles.copy}>
            <Eyebrow>{f.eyebrow}</Eyebrow>
            <h2 id={`${f.id}-title`} className={styles.title}>
              {f.title}
            </h2>
            <p className={styles.text}>{f.text}</p>
            <CheckList items={f.points} />
          </div>
          <PhoneShot src={f.screen.src} alt={f.screen.alt} size="feature" />
        </article>
      ))}
    </Container>
  );
}
