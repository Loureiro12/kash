import Image from 'next/image';
import styles from './PhoneShot.module.css';

/** Captura do app em moldura arredondada. Tamanhos do handoff: hero 330×717, recurso 300×652. */
export function PhoneShot({ src, alt, size = 'feature', preload = false, glow = false }: { src: string; alt: string; size?: 'hero' | 'feature'; preload?: boolean; glow?: boolean }) {
  return (
    <div className={[styles.wrap, styles[size]].join(' ')}>
      {glow ? <span className={styles.glow} aria-hidden="true" /> : null}
      <div className={styles.frame}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={size === 'hero' ? '(min-width: 640px) 330px, 82vw' : '(min-width: 640px) 300px, 76vw'}
          quality={85}
          preload={preload}
          loading={preload ? undefined : 'lazy'}
          className={styles.img}
        />
      </div>
    </div>
  );
}
