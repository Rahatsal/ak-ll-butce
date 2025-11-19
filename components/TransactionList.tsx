import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Car, Home, Activity, Zap, MoreHorizontal, Trash2 } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const getIconForCategory = (category: string) => {
  switch (category) {
    case 'Gıda': return <Coffee size={20} className="text-orange-500" />;
    case 'Alışveriş': return <ShoppingBag size={20} className="text-blue-500" />;
    case 'Ulaşım': return <Car size={20} className="text-purple-500" />;
    case 'Faturalar': return <Zap size={20} className="text-yellow-500" />;
    case 'Sağlık': return <Activity size={20} className="text-red-500" />;
    case 'Maaş': return <Home size={20} className="text-green-500" />;
    default: return <MoreHorizontal size={20} className="text-gray-500" />;
  }
};

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>Henüz işlem yok.</p>
        <p className="text-sm">"Artı" butonuna basarak ekle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {transactions.map((t) => (
        <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              {getIconForCategory(t.category as string)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t.description}</h4>
              <p className="text-xs text-gray-500">{t.category} • {new Date(t.date).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`font-bold ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
              {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toFixed(2)} ₺
            </span>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete(t.id);
               }}
               className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-all active:scale-95"
               title="Sil"
             >
               <Trash2 size={18} />
             </button>
          </div>
        </div>
      ))}
    </div>
  );
};