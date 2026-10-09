import type { Metadata } from 'next';
import { ForecastScreen } from '@/features/forecast/ForecastScreen';

export const metadata: Metadata = { title: 'Previsão' };

export default function Page() {
  return <ForecastScreen />;
}
