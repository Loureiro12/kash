import type { Metadata } from 'next';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { DocHeader } from '@/components/privacy/DocHeader';
import { Container } from '@/components/ui/Container';
import { accountDeletion as c } from '@/content/accountDeletion';
import { DeleteAccountFlow } from '@/features/account-deletion/DeleteAccountFlow';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Excluir conta',
  description: 'Exclua sua conta do Kash e todos os seus dados, sem precisar do app.',
  alternates: { canonical: '/excluir-conta' },
  openGraph: { url: '/excluir-conta', title: 'Excluir conta · Kash' },
};

export default function DeleteAccountPage() {
  return (
    <>
      <DocHeader />
      <Container as="main" size="doc" id="conteudo" className={styles.layout}>
        <div className={styles.info}>
          <header className={styles.intro}>
            <h1 className={styles.title}>{c.title}</h1>
            <p className={styles.lead}>{c.lead}</p>
          </header>
          <section aria-labelledby="apagado" className={styles.block}>
            <h2 id="apagado" className={styles.blockTitle}>
              {c.deletedTitle}
            </h2>
            <ul className={styles.list}>
              {c.deleted.map((item) => (
                <li key={item}>
                  <span className={styles.dot} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="antes" className={styles.block}>
            <h2 id="antes" className={styles.blockTitle}>
              {c.notesTitle}
            </h2>
            <ul className={styles.list}>
              {c.notes.map((item) => (
                <li key={item}>
                  <span className={styles.dot} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className={styles.muted}>{c.inApp}</p>
          </section>
        </div>
        <div className={styles.flow}>
          <DeleteAccountFlow />
          <aside className={styles.fallback} aria-labelledby="sem-acesso">
            <h2 id="sem-acesso" className={styles.fallbackTitle}>
              {c.fallbackTitle}
            </h2>
            <p className={styles.muted}>{c.fallback}</p>
            <a href={c.fallbackMailto} className={styles.fallbackLink} data-testid="delete-by-email">
              Pedir a exclusão por e-mail →
            </a>
          </aside>
        </div>
      </Container>
      <SiteFooter size="doc" />
    </>
  );
}
