import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import { site } from '@/content/site';
import '@/styles/globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: '%s · Kash' },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: 'website', locale: site.locale, siteName: site.name, url: '/', title: site.title, description: site.description },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description },
  alternates: { canonical: '/' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0C0E',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Layout raiz de todo o domínio. Hoje serve o site institucional (grupo `(marketing)`);
 * o Kash web, quando existir, entra como outro grupo de rotas reaproveitando este layout.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
