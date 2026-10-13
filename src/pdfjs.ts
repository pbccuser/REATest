// Central pdf.js setup.
// The worker is imported as an *inline* worker (bundled as a blob), so the app
// has no external worker file to fetch. This is what lets a single-file build
// run straight from the filesystem (file://) with no server.
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export { pdfjsLib };
