import { getProfile, updateSettings } from '../src';
import { createTestUser, deleteTestUser } from './helpers';

describe('primeiro acesso (perfil)', () => {
  it('começa pendente; concluir e esconder o card persistem e podem voltar', async () => {
    const u = await createTestUser('onb');
    expect((await getProfile(u.db)).settings).toMatchObject({ onboardingDone: false, checklistHidden: false });
    await updateSettings(u.db, { onboardingDone: true, monthlyBudget: 3000 });
    await updateSettings(u.db, { checklistHidden: true });
    expect((await getProfile(u.db)).settings).toMatchObject({ onboardingDone: true, checklistHidden: true, monthlyBudget: 3000 });
    await updateSettings(u.db, { checklistHidden: false });
    expect((await getProfile(u.db)).settings.checklistHidden).toBe(false);
    await deleteTestUser(u);
  });
});
