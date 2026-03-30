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

    // Extract potential pallet IDs (6-7 digit numbers)
    const fullText = textContent.join(' ');
    
    // Look for numbers that are exactly 6 or 7 digits long.
    // We use a regex that ensures the number is not part of a longer sequence of digits
    // (e.g., avoiding extracting 7 digits out of a 10-digit phone number).
    const matches: string[] = [];
    const regex = /(?:^|[^\d])(\d{6,7})(?=[^\d]|$)/g;
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      matches.push(match[1]);
    }

    const uniqueIds = matches.length > 0 ? Array.from(new Set(matches)) : [];
    console.log(`PDF parseado: ${numPages} páginas, ${uniqueIds.length} IDs encontrados.`);
    
    return uniqueIds;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`No se pudo leer el archivo PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};
