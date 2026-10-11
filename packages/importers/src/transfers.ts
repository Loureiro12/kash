/**
 * Transferência entre as próprias contas num extrato: pelo texto ("mesma titularidade", "aplicação
 * poupança", Pix para o próprio nome) e pela conta do outro lado.
 */

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** texto que, sozinho, já indica dinheiro indo/vindo de outra conta da pessoa */
const STRONG = /mesma titularidade|entre contas|transf(?:erencia)?\.? (?:entre|propria|p\/ ?poup)|\baplicacao\b|\bresgate\b|\bpoupanca\b|\bpoup\b|\bcdb\b|\brdb\b|caixinha|cofrinho|tesouro direto|\bapl\b|\bresg\b/;
const MOVE = /\b(?:pix|ted|doc|tef|transf|transferencia)\b/;
const NAME_STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** O texto do extrato parece transferência para/de outra conta da própria pessoa? */
export function looksLikeOwnTransfer(description: string, ownNames: readonly string[] = []): boolean {
  const s = strip(description);
  if (STRONG.test(s)) return true;
  if (!MOVE.test(s)) return false;
  // Pix/TED para o próprio nome: primeiro nome e mais um pedaço do nome (sobrenome ou inicial)
  return ownNames.some((full) => {
    const parts = strip(full)
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((p) => p && !NAME_STOP.has(p));
    const [first, ...rest] = parts;
    if (!first || first.length < 3 || !new RegExp(`\\b${first}\\b`).test(s)) return false;
    // o banco costuma abreviar: "ANDRE L", "ANDRE L GONCALVES"
    return rest.some((p) => new RegExp(`\\b(?:${p}|${p[0]})\\b`).test(s));
  });
}

const GENERIC = new Set(['conta', 'corrente', 'banco', 'digital', 'pagamento', 'pagamentos', 'principal', 'minha', 'meu']);
const SAVINGS = /\bpoup/;
const INVEST = /\b(?:cdb|rdb|invest\w*|aplica\w*|resgat\w*|caixinha|cofrinho|tesouro|reserva)\b/;

/**
 * Conta do outro lado: a que o texto cita (nome, banco, "poupança"); com uma conta só além da
 * importada, ela. Sem pista clara, null (a pessoa escolhe).
 */
export function guessCounterpart(description: string, others: readonly { id: string; name: string; kind: string }[]): string | null {
  if (others.length === 0) return null;
  const s = strip(description);
  const scored = others.map((a) => {
    const text = strip(`${a.name} ${a.kind}`);
    let score = text
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !GENERIC.has(w))
      .filter((w, i, all) => all.indexOf(w) === i)
      .filter((w) => new RegExp(`\\b${w}`).test(s)).length;
    if (SAVINGS.test(s) && SAVINGS.test(text)) score += 2;
    if (INVEST.test(s) && INVEST.test(text)) score += 2;
    return { id: a.id, score };
  });
  const best = Math.max(...scored.map((x) => x.score));
  const top = scored.filter((x) => x.score === best);
  if (best > 0 && top.length === 1) return top[0]!.id;
  return others.length === 1 ? others[0]!.id : null;
}

/** dias entre duas datas ISO (yyyy-mm-dd), sem sinal */
export function daysApart(a: string, b: string): number {
  return Math.round(Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
}
