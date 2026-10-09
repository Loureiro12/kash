import type { Metadata } from 'next';
import { KashRoot } from '@/features/app/KashRoot';
import '@/styles/app.css';

/** Kash web (login + app): área logada, fora dos buscadores. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function KashWebLayout({ children }: { children: React.ReactNode }) {
  return <KashRoot>{children}</KashRoot>;
}
