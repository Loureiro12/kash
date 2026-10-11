import { guessCsvMapping, parseCsv, parseOfx, readCsv, type CsvMapping, type CsvTable, type ParsedStatement } from '@kash/importers';

export type TargetType = 'card' | 'account';
export type ImportFormat = 'pdf' | 'ofx' | 'csv';

/** Formato pelo nome do arquivo (o seletor do sistema nem sempre manda o tipo certo). */
export const formatOf = (name: string): ImportFormat | null => (/\.pdf$/i.test(name) ? 'pdf' : /\.ofx$/i.test(name) ? 'ofx' : /\.(csv|txt)$/i.test(name) ? 'csv' : null);

export type ReadResult = { kind: 'ok'; statement: ParsedStatement } | { kind: 'mapping'; csv: { table: CsvTable; mapping: CsvMapping } } | { kind: 'error'; message: string };

const EMPTY = 'Não encontramos lançamentos nesse arquivo.';

/**
 * Lê OFX/CSV (texto já carregado do arquivo) para o destino escolhido. CSV com colunas que não
 * reconhecemos volta como `mapping` para a pessoa dizer qual coluna é qual.
 */
export function readTextStatement(format: 'ofx' | 'csv', text: string, targetType: TargetType): ReadResult {
  let statement: ParsedStatement;
  if (format === 'ofx') {
    statement = parseOfx(text);
    if (statement.kind !== targetType) {
      return { kind: 'error', message: statement.kind === 'card' ? 'Esse OFX é de cartão de crédito. Escolha um cartão como destino.' : 'Esse OFX é de conta. Escolha uma conta como destino.' };
    }
  } else {
    const table = readCsv(text);
    const mapping = guessCsvMapping(table, targetType);
    if (!mapping) return { kind: 'mapping', csv: { table, mapping: { date: 0, description: 1, amount: 2, expensesArePositive: targetType === 'card' } } };
    statement = parseCsv(table, mapping, targetType);
  }
  return statement.lines.length ? { kind: 'ok', statement } : { kind: 'error', message: EMPTY };
}

/** CSV com as colunas escolhidas à mão. */
export function readMappedCsv(table: CsvTable, mapping: CsvMapping, targetType: TargetType): ReadResult {
  const statement = parseCsv(table, mapping, targetType);
  return statement.lines.length ? { kind: 'ok', statement } : { kind: 'error', message: 'Com essas colunas não encontramos lançamentos. Confira a coluna de data e de valor.' };
}
