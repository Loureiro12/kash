'use client';

import { formatBRL, monthKey, monthKeyName } from '@kash/domain';
import {
  amountInText,
  buildImportPlan,
  guessCsvMapping,
  learnedRules,
  parseCsv,
  parseOfx,
  readCsv,
  redactStatementText,
  toAccountItems,
  toCardItems,
  type CsvMapping,
  type CsvTable,
  type ImportMode,
  type ParsedStatement,
  type ReviewRow,
} from '@kash/importers';
import { listImports, listMerchantRules, readStatementWithAi, toKashError } from '@kash/supabase-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { Badge, Button, Card, Chip, ChipGroup, Field, PasswordInput, Segmented, uiStyles } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { requireKashClient } from '@/kash/client';
import { useKash } from '@/kash/data';
import { useSession } from '@/kash/session';
import { useUi } from '@/kash/ui';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import { extractPdfText, PdfPasswordError } from './pdf';
import s from './import.module.css';

type TargetType = 'card' | 'account';
type Format = 'pdf' | 'ofx' | 'csv';
type Step = 'file' | 'review' | 'done';
type RowEdit = Partial<Pick<ReviewRow, 'title' | 'category' | 'include'>>;

const AI_CONSENT_KEY = 'kash-ai-consent';
const formatOf = (name: string): Format | null => (/\.pdf$/i.test(name) ? 'pdf' : /\.ofx$/i.test(name) ? 'ofx' : /\.(csv|txt)$/i.test(name) ? 'csv' : null);

/** Importar fatura (cartão) ou extrato (conta): arquivo → revisão → pronto (com desfazer). */
export function ImportScreen() {
  const snap = useKash();
  const session = useSession();
  const actions = useKashActions();
  const openModal = useUi((st) => st.openModal);
  const [now] = useState(() => new Date());
  const [initialTarget] = useState(() => useUi.getState().importTarget);

  const [step, setStep] = useState<Step>('file');
  const [targetType, setTargetType] = useState<TargetType>(initialTarget?.type ?? 'card');
  const [chosenTargetId, setTargetId] = useState(initialTarget?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  // a tela só renderiza no navegador (depois da sessão), então dá pra ler o consentimento já no início
  const [aiConsent, setAiConsent] = useState(() => {
    try {
      return localStorage.getItem(AI_CONSENT_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState<{ table: CsvTable; mapping: CsvMapping } | null>(null);
  const [needsMapping, setNeedsMapping] = useState(false);
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [mode, setMode] = useState<ImportMode>('installments');
  const [month, setMonth] = useState<string | null>(null);
  const [keepBalance, setKeepBalance] = useState(true);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ id: string; txs: number; plans: number } | null>(null);
  const cardsBefore = useRef(snap.cards.map((c) => c.id));
  const accountsBefore = useRef(snap.accounts.map((a) => a.id));

  const rulesQuery = useQuery({ queryKey: ['rules', session.userId], queryFn: () => listMerchantRules(requireKashClient()), enabled: !!session.userId });
  const importsQuery = useQuery({ queryKey: ['imports', session.userId], queryFn: () => listImports(requireKashClient()), enabled: !!session.userId });

  // cartão/conta criado agora pelo modal vira o destino escolhido
  useEffect(() => {
    const newCard = snap.cards.find((c) => !cardsBefore.current.includes(c.id));
    const newAccount = snap.accounts.find((a) => !accountsBefore.current.includes(a.id));
    if (newCard) {
      setTargetType('card');
      setTargetId(newCard.id);
    } else if (newAccount) {
      setTargetType('account');
      setTargetId(newAccount.id);
    }
    cardsBefore.current = snap.cards.map((c) => c.id);
    accountsBefore.current = snap.accounts.map((a) => a.id);
  }, [snap.cards, snap.accounts]);

  const targets = useMemo(() => (targetType === 'card' ? snap.cards.map((c) => ({ id: c.id, label: `${c.name} •••• ${c.last4}` })) : snap.accounts.map((a) => ({ id: a.id, label: a.name }))), [targetType, snap.cards, snap.accounts]);
  // um cartão (ou uma conta) só: já vem escolhido
  const onlyTargetId = targets.length === 1 ? targets[0]!.id : '';
  const targetId = chosenTargetId || onlyTargetId;
  const target = targets.find((t) => t.id === targetId) ?? null;
  const format = file ? formatOf(file.name) : null;
  const categories = useMemo(() => snap.categories.map((c) => c.name), [snap.categories]);

  const plan = useMemo(() => {
    if (!statement || !targetId) return null;
    return buildImportPlan({ statement, target: { type: targetType, id: targetId }, mode, today: now, statementMonth: month ?? undefined, categories, rules: rulesQuery.data ?? [], existing: { plans: snap.plans, txs: snap.txs } });
  }, [statement, targetType, targetId, mode, month, now, categories, rulesQuery.data, snap.plans, snap.txs]);

  const rows = useMemo(() => (plan ? plan.rows.map((r) => ({ ...r, ...edits[r.key] })) : []), [plan, edits]);
  const included = rows.filter((r) => r.include && r.section !== 'ignored');
  const sum = included.reduce((a, r) => a + (r.section === 'income' ? r.amount : targetType === 'account' ? -r.amount : r.amount), 0);
  const planCount = included.filter((r) => r.section === 'installment').length;
  const txCount = included.length - planCount;

  const edit = (key: string, patch: RowEdit) => setEdits((e) => ({ ...e, [key]: { ...e[key], ...patch } }));

  const read = async () => {
    if (!file || !format || !targetId) return;
    setError(null);
    setReading(true);
    try {
      const text = format === 'pdf' ? '' : await file.text();
      let parsed: ParsedStatement;
      if (format === 'ofx') {
        parsed = parseOfx(text);
        if (parsed.kind !== targetType) {
          setError(parsed.kind === 'card' ? 'Esse OFX é de cartão de crédito. Escolha um cartão como destino.' : 'Esse OFX é de conta. Escolha uma conta como destino.');
          return;
        }
      } else if (format === 'csv') {
        const table = readCsv(text);
        const mapping = csv?.table === table ? csv.mapping : guessCsvMapping(table, targetType);
        if (!mapping) {
          setCsv({ table, mapping: { date: 0, description: 1, amount: 2, expensesArePositive: targetType === 'card' } });
          setNeedsMapping(true);
          return;
        }
        parsed = parseCsv(table, mapping, targetType);
      } else {
        if (!aiConsent) {
          setError('Pra ler PDF, autorize o envio do texto (sem seus dados pessoais) para a IA.');
          return;
        }
        let raw: string;
        try {
          raw = await extractPdfText(file, password || undefined);
        } catch (err) {
          if (err instanceof PdfPasswordError) {
            setNeedsPassword(true);
            setError(err.wrong ? 'Senha incorreta. Tente de novo.' : 'Esse PDF tem senha. Em geral são os primeiros dígitos do seu CPF (veja no e-mail do banco).');
            return;
          }
          throw err;
        }
        const clean = redactStatementText(raw, { names: [snap.user.name] });
        setSourceText(clean);
        parsed = await readStatementWithAi<ParsedStatement>(requireKashClient(), { text: clean, kind: targetType, categories });
      }
      if (parsed.lines.length === 0) {
        setError('Não encontramos lançamentos nesse arquivo.');
        return;
      }
      setStatement(parsed);
      setEdits({});
      setMonth(null);
      setMode('installments');
      setStep('review');
    } catch (err) {
      setError(toKashError(err).message);
    } finally {
      setReading(false);
    }
  };

  const readMapped = () => {
    if (!csv) return;
    const parsed = parseCsv(csv.table, csv.mapping, targetType);
    if (parsed.lines.length === 0) {
      setError('Com essas colunas não encontramos lançamentos. Confira a coluna de data e de valor.');
      return;
    }
    setNeedsMapping(false);
    setStatement(parsed);
    setEdits({});
    setStep('review');
  };

  const save = async () => {
    if (!plan || !format || !file || included.length === 0) return;
    setSaving(true);
    const items = targetType === 'card' ? toCardItems(rows) : toAccountItems(rows);
    const id = await actions.importStatement({ target: { type: targetType, id: targetId }, fileName: file.name, format, statementMonth: plan.statementMonth, items, keepBalance }, learnedRules(rows, plan.rows));
    setSaving(false);
    if (id) {
      setResult({ id, txs: txCount, plans: planCount });
      setStep('done');
    }
  };

  const restart = () => {
    setStep('file');
    setFile(null);
    setStatement(null);
    setPassword('');
    setNeedsPassword(false);
    setError(null);
    setResult(null);
    setCsv(null);
    setNeedsMapping(false);
  };

  const monthOptions = useMemo(() => Array.from({ length: 13 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))), [now]);

  return (
    <>
      <PageHeader
        title="Importar"
        subtitle="Traga a fatura do cartão ou o extrato da conta. Você revisa tudo antes de entrar no Kash."
        back={{ href: routes.transactions, label: 'Lançamentos' }}
      />

      {step === 'file' ? (
        <div className={s.layout}>
          <Card className={s.stack}>
            <Field label="O que você vai importar?">
              <Segmented<TargetType>
                label="Tipo de arquivo"
                value={targetType}
                onChange={(t) => {
                  setTargetType(t);
                  setTargetId('');
                }}
                options={[
                  { value: 'card', label: 'Fatura do cartão', testID: 'import-type-card' },
                  { value: 'account', label: 'Extrato da conta', testID: 'import-type-account' },
                ]}
              />
            </Field>
            <ChipGroup label={targetType === 'card' ? 'Qual cartão?' : 'Qual conta?'} testID="import-targets">
              {targets.map((t) => (
                <Chip key={t.id} label={t.label} soft selected={targetId === t.id} onSelect={() => setTargetId(t.id)} testID={`import-target-${t.id}`} />
              ))}
              <button type="button" className={`${uiStyles.chip} ${uiStyles.chipSoft}`} onClick={() => openModal({ name: targetType === 'card' ? 'card' : 'account' })} data-testid="import-new-target">
                + {targetType === 'card' ? 'Novo cartão' : 'Nova conta'}
              </button>
            </ChipGroup>

            <Field label="Arquivo" htmlFor="import-file" hint={targetType === 'card' ? 'PDF da fatura, OFX ou CSV (no app do banco: fatura › exportar/enviar por e-mail).' : 'OFX ou CSV do extrato (no app do banco: extrato › exportar).'}>
              <label className={s.drop} htmlFor="import-file">
                <span className={s.dropTitle}>{file ? file.name : 'Escolher arquivo'}</span>
                <span className={uiStyles.hint}>{file ? `${(file.size / 1024).toFixed(0)} KB · ${format?.toUpperCase() ?? 'formato não suportado'}` : 'PDF, OFX ou CSV'}</span>
              </label>
              <input
                id="import-file"
                type="file"
                accept=".pdf,.ofx,.csv,.txt,application/pdf,text/csv"
                className={s.fileInput}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                  setNeedsPassword(false);
                  setPassword('');
                  setCsv(null);
                  setNeedsMapping(false);
                }}
                data-testid="import-file"
              />
            </Field>

            {format === 'pdf' ? (
              <>
                <label className={s.consent}>
                  <input
                    type="checkbox"
                    checked={aiConsent}
                    onChange={(e) => {
                      setAiConsent(e.target.checked);
                      try {
                        localStorage.setItem(AI_CONSENT_KEY, e.target.checked ? '1' : '0');
                      } catch {
                        // sem armazenamento
                      }
                    }}
                    data-testid="import-ai-consent"
                  />
                  <span>
                    Ler o PDF com IA. O texto da fatura vai para a IA da Anthropic <b>sem</b> CPF, endereço, número do cartão e código de barras, só para identificar os lançamentos. Veja a <Link href={routes.privacy}>política de privacidade</Link>.
                  </span>
                </label>
                {needsPassword ? <PasswordInput label="Senha do PDF" value={password} onChange={(e) => setPassword(e.target.value)} hint="Em geral são os primeiros dígitos do seu CPF." testID="import-pdf-password" /> : null}
              </>
            ) : null}

            {needsMapping && csv ? <CsvMappingForm csv={csv} onChange={(mapping) => setCsv({ ...csv, mapping })} /> : null}

            {error ? (
              <p className={s.error} role="alert" data-testid="import-error">
                {error}
              </p>
            ) : null}
            <Button onClick={() => void (needsMapping ? readMapped() : read())} disabled={!file || !format || !targetId} loading={reading} testID="import-read">
              {reading ? (format === 'pdf' ? 'Lendo com IA…' : 'Lendo…') : needsMapping ? 'Usar essas colunas' : 'Ler arquivo'}
            </Button>
          </Card>

          <History imports={importsQuery.data ?? []} snapNames={Object.fromEntries([...snap.cards.map((c) => [c.id, c.name]), ...snap.accounts.map((a) => [a.id, a.name])])} onUndo={(id) => void actions.undoImport(id)} />
        </div>
      ) : null}

      {step === 'review' && plan && statement ? (
        <div className={s.stack}>
          <Card className={s.summary} testID="import-summary">
            <div className={s.summaryText}>
              <h2 className={uiStyles.cardTitle}>
                {targetType === 'card' ? 'Fatura' : 'Extrato'} {statement.issuer ? `· ${statement.issuer}` : ''} → {target?.label}
              </h2>
              <span className={uiStyles.hint}>
                {file?.name}
                {statement.cardLast4s.length ? ` · cartões final ${statement.cardLast4s.join(', ')}` : ''}
              </span>
            </div>
            {targetType === 'card' ? (
              <div className={s.summaryControls}>
                <Field label="Fatura de" htmlFor="import-month">
                  <select id="import-month" className={uiStyles.input} value={plan.statementMonth ?? ''} onChange={(e) => setMonth(e.target.value)} data-testid="import-month">
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {monthKeyName(m)} de {m.slice(0, 4)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Importar">
                  <Segmented<ImportMode>
                    label="O que importar"
                    value={plan.mode}
                    onChange={setMode}
                    options={[
                      { value: 'installments', label: 'Só parceladas', testID: 'import-mode-installments' },
                      ...(plan.allowAll ? [{ value: 'all' as const, label: 'Tudo', testID: 'import-mode-all' }] : []),
                    ]}
                  />
                </Field>
              </div>
            ) : (
              <label className={s.consent}>
                <input type="checkbox" checked={keepBalance} onChange={(e) => setKeepBalance(e.target.checked)} data-testid="import-keep-balance" />
                <span>Manter o saldo de hoje da conta (o histórico entra sem mudar o saldo que você já cadastrou).</span>
              </label>
            )}
            <p className={uiStyles.hint} data-testid="import-check">
              {targetType === 'card'
                ? plan.allowAll
                  ? plan.mode === 'all'
                    ? `Compras à vista entram na fatura de ${monthKeyName(plan.statementMonth ?? '')} (o Kash conta a fatura pelo mês do lançamento).`
                    : 'Parcelamentos entram com a parcela deste mês; as próximas aparecem sozinhas na Previsão.'
                  : 'Fatura antiga: só os parcelamentos ainda em aberto entram (compras à vista do passado ficam de fora).'
                : null}
              {plan.check.statementTotal ? ` Total da fatura no banco: ${formatBRL(plan.check.statementTotal)}.` : ''}
            </p>
          </Card>

          <RowsSection title="Parcelamentos" rows={rows.filter((r) => r.section === 'installment')} categories={categories} sourceText={sourceText} onEdit={edit} testID="import-installments" />
          <RowsSection title={targetType === 'card' ? 'Compras e encargos' : 'Saídas'} rows={rows.filter((r) => r.section === 'purchase')} categories={[...categories, ...(targetType === 'account' ? ['Fatura'] : [])]} sourceText={sourceText} onEdit={edit} testID="import-purchases" />
          {targetType === 'account' ? <RowsSection title="Entradas" rows={rows.filter((r) => r.section === 'income')} categories={['Entrada']} sourceText={sourceText} onEdit={edit} testID="import-incomes" /> : null}
          <Ignored rows={rows.filter((r) => r.section === 'ignored')} />

          <div className={s.footer}>
            <span className={s.footerText} data-testid="import-total">
              {planCount ? `${planCount} ${planCount === 1 ? 'parcelamento' : 'parcelamentos'}` : ''}
              {planCount && txCount ? ' e ' : ''}
              {txCount ? `${txCount} ${txCount === 1 ? 'lançamento' : 'lançamentos'}` : ''}
              {included.length ? ` · ${formatBRL(Math.abs(sum))}` : 'Nada selecionado'}
            </span>
            <Button variant="secondary" size="md" onClick={restart} testID="import-cancel">
              Voltar
            </Button>
            <Button size="md" onClick={() => void save()} disabled={included.length === 0} loading={saving} testID="import-save">
              Importar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'done' && result ? (
        <Card className={s.done} testID="import-done">
          <h2 className={uiStyles.cardTitle}>Importação concluída</h2>
          <p className={uiStyles.hint}>
            {result.plans ? `${result.plans} ${result.plans === 1 ? 'parcelamento criado' : 'parcelamentos criados'}` : ''}
            {result.plans && result.txs ? ' e ' : ''}
            {result.txs ? `${result.txs} ${result.txs === 1 ? 'lançamento' : 'lançamentos'}` : ''}. Os nomes que você mudou viram regra para as próximas importações.
          </p>
          <div className={s.doneActions}>
            <Link href={targetType === 'card' ? routes.cards : routes.accounts} className={`${uiStyles.btn} ${uiStyles.primary} ${uiStyles.md}`} onClick={() => targetType === 'card' && useUi.getState().selectCard(targetId)}>
              Ver {targetType === 'card' ? 'cartão' : 'conta'}
            </Link>
            <Button variant="secondary" size="md" onClick={restart} testID="import-another">
              Importar outro arquivo
            </Button>
            <Button
              variant="dangerSoft"
              size="md"
              onClick={async () => {
                if (!(await confirmDelete('Desfazer importação?', 'Os lançamentos e parcelamentos desta importação saem do Kash.', 'Desfazer'))) return;
                if (await actions.undoImport(result.id)) restart();
              }}
              testID="import-undo"
            >
              Desfazer importação
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function RowsSection({ title, rows, categories, sourceText, onEdit, testID }: { title: string; rows: ReviewRow[]; categories: string[]; sourceText: string; onEdit: (key: string, patch: RowEdit) => void; testID: string }) {
  if (rows.length === 0) return null;
  const selected = rows.filter((r) => r.include).length;
  return (
    <Card list testID={testID}>
      <div className={uiStyles.cardHead}>
        <h2 className={uiStyles.cardTitle}>
          {title} <span className={uiStyles.hint}>({selected} de {rows.length})</span>
        </h2>
        <button type="button" className={`${uiStyles.btn} ${uiStyles.link}`} onClick={() => rows.forEach((r) => onEdit(r.key, { include: selected < rows.length }))}>
          {selected < rows.length ? 'Marcar todos' : 'Desmarcar todos'}
        </button>
      </div>
      <ul className={s.rows}>
        {rows.map((r) => {
          const check = sourceText && !amountInText(r.amount, sourceText);
          return (
            <li key={r.key} className={`${s.row} ${r.include ? '' : s.rowOff}`} data-testid={`import-row-${r.key}`}>
              <input type="checkbox" className={s.check} checked={r.include} onChange={(e) => onEdit(r.key, { include: e.target.checked })} aria-label={`Importar ${r.originalTitle}`} data-testid={`import-row-${r.key}-include`} />
              <div className={s.rowMain}>
                <input className={`${uiStyles.input} ${s.title}`} value={r.title} onChange={(e) => onEdit(r.key, { title: e.target.value })} aria-label={`Nome de ${r.originalTitle}`} maxLength={80} data-testid={`import-row-${r.key}-title`} />
                <span className={s.original} title="Como está no arquivo do banco">
                  {r.originalTitle}
                </span>
                <div className={s.badges}>
                  {r.installment ? (
                    <Badge tone="pos">
                      {r.installment.currentNow}/{r.installment.total} agora · {r.installment.remaining === 1 ? 'última' : `faltam ${r.installment.remaining} até ${r.installment.lastMonth}`}
                    </Badge>
                  ) : null}
                  {r.duplicate ? <Badge tone="neg">possível duplicado</Badge> : null}
                  {check ? <Badge tone="neg">conferir valor</Badge> : null}
                </div>
              </div>
              <div className={s.rowSide}>
                <span className={s.amount}>{formatBRL(r.amount)}</span>
                <span className={uiStyles.hint}>{r.kashDate.split('-').reverse().join('/')}</span>
                {categories.length > 1 ? (
                  <select className={`${uiStyles.input} ${s.category}`} value={r.category} onChange={(e) => onEdit(r.key, { category: e.target.value })} aria-label={`Categoria de ${r.originalTitle}`} data-testid={`import-row-${r.key}-category`}>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Ignored({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) return null;
  return (
    <details className={s.ignored} data-testid="import-ignored">
      <summary>
        Ficaram de fora ({rows.length}) <span className={uiStyles.hint}>pagamentos, estornos, parcelas quitadas…</span>
      </summary>
      <ul className={s.rows}>
        {rows.map((r) => (
          <li key={r.key} className={s.ignoredRow}>
            <span className={s.original}>{r.originalTitle}</span>
            <span className={uiStyles.hint}>{r.reason}</span>
            <span className={s.amount}>{formatBRL(r.amount)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CsvMappingForm({ csv, onChange }: { csv: { table: CsvTable; mapping: CsvMapping }; onChange: (m: CsvMapping) => void }) {
  const { table, mapping } = csv;
  const sample = table.rows[0] ?? [];
  const select = (key: 'date' | 'description' | 'amount', label: string) => (
    <Field label={label} htmlFor={`map-${key}`}>
      <select id={`map-${key}`} className={uiStyles.input} value={mapping[key]} onChange={(e) => onChange({ ...mapping, [key]: Number(e.target.value) })} data-testid={`import-map-${key}`}>
        {table.headers.map((h, i) => (
          <option key={i} value={i}>
            {h || `Coluna ${i + 1}`} {sample[i] ? `(ex.: ${sample[i]!.slice(0, 24)})` : ''}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className={s.mapping} data-testid="import-mapping">
      <p className={uiStyles.hint}>Não reconhecemos as colunas desse CSV. Diga qual é qual:</p>
      {select('date', 'Data')}
      {select('description', 'Descrição')}
      {select('amount', 'Valor')}
      <label className={s.consent}>
        <input type="checkbox" checked={mapping.expensesArePositive} onChange={(e) => onChange({ ...mapping, expensesArePositive: e.target.checked })} />
        <span>Gastos aparecem como valor positivo</span>
      </label>
    </div>
  );
}

function History({ imports, snapNames, onUndo }: { imports: Array<{ id: string; fileName: string; sourceId: string; txCount: number; planCount: number; undone: boolean; createdAt: string; statementMonth: string | null }>; snapNames: Record<string, string>; onUndo: (id: string) => void }) {
  if (imports.length === 0) return null;
  return (
    <Card list testID="import-history">
      <div className={uiStyles.cardHead}>
        <h2 className={uiStyles.cardTitle}>Importações anteriores</h2>
      </div>
      {imports.map((imp) => (
        <div key={imp.id} className={uiStyles.row}>
          <span className={uiStyles.rowText}>
            <span className={uiStyles.rowTitle}>{imp.fileName || 'Arquivo'}</span>
            <span className={uiStyles.rowMeta}>
              {snapNames[imp.sourceId] ?? 'Removido'} · {new Date(imp.createdAt).toLocaleDateString('pt-BR')} · {imp.planCount} parc. · {imp.txCount} lanç.
            </span>
          </span>
          {imp.undone ? (
            <Badge>desfeita</Badge>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (await confirmDelete('Desfazer importação?', 'Os lançamentos e parcelamentos desta importação saem do Kash.', 'Desfazer')) onUndo(imp.id);
              }}
              testID={`import-history-undo-${imp.id}`}
            >
              Desfazer
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}
