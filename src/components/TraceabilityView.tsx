import React, { useState, useMemo } from 'react';
import { StockItem, ShippingContainer, Client } from '../types';
import { motion } from 'motion/react';
import { 
  Search, 
  History, 
  Box, 
  Truck, 
  User, 
  Calendar,
  ArrowRight,
  Database,
  FileText
} from 'lucide-react';

interface TraceabilityViewProps {
  stock: StockItem[];
  containers: ShippingContainer[];
  clients: Client[];
}

export const TraceabilityView: React.FC<TraceabilityViewProps> = ({ stock, containers, clients }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const traceResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 3) return [];

    const term = searchTerm.toLowerCase();
    
    // Search in stock (current and past)
    return stock.filter(item => 
      (item.lot || '').toLowerCase().includes(term) ||
      (item.palletId || '').toLowerCase().includes(term) ||
      (item.product || '').toLowerCase().includes(term) ||
      (item.containerId || '').toLowerCase().includes(term)
    );
  }, [stock, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            Trazabilidad de Lotes
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Rastrea el historial completo de un lote o pallet específico.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Ingresa Lote, ID de Pallet o Producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-lg transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {traceResults.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <History className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500">Ingresa al menos 3 caracteres para iniciar el rastreo.</p>
          </div>
        ) : (
          traceResults.map(item => {
            const client = clients.find(c => c.id === item.clientId);
            const container = containers.find(c => c.details.some(d => d.palletId === item.palletId));
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Origin */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Database className="w-3 h-3" /> Origen / Ingreso
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.product}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1">LOTE: {item.lot}</p>
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[10px]">
                          <span className="text-slate-500">Pallet: {item.palletId}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.weight} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-slate-200" />
                    </div>

                    {/* Current Location / Container */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Truck className="w-3 h-3" /> Estado Actual
                      </div>
                      <div className={`p-4 rounded-xl border ${
                        item.status === 'DESPACHADO' 
                          ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                          : item.status === 'RESERVADO'
                          ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
                          : 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30'
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'DESPACHADO' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        {container ? (
                          <div className="mt-3">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Contenedor: {container.id}</p>
                            <p className="text-xs text-slate-500">Cargado el: {new Date(container.assemblyDate).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 mt-3 italic">En stock físico (Cámara)</p>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-slate-200" />
                    </div>

                    {/* Destination */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <User className="w-3 h-3" /> Cliente / Destino
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{client?.name || 'No asignado'}</p>
                        <p className="text-xs text-slate-500 mt-1">{client?.pais || '-'}</p>
                        {container && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-500">Orden: {container.orderId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
