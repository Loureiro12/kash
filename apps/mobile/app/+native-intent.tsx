import { importPathFor } from '@/features/import/openWith';

/**
 * "Abrir com o Kash" / "Compartilhar": o sistema abre o app com o arquivo (file:// no iOS,
 * content:// no Android). Esses caminhos viram a tela de importação com o arquivo já escolhido;
 * os demais links (kash://, recuperação de senha) seguem como estão.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  // retorno do login social: quem abre a sessão é o login (ver useAuthLinks); a rota fica no login
  if (path.includes('auth-callback')) return '/login';
  return importPathFor(path) ?? path;
}
