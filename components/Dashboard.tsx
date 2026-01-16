
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Product, Transaction, WarehouseID } from '../types';
import { AlertTriangle, TrendingUp, ArrowRightLeft, BrainCircuit, RefreshCw } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  aiInsight: string;
  isAiLoading: boolean;
  onRefreshAi: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ products, transactions, aiInsight, isAiLoading, onRefreshAi }) => {
  const chartData = products.map(p => ({
    name: p.name,
    [WarehouseID.W1]: p.stock[WarehouseID.W1],
    [WarehouseID.W2]: p.stock[WarehouseID.W2],
  }));

  const totalStockW1 = products.reduce((acc, p) => acc + p.stock[WarehouseID.W1], 0);
  const totalStockW2 = products.reduce((acc, p) => acc + p.stock[WarehouseID.W2], 0);

  const pieData = [
    { name: WarehouseID.W1, value: totalStockW1, color: '#6366f1' },
    { name: WarehouseID.W2, value: totalStockW2, color: '#10b981' },
  ];

  const lowStockProducts = products.filter(p => 
    (p.stock[WarehouseID.W1] + p.stock[WarehouseID.W2]) < p.minStock
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 text-indigo-600 mb-2">
            <TrendingUp className="w-6 h-6" />
            <span className="font-semibold">Total Stock</span>
          </div>
          <div className="text-3xl font-bold">{totalStockW1 + totalStockW2}</div>
          <p className="text-sm text-slate-500 mt-1">Items across 2 warehouses</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 text-amber-500 mb-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-semibold">Low Stock</span>
          </div>
          <div className="text-3xl font-bold">{lowStockProducts.length}</div>
          <p className="text-sm text-slate-500 mt-1">Alerts triggered</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 text-emerald-600 mb-2">
            <ArrowRightLeft className="w-6 h-6" />
            <span className="font-semibold">Transactions</span>
          </div>
          <div className="text-3xl font-bold">{transactions.length}</div>
          <p className="text-sm text-slate-500 mt-1">All-time record</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 text-purple-600 mb-2">
            <BrainCircuit className="w-6 h-6" />
            <span className="font-semibold">AI Status</span>
          </div>
          <div className="text-3xl font-bold text-slate-400">Ready</div>
          <p className="text-sm text-slate-500 mt-1">Gemini Pro connected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Stock Comparison Per Warehouse
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey={WarehouseID.W1} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey={WarehouseID.W2} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Warehouse Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <h3 className="text-lg font-bold mb-6 text-left w-full">Stock Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 w-full">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium">{WarehouseID.W1}</span>
              <span className="font-bold text-indigo-600">{totalStockW1} pcs</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium">{WarehouseID.W2}</span>
              <span className="font-bold text-emerald-600">{totalStockW2} pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-900">
            <BrainCircuit className="w-6 h-6 text-indigo-500" />
            AI Inventory Intelligence
          </h3>
          <button 
            onClick={onRefreshAi}
            disabled={isAiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {aiInsight ? 'Refresh Insights' : 'Generate Insights'}
          </button>
        </div>
        
        {aiInsight ? (
          <div className="bg-white p-6 rounded-xl border border-indigo-50 prose prose-indigo max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed shadow-inner">
            {aiInsight}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            Click generate to analyze your stock with Gemini AI.
          </div>
        )}
      </div>
    </div>
  );
};
