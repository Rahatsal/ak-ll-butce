import React from 'react';
import { FinancialSummary } from '../types';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface SummaryCardsProps {
  summary: FinancialSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-indigo-100 text-sm font-medium">Toplam Bakiye</span>
          <Wallet className="text-indigo-200" size={20} />
        </div>
        <div className="text-4xl font-bold mb-4">
          {summary.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <div className="bg-green-400/20 p-1 rounded-full">
              <TrendingUp size={14} className="text-green-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-indigo-200">Gelir</span>
              <span className="text-sm font-semibold">{summary.totalIncome.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <div className="bg-red-400/20 p-1 rounded-full">
              <TrendingDown size={14} className="text-red-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-indigo-200">Gider</span>
              <span className="text-sm font-semibold">{summary.totalExpense.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
