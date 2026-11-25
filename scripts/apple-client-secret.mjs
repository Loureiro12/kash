#!/usr/bin/env node
// Gera o "client secret" do Sign in with Apple (JWT ES256) para o Supabase, sem enviar a chave a nenhum site.
// Uso:
//   node scripts/apple-client-secret.mjs --key ~/Downloads/AuthKey_ABC123DEFG.p8 --key-id ABC123DEFG \
//     --team-id G58V8BP6VH --services-id br.app.kash.web
// Vale 6 meses (o máximo da Apple): renove antes de vencer, no Supabase e no GitHub.
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => (cur.startsWith('--') ? [...acc, [cur.slice(2), all[i + 1]]] : acc), []),
);
const missing = ['key', 'key-id', 'team-id', 'services-id'].filter((k) => !args[k]);
if (missing.length) {
  console.error(`Faltam: ${missing.map((k) => `--${k}`).join(' ')}`);
  process.exit(1);
}

const key = createPrivateKey(readFileSync(args.key.replace(/^~/, homedir())));
const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const exp = now + 180 * 24 * 3600; // ~6 meses (limite da Apple: 15.777.000 s)
const header = { alg: 'ES256', kid: args['key-id'], typ: 'JWT' };
const payload = { iss: args['team-id'], iat: now, exp, aud: 'https://appleid.apple.com', sub: args['services-id'] };
const input = `${b64(header)}.${b64(payload)}`;
const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');

console.log(`${input}.${signature}`);
console.error(`\nVálido até ${new Date(exp * 1000).toLocaleDateString('pt-BR')}. Anote no calendário para renovar antes.`);
