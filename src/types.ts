export interface PalletData {
  containerId: string;
  quantity: number;
  boxes: number;
  weight: number;
  description: string;
  palletId: string;
  originalRow: number;
}

export interface ContainerGroup {
  containerId: string;
  pallets: PalletData[];
  totalQuantity: number;
  totalBoxes: number;
  totalWeight: number;
}

export interface Client {
  id: string;
  name: string;
  country: string;
  operationType: string;
  observations: string;
}

export type StockStatus = 'EN_CAMARA' | 'RESERVADO' | 'DESPACHADO';

export interface StockItem {
  id: string;
  clientId: string;
  containerId: string;
  palletId: string;
  product: string;
  lot: string;
  boxes: number;
  weight: number;
  status: StockStatus;
  timestamp: number;
}

export type OrderStatus = 'pendiente' | 'en_preparacion' | 'cargado' | 'despachado';

export interface OrderItem {
  id: string;
  product: string;
  kilos: number;
  boxes: number;
}

export interface Order {
  id: string;
  clientId: string;
  date: string;
  items: OrderItem[];
  status: OrderStatus;
  observations?: string;
}

export interface ContainerDetail {
  containerId: string;
  palletId: string;
  product: string;
  lot: string;
  weight: number;
}

export interface ShippingContainer {
  id: string;
  clientId: string;
  orderId: string;
  assemblyDate: string;
  totalWeight: number;
  status: 'preparado' | 'despachado';
  details: ContainerDetail[];
  positionId?: string;
}

export interface StoragePosition {
  id: string;
  row: string;
  column: number;
  containerId?: string;
}

export interface SavedPlan {
  id: string;
  name: string;
  timestamp: number;
  masterData: PalletData[];
  searchIds: string[];
  clientId?: string;
}

export interface AppSettings {
  logo: string | null;
  darkMode: boolean;
}
