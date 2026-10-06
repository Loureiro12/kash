let counter = 0;
/** ID simples e único por sessão (prefixo define o tipo: acc/card/tx/plan). */
export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
