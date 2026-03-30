import * as XLSX from 'xlsx';
import { PalletData, StockItem, StockStatus, Client } from '../types';

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Error de lectura: Archivo vacío o ilegible.");
        }
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("El archivo Excel no contiene hojas de cálculo.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
           throw new Error(`No se pudo leer la hoja "${sheetName}".`);
        }

        // Use header: 1 to get array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(jsonData);
      } catch (error: any) {
        console.error("Excel parsing error:", error);
        reject(new Error(error.message || "Error al analizar el archivo Excel."));
      }
    };
    reader.onerror = () => reject(new Error("Error de lectura de archivo."));
    reader.readAsArrayBuffer(file);
  });
};

const COLUMN_DICTIONARY = {
  client: ["cliente", "customer", "client", "empresa"],
  product: ["producto", "product", "item", "descripcion", "mercader"],
  lot: ["lote", "lot", "batch"],
  container: ["contenedor", "container", "cont", "equipo"],
  pallet: ["pallet", "palet", "plt", "id", "bulto"],
  boxes: ["cajas", "boxes", "cartons", "bultos", "unid"],
  weight: ["kilos", "kg", "peso", "weight", "neto"],
  status: ["estado", "status", "state"]
};

function detectColumn(headers: any[], possibilities: string[]): number {
  return headers.findIndex(header => {
    if (header === undefined || header === null) return false;
    const h = String(header).toLowerCase().trim();
    return possibilities.some(p => h.includes(p));
  });
}

export const mapDataToStock = (data: any[], existingClients: Client[]): { stock: StockItem[], newClients: Client[] } => {
  // Normalize data: if a row is a single string with semicolons, split it
  const normalizedData = data.map(row => {
    if (Array.isArray(row) && row.length === 1 && typeof row[0] === 'string' && row[0].includes(';')) {
      return row[0].split(';');
    }
    if (Array.isArray(row)) {
      return row.map(cell => typeof cell === 'string' ? cell.replace(/;$/, '').trim() : cell);
    }
    return row;
  });

  const stock: StockItem[] = [];
  const newClients: Client[] = [];
  const allClients = [...existingClients];
  
  let currentClient: Client | null = null;
  let colMap = {
    client: -1,
    container: -1,
    pallet: -1,
    product: -1,
    lot: -1,
    boxes: -1,
    weight: -1,
    status: -1
  };

  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      let clean = val.replace(/[^\d.,-]/g, '');
      if (clean.includes('.') && clean.includes(',')) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
          clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
          clean = clean.replace(/,/g, '');
        }
      } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      }
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  for (let i = 0; i < normalizedData.length; i++) {
    const row = normalizedData[i];
    if (!Array.isArray(row)) continue;

    const firstCell = String(row[0] || '').toLowerCase().trim();

    // 1. DETECT CLIENT ROW (Grouped format)
    if (firstCell.includes('cliente')) {
      const clientName = String(row[2] || row[1] || '').trim();
      if (clientName) {
        let client = allClients.find(c => c && c.name && c.name.trim().toLowerCase() === clientName.toLowerCase());
        if (!client) {
          client = {
            id: String(row[1] || crypto.randomUUID()),
            name: clientName,
            country: '',
            operationType: 'Importación',
            observations: 'Creado automáticamente (Formato Grupal)'
          };
          newClients.push(client);
          allClients.push(client);
        }
        currentClient = client;
        continue; // Skip to next row
      }
    }

    // 2. DETECT HEADER ROW (To update colMap)
    const headers = row.map(cell => String(cell || '').toLowerCase().trim());
    const clientIdx = detectColumn(headers, COLUMN_DICTIONARY.client);
    const containerIdx = detectColumn(headers, COLUMN_DICTIONARY.container);

    if (containerIdx !== -1 && (clientIdx !== -1 || currentClient)) {
      colMap.client = clientIdx;
      colMap.container = containerIdx;
      colMap.pallet = detectColumn(headers, COLUMN_DICTIONARY.pallet);
      colMap.product = detectColumn(headers, COLUMN_DICTIONARY.product);
      colMap.lot = detectColumn(headers, COLUMN_DICTIONARY.lot);
      colMap.boxes = detectColumn(headers, COLUMN_DICTIONARY.boxes);
      colMap.weight = detectColumn(headers, COLUMN_DICTIONARY.weight);
      colMap.status = detectColumn(headers, COLUMN_DICTIONARY.status);
      continue; // Skip header row
    }

    // 3. PROCESS DATA ROW
    if (colMap.container === -1) continue; // No headers found yet

    const containerId = String(row[colMap.container] || '').trim();
    const palletId = String(row[colMap.pallet] || '').trim();
    
    // Skip invalid data rows
    if (!containerId || !palletId || containerId.toLowerCase().includes('total')) continue;

    // Determine client for this row
    let rowClient = currentClient;
    if (colMap.client !== -1) {
      const clientName = String(row[colMap.client] || '').trim();
      if (clientName) {
        let client = allClients.find(c => c && c.name && c.name.trim().toLowerCase() === clientName.toLowerCase());
        if (!client) {
          client = {
            id: crypto.randomUUID(),
            name: clientName,
            country: '',
            operationType: 'Importación',
            observations: 'Creado automáticamente (Formato Plano)'
          };
          newClients.push(client);
          allClients.push(client);
        }
        rowClient = client;
      }
    }

    if (!rowClient) continue;

    const rawStatus = String(row[colMap.status] || '').toUpperCase();
    let status: StockStatus = 'EN_CAMARA';
    if (rawStatus.includes('RESERVADO')) status = 'RESERVADO';
    else if (rawStatus.includes('DESPACHADO')) status = 'DESPACHADO';

    stock.push({
      id: crypto.randomUUID(),
      clientId: rowClient.id,
      containerId,
      palletId,
      product: String(row[colMap.product] || '').trim(),
      lot: String(row[colMap.lot] || '').trim(),
      boxes: parseNumber(row[colMap.boxes]),
      weight: parseNumber(row[colMap.weight]),
      status,
      timestamp: Date.now()
    });
  }

  return { stock, newClients };
};

export const mapDataToPallets = (data: any[]): PalletData[] => {
  // Normalize data: if a row is a single string with semicolons, split it
  const normalizedData = data.map(row => {
    if (Array.isArray(row) && row.length === 1 && typeof row[0] === 'string' && row[0].includes(';')) {
      return row[0].split(';');
    }
    if (Array.isArray(row)) {
      return row.map(cell => typeof cell === 'string' ? cell.replace(/;$/, '').trim() : cell);
    }
    return row;
  });

  const pallets: PalletData[] = [];
  
  // Smart Detection of Columns
  let headerRowIndex = -1;
  let colMap = {
    container: -1,
    pallet: -1,
    quantity: -1,
    boxes: -1,
    weight: -1,
    description: -1
  };

  // 1. Find the header row
  for (let i = 0; i < Math.min(normalizedData.length, 50); i++) {
    const row = normalizedData[i];
    if (!Array.isArray(row)) continue;
    
    const rowStr = Array.from(row).map(cell => String(cell || '').toLowerCase().replace(/;/g, '').trim());
    
    const containerIdx = rowStr.findIndex(s => s.includes('contenedor'));
    const loteIdx = rowStr.findIndex(s => s.includes('lote') || s.includes('nro lote') || s.includes('pallet id'));
    
    if (containerIdx !== -1 && loteIdx !== -1) {
      headerRowIndex = i;
      colMap.container = containerIdx;
      colMap.pallet = loteIdx;
      
      colMap.quantity = rowStr.findIndex(s => s === 'pallets' || s.includes('cant'));
      colMap.boxes = rowStr.findIndex(s => s.includes('cajas') || s.includes('bultos'));
      colMap.weight = rowStr.findIndex(s => s.includes('kilos') || s.includes('peso') || s.includes('kg'));
      colMap.description = rowStr.findIndex(s => s.includes('contenido') || s.includes('descrip') || s.includes('producto'));
      
      break;
    }
  }

  // Fallback if smart detection failed: use hardcoded indices from latest screenshot
  if (headerRowIndex === -1) {
    console.warn("Could not detect headers automatically. Using fallback indices.");
    // Fallback based on user screenshot: C=2, D=3, E=4, F=5, G=6, H=7
    colMap = {
      container: 2,
      quantity: 3,
      boxes: 4,
      weight: 5,
      description: 6,
      pallet: 7
    };
    headerRowIndex = 0; // Start checking from row 0, but logic below skips invalid rows anyway
  }

  // Helper to parse numbers
  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Clean string: remove "kg", currency symbols, etc.
      let clean = val.replace(/[^\d.,-]/g, '');
      
      // Handle 1.234,56 vs 1,234.56
      // If contains both . and , -> assume last one is decimal separator
      // If only , -> assume decimal
      // If only . -> assume decimal (unless it looks like thousands?)
      
      // Heuristic for Spanish/European format (common in screenshots): 1.000,00
      if (clean.includes('.') && clean.includes(',')) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
          // 1.234,56 -> remove dots, replace comma with dot
          clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
          // 1,234.56 -> remove commas
          clean = clean.replace(/,/g, '');
        }
      } else if (clean.includes(',')) {
        // 1234,56 -> replace comma with dot
        clean = clean.replace(',', '.');
      }
      
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  // Process rows starting after header
  const startRow = headerRowIndex === -1 ? 0 : headerRowIndex + 1;

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    // Get values using mapped indices
    const containerId = String(row[colMap.container] || '').trim();
    const palletId = String(row[colMap.pallet] || '').trim();

    // Skip invalid rows
    if (
      !containerId || 
      !palletId || 
      containerId.toLowerCase().includes('contenedor') || 
      containerId.toLowerCase().includes('totales') ||
      palletId.toLowerCase().includes('lote') ||
      palletId.length < 3 // Pallet IDs are usually longer
    ) {
      continue;
    }

    // Extract other values (use 0/empty if index not found)
    const quantity = colMap.quantity !== -1 ? parseNumber(row[colMap.quantity]) : 0;
    const boxes = colMap.boxes !== -1 ? parseNumber(row[colMap.boxes]) : 0;
    const weight = colMap.weight !== -1 ? parseNumber(row[colMap.weight]) : 0;
    const description = colMap.description !== -1 ? String(row[colMap.description] || '').trim() : '';

    pallets.push({
      containerId,
      quantity,
      boxes,
      weight,
      description,
      palletId,
      originalRow: i + 1,
    });
  }

  return pallets;
};
