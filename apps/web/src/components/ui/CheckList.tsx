import styles from './CheckList.module.css';

/** Lista com check verde (recursos). */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={styles.item}>
          <span className={styles.check} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
