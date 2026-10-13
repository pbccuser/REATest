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

## Features (Phase 1)

- Open any PDF
- Page viewer with zoom and keyboard navigation (← / →)
- Thumbnail sidebar with click-to-jump
- Rotate a page (left / right)
- Delete a page
- Merge one or more PDFs into the current document
- Extract the current page as its own PDF
- Download the edited document

## Roadmap

- **Phase 2** — drag-to-reorder pages, annotations (highlight, draw, notes),
  form filling, add text/image.
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
- `src/App.tsx` — holds canonical document bytes; pdf.js re-renders after each
  edit. (PDF.js detaches the buffer it is given, so it always receives a copy.)

## Scope

PDForge implements the open PDF standard. It is not derived from, and does not
reverse engineer, Adobe Acrobat or any other proprietary application.
