import React from 'react';
import { Wallet, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export const PartnerCommissionSummary = ({ stats }: { stats: any }) => {
  const cards = [
    { label: 'Total Acumulado', value: stats.totalEarned, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aguardando Pagamento', value: stats.pendingAmount, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Comissões Pagas', value: stats.paidAmount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Performance (Mês)', value: `+${stats.monthlyGrowth}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className={`${card.bg} ${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
            <card.icon size={20} />
          </div>
          <p className="text-gray-500 text-sm font-medium">{card.label}</p>
          <h3 className="text-xl font-bold text-gray-900">MT {card.value.toLocaleString()}</h3>
        </div>
      ))}
    </div>
  );
};