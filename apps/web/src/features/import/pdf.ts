'use client';

/** Erro de PDF com senha: `wrong` quando a senha digitada não abriu. */
export class PdfPasswordError extends Error {
  constructor(public readonly wrong: boolean) {
    super(wrong ? 'Senha incorreta.' : 'Esse PDF tem senha.');
  }
}

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Extrai o texto de um PDF no próprio navegador (o arquivo não sai do aparelho). Junta os pedaços
 * da mesma altura numa linha, da esquerda para a direita, para manter "data · descrição · valor" juntos.
 * PDFs de banco costumam ter senha (em geral, dígitos do CPF): passe `password` depois do primeiro erro.
 */
export async function extractPdfText(file: File, password?: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, password, isEvalSupported: false }).promise;
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'PasswordException') throw new PdfPasswordError(Boolean(password));
    throw err;
  }
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; s: string }>>();
    for (const item of content.items as TextItem[]) {
      if (!item.str?.trim()) continue;
      // mesma linha: altura arredondada (tolerância de ~2pt)
      const y = Math.round(item.transform[5]! / 2);
      const list = rows.get(y) ?? [];
      list.push({ x: item.transform[4]!, s: item.str });
      rows.set(y, list);
    }
    const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, items]) => items.sort((a, b) => a.x - b.x).map((i) => i.s.trim()).join(' '));
    pages.push(lines.join('\n'));
  }
  await doc.destroy();
  return pages.join('\n\n');
}
