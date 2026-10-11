import { formatOf } from './readStatement';

/** Arquivo aberto de outro app → rota da importação; null se não for um arquivo que o Kash lê. */
export function importPathFor(url: string): string | null {
  if (!/^(file|content):\/\//i.test(url)) return null;
  // no Android o content:// nem sempre tem extensão: deixa a tela dizer se o formato não serve
  if (/^file:/i.test(url) && !formatOf(decodeURIComponent(url.split('?')[0]!))) return null;
  return `/import?file=${encodeURIComponent(url)}`;
}

const EXT_BY_MIME: Record<string, string> = { 'application/pdf': 'pdf', 'text/csv': 'csv', 'text/comma-separated-values': 'csv', 'application/x-ofx': 'ofx', 'application/ofx': 'ofx' };

/**
 * Nome com extensão de um arquivo recebido: no Android o content:// às vezes vem sem extensão,
 * então o tipo (mime) completa o nome para o Kash reconhecer o formato.
 */
export function nameWithExtension(name: string, mime: string | null | undefined): string {
  if (formatOf(name)) return name;
  const ext = mime ? EXT_BY_MIME[mime.toLowerCase().split(';')[0]!.trim()] : undefined;
  return ext ? `${name || 'arquivo'}.${ext}` : name || 'arquivo';
}
