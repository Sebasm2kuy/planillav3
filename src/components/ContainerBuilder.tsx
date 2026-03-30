import React, { useState, useMemo } from 'react';
import { Order, Client, StockItem, ShippingContainer, ContainerDetail } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  Plus, 
  Search, 
  Package, 
  Trash2, 
  ChevronRight,
  Calendar,
  User,
  CheckCircle2,
  Box,
  ArrowRight,
  X,
  AlertCircle
} from 'lucide-react';

interface ContainerBuilderProps {
  orders: Order[];
  clients: Client[];
  stock: StockItem[];
  containers: ShippingContainer[];
  onUpdateContainers: (newContainers: ShippingContainer[]) => void;
  onUpdateStock: (newStock: StockItem[]) => void;
  onUpdateOrders: (newOrders: Order[]) => void;
}

export const ContainerBuilder: React.FC<ContainerBuilderProps> = ({ 
  orders, 
  clients, 
  stock, 
  containers,
  onUpdateContainers,
  onUpdateStock,
  onUpdateOrders
}) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [containerNumber, setContainerNumber] = useState('');
  const [selectedPalletIds, setSelectedPalletIds] = useState<string[]>([]);

  // Filter orders that are pending or in preparation
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pendiente' || o.status === 'en_preparacion');
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Available pallets for the selected order's products
  const availablePallets = useMemo(() => {
    if (!selectedOrder) return [];
    
    const orderProducts = selectedOrder.items.map(i => (i.product || '').toLowerCase().trim()).filter(Boolean);
    
    return stock.filter(item => 
      item.clientId === selectedOrder.clientId &&
      item.status === 'EN_CAMARA' &&
      orderProducts.includes((item.product || '').toLowerCase().trim())
    );
  }, [selectedOrder, stock]);

  const handleTogglePallet = (palletId: string) => {
    setSelectedPalletIds(prev => 
      prev.includes(palletId) 
        ? prev.filter(id => id !== palletId) 
        : [...prev, palletId]
    );
  };

  const handleBuildContainer = () => {
    if (!selectedOrder || !containerNumber || selectedPalletIds.length === 0) {
      alert('Por favor, completa todos los campos y selecciona al menos un pallet.');
      return;
    }

    const selectedItems = stock.filter(s => selectedPalletIds.includes(s.palletId));
    const totalWeight = selectedItems.reduce((acc, item) => acc + item.weight, 0);

    const newContainer: ShippingContainer = {
      id: containerNumber,
      clientId: selectedOrder.clientId,
      orderId: selectedOrder.id,
      assemblyDate: new Date().toISOString(),
      totalWeight,
      status: 'preparado',
      details: selectedItems.map(item => ({
        containerId: containerNumber,
        palletId: item.palletId,
        product: item.product,
        lot: item.lot,
        weight: item.weight
      }))
    };

    // 1. Update Containers
    onUpdateContainers([newContainer, ...containers]);

    // 2. Discount Stock (Update status to RESERVADO or DESPACHADO)
    const updatedStock = stock.map(item => 
      selectedPalletIds.includes(item.palletId) 
        ? { ...item, status: 'RESERVADO' as const } 
        : item
    );
    onUpdateStock(updatedStock);

    // 3. Update Order Status
    const updatedOrders = orders.map(o => 
      o.id === selectedOrderId ? { ...o, status: 'en_preparacion' as const } : o
    );
    onUpdateOrders(updatedOrders);

    // Reset
    setShowBuilder(false);
    setSelectedOrderId('');
    setContainerNumber('');
    setSelectedPalletIds([]);
    alert('Contenedor armado exitosamente. El stock ha sido reservado.');
  };

  const handleDeleteContainer = (id: string) => {
    if (window.confirm('¿Eliminar este contenedor? El stock volverá a estar disponible.')) {
      const container = containers.find(c => c.id === id);
      if (!container) return;

      const palletIdsToReturn = container.details.map(d => d.palletId);
      
      // Update stock back to EN_CAMARA
      const updatedStock = stock.map(item => 
        palletIdsToReturn.includes(item.palletId) 
          ? { ...item, status: 'EN_CAMARA' as const } 
          : item
      );
      onUpdateStock(updatedStock);

      // Remove container
      onUpdateContainers(containers.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            Armado de Contenedores
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Asigna pallets de stock a pedidos específicos.</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <Plus className="w-5 h-5" />
          Armar Contenedor
        </button>
      </div>

      {/* Containers List */}
      <div className="grid grid-cols-1 gap-4">
        {containers.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Box className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500">No hay contenedores armados.</p>
          </div>
        ) : (
          containers.map(container => {
            const client = clients.find(c => c.id === container.clientId);
            return (
              <div key={container.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <Truck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">CONT: {container.id}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(container.assemblyDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {client?.name || 'Cliente Desconocido'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Pedido: <span className="font-bold">{container.orderId}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{container.totalWeight.toLocaleString()} <span className="text-sm font-normal opacity-60">kg</span></p>
                        <p className="text-xs text-slate-500">{container.details.length} pallets cargados</p>
                      </div>
                      <button
                        onClick={() => handleDeleteContainer(container.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {container.details.map((detail, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{detail.palletId}</span>
                          <span className="text-slate-500">{detail.weight} kg</span>
                        </div>
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{detail.product}</p>
                        <p className="text-[10px] text-slate-400">Lote: {detail.lot}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Builder Modal */}
      <AnimatePresence>
        {showBuilder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBuilder(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Armar Nuevo Contenedor</h3>
                <button onClick={() => setShowBuilder(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Seleccionar Pedido</label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => {
                        setSelectedOrderId(e.target.value);
                        setSelectedPalletIds([]);
                      }}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="">Elegir un pedido pendiente...</option>
                      {activeOrders.map(o => {
                        const client = clients.find(c => c.id === o.clientId);
                        return <option key={o.id} value={o.id}>{o.id} - {client?.name}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Número de Contenedor</label>
                    <input
                      type="text"
                      placeholder="Ej: MSCU 123456-7"
                      value={containerNumber}
                      onChange={(e) => setContainerNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {selectedOrder && (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                      <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2">Productos requeridos en el pedido:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.items.map((item, idx) => (
                          <span key={idx} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-700">
                            {item.product}: {item.kilos.toLocaleString()} kg
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Pallets Disponibles en Cámara:</h4>
                      {availablePallets.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No hay pallets disponibles en stock para los productos de este pedido.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availablePallets.map(pallet => (
                            <button
                              key={pallet.palletId}
                              onClick={() => handleTogglePallet(pallet.palletId)}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                                selectedPalletIds.includes(pallet.palletId)
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              <div>
                                <p className={`font-bold ${selectedPalletIds.includes(pallet.palletId) ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                  {pallet.palletId}
                                </p>
                                <p className={`text-xs ${selectedPalletIds.includes(pallet.palletId) ? 'text-indigo-100' : 'text-slate-500'}`}>
                                  {pallet.product}
                                </p>
                                <p className={`text-[10px] ${selectedPalletIds.includes(pallet.palletId) ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  Lote: {pallet.lot} | Cont: {pallet.containerId}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold">{pallet.weight} kg</p>
                                <p className="text-[10px] opacity-70">{pallet.boxes} cajas</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Resumen de Carga</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {stock.filter(s => selectedPalletIds.includes(s.palletId)).reduce((acc, i) => acc + i.weight, 0).toLocaleString()} kg
                    <span className="text-sm font-normal text-slate-500 ml-2">({selectedPalletIds.length} pallets)</span>
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowBuilder(false)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBuildContainer}
                    disabled={!selectedOrderId || !containerNumber || selectedPalletIds.length === 0}
                    className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Carga
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
