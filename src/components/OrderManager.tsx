import React, { useState, useMemo } from 'react';
import { Order, OrderItem, Client, StockItem, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  AlertTriangle, 
  Trash2, 
  ChevronRight,
  Calendar,
  User,
  Info,
  FileText
} from 'lucide-react';
import { OrderPdfProcessor } from './OrderPdfProcessor';

interface OrderManagerProps {
  orders: Order[];
  clients: Client[];
  stock: StockItem[];
  onUpdateOrders: (newOrders: Order[]) => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({ orders, clients, stock, onUpdateOrders }) => {
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [showPdfProcessor, setShowPdfProcessor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  
  // New Order State
  const [newOrder, setNewOrder] = useState<{
    clientId: string;
    items: { product: string; kilos: number; boxes: number }[];
    observations: string;
  }>({
    clientId: '',
    items: [{ product: '', kilos: 0, boxes: 0 }],
    observations: ''
  });

  // Aggregate stock by product
  const availableStock = useMemo(() => {
    const totals: Record<string, { weight: number, boxes: number }> = {};
    stock.filter(s => s.status === 'EN_CAMARA').forEach(item => {
      const prod = (item.product || '').toLowerCase().trim();
      if (!prod) return;
      if (!totals[prod]) totals[prod] = { weight: 0, boxes: 0 };
      totals[prod].weight += item.weight;
      totals[prod].boxes += item.boxes;
    });
    return totals;
  }, [stock]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const client = clients.find(c => c.id === order.clientId);
      const matchesSearch = 
        (client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(i => (i.product || '').toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesClient = selectedClientFilter === 'all' || order.clientId === selectedClientFilter;

      return matchesSearch && matchesClient;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, clients, searchTerm, selectedClientFilter]);

  const handleCreateOrder = () => {
    if (!newOrder.clientId) {
      alert('Selecciona un cliente');
      return;
    }
    if (newOrder.items.some(i => !i.product || i.kilos <= 0)) {
      alert('Completa los datos de los productos');
      return;
    }

    const order: Order = {
      id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: newOrder.clientId,
      date: new Date().toISOString(),
      items: newOrder.items.map(i => ({ ...i, id: crypto.randomUUID() })),
      status: 'pendiente',
      observations: newOrder.observations
    };

    onUpdateOrders([order, ...orders]);
    setShowNewOrderForm(false);
    setNewOrder({ clientId: '', items: [{ product: '', kilos: 0, boxes: 0 }], observations: '' });
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    onUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm('¿Eliminar este pedido?')) {
      onUpdateOrders(orders.filter(o => o.id !== orderId));
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pendiente': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'en_preparacion': return <Package className="w-4 h-4 text-blue-500" />;
      case 'cargado': return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'despachado': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
  };

  const checkStock = (product: string, requestedKilos: number) => {
    const available = availableStock[(product || '').toLowerCase().trim()]?.weight || 0;
    return {
      isEnough: available >= requestedKilos,
      available
    };
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Gestión de Pedidos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Registra y valida pedidos contra el stock de cámara.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPdfProcessor(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold shadow-sm"
          >
            <FileText className="w-5 h-5" />
            Procesar Orden PDF
          </button>
          <button
            onClick={() => setShowNewOrderForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID, cliente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <select
          value={selectedClientFilter}
          onChange={(e) => setSelectedClientFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="all">Todos los Clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500">No hay pedidos registrados.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const client = clients.find(c => c.id === order.clientId);
            return (
              <motion.div
                layout
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <ClipboardList className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{order.id}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(order.date).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {client?.name || 'Cliente Desconocido'}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(['pendiente', 'en_preparacion', 'cargado', 'despachado'] as OrderStatus[]).map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(order.id, status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            order.status === status
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {getStatusIcon(status)}
                          {getStatusLabel(status)}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.items.map(item => {
                      const stockInfo = checkStock(item.product, item.kilos);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${stockInfo.isEnough ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{item.product}</p>
                              <p className="text-xs text-slate-500">
                                Stock disponible: <span className="font-mono font-bold">{stockInfo.available.toLocaleString()} kg</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{item.kilos.toLocaleString()} kg</p>
                            <p className="text-xs text-slate-500">{item.boxes} cajas</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {order.observations && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-400 italic">{order.observations}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* New Order Modal */}
      <AnimatePresence>
        {showNewOrderForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewOrderForm(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Nuevo Pedido</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cliente</label>
                    <select
                      value={newOrder.clientId}
                      onChange={(e) => setNewOrder({ ...newOrder, clientId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="">Seleccionar Cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Productos</label>
                      <button
                        onClick={() => setNewOrder({ ...newOrder, items: [...newOrder.items, { product: '', kilos: 0, boxes: 0 }] })}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Añadir Línea
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {newOrder.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-6">
                            <input
                              type="text"
                              placeholder="Producto"
                              value={item.product}
                              onChange={(e) => {
                                const items = [...newOrder.items];
                                items[index].product = e.target.value;
                                setNewOrder({ ...newOrder, items });
                              }}
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              placeholder="Kilos"
                              value={item.kilos || ''}
                              onChange={(e) => {
                                const items = [...newOrder.items];
                                items[index].kilos = parseFloat(e.target.value) || 0;
                                setNewOrder({ ...newOrder, items });
                              }}
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              placeholder="Cajas"
                              value={item.boxes || ''}
                              onChange={(e) => {
                                const items = [...newOrder.items];
                                items[index].boxes = parseInt(e.target.value) || 0;
                                setNewOrder({ ...newOrder, items });
                              }}
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="col-span-1">
                            <button
                              onClick={() => {
                                if (newOrder.items.length === 1) return;
                                const items = newOrder.items.filter((_, i) => i !== index);
                                setNewOrder({ ...newOrder, items });
                              }}
                              className="p-2 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Observaciones</label>
                    <textarea
                      value={newOrder.observations}
                      onChange={(e) => setNewOrder({ ...newOrder, observations: e.target.value })}
                      placeholder="Instrucciones especiales, puerto, fecha límite..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setShowNewOrderForm(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    Confirmar Pedido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Processor Modal */}
      <AnimatePresence>
        {showPdfProcessor && (
          <OrderPdfProcessor
            stock={stock}
            onClose={() => setShowPdfProcessor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
