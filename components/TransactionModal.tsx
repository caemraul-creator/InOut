
import React, { useState } from 'react';
import { Product, TransactionType, WarehouseID } from '../types';
import { X, Save, AlertCircle, ScanBarcode } from 'lucide-react';
import { Scanner } from './Scanner';

interface TransactionModalProps {
  products: Product[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ products, onClose, onSubmit }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    productId: products[0]?.id || '',
    type: TransactionType.IN,
    quantity: 1,
    from: WarehouseID.W1 as WarehouseID,
    to: WarehouseID.W2 as WarehouseID,
    notes: ''
  });

  const [error, setError] = useState('');

  const handleScan = (sku: string) => {
    const product = products.find(p => p.sku === sku);
    if (product) {
      setFormData({ ...formData, productId: product.id });
      setShowScanner(false);
    } else {
      alert("Product not found for SKU: " + sku);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    if (formData.type === TransactionType.OUT || formData.type === TransactionType.TRANSFER) {
      if (product.stock[formData.from] < formData.quantity) {
        setError(`Insufficient stock in ${formData.from}. Available: ${product.stock[formData.from]}`);
        return;
      }
    }

    if (formData.type === TransactionType.TRANSFER && formData.from === formData.to) {
      setError('Source and Destination cannot be the same.');
      return;
    }

    onSubmit(formData);
  };

  if (showScanner) {
    return <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Transaction</h2>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
               <label className="text-sm font-bold text-slate-700">Product</label>
               <button 
                  type="button" 
                  onClick={() => setShowScanner(true)}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
               >
                  <ScanBarcode className="w-4 h-4" />
                  Scan SKU
               </button>
            </div>
            <select
              value={formData.productId}
              onChange={(e) => setFormData({...formData, productId: e.target.value})}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[TransactionType.IN, TransactionType.OUT, TransactionType.TRANSFER].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, type})}
                  className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                    formData.type === type 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Quantity</label>
            <div className="flex items-center gap-4">
               <button 
                type="button" 
                onClick={() => setFormData(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-xl font-bold border border-slate-200 active:bg-slate-200"
               >-</button>
               <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-bold outline-none"
              />
               <button 
                type="button" 
                onClick={() => setFormData(prev => ({...prev, quantity: prev.quantity + 1}))}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-xl font-bold border border-slate-200 active:bg-slate-200"
               >+</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.type === TransactionType.IN || formData.type === TransactionType.TRANSFER) && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">To Warehouse</label>
                <select
                  value={formData.to}
                  onChange={(e) => setFormData({...formData, to: e.target.value as WarehouseID})}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value={WarehouseID.W1}>{WarehouseID.W1}</option>
                  <option value={WarehouseID.W2}>{WarehouseID.W2}</option>
                </select>
              </div>
            )}

            {(formData.type === TransactionType.OUT || formData.type === TransactionType.TRANSFER) && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">From Warehouse</label>
                <select
                  value={formData.from}
                  onChange={(e) => setFormData({...formData, from: e.target.value as WarehouseID})}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value={WarehouseID.W1}>{WarehouseID.W1}</option>
                  <option value={WarehouseID.W2}>{WarehouseID.W2}</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Add remark..."
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </form>

        <div className="p-5 border-t border-slate-100 bg-slate-50 md:rounded-b-3xl">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Save className="w-5 h-5" />
            Process Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
