/**
 * Relógio injetável — permite congelar o "agora" em testes e E2E
 * sem espalhar `new Date()` pelo código.
 */
let override: Date | null = null;

export function now(): Date {
  return override ? new Date(override) : new Date();
}

export function setClock(date: Date | null) {
  override = date;
}
