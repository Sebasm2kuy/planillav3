import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parsePdfFile = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Use a more robust loading task
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // Disable worker fetch for simpler setup if needed
      useWorkerFetch: false,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const textContent: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Defensive mapping to avoid "e is undefined" if items are unexpected
        const strings = content.items
          .map((item: any) => {
            if (item && typeof item.str === 'string') {
              return item.str;
            }
            return '';
          })
          .filter(str => str.length > 0);
          
        textContent.push(...strings);
      } catch (pageErr) {
        console.error(`Error al leer la página ${i}:`, pageErr);
        // Continuar con la siguiente página si una falla
      }
    }

    // Extract potential pallet IDs (alphanumeric strings with at least 5 digits)
    const fullText = textContent.join(' ');
    
    // Look for words that contain at least 4 digits. This covers 4-12 digit numbers,
    // as well as alphanumeric IDs like "PAL1234" or "0001234".
    const matches: string[] = [];
    const regex = /\b[A-Za-z0-9]*\d{4,}[A-Za-z0-9]*\b/g;
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      matches.push(match[0]);
    }

    const uniqueIds = matches.length > 0 ? Array.from(new Set(matches)) : [];
    console.log(`PDF parseado: ${numPages} páginas, ${uniqueIds.length} IDs encontrados.`);
    
    return uniqueIds;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`No se pudo leer el archivo PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};
