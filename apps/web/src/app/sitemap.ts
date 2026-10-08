import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${site.url}/privacidade`, lastModified: site.privacyUpdatedAt, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${site.url}/excluir-conta`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
