const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 12;
const PDF_CONTENT_WIDTH_MM = A4_WIDTH_MM - PDF_MARGIN_MM * 2;
const PDF_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - PDF_MARGIN_MM * 2;

function sanitizeFilenamePart(value, fallback = 'document') {
  return String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cloneForPdf(sourceNode) {
  const clone = sourceNode.cloneNode(true);
  const width = sourceNode.scrollWidth || sourceNode.getBoundingClientRect().width;

  clone.style.position = 'absolute';
  clone.style.left = '-10000px';
  clone.style.top = '0';
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.background = 'white';

  document.body.appendChild(clone);
  return clone;
}

export async function waitForDocumentReady() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await document.fonts?.ready;
}

export async function printElement(element) {
  if (!element || typeof window === 'undefined') return;

  await waitForDocumentReady();
  window.print();
}

export function createPdfFilename(prefix, value) {
  return `${prefix}-${sanitizeFilenamePart(value)}.pdf`;
}

export async function exportElementToPdf(element, filename) {
  if (!element || typeof window === 'undefined') {
    throw new Error('Printable content is not available.');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
    waitForDocumentReady(),
  ]);

  const clonedElement = cloneForPdf(element);

  try {
    const canvas = await html2canvas(clonedElement, {
      backgroundColor: '#ffffff',
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: clonedElement.scrollWidth,
      windowHeight: clonedElement.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgWidth = PDF_CONTENT_WIDTH_MM;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageCanvas = document.createElement('canvas');
    const pageContext = pageCanvas.getContext('2d');
    const pageHeightPx = Math.floor((PDF_CONTENT_HEIGHT_MM * canvas.width) / PDF_CONTENT_WIDTH_MM);

    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx;

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);
      pageCanvas.height = sliceHeight;
      pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (pageIndex > 0) pdf.addPage();

      const sliceHeightMm = Math.min(
        PDF_CONTENT_HEIGHT_MM,
        imgHeight - pageIndex * PDF_CONTENT_HEIGHT_MM
      );
      pdf.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        PDF_MARGIN_MM,
        PDF_MARGIN_MM,
        imgWidth,
        sliceHeightMm,
        undefined,
        'FAST'
      );

      renderedHeight += sliceHeight;
      pageIndex += 1;
    }

    pdf.save(filename);
  } finally {
    clonedElement.remove();
  }
}
