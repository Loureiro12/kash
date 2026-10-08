import type { ReactNode } from 'react';
import styles from './Eyebrow.module.css';

export function Eyebrow({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'muted' }) {
  return <p className={[styles.eyebrow, styles[tone]].join(' ')}>{children}</p>;
}
