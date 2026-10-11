import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, CheckCircle, Chip, Input, PageHeader, Pressable, Screen, SegmentedControl, Switch, Text, useTheme } from '@/design-system';
import { formatBRL, monthKey, monthKeyName } from '@kash/domain';
import { aiNameRequests, amountInText, applyRowEdit, buildImportPlan, csvSignature, importCountsLabel, learnedRules, mappingFits, redactStatementText, toAccountItems, toCardItems, type CsvMapping, type CsvTable, type ImportMode, type ParsedStatement, type ReviewRow, type RowEdit, withAiNames } from '@kash/importers';
import { toKashError } from '@kash/supabase-client';
import { now as clockNow } from '@/lib/clock';
import { useKashStore } from '@/store';
import { readWithAi, saveImport, suggestNamesWithAi, undoImport, useImportHistory, useMerchantRules } from './importApi';
import { PdfPasswordError, PdfReader, type PdfReaderHandle } from './PdfReader';
import { nameWithExtension } from './openWith';
import { formatOf, readMappedCsv, readTextStatement, type TargetType } from './readStatement';

type Step = 'file' | 'review' | 'done';
interface PickedFile {
  uri: string;
  name: string;
  size: number | null;
}

const AI_CONSENT_KEY = 'kash.import.aiConsent';
/** colunas indicadas para cada "cara" de CSV (só neste aparelho) */
const CSV_MAPPINGS_KEY = 'kash.import.csvMappings';
type SavedMappings = Record<string, CsvMapping>;
const fileNameOf = (uri: string) => decodeURIComponent(uri.split('?')[0]!.split('/').pop() ?? '') || 'arquivo';

/** arquivo aberto de outro app: nome, tipo e tamanho vêm do sistema (content:// não tem nome na URL) */
function describeFile(uri: string): PickedFile {
  try {
    const f = new File(uri);
    return { uri, name: nameWithExtension(f.name || fileNameOf(uri), f.type), size: f.size ?? null };
  } catch {
    return { uri, name: fileNameOf(uri), size: null };
  }
}

/**
 * Importar fatura (cartão) ou extrato (conta): arquivo → revisão → pronto (com desfazer).
 * Parâmetros: `type`/`id` (destino já escolhido, vindo do cartão/conta) e `file` (aberto de outro app).
 */
export function ImportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; id?: string; file?: string }>();
  const userId = useKashStore((s) => s.userId);
  const userName = useKashStore((s) => s.user.name);
  const cards = useKashStore((s) => s.cards);
  const accounts = useKashStore((s) => s.accounts);
  const storePlans = useKashStore((s) => s.plans);
  const storeTxs = useKashStore((s) => s.txs);
  const storeCategories = useKashStore((s) => s.categories);
  const openSheet = useKashStore((s) => s.openSheet);
  const selectCard = useKashStore((s) => s.selectCard);
  const showToast = useKashStore((s) => s.showToast);
  const [today] = useState(() => clockNow());

  const [step, setStep] = useState<Step>('file');
  const [targetType, setTargetType] = useState<TargetType>(params.type === 'account' ? 'account' : 'card');
  const [chosenTargetId, setTargetId] = useState(params.id ?? '');
  const [file, setFile] = useState<PickedFile | null>(() => (params.file ? describeFile(params.file) : null));
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [wrongPasswords, setWrongPasswords] = useState(0);
  const [aiConsent, setAiConsent] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState<{ table: CsvTable; mapping: CsvMapping } | null>(null);
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [mode, setMode] = useState<ImportMode>('installments');
  const [month, setMonth] = useState<string | null>(null);
  const [keepBalance, setKeepBalance] = useState(true);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [saving, setSaving] = useState(false);
  /** sugestão de nomes com IA para OFX/CSV (roda depois de abrir a revisão, sem travar a tela) */
  const [aiNames, setAiNames] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; count: number }>({ status: 'idle', count: 0 });
  const aiRun = useRef(0);
  const [result, setResult] = useState<{ id: string; txs: number; plans: number; transfers: number } | null>(null);
  const [savedMappings, setSavedMappings] = useState<SavedMappings>({});
  // outro arquivo compartilhado com a tela já aberta: recomeça com ele
  const [lastParamFile, setLastParamFile] = useState(params.file);
  if (params.file !== lastParamFile) {
    setLastParamFile(params.file);
    if (params.file) {
      setFile(describeFile(params.file));
      setStep('file');
      setStatement(null);
      setResult(null);
      setError(null);
      setNeedsPassword(false);
      setWrongPasswords(0);
      setPassword('');
      setCsv(null);
    }
  }
  const pdf = useRef<PdfReaderHandle>(null);
  const cardsBefore = useRef(cards.map((c) => c.id));
  const accountsBefore = useRef(accounts.map((a) => a.id));

  const rulesQuery = useMerchantRules(userId);
  const history = useImportHistory(userId);

  useEffect(() => {
    void AsyncStorage.getItem(CSV_MAPPINGS_KEY)
      .then((v) => v && setSavedMappings(JSON.parse(v) as SavedMappings))
      .catch(() => undefined);
    void AsyncStorage.getItem(AI_CONSENT_KEY)
      .then((v) => v === '1' && setAiConsent(true))
      .catch(() => undefined);
  }, []);

  // cartão/conta criado agora pelo sheet vira o destino escolhido
  useEffect(() => {
    const newCard = cards.find((c) => !cardsBefore.current.includes(c.id));
    const newAccount = accounts.find((a) => !accountsBefore.current.includes(a.id));
    if (newCard) {
      setTargetType('card');
      setTargetId(newCard.id);
    } else if (newAccount) {
      setTargetType('account');
      setTargetId(newAccount.id);
    }
    cardsBefore.current = cards.map((c) => c.id);
    accountsBefore.current = accounts.map((a) => a.id);
  }, [cards, accounts]);

  const format = file ? formatOf(file.name) : null;

  // fatura de cartão quase sempre tem senha: já pergunta, sem esperar o "Ler arquivo"
  useEffect(() => {
    if (!file || format !== 'pdf') return;
    let alive = true;
    void (async () => {
      try {
        const locked = await pdf.current?.isLocked(await new File(file.uri).base64());
        if (alive && locked) setNeedsPassword(true);
      } catch {
        // descobre no "Ler arquivo"
      }
    })();
    return () => {
      alive = false;
    };
  }, [file, format]);

  const targets = useMemo(() => (targetType === 'card' ? cards.map((c) => ({ id: c.id, label: `${c.name} •••• ${c.last4}` })) : accounts.map((a) => ({ id: a.id, label: a.name }))), [targetType, cards, accounts]);
  // um cartão (ou uma conta) só: já vem escolhido
  const onlyTargetId = targets.length === 1 ? targets[0]!.id : '';
  const targetId = targets.some((t) => t.id === chosenTargetId) ? chosenTargetId : onlyTargetId;
  const target = targets.find((t) => t.id === targetId) ?? null;
  const categories = useMemo(() => storeCategories.map((c) => c.name), [storeCategories]);

  const plan = useMemo(() => {
    if (!statement || !targetId) return null;
    return buildImportPlan({
      statement,
      target: { type: targetType, id: targetId },
      mode,
      today,
      statementMonth: month ?? undefined,
      categories,
      rules: rulesQuery.data ?? [],
      existing: { plans: storePlans, txs: storeTxs },
      accounts,
      ownNames: [userName],
    });
  }, [statement, targetType, targetId, mode, month, today, categories, rulesQuery.data, storePlans, storeTxs, accounts, userName]);

  const rows = useMemo(() => (plan ? plan.rows.map((r) => applyRowEdit(r, edits[r.key])) : []), [plan, edits]);
  const included = rows.filter((r) => r.include && r.section !== 'ignored');
  const sum = included.reduce((a, r) => a + (targetType === 'account' ? (r.inflow ? r.amount : -r.amount) : r.amount), 0);
  const planCount = included.filter((r) => r.section === 'installment').length;
  const transferCount = included.filter((r) => r.section === 'transfer').length;
  const txCount = included.length - planCount - transferCount;
  /** extrato: contas para onde a linha pode ser transferência */
  const transferTargets = useMemo(() => (targetType === 'account' ? accounts.filter((a) => a.id !== targetId).map((a) => ({ id: a.id, label: a.name })) : []), [targetType, targetId, accounts]);
  const accountNames = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);
  const outCategories = useMemo(() => [...categories, 'Fatura'], [categories]);
  const monthOptions = useMemo(() => Array.from({ length: 13 }, (_, i) => monthKey(new Date(today.getFullYear(), today.getMonth() - i, 1))), [today]);

  const edit = (key: string, patch: RowEdit) => setEdits((e) => ({ ...e, [key]: { ...e[key], ...patch } }));

  const resetFileState = () => {
    setError(null);
    setNeedsPassword(false);
    setWrongPasswords(0);
    setPassword('');
    setCsv(null);
  };

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setFile({ uri: asset.uri, name: asset.name, size: asset.size ?? null });
    resetFileState();
    if (!formatOf(asset.name)) setError('Esse formato não dá pra importar. Use PDF, OFX ou CSV.');
  };

  const toggleConsent = (next: boolean) => {
    setAiConsent(next);
    void AsyncStorage.setItem(AI_CONSENT_KEY, next ? '1' : '0').catch(() => undefined);
  };

  const suggestNames = (parsed: ParsedStatement) => {
    const run = ++aiRun.current;
    if (!aiConsent) return setAiNames({ status: 'idle', count: 0 });
    const items = aiNameRequests(parsed, { rules: rulesQuery.data ?? [], ownNames: [userName] });
    if (items.length === 0) return setAiNames({ status: 'idle', count: 0 });
    setAiNames({ status: 'loading', count: items.length });
    suggestNamesWithAi({ items, categories }).then(
      (suggestions) => {
        if (run !== aiRun.current) return;
        setStatement((cur) => (cur === parsed ? withAiNames(parsed, suggestions) : cur));
        setAiNames({ status: 'done', count: Object.keys(suggestions).length });
      },
      () => run === aiRun.current && setAiNames({ status: 'error', count: 0 }),
    );
  };

  const accept = (parsed: ParsedStatement, withAi: boolean) => {
    setStatement(parsed);
    setEdits({});
    setMonth(null);
    setMode('installments');
    setCsv(null);
    setStep('review');
    if (withAi) suggestNames(parsed);
  };

  const read = async () => {
    if (!file || !format || !targetId) return;
    setError(null);
    if (csv) {
      const res = readMappedCsv(csv.table, csv.mapping, targetType);
      if (res.kind === 'ok') {
        const next = { ...savedMappings, [csvSignature(csv.table)]: csv.mapping };
        setSavedMappings(next);
        void AsyncStorage.setItem(CSV_MAPPINGS_KEY, JSON.stringify(next)).catch(() => undefined);
        accept(res.statement, true);
      } else if (res.kind === 'error') setError(res.message);
      return;
    }
    setReading(true);
    try {
      if (format !== 'pdf') {
        const res = readTextStatement(format, await new File(file.uri).text(), targetType, (table) => {
          const m = savedMappings[csvSignature(table)];
          return mappingFits(table, m) ? m : null;
        });
        if (res.kind === 'ok') accept(res.statement, true);
        else if (res.kind === 'mapping') setCsv(res.csv);
        else setError(res.message);
        return;
      }
      if (!aiConsent) {
        setError('Pra ler PDF, autorize o envio do texto (sem seus dados pessoais) para a IA.');
        return;
      }
      let raw: string;
      try {
        raw = (await pdf.current?.extract(await new File(file.uri).base64(), password || undefined)) ?? '';
      } catch (err) {
        if (err instanceof PdfPasswordError) {
          setNeedsPassword(true);
          if (err.wrong) setWrongPasswords((n) => n + 1);
          setError(err.wrong ? 'Senha incorreta. Confira e tente de novo.' : 'Esse PDF tem senha. Digite a senha da fatura para continuar.');
          return;
        }
        throw err;
      }
      const clean = redactStatementText(raw, { names: [userName] });
      setSourceText(clean);
      const parsed = await readWithAi<ParsedStatement>({ text: clean, kind: targetType, categories });
      if (parsed.lines.length === 0) setError('Não encontramos lançamentos nesse arquivo.');
      else accept(parsed, false);
    } catch (err) {
      setError(toKashError(err).message);
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    if (!plan || !format || !file || included.length === 0) return;
    setSaving(true);
    try {
      const items = targetType === 'card' ? toCardItems(rows) : toAccountItems(rows);
      const id = await saveImport({ target: { type: targetType, id: targetId }, fileName: file.name, format, statementMonth: plan.statementMonth, items, keepBalance }, learnedRules(rows, plan.rows));
      setResult({ id, txs: txCount, plans: planCount, transfers: transferCount });
      setStep('done');
    } catch (err) {
      showToast(toKashError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    aiRun.current++;
    setAiNames({ status: 'idle', count: 0 });
    setStep('file');
    setFile(null);
    setStatement(null);
    setResult(null);
    setSourceText('');
    resetFileState();
  };

  const confirmUndo = (importId: string, after?: () => void) =>
    Alert.alert('Desfazer importação?', 'Os lançamentos e parcelamentos desta importação saem do Kash.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desfazer',
        style: 'destructive',
        onPress: () =>
          void undoImport(importId).then(
            () => {
              showToast('Importação desfeita');
              after?.();
            },
            (err: unknown) => showToast(toKashError(err).message),
          ),
      },
    ]);

  const names = useMemo(() => Object.fromEntries([...cards.map((c) => [c.id, c.name] as const), ...accounts.map((a) => [a.id, a.name] as const)]), [cards, accounts]);

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="import-screen" header={<PageHeader title="Importar" onBack={() => router.back()} testID="import" />} withTabBar={false} contentStyle={{ paddingBottom: step === 'review' ? 140 + insets.bottom : 32 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {step === 'file' ? (
          <View style={{ gap: 14 }}>
            <Text variant="body" color="muted">
              Traga a fatura do cartão ou o extrato da conta. Você revisa tudo antes de entrar no Kash.
            </Text>
            <Card padding={[18, 16]} style={{ gap: 14 }}>
              <SegmentedControl<TargetType>
                value={targetType}
                onChange={(t) => {
                  setTargetType(t);
                  setTargetId('');
                  setError(null);
                }}
                options={[
                  { value: 'card', label: 'Fatura do cartão', testID: 'import-type-card' },
                  { value: 'account', label: 'Extrato da conta', testID: 'import-type-account' },
                ]}
              />
              <Text variant="titleBold">{targetType === 'card' ? 'Qual cartão?' : 'Qual conta?'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} testID="import-targets">
                {targets.map((t) => (
                  <Chip key={t.id} label={t.label} tone="soft" selected={targetId === t.id} onPress={() => setTargetId(t.id)} testID={`import-target-${t.id}`} />
                ))}
                <Chip label={`+ ${targetType === 'card' ? 'Novo cartão' : 'Nova conta'}`} tone="soft" onPress={() => openSheet(targetType === 'card' ? 'addCard' : 'addAccount')} testID="import-new-target" />
              </View>

              <Text variant="titleBold">Arquivo</Text>
              <Pressable onPress={() => void pick()} testID="import-pick" accessibilityRole="button" accessibilityLabel={file ? `Arquivo ${file.name}. Trocar arquivo` : 'Escolher arquivo'} style={{ minHeight: 96, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Text variant="section" align="center" numberOfLines={2} testID="import-file-name">
                  {file ? file.name : 'Escolher arquivo'}
                </Text>
                <Text variant="meta" color="muted" align="center">
                  {file ? [file.size != null ? `${Math.max(1, Math.round(file.size / 1024))} KB` : null, format?.toUpperCase() ?? 'formato não suportado'].filter(Boolean).join(' · ') : 'PDF, OFX ou CSV'}
                </Text>
              </Pressable>
              <Text variant="meta" color="muted">
                {targetType === 'card' ? 'PDF da fatura, OFX ou CSV. No app do banco: fatura › exportar ou compartilhar (dá pra abrir direto no Kash).' : 'OFX ou CSV do extrato. No app do banco: extrato › exportar.'}
              </Text>

              {format ? (
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="bodySemibold">{format === 'pdf' ? 'Ler o PDF com IA' : 'Sugerir nomes com IA (opcional)'}</Text>
                    <Text variant="meta" color="muted">
                      {format === 'pdf'
                        ? 'O texto da fatura vai para a IA da Anthropic sem CPF, endereço, número do cartão e código de barras, só para identificar os lançamentos.'
                        : 'Só o nome das compras que o Kash ainda não conhece vai para a IA da Anthropic, sem CPF, número do cartão e o seu nome; Pix e transferências não vão.'}
                    </Text>
                    <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" testID="import-privacy" hitSlop={8}>
                      <Text variant="chip" color="accentText">
                        Política de privacidade
                      </Text>
                    </Pressable>
                  </View>
                  <Switch value={aiConsent} onValueChange={toggleConsent} testID="import-ai-consent" accessibilityLabel={format === 'pdf' ? 'Ler o PDF com IA' : 'Sugerir nomes com IA'} />
                </View>
              ) : null}
              {format === 'pdf' ? (
                <>
                  {needsPassword ? (
                    <View style={{ gap: 6 }} testID="import-pdf-locked">
                      <Input label="Senha do PDF" value={password} onChangeText={setPassword} secureTextEntry autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => void read()} testID="import-pdf-password" />
                      <Text variant="meta" color="muted">
                        Em geral são os primeiros dígitos do seu CPF; o e-mail do banco com a fatura costuma dizer qual é. A senha só abre o arquivo aqui no seu celular: não é enviada nem salva.
                      </Text>
                      {wrongPasswords >= 3 ? (
                        <Text variant="meta" color="muted" testID="import-pdf-alternatives">
                          Não lembra a senha? No app do banco dá pra baixar a fatura de novo (algumas vêm sem senha) ou exportar em OFX/CSV, que o Kash lê sem senha.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <PdfReader ref={pdf} />
                </>
              ) : null}

              {csv ? <CsvMappingForm csv={csv} onChange={(mapping) => setCsv({ ...csv, mapping })} /> : null}

              {error ? <ErrorBox message={error} /> : null}
              <Button label={reading ? (format === 'pdf' ? 'Lendo com IA…' : 'Lendo…') : csv ? 'Usar essas colunas' : 'Ler arquivo'} onPress={() => void read()} disabled={!file || !format || !targetId} loading={reading} testID="import-read" />
            </Card>

            <History imports={history.data ?? []} names={names} onUndo={(id) => confirmUndo(id)} />
          </View>
        ) : null}

        {step === 'review' && plan && statement ? (
          <View style={{ gap: 14 }}>
            <Card padding={[18, 16]} style={{ gap: 12 }} testID="import-summary">
              <View style={{ gap: 2 }}>
                <Text variant="titleBold">
                  {targetType === 'card' ? 'Fatura' : 'Extrato'}
                  {statement.issuer ? ` · ${statement.issuer}` : ''} → {target?.label}
                </Text>
                <Text variant="meta" color="muted" numberOfLines={2}>
                  {file?.name}
                  {statement.cardLast4s.length ? ` · cartões final ${statement.cardLast4s.join(', ')}` : ''}
                </Text>
              </View>
              {targetType === 'card' ? (
                <>
                  <Text variant="bodySemibold">Fatura de</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} testID="import-month">
                    {monthOptions.map((m) => (
                      <Chip key={m} label={`${monthKeyName(m)}${m.slice(0, 4) === String(today.getFullYear()) ? '' : ` ${m.slice(0, 4)}`}`} selected={plan.statementMonth === m} onPress={() => setMonth(m)} testID={`import-month-${m}`} />
                    ))}
                  </ScrollView>
                  <SegmentedControl<ImportMode>
                    value={plan.mode}
                    onChange={setMode}
                    options={[{ value: 'installments', label: 'Só parceladas', testID: 'import-mode-installments' }, ...(plan.allowAll ? [{ value: 'all' as const, label: 'Tudo', testID: 'import-mode-all' }] : [])]}
                  />
                </>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text variant="body" color="muted" style={{ flex: 1 }}>
                    Manter o saldo de hoje da conta (o histórico entra sem mudar o saldo que você já cadastrou).
                  </Text>
                  <Switch value={keepBalance} onValueChange={setKeepBalance} testID="import-keep-balance" accessibilityLabel="Manter o saldo de hoje da conta" />
                </View>
              )}
              <Text variant="meta" color="muted" testID="import-check">
                {targetType === 'card'
                  ? plan.allowAll
                    ? plan.mode === 'all'
                      ? `Compras à vista entram na fatura de ${monthKeyName(plan.statementMonth ?? '')} (o Kash conta a fatura pelo mês do lançamento).`
                      : 'Parcelamentos entram com a parcela deste mês; as próximas aparecem sozinhas na Previsão.'
                    : 'Fatura antiga: só os parcelamentos ainda em aberto entram (compras à vista do passado ficam de fora).'
                  : ''}
                {plan.check.statementTotal ? ` Total da fatura no banco: ${formatBRL(plan.check.statementTotal)}.` : ''}
              </Text>
              {aiNames.status !== 'idle' ? (
                <Text variant="meta" color={aiNames.status === 'error' ? 'neg' : 'accentText'} accessibilityLiveRegion="polite" testID="import-ai-names">
                  {aiNames.status === 'loading'
                    ? `Sugerindo nomes com IA para ${aiNames.count} ${aiNames.count === 1 ? 'estabelecimento' : 'estabelecimentos'}…`
                    : aiNames.status === 'done'
                      ? aiNames.count
                        ? `A IA sugeriu ${aiNames.count === 1 ? '1 nome' : `${aiNames.count} nomes`} (marcados com "IA"). Confira: os que você importar viram regra e não vão mais para a IA.`
                        : 'A IA não teve sugestões para esses nomes.'
                      : 'Não deu pra sugerir nomes com IA agora; os nomes ficam como no arquivo.'}
                </Text>
              ) : null}
            </Card>

            <RowsSection title="Parcelamentos" rows={rows.filter((r) => r.section === 'installment')} categories={categories} sourceText={sourceText} onEdit={edit} testID="import-installments" />
            {targetType === 'account' ? (
              <RowsSection
                title="Transferências entre suas contas"
                hint="Não contam como gasto nem entrada; a outra conta recebe o lado dela."
                rows={rows.filter((r) => r.section === 'transfer')}
                categories={outCategories}
                transferTargets={transferTargets}
                accountNames={accountNames}
                sourceText={sourceText}
                onEdit={edit}
                testID="import-transfers"
              />
            ) : null}
            <RowsSection title={targetType === 'card' ? 'Compras e encargos' : 'Saídas'} rows={rows.filter((r) => r.section === 'purchase')} categories={targetType === 'account' ? outCategories : categories} transferTargets={transferTargets} accountNames={accountNames} sourceText={sourceText} onEdit={edit} testID="import-purchases" />
            {targetType === 'account' ? <RowsSection title="Entradas" rows={rows.filter((r) => r.section === 'income')} categories={outCategories} transferTargets={transferTargets} accountNames={accountNames} sourceText={sourceText} onEdit={edit} testID="import-incomes" /> : null}
            <Ignored rows={rows.filter((r) => r.section === 'ignored')} />
          </View>
        ) : null}

        {step === 'done' && result ? (
          <Card padding={[20, 18]} style={{ gap: 12 }} testID="import-done">
            <Text variant="titleLg">Importação concluída</Text>
            <Text variant="body" color="muted">
              {importCountsLabel(result)} no Kash. Os nomes que você mudou ou aceitou da IA viram regra para as próximas importações.
            </Text>
            <Button
              label={`Ver ${targetType === 'card' ? 'cartão' : 'conta'}`}
              onPress={() => {
                if (targetType === 'card') selectCard(targetId);
                router.navigate(targetType === 'card' ? '/cards' : '/accounts');
              }}
              testID="import-view-target"
            />
            <Button label="Importar outro arquivo" variant="secondary" onPress={restart} testID="import-another" />
            <Button label="Desfazer importação" variant="dangerSoft" onPress={() => confirmUndo(result.id, restart)} testID="import-undo" />
          </Card>
        ) : null}
      </Screen>

      {step === 'review' && plan ? (
        <ReviewFooter
          bottom={insets.bottom}
          text={`${importCountsLabel({ plans: planCount, txs: txCount, transfers: transferCount })}${included.length ? ` · ${formatBRL(Math.abs(sum))}` : 'Nada selecionado'}`}
          onBack={restart}
          onSave={() => void save()}
          disabled={included.length === 0}
          saving={saving}
        />
      ) : null}
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 12, borderRadius: 14, backgroundColor: colors.negSoft }} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text variant="bodyMedium" color="neg" testID="import-error">
        {message}
      </Text>
    </View>
  );
}

function ReviewFooter({ bottom, text, onBack, onSave, disabled, saving }: { bottom: number; text: string; onBack: () => void; onSave: () => void; disabled: boolean; saving: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: bottom + 12, gap: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Text variant="bodySemibold" testID="import-total">
        {text}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Voltar" variant="secondary" size="md" onPress={onBack} style={{ flex: 1 }} testID="import-cancel" />
        <Button label="Importar" size="md" onPress={onSave} disabled={disabled} loading={saving} style={{ flex: 2 }} testID="import-save" haptic="medium" />
      </View>
    </View>
  );
}

function RowsSection({
  title,
  hint,
  rows,
  categories,
  transferTargets = [],
  accountNames = {},
  sourceText,
  onEdit,
  testID,
}: {
  title: string;
  hint?: string;
  rows: ReviewRow[];
  categories: string[];
  transferTargets?: { id: string; label: string }[];
  accountNames?: Record<string, string>;
  sourceText: string;
  onEdit: (key: string, patch: RowEdit) => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  if (rows.length === 0) return null;
  const selected = rows.filter((r) => r.include).length;
  const isAccount = rows.some((r) => r.inflow !== undefined);
  // categoria em lote: só para saídas marcadas (entrada é sempre "Entrada"; transferência não tem categoria)
  const bulkRows = rows.filter((r) => r.include && !r.inflow && r.section !== 'transfer');
  const canBulk = bulkRows.length > 1 && categories.length > 1;
  const labelOf = (r: ReviewRow) => (r.section === 'transfer' && r.transfer?.accountId ? `⇄ ${r.inflow ? 'De' : 'Para'} ${accountNames[r.transfer.accountId] ?? 'outra conta'}` : r.category);
  return (
    <Card padding={[14, 16]} testID={testID}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
        <Text variant="titleBold" style={{ flex: 1 }}>
          {title}{' '}
          <Text variant="meta" color="muted">
            ({selected} de {rows.length})
          </Text>
        </Text>
        <Pressable onPress={() => rows.forEach((r) => onEdit(r.key, { include: selected < rows.length }))} accessibilityRole="button" testID={`${testID}-toggle-all`} hitSlop={8}>
          <Text variant="chip" color="accentText">
            {selected < rows.length ? 'Marcar todos' : 'Desmarcar todos'}
          </Text>
        </Pressable>
      </View>
      {hint ? (
        <Text variant="meta" color="muted" style={{ marginBottom: 4 }}>
          {hint}
        </Text>
      ) : null}
      {canBulk ? (
        <View style={{ gap: 6, marginBottom: 4 }}>
          <Pressable onPress={() => setBulkOpen(!bulkOpen)} accessibilityRole="button" accessibilityState={{ expanded: bulkOpen }} testID={`${testID}-bulk-category`} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <Text variant="chip" color="accentText">
              Categoria das marcadas {bulkOpen ? '▾' : '▸'}
            </Text>
          </Pressable>
          {bulkOpen ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  height={30}
                  tone="soft"
                  onPress={() => {
                    for (const r of bulkRows) onEdit(r.key, { category: c });
                    setBulkOpen(false);
                  }}
                  testID={`${testID}-bulk-${c}`}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {rows.map((r, i) => {
        const check = !!sourceText && !amountInText(r.amount, sourceText);
        const choices = r.inflow ? ['Entrada'] : categories;
        const pick = (patch: RowEdit) => {
          onEdit(r.key, patch);
          setOpenCategory(null);
        };
        return (
          <View key={r.key} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, opacity: r.include ? 1 : 0.55 }} testID={`import-row-${r.key}`}>
            <Pressable onPress={() => onEdit(r.key, { include: !r.include })} accessibilityRole="checkbox" accessibilityState={{ checked: r.include }} accessibilityLabel={`Importar ${r.originalTitle}`} testID={`import-row-${r.key}-include`} hitSlop={8} style={{ paddingTop: 12 }}>
              <CheckCircle checked={r.include} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Input value={r.title} onChangeText={(t) => onEdit(r.key, { title: t })} maxLength={80} height={46} accessibilityLabel={`Nome de ${r.originalTitle}`} testID={`import-row-${r.key}-title`} />
              <Text variant="meta" color="muted" numberOfLines={2} accessibilityLabel={`No arquivo: ${r.originalTitle}`}>
                {r.originalTitle}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <Text variant="value">{formatBRL(r.amount)}</Text>
                <Text variant="meta" color="muted">
                  {r.kashDate.split('-').reverse().join('/')}
                </Text>
                {isAccount || categories.length > 1 ? (
                  <Chip label={labelOf(r)} height={28} selected={openCategory === r.key} onPress={() => setOpenCategory(openCategory === r.key ? null : r.key)} testID={`import-row-${r.key}-category`} />
                ) : null}
              </View>
              {openCategory === r.key ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} testID={`import-row-${r.key}-categories`}>
                  {choices.map((c) => (
                    <Chip key={c} label={c} height={30} tone="soft" selected={r.section !== 'transfer' && r.category === c} onPress={() => pick(isAccount ? { transferAccountId: null, category: c } : { category: c })} testID={`import-row-${r.key}-cat-${c}`} />
                  ))}
                  {transferTargets.map((t) => (
                    <Chip
                      key={t.id}
                      label={`⇄ ${r.inflow ? 'De' : 'Para'} ${t.label}`}
                      height={30}
                      tone="soft"
                      selected={r.section === 'transfer' && r.transfer?.accountId === t.id}
                      onPress={() => pick({ transferAccountId: t.id })}
                      testID={`import-row-${r.key}-transfer-${t.id}`}
                    />
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {r.installment ? <Badge tone="pos" label={`${r.installment.currentNow}/${r.installment.total} agora · ${r.installment.remaining === 1 ? 'última' : `faltam ${r.installment.remaining} até ${r.installment.lastMonth}`}`} /> : null}
                {r.fromAi ? <Badge label="IA" testID={`import-row-${r.key}-ai`} /> : null}
                {r.duplicate ? <Badge tone="neg" label={r.duplicateNote ?? 'possível duplicado'} /> : null}
                {r.section === 'transfer' && r.transfer?.linkTxId ? (
                  <Badge tone="pos" label={`junta com ${r.inflow ? 'a saída' : 'a entrada'} de ${accountNames[r.transfer.accountId ?? ''] ?? 'outra conta'} em ${r.transfer.linkDate?.split('-').reverse().slice(0, 2).join('/')}`} />
                ) : null}
                {r.section !== 'transfer' && r.transfer && !r.transfer.accountId ? <Badge label="parece transferência: escolha a conta" testID={`import-row-${r.key}-transfer-hint`} /> : null}
                {check ? <Badge tone="neg" label="conferir valor" /> : null}
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function Ignored({ rows }: { rows: ReviewRow[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  return (
    <Card padding={[14, 16]} testID="import-ignored">
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} testID="import-ignored-toggle">
        <Text variant="titleBold">
          Ficaram de fora ({rows.length}) {open ? '▾' : '▸'}
        </Text>
        <Text variant="meta" color="muted">
          pagamentos, estornos, parcelas quitadas…
        </Text>
      </Pressable>
      {open
        ? rows.map((r) => (
            <View key={r.key} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {r.originalTitle}
                </Text>
                <Text variant="meta" color="muted">
                  {r.reason}
                </Text>
              </View>
              <Text variant="meta" color="muted">
                {formatBRL(r.amount)}
              </Text>
            </View>
          ))
        : null}
    </Card>
  );
}

function CsvMappingForm({ csv, onChange }: { csv: { table: CsvTable; mapping: CsvMapping }; onChange: (m: CsvMapping) => void }) {
  const { colors } = useTheme();
  const { table, mapping } = csv;
  const sample = table.rows[0] ?? [];
  const field = (key: 'date' | 'description' | 'amount', label: string) => (
    <View style={{ gap: 6 }}>
      <Text variant="bodySemibold">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {table.headers.map((h, i) => (
          <Chip key={i} label={`${h || `Coluna ${i + 1}`}${sample[i] ? ` (${sample[i]!.slice(0, 16)})` : ''}`} tone="soft" height={30} selected={mapping[key] === i} onPress={() => onChange({ ...mapping, [key]: i })} testID={`import-map-${key}-${i}`} />
        ))}
      </ScrollView>
    </View>
  );
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface2 }} testID="import-mapping">
      <Text variant="meta" color="muted">
        Não reconhecemos as colunas desse CSV. Diga qual é qual:
      </Text>
      {field('date', 'Data')}
      {field('description', 'Descrição')}
      {field('amount', 'Valor')}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text variant="body" style={{ flex: 1 }}>
          Gastos aparecem como valor positivo
        </Text>
        <Switch value={mapping.expensesArePositive} onValueChange={(v) => onChange({ ...mapping, expensesArePositive: v })} testID="import-map-positive" accessibilityLabel="Gastos aparecem como valor positivo" />
      </View>
    </View>
  );
}

function History({ imports, names, onUndo }: { imports: { id: string; fileName: string; sourceId: string; txCount: number; planCount: number; undone: boolean; createdAt: string }[]; names: Record<string, string>; onUndo: (id: string) => void }) {
  const { colors } = useTheme();
  if (imports.length === 0) return null;
  return (
    <Card padding={[14, 16]} testID="import-history">
      <Text variant="titleBold" style={{ marginBottom: 4 }}>
        Importações anteriores
      </Text>
      {imports.map((imp, i) => (
        <View key={imp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title" numberOfLines={1}>
              {imp.fileName || 'Arquivo'}
            </Text>
            <Text variant="meta" color="muted" numberOfLines={1}>
              {names[imp.sourceId] ?? 'Removido'} · {new Date(imp.createdAt).toLocaleDateString('pt-BR')} · {imp.planCount} parc. · {imp.txCount} lanç.
            </Text>
          </View>
          {imp.undone ? <Badge label="desfeita" /> : <Button label="Desfazer" variant="secondary" size="sm" onPress={() => onUndo(imp.id)} testID={`import-history-undo-${imp.id}`} />}
        </View>
      ))}
    </Card>
  );
}
