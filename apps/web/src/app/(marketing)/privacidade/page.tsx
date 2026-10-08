import type { Metadata } from 'next';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { DocHeader } from '@/components/privacy/DocHeader';
import { PolicySectionView } from '@/components/privacy/PolicySectionView';
import { Toc } from '@/components/privacy/Toc';
import { Container } from '@/components/ui/Container';
import { formatLongDate, privacyContact, privacyIntro, privacySections } from '@/content/privacy';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Quais dados o Kash coleta, por que, por quanto tempo guarda e quais são os seus direitos pela LGPD.',
  alternates: { canonical: '/privacidade' },
  openGraph: { url: '/privacidade', title: 'Política de privacidade · Kash' },
};

export default function PrivacyPage() {
  return (
    <>
      <DocHeader />
      <Container as="main" size="doc" id="conteudo" className={styles.layout}>
        <div className={styles.toc}>
          <Toc sections={privacySections} />
        </div>
        <article className={styles.content}>
          <header className={styles.intro}>
            <h1 className={styles.title}>{privacyIntro.title}</h1>
            <p className={styles.updated}>
              Última atualização: <time dateTime={privacyIntro.updatedAt}>{formatLongDate(privacyIntro.updatedAt)}</time>
            </p>
            <aside className={styles.summary} aria-label={privacyIntro.summaryTitle}>
              <p className={styles.summaryTitle}>{privacyIntro.summaryTitle}</p>
              <p>{privacyIntro.summary}</p>
            </aside>
          </header>
          {privacySections.map((s, i) => (
            <PolicySectionView key={s.id} section={s} index={i} />
          ))}
          <aside className={styles.contact} aria-labelledby="contato-title">
            <p id="contato-title" className={styles.contactTitle}>
              {privacyContact.title}
            </p>
            <p className={styles.contactText}>
              {privacyContact.before} <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a>. {privacyContact.after}
            </p>
          </aside>
        </article>
      </Container>
      <SiteFooter size="doc" />
    </>
  );
}
