import type { KashClient } from '../client';
import { KashApiError, toKashError, unwrap } from '../errors';

export interface ImportRecord {
  id: string;
  sourceType: 'card' | 'account';
  sourceId: string;
  fileName: string;
  format: 'pdf' | 'ofx' | 'csv';
  statementMonth: string | null;
  txCount: number;
  planCount: number;
  skippedCount: number;
  undone: boolean;
  createdAt: string;
}

export interface MerchantRuleRecord {
  pattern: string;
  title: string;
  category: string | null;
}

/** Item de fatura (ver `toCardItems` em @kash/importers). */
export type CardImportItem = Record<string, unknown> & { type: 'plan' | 'tx' };
/** Item de extrato (ver `toAccountItems` em @kash/importers). */
export type AccountImportItem = Record<string, unknown>;

export async function importCardStatement(db: KashClient, input: { cardId: string; fileName: string; format: 'pdf' | 'ofx' | 'csv'; statementMonth: string | null; items: CardImportItem[] }): Promise<string> {
  return unwrap(await db.rpc('import_card_statement', { p_card_id: input.cardId, p_file_name: input.fileName, p_format: input.format, p_statement_month: (input.statementMonth ?? null) as string, p_items: input.items as never }));
}

export async function importAccountStatement(db: KashClient, input: { accountId: string; fileName: string; format: 'pdf' | 'ofx' | 'csv'; items: AccountImportItem[]; keepBalance: boolean }): Promise<string> {
  return unwrap(await db.rpc('import_account_statement', { p_account_id: input.accountId, p_file_name: input.fileName, p_format: input.format, p_items: input.items as never, p_keep_balance: input.keepBalance }));
}

export async function undoImport(db: KashClient, importId: string): Promise<number> {
  return unwrap(await db.rpc('undo_import', { p_import_id: importId }));
}

export async function listImports(db: KashClient, limit = 20): Promise<ImportRecord[]> {
  const rows = unwrap(await db.from('imports').select('*').order('created_at', { ascending: false }).limit(limit));
  return rows.map((r) => ({
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    fileName: r.file_name,
    format: r.format as ImportRecord['format'],
    statementMonth: r.statement_month,
    txCount: r.tx_count,
    planCount: r.plan_count,
    skippedCount: r.skipped_count,
    undone: r.undone_at != null,
    createdAt: r.created_at,
  }));
}

export async function listMerchantRules(db: KashClient): Promise<MerchantRuleRecord[]> {
  return unwrap(await db.from('merchant_rules').select('pattern, title, category')).map((r) => ({ pattern: r.pattern, title: r.title, category: r.category }));
}

/** Grava (ou atualiza) as regras aprendidas na revisão. */
export async function saveMerchantRules(db: KashClient, rules: MerchantRuleRecord[]): Promise<void> {
  if (rules.length === 0) return;
  unwrap(await db.from('merchant_rules').upsert(rules.map((r) => ({ pattern: r.pattern, title: r.title, category: r.category, updated_at: new Date().toISOString() })), { onConflict: 'user_id,pattern' }).select('pattern'));
}

/** Erros da leitura com IA, com a mensagem pronta para a tela. */
const AI_ERRORS: Record<string, string> = {
  ai_not_configured: 'A leitura de PDF ainda não está disponível. Use o arquivo OFX ou CSV do seu banco.',
  daily_limit: 'Você chegou ao limite de leituras de PDF de hoje. Tente amanhã ou use OFX/CSV.',
  text_too_long: 'Esse PDF é grande demais. Envie só a fatura de um mês.',
  empty_text: 'Não encontramos texto nesse PDF. Ele pode ser uma imagem escaneada; use o OFX ou CSV do banco.',
  ai_failed: 'A leitura com IA falhou agora. Tente de novo em instantes ou use o OFX/CSV do banco.',
};

/** Lê com IA o texto (já limpo) de um PDF de fatura/extrato. Devolve o ParsedStatement da Edge Function. */
export async function readStatementWithAi<T = unknown>(db: KashClient, input: { text: string; kind: 'card' | 'account'; categories: string[] }): Promise<T> {
  try {
    const { data, error } = await db.functions.invoke('import-assist', { body: input });
    if (error) {
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const code = (body as { error?: string } | null)?.error ?? '';
      throw new KashApiError('unknown', AI_ERRORS[code] ?? 'Não deu pra ler o PDF agora. Tente de novo.', error);
    }
    return (data as { statement: T }).statement;
  } catch (err) {
    throw toKashError(err);
  }
}
