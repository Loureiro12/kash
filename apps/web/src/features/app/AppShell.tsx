'use client';

import { onboardingStatus } from '@kash/domain';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/app/Icon';
import { Avatar, Button } from '@/components/app/ui';
import { rememberTheme } from '@/kash/actions';
import { KashDataProvider, useSnapshotQuery } from '@/kash/data';
import { useRealtimeSync } from '@/kash/realtime';
import { useSession } from '@/kash/session';
import { useTheme } from '@/kash/theme';
import { useUi } from '@/kash/ui';
import { ModalsHost } from '@/features/modals/ModalsHost';
import { isActive, isNewTxShortcut, NAV, routes } from './nav';
import { DisplayToggles } from './PageHeader';
import s from './AppShell.module.css';

/**
 * Casca do app logado: sidebar (menu recolhível abaixo de 900px), conteúdo e modais.
 * Só renderiza as telas com sessão e dados — antes disso, carregando ou erro.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSnapshotQuery(session.userId);
  useRealtimeSync(session.userId);
  const setTheme = useTheme((st) => st.setTheme);
  const theme = query.data?.settings.theme;

  useEffect(() => {
    if (session.status === 'signedOut') router.replace(routes.login);
  }, [session.status, router]);

  // primeiro acesso: quem chega no Início sem nenhuma conta (e não pulou) vai para as boas-vindas
  const showWelcome = query.data ? onboardingStatus(query.data).showWelcome : false;
  useEffect(() => {
    if (showWelcome && pathname === routes.home) router.replace(routes.welcome);
  }, [showWelcome, pathname, router]);

  useEffect(() => {
    if (!theme) return;
    setTheme(theme);
    rememberTheme(theme);
  }, [theme, setTheme]);

  if (session.status === 'unconfigured') {
    return <StatusScreen title="Kash indisponível" text="Este ambiente ainda não está ligado ao servidor do Kash." />;
  }
  if (session.status !== 'signedIn') return <LoadingScreen />;
  if (!query.data) {
    if (query.isError)
      return (
        <StatusScreen title="Não deu pra carregar seus dados" text="Confere sua conexão e tenta de novo.">
          <Button onClick={() => void query.refetch()} loading={query.isFetching} testID="retry">
            Tentar de novo
          </Button>
        </StatusScreen>
      );
    return <LoadingScreen />;
  }

  // boas-vindas: tela focada, sem sidebar (os modais de cadastro continuam disponíveis)
  if (pathname === routes.welcome) {
    return (
      <KashDataProvider value={query.data}>
        {children}
        <ModalsHost />
      </KashDataProvider>
    );
  }
  if (showWelcome && pathname === routes.home) return <LoadingScreen />;

  return (
    <KashDataProvider value={query.data}>
      <Frame name={query.data.user.name}>{children}</Frame>
      <ModalsHost />
    </KashDataProvider>
  );
}

function Frame({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const navOpen = useUi((st) => st.navOpen);
  const setNavOpen = useUi((st) => st.setNavOpen);
  const openModal = useUi((st) => st.openModal);
  const modal = useUi((st) => st.modal);
  const mainRef = useRef<HTMLElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const menuOpenRef = useRef<HTMLButtonElement>(null);

  // menu aberto (telas estreitas): foco vai para dentro dele; ao fechar, volta para o botão
  useEffect(() => {
    if (navOpen) menuCloseRef.current?.focus();
    else if (document.activeElement && document.getElementById('kash-sidebar')?.contains(document.activeElement) && window.matchMedia('(max-width: 899px)').matches) menuOpenRef.current?.focus();
  }, [navOpen]);

  // fecha o menu ao navegar e leva o foco para o conteúdo novo
  useEffect(() => {
    setNavOpen(false);
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname, setNavOpen]);

  // atalho: N abre "Lançar gasto"; Esc fecha o menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useUi.getState().navOpen) {
        setNavOpen(false);
        return;
      }
      if (useUi.getState().modal || document.querySelector('[role="dialog"]')) return;
      if (isNewTxShortcut(e, e.target as HTMLElement | null)) {
        e.preventDefault();
        openModal({ name: 'transaction' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openModal, setNavOpen]);

  const firstName = name.split(' ')[0] ?? name;

  return (
    <div className={s.layout}>
      <header className={s.topbar}>
        <button ref={menuOpenRef} type="button" className={s.menuBtn} onClick={() => setNavOpen(true)} aria-label="Abrir menu" aria-expanded={navOpen} aria-controls="kash-sidebar" data-testid="menu-open">
          <Icon name="menu" size={20} />
        </button>
        <Link href={routes.home} className={s.logo} aria-label="Kash, início">
          <span className={s.mark} aria-hidden="true">
            K
          </span>
          <span className={s.word}>Kash</span>
        </Link>
        <div className={s.topbarActions}>
          <DisplayToggles compact />
        </div>
      </header>

      {navOpen ? <div className={s.scrim} onClick={() => setNavOpen(false)} aria-hidden="true" data-testid="menu-scrim" /> : null}

      <aside id="kash-sidebar" className={`${s.sidebar} ${navOpen ? s.sidebarOpen : ''}`} aria-label="Menu principal" data-testid="sidebar">
        <div className={s.sidebarHead}>
          <Link href={routes.home} className={s.logo} aria-label="Kash, início">
            <span className={s.mark} aria-hidden="true">
              K
            </span>
            <span className={s.word}>Kash</span>
          </Link>
          <button ref={menuCloseRef} type="button" className={s.menuClose} onClick={() => setNavOpen(false)} aria-label="Fechar menu" data-testid="menu-close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <button type="button" className={s.newTx} onClick={() => openModal({ name: 'transaction' })} data-testid="sidebar-new-tx" aria-keyshortcuts="N">
          <Icon name="plus" size={16} strokeWidth={2.8} />
          Lançar gasto
        </button>
        <nav className={s.nav} aria-label="Seções">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={s.navItem} aria-current={active ? 'page' : undefined} data-testid={item.testID}>
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={s.spacer} />
        <Link href={routes.profile} className={s.profile} aria-current={isActive(pathname, routes.profile) ? 'page' : undefined} data-testid="nav-profile">
          <Avatar name={name} size={36} />
          <span className={s.profileText}>
            <span className={s.profileName}>{name || firstName}</span>
            <span className={s.profileSub}>Ver perfil</span>
          </span>
        </Link>
      </aside>

      <main id="conteudo" ref={mainRef} tabIndex={-1} className={s.main}>
        <div className={s.content}>{children}</div>
      </main>

      {!modal ? (
        <button type="button" className={s.fab} onClick={() => openModal({ name: 'transaction' })} aria-label="Lançar gasto" data-testid="fab-new-tx">
          <Icon name="plus" size={24} strokeWidth={2.6} />
        </button>
      ) : null}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className={s.status} role="status" aria-live="polite" data-testid="app-loading">
      <span className={s.mark} aria-hidden="true">
        K
      </span>
      <span className="sr-only">Carregando o Kash…</span>
    </div>
  );
}

function StatusScreen({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className={s.status} data-testid="app-status">
      <span className={s.mark} aria-hidden="true">
        K
      </span>
      <h1 className={s.statusTitle}>{title}</h1>
      <p className={s.statusText}>{text}</p>
      {children}
    </div>
  );
}
