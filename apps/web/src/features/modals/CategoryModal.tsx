'use client';

import { CATEGORY_NAME_MAX, categoryUsage, validateCategoryName } from '@kash/domain';
import { useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { colorSuggestions } from '@/components/app/colors';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, ColorPicker, TextInput, uiStyles } from '@/components/app/ui';
import { describeUsage, useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';

/** Nova categoria / editar / excluir (com "mover para" quando está em uso). */
export function CategoryModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const editing = id ? (snap.categories.find((c) => c.id === id) ?? null) : null;
  // cor inicial: a da categoria ou a primeira sugestão ainda não usada
  const firstFree = colorSuggestions.find((c) => !snap.categories.some((cat) => cat.color.toUpperCase() === c)) ?? colorSuggestions[0];
  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState<string>(editing?.color ?? firstFree);
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const others = snap.categories.filter((c) => c.id !== editing?.id);
  const [moveTo, setMoveTo] = useState(others.find((c) => c.name === 'Outros')?.name ?? others[0]?.name ?? '');
  const error = validateCategoryName(name, snap.categories, editing?.id);
  const usage = editing ? categoryUsage(editing.name, { txs: snap.txs, bills: snap.bills, plans: snap.plans }) : null;
  const canDelete = !!editing && snap.categories.length > 1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error || saving) return;
    setSaving(true);
    const input = { name: name.trim(), color };
    const renamed = editing && editing.name !== input.name && usage?.total ? usage : undefined;
    const ok = await actions.saveCategory(editing?.id ?? null, input, renamed);
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!usage?.total) {
      if (!(await confirmDelete('Excluir categoria?', `“${editing.name}” não está em uso.`))) return;
      if (await actions.deleteCategory(editing.id, editing.name)) onClose();
      return;
    }
    setDeleting(true);
  };

  const confirmMove = async () => {
    if (!editing || !moveTo || !usage) return;
    setSaving(true);
    const ok = await actions.deleteCategory(editing.id, editing.name, moveTo, usage);
    setSaving(false);
    if (ok) onClose();
  };

  if (deleting && editing && usage) {
    return (
      <Modal
        title={`Excluir “${editing.name}”`}
        onClose={onClose}
        testID="modal-category"
        footer={
          <>
            <Button variant="danger" onClick={() => void confirmMove()} disabled={!moveTo} loading={saving} testID="category-delete-confirm">
              Excluir e mover para {moveTo}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setDeleting(false)} testID="category-delete-back">
              Voltar
            </Button>
          </>
        }
      >
        <p className={m.note} data-testid="category-delete-usage">
          Ela está em {describeUsage(usage)}. Escolha para qual categoria eles vão:
        </p>
        <ChipGroup label="Mover para">
          {others.map((c) => (
            <Chip key={c.id} label={c.name} dotColor={c.color} selected={moveTo === c.name} onSelect={() => setMoveTo(c.name)} testID={`category-move-${c.name}`} />
          ))}
        </ChipGroup>
      </Modal>
    );
  }

  return (
    <Modal
      title={editing ? 'Editar categoria' : 'Nova categoria'}
      onClose={onClose}
      testID="modal-category"
      footer={
        <>
          <Button type="submit" form="category-form" disabled={touched && !!error} loading={saving} testID="category-save">
            {editing ? 'Salvar' : 'Criar categoria'}
          </Button>
          {canDelete ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="category-delete">
              Excluir categoria
            </Button>
          ) : null}
        </>
      }
    >
      <form id="category-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <div data-testid="category-preview" aria-hidden="true">
          <span className={uiStyles.chip} style={{ cursor: 'default' }}>
            <span className={uiStyles.dot} style={{ background: color }} />
            {name.trim() || 'Nome da categoria'}
          </span>
        </div>
        <TextInput
          label="Nome"
          placeholder="ex.: Pets, Academia, Presentes"
          value={name}
          maxLength={CATEGORY_NAME_MAX}
          onChange={(e) => {
            setName(e.target.value);
            setTouched(true);
          }}
          error={touched ? error : null}
          testID="category-name"
        />
        <ColorPicker label="Cor" palette={colorSuggestions} value={color} onChange={setColor} size={34} testID="category-color" />
        {editing && usage && usage.total > 0 ? (
          <p className={m.note} data-testid="category-usage">
            Em uso: {describeUsage(usage)}. Renomear atualiza todos.
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
