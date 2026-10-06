import { passwordStrength, validateLogin, validateSignup } from '@/features/auth/validation';

describe('validação de auth', () => {
  it('login exige e-mail/celular e senha', () => {
    expect(validateLogin('', '')).toEqual({ email: 'Informe seu e-mail ou celular.', password: 'Informe sua senha.' });
    expect(validateLogin('lara@email.com', 'x')).toEqual({});
    expect(validateLogin('(11) 98765-4321', 'x')).toEqual({});
    expect(validateLogin('lara@', 'x').email).toBe('Esse e-mail não parece válido.');
  });
  it('cadastro valida nome, e-mail, senha e termos', () => {
    expect(Object.keys(validateSignup('L', 'x', '123', false)).sort()).toEqual(['email', 'name', 'password', 'terms']);
    expect(validateSignup('Lara', 'lara@email.com', '123456', true)).toEqual({});
  });
  it('força da senha', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abcdef')).toMatchObject({ score: 1, label: 'Senha fraca' });
    expect(passwordStrength('Abcdef')).toMatchObject({ score: 2, label: 'Senha boa' });
    expect(passwordStrength('Abcdef1!')).toMatchObject({ score: 3, label: 'Senha forte' });
  });
});
