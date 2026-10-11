import React, { useCallback, useImperativeHandle, useRef, type Ref } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/** Erro de PDF com senha: `wrong` quando a senha digitada não abriu. */
export class PdfPasswordError extends Error {
  constructor(public readonly wrong: boolean) {
    super(wrong ? 'Senha incorreta.' : 'Esse PDF tem senha.');
  }
}

export interface PdfReaderHandle {
  /** texto do PDF (base64), linha a linha; lança PdfPasswordError se pedir senha */
  extract: (base64: string, password?: string) => Promise<string>;
  /** o PDF pede senha? */
  isLocked: (base64: string) => Promise<boolean>;
}

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build';
/** sem resposta da página nesse tempo (sem internet para baixar o leitor, PDF enorme): desiste */
const TIMEOUT_MS = 60_000;

/**
 * Página do leitor: pdf.js roda dentro do WebView, no aparelho. Só o código do leitor vem da CDN;
 * o arquivo e a senha nunca saem do telefone. Junta os pedaços da mesma altura numa linha
 * (igual ao site) para manter "data · descrição · valor" juntos.
 */
export const READER_HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
(function () {
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var pending = [];
  var lib = null;
  function bytes(b64) { var bin = atob(b64); var u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  async function run(req) {
    try {
      var doc = await lib.getDocument({ data: bytes(req.b64), password: req.password || undefined, isEvalSupported: false }).promise;
      if (req.probe) { await doc.destroy(); return post({ id: req.id, ok: true, text: '' }); }
      var pages = [];
      for (var p = 1; p <= doc.numPages; p++) {
        var page = await doc.getPage(p);
        var content = await page.getTextContent();
        var rows = new Map();
        content.items.forEach(function (item) {
          if (!item.str || !item.str.trim()) return;
          var y = Math.round(item.transform[5] / 2);
          var list = rows.get(y) || [];
          list.push({ x: item.transform[4], s: item.str });
          rows.set(y, list);
        });
        var lines = Array.from(rows.entries()).sort(function (a, b) { return b[0] - a[0]; }).map(function (e) {
          return e[1].sort(function (a, b) { return a.x - b.x; }).map(function (i) { return i.s.trim(); }).join(' ');
        });
        pages.push(lines.join('\\n'));
      }
      await doc.destroy();
      post({ id: req.id, ok: true, text: pages.join('\\n\\n') });
    } catch (e) {
      if (e && e.name === 'PasswordException') post({ id: req.id, ok: false, password: e.code === 2 || !!req.password ? 'wrong' : 'needed' });
      else post({ id: req.id, ok: false, error: String((e && e.message) || e) });
    }
  }
  window.kashPdf = function (req) { if (lib) run(req); else pending.push(req); };
  import('${PDFJS}/pdf.min.mjs').then(function (m) {
    m.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.mjs';
    lib = m;
    pending.splice(0).forEach(run);
  }).catch(function (e) { post({ loadError: String((e && e.message) || e) }); });
})();
</script></body></html>`;

type Reply = { id: number; ok: true; text: string } | { id: number; ok: false; password?: 'wrong' | 'needed'; error?: string };
type Waiter = { resolve: (text: string) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> };

const OFFLINE = 'Não deu pra abrir o leitor de PDF. Confira a internet e tente de novo.';

/**
 * Leitor de PDF invisível. Monte só quando houver um PDF (o leitor é baixado ao montar) e use pelo ref.
 */
export function PdfReader({ ref }: { ref: Ref<PdfReaderHandle> }) {
  const web = useRef<WebView>(null);
  const waiters = useRef(new Map<number, Waiter>());
  const nextId = useRef(1);
  /** pedidos feitos antes de a página carregar */
  const loaded = useRef(false);
  const queue = useRef<string[]>([]);

  const failAll = useCallback((message: string) => {
    for (const [id, w] of waiters.current) {
      clearTimeout(w.timer);
      w.reject(new Error(message));
      waiters.current.delete(id);
    }
  }, []);

  const request = useCallback(
    (b64: string, password: string | undefined, probe: boolean) =>
      new Promise<string>((resolve, reject) => {
        const id = nextId.current++;
        const timer = setTimeout(() => {
          waiters.current.delete(id);
          reject(new Error(OFFLINE));
        }, TIMEOUT_MS);
        waiters.current.set(id, { resolve, reject, timer });
        const script = `window.kashPdf(${JSON.stringify({ id, b64, password: password ?? null, probe })});true;`;
        if (loaded.current) web.current?.injectJavaScript(script);
        else queue.current.push(script);
      }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      extract: (b64, password) => request(b64, password, false),
      isLocked: (b64) =>
        request(b64, undefined, true).then(
          () => false,
          (err: unknown) => err instanceof PdfPasswordError,
        ),
    }),
    [request],
  );

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: Reply | { loadError: string };
    try {
      msg = JSON.parse(e.nativeEvent.data) as typeof msg;
    } catch {
      return;
    }
    if ('loadError' in msg) return failAll(OFFLINE);
    const w = waiters.current.get(msg.id);
    if (!w) return;
    waiters.current.delete(msg.id);
    clearTimeout(w.timer);
    if (msg.ok) w.resolve(msg.text);
    else if (msg.password) w.reject(new PdfPasswordError(msg.password === 'wrong'));
    else w.reject(new Error('Não conseguimos ler esse PDF. Use o OFX ou CSV do banco.'));
  };

  return (
    <View style={{ width: 0, height: 0, overflow: 'hidden' }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <WebView
        ref={web}
        source={{ html: READER_HTML, baseUrl: 'https://www.kash.app.br/' }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onLoadEnd={() => {
          loaded.current = true;
          queue.current.splice(0).forEach((script) => web.current?.injectJavaScript(script));
        }}
        onError={() => failAll(OFFLINE)}
        javaScriptEnabled
        incognito
        testID="import-pdf-reader"
      />
    </View>
  );
}
