import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as api from '@kash/supabase-client';
import * as DocumentPicker from 'expo-document-picker';
import React from 'react';
import { ImportScreen } from '@/features/import/ImportScreen';
import { importPathFor, nameWithExtension } from '@/features/import/openWith';
import { formatOf, readTextStatement } from '@/features/import/readStatement';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

/** conteúdo dos arquivos "escolhidos" (uri → texto); PDF não é lido aqui, é o leitor falso que responde */
const mockFiles: Record<string, string> = {};
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    name: string;
    type = '';
    size = 1024;
    constructor(uri: string) {
      this.uri = uri;
      this.name = uri.split('/').pop() ?? '';
    }
    async text() {
      return mockFiles[this.uri] ?? '';
    }
    async base64() {
      return 'UERG';
    }
  },
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/import',
  useLocalSearchParams: () => mockParams,
}));

/** leitor de PDF falso: a senha certa é "1234"; sem senha, pede */
const mockPdfText = jest.fn(async () => 'NUBANK\nTITULAR ANA PAULA SOUZA\nCPF 123.456.789-00\n05 SET Mercadolivre*Mercadol - Parcela 1/3 90,00');
jest.mock('@/features/import/PdfReader', () => {
  const { useImperativeHandle } = jest.requireActual('react');
  class PdfPasswordError extends Error {
    wrong: boolean;
    constructor(isWrong: boolean) {
      super('senha');
      this.wrong = isWrong;
    }
  }
  const check = (password?: string) => {
    if (password === '1234') return;
    throw new PdfPasswordError(!!password);
  };
  return {
    PdfPasswordError,
    PdfReader: ({ ref }: { ref: unknown }) => {
      useImperativeHandle(ref, () => ({
        isLocked: async () => true,
        extract: async (_b64: string, password?: string) => {
          check(password);
          return mockPdfText();
        },
      }));
      return null;
    },
  };
});

const pick = (name: string, content = '') => {
  const uri = `file:///cache/${name}`;
  mockFiles[uri] = content;
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({ canceled: false, assets: [{ uri, name, size: content.length || 2048 }] });
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.listMerchantRules as jest.Mock).mockResolvedValue([]);
  (api.listImports as jest.Mock).mockResolvedValue([]);
  mockParams = {};
  setClock(new Date(2026, 9, 11, 12));
  useKashStore.getState().reset();
  const s = useKashStore.getState();
  // um cartão e uma conta: o destino já vem escolhido
  useKashStore.setState({ auth: 'app', userId: 'u-1', cards: s.cards.slice(0, 1), accounts: s.accounts.slice(0, 1), plans: [], txs: [], user: { ...s.user, name: 'Ana Paula Souza' } });
});
afterEach(() => setClock(null));

describe('Leitura de arquivos (sem tela)', () => {
  it('formato pelo nome', () => {
    expect(formatOf('Fatura.PDF')).toBe('pdf');
    expect(formatOf('extrato.ofx')).toBe('ofx');
    expect(formatOf('a.csv')).toBe('csv');
    expect(formatOf('foto.jpg')).toBeNull();
  });

  it('OFX de conta com destino cartão avisa', () => {
    const ofx = '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-10.00<FITID>1<MEMO>Padaria</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
    expect(readTextStatement('ofx', ofx, 'card')).toEqual({ kind: 'error', message: 'Esse OFX é de conta. Escolha uma conta como destino.' });
    expect(readTextStatement('ofx', ofx, 'account').kind).toBe('ok');
  });

  it('CSV sem cabeçalhos conhecidos pede as colunas', () => {
    expect(readTextStatement('csv', 'a,b,c\n2026-10-01,Padaria,10', 'card').kind).toBe('mapping');
  });
});

describe('Abrir com o Kash', () => {
  it('arquivo de outro app vira a rota da importação; outros links seguem', () => {
    expect(importPathFor('file:///private/var/Inbox/fatura.pdf')).toBe(`/import?file=${encodeURIComponent('file:///private/var/Inbox/fatura.pdf')}`);
    expect(importPathFor('content://com.android.providers.downloads/document/12')).toMatch(/^\/import\?file=content/);
    expect(importPathFor('file:///Inbox/foto.jpg')).toBeNull();
    expect(importPathFor('kash://reset-password?code=1')).toBeNull();
  });

  it('content:// sem extensão ganha a do tipo', () => {
    expect(nameWithExtension('12', 'application/pdf')).toBe('12.pdf');
    expect(nameWithExtension('fatura.csv', 'application/octet-stream')).toBe('fatura.csv');
    expect(nameWithExtension('', 'image/png')).toBe('arquivo');
  });

  it('a tela abre com o arquivo recebido', async () => {
    mockParams = { file: 'file:///Inbox/fatura-out.pdf' };
    await renderWithTheme(<ImportScreen />);
    expect(screen.getByTestId('import-file-name')).toHaveTextContent('fatura-out.pdf');
  });
});

describe('Importar fatura (CSV)', () => {
  const csv = ['date,title,amount', '2026-09-05,Dm*Streamingx - Parcela 2/12,22.90', '2026-09-13,EBW*Spotify - NuPay,23.90', '2026-09-14,Pagamento recebido,-558.95'].join('\n');

  it('escolher, revisar (renomear, só parceladas) e importar guardando o nome original', async () => {
    (api.importCardStatement as jest.Mock).mockResolvedValueOnce('imp-1');
    const card = useKashStore.getState().cards[0]!;
    await renderWithTheme(<ImportScreen />);
    expect(screen.getByTestId(`import-target-${card.id}`).props.accessibilityState).toMatchObject({ selected: true });

    pick('fatura.csv', csv);
    await fireEvent.press(screen.getByTestId('import-pick'));
    expect(screen.getByTestId('import-file-name')).toHaveTextContent('fatura.csv');
    await fireEvent.press(screen.getByTestId('import-read'));

    await waitFor(() => expect(screen.getByTestId('import-summary')).toBeTruthy());
    expect(screen.getByTestId('import-installments')).toBeTruthy();
    expect(screen.getByText('3/12 agora · faltam 10 até julho de 2027')).toBeTruthy();
    // "Só parceladas" por padrão: a compra à vista começa desmarcada
    expect(screen.getByTestId('import-total')).toHaveTextContent('1 parcelamento · R$ 22,90');

    const [title] = screen.getAllByTestId(/^import-row-.*-title$/);
    await fireEvent.changeText(title!, 'Streaming da família');
    await fireEvent.press(screen.getByTestId('import-save'));

    await waitFor(() => expect(screen.getByTestId('import-done')).toBeTruthy());
    const call = (api.importCardStatement as jest.Mock).mock.calls[0]![1];
    expect(call).toMatchObject({ cardId: card.id, fileName: 'fatura.csv', format: 'csv', statementMonth: '2026-09' });
    expect(call.items).toEqual([expect.objectContaining({ type: 'plan', title: 'Streaming da família', original_title: 'Dm*Streamingx - Parcela 2/12', installments: 12, current: 3 })]);
    // o nome trocado vira regra para a próxima importação
    expect(api.saveMerchantRules).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining({ title: 'Streaming da família' })]);
  });

  it('"Tudo" inclui a compra à vista (fatura do mês passado)', async () => {
    (api.importCardStatement as jest.Mock).mockResolvedValueOnce('imp-2');
    await renderWithTheme(<ImportScreen />);
    pick('fatura.csv', csv);
    await fireEvent.press(screen.getByTestId('import-pick'));
    await fireEvent.press(screen.getByTestId('import-read'));
    await waitFor(() => expect(screen.getByTestId('import-mode-all')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('import-mode-all'));
    expect(screen.getByTestId('import-total')).toHaveTextContent('1 parcelamento e 1 lançamento · R$ 46,80');
  });

  it('formato não suportado avisa e não deixa ler', async () => {
    await renderWithTheme(<ImportScreen />);
    pick('foto.jpg');
    await fireEvent.press(screen.getByTestId('import-pick'));
    expect(screen.getByTestId('import-error')).toHaveTextContent(/Use PDF, OFX ou CSV/);
    expect(screen.getByTestId('import-read').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('Importar extrato (transferências, categoria em lote e colunas lembradas)', () => {
  const csv = ['Quando;Histórico;Quanto', '02/10/2026;APLICACAO POUPANCA;-500,00', '03/10/2026;TED MESMA TITULARIDADE;300,00', '04/10/2026;PADARIA PAO BOM;-20,00', '05/10/2026;LANCHONETE X;-50,00'].join('\n');

  beforeEach(() => {
    const color = '#C6F432';
    useKashStore.setState({
      accounts: [
        { id: 'acc-cc', name: 'Corrente', kind: 'Conta corrente', balance: 1000, color },
        { id: 'acc-pp', name: 'Poupança', kind: 'Poupança', balance: 2000, color },
        { id: 'acc-nu', name: 'Nubank', kind: 'Conta corrente · Nubank', balance: 300, color },
      ],
    });
  });

  it('aplicação vira transferência para a poupança; a TED pede a conta; saídas ganham categoria de uma vez', async () => {
    (api.importAccountStatement as jest.Mock).mockResolvedValueOnce('imp-acc');
    mockParams = { type: 'account', id: 'acc-cc' };
    await renderWithTheme(<ImportScreen />);
    pick('extrato.csv', csv);
    await fireEvent.press(screen.getByTestId('import-pick'));
    await fireEvent.press(screen.getByTestId('import-read'));
    // colunas desconhecidas: pergunta uma vez
    expect(screen.getByTestId('import-mapping')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('import-read'));
    await waitFor(() => expect(screen.getByTestId('import-transfers')).toBeTruthy());

    expect(screen.getByTestId('import-row-0-category')).toHaveTextContent('⇄ Para Poupança');
    expect(screen.getByTestId('import-row-1-transfer-hint')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('import-row-1-category'));
    await fireEvent.press(screen.getByTestId('import-row-1-transfer-acc-nu'));
    expect(screen.getByTestId('import-row-1-category')).toHaveTextContent('⇄ De Nubank');

    await fireEvent.press(screen.getByTestId('import-purchases-bulk-category'));
    await fireEvent.press(screen.getByTestId('import-purchases-bulk-Comida'));
    expect(screen.getByTestId('import-row-2-category')).toHaveTextContent('Comida');
    expect(screen.getByTestId('import-row-3-category')).toHaveTextContent('Comida');
    expect(screen.getByTestId('import-total')).toHaveTextContent('2 transferências e 2 lançamentos · R$ 270,00');

    await fireEvent.press(screen.getByTestId('import-save'));
    await waitFor(() => expect(screen.getByTestId('import-done')).toBeTruthy());
    const call = (api.importAccountStatement as jest.Mock).mock.calls[0]![1];
    expect(call.items).toEqual([
      expect.objectContaining({ type: 'transfer', amount: -500, counterpart_account_id: 'acc-pp' }),
      expect.objectContaining({ type: 'transfer', amount: 300, counterpart_account_id: 'acc-nu' }),
      expect.objectContaining({ type: 'tx', amount: -20, category: 'Comida' }),
      expect.objectContaining({ type: 'tx', amount: -50, category: 'Comida' }),
    ]);

    // mesmo banco de novo: as colunas já vêm lidas
    await fireEvent.press(screen.getByTestId('import-another'));
    pick('extrato2.csv', ['Quando;Histórico;Quanto', '06/10/2026;FARMACIA;-30,00'].join('\n'));
    await fireEvent.press(screen.getByTestId('import-pick'));
    await fireEvent.press(screen.getByTestId('import-read'));
    await waitFor(() => expect(screen.getByTestId('import-summary')).toBeTruthy());
  });
});

describe('Importar fatura (PDF com senha)', () => {
  it('pede a senha ao escolher, avisa senha errada e manda à IA só o texto limpo', async () => {
    (api.readStatementWithAi as jest.Mock).mockResolvedValueOnce({ kind: 'card', format: 'pdf', dueDate: '2026-10-13', total: 90, cardLast4s: [], lines: [{ date: '2026-09-05', description: 'Mercadolivre*Mercadol - Parcela 1/3', amount: 90, kind: 'installment', installment: { current: 1, total: 3 } }] });
    await renderWithTheme(<ImportScreen />);
    pick('fatura.pdf');
    await fireEvent.press(screen.getByTestId('import-pick'));
    await waitFor(() => expect(screen.getByTestId('import-pdf-locked')).toBeTruthy());

    // sem autorizar a IA não lê
    await fireEvent.press(screen.getByTestId('import-read'));
    expect(screen.getByTestId('import-error')).toHaveTextContent(/autorize o envio do texto/);
    await fireEvent.press(screen.getByTestId('import-ai-consent'));

    for (let i = 0; i < 3; i++) {
      await fireEvent.changeText(screen.getByTestId('import-pdf-password'), `errada${i}`);
      await fireEvent(screen.getByTestId('import-pdf-password'), 'submitEditing');
    }
    expect(screen.getByTestId('import-error')).toHaveTextContent(/Senha incorreta/);
    expect(screen.getByTestId('import-pdf-alternatives')).toBeTruthy();
    expect(api.readStatementWithAi).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('import-pdf-password'), '1234');
    await act(async () => fireEvent.press(screen.getByTestId('import-read')));
    await waitFor(() => expect(screen.getByTestId('import-summary')).toBeTruthy());
    const sent = (api.readStatementWithAi as jest.Mock).mock.calls[0]![1] as { text: string; kind: string };
    expect(sent.kind).toBe('card');
    expect(sent.text).not.toMatch(/Ana|Paula|Souza|123\.456/);
    expect(sent.text).toContain('Mercadolivre*Mercadol - Parcela 1/3 90,00');
  });
});

describe('Sugerir nomes com IA (CSV)', () => {
  it('só os nomes desconhecidos vão, sem dados pessoais; a sugestão entra marcada como IA', async () => {
    await AsyncStorage.setItem('kash.import.aiConsent', '1');
    (api.suggestNamesWithAi as jest.Mock).mockImplementationOnce(async (_db: unknown, { items }: { items: { id: string }[] }) => ({ [items[0]!.id]: { title: 'Loja do João', category: 'Lazer' } }));
    await renderWithTheme(<ImportScreen />);
    pick('fatura.csv', ['date,title,amount', '2026-09-05,MP*LOJADOJOAO 12345678 - Parcela 2/5,50.00', '2026-09-06,EBW*Spotify - Parcela 2/3,23.90', '2026-09-07,Pagamento recebido,-100.00'].join('\n'));
    await fireEvent.press(screen.getByTestId('import-pick'));
    await fireEvent.press(screen.getByTestId('import-read'));
    await waitFor(() => expect(screen.getByTestId('import-ai-names')).toHaveTextContent('A IA sugeriu 1 nome (marcados com "IA"). Confira: os que você importar viram regra e não vão mais para a IA.'));

    const sent = (api.suggestNamesWithAi as jest.Mock).mock.calls[0]![1] as { items: { id: string; description: string }[] };
    expect(sent.items).toEqual([{ id: expect.any(String), description: 'MP*LOJADOJOAO # - Parcela 2/5' }]);
    expect(screen.getByTestId('import-row-0-title').props.value).toBe('Loja do João');
    expect(screen.getByTestId('import-row-0-ai')).toBeTruthy();
    expect(screen.getByTestId('import-row-0-category')).toHaveTextContent('Lazer');
    expect(screen.getByTestId('import-row-1-title').props.value).toBe('Spotify');

    // importou: o nome aceito da IA vira regra (na próxima, vem sem IA)
    (api.importCardStatement as jest.Mock).mockResolvedValueOnce('imp-ai');
    await fireEvent.press(screen.getByTestId('import-save'));
    await waitFor(() => expect(screen.getByTestId('import-done')).toBeTruthy());
    expect(api.saveMerchantRules).toHaveBeenCalledWith(expect.anything(), [{ pattern: sent.items[0]!.id, title: 'Loja do João', category: 'Lazer' }]);
  });

  it('sem autorização, nada vai para a IA', async () => {
    await AsyncStorage.setItem('kash.import.aiConsent', '0');
    await renderWithTheme(<ImportScreen />);
    pick('fatura.csv', ['date,title,amount', '2026-09-05,MP*LOJADOJOAO - Parcela 2/5,50.00'].join('\n'));
    await fireEvent.press(screen.getByTestId('import-pick'));
    await fireEvent.press(screen.getByTestId('import-read'));
    await waitFor(() => expect(screen.getByTestId('import-summary')).toBeTruthy());
    expect(api.suggestNamesWithAi).not.toHaveBeenCalled();
    expect(screen.queryByTestId('import-ai-names')).toBeNull();
  });
});
