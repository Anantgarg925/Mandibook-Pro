import { Platform } from 'react-native';

/**
 * Print HTML on web using an invisible iframe instead of window.open().
 * This avoids popup blockers on mobile browsers (Chrome Android, etc.).
 */
export async function printHtmlOnWeb(html: string, title: string): Promise<void> {
  if (Platform.OS !== 'web') return;

  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`);
  iframeDoc.close();

  // Wait for content to load
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Print failed, falling back to download', e);
        // Fallback: download as HTML file
        downloadHtmlFile(html, title);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
        resolve();
      }, 500);
    }, 300);
  });
}

/**
 * Fallback: Download HTML as a file that can be opened and printed manually
 */
function downloadHtmlFile(html: string, title: string): void {
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Download an HTML element as a JPEG using html2canvas-style approach.
 * Uses canvas API to render DOM to image.
 */
async function elementToDataUrl(element: HTMLElement, format: 'png' | 'jpeg'): Promise<string> {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.position = 'relative';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;">
          ${clone.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = url;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.98);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadElementAsJpeg(element: HTMLElement, filename: string): Promise<void> {
  if (Platform.OS !== 'web') return;

  const dataUrl = await elementToDataUrl(element, 'jpeg');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadTestIdAsJpeg(testId: string, filename: string): Promise<void> {
  if (Platform.OS !== 'web') return;
  const element = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  if (!element) throw new Error(`Could not find element ${testId}`);
  await downloadElementAsJpeg(element, filename);
}
