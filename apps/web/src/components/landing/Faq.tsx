import { faqs } from '@/content/landing';
import { Container } from '../ui/Container';
import styles from './Faq.module.css';

/**
 * Acordeão sem JavaScript: <details name="faq"> deixa só uma pergunta aberta por vez (navegadores
 * atuais); a primeira começa aberta. Acessível por teclado e leitor de tela nativamente.
 */
export function Faq() {
  return (
    <Container as="section" size="narrow" id="perguntas" className={styles.section} aria-labelledby="faq-title">
      <h2 id="faq-title" className={styles.title}>
        Perguntas frequentes
      </h2>
      <div className={styles.list}>
        {faqs.map((f, i) => (
          <details key={f.q} name="faq" className={styles.item} open={i === 0} data-testid={`faq-${i}`}>
            <summary className={styles.question}>
              <span>{f.q}</span>
              <span className={styles.icon} aria-hidden="true">
                +
              </span>
            </summary>
            <p className={styles.answer}>{f.a}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}
