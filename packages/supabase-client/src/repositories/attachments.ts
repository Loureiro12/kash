import type { KashClient } from '../client';
import { KashApiError, toKashError, unwrap } from '../errors';
import { currentUser } from './profile';

/** bucket privado dos comprovantes (ver migração 20261025000000_attachments) */
export const RECEIPTS_BUCKET = 'receipts';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64 → bytes (sem depender de Buffer/atob, que variam entre Node, Hermes e Deno) */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]!) << 18) | (B64.indexOf(clean[i + 1]!) << 12) | ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) | (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

/**
 * Anexa a foto (JPEG em base64) ao lançamento: sobe para `<pessoa>/<lançamento>/<agora>.jpg`, grava o
 * caminho no lançamento e apaga o comprovante anterior, se havia. Devolve o caminho novo.
 */
export async function uploadAttachment(db: KashClient, txId: string, base64: string): Promise<string> {
  try {
    const me = await currentUser(db);
    const path = `${me.id}/${txId}/${Date.now()}.jpg`;
    const { error } = await db.storage.from(RECEIPTS_BUCKET).upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: false });
    if (error) throw new KashApiError('unknown', 'Não deu pra enviar o comprovante. Tente de novo.', error);
    const old = unwrap(await db.from('transactions').select('attachment_path').eq('id', txId).single()).attachment_path;
    unwrap(await db.from('transactions').update({ attachment_path: path }).eq('id', txId).select('id'));
    if (old && old !== path) await db.storage.from(RECEIPTS_BUCKET).remove([old]);
    return path;
  } catch (err) {
    throw toKashError(err);
  }
}

/** Link temporário (10 min) para ver o comprovante. */
export async function attachmentUrl(db: KashClient, path: string, expiresIn = 600): Promise<string> {
  const { data, error } = await db.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data) throw toKashError(error ?? new Error('sem link'));
  return data.signedUrl;
}

/** Tira o comprovante do lançamento e apaga o arquivo. */
export async function removeAttachment(db: KashClient, txId: string, path: string): Promise<void> {
  unwrap(await db.from('transactions').update({ attachment_path: null }).eq('id', txId).select('id'));
  await db.storage.from(RECEIPTS_BUCKET).remove([path]);
}

/**
 * Apaga todos os comprovantes da pessoa logada ("Zerar meus dados"). Melhor esforço: o banco já
 * não aponta mais para eles; arquivos que sobrarem não aparecem para ninguém.
 */
export async function removeAllAttachments(db: KashClient): Promise<number> {
  const me = await currentUser(db);
  const bucket = db.storage.from(RECEIPTS_BUCKET);
  const { data: folders } = await bucket.list(me.id, { limit: 1000 });
  const paths: string[] = [];
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${me.id}/${folder.name}`, { limit: 100 });
    for (const f of files ?? []) paths.push(`${me.id}/${folder.name}/${f.name}`);
  }
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
  return paths.length;
}
