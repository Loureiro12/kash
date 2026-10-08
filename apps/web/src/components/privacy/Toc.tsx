import type { PolicySection } from '@/content/privacy';
import styles from './Toc.module.css';

function Links({ sections }: { sections: PolicySection[] }) {
  return (
    <ol className={styles.list}>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className={styles.link}>
            {i + 1}. {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Índice. No celular: recolhível no topo (não ocupa a tela toda antes do texto).
 * A partir de 900px: coluna fixa ao lado do conteúdo.
 */
export function Toc({ sections }: { sections: PolicySection[] }) {
  return (
    <>
      <details className={styles.mobile} data-testid="toc-mobile">
        <summary className={styles.summary}>
          Nesta página <span aria-hidden="true">▾</span>
        </summary>
        <Links sections={sections} />
      </details>
      <nav aria-label="Nesta página" className={styles.desktop} data-testid="toc-desktop">
        <p className={styles.heading}>Nesta página</p>
        <Links sections={sections} />
      </nav>
    </>
  );
}
