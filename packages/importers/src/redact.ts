/**
 * Limpa o texto de um PDF de fatura antes de mandar para a IA: só o que serve para ler os
 * lançamentos sai do aparelho. Tira CPF/CNPJ do titular, número completo do cartão, endereço, CEP,
 * linha digitável/código de barras e o nome do titular.
 */
export interface RedactOptions {
  /** nomes do titular (perfil); cada um é trocado por "TITULAR" */
  names?: readonly string[];
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STREET = /^\s*(R|RUA|AV|AVENIDA|ROD|RODOVIA|TRAVESSA|TV|ALAMEDA|AL|PRACA|PRAÇA|ESTRADA|EST|QD|QUADRA|CJ|CONJUNTO)\.?\s+\S/i;

export function redactStatementText(text: string, options: RedactOptions = {}): string {
  let out = text
    // CPF e CNPJ (com ou sem pontuação) — fica marcado só que havia um documento
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ]')
    // número do cartão (mascarado ou não): mantém só o final
    .replace(/\b\d{4}[ .X*]{1,3}(?:[\dX*]{4}[ .X*]{1,3}){2}(\d{4})\b/gi, '•••• $1')
    .replace(/\b\d{4}\*{2,8}(\d{4})\b/g, '•••• $1')
    // CEP
    .replace(/\b\d{5}-?\d{3}\b(?=\s|$)/g, '[CEP]');
  out = out
    .split(/\r?\n/)
    // linha digitável / código de barras: lançamentos têm poucos dígitos (data + valor)
    .filter((line) => line.replace(/\D/g, '').length < 30)
    // endereço (rua/avenida…)
    .filter((line) => !STREET.test(line))
    .join('\n')
    .normalize('NFC');
  for (const name of options.names ?? []) {
    const parts = stripAccents(name).trim().split(/\s+/).filter((p) => p.length > 2);
    if (parts.length === 0) continue;
    const [first, ...rest] = parts;
    // o banco escreve o nome do jeito dele ("ANDRÉ LOUREIRO GONÇALVES", "Andre L Goncalves", "Olá, André"):
    // o primeiro nome leva junto as palavras e iniciais que vêm logo depois, na mesma linha
    // (uma inicial seguida de "$" é o "R$" do valor e fica)
    const word = '(?:[A-Za-z]{2,}|[A-Za-z](?![$\\w])\\.?)';
    const patterns = [new RegExp(`\\b${escapeRe(first!)}(?:[ \\t]+${word}){0,4}`, 'gi'), ...rest.filter((p) => p.length > 3).map((p) => new RegExp(`\\b${escapeRe(p)}\\b`, 'gi'))];
    for (const re of patterns) {
      // procura sem acento (mesmo comprimento em NFC) e troca no texto original
      const plain = stripAccents(out);
      let result = '';
      let last = 0;
      for (const m of plain.matchAll(re)) {
        result += out.slice(last, m.index) + 'TITULAR';
        last = (m.index ?? 0) + m[0].length;
      }
      out = result + out.slice(last);
    }
  }
  out = out.replace(/TITULAR(?:[ \t]+TITULAR)+/g, 'TITULAR');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
