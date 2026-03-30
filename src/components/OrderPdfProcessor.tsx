import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, X, Download, AlertCircle, Package, CheckCircle2 } from 'lucide-react';
import { StockItem } from '../types';
import { parsePdfFile } from '../utils/pdf';
import * as XLSX from 'xlsx';

interface OrderPdfProcessorProps {
  stock: StockItem[];
  onClose: () => void;
}

export const OrderPdfProcessor: React.FC<OrderPdfProcessorProps> = ({ stock, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    found: StockItem[];
    missing: string[];
    groupedByContainer: Record<string, StockItem[]>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let extractedIds: string[] = [];
      if (file.name.endsWith('.pdf')) {
        extractedIds = await parsePdfFile(file);
      } else {
        alert('Por favor, sube un archivo PDF.');
        return;
      }

      if (extractedIds.length === 0) {
        alert('No se encontraron números de pallet válidos en el archivo.');
        return;
      }

      const found: StockItem[] = [];
      const missing: string[] = [];
      const groupedByContainer: Record<string, StockItem[]> = {};

      extractedIds.forEach(id => {
        const item = stock.find(s => s.palletId === id);
        if (item) {
          found.push(item);
          if (!groupedByContainer[item.containerId]) {
            groupedByContainer[item.containerId] = [];
          }
          groupedByContainer[item.containerId].push(item);
        } else {
          missing.push(id);
        }
      });

      setResults({ found, missing, groupedByContainer });
    } catch (error) {
      console.error(error);
      alert('Error al procesar el archivo PDF.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = () => {
    if (!results) return;

    // Prepare data for Excel
    const excelData = results.found.map(item => ({
      'Contenedor': item.containerId,
      'Pallet': item.palletId,
      'Producto': item.product,
      'Lote': item.lot,
      'Cajas': item.boxes,
      'Kilos': item.weight,
      'Estado': item.status
    }));

    // Sort by container
    excelData.sort((a, b) => a.Contenedor.localeCompare(b.Contenedor));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pallets por Contenedor');

    // Add missing pallets sheet if any
    if (results.missing.length > 0) {
      const missingData = results.missing.map(id => ({ 'Pallet Faltante': id }));
      const wsMissing = XLSX.utils.json_to_sheet(missingData);
      XLSX.utils.book_append_sheet(wb, wsMissing, 'No Encontrados');
    }

    XLSX.writeFile(wb, `Ubicacion_Pallets_${new Date().getTime()}.xlsx`);
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sube la Orden de Embarque</h4>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
                Sube el archivo PDF de la orden. El sistema extraerá los números de pallet y buscará en qué contenedores se encuentran actualmente en stock.
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-3 text-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Procesando PDF...</span>
                ) : (
                  <>
                    <FileText className="w-6 h-6" />
                    Seleccionar PDF
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
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
                              <th className="px-4 py-2 rounded-l-lg">Pallet</th>
                              <th className="px-4 py-2">Producto</th>
                              <th className="px-4 py-2">Lote</th>
                              <th className="px-4 py-2 text-right">Cajas</th>
                              <th className="px-4 py-2 text-right rounded-r-lg">Kilos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">{item.palletId}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.product}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.lot}</td>
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
