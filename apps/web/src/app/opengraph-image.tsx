import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Kash — Sua grana, sem mistério.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagem de compartilhamento gerada no build com a identidade do site. */
export default async function OpenGraphImage() {
  const font = await readFile(join(process.cwd(), 'assets/fonts/Sora_800ExtraBold.ttf'));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B0C0E', color: '#F3F4F0', padding: 72, fontFamily: 'Sora' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#C6F432', color: '#0B0C0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>K</div>
          <div style={{ fontSize: 40, letterSpacing: -1 }}>Kash</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 104, lineHeight: 0.98, letterSpacing: -5 }}>Sua grana, sem mistério.</div>
          <div style={{ fontSize: 30, color: '#B4B8BF' }}>Cartões, parcelas, contas fixas e metas num app só.</div>
        </div>
        <div style={{ display: 'flex', height: 12, width: 220, borderRadius: 6, background: '#C6F432' }} />
      </div>
    ),
    { ...size, fonts: [{ name: 'Sora', data: font, weight: 800, style: 'normal' }] },
  );
}
