import type { Metadata } from 'next';
import { ReportScreen } from '@/features/report/ReportScreen';

export const metadata: Metadata = { title: 'Relatório' };

export default function Page() {
  return <ReportScreen />;
}
