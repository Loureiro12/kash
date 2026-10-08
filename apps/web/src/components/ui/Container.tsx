import type { ElementType, ReactNode } from 'react';
import styles from './Container.module.css';

type Size = 'default' | 'narrow' | 'doc';

/** Largura máxima + respiro lateral. `as` define o elemento (section, div, header…). */
export function Container({ as: Tag = 'div', size = 'default', className, children, ...rest }: { as?: ElementType; size?: Size; className?: string; children: ReactNode; id?: string; 'aria-labelledby'?: string }) {
  return (
    <Tag className={[styles.container, styles[size], className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}
