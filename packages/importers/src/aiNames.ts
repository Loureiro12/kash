import { knownBrand, normalizeMerchant } from './normalize';
import { redactStatementText } from './redact';
import { looksLikeOwnTransfer } from './transfers';
import type { ParsedStatement } from './types';
import type { MerchantRule } from './plan';

/** Pedido de nome à IA: `id` é a chave do estabelecimento (a mesma das regras aprendidas). */
export interface AiNameRequest {
  id: string;
  description: string;
}

export interface AiNameSuggestion {
  title?: string;
  category?: string;
}

/** Pix, TED, transferência: costuma ter nome de pessoa e a IA não ajuda — não vai. */
const PERSON_OR_TRANSFER = /\b(?:pix|ted|doc|tef|transf\w*|deposito|saque|boleto|pagamento|pgto|fatura|cartao|salario)\b/;
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Descrições que valem uma sugestão da IA num OFX/CSV: compras sem regra aprendida e sem marca
 * conhecida, uma por estabelecimento, já sem dados pessoais. Entradas, tarifas, pagamentos e
 * Pix/transferências ficam de fora.
 */
export function aiNameRequests(statement: ParsedStatement, options: { rules?: readonly MerchantRule[]; ownNames?: readonly string[]; max?: number } = {}): AiNameRequest[] {
  const ruled = new Set((options.rules ?? []).map((r) => r.pattern));
  const out = new Map<string, AiNameRequest>();
  for (const line of statement.lines) {
    if (out.size >= (options.max ?? 120)) break;
    if (line.kind !== 'purchase' && line.kind !== 'installment') continue;
    if (line.amount <= 0 || line.suggestedTitle) continue;
    const id = normalizeMerchant(line.description);
    if (!id || out.has(id) || ruled.has(id) || knownBrand(line.description)) continue;
    if (PERSON_OR_TRANSFER.test(strip(line.description)) || looksLikeOwnTransfer(line.description, options.ownNames)) continue;
    // números longos (documento, conta, código) saem antes; depois CPF, cartão e o nome da pessoa
    const masked = line.description.replace(/\d[\d.\-/]{4,}\d/g, '#');
    const description = redactStatementText(masked, { names: [...(options.ownNames ?? [])] }).trim().slice(0, 120);
    if (description.replace(/[^a-z]/gi, '').length < 3) continue;
    out.set(id, { id, description });
  }
  return [...out.values()];
}

/** Linhas com as sugestões da IA (regras aprendidas continuam mandando na revisão). */
export function withAiNames(statement: ParsedStatement, suggestions: Readonly<Record<string, AiNameSuggestion>>): ParsedStatement {
  return {
    ...statement,
    lines: statement.lines.map((line) => {
      const s = suggestions[normalizeMerchant(line.description)];
      if (!s || line.suggestedTitle) return line;
      return {
        ...line,
        ...(s.title ? { suggestedTitle: s.title } : {}),
        ...(s.category ? { suggestedCategory: s.category } : {}),
      };
    }),
  };
}
