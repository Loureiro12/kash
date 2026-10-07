import type { KashClient } from '../client';
import { unwrap } from '../errors';

/** Exportação completa dos dados do usuário (RPC `export_my_data`, sob RLS). Formato versionado em `format`. */
export interface KashExport {
  format: 'kash-export/1';
  exported_at: string;
  user: { id: string; name: string; email: string | null; phone: string | null; created_at: string } | null;
  settings: Record<string, unknown> | null;
  accounts: Record<string, unknown>[];
  cards: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
}

export async function exportMyData(db: KashClient): Promise<KashExport> {
  return unwrap(await db.rpc('export_my_data')) as unknown as KashExport;
}
