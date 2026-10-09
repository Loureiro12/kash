'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/kash/session';
import { useUi } from '@/kash/ui';
import { routes } from '@/features/app/nav';
import s from './auth.module.css';

const BENEFITS = ['Lance gastos de cartão e débito, à vista ou parcelado', 'Nunca mais esqueça uma conta fixa', 'Veja o mês que vem antes de ele chegar'];

/**
 * Login/cadastro (handoff): painel verde com a proposta + formulário. Em telas estreitas o painel
 * vira um cabeçalho compacto. Com sessão aberta, vai direto para o app.
 */
export function AuthLayout({ title, subtitle, children, testID }: { title: string; subtitle: string; children: React.ReactNode; testID?: string }) {
  const session = useSession();
  const recovering = useUi((st) => st.recovering);
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'signedIn' && !recovering) router.replace(routes.home);
  }, [session.status, recovering, router]);

  return (
    <div className={s.grid}>
      <aside className={s.panel}>
        <Link href="/" className={s.logo} aria-label="Kash, página inicial">
          <span className={s.mark} aria-hidden="true">
            K
          </span>
          <span className={s.word}>Kash</span>
        </Link>
        <div className={s.pitch}>
          <p className={s.headline}>Sua grana, sem mistério.</p>
          <p className={s.lead}>Cartões, contas e boletos num lugar só. Lance um gasto em 3 toques e saiba quanto sobra até o fim do mês.</p>
          <ol className={s.benefits}>
            {BENEFITS.map((b, i) => (
              <li key={b}>
                <span className={s.num} aria-hidden="true">
                  {i + 1}
                </span>
                {b}
              </li>
            ))}
          </ol>
        </div>
      </aside>
      <main id="conteudo" className={s.formSide}>
        <div className={s.form} data-testid={testID}>
          <h1 className={s.title}>{title}</h1>
          <p className={s.subtitle}>{subtitle}</p>
          {session.status === 'unconfigured' ? (
            <p className={s.error} role="alert">
              O Kash web ainda não está ligado ao servidor neste ambiente.
            </p>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

export { s as authStyles };
