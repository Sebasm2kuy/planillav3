/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { PalletSearch } from './components/PalletSearch';
import { LoadingPlan } from './components/LoadingPlan';
import { parseExcelFile, mapDataToPallets } from './utils/excel';
import { PalletData, ContainerGroup, SavedPlan, AppSettings, Client, StockItem, Order, ShippingContainer } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { PackageCheck, AlertCircle, Save, History, Trash2, Moon, Sun, Image as ImageIcon, Users, ChevronRight, Globe, Plus, Database, LayoutDashboard, ClipboardList, Truck, Grid3X3, Package, X, Lock } from 'lucide-react';
import { ClientManager } from './components/ClientManager';
import { StockManager } from './components/StockManager';
import { OrderManager } from './components/OrderManager';
import { ContainerBuilder } from './components/ContainerBuilder';

import { WarehouseMap } from './components/WarehouseMap';
import { TraceabilityView } from './components/TraceabilityView';
import { PickingManager } from './components/PickingManager';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [masterData, setMasterData] = useState<PalletData[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [containers, setContainers] = useState<ShippingContainer[]>([]);
  const [activeTab, setActiveTab] = useState<'carga' | 'stock' | 'pedidos' | 'contenedores' | 'mapa' | 'trazabilidad' | 'picking'>('carga');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any[] | null>(null);
  const [searchIds, setSearchIds] = useState<string[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientManager, setShowClientManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    logo: null,
    darkMode: false,
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const storedPlans = localStorage.getItem('saved_plans');
    if (storedPlans) {
      try {
        setSavedPlans(JSON.parse(storedPlans));
      } catch (e) {
        console.error('Error loading saved plans', e);
      }
    }

    const storedStock = localStorage.getItem('app_stock');
    if (storedStock) {
      try {
        setStockData(JSON.parse(storedStock));
      } catch (e) {
        console.error('Error loading stock', e);
      }
    }

    const storedOrders = localStorage.getItem('app_orders');
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (e) {
        console.error('Error loading orders', e);
      }
    }

    const storedContainers = localStorage.getItem('app_containers');
    if (storedContainers) {
      try {
        setContainers(JSON.parse(storedContainers));
      } catch (e) {
        console.error('Error loading containers', e);
      }
    }

    const storedClients = localStorage.getItem('app_clients');
    if (storedClients) {
      try {
        setClients(JSON.parse(storedClients));
      } catch (e) {
        console.error('Error loading clients', e);
      }
    }

    const storedSettings = localStorage.getItem('app_settings');
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        setAppSettings(settings);
        if (settings.darkMode) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        console.error('Error loading settings', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(appSettings));
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings]);

  // Save plans to localStorage
  useEffect(() => {
    localStorage.setItem('saved_plans', JSON.stringify(savedPlans));
  }, [savedPlans]);

  // Save stock to localStorage
  useEffect(() => {
    localStorage.setItem('app_stock', JSON.stringify(stockData));
  }, [stockData]);

  // Save orders to localStorage
  useEffect(() => {
    localStorage.setItem('app_orders', JSON.stringify(orders));
  }, [orders]);

  // Save containers to localStorage
  useEffect(() => {
    localStorage.setItem('app_containers', JSON.stringify(containers));
  }, [containers]);

  // Save clients to localStorage
  useEffect(() => {
    localStorage.setItem('app_clients', JSON.stringify(clients));
  }, [clients]);

  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const handleDeleteClient = (id: string) => {
    if (window.confirm('¿Eliminar este cliente? Las planillas asociadas no se borrarán pero perderán la referencia.')) {
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClientId === id) setSelectedClientId(null);
    }
  };

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId), 
  [clients, selectedClientId]);

  const handleFileUpload = async (file: File) => {
    if (!selectedClientId) {
      alert('Por favor, selecciona un cliente primero.');
      return;
    }
    setLoading(true);
    setError(null);
    setDebugData(null);
    try {
      const rawData = await parseExcelFile(file);
      
      // Store raw data for debug view if needed
      setDebugData(rawData.slice(0, 10)); // Keep first 10 rows for debug

      const pallets = mapDataToPallets(rawData);
      
      if (pallets.length === 0) {
        setError('No se encontraron datos válidos. Revisa la "Vista Previa de Datos" abajo para ver qué está leyendo el sistema.');
      } else {
        setMasterData(pallets);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Error: ${err.message || 'Error desconocido al procesar el archivo.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (ids: string[]) => {
    setSearchIds(ids);
  };

  const handleClearSearch = () => {
    setSearchIds([]);
  };

  const handleSavePlan = () => {
    if (masterData.length === 0) return;
    
    const name = window.prompt('Nombre para esta planilla:', `${selectedClient?.name || 'Carga'} - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    if (!name) return;

    const newPlan: SavedPlan = {
      id: crypto.randomUUID(),
      name,
      timestamp: Date.now(),
      masterData,
      searchIds,
      clientId: selectedClientId || undefined,
    };

    setSavedPlans(prev => [newPlan, ...prev]);
    alert('Planilla guardada correctamente.');
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setMasterData(plan.masterData);
    setSearchIds(plan.searchIds);
    if (plan.clientId) setSelectedClientId(plan.clientId);
    setShowSavedPlans(false);
  };

  const handleDeletePlan = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta planilla guardada?')) {
      setSavedPlans(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAppSettings(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const toggleDarkMode = () => {
    setAppSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const { groups, notFoundIds } = useMemo(() => {
    if (searchIds.length === 0) return { groups: [], notFoundIds: [] };

    const notFound: string[] = [];
    const foundContainerIds = new Set<string>();

    // 1. Identify containers that have the searched pallets
    searchIds.forEach(id => {
      const cleanId = id.trim();
      const pallet = masterData.find(p => p.palletId === cleanId);
      
      if (pallet) {
        foundContainerIds.add(pallet.containerId);
      } else {
        notFound.push(cleanId);
      }
    });

    // 2. Get ALL pallets for those containers (not just the searched ones)
    const relevantPallets = masterData.filter(p => foundContainerIds.has(p.containerId));

    // 3. Group by container
    const grouped = relevantPallets.reduce((acc, pallet) => {
      if (!acc[pallet.containerId]) {
        acc[pallet.containerId] = {
          containerId: pallet.containerId,
          pallets: [],
          totalQuantity: 0,
          totalBoxes: 0,
          totalWeight: 0,
        };
      }
      acc[pallet.containerId].pallets.push(pallet);
      acc[pallet.containerId].totalQuantity += pallet.quantity;
      acc[pallet.containerId].totalBoxes += pallet.boxes;
      acc[pallet.containerId].totalWeight += pallet.weight;
      return acc;
    }, {} as Record<string, ContainerGroup>);

    return {
      groups: Object.values(grouped),
      notFoundIds: notFound
    };
  }, [masterData, searchIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20 transition-colors duration-300">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <PackageCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Gestor de Carga
              </h1>
            </div>
            
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('carga')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'carga' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Planillas
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'stock' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Database className="w-4 h-4" />
                Stock
              </button>
              <button
                onClick={() => setActiveTab('pedidos')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'pedidos' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Pedidos
              </button>
              <button
                onClick={() => setActiveTab('picking')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'picking' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Package className="w-4 h-4" />
                Picking
              </button>
              <button
                onClick={() => setActiveTab('contenedores')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'contenedores' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Truck className="w-4 h-4" />
                Contenedores
              </button>
              <button
                onClick={() => setActiveTab('mapa')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'mapa' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Mapa Cámara
              </button>
              <button
                onClick={() => setActiveTab('trazabilidad')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'trazabilidad' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <History className="w-4 h-4" />
                Trazabilidad
              </button>
            </nav>
            
            {(appSettings.logo || selectedClient) && (
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
            )}
            
            {appSettings.logo && (
              <img src={appSettings.logo} alt="Logo" className="h-10 max-w-[120px] object-contain" />
            )}

            {selectedClient && (
              <div className="hidden md:flex flex-col">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Cliente</span>
                <span className="text-sm font-semibold truncate max-w-[150px]">{selectedClient.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowAdminPanel(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
              title="Panel de Administración"
            >
              <Lock className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowClientManager(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
              title="Gestionar Clientes"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
              title={appSettings.darkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {appSettings.darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowSavedPlans(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 relative"
              title="Planillas Guardadas"
            >
              <History className="w-5 h-5" />
              {savedPlans.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
              )}
            </button>

            <label className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 cursor-pointer" title="Subir Logo">
              <ImageIcon className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>

            {masterData.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePlan}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Guardar</span>
                </button>
                
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres cargar un nuevo archivo? Se perderá la búsqueda actual.')) {
                      setMasterData([]);
                      setSearchIds([]);
                      setSelectedClientId(null);
                    }
                  }}
                  className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  Nuevo
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <AnimatePresence mode="wait">
          {activeTab === 'stock' ? (
            <motion.div
              key="stock-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StockManager 
                stock={stockData} 
                clients={clients} 
                onUpdateStock={(newStock) => setStockData(newStock)} 
                onUpdateClients={(newClients) => setClients(newClients)}
              />
            </motion.div>
          ) : activeTab === 'pedidos' ? (
            <motion.div
              key="orders-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <OrderManager 
                orders={orders}
                clients={clients}
                stock={stockData}
                onUpdateOrders={(newOrders) => setOrders(newOrders)}
              />
            </motion.div>
          ) : activeTab === 'picking' ? (
            <motion.div
              key="picking-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PickingManager 
                orders={orders}
                stock={stockData}
                clients={clients}
                onUpdateStock={(newStock) => setStockData(newStock)}
                onUpdateOrders={(newOrders) => setOrders(newOrders)}
              />
            </motion.div>
          ) : activeTab === 'contenedores' ? (
            <motion.div
              key="containers-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ContainerBuilder 
                orders={orders}
                clients={clients}
                stock={stockData}
                containers={containers}
                onUpdateContainers={(newContainers) => setContainers(newContainers)}
                onUpdateStock={(newStock) => setStockData(newStock)}
                onUpdateOrders={(newOrders) => setOrders(newOrders)}
              />
            </motion.div>
          ) : activeTab === 'mapa' ? (
            <motion.div
              key="map-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WarehouseMap 
                containers={containers}
                clients={clients}
                orders={orders}
                onUpdateContainers={(newContainers) => setContainers(newContainers)}
              />
            </motion.div>
          ) : activeTab === 'trazabilidad' ? (
            <motion.div
              key="trace-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TraceabilityView 
                stock={stockData}
                containers={containers}
                clients={clients}
              />
            </motion.div>
          ) : masterData.length === 0 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Gestión Multi-Cliente
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
                  Selecciona un cliente para comenzar a organizar su carga frigorífica.
                </p>

                {/* Client Selection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        selectedClientId === client.id 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-4 ring-indigo-100 dark:ring-indigo-900/30' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">{client.name}</h4>
                        {selectedClientId === client.id && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {client.country || 'Sin país'}
                      </p>
                      <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                        Seleccionar <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setShowClientManager(true)}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600"
                  >
                    <Plus className="w-8 h-8" />
                    <span className="font-bold">Nuevo Cliente</span>
                  </button>
                </div>
                
                {selectedClientId && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto text-left shadow-sm mb-8"
                  >
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-indigo-600" />
                      Formato de Excel para {selectedClient?.name}:
                    </h3>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                      <li>Columna C: Contenedor</li>
                      <li>Columna D: Pallets/Cantidad</li>
                      <li>Columna E: Bultos</li>
                      <li>Columna F: Kilos</li>
                      <li>Columna G: Contenido</li>
                      <li>Columna H: Pallet ID (6-7 dígitos)</li>
                    </ul>
                  </motion.div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <FileUpload onFileUpload={handleFileUpload} />
                
                {savedPlans.length > 0 && (
                  <button
                    onClick={() => setShowSavedPlans(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium shadow-sm"
                  >
                    <History className="w-5 h-5 text-indigo-600" />
                    Ver Planillas Guardadas
                  </button>
                )}
              </div>
              
              {loading && (
                <div className="mt-8 flex items-center text-indigo-600 font-medium animate-pulse">
                  Procesando archivo...
                </div>
              )}
              
              {error && (
                <div className="mt-8 w-full max-w-2xl mx-auto">
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                      <span className="font-medium">{error}</span>
                    </div>
                    <p className="text-sm opacity-80 ml-7">
                      Verifica que el archivo no esté protegido con contraseña y sea un Excel válido (.xlsx o .xls).
                    </p>
                  </div>

                  {debugData && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm overflow-hidden">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vista Previa de Datos (Primeras 10 filas)</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Esto es lo que el sistema está leyendo de tu archivo. Verifica si los datos se ven correctos.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr>
                              <th className="border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800">#</th>
                              {debugData[0]?.map((_: any, i: number) => (
                                <th key={i} className="border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800">Col {String.fromCharCode(65 + i)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {debugData.map((row, i) => (
                              <tr key={i}>
                                <td className="border border-slate-200 dark:border-slate-800 p-1 font-mono text-slate-400">{i + 1}</td>
                                {row.map((cell: any, j: number) => (
                                  <td key={j} className="border border-slate-200 dark:border-slate-800 p-1 truncate max-w-[150px]">
                                    {cell === null || cell === undefined ? <span className="text-slate-300 dark:text-slate-700">vacío</span> : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-center">
                <PalletSearch 
                  onSearch={handleSearch} 
                  onClear={handleClearSearch} 
                  currentIds={searchIds}
                  validIds={masterData.map(p => p.palletId)}
                />
              </div>

              <div id="results-section">
                <LoadingPlan 
                  groups={groups} 
                  notFoundIds={notFoundIds} 
                  searchIds={searchIds}
                  logo={appSettings.logo}
                  client={selectedClient}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Client Manager Modal */}
      <AnimatePresence>
        {showClientManager && (
          <ClientManager
            clients={clients}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onClose={() => setShowClientManager(false)}
          />
        )}
      </AnimatePresence>

      {/* Saved Plans Sidebar/Modal */}
      <AnimatePresence>
        {showSavedPlans && (
          <div className="fixed inset-0 z-50 flex items-center justify-end print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSavedPlans(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Planillas Guardadas
                </h3>
                <button
                  onClick={() => setShowSavedPlans(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {savedPlans.length === 0 ? (
                  <div className="text-center py-20">
                    <History className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500">No tienes planillas guardadas aún.</p>
                  </div>
                ) : (
                  savedPlans.map(plan => {
                    const planClient = clients.find(c => c.id === plan.clientId);
                    return (
                      <div
                        key={plan.id}
                        className="group bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer"
                        onClick={() => handleLoadPlan(plan)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {plan.name}
                            </h4>
                            {planClient && (
                              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{planClient.name}</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlan(plan.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                          <span>{new Date(plan.timestamp).toLocaleString()}</span>
                          <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {plan.masterData.length} pallets
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showAdminPanel && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
        )}
      </AnimatePresence>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 dark:text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Gestor de Carga de Pallets. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
