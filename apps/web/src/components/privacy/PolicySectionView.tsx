import type { PolicySection } from '@/content/privacy';
import styles from './PolicySectionView.module.css';

export function PolicySectionView({ section, index }: { section: PolicySection; index: number }) {
  return (
    <section id={section.id} className={styles.section} aria-labelledby={`${section.id}-title`}>
      <h2 id={`${section.id}-title`} className={styles.title}>
        {index + 1}. {section.title}
      </h2>
      {section.paragraphs.map((p) => (
        <p key={p} className={styles.p}>
          {p}
        </p>
      ))}
      {section.list?.length ? (
        <ul className={styles.list}>
          {section.list.map((li) => (
            <li key={li} className={styles.li}>
              <span className={styles.dot} aria-hidden="true" />
              <span>{li}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
