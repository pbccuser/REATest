# PDForge

An in-browser PDF editor — an open-standard alternative to Adobe Acrobat.
Everything runs **client-side**: files never leave the browser, and there is
no server to upload to.

PDF is a published ISO standard (ISO 32000), so PDForge is built on that spec
and a mature open-source stack rather than on any single vendor's application.

## Stack

| Concern | Library |
|---|---|
| Render / view pages | [PDF.js](https://mozilla.github.io/pdf.js/) |
| Create / edit / manipulate | [pdf-lib](https://pdf-lib.js.org/) |
| App shell | React + Vite + TypeScript |

## Features

**Phase 1 — view & pages**
- Open any PDF
- Page viewer with zoom and keyboard navigation (← / →)
- Thumbnail sidebar with click-to-jump
- Rotate, delete, merge, and extract pages
- Download the edited document

**Phase 2 — annotations & markup**
- Highlight, freehand pen, rectangle, and text notes
- Per-tool color swatches (+ custom color) and stroke width
- Select an annotation and delete it (Del); Undo; Clear page
- Markup is flattened into the PDF on download (and before structural
  edits, so it stays attached to the right pages)

**Phase 4 — Acrobat/Bluebeam feature set** (built in parallel, then combined)
- **Markups List** — exportable table (CSV) of every annotation
- **Tool Chest** — save & reuse markup presets (color/stroke/tool), stored locally
- **Form filling** — detect AcroForm fields, fill them, optionally flatten
- **Insert image / signature** — place a PNG/JPG on a page and bake it in

## Roadmap

- **Phase 2 (done)** — annotations: highlight, pen, rectangle, text notes.
- **Next** — drag-to-reorder pages, form filling, insert image.
- **Phase 3** — OCR (Tesseract.js), redaction, digital signatures, PDF/A,
  document compare, split-by-range UI.
- **Fidelity track** — optional MuPDF/PDFium WASM backend for Acrobat-grade
  rendering and conversion.

## Develop

```bash
npm install
npm run dev        # start the dev server
npm run build      # production build
npm run typecheck  # type-check only
```

## Design notes

- `src/lib/pdfEngine.ts` — all document mutations (pure: bytes in, bytes out).
- `src/pdfjs.ts` — central PDF.js worker setup.
- `src/features/*` — self-contained features (markupsList, toolChest, forms, stamp).
- `src/App.tsx` — holds canonical document bytes; pdf.js re-renders after each
  edit. (PDF.js detaches the buffer it is given, so it always receives a copy.)

## Scope

PDForge implements the open PDF standard. It is not derived from, and does not
reverse engineer, Adobe Acrobat or any other proprietary application.
