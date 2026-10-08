import { normalizeHexColor, type CategoryDef } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';

export interface CategoryInput {
  name: string;
  /** #RRGGBB (normalizada para maiúsculas) */
  color: string;
}

const color = (hex: string) => normalizeHexColor(hex) ?? '#AAB2BF';
const toCategory = (row: { id: string; name: string; color: string }): CategoryDef => ({ id: row.id, name: row.name, color: row.color });

/** Categorias do usuário na ordem de exibição. */
export async function listCategories(db: KashClient): Promise<CategoryDef[]> {
  return unwrap(await db.from('categories').select('id, name, color').order('position').order('created_at')).map(toCategory);
}

/** Cria no fim da lista. Nome repetido → KashApiError(conflict); reservado/vazio → validation. */
export async function createCategory(db: KashClient, input: CategoryInput): Promise<CategoryDef> {
  return toCategory(unwrap(await db.from('categories').insert({ name: input.name.trim(), color: color(input.color) }).select('id, name, color').single()));
}

/** Renomeia/recolore; lançamentos, contas fixas e parcelamentos acompanham o novo nome. */
export async function updateCategory(db: KashClient, id: string, input: CategoryInput): Promise<void> {
  unwrap(await db.rpc('update_category', { p_id: id, p_name: input.name.trim(), p_color: color(input.color) }));
}

/** Exclui. Em uso, `moveTo` (nome de outra categoria) recebe os registros; sem ele → KashApiError. */
export async function deleteCategory(db: KashClient, id: string, moveTo?: string): Promise<void> {
  unwrap(await db.rpc('delete_category', { p_id: id, ...(moveTo ? { p_move_to: moveTo } : {}) }));
}
