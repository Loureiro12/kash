'use client';

import Link from 'next/link';
import { Icon } from '@/components/app/Icon';
import { IconButton, PillButton } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import s from './PageHeader.module.css';

/** "Ocultar valores" e "Tema claro/escuro" — no cabeçalho (desktop) e na barra do topo (celular). */
export function DisplayToggles({ compact }: { compact?: boolean }) {
  const { settings } = useKash();
  const actions = useKashActions();
  const hidden = settings.hideValues;
  const dark = settings.theme === 'dark';
  const toggleHide = () => void actions.updateSettings({ hideValues: !hidden });
  const toggleTheme = () => void actions.updateSettings({ theme: dark ? 'light' : 'dark' });
  if (compact)
    return (
      <>
        <IconButton icon={hidden ? 'eyeOff' : 'eye'} label={hidden ? 'Mostrar valores' : 'Ocultar valores'} aria-pressed={hidden} onClick={toggleHide} testID="toggle-hide-compact" className={s.compactBtn} />
        <IconButton icon={dark ? 'sun' : 'moon'} label={dark ? 'Tema claro' : 'Tema escuro'} onClick={toggleTheme} testID="toggle-theme-compact" className={s.compactBtn} />
      </>
    );
  return (
    <div className={s.toggles}>
      <PillButton onClick={toggleHide} aria-pressed={hidden} testID="toggle-hide">
        <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} strokeWidth={2} />
        {hidden ? 'Mostrar valores' : 'Ocultar valores'}
      </PillButton>
      <PillButton onClick={toggleTheme} testID="toggle-theme">
        {dark ? 'Tema claro' : 'Tema escuro'}
      </PillButton>
    </div>
  );
}

/** Cabeçalho da página: título + subtítulo; à direita, os botões de exibição. */
export function PageHeader({ title, subtitle, back, actions, testID }: { title: string; subtitle?: React.ReactNode; back?: { href: string; label: string }; actions?: React.ReactNode; testID?: string }) {
  return (
    <div className={s.header}>
      {back ? (
        <Link href={back.href} className={s.back} data-testid="page-back">
          <Icon name="chevronLeft" size={16} strokeWidth={2.4} />
          {back.label}
        </Link>
      ) : null}
      <div className={s.row}>
        <div className={s.text}>
          <h1 className={s.title} data-testid={testID ?? 'page-title'}>
            {title}
          </h1>
          {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
        </div>
        {actions}
        <div className={s.desktopOnly}>
          <DisplayToggles />
        </div>
      </div>
    </div>
  );
}
