import type { Metadata } from 'next';
import { ImportScreen } from '@/features/import/ImportScreen';

export const metadata: Metadata = { title: 'Importar' };

export default function Page() {
  return <ImportScreen />;
}
