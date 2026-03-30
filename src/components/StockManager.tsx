import React, { useState, useMemo } from 'react';
import { StockItem, Client, StockStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Truck, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  BarChart3,
  Box,
  Users
} from 'lucide-react';
import { parseExcelFile, mapDataToStock } from '../utils/excel';

interface StockManagerProps {
  stock: StockItem[];
  clients: Client[];
  onUpdateStock: (newStock: StockItem[]) => void;
  onUpdateClients: (newClients: Client[]) => void;
}

export const StockManager: React.FC<StockManagerProps> = ({ stock, clients, onUpdateStock, onUpdateClients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [expandedContainers, setExpandedContainers] = useState<Record<string, boolean>>({});

  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const matchesSearch = 
        (item.containerId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.palletId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.lot || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = selectedClientFilter === 'all' || item.clientId === selectedClientFilter;
      const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;

      return matchesSearch && matchesClient && matchesStatus;
    });
  }, [stock, searchTerm, selectedClientFilter, selectedStatusFilter]);

  const stockByContainer = useMemo(() => {
    const grouped: Record<string, StockItem[]> = {};
    filteredStock.forEach(item => {
      if (!grouped[item.containerId]) grouped[item.containerId] = [];
      grouped[item.containerId].push(item);
    });
    return grouped;
  }, [filteredStock]);

  const totalsByClient = useMemo(() => {
    const totals: Record<string, { weight: number, boxes: number, pallets: number }> = {};
    
    stock.forEach(item => {
      if (!totals[item.clientId]) {
        totals[item.clientId] = { weight: 0, boxes: 0, pallets: 0 };
      }
      totals[item.clientId].weight += item.weight;
      totals[item.clientId].boxes += item.boxes;
      totals[item.clientId].pallets += 1;
    });

    return totals;
  }, [stock]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const rawData = await parseExcelFile(file);
      const { stock: newStock, newClients } = mapDataToStock(rawData, clients);
      
      if (newStock.length === 0) {
        alert("No se encontraron datos de stock válidos en el archivo.");
      } else {
        let message = `Se encontraron ${newStock.length} registros de stock.`;
        if (newClients.length > 0) {
          message += `\nSe detectaron ${newClients.length} nuevos clientes que serán creados automáticamente.`;
        }
        
        const choice = window.confirm(`${message}\n\n¿Deseas ACTUALIZAR el stock existente? (Los pallets con el mismo ID se actualizarán, los nuevos se añadirán).\n\nPresiona 'Cancelar' si prefieres REEMPLAZAR todo el stock.`);
        
        if (newClients.length > 0) {
          onUpdateClients([...clients, ...newClients]);
        }

        if (choice) {
          // Merge logic (Create or Update)
          const mergedStock = [...stock];
          newStock.forEach(newItem => {
            const index = mergedStock.findIndex(s => s.palletId === newItem.palletId);
            if (index !== -1) {
              // Update existing
              mergedStock[index] = { 
                ...mergedStock[index], 
                ...newItem, 
                id: mergedStock[index].id // Keep internal ID
              };
            } else {
              // Create new
              mergedStock.push(newItem);
            }
          });
          onUpdateStock(mergedStock);
          alert("Stock actualizado correctamente.");
        } else {
          // Replace logic
          if (window.confirm("¿Estás seguro de que deseas REEMPLAZAR todo el stock actual por el del archivo?")) {
            onUpdateStock(newStock);
            alert("Stock reemplazado correctamente.");
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el archivo de stock.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const toggleContainer = (id: string) => {
    setExpandedContainers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'EN_CAMARA': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'RESERVADO': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'DESPACHADO': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Stock (KG)</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {stock.reduce((acc, item) => acc + item.weight, 0).toLocaleString()} <span className="text-sm font-normal opacity-60">kg</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pallets</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {stock.length} <span className="text-sm font-normal opacity-60">unidades</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contenedores</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {new Set(stock.map(s => s.containerId)).size} <span className="text-sm font-normal opacity-60">activos</span>
          </div>
        </div>
      </div>

      {/* Totals by Client Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Resumen de Kilos por Cliente
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clients.map(client => {
            const total = totalsByClient[client.id] || { weight: 0, boxes: 0, pallets: 0 };
            if (total.pallets === 0) return null;
            return (
              <div key={client.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 truncate mb-1">{client.name}</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {total.weight.toLocaleString()} <span className="text-[10px] font-normal">kg</span>
                </p>
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>{total.pallets} pallets</span>
                  <span>{total.boxes} cajas</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por contenedor, pallet, producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="all">Todos los Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="all">Todos los Estados</option>
            <option value="EN_CAMARA">En Cámara</option>
            <option value="RESERVADO">Reservado</option>
            <option value="DESPACHADO">Despachado</option>
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all cursor-pointer font-medium shadow-sm">
            <Upload className="w-4 h-4" />
            Importar Stock
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={isImporting} />
          </label>
        </div>
      </div>

      {/* Client Totals (Horizontal Scroll) */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4">
          {clients.map(client => {
            const total = totalsByClient[client.id] || { weight: 0, boxes: 0, pallets: 0 };
            if (total.pallets === 0) return null;
            return (
              <div key={client.id} className="flex-shrink-0 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-w-[200px]">
                <h4 className="font-bold text-slate-900 dark:text-white mb-1 truncate">{client.name}</h4>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{total.weight.toLocaleString()} kg</span>
                  <span>{total.pallets} pallets</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500" 
                    style={{ width: `${Math.min(100, (total.weight / 100000) * 100)}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock List by Container */}
      <div className="space-y-4">
        {Object.keys(stockByContainer).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Database className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500">No hay registros de stock que coincidan con los filtros.</p>
          </div>
        ) : (
          (Object.entries(stockByContainer) as [string, StockItem[]][]).map(([containerId, items]) => {
            const isExpanded = expandedContainers[containerId];
            const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
            const totalBoxes = items.reduce((acc, item) => acc + item.boxes, 0);

            return (
              <div key={containerId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div 
                  className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleContainer(containerId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                      <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{containerId}</h3>
                      <p className="text-xs text-slate-500">{items.length} pallets en este contenedor</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Bultos</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{totalBoxes}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Peso Total</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{totalWeight.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                              <th className="px-6 py-3 font-medium">Pallet ID</th>
                              <th className="px-6 py-3 font-medium">Cliente</th>
                              <th className="px-6 py-3 font-medium">Producto</th>
                              <th className="px-6 py-3 font-medium">Lote</th>
                              <th className="px-6 py-3 font-medium text-right">Bultos</th>
                              <th className="px-6 py-3 font-medium text-right">Peso</th>
                              <th className="px-6 py-3 font-medium text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {items.map(item => {
                              const client = clients.find(c => c.id === item.clientId);
                              return (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-6 py-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">{item.palletId}</td>
                                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{client?.name || 'Desconocido'}</td>
                                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{item.product}</td>
                                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{item.lot}</td>
                                  <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-400">{item.boxes}</td>
                                  <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{item.weight}</td>
                                  <td className="px-6 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                      {item.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
