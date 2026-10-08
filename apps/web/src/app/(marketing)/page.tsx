import { Extras } from '@/components/landing/Extras';
import { Faq } from '@/components/landing/Faq';
import { Features } from '@/components/landing/Features';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { Pillars } from '@/components/landing/Pillars';
import { PrivacyCallout } from '@/components/landing/PrivacyCallout';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { faqs } from '@/content/landing';
import { site } from '@/content/site';

/** Dados estruturados (Google): app gratuito + perguntas frequentes. */
function JsonLd() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: site.name,
      description: site.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'iOS, Android',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      url: site.url,
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
