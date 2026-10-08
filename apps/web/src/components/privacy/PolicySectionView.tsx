import Link from 'next/link';
import type { ReactNode } from 'react';
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
              <span>{linkify(li)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Transforma "página Excluir conta" em link (o texto da política continua sendo dado puro). */
function linkify(text: string): ReactNode {
  const marker = 'página Excluir conta';
  const i = text.indexOf(marker);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <Link href="/excluir-conta">{marker}</Link>
      {text.slice(i + marker.length)}
    </>
  );
}
