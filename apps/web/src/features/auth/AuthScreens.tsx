'use client';

import { RECOVERY_CODE_PATTERN, requestPasswordReset, signIn, signOut, signUp, toKashError, updatePassword, verifyRecoveryCode } from '@kash/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, PasswordInput, TextInput } from '@/components/app/ui';
import { requireKashClient } from '@/kash/client';
import { toast, useUi } from '@/kash/ui';
import { routes } from '@/features/app/nav';
import { AuthLayout, authStyles as s } from './AuthLayout';
import { isValidEmail, MIN_PASSWORD, passwordStrength, validateLogin, validateSignup } from './validation';

/* ---------- Entrar ---------- */

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateLogin(email, password);
    setErrors(next);
    if (next.email || next.password) return;
    setLoading(true);
    setServerError(null);
    try {
      await signIn(requireKashClient(), { email, password });
      router.replace(routes.home);
    } catch (err) {
      setServerError(toKashError(err).message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre pra ver como anda sua grana." testID="login-screen">
      <form className={s.fields} onSubmit={(e) => void onSubmit(e)} noValidate>
        <TextInput label="E-mail" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} testID="login-email" large />
        <PasswordInput label="Senha" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} testID="login-password" />
        <Link href={routes.forgot} className={s.forgot} data-testid="login-forgot">
          Esqueci a senha
        </Link>
        {serverError ? (
          <p className={s.error} role="alert" data-testid="login-error">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" loading={loading} testID="login-submit" style={{ marginTop: 8 }}>
          Entrar
        </Button>
        <Link href={routes.signup} data-testid="login-signup" style={outlineLink}>
          Criar conta grátis
        </Link>
      </form>
    </AuthLayout>
  );
}

const outlineLink: React.CSSProperties = {
  height: 50,
  borderRadius: 16,
  border: '1px solid var(--line)',
  color: 'var(--text)',
  fontWeight: 600,
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
};

/* ---------- Criar conta ---------- */

export function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateSignup>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateSignup(name, email, password, accepted);
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    setServerError(null);
    try {
      const session = await signUp(requireKashClient(), { name, email, password });
      if (session) {
        toast(`Conta criada. Boas-vindas ao Kash, ${name.trim().split(' ')[0]}!`);
        router.replace(routes.home);
        return;
      }
      setNeedsConfirmation(true);
    } catch (err) {
      setServerError(toKashError(err).message);
    }
    setLoading(false);
  };

  if (needsConfirmation) {
    return (
      <AuthLayout title="Confira seu e-mail" subtitle={`Enviamos um link de confirmação pra ${email.trim()}. Depois de confirmar, é só entrar.`} testID="signup-confirm">
        <Link href={routes.login} style={outlineLink}>
          Ir para o login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Leva 1 minuto. Sem cartão, sem senha de banco." testID="signup-screen">
      <form className={s.fields} onSubmit={(e) => void onSubmit(e)} noValidate>
        <TextInput label="Nome" autoComplete="name" placeholder="Como a gente te chama?" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} testID="signup-name" large />
        <TextInput label="E-mail" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} testID="signup-email" large />
        <PasswordInput label="Senha" autoComplete="new-password" placeholder={`Mínimo ${MIN_PASSWORD} caracteres`} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} testID="signup-password" />
        {password ? (
          <div className={s.strength} aria-live="polite">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`${s.strengthBar} ${strength.score >= i ? s.strengthOn : ''}`} aria-hidden="true" />
            ))}
            <span style={{ marginLeft: 8 }}>{strength.label}</span>
          </div>
        ) : null}
        <label className={s.terms}>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} data-testid="signup-terms" aria-invalid={errors.terms ? true : undefined} />
          <span>
            Li e aceito os <Link href="/privacidade">termos e a política de privacidade</Link>.
          </span>
        </label>
        {errors.terms ? (
          <p className={s.error} role="alert">
            {errors.terms}
          </p>
        ) : null}
        {serverError ? (
          <p className={s.error} role="alert" data-testid="signup-error">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" loading={loading} testID="signup-submit" style={{ marginTop: 8 }}>
          Criar conta
        </Button>
        <p className={s.foot}>
          Já tem conta?{' '}
          <Link href={routes.login} className={s.inlineLink} data-testid="signup-login">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

/* ---------- Esqueci a senha (código por e-mail → nova senha) ---------- */

type ForgotStep = 'email' | 'code' | 'password';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const setRecovering = useUi((st) => st.setRecovering);
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const digits = code.replace(/\D/g, '');

  // saiu da tela no meio da recuperação: a sessão provisória não vale como login
  useEffect(
    () => () => {
      if (useUi.getState().recovering) {
        setRecovering(false);
        void signOut(requireKashClient()).catch(() => undefined);
      }
    },
    [setRecovering],
  );

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidEmail(email)) {
      setError('Esse e-mail não parece válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(requireKashClient(), email);
      if (step === 'code') toast('Enviamos um código novo');
      setStep('code');
    } catch (err) {
      setError(toKashError(err).message);
    }
    setLoading(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!RECOVERY_CODE_PATTERN.test(digits)) {
      setError('Digite o código que chegou no seu e-mail.');
      return;
    }
    setLoading(true);
    setError(null);
    // a sessão de recuperação abre aqui: o layout não deve mandar direto para o app
    setRecovering(true);
    try {
      await verifyRecoveryCode(requireKashClient(), email, digits);
      setStep('password');
    } catch (err) {
      setRecovering(false);
      setError(toKashError(err).message);
    }
    setLoading(false);
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updatePassword(requireKashClient(), password);
      setRecovering(false);
      toast('Senha alterada. Boas-vindas de volta!');
      router.replace(routes.home);
    } catch (err) {
      setError(toKashError(err).message);
      setLoading(false);
    }
  };

  if (step === 'password') {
    return (
      <AuthLayout title="Crie uma senha nova" subtitle="Escolha uma senha que você não usa em outros lugares." testID="forgot-new-password">
        <form className={s.fields} onSubmit={(e) => void savePassword(e)} noValidate>
          <PasswordInput label={`Nova senha (mín. ${MIN_PASSWORD} caracteres)`} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} testID="reset-password" />
          <PasswordInput label="Confirmar nova senha" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} testID="reset-confirm" />
          {error ? (
            <p className={s.error} role="alert" data-testid="forgot-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} testID="reset-submit">
            Salvar e entrar
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (step === 'code') {
    return (
      <AuthLayout title="Confira seu e-mail" subtitle={`Se ${email.trim()} tiver uma conta no Kash, chega um código pra você criar uma senha nova. Ele vale por 1 hora.`} testID="forgot-sent">
        <form className={s.fields} onSubmit={(e) => void verify(e)} noValidate>
          <TextInput label="Código" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} className={s.code} testID="forgot-code" large />
          {error ? (
            <p className={s.error} role="alert" data-testid="forgot-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} disabled={!RECOVERY_CODE_PATTERN.test(digits)} testID="forgot-verify">
            Continuar
          </Button>
          <Button variant="secondary" size="md" onClick={() => void sendCode()} disabled={loading} testID="forgot-resend">
            Enviar outro código
          </Button>
          <p className={s.foot}>
            <button type="button" className={s.inlineLink} style={{ background: 'none', border: 0, color: 'var(--accentText)', cursor: 'pointer', font: 'inherit' }} onClick={() => setStep('email')}>
              Usar outro e-mail
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci a senha" subtitle="Digite o e-mail da sua conta. A gente manda um código pra você criar uma senha nova." testID="forgot-screen">
      <form className={s.fields} onSubmit={(e) => void sendCode(e)} noValidate>
        <TextInput label="E-mail" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} testID="forgot-email" large />
        {error ? (
          <p className={s.error} role="alert" data-testid="forgot-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={loading} testID="forgot-submit">
          Enviar código
        </Button>
        <p className={s.foot}>
          Lembrou?{' '}
          <Link href={routes.login} className={s.inlineLink} data-testid="forgot-login">
            Voltar pro login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
