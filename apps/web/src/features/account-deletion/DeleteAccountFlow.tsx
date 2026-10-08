'use client';

import { deleteOwnAccount, signIn, toKashError, type KashClient } from '@kash/supabase-client';
import Link from 'next/link';
import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { accountDeletion } from '@/content/accountDeletion';
import { createEphemeralClient } from '@/lib/supabase';
import { flowReducer, initialFlow, validateCredentials } from './flow';
import styles from './DeleteAccountFlow.module.css';

/**
 * Passo a passo: entrar (só para confirmar que a conta é sua) → confirmar → excluir.
 * A sessão fica só na memória desta aba e é descartada ao cancelar ou ao terminar.
 */
export function DeleteAccountFlow() {
  const [state, dispatch] = useReducer(flowReducer, initialFlow);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const client = useRef<KashClient | null | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const [available, setAvailable] = useState(true);

  const db = () => {
    if (client.current === undefined) client.current = createEphemeralClient();
    return client.current;
  };

  useEffect(() => {
    if (!db()) setAvailable(false);
  }, []);

  // a cada passo, o foco vai para o título (leitores de tela anunciam a mudança)
  useEffect(() => {
    if (state.step === 'confirm' || state.step === 'done') heading.current?.focus();
  }, [state.step]);

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validateCredentials(email, password);
    if (invalid) {
      dispatch({ type: 'submitSignIn' });
      dispatch({ type: 'failed', message: invalid });
      return;
    }
    const supabase = db();
    if (!supabase) return;
    dispatch({ type: 'submitSignIn' });
    try {
      const session = await signIn(supabase, { email, password });
      setPassword('');
      dispatch({ type: 'signedIn', email: session.user.email ?? email.trim() });
    } catch (err) {
      dispatch({ type: 'failed', message: toKashError(err).message });
    }
  };

  const onDelete = async () => {
    const supabase = db();
    if (!supabase) return;
    dispatch({ type: 'submitDelete' });
    try {
      await deleteOwnAccount(supabase);
      dispatch({ type: 'deleted' });
    } catch (err) {
      dispatch({ type: 'failed', message: toKashError(err).message });
    }
  };

  const onCancel = async () => {
    await db()?.auth.signOut({ scope: 'local' });
    setEmail('');
    dispatch({ type: 'cancel' });
  };

  if (!available) {
    return (
      <div className={styles.card} data-testid="delete-unavailable">
        <h2 className={styles.stepTitle}>Exclusão online indisponível agora</h2>
        <p className={styles.text}>{accountDeletion.fallback}</p>
        <a className={styles.secondary} href={accountDeletion.fallbackMailto}>
          Pedir por e-mail
        </a>
      </div>
    );
  }

  if (state.step === 'done') {
    return (
      <div className={styles.card} data-testid="delete-done">
        <span className={styles.doneIcon} aria-hidden="true">
          ✓
        </span>
        <h2 ref={heading} tabIndex={-1} className={styles.stepTitle}>
          Conta excluída
        </h2>
        <p className={styles.text}>
          A conta <strong>{state.email}</strong> e todos os dados dela foram apagados. Se o app ainda estiver instalado no seu celular, é só desinstalar.
        </p>
        <Link href="/" className={styles.secondary}>
          Voltar ao site
        </Link>
      </div>
    );
  }

  if (state.step === 'confirm' || state.step === 'deleting') {
    const deleting = state.step === 'deleting';
    return (
      <div className={styles.card} data-testid="delete-confirm">
        <p className={styles.stepLabel}>Passo 2 de 2</p>
        <h2 ref={heading} tabIndex={-1} className={styles.stepTitle}>
          Confirme a exclusão
        </h2>
        <p className={styles.text}>
          Você está prestes a excluir a conta <strong data-testid="delete-email">{state.email}</strong> e tudo que foi lançado nela.
        </p>
        <label className={styles.ack}>
          <input type="checkbox" checked={state.acknowledged} onChange={(e) => dispatch({ type: 'toggleAck', value: e.target.checked })} disabled={deleting} data-testid="delete-ack" />
          <span>Entendo que a exclusão é permanente e não dá pra recuperar meus dados.</span>
        </label>
        {state.error ? (
          <p className={styles.error} role="alert" data-testid="delete-error">
            {state.error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={styles.danger} onClick={() => void onDelete()} disabled={!state.acknowledged || deleting} data-testid="delete-submit">
            {deleting ? 'Excluindo…' : 'Excluir minha conta'}
          </button>
          <button type="button" className={styles.ghost} onClick={() => void onCancel()} disabled={deleting} data-testid="delete-cancel">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const signingIn = state.step === 'signingIn';
  return (
    <form className={styles.card} onSubmit={(e) => void onSignIn(e)} noValidate data-testid="delete-signin">
      <p className={styles.stepLabel}>Passo 1 de 2</p>
      <h2 className={styles.stepTitle}>Entre na sua conta</h2>
      <p className={styles.text}>Pra confirmar que a conta é sua. A sessão vale só pra esta exclusão e não fica salva neste navegador.</p>
      <label className={styles.field}>
        <span className={styles.label}>E-mail</span>
        <input className={styles.input} type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={signingIn} required data-testid="delete-email-input" />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Senha</span>
        <input className={styles.input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={signingIn} required data-testid="delete-password-input" />
      </label>
      {state.error ? (
        <p className={styles.error} role="alert" data-testid="delete-error">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={styles.primary} disabled={signingIn} data-testid="delete-continue">
        {signingIn ? 'Confirmando…' : 'Continuar'}
      </button>
    </form>
  );
}
