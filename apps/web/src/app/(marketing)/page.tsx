import { Extras } from '@/components/landing/Extras';
import { Faq } from '@/components/landing/Faq';
import { Features } from '@/components/landing/Features';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { Pillars } from '@/components/landing/Pillars';
import { PrivacyCallout } from '@/components/landing/PrivacyCallout';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import type { Metadata } from 'next';
import { faqs } from '@/content/landing';
import { site } from '@/content/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/** Dados estruturados (Google): organização, site, app gratuito e perguntas frequentes. */
function JsonLd() {
  const stores = [site.stores.googlePlay, site.stores.appStore].filter((s) => s.available).map((s) => s.url);
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${site.url}/#organization`,
      name: site.name,
      url: `${site.url}/`,
      logo: `${site.url}/icon.png`,
      ...(stores.length ? { sameAs: stores } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      name: site.name,
      url: `${site.url}/`,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${site.url}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: site.name,
      description: site.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: site.webApp ? 'iOS, Android, Web' : 'iOS, Android',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      url: `${site.url}/`,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${site.url}/#organization` },
      ...(stores.length ? { downloadUrl: stores } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  // conteúdo é nosso (sem entrada do usuário); `<` escapado evita fechar a tag script
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <Hero />
        <Pillars />
        <Features />
        <Extras />
        <PrivacyCallout />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <JsonLd />
    </>
  );
}
