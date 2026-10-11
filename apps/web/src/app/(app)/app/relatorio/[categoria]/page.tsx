import type { Metadata } from 'next';
import { CategoryScreen } from '@/features/report/CategoryScreen';

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  return { title: `${decodeURIComponent(categoria)} · Relatório` };
}

export default async function Page({ params }: Props) {
  const { categoria } = await params;
  return <CategoryScreen category={decodeURIComponent(categoria)} />;
}
