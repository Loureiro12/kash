'use client';

import { moneyFromTyped } from '@kash/domain';
import { maskedMoney } from '@/kash/money';
import Link from 'next/link';
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { accountColors, cardAppearance, colorSuggestions } from './colors';
import { Icon, type IconName } from './Icon';
import s from './ui.module.css';

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/* ---------- botões ---------- */

export type ButtonVariant = 'primary' | 'secondary' | 'surface' | 'soft' | 'dangerSoft' | 'danger' | 'inverse' | 'link';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
  loading?: boolean;
  testID?: string;
}

export function Button({ variant = 'primary', size = 'lg', full, loading, testID, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-testid={testID}
      className={cx(s.btn, s[variant], size !== 'lg' && s[size], full && s.full, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={s.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function PillButton({ testID, className, children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { testID?: string }) {
  return (
    <button type={type} data-testid={testID} className={cx(s.pillBtn, className)} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({ icon, label, testID, className, type = 'button', size = 18, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; testID?: string; size?: number }) {
  return (
    <button type={type} aria-label={label} title={label} data-testid={testID} className={cx(s.iconBtn, className)} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

export function DashedButton({ children, testID, className, style, onClick, plus = true }: { children: ReactNode; testID?: string; className?: string; style?: React.CSSProperties; onClick: () => void; plus?: boolean }) {
  return (
    <button type="button" className={cx(s.dashed, className)} style={style} onClick={onClick} data-testid={testID}>
      {plus ? (
        <span className={s.dashedPlus} aria-hidden="true">
          +
        </span>
      ) : null}
      {children}
    </button>
  );
}

/* ---------- cards ---------- */

export function Card({ children, accent, list, className, testID, as: As = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & { accent?: boolean; list?: boolean; testID?: string; as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={cx(s.card, accent && s.cardAccent, list && s.cardList, className)} data-testid={testID} {...rest}>
      {children}
    </As>
  );
}

/** Card inteiro clicável (navega ou abre algo). */
export function CardLink({ href, children, accent, className, testID, label }: { href: string; children: ReactNode; accent?: boolean; className?: string; testID?: string; label?: string }) {
  return (
    <Link href={href} className={cx(s.card, s.clickable, accent && s.cardAccent, className)} data-testid={testID} aria-label={label}>
      {children}
    </Link>
  );
}

export function CardHeader({ title, action, id }: { title: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className={s.cardHead}>
      <h2 className={s.cardTitle} id={id}>
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ---------- campos ---------- */

export function Field({ label, htmlFor, hint, error, children, className }: { label?: ReactNode; htmlFor?: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={cx(s.field, className)}>
      {label ? (
        <label className={s.label} htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className={s.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={s.hint}>{hint}</span>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  testID?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  large?: boolean;
  fieldClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ testID, label, hint, error, large, id, className, fieldClassName, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;
  return (
    <Field label={label} htmlFor={inputId} className={fieldClassName} error={null} hint={null}>
      <input ref={ref} id={inputId} data-testid={testID} className={cx(s.input, large && s.inputLg, className)} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
      {error ? (
        <span id={describedBy} className={s.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={describedBy} className={s.hint}>
          {hint}
        </span>
      ) : null}
    </Field>
  );
});

/** Senha com o "olhinho" para mostrar/ocultar. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<TextInputProps, 'type'>>(function PasswordInput({ testID, label, hint, error, id, fieldClassName, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const describedBy = error || hint ? `${inputId}-desc` : undefined;
  return (
    <Field label={label} htmlFor={inputId} className={fieldClassName}>
      <div className={s.inputWrap}>
        <input ref={ref} id={inputId} type={visible ? 'text' : 'password'} data-testid={testID} className={cx(s.input, s.inputLg)} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
        <button type="button" className={s.inputAction} onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} data-testid={testID ? `${testID}-toggle` : undefined}>
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {error ? (
        <span id={describedBy} className={s.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={describedBy} className={s.hint}>
          {hint}
        </span>
      ) : null}
    </Field>
  );
});

/**
 * Campo de dinheiro com máscara (igual ao app): só dígitos, que entram pelos centavos
 * (1 → R$ 0,01 · 1250 → R$ 12,50). Com `allowNegative`, o botão ± troca o sinal.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<TextInputProps, 'value' | 'onChange' | 'type'> & { value: number; onChangeValue: (value: number) => void; allowNegative?: boolean }>(function MoneyInput(
  { value, onChangeValue, allowNegative, testID, label, hint, error, id, fieldClassName, placeholder = 'R$ 0,00', className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const negative = value < 0;
  const input = (
    <input
      ref={ref}
      id={inputId}
      data-testid={testID}
      className={cx(s.input, className)}
      inputMode="numeric"
      autoComplete="off"
      value={maskedMoney(value)}
      placeholder={placeholder}
      aria-invalid={error ? true : undefined}
      onChange={(e) => {
        const abs = moneyFromTyped(e.target.value);
        onChangeValue(negative ? -abs : abs);
      }}
      {...rest}
    />
  );
  return (
    <Field label={label} htmlFor={inputId} className={fieldClassName} hint={hint} error={error}>
      {allowNegative ? (
        <div className={s.inputWrap}>
          {input}
          <button type="button" className={s.inputAction} onClick={() => onChangeValue(-value)} aria-label={negative ? 'Tornar positivo' : 'Tornar negativo'} data-testid={testID ? `${testID}-sign` : undefined}>
            <Icon name="plusMinus" size={18} />
          </button>
        </div>
      ) : (
        input
      )}
    </Field>
  );
});

/** Dia do mês (1..31): só dígitos, até 2. */
export function DayInput({ value, onChange, ...rest }: Omit<TextInputProps, 'value' | 'onChange'> & { value: string; onChange: (value: string) => void }) {
  return <TextInput inputMode="numeric" autoComplete="off" maxLength={2} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))} {...rest} />;
}

export const parseDay = (v: string): number | null => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null;
};

/* ---------- chips / escolha ---------- */

export function ChipGroup({ label, children, testID }: { label: string; children: ReactNode; testID?: string }) {
  const id = useId();
  return (
    <div className={s.field}>
      <span className={s.label} id={id}>
        {label}
      </span>
      <div className={s.chips} role="radiogroup" aria-labelledby={id} data-testid={testID}>
        {children}
      </div>
    </div>
  );
}

/** Opção de um grupo (radio). `soft`: estilo das origens ("Pago com"). */
export function Chip({ label, selected, onSelect, dotColor, soft, testID, disabled }: { label: string; selected: boolean; onSelect: () => void; dotColor?: string; soft?: boolean; testID?: string; disabled?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={selected} className={cx(s.chip, soft && s.chipSoft)} onClick={onSelect} data-testid={testID} disabled={disabled}>
      {dotColor ? <span className={s.dot} style={{ background: dotColor }} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

/** Filtro liga/desliga (aria-pressed). */
export function ToggleChip({ label, pressed, onToggle, dotColor, testID }: { label: string; pressed: boolean; onToggle: () => void; dotColor?: string; testID?: string }) {
  return (
    <button type="button" aria-pressed={pressed} className={s.chip} onClick={onToggle} data-testid={testID}>
      {dotColor ? <span className={s.dot} style={{ background: dotColor }} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, testID }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; testID?: string }>; label: string; testID?: string }) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={label} data-testid={testID}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={s.segment} onClick={() => onChange(o.value)} data-testid={o.testID}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, testID }: { checked: boolean; onChange: (next: boolean) => void; label: string; testID?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={s.switch} onClick={() => onChange(!checked)} data-testid={testID}>
      <span className={s.knob} aria-hidden="true" />
    </button>
  );
}

export function Stepper({ value, onChange, min, max, format = (v) => `${v}x`, decLabel, incLabel, testID }: { value: number; onChange: (v: number) => void; min: number; max: number; format?: (v: number) => string; decLabel: string; incLabel: string; testID?: string }) {
  return (
    <div className={s.stepper} data-testid={testID}>
      <button type="button" className={s.stepBtn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={decLabel} data-testid={testID ? `${testID}-dec` : undefined}>
        −
      </button>
      <span className={s.stepValue} aria-live="polite" data-testid={testID ? `${testID}-value` : undefined}>
        {format(value)}
      </span>
      <button type="button" className={s.stepBtn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={incLabel} data-testid={testID ? `${testID}-inc` : undefined}>
        +
      </button>
    </div>
  );
}

/* ---------- cores ---------- */

/**
 * Paleta + cor personalizada (seletor nativo do navegador). `value` é a cor escolhida;
 * a personalizada fica marcada quando não está na paleta.
 */
export function ColorPicker({ label, palette = accountColors, value, onChange, testID, size = 36, allowCustom = true }: { label: string; palette?: readonly string[]; value: string; onChange: (hex: string) => void; testID?: string; size?: number; allowCustom?: boolean }) {
  const id = useId();
  const inPalette = palette.some((c) => c.toUpperCase() === value.toUpperCase());
  return (
    <div className={s.field}>
      <span className={s.label} id={id}>
        {label}
      </span>
      <div className={s.swatches} role="radiogroup" aria-labelledby={id} data-testid={testID}>
        {palette.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={c.toUpperCase() === value.toUpperCase()} aria-label={`Cor ${i + 1}`} className={s.swatch} style={{ width: size, height: size }} onClick={() => onChange(c)} data-testid={testID ? `${testID}-${i}` : undefined}>
            <span style={{ background: c }} />
          </button>
        ))}
        {allowCustom ? <CustomSwatch value={inPalette ? null : value} selected={!inPalette} onChange={onChange} size={size} testID={testID ? `${testID}-custom` : undefined} /> : null}
      </div>
    </div>
  );
}

export function CustomSwatch({ value, selected, onChange, size = 36, testID, fallback = colorSuggestions[6] }: { value: string | null; selected: boolean; onChange: (hex: string) => void; size?: number; testID?: string; fallback?: string }) {
  return (
    <label className={cx(s.swatch, s.customSwatch, selected && s.swatchOn)} style={{ width: size, height: size }} title="Escolher outra cor">
      <span className={value ? undefined : s.rainbow} style={value ? { background: value } : undefined} />
      <input type="color" value={(value ?? fallback).toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={selected ? 'Cor personalizada (selecionada)' : 'Cor personalizada'} data-testid={testID} />
    </label>
  );
}

/* ---------- progresso ---------- */

export function ProgressBar({ pct, height = 8, color, track, label }: { pct: number; height?: number; color?: string; track?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={s.track} style={{ height, background: track }} role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={s.fill} style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

export function Ring({ pct, color, size = 88, testID }: { pct: number; color: string; size?: number; testID?: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className={s.ring} style={{ width: size, height: size }} data-testid={testID}>
      <svg width={size} height={size} viewBox="0 0 68 68" aria-hidden="true">
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--surface2)" strokeWidth="7" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${filled} ${c}`} transform="rotate(-90 34 34)" />
      </svg>
      <span className={s.ringLabel}>{pct}%</span>
    </div>
  );
}

/* ---------- cartão de crédito ---------- */

export function CreditCardFace({ name, gradientId, color, caption, amount, last4, footerRight, className, style }: { name: string; gradientId: Parameters<typeof cardAppearance>[0]['gradientId']; color?: string | null; caption: string; amount: string; last4: string; footerRight?: string; className?: string; style?: React.CSSProperties }) {
  const look = cardAppearance({ gradientId, color });
  return (
    <div className={cx(s.creditCard, className)} style={{ background: look.background, color: look.ink, ...style }}>
      <div className={s.ccTop}>
        <span className={s.ccName}>{name}</span>
        <span className={s.ccBrand} aria-hidden="true">
          kash
        </span>
      </div>
      <div className={s.ccBottom}>
        <span className={s.ccCaption}>{caption}</span>
        <span className={s.ccAmount}>{amount}</span>
        <span className={s.ccMeta}>
          <span>•••• {last4}</span>
          {footerRight ? <span>{footerRight}</span> : null}
        </span>
      </div>
    </div>
  );
}

/* ---------- miscelânea ---------- */

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
      {(name.trim()[0] ?? 'K').toUpperCase()}
    </span>
  );
}

export function Badge({ tone = 'neutral', children, testID }: { tone?: 'pos' | 'neg' | 'neutral'; children: ReactNode; testID?: string }) {
  return (
    <span className={cx(s.badge, tone === 'pos' ? s.badgePos : tone === 'neg' ? s.badgeNeg : s.badgeNeutral)} data-testid={testID}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, text, action, testID }: { icon: IconName; title: string; text: string; action?: ReactNode; testID?: string }) {
  return (
    <div className={s.empty} data-testid={testID}>
      <span className={s.emptyIcon} aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <p className={s.emptyTitle}>{title}</p>
      <p className={s.emptyText}>{text}</p>
      {action}
    </div>
  );
}

export function Eyebrow({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 className={s.eyebrow} id={id}>
      {children}
    </h2>
  );
}

/** Grupo de linhas (Perfil). */
export function Group({ title, children, testID }: { title?: string; children: ReactNode; testID?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} data-testid={testID}>
      {title ? <Eyebrow id={id}>{title}</Eyebrow> : null}
      <div className={s.group}>{children}</div>
    </section>
  );
}

export function GroupRow({ title, subtitle, value, trailing, href, onClick, chevron, testID }: { title: string; subtitle?: string; value?: ReactNode; trailing?: ReactNode; href?: string; onClick?: () => void; chevron?: boolean; testID?: string }) {
  const content = (
    <>
      <span className={s.groupRowTitle}>
        <span>{title}</span>
        {subtitle ? <span className={s.hint}>{subtitle}</span> : null}
      </span>
      {value !== undefined ? <span className={s.groupRowValue}>{value}</span> : null}
      {trailing}
      {chevron ?? (href || onClick) ? <Icon name="chevronRight" size={16} className={s.hint} /> : null}
    </>
  );
  if (href)
    return (
      <Link href={href} className={s.groupRow} data-testid={testID}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={s.groupRow} onClick={onClick} data-testid={testID}>
        {content}
      </button>
    );
  return (
    <div className={s.groupRow} data-testid={testID}>
      {content}
    </div>
  );
}

export { cx, s as uiStyles };
