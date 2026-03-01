import * as fs from 'fs';
import * as path from 'path';

let puppeteer: typeof import('puppeteer') | null = null;

async function getPuppeteer(): Promise<typeof import('puppeteer')> {
  if (puppeteer) return puppeteer;
  puppeteer = await import('puppeteer');
  return puppeteer;
}

export interface RenderResult {
  success: boolean;
  filePath: string;
  fileSizeBytes: number;
  error?: string;
}

export class PDFRenderer {
  async renderToPDF(
    htmlContent: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<RenderResult> {
    try {
      onProgress?.(10);
      const pptr = await getPuppeteer();
      const browser = await pptr.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      onProgress?.(20);
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      onProgress?.(60);
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '2.5cm', bottom: '2.5cm', left: '2.5cm', right: '2.5cm' },
        displayHeaderFooter: false,
      });
      onProgress?.(90);
      await browser.close();
      const stats = fs.statSync(outputPath);
      onProgress?.(100);
      return { success: true, filePath: outputPath, fileSizeBytes: stats.size };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, filePath: '', fileSizeBytes: 0, error: message };
    }
  }
}

export const pdfRenderer = new PDFRenderer();
