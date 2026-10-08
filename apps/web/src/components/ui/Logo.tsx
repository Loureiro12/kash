import Link from 'next/link';
import styles from './Logo.module.css';

/** Marca: quadrado verde com "K" + "Kash". Com `href`, vira link (ex.: volta para a home). */
export function Logo({ size = 'md', href }: { size?: 'md' | 'sm'; href?: string }) {
  const content = (
    <>
      <span className={styles.mark} aria-hidden="true">
        K
      </span>
      <span className={styles.word}>Kash</span>
    </>
  );
  const className = [styles.logo, styles[size]].join(' ');
  return href ? (
    <Link href={href} className={className} aria-label="Kash, página inicial">
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}
