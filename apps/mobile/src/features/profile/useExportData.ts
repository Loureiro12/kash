import { exportMyData, toKashError } from '@kash/supabase-client';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { DATA_SOURCE } from '@/data/source';
import { now } from '@/lib/clock';
import { supabase } from '@/services/supabase';
import { useKashStore } from '@/store';
import { toISODate } from '@kash/domain';

/** Nome do arquivo exportado: kash-export-2026-10-06.json */
export const exportFileName = (date: Date) => `kash-export-${toISODate(date)}.json`;

/** Monta o JSON: no modo remoto pela RPC `export_my_data`; no modo seed, a partir do store (demonstração). */
export async function buildExportJson(): Promise<string> {
  if (DATA_SOURCE === 'remote') return JSON.stringify(await exportMyData(supabase), null, 2);
  const s = useKashStore.getState();
  return JSON.stringify({ format: 'kash-export/1', exported_at: now().toISOString(), user: s.user, settings: s.settings, accounts: s.accounts, cards: s.cards, plans: s.plans, transactions: s.txs, bills: s.bills, goals: s.goals, invoices: s.invoices }, null, 2);
}

/**
 * "Exportar meus dados": gera um JSON com tudo da usuária num arquivo temporário e abre a folha de
 * compartilhamento do sistema (salvar em Arquivos, enviar por e-mail…). Erros viram toast.
 */
export function useExportData() {
  const showToast = useKashStore((s) => s.showToast);
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const json = await buildExportJson();
      const file = new File(Paths.cache, exportFileName(now()));
      file.write(json);
      if (!(await Sharing.isAvailableAsync())) {
        showToast(`Arquivo salvo em ${file.name}`);
        return;
      }
      showToast('Arquivo pronto pra compartilhar');
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Exportar meus dados' });
    } catch (err) {
      showToast(toKashError(err).message);
    } finally {
      setExporting(false);
    }
  }, [exporting, showToast]);

  return { exportData, exporting };
}
