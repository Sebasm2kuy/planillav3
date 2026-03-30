import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, X, Download, AlertCircle, Package, CheckCircle2, Search, Plus } from 'lucide-react';
import { StockItem } from '../types';
import { parsePdfFile } from '../utils/pdf';
import * as XLSX from 'xlsx';

interface OrderPdfProcessorProps {
  stock: StockItem[];
  onClose: () => void;
}

export const OrderPdfProcessor: React.FC<OrderPdfProcessorProps> = ({ stock, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [results, setResults] = useState<{
    found: StockItem[];
    missing: string[];
    groupedByContainer: Record<string, StockItem[]>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processIds = (extractedIds: string[]) => {
    if (extractedIds.length === 0) {
      alert('No se encontraron números de pallet válidos.');
      return;
    }

    const found: StockItem[] = [];
    const missing: string[] = [];
    const groupedByContainer: Record<string, StockItem[]> = {};

    extractedIds.forEach(id => {
      const cleanSearchId = id.trim().toLowerCase().replace(/^0+/, ''); // Remove leading zeros for comparison
      const strippedSearchId = cleanSearchId.replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric
      
      const item = stock.find(s => {
        const sPallet = (s.palletId || '').trim().toLowerCase();
        const sLot = (s.lot || '').trim().toLowerCase();
        
        // Exact match
        if (sPallet === id.toLowerCase() || sLot === id.toLowerCase()) return true;
        
        // Match without leading zeros
        const cleanPallet = sPallet.replace(/^0+/, '');
        const cleanLot = sLot.replace(/^0+/, '');
        if (cleanPallet === cleanSearchId || cleanLot === cleanSearchId) return true;
        
        // Partial match (e.g., if stock has "PAL-123456" and search is "123456")
        if (sPallet.includes(cleanSearchId) || sLot.includes(cleanSearchId)) return true;

        // Stripped match (e.g. "PAL-1234" vs "PAL1234")
        const strippedPallet = sPallet.replace(/[^a-z0-9]/g, '');
        const strippedLot = sLot.replace(/[^a-z0-9]/g, '');
        
        if (strippedSearchId.length >= 4) {
          if (strippedPallet === strippedSearchId || strippedLot === strippedSearchId) return true;
          if (strippedPallet.includes(strippedSearchId) || strippedLot.includes(strippedSearchId)) return true;
          
          // Reverse check: if user typed "PAL-123456" but stock is "123456"
          if (strippedPallet.length >= 4 && strippedSearchId.includes(strippedPallet)) return true;
          if (strippedLot.length >= 4 && strippedSearchId.includes(strippedLot)) return true;
        }
        
        return false;
      });

      if (item) {
        found.push(item);
        if (!groupedByContainer[item.containerId]) {
          groupedByContainer[item.containerId] = [];
        }
        // Avoid duplicates in the same container if multiple IDs match the same stock item
        if (!groupedByContainer[item.containerId].some(existing => existing.id === item.id)) {
          groupedByContainer[item.containerId].push(item);
        }
      } else {
        missing.push(id);
      }
    });

    setResults({ found, missing, groupedByContainer });
  };

  const handleManualSearch = () => {
    const ids = manualInput.split(/[\s,\n]+/).map(id => id.trim()).filter(id => id.length > 0);
    processIds(ids);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      let allExtractedIds: string[] = [];
      
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          const ids = await parsePdfFile(file);
          allExtractedIds = [...allExtractedIds, ...ids];
        } else {
          console.warn(`Archivo ignorado (no es PDF): ${file.name}`);
        }
      }

      if (allExtractedIds.length === 0) {
        alert('No se encontraron IDs válidos en los archivos subidos.');
        return;
      }

      // Remove duplicates across multiple PDFs
      const uniqueIds = Array.from(new Set(allExtractedIds));
      processIds(uniqueIds);
    } catch (error) {
      console.error(error);
      alert('Error al procesar los archivos PDF.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = () => {
    if (!results) return;

    const aoaData: any[][] = [];
    
    // Title
    aoaData.push(['PLANILLA DE CARGA', '', '', '', '', '']);
    aoaData.push([]);
    
    // Headers
    aoaData.push(['Contenedor', 'Cant.', 'Bultos', 'Peso', 'Descripción', 'Pallet ID']);
    
    // Sort containers alphabetically
    const sortedContainers = Object.keys(results.groupedByContainer).sort();
    
    sortedContainers.forEach((containerId, index) => {
      const items = results.groupedByContainer[containerId];
      items.forEach(item => {
        aoaData.push([
          containerId,
          1, // Cant.
          item.boxes,
          item.weight,
          item.product,
          item.lot || item.palletId
        ]);
      });
      
      // Add empty row after each container group
      if (index < sortedContainers.length - 1) {
        aoaData.push([]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    
    // Merge title cells (Row 0, Col 0 to Col 5)
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    
    // Column widths
    ws['!cols'] = [
      { wch: 18 }, // Contenedor
      { wch: 6 },  // Cant.
      { wch: 8 },  // Bultos
      { wch: 8 },  // Peso
      { wch: 60 }, // Descripción
      { wch: 15 }  // Pallet ID
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Planilla de Carga');

    // Add missing pallets sheet if any
    if (results.missing.length > 0) {
      const missingData = results.missing.map(id => ({ 'Pallet Faltante': id }));
      const wsMissing = XLSX.utils.json_to_sheet(missingData);
      XLSX.utils.book_append_sheet(wb, wsMissing, 'No Encontrados');
    }

    XLSX.writeFile(wb, `Planilla_de_Carga_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Procesar Orden PDF
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!results ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-full max-w-2xl bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-500" />
                  Búsqueda Manual
                </h4>
                <div className="flex gap-3">
                  <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Ingresa números de pallet separados por espacio o coma..."
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all font-mono text-sm min-h-[50px] max-h-32 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleManualSearch}
                    disabled={!manualInput.trim()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Buscar
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full max-w-2xl mb-8">
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                <span className="text-slate-400 dark:text-slate-500 font-medium text-sm uppercase tracking-wider">O subir archivo</span>
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                  <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sube las Órdenes de Embarque</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
                  Sube uno o múltiples archivos PDF. El sistema extraerá los números de pallet y buscará en qué contenedores se encuentran actualmente en stock.
                </p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-3 text-lg disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Procesando PDFs...</span>
                  ) : (
                    <>
                      <FileText className="w-6 h-6" />
                      Seleccionar PDFs
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setResults(null)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm flex items-center gap-1"
                >
                  ← Volver a buscar
                </button>
              </div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100">Encontrados</h4>
                  </div>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{results.found.length}</p>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100">Contenedores</h4>
                  </div>
                  <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{Object.keys(results.groupedByContainer).length}</p>
                </div>

                <div className={`p-4 rounded-2xl border ${results.missing.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className={`w-5 h-5 ${results.missing.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`} />
                    <h4 className={`font-bold ${results.missing.length > 0 ? 'text-red-900 dark:text-red-100' : 'text-slate-700 dark:text-slate-300'}`}>No Encontrados</h4>
                  </div>
                  <p className={`text-3xl font-black ${results.missing.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-400'}`}>{results.missing.length}</p>
                </div>
              </div>

              {/* Missing Pallets Warning */}
              {results.missing.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                  <h4 className="font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Pallets no encontrados en stock ({results.missing.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {results.missing.map(id => (
                      <span key={id} className="px-2 py-1 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-800/30 rounded text-sm font-mono text-red-600 dark:text-red-400">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Results by Container */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">Ubicación de Pallets</h4>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Excel
                  </button>
                </div>

                {Object.entries(results.groupedByContainer).map(([containerId, items]) => (
                  <div key={containerId} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-500" />
                        Contenedor: {containerId}
                      </h5>
                      <span className="text-sm font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">
                        {items.length} pallets
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                              <th className="px-4 py-2 rounded-l-lg">Lote / Pallet</th>
                              <th className="px-4 py-2">Producto</th>
                              <th className="px-4 py-2 text-right">Cajas</th>
                              <th className="px-4 py-2 text-right rounded-r-lg">Kilos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">{item.lot || item.palletId}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.product}</td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{item.boxes}</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{item.weight.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
