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
 * Download an HTML element as a JPEG/PNG using html2canvas.
 */
async function elementToDataUrl(element: HTMLElement, format: 'png' | 'jpeg'): Promise<string> {
  const htmlToImage = await import('html-to-image');
  
  // Create options that explicitly capture the full scrollable area
  const options = {
    backgroundColor: '#FFFFFF',
    pixelRatio: 2,
    width: element.scrollWidth,
    height: element.scrollHeight,
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left',
      width: `${element.scrollWidth}px`,
      height: `${element.scrollHeight}px`,
    }
  };
  
  if (format === 'png') {
    return await htmlToImage.toPng(element, options);
  }
  return await htmlToImage.toJpeg(element, { ...options, quality: 0.98 });
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
