import { Platform, Settings } from 'react-native';
import type { TxKind } from '@kash/domain';

/** o que o atalho pede: lançar gasto/entrada, abrir o assistente ou lançar por texto ("gastei 30 no Uber") */
export type QuickAction = TxKind | 'assistant' | { text: string };

/**
 * Lançamento rápido pelos atalhos do iPhone (Back Tap, Siri, app Atalhos, Spotlight).
 *
 * As App Intents nativas "Lançar gasto" / "Lançar entrada" (plugins/quick-add/KashQuickAdd.swift) abrem o
 * app e gravam o pedido em UserDefaults com esta chave, no formato `<tipo>:<segundos>`. O JS lê
 * pelo `Settings` do React Native (UserDefaults no iOS), apaga e abre o sheet de lançamento.
 */
export const QUICK_ADD_KEY = 'kash.quickAdd';
/** texto da Siri ("Lançar no Kash"), gravado junto com o pedido `text:<segundos>` */
export const QUICK_ADD_TEXT_KEY = 'kash.quickAdd.text';
/** tamanho máximo do texto aceito (o mesmo da Swift) */
export const QUICK_TEXT_MAX = 300;

/** `?texto=` do link (`…://lancar?texto=gastei%2030%20no%20Uber`) */
export function textFromParam(value: string | string[] | undefined): string | null {
  const v = (Array.isArray(value) ? value[0] : value)?.trim();
  return v ? v.slice(0, QUICK_TEXT_MAX) : null;
}

/** pedidos mais velhos que isso são ignorados (ex.: tocou o atalho deslogado e voltou dias depois) */
const MAX_AGE_SECONDS = 10 * 60;

/** `?tipo=` do link (`…://lancar?tipo=entrada`); padrão gasto */
export function kindFromParam(value: string | string[] | undefined): TxKind {
  const v = (Array.isArray(value) ? value[0] : value)?.toLowerCase();
  return v === 'entrada' || v === 'income' ? 'income' : 'expense';
}

/** valor gravado pela App Intent → tipo, ou null se inválido/antigo */
export function parsePending(value: unknown, nowSeconds: number): TxKind | 'assistant' | 'text' | null {
  if (typeof value !== 'string') return null;
  const [kind, at] = value.split(':');
  if (kind !== 'expense' && kind !== 'income' && kind !== 'assistant' && kind !== 'text') return null;
  const seconds = Number(at);
  if (!Number.isFinite(seconds) || nowSeconds - seconds > MAX_AGE_SECONDS || seconds - nowSeconds > 60) return null;
  return kind;
}

const supported = Platform.OS === 'ios';

/** lê e apaga o pedido pendente da App Intent (só iOS) */
export function takePendingShortcut(nowSeconds = Date.now() / 1000): QuickAction | null {
  if (!supported) return null;
  const raw = Settings.get(QUICK_ADD_KEY);
  if (raw == null) return null;
  Settings.set({ [QUICK_ADD_KEY]: null });
  const kind = parsePending(raw, nowSeconds);
  if (kind !== 'text') return kind;
  const text = Settings.get(QUICK_ADD_TEXT_KEY);
  Settings.set({ [QUICK_ADD_TEXT_KEY]: null });
  return typeof text === 'string' && text.trim() ? { text: text.trim().slice(0, QUICK_TEXT_MAX) } : null;
}

/** avisa quando a App Intent grava um pedido com o app já aberto */
export function watchPendingShortcut(callback: () => void): () => void {
  if (!supported) return () => undefined;
  const id = Settings.watchKeys(QUICK_ADD_KEY, callback);
  return () => Settings.clearWatch(id);
}
