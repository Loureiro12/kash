import type { NextConfig } from 'next';

/**
 * Content-Security-Policy: só o próprio site, o Supabase (API e tempo real) e o Analytics da Vercel
 * (servido em /_vercel, mesma origem). Scripts e estilos inline continuam liberados porque o Next
 * injeta os dados das páginas estáticas inline (nonce exigiria renderizar tudo sob demanda).
 */
function contentSecurityPolicy() {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const realtime = supabase.replace(/^http/, 'ws');
  const dev = process.env.NODE_ENV !== 'production';
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${realtime}`.trim(),
    // leitor de PDF da importação (pdf.js) roda num worker do próprio site
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // local o Supabase é http://127.0.0.1; na Vercel tudo é https
    ...(process.env.VERCEL ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pacotes do monorepo publicam TypeScript direto (sem build)
  transpilePackages: ['@kash/domain', '@kash/importers', '@kash/supabase-client'],
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
