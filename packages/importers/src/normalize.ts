import type { LineKind } from './types';

/**
 * Limpeza de descrições de banco: parcela, nome amigável e a "chave" do estabelecimento
 * (usada nas regras aprendidas e para reconhecer a mesma compra em outra fatura).
 */

export interface InstallmentMatch {
  current: number;
  total: number;
  /** descrição sem o trecho da parcela */
  rest: string;
}

const INSTALLMENT_PATTERNS: RegExp[] = [
  // "Parcela 2/12", "(Parcela 03 de 06)", "PARCELA 3 DE 10"
  /\(?\s*-?\s*parcela\s+(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\s*\)?/i,
  // "PARC 03/10", "PARC.3/10", "PARC03/10"
  /\bparc\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i,
  // "MOVIDA RAC BHPC 02 DE 02" (Caixa)
  /\s(\d{1,2})\s+de\s+(\d{1,2})\s*$/i,
  // "PgConta CARTOE 03/12" (Itaú): dois dígitos no fim
  /\s(\d{2})\/(\d{2})\s*$/,
];

/** "Compra - Parcela 3/10" → { current: 3, total: 10, rest: "Compra" }; null se não for parcela. */
export function detectInstallment(description: string): InstallmentMatch | null {
  for (const re of INSTALLMENT_PATTERNS) {
    const m = description.match(re);
    if (!m) continue;
    const current = Number(m[1]);
    const total = Number(m[2]);
    if (total < 2 || total > 48 || current < 1 || current > total) continue;
    const rest = description.replace(m[0], ' ').replace(/\s+-\s*$/, '').replace(/\s{2,}/g, ' ').trim();
    return { current, total, rest };
  }
  return null;
}

const FEE = /\b(iof|juros|multa|mora|anuidade|encargo|tarifa|rotativo)\b/i;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** prefixos de maquininhas/intermediários antes do nome da loja ("MP*LOJA", "EBW*Spotify") */
const PROCESSOR_PREFIX = /^(?:ebw|mp|pg|asa|dm|ifd|pag|zig|br1|ec|pp|sumup|pagseguro|paypal|hna|jim|ton|ppro|pagbank|cielo|stone|ame|picpay|mlp|shp|ali|nupay)\s*\*+\s*/i;

/**
 * Chave do estabelecimento: minúsculas, sem acento, sem parcela, sem intermediário e sem números.
 * "Mercadolivre*Mercadol - Parcela 1/3" → "mercadolivre mercadol".
 */
export function normalizeMerchant(description: string): string {
  const base = detectInstallment(description)?.rest ?? description;
  return stripAccents(base)
    .toLowerCase()
    .replace(PROCESSOR_PREFIX, '')
    .replace(/\s-\s*nupay\b/, '')
    .replace(/[^a-z\s.]/g, ' ')
    .replace(/\./g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60);
}

/** marcas conhecidas: a chave começa com… → nome bonito */
const BRANDS: Array<[RegExp, string, string?]> = [
  [/^(?:help)?hbo ?max|^helphbomax/, 'HBO Max', 'Assinaturas'],
  [/spotify/, 'Spotify', 'Assinaturas'],
  [/netflix/, 'Netflix', 'Assinaturas'],
  [/^apple ?com ?bill|^applecom ?bill/, 'Apple (App Store/iCloud)', 'Assinaturas'],
  [/amazon ?prime|amazonprime/, 'Amazon Prime', 'Assinaturas'],
  [/amazon ?music/, 'Amazon Music', 'Assinaturas'],
  [/mercado ?livre|mercadolivre/, 'Mercado Livre'],
  [/ifood/, 'iFood', 'Comida'],
  [/^uber/, 'Uber', 'Transporte'],
  [/openai|chatgpt/, 'ChatGPT', 'Assinaturas'],
  [/github/, 'GitHub', 'Assinaturas'],
  [/hostgator/, 'HostGator', 'Assinaturas'],
  [/airbnb/, 'Airbnb', 'Lazer'],
  [/^azul/, 'Azul', 'Transporte'],
  [/carrefour/, 'Carrefour', 'Mercado'],
  [/raia/, 'Drogasil/Raia'],
  [/outback/, 'Outback', 'Comida'],
  [/cineart|cinemark/, 'Cinema', 'Lazer'],
];

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_m, sp: string, ch: string) => sp + ch.toUpperCase())
    .replace(/\b(Ltda|Me|Sa|Eireli)\b/g, (w) => w.toUpperCase());

/**
 * Nome amigável sem IA: marca conhecida, ou a descrição sem parcela/intermediário em "Título Próprio".
 * "EBW*Spotify - NuPay" → "Spotify"; "POSTO WAP LTDA" → "Posto Wap LTDA".
 */
export function suggestTitle(description: string): string {
  const key = normalizeMerchant(description);
  // tarifa/IOF de uma compra ("IOF de \"Github\"") não leva o nome da marca: continua sendo tarifa
  if (!FEE.test(description)) for (const [re, name] of BRANDS) if (re.test(key)) return name;
  const base = (detectInstallment(description)?.rest ?? description)
    .replace(PROCESSOR_PREFIX, '')
    .replace(/\s-\s*NuPay\b/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const letters = base.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const isUpper = letters.length > 0 && letters === letters.toUpperCase();
  return (isUpper ? titleCase(base) : base).slice(0, 80) || 'Lançamento importado';
}

/** palavras-chave → categoria padrão do Kash (só usada se a categoria existir na lista da pessoa) */
const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/\b(posto|combust|uber|99 ?app|99pop|estacion|pedagio|tag ?itau|recarga|metro|onibus|auto ?posto|autozone|pecas|movida|localiza|azul|gol|latam)\b/, 'Transporte'],
  [/\b(?:super|mercad|carrefour|hortifruti|hortiplus|atacad|assai)\w*|\bnosso\b/, 'Mercado'],
  [/\b(ifood|restaurante|lanche|lanches|pizza|burger|padaria|bar|cafe|outback|osteria|sabor|cozinha|gourmet|food)\b/, 'Comida'],
  [/\b(spotify|netflix|hbo|prime|music|apple|icloud|openai|chatgpt|github|hostgator|neon|assinatura|club|youtube|disney|globoplay|registrese)\b/, 'Assinaturas'],
  [/\b(cinema|cineart|cinemark|show|ingresso|airbnb|hotel|viagem|jogo|steam|playstation)\b/, 'Lazer'],
];

export function guessCategory(description: string, available: readonly string[], fallback: string): string {
  const key = normalizeMerchant(description);
  if (FEE.test(description)) return available.includes('Outros') ? 'Outros' : fallback;
  for (const [re, , cat] of BRANDS) if (cat && re.test(key) && available.includes(cat)) return cat;
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(key) && available.includes(cat)) return cat;
  return fallback;
}

/** FNV-1a 32 bits em base36: identificador estável e curto para não importar a mesma linha duas vezes. */
export function stableId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const PAYMENT = /\b(pagamento|pgto|obrigado pelo pag|pag fatura|pagamento recebido|deb automatic)\b/i;

/**
 * Classifica uma linha de CSV/OFX pelo sinal e por palavras-chave (o PDF já vem classificado pela IA).
 * `amount` > 0 = saída.
 */
export function classifyLine(description: string, amount: number, statementKind: 'card' | 'account'): LineKind {
  if (statementKind === 'account') return amount < 0 ? 'income' : FEE.test(description) ? 'fee' : 'purchase';
  if (amount < 0) return PAYMENT.test(description) ? 'payment' : 'refund';
  if (detectInstallment(description)) return 'installment';
  if (FEE.test(description)) return 'fee';
  return 'purchase';
}

/** Valor como aparece em documentos brasileiros: "1.234,56" e "1234,56". */
export function amountVariants(amount: number): string[] {
  const abs = Math.abs(amount);
  const [int = '0', dec = '00'] = abs.toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return [...new Set([`${grouped},${dec}`, `${int},${dec}`])];
}

/** O valor lido aparece no texto do documento? (conferência do que a IA devolveu) */
export function amountInText(amount: number, text: string): boolean {
  return amountVariants(amount).some((v) => new RegExp(`(^|[^\\d.,])${v.replace(/\./g, '\\.')}(?![\\d])`).test(text));
}
