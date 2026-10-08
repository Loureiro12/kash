import { site } from './site';

/** Texto da página "Excluir conta" (exigência do Google Play: pedir a exclusão sem o app). */
export const accountDeletion = {
  title: 'Excluir sua conta',
  lead: 'Aqui você exclui sua conta do Kash e todos os dados ligados a ela, sem precisar do app.',
  deletedTitle: 'O que é apagado',
  deleted: [
    'Seu cadastro: nome, e-mail e celular.',
    'Tudo que você lançou: gastos, entradas, cartões, contas, contas fixas, parcelamentos, metas e categorias.',
    'Suas preferências, como tema, limite mensal e lembretes.',
  ],
  notesTitle: 'Antes de continuar',
  notes: [
    'A exclusão acontece na hora e não dá pra desfazer.',
    'Quer guardar uma cópia? No app, vá em Perfil › Exportar meus dados antes de excluir.',
    'Só guardamos o que a lei obrigar, pelo prazo exigido. O resto some imediatamente.',
  ],
  inApp: 'Também dá pra excluir direto no app, em Perfil › Excluir conta.',
  fallbackTitle: 'Não consegue entrar na conta?',
  fallback: `Peça a exclusão por e-mail para ${site.emails.privacy}, escrevendo do endereço cadastrado no Kash. Respondemos em até 15 dias.`,
  fallbackMailto: `mailto:${site.emails.privacy}?subject=${encodeURIComponent('Excluir minha conta do Kash')}&body=${encodeURIComponent('Olá! Quero excluir minha conta do Kash e todos os meus dados.\n\nE-mail da conta: ')}`,
};
