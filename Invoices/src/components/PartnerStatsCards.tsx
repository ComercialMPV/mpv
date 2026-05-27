import React from 'react';
import { DollarSign, Users, ShoppingBag, Percent, Target } from 'lucide-react';

interface PartnerStats {
  totalSales: number;
  totalCommission: number;
  activeClients: number;
  commissionRate: number;
  // Novos campos para o card de metas (virão do parent via props)
  monthlySalesGoal?: number;
  currentMonthSales?: number;
  monthlyLeadsGoal?: number;
  currentMonthLeads?: number;
}


export const PartnerStatsCards: React.FC<{ stats: PartnerStats }> = ({ stats }) => {

  // Provide defaults if stats is null/undefined
  const safeStats = stats || {
    totalSales: 0,
    totalCommission: 0,
    activeClients: 0,
    commissionRate: 0,
    monthlySalesGoal: 0,
    currentMonthSales: 0,
    monthlyLeadsGoal: 0,
    currentMonthLeads: 0,
  };

  // Cálculo da comissão estimada baseada na regra: 
  // Valor das Vendas * (Taxa / 100)
  const totalSales = safeStats.totalSales || 0;
  const commissionRate = safeStats.commissionRate || 0;
  const calculatedCommission = totalSales * (commissionRate / 100);

  // Cálculo de progresso das metas (para o novo card)
  const salesProgress = safeStats.monthlySalesGoal
    ? Math.min(100, Math.round((safeStats.currentMonthSales / safeStats.monthlySalesGoal) * 100))
    : 0;

  const leadsProgress = safeStats.monthlyLeadsGoal
    ? Math.min(100, Math.round((safeStats.currentMonthLeads / safeStats.monthlyLeadsGoal) * 100))
    : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const cards = [
    {
      label: 'Vendas Totais',
      value: `MT ${(safeStats.totalSales || 0).toLocaleString()}`,
      icon: ShoppingBag,
      color: 'blue'
    },
    { 
      label: 'Minha Comissão', 
      value: `MT ${(calculatedCommission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      color: 'green' 
    },
    {
      label: 'Meus Clientes',
      value: safeStats.activeClients || 0,
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Taxa Atual',
      value: `${safeStats.commissionRate || 0}%`,
      icon: Percent,
      color: 'orange'
    },
    // Novo quinto card: Minhas Metas e Progresso
    {
      label: 'Minhas Metas',
      value: (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Vendas:</span>
            <span className="font-bold">
              {salesProgress > 0 ? `${salesProgress}%` : '—'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(salesProgress)}`}
              style={{ width: `${salesProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>{safeStats.currentMonthSales?.toLocaleString('pt-MZ') || 0} MT</span>
            <span>{safeStats.monthlySalesGoal?.toLocaleString('pt-MZ') || 0} MT</span>
          </div>

          <div className="flex justify-between mt-3">
            <span>Leads:</span>
            <span className="font-bold">
              {leadsProgress > 0 ? `${leadsProgress}%` : '—'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(leadsProgress)}`}
              style={{ width: `${leadsProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>{safeStats.currentMonthLeads || 0}</span>
            <span>{safeStats.monthlyLeadsGoal || 0}</span>
          </div>
        </div>
      ),
      icon: Target,
      color: 'indigo'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex-wrap justify-between items-start">
              <div className={`p-2 rounded-lg w-10 bg-${card.color}-50 text-${card.color}-600`}>
              <card.icon size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.label}</p>
              {typeof card.value === 'string' ? (
                <h3 className="text-2xl font-black text-gray-900 mt-1">{card.value}</h3>
              ) : (
                <div className="mt-1">{card.value}</div>
              )}
            </div>
          
          </div>
        </div>
      ))}
    </div>
  );
};