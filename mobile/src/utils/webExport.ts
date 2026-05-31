import { Platform } from 'react-native';

function openHiddenWindow(title: string, html: string): Window | null {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!win) return null;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`);
  win.document.close();
  return win;
}

export async function printHtmlOnWeb(html: string, title: string): Promise<void> {
  if (Platform.OS !== 'web') return;

  const win = openHiddenWindow(title, html);
  if (!win) throw new Error('Popup blocked by the browser');

  await new Promise<void>((resolve, reject) => {
    const timer = window.setInterval(() => {
      if (win.document.readyState === 'complete') {
        window.clearInterval(timer);
        win.focus();
        win.print();
        window.setTimeout(() => {
          win.close();
          resolve();
        }, 250);
      }
    }, 50);

    window.setTimeout(() => {
      window.clearInterval(timer);
      if (!win.closed) {
        reject(new Error('Timed out opening print window'));
      }
    }, 4000);
  });
}

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
