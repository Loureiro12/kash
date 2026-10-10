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
    // procura sem acento (mesmo comprimento em NFC) e troca no texto original
    const patterns = [new RegExp(parts.map(escapeRe).join('\\s+'), 'gi')];
    if (parts.length >= 2) patterns.push(new RegExp(`${escapeRe(parts[0]!)}\\s+${escapeRe(parts[1]!)}(?:\\s+[A-Za-z]+){0,3}`, 'gi'));
    for (const re of patterns) {
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
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
