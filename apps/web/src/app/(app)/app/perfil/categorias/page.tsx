import type { Metadata } from 'next';
import { CategoriesScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Categorias' };

export default function Page() {
  return <CategoriesScreen />;
}
