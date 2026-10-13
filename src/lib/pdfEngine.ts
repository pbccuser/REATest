// All document mutations run through pdf-lib, fully client-side.
// Every operation takes source bytes and returns fresh bytes, so the
// viewer can simply re-render after each edit.
import { PDFDocument, degrees } from 'pdf-lib';

export async function loadDoc(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadDoc(bytes);
  return doc.getPageCount();
}

/** Rotate a single page by a relative amount (degrees, multiple of 90). */
export async function rotatePage(bytes: Uint8Array, index: number, delta: number): Promise<Uint8Array> {
  const doc = await loadDoc(bytes);
  const page = doc.getPage(index);
  const current = page.getRotation().angle;
  page.setRotation(degrees((current + delta) % 360));
  return doc.save();
}

/** Delete a page. Refuses to delete the last remaining page. */
export async function deletePage(bytes: Uint8Array, index: number): Promise<Uint8Array> {
  const doc = await loadDoc(bytes);
  if (doc.getPageCount() <= 1) throw new Error('A document must keep at least one page.');
  doc.removePage(index);
  return doc.save();
}

/** Move a page from one position to another (reorder). */
export async function movePage(bytes: Uint8Array, from: number, to: number): Promise<Uint8Array> {
  const src = await loadDoc(bytes);
  const order = src.getPageIndices();
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** Append one or more PDFs to the end of the current document. */
export async function mergeInto(baseBytes: Uint8Array, additions: Uint8Array[]): Promise<Uint8Array> {
  const base = await loadDoc(baseBytes);
  for (const add of additions) {
    const addDoc = await loadDoc(add);
    const pages = await base.copyPages(addDoc, addDoc.getPageIndices());
    pages.forEach((p) => base.addPage(p));
  }
  return base.save();
}

/** Extract a contiguous page range (inclusive, 0-based) into a new PDF. */
export async function extractRange(bytes: Uint8Array, start: number, end: number): Promise<Uint8Array> {
  const src = await loadDoc(bytes);
  const indices: number[] = [];
  for (let i = start; i <= end; i++) indices.push(i);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
