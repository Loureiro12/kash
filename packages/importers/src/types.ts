/** De onde veio o arquivo. */
export type ImportFormat = 'pdf' | 'ofx' | 'csv';

/** Natureza de uma linha lida do arquivo (antes de decidir o que entra no Kash). */
export type LineKind =
  /** compra à vista no cartão / débito na conta */
  | 'purchase'
  /** parcela de compra parcelada ("Parcela 3/10") — inclui parcelamentos com juros */
  | 'installment'
  /** pagamento da fatura (crédito no cartão) */
  | 'payment'
  /** estorno, ajuste de crédito, cashback */
  | 'refund'
  /** juros, multa, mora, IOF, anuidade, tarifas */
  | 'fee'
  /** crédito numa conta (entrada) */
  | 'income'
  /** linha que não é lançamento (ex.: "parcelas das próximas faturas", totais) */
  | 'ignore';

export interface ParsedLine {
  /** ISO yyyy-mm-dd da linha no arquivo (compra parcelada costuma trazer a data da compra original) */
  date: string;
  /** texto como veio do banco */
  description: string;
  /** valor positivo = saída (compra, débito); negativo = crédito (pagamento, estorno, entrada) */
  amount: number;
  kind: LineKind;
  installment?: { current: number; total: number };
  /** final do cartão impresso na linha/seção, quando houver */
  cardLast4?: string;
  /** identificador do banco (FITID do OFX) */
  bankId?: string;
  /** sugestões da IA (PDF): nome amigável e categoria da lista da pessoa */
  suggestedTitle?: string;
  suggestedCategory?: string;
}

export interface ParsedStatement {
  /** 'card' = fatura; 'account' = extrato de conta */
  kind: 'card' | 'account';
  format: ImportFormat;
  issuer?: string;
  /** vencimento da fatura (ISO) */
  dueDate?: string;
  /** mês de competência ("yyyy-mm"); fatura: mês anterior ao vencimento */
  statementMonth?: string;
  /** total informado pelo banco (conferência) */
  total?: number;
  cardLast4s: string[];
  lines: ParsedLine[];
}
