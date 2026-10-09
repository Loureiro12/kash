import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  // a área logada do Kash web não tem nada para indexar
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/app/', '/entrar', '/criar-conta', '/esqueci-senha'] }], sitemap: `${site.url}/sitemap.xml`, host: site.url };
}
