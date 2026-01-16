
import React from 'react';
import { LayoutDashboard, Package, History, PlusCircle, Warehouse, Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  onAddTransaction: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onAddTransaction }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'inventory', label: 'Stocks', icon: Package },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-indigo-900 text-white flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-indigo-800">
          <Warehouse className="w-8 h-8 text-indigo-300" />
          <span className="text-xl font-bold tracking-tight">StockMaster</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-700 text-white shadow-md' 
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={onAddTransaction}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-transform active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            New Transaction
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-indigo-300" />
          <span className="font-bold">StockMaster</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold">
            JD
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="hidden md:flex mb-8 justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            {activeTab === 'dashboard' ? 'Gudang Overview' : `${activeTab} Management`}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              JD
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="md:hidden mb-4">
             <h1 className="text-xl font-bold text-slate-800 capitalize">
                {activeTab === 'dashboard' ? 'Overview' : `${activeTab}`}
             </h1>
          </div>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-4 py-2 z-50">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-indigo-50' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onAddTransaction}
          className="flex flex-col items-center gap-1 -mt-8"
        >
          <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200 active:scale-90 transition-transform">
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">New</span>
        </button>
      </nav>
    </div>
  );
};
