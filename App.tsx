import React, { useState, useEffect } from 'react';
import { WarehouseID, TransactionType, Transaction, InventoryState } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { InventoryList } from './components/InventoryList';
import { TransactionHistory } from './components/TransactionHistory';
import { TransactionModal } from './components/TransactionModal';
import { getInventoryInsights } from './geminiService';

const INITIAL_DATA: InventoryState = {
  products: [
    { id: '1', name: 'MacBook Pro M3', sku: 'LAP-001', category: 'Electronics', stock: { [WarehouseID.W1]: 15, [WarehouseID.W2]: 5 }, minStock: 10 },
    { id: '2', name: 'iPhone 15 Pro', sku: 'MOB-001', category: 'Electronics', stock: { [WarehouseID.W1]: 30, [WarehouseID.W2]: 12 }, minStock: 15 },
    { id: '3', name: 'Dell UltraSharp', sku: 'MON-001', category: 'Accessories', stock: { [WarehouseID.W1]: 8, [WarehouseID.W2]: 20 }, minStock: 10 },
    { id: '4', name: 'Keychron K2', sku: 'ACC-001', category: 'Accessories', stock: { [WarehouseID.W1]: 50, [WarehouseID.W2]: 25 }, minStock: 20 },
  ],
  transactions: []
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history'>('dashboard');
  const [state, setState] = useState<InventoryState>(() => {
    const saved = localStorage.getItem('inventory_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('inventory_data', JSON.stringify(state));
  }, [state]);

  const handleTransaction = (data: {
    productId: string;
    type: TransactionType;
    quantity: number;
    from?: WarehouseID;
    to?: WarehouseID;
    notes: string;
  }) => {
    setState(prev => {
      const newProducts = prev.products.map(p => {
        if (p.id !== data.productId) return p;
        
        const updatedStock = { ...p.stock };
        if (data.type === TransactionType.IN && data.to) {
          updatedStock[data.to] += data.quantity;
        } else if (data.type === TransactionType.OUT && data.from) {
          updatedStock[data.from] -= data.quantity;
        } else if (data.type === TransactionType.TRANSFER && data.from && data.to) {
          updatedStock[data.from] -= data.quantity;
          updatedStock[data.to] += data.quantity;
        }
        return { ...p, stock: updatedStock };
      });

      const product = prev.products.find(p => p.id === data.productId);
      const newTransaction: Transaction = {
        id: Math.random().toString(36).slice(2, 11),
        timestamp: Date.now(),
        productId: data.productId,
        productName: product?.name || 'Unknown',
        type: data.type,
        quantity: data.quantity,
        fromWarehouse: data.from,
        toWarehouse: data.to,
        notes: data.notes
      };

      return {
        products: newProducts,
        transactions: [newTransaction, ...prev.transactions]
      };
    });
    setIsModalOpen(false);
  };

  const generateAIReport = async () => {
    setIsAiLoading(true);
    const result = await getInventoryInsights(state.products, state.transactions);
    setAiInsight(result || 'No insights available.');
    setIsAiLoading(false);
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      onAddTransaction={() => setIsModalOpen(true)}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          products={state.products} 
          transactions={state.transactions} 
          aiInsight={aiInsight}
          isAiLoading={isAiLoading}
          onRefreshAi={generateAIReport}
        />
      )}
      {activeTab === 'inventory' && (
        <InventoryList products={state.products} />
      )}
      {activeTab === 'history' && (
        <TransactionHistory transactions={state.transactions} />
      )}

      {isModalOpen && (
        <TransactionModal 
          products={state.products}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleTransaction}
        />
      )}
    </Layout>
  );
};

export default App;