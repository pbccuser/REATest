// Insert Image / Signature feature — pure document logic (pdf-lib).
//
// Geometry is stored NORMALIZED (0..1, top-left origin) relative to the page,
// matching the app-wide overlay convention (see AnnotationLayer.tsx). pdf-lib
// draws from a BOTTOM-left origin, so y is flipped when baking (see stampImage).
import { loadDoc } from '../../lib/pdfEngine';

/** A normalized placement of the chosen image on a 1-based page. */
export interface Placement {
  page: number; // 1-based page number
  x: number;    // 0..1, left edge (top-left origin)
  y: number;    // 0..1, top edge  (top-left origin)
  w: number;    // 0..1, width relative to page width
  h: number;    // 0..1, height relative to page height
}

/**
 * Embed the given image once and draw it at each placement, flipping the y
 * axis from the overlay's top-left origin to the PDF's bottom-left origin.
 * Returns fresh document bytes, like the other pdfEngine mutations.
 */
export async function stampImage(
  pdfBytes: Uint8Array,
  imageBytes: Uint8Array,
  isPng: boolean,
  placements: Placement[],
): Promise<Uint8Array> {
  const doc = await loadDoc(pdfBytes);
  const img = isPng ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
  const pages = doc.getPages();

  for (const pl of placements) {
    const page = pages[pl.page - 1];
    if (!page) continue;
    const { width: W, height: H } = page.getSize();
    const w = pl.w * W;
    const h = pl.h * H;
    page.drawImage(img, {
      x: pl.x * W,
      y: H - (pl.y + pl.h) * H, // flip top-left origin to bottom-left
      width: w,
      height: h,
    });
  }

  return doc.save();
}

/**
 * Read a picked image file into both the bytes used to embed it and a data URL
 * used to preview it in the overlay. isPng is derived from the MIME type.
 */
export function readImageFile(
  file: File,
): Promise<{ bytes: Uint8Array; isPng: boolean; dataUrl: string }> {
  const isPng = file.type === 'image/png';

  const bytes = new Promise<Uint8Array>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });

  const dataUrl = new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  return Promise.all([bytes, dataUrl]).then(([b, url]) => ({ bytes: b, isPng, dataUrl: url }));
}
