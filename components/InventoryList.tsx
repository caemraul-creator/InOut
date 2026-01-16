
import React, { useState } from 'react';
import { Product, WarehouseID } from '../types';
import { Search, Filter, ArrowUpRight, ArrowDownRight, MoreVertical } from 'lucide-react';

interface InventoryListProps {
  products: Product[];
}

export const InventoryList: React.FC<InventoryListProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">{WarehouseID.W1}</th>
                <th className="px-6 py-4">{WarehouseID.W2}</th>
                <th className="px-6 py-4">Total Stock</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const total = product.stock[WarehouseID.W1] + product.stock[WarehouseID.W2];
                const isLow = total < product.minStock;
                return (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-indigo-600">{product.stock[WarehouseID.W1]}</td>
                    <td className="px-6 py-4 font-medium text-emerald-600">{product.stock[WarehouseID.W2]}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{total}</td>
                    <td className="px-6 py-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                          <ArrowDownRight className="w-3 h-3" /> LOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                          <ArrowUpRight className="w-3 h-3" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filtered.map((product) => {
          const total = product.stock[WarehouseID.W1] + product.stock[WarehouseID.W2];
          const isLow = total < product.minStock;
          return (
            <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-slate-900">{product.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{product.sku} • {product.category}</p>
                </div>
                <button className="text-slate-400 p-1">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Utama</p>
                  <p className="text-lg font-bold text-indigo-600">{product.stock[WarehouseID.W1]}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Cabang</p>
                  <p className="text-lg font-bold text-emerald-600">{product.stock[WarehouseID.W2]}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-slate-500">Total:</span>
                   <span className="text-sm font-black text-slate-900">{total}</span>
                </div>
                {isLow ? (
                  <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Low Stock</span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter">In Stock</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-slate-400 font-medium">
          No products found.
        </div>
      )}
    </div>
  );
};
