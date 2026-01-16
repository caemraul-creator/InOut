
export enum WarehouseID {
  W1 = 'Gudang Utama',
  W2 = 'Gudang Cabang'
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER'
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: {
    [key in WarehouseID]: number;
  };
  minStock: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  productId: string;
  productName: string;
  type: TransactionType;
  quantity: number;
  fromWarehouse?: WarehouseID;
  toWarehouse?: WarehouseID;
  notes: string;
}

export interface InventoryState {
  products: Product[];
  transactions: Transaction[];
}
