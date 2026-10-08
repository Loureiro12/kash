import { cardAppearance, gradientFromColor, readableInk, shade } from '@/design-system';

describe('cores personalizadas', () => {
  it('shade clareia e escurece', () => {
    expect(shade('#808080', 1)).toBe('#FFFFFF');
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#000000', 0.5)).toBe('#808080');
  });
  it('texto escuro em cor clara, claro em cor escura', () => {
    expect(readableInk('#FFC83D')).toBe('#0B0C0E');
    expect(readableInk('#C6F432')).toBe('#0B0C0E');
    expect(readableInk('#1A237E')).toBe('#F3F4F0');
    expect(readableInk('#6C5CE7')).toBe('#F3F4F0');
  });
  it('gradiente a partir da cor e aparência do cartão', () => {
    expect(gradientFromColor('#3D8BFF')).toEqual([shade('#3D8BFF', 0.18), shade('#3D8BFF', -0.18)]);
    expect(cardAppearance({ gradientId: 'blue' })).toEqual({ colors: ['#8FD3FF', '#4C9BE8'], ink: '#0B0C0E' });
    expect(cardAppearance({ gradientId: 'blue', color: '#1A237E' })).toEqual({ colors: gradientFromColor('#1A237E'), ink: '#F3F4F0' });
  });
});
