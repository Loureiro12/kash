'use client';

import { budgetStatus, formatBRL, monthSpent } from '@kash/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/app/Icon';
import { Avatar, Badge, Button, Card, DashedButton, Group, GroupRow, MoneyInput, ProgressBar, TextInput, uiStyles } from '@/components/app/ui';
import { readableInk } from '@/components/app/colors';
import { privacyContact, privacyIntro, privacySections, formatLongDate } from '@/content/privacy';
import { helpFaq, SUPPORT_EMAIL, termsDoc } from '@/content/terms';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { categoriesWithUsage } from '@/kash/views';
import { useNow } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';
import { WEB_VERSION } from './ProfileScreen';
import p from './profile.module.css';

const backToProfile = { href: routes.profile, label: 'Voltar ao perfil' };

/* ---------- Dados pessoais ---------- */

export function PersonalScreen() {
  const { user } = useKash();
  const actions = useKashActions();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== user.name || phone.trim() !== user.phone;
  const nameError = name.trim().length < 2 ? 'Digite seu nome (pelo menos 2 letras).' : null;
  const canSave = changed && !nameError;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const ok = await actions.updateUser({ name, phone });
    setSaving(false);
    if (ok) router.push(routes.profile);
  };

  return (
    <>
      <PageHeader title="Dados pessoais" subtitle="Seu nome aparece na saudação e no avatar." back={backToProfile} />
      <Card as="div" className={p.narrow}>
        <div className={p.avatarRow}>
          <Avatar name={name || user.name} size={56} />
          <span className={s.meta}>A inicial do seu nome vira seu avatar.</span>
        </div>
        <form className={p.form} onSubmit={(e) => void onSubmit(e)} noValidate>
          <TextInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" error={changed && nameError ? nameError : null} testID="personal-name" large />
          <TextInput label="E-mail" value={user.email} readOnly disabled hint="É o e-mail de acesso. Pra trocar, fale com o suporte." testID="personal-email" large />
          <TextInput label="Celular" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" inputMode="tel" autoComplete="tel" testID="personal-phone" large />
          <Button type="submit" disabled={!canSave} loading={saving} testID="personal-save">
            Salvar alterações
          </Button>
        </form>
      </Card>
    </>
  );
}

/* ---------- Segurança ---------- */

export function SecurityScreen() {
  const openModal = useUi((st) => st.openModal);
  return (
    <>
      <PageHeader title="Segurança" subtitle="Senha de acesso ao Kash (vale para o app e para a web)." back={backToProfile} />
      <div className={p.narrow}>
        <Group title="Acesso">
          <GroupRow title="Alterar senha" subtitle="Confirme a senha atual e escolha uma nova" onClick={() => openModal({ name: 'changePassword' })} testID="security-password" />
        </Group>
        <Card as="div" testID="security-tip" style={{ background: 'var(--surface2)' }}>
          <h2 className={uiStyles.cardTitle} style={{ marginBottom: 6 }}>
            Dica
          </h2>
          <p className={s.body}>O Kash nunca pede sua senha por e-mail ou mensagem. Se alguém pedir, não é a gente. Desbloqueio com Face ID e digital fica no app do celular.</p>
        </Card>
      </div>
    </>
  );
}

/* ---------- Limite mensal ---------- */

export function BudgetScreen() {
  const { settings, txs } = useKash();
  const now = useNow();
  const actions = useKashActions();
  const router = useRouter();
  const [value, setValue] = useState(settings.monthlyBudget);
  const [saving, setSaving] = useState(false);
  const spent = useMemo(() => monthSpent(txs, now), [txs, now]);
  const preview = budgetStatus(spent, value);
  const canSave = value > 0 && value !== settings.monthlyBudget;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const ok = await actions.updateSettings({ monthlyBudget: Math.round(value * 100) / 100 }, `Limite mensal: ${formatBRL(value)}`);
    setSaving(false);
    if (ok) router.push(routes.profile);
  };

  return (
    <>
      <PageHeader title="Limite mensal" subtitle="Quanto você quer gastar por mês, no máximo. O Kash usa esse valor no Início, no Relatório e na Previsão." back={backToProfile} />
      <form className={p.narrow} onSubmit={(e) => void onSubmit(e)} noValidate>
        <Card as="div" className={p.form}>
          <MoneyInput label="Limite por mês" value={value} onChangeValue={setValue} testID="budget-input" className={p.budgetValue} style={{ height: 64 }} />
          <div className={s.between}>
            <b>Gasto até agora</b>
            <span className={s.meta}>
              {formatBRL(spent)} · {value > 0 ? preview.pct : 0}%
            </span>
          </div>
          <ProgressBar pct={value > 0 ? preview.pct : 0} label="Gasto do mês em relação ao limite" />
          <span className={value > 0 && preview.left > 0 ? s.meta : `${s.meta} ${s.neg}`} data-testid="budget-preview-message">
            {value > 0 ? preview.message : 'Digite um valor maior que zero'}
          </span>
        </Card>
        <Button type="submit" disabled={!canSave} loading={saving} testID="budget-save">
          Salvar limite
        </Button>
      </form>
    </>
  );
}

/* ---------- Categorias ---------- */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function CategoriesScreen() {
  const snap = useKash();
  const openModal = useUi((st) => st.openModal);
  const list = useMemo(() => categoriesWithUsage(snap), [snap]);
  return (
    <>
      <PageHeader title="Categorias" subtitle="Organize seus gastos do seu jeito. Clique numa categoria pra mudar nome e cor ou excluir." back={backToProfile} />
      <div className={p.narrow}>
        <div className={uiStyles.group} data-testid="categories-list">
          {list.map((c) => {
            const parts = [c.usage.txs ? plural(c.usage.txs, 'lançamento', 'lançamentos') : '', c.usage.bills ? plural(c.usage.bills, 'conta fixa', 'contas fixas') : ''].filter(Boolean);
            return (
              <button key={c.id} type="button" className={uiStyles.groupRow} onClick={() => openModal({ name: 'category', id: c.id })} data-testid={`category-${c.name}`}>
                <span className={p.catTile} style={{ background: c.color, color: readableInk(c.color) }} aria-hidden="true">
                  {c.name[0]?.toUpperCase()}
                </span>
                <span className={uiStyles.groupRowTitle}>
                  <span>{c.name}</span>
                  <span className={uiStyles.hint}>{parts.join(' · ') || 'Sem uso'}</span>
                </span>
                <Icon name="chevronRight" size={16} className={uiStyles.hint} />
              </button>
            );
          })}
        </div>
        <DashedButton onClick={() => openModal({ name: 'category' })} testID="categories-add" plus={false} style={{ height: 52, borderRadius: 16 }}>
          + Nova categoria
        </DashedButton>
      </div>
    </>
  );
}

/* ---------- Moeda ---------- */

const CURRENCIES = [
  { code: 'BRL', label: 'Real', symbol: 'R$', available: true },
  { code: 'USD', label: 'Dólar americano', symbol: 'US$', available: false },
  { code: 'EUR', label: 'Euro', symbol: '€', available: false },
] as const;

export function CurrencyScreen() {
  const { settings } = useKash();
  return (
    <>
      <PageHeader title="Moeda" subtitle="Moeda usada para mostrar seus valores. Lançamentos continuam sendo registrados no valor original." back={backToProfile} />
      <div className={p.narrow}>
        <div className={uiStyles.group} role="radiogroup" aria-label="Moeda">
          {CURRENCIES.map((c) => {
            const selected = c.code === settings.currency;
            return (
              <div key={c.code} role="radio" aria-checked={selected} aria-disabled={!c.available} className={uiStyles.groupRow} style={{ opacity: c.available ? 1 : 0.55 }} data-testid={`currency-${c.code}`}>
                <span className={p.currency} aria-hidden="true">
                  {c.symbol}
                </span>
                <span className={uiStyles.groupRowTitle}>
                  <span>{c.label}</span>
                </span>
                {c.available ? selected ? <Icon name="check" size={18} className={s.pos} /> : null : <Badge>em breve</Badge>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ---------- Ajuda ---------- */

export function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  const mail = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  return (
    <>
      <PageHeader title="Ajuda e suporte" subtitle="Perguntas frequentes e como falar com a gente." back={backToProfile} />
      <div className={p.narrow}>
        <Group title="Perguntas frequentes">
          {helpFaq.map((item, i) => {
            const expanded = open === i;
            return (
              <div key={item.q} className={p.faqItem}>
                <button type="button" className={p.faqQ} aria-expanded={expanded} aria-controls={`faq-${i}`} onClick={() => setOpen(expanded ? null : i)} data-testid={`help-faq-${i}`}>
                  {item.q}
                  <Icon name="chevronRight" size={16} />
                </button>
                <p id={`faq-${i}`} className={p.faqA} hidden={!expanded} data-testid={`help-faq-${i}-answer`}>
                  {item.a}
                </p>
              </div>
            );
          })}
        </Group>
        <Group title="Fale com a gente">
          <GroupRow title="Enviar uma dúvida" subtitle={SUPPORT_EMAIL} href={mail('Dúvida sobre o Kash')} testID="help-contact" />
          <GroupRow title="Reportar um problema" subtitle="Conta o que aconteceu e a gente resolve" href={mail('Problema no Kash (web)')} testID="help-report" />
        </Group>
        <p className={s.meta} style={{ textAlign: 'center' }}>
          Kash Web {WEB_VERSION}
        </p>
      </div>
    </>
  );
}

/* ---------- Termos e privacidade ---------- */

export function TermsScreen() {
  return (
    <>
      <PageHeader title={termsDoc.title} subtitle={`Atualizado em ${formatLongDate(termsDoc.updatedAt)}`} back={backToProfile} />
      <article className={p.doc} data-testid="terms-doc">
        {termsDoc.sections.map((sec) => (
          <section key={sec.title} className={p.docSection}>
            <h2>{sec.title}</h2>
            <p>{sec.body}</p>
          </section>
        ))}
      </article>
    </>
  );
}

export function PrivacyScreen() {
  return (
    <>
      <PageHeader title={privacyIntro.title} subtitle={`Atualizado em ${formatLongDate(privacyIntro.updatedAt)}`} back={backToProfile} />
      <article className={p.doc} data-testid="privacy-doc">
        <Card accent as="div">
          <h2 className={s.tipTitle}>{privacyIntro.summaryTitle}</h2>
          <p className={s.tipText}>{privacyIntro.summary}</p>
        </Card>
        {privacySections.map((sec, i) => (
          <section key={sec.id} className={p.docSection}>
            <h2>
              {i + 1}. {sec.title}
            </h2>
            {sec.paragraphs.map((para) => (
              <p key={para}>{para}</p>
            ))}
            {sec.list?.length ? (
              <ul>
                {sec.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        <section className={p.docSection}>
          <h2>{privacyContact.title}</h2>
          <p>
            {privacyContact.before} <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a>. {privacyContact.after}
          </p>
        </section>
        <p className={s.meta}>
          Também disponível no site: <Link href="/privacidade">kash.app/privacidade</Link>
        </p>
      </article>
    </>
  );
}
