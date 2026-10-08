import { describe, expect, it } from 'vitest';
import { flowReducer, initialFlow, validateCredentials, type FlowEvent, type FlowState } from '@/features/account-deletion/flow';

const run = (events: FlowEvent[], from: FlowState = initialFlow) => events.reduce(flowReducer, from);

describe('fluxo de exclusão de conta', () => {
  it('caminho feliz: entrar → confirmar (exige o aceite) → excluir', () => {
    let s = run([{ type: 'submitSignIn' }, { type: 'signedIn', email: 'lara@email.com' }]);
    expect(s).toMatchObject({ step: 'confirm', email: 'lara@email.com', acknowledged: false });
    s = run([{ type: 'submitDelete' }], s);
    expect(s.step).toBe('confirm'); // sem aceite não exclui
    s = run([{ type: 'toggleAck', value: true }, { type: 'submitDelete' }, { type: 'deleted' }], s);
    expect(s).toMatchObject({ step: 'done', email: 'lara@email.com' });
  });

  it('erro ao entrar volta ao passo 1 com a mensagem; erro ao excluir volta à confirmação', () => {
    expect(run([{ type: 'submitSignIn' }, { type: 'failed', message: 'E-mail ou senha incorretos.' }])).toMatchObject({ step: 'signIn', error: 'E-mail ou senha incorretos.' });
    const s = run([{ type: 'submitSignIn' }, { type: 'signedIn', email: 'a@b.co' }, { type: 'toggleAck', value: true }, { type: 'submitDelete' }, { type: 'failed', message: 'falhou' }]);
    expect(s).toMatchObject({ step: 'confirm', error: 'falhou', acknowledged: true });
  });

  it('cancelar na confirmação recomeça do zero; eventos fora de ordem são ignorados', () => {
    const s = run([{ type: 'submitSignIn' }, { type: 'signedIn', email: 'a@b.co' }, { type: 'cancel' }]);
    expect(s).toEqual(initialFlow);
    expect(run([{ type: 'deleted' }, { type: 'signedIn', email: 'x@y.z' }])).toEqual(initialFlow);
  });

  it('valida e-mail e senha antes de chamar o servidor', () => {
    expect(validateCredentials('lara', '123')).toBe('Digite o e-mail da sua conta.');
    expect(validateCredentials(' lara@email.com ', '')).toBe('Digite sua senha.');
    expect(validateCredentials('lara@email.com', '123456')).toBeNull();
  });
});
