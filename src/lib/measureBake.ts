// Bake measurements permanently into the PDF via pdf-lib.
import { rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import type { Measurement, Point } from '../types';
import type { PageScale } from './measure';
import { loadDoc } from './pdfEngine';

function hexToRgb(hex: string) {
  const n = hex.replace('#', '');
  const b = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const num = parseInt(b, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}
const fmt = (v: number) => (Math.round(v * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

export async function applyMeasurements(
  bytes: Uint8Array, measurements: Measurement[], pageScale: Record<number, PageScale>,
): Promise<Uint8Array> {
  if (measurements.length === 0) return bytes;
  const doc = await loadDoc(bytes);
  const pages = doc.getPages();
  let font: PDFFont | undefined;

  for (const m of measurements) {
    const page = pages[m.page - 1];
    if (!page) continue;
    const { width: W, height: H } = page.getSize();
    const col = hexToRgb(m.color);
    const X = (p: Point) => p.x * W;
    const Y = (p: Point) => H - p.y * H;       // flip to PDF space
    const scale = pageScale[m.page];

    const label = async (text: string, at: Point) => {
      if (!font) font = await doc.embedFont(StandardFonts.Helvetica);
      page.drawText(text, { x: X(at) + 2, y: Y(at) + 2, size: 9, font, color: rgb(0, 0, 0) });
    };

    if (m.type === 'count') {
      const c = m.points[0];
      page.drawCircle({ x: X(c), y: Y(c), size: 4, color: col, opacity: 0.9 });
    } else {
      // outline (close the loop for area)
      const pts = m.points;
      const n = pts.length;
      const last = m.type === 'area' ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        page.drawLine({ start: { x: X(a), y: Y(a) }, end: { x: X(b), y: Y(b) }, thickness: 1.5, color: col });
      }
      if (scale) {
        // compute real value in PDF points
        let lenPt = 0;
        for (let i = 1; i < n; i++) {
          const dx = (pts[i].x - pts[i - 1].x) * W, dy = (pts[i].y - pts[i - 1].y) * H;
          lenPt += Math.hypot(dx, dy);
        }
        if (m.type === 'length') {
          const mid = pts[Math.floor(n / 2)];
          await label(`${fmt(lenPt * scale.unitsPerPoint)} ${scale.unit}`, mid);
        } else {
          let areaPt = 0;
          for (let i = 0; i < n; i++) {
            const p = pts[i], q = pts[(i + 1) % n];
            areaPt += (p.x * W) * (q.y * H) - (q.x * W) * (p.y * H);
          }
          areaPt = Math.abs(areaPt) / 2;
          const cx = pts.reduce((s, p) => s + p.x, 0) / n, cy = pts.reduce((s, p) => s + p.y, 0) / n;
          const upp = scale.unitsPerPoint;
          await label(`${fmt(areaPt * upp * upp)} ${scale.unit}²`, { x: cx, y: cy });
        }
      }
    }
  }
  return doc.save();
}
