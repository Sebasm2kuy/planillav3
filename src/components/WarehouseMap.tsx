import React, { useState, useMemo } from 'react';
import { StoragePosition, ShippingContainer, Client, Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Grid3X3, 
  Info, 
  Maximize2, 
  Minimize2, 
  Search,
  Box,
  User,
  MapPin,
  ArrowRightLeft,
  X,
  Trash2,
  Plus
} from 'lucide-react';

interface WarehouseMapProps {
  containers: ShippingContainer[];
  clients: Client[];
  orders: Order[];
  onUpdateContainers: (newContainers: ShippingContainer[]) => void;
}

export const WarehouseMap: React.FC<WarehouseMapProps> = ({ 
  containers, 
  clients, 
  orders,
  onUpdateContainers 
}) => {
  const [zoom, setZoom] = useState(1);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Define Grid: 20 rows (A-T) x 25 columns (1-25) = 500 positions
  const rows = useMemo(() => "ABCDEFGHIJKLMNOPQRST".split(""), []);
  const cols = useMemo(() => Array.from({ length: 25 }, (_, i) => i + 1), []);

  const containerMap = useMemo(() => {
    const map: Record<string, ShippingContainer> = {};
    containers.forEach(c => {
      if (c.positionId) map[c.positionId] = c;
    });
    return map;
  }, [containers]);

  const getPositionStatus = (container?: ShippingContainer) => {
    if (!container) return 'empty';
    
    const order = orders.find(o => o.id === container.orderId);
    
    if (container.status === 'despachado') return 'dispatched';
    if (container.status === 'preparado') return 'ready'; // Red
    if (order?.status === 'en_preparacion') return 'reserved'; // Yellow
    return 'available'; // Green
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-[#ff7b00] border-[#e66e00] shadow-orange-200'; // Ocupado / Listo
      case 'reserved': return 'bg-[#ffe600] border-[#e6cf00] shadow-yellow-200 text-slate-900'; // Reservado
      case 'available': return 'bg-[#ff7b00] border-[#e66e00] shadow-orange-200'; // Ocupado con stock
      case 'empty': return 'bg-[#00a651] border-[#008c44] shadow-emerald-200'; // Libre
      default: return 'bg-slate-200';
    }
  };

  const handleAssignPosition = (posId: string, containerId: string) => {
    const updated = containers.map(c => {
      if (c.id === containerId) return { ...c, positionId: posId };
      // If another container was in this position, unassign it
      if (c.positionId === posId) return { ...c, positionId: undefined };
      return c;
    });
    onUpdateContainers(updated);
    setSelectedPosition(null);
  };

  const unassignedContainers = useMemo(() => {
    return containers.filter(c => !c.positionId && c.status !== 'despachado');
  }, [containers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-indigo-600" />
            Mapa de Cámara Frigorífica
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visualización en tiempo real de la ubicación física de los contenedores.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#00a651]" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Libre (Disponible)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#ffe600]" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Reservado (En Preparación)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#ff7b00]" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Ocupado (Con Contenedor)</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 overflow-auto min-h-[600px] relative">
        <div 
          className="inline-grid gap-2" 
          style={{ 
            gridTemplateColumns: `40px repeat(${cols.length}, minmax(60px, 1fr))`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-out'
          }}
        >
          {/* Header Row (Numbers) */}
          <div />
          {cols.map(c => (
            <div key={c} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2">
              {c}
            </div>
          ))}

          {/* Data Rows */}
          {rows.map(row => (
            <React.Fragment key={row}>
              <div className="flex items-center justify-center text-sm font-bold text-slate-400 pr-4">
                {row}
              </div>
              {cols.map(col => {
                const posId = `${row}-${col}`;
                const container = containerMap[posId];
                const status = getPositionStatus(container);
                const client = container ? clients.find(c => c.id === container.clientId) : null;
                const isSelected = selectedPosition === posId;

                return (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={posId}
                    onClick={() => setSelectedPosition(posId)}
                    className={`
                      relative h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center p-1 overflow-hidden
                      ${getStatusColor(status)}
                      ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 z-10' : ''}
                    `}
                  >
                    {container ? (
                      <>
                        <span className={`text-[10px] font-black leading-tight truncate w-full text-center ${status === 'reserved' ? 'text-slate-900' : 'text-white'}`}>
                          {container.id}
                        </span>
                        <span className={`text-[8px] font-bold truncate w-full text-center ${status === 'reserved' ? 'text-slate-700' : 'text-white/80'}`}>
                          {client?.name || '...'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-white/90">{posId}</span>
                    )}
                  </motion.button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Detail / Assignment Panel */}
      <AnimatePresence>
        {selectedPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPosition(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl rounded-l-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Posición {selectedPosition}
                  </h3>
                </div>
                <button onClick={() => setSelectedPosition(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {containerMap[selectedPosition] ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                      <div className="flex justify-between items-start mb-4">
                        <Box className="w-10 h-10 opacity-50" />
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {getPositionStatus(containerMap[selectedPosition]).toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-2xl font-black mb-1">{containerMap[selectedPosition].id}</h4>
                      <p className="text-indigo-100 font-bold flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {clients.find(c => c.id === containerMap[selectedPosition].clientId)?.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Peso Total</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{containerMap[selectedPosition].totalWeight.toLocaleString()} kg</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pallets</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{containerMap[selectedPosition].details.length}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignPosition(selectedPosition, '')}
                      className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Retirar de esta posición
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ArrowRightLeft className="w-8 h-8 text-slate-300" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">Posición Disponible</h4>
                      <p className="text-sm text-slate-500">Selecciona un contenedor para ubicarlo aquí.</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contenedores sin Ubicación</p>
                      {unassignedContainers.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4">No hay contenedores pendientes de ubicación.</p>
                      ) : (
                        unassignedContainers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleAssignPosition(selectedPosition, c.id)}
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left hover:border-indigo-500 hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{c.id}</p>
                                <p className="text-xs text-slate-500">{clients.find(cl => cl.id === c.clientId)?.name}</p>
                              </div>
                              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
