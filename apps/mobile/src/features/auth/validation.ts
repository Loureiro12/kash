/** Regras de validação dos formulários de auth (puras, testáveis). */
export const MIN_PASSWORD = 6;

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function validateLogin(email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = 'Informe seu e-mail ou celular.';
  else if (!isValidEmail(email) && !/^\+?\d{10,13}$/.test(email.replace(/\D/g, ''))) errors.email = 'Esse e-mail não parece válido.';
  if (!password) errors.password = 'Informe sua senha.';
  return errors;
}

export function validateSignup(name: string, email: string, password: string, accepted: boolean): { name?: string; email?: string; password?: string; terms?: string } {
  const errors: { name?: string; email?: string; password?: string; terms?: string } = {};
  if (name.trim().length < 2) errors.name = 'Como a gente te chama?';
  if (!isValidEmail(email)) errors.email = 'Esse e-mail não parece válido.';
  if (password.length < MIN_PASSWORD) errors.password = `Pelo menos ${MIN_PASSWORD} caracteres.`;
  if (!accepted) errors.terms = 'Precisa aceitar os termos pra continuar.';
  return errors;
}

/** Força simples da senha: 0..3 */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= MIN_PASSWORD) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  const s = Math.min(3, score) as 0 | 1 | 2 | 3;
  return { score: s, label: s <= 1 ? 'Senha fraca' : s === 2 ? 'Senha boa' : 'Senha forte' };
}
