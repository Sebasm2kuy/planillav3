import React, { useState, useMemo } from 'react';
import { StockItem, Order, Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Search, 
  CheckCircle2, 
  Truck, 
  X, 
  AlertCircle,
  ClipboardList,
  ArrowRight
} from 'lucide-react';

interface PickingManagerProps {
  orders: Order[];
  stock: StockItem[];
  clients: Client[];
  onUpdateStock: (newStock: StockItem[]) => void;
  onUpdateOrders: (newOrders: Order[]) => void;
}

export const PickingManager: React.FC<PickingManagerProps> = ({ 
  orders, 
  stock, 
  clients, 
  onUpdateStock, 
  onUpdateOrders 
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedPalletIds, setSelectedPalletIds] = useState<string[]>([]);

  // Filter orders that are for picking (not necessarily export)
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pendiente' || o.status === 'en_preparacion');
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

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
      prev.includes(palletId) ? prev.filter(id => id !== palletId) : [...prev, palletId]
    );
  };

  const handleConfirmPicking = () => {
    if (!selectedOrder || selectedPalletIds.length === 0) return;

    // 1. Update Stock to DESPACHADO
    const updatedStock = stock.map(item => 
      selectedPalletIds.includes(item.palletId) 
        ? { ...item, status: 'DESPACHADO' as const } 
        : item
    );
    onUpdateStock(updatedStock);

    // 2. Update Order to despachado
    const updatedOrders = orders.map(o => 
      o.id === selectedOrderId ? { ...o, status: 'despachado' as const } : o
    );
    onUpdateOrders(updatedOrders);

    // Reset
    setSelectedOrderId('');
    setSelectedPalletIds([]);
    alert('Picking completado. Los pallets han sido marcados como DESPACHADOS.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Picking Diario
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Despacho directo de pallets para clientes locales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Pedidos Pendientes
            </h3>
            <div className="space-y-2">
              {activeOrders.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No hay pedidos para picking.</p>
              ) : (
                activeOrders.map(order => {
                  const client = clients.find(c => c.id === order.clientId);
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setSelectedPalletIds([]);
                      }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <p className="font-bold">{order.id}</p>
                      <p className={`text-xs ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{client?.name}</p>
                      <div className="mt-2 flex gap-1">
                        {order.items.map((it, idx) => (
                          <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            {it.product}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pallet Selection */}
        <div className="lg:col-span-2 space-y-4">
          {selectedOrder ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Seleccionar Pallets para {selectedOrder.id}
                </h3>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold">Total Seleccionado</p>
                  <p className="text-xl font-black text-indigo-600">
                    {stock.filter(s => selectedPalletIds.includes(s.palletId)).reduce((acc, i) => acc + i.weight, 0).toLocaleString()} kg
                  </p>
                </div>
              </div>

              {availablePallets.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No hay pallets disponibles en stock para los productos solicitados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePallets.map(pallet => (
                    <button
                      key={pallet.palletId}
                      onClick={() => handleTogglePallet(pallet.palletId)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        selectedPalletIds.includes(pallet.palletId)
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{pallet.palletId}</p>
                        <p className={`text-xs ${selectedPalletIds.includes(pallet.palletId) ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {pallet.product}
                        </p>
                        <p className={`text-[10px] ${selectedPalletIds.includes(pallet.palletId) ? 'text-emerald-200' : 'text-slate-400'}`}>
                          Lote: {pallet.lot} | Origen: {pallet.containerId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{pallet.weight} kg</p>
                        <p className="text-[10px] opacity-70">{pallet.boxes} cajas</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleConfirmPicking}
                  disabled={selectedPalletIds.length === 0}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Salida de Picking
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <ArrowRight className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-500 font-medium">Selecciona un pedido de la izquierda para comenzar el picking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
