// Bake in-memory annotations permanently into the PDF via pdf-lib.
import { rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import type { Annotation } from '../types';
import { loadDoc } from './pdfEngine';

function hexToRgb(hex: string) {
  const n = hex.replace('#', '');
  const b = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const num = parseInt(b, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

export async function applyAnnotations(bytes: Uint8Array, anns: Annotation[]): Promise<Uint8Array> {
  if (anns.length === 0) return bytes;
  const doc = await loadDoc(bytes);
  const pages = doc.getPages();
  let font: PDFFont | undefined;

  for (const a of anns) {
    const page = pages[a.page - 1];
    if (!page) continue;
    const { width: W, height: H } = page.getSize();
    const col = hexToRgb(a.color);

    if (a.type === 'highlight' && a.w != null) {
      page.drawRectangle({
        x: a.x! * W, y: H - (a.y! + a.h!) * H, width: a.w * W, height: a.h! * H,
        color: col, opacity: 0.35,
      });
    } else if (a.type === 'rect' && a.w != null) {
      page.drawRectangle({
        x: a.x! * W, y: H - (a.y! + a.h!) * H, width: a.w * W, height: a.h! * H,
        borderColor: col, borderWidth: a.width ?? 2,
      });
    } else if (a.type === 'pen' && a.points && a.points.length > 1) {
      for (let i = 1; i < a.points.length; i++) {
        const p0 = a.points[i - 1], p1 = a.points[i];
        page.drawLine({
          start: { x: p0.x * W, y: H - p0.y * H },
          end: { x: p1.x * W, y: H - p1.y * H },
          thickness: a.width ?? 2, color: col,
        });
      }
    } else if (a.type === 'text' && a.text) {
      if (!font) font = await doc.embedFont(StandardFonts.Helvetica);
      const size = a.fontSize ?? 14;
      page.drawText(a.text, {
        x: a.x! * W, y: H - a.y! * H - size, size, font, color: col, lineHeight: size * 1.2,
      });
    }
  }
  return doc.save();
}
