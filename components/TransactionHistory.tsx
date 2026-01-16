
import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, FileText } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-50">
        <h3 className="text-lg font-bold">Transaction Logs</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const getBadge = () => {
                switch(tx.type) {
                  case TransactionType.IN:
                    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold"><ArrowDownLeft className="w-3 h-3"/> STOCK IN</span>;
                  case TransactionType.OUT:
                    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold"><ArrowUpRight className="w-3 h-3"/> STOCK OUT</span>;
                  case TransactionType.TRANSFER:
                    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold"><ArrowRight className="w-3 h-3"/> TRANSFER</span>;
                }
              };

              return (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(tx.timestamp).toLocaleDateString('id-ID')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(tx.timestamp).toLocaleTimeString('id-ID')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-800">{tx.productName}</div>
                    <div className="text-xs text-slate-400">ID: {tx.id.toUpperCase()}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getBadge()}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {tx.type === TransactionType.OUT ? '-' : '+'}{tx.quantity}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs flex flex-col gap-1">
                      {tx.fromWarehouse && (
                        <span className="text-slate-500">From: <span className="font-semibold text-slate-700">{tx.fromWarehouse}</span></span>
                      )}
                      {tx.toWarehouse && (
                        <span className="text-slate-500">To: <span className="font-semibold text-slate-700">{tx.toWarehouse}</span></span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm max-w-[200px] truncate">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      {tx.notes || '-'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {transactions.length === 0 && (
        <div className="p-20 text-center text-slate-400 font-medium">
          No transaction history yet.
        </div>
      )}
    </div>
  );
};
