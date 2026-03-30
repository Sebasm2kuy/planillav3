import React, { useState, useRef } from 'react';
import { Search, X, Plus, FileText, Upload, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { parsePdfFile } from '../utils/pdf';

interface PalletSearchProps {
  onSearch: (palletIds: string[]) => void;
  onClear: () => void;
  currentIds: string[];
  validIds: string[];
}

export const PalletSearch: React.FC<PalletSearchProps> = ({ onSearch, onClear, currentIds, validIds }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [missingAlert, setMissingAlert] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    // Support pasting multiple IDs separated by comma, space, or newline
    const ids = input.split(/[\s,\n]+/).map(id => id.trim()).filter(id => id.length > 0);
    
    if (ids.length > 0) {
      const missing = ids.filter(id => !validIds.includes(id));
      if (missing.length > 0) {
        setMissingAlert(missing);
      }

      // Add to existing list, avoid duplicates
      const newIds = Array.from(new Set([...currentIds, ...ids]));
      onSearch(newIds);
      setInput('');
    }
  };

  const handleRemove = (idToRemove: string) => {
    const newIds = currentIds.filter(id => id !== idToRemove);
    onSearch(newIds);
  };

  const handleClearAll = () => {
    if (window.confirm('¿Estás seguro de borrar toda la lista de búsqueda?')) {
      onClear();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let newIds: string[] = [];

      if (file.name.endsWith('.pdf')) {
        newIds = await parsePdfFile(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Flatten all cells and find numbers
        const allValues = jsonData.flat();
        newIds = allValues
          .map(val => String(val).trim())
          .filter(val => /^\d{6,7}$/.test(val)); // Basic validation for 6-7 digit numbers
      }

      if (newIds.length > 0) {
        // Merge with existing, remove duplicates
        const uniqueIds = Array.from(new Set([...currentIds, ...newIds]));
        onSearch(uniqueIds);
        alert(`Se importaron ${newIds.length} pallets.`);
      } else {
        alert('No se encontraron números de pallet válidos (6-7 dígitos) en el archivo.');
      }
    } catch (error) {
      console.error(error);
      alert('Error al procesar el archivo.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8"
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Input & Actions */}
        <div className="flex-1 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Buscar Pallets
          </h3>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Ingresa uno o varios números (separados por espacio o coma)..."
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition-all font-mono text-sm min-h-[42px] max-h-32 resize-none"
                rows={1}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 h-[42px]"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">O importa una lista desde archivo:</p>
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .pdf"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Procesando...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Excel / PDF
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              El sistema extraerá automáticamente todos los números de 6-7 dígitos (Número de Lote) del archivo PDF o Excel.
            </p>
          </div>
        </div>

        {/* Right: Current List */}
        <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col max-h-80">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm">Lista de Búsqueda ({currentIds.length})</h4>
            {currentIds.length > 0 && (
              <div className="flex gap-3">
                {currentIds.some(id => !validIds.includes(id)) && (
                  <button
                    onClick={() => {
                      const onlyValid = currentIds.filter(id => validIds.includes(id));
                      onSearch(onlyValid);
                    }}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                  >
                    Borrar No Encontrados
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                  title="Borrar absolutamente todos los pallets de la lista"
                >
                  Borrar Todo
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            <AnimatePresence initial={false}>
              {currentIds.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-600 text-center py-8">
                  La lista está vacía.
                </p>
              ) : (
                [...currentIds].reverse().map((id) => {
                  const isValid = validIds.includes(id);
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex justify-between items-center px-3 py-2 rounded border shadow-sm group ${
                        isValid ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
                      }`}
                    >
                      <span className={`font-mono text-sm ${isValid ? 'text-slate-700 dark:text-slate-300' : 'text-red-700 dark:text-red-400 font-medium'}`}>
                        {id}
                        {!isValid && <span className="ml-2 text-[10px] text-red-500 dark:text-red-400 uppercase tracking-wider">(No encontrado)</span>}
                      </span>
                      <button
                        onClick={() => handleRemove(id)}
                        className={`${isValid ? 'text-slate-300 dark:text-slate-700' : 'text-red-300 dark:text-red-700'} hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Missing Pallets Modal */}
      <AnimatePresence>
        {missingAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
                  Pallets no encontrados
                </h3>
                <p className="text-center text-slate-600 dark:text-slate-400 mb-4">
                  Los siguientes pallets que ingresaste no existen en la planilla maestra:
                </p>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg max-h-32 overflow-y-auto mb-6 flex flex-wrap gap-2 justify-center border border-slate-200 dark:border-slate-700">
                  {missingAlert.map(id => (
                    <span key={id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-sm font-mono text-slate-700 dark:text-slate-300">
                      {id}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setMissingAlert(null)}
                  className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Entendido, continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
