import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { goalsApi, BreakdownItem, Goal, GoalDistribution } from '../services/api';
import { Info, ArrowLeft, TrendingUp, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface BreakdownRow {
  itemType: string;
  revenue: number;
  count: number;
}

interface GoalPerformance extends GoalDistribution {
  percentage: number;
}

const PERIOD_LABELS: Record<Goal['period'], string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semester: 'Semestral',
  annual: 'Anual',
};

const PERIOD_MULTIPLIERS: Record<Goal['period'], number> = {
  monthly: 12,
  quarterly: 4,
  semester: 2,
  annual: 1,
};

export const GoalBreakdownPage: React.FC = () => {
  const { id: goalId } = useParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [performanceData, setPerformanceData] = useState<GoalPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [typeItems, setTypeItems] = useState<BreakdownItem[]>([]);
  const [currency] = useState<string>('MT');

  useEffect(() => {
    if (!goalId) return;
    setLoading(true);
    Promise.all([
      goalsApi.getById(goalId),
      goalsApi.getBreakdown(goalId),
      goalsApi.getPerformance(goalId),
    ])
      .then(([g, bd, perf]) => {
        setGoal(g);
        setBreakdown(bd);
        setPerformanceData(perf);
      })
      .catch((err) => {
        console.error('Error loading breakdown data', err);
        toast.error('Erro ao carregar dados');
      })
      .finally(() => setLoading(false));
  }, [goalId]);

  useEffect(() => {
    if (selectedType && goalId) {
      goalsApi
        .getBreakdownItems(goalId, selectedType)
        .then((items) => setTypeItems(items))
        .catch((err) => {
          console.error('Failed to load items for type', err);
          toast.error('Falha ao buscar itens');
        });
    }
  }, [selectedType, goalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!goal) {
    return <p className="text-center text-red-600">Meta não encontrada</p>;
  }

  const hasCritical = performanceData.some((p) => p.healthStatus === 'critical');
  const hasAtRisk = performanceData.some((p) => p.healthStatus === 'at-risk');
  
  const periodMultiplier = PERIOD_MULTIPLIERS[goal.period];
  const periodLabel = PERIOD_LABELS[goal.period];
  const periodTarget = goal.annualTarget / periodMultiplier;

  // === CÁLCULOS CORRIGIDOS ===
  const totalRealized = breakdown.reduce((sum, b) => sum + b.revenue, 0);           // ← Usar breakdown (real)
  const overallProgress = goal.annualTarget > 0 
    ? ((totalRealized / goal.annualTarget) * 100).toFixed(1) 
    : '0';


  return (
    <div className="space-y-6 md:space-y-8 px-4 md:px-0 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Link
          to="/goals"
          className="text-blue-600 hover:underline flex items-center gap-1 text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
          Detalhes da Meta {goal.year}
        </h1>
      </div>

      {/* Goal Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Meta Anual</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {currency}
            {goal.annualTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Meta {periodLabel}</p>
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {currency}
            {periodTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

                {/* Total Realizado */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Realizado</p>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {currency}
            {totalRealized.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {periodLabel} • {breakdown.reduce((sum, b) => sum + b.count, 0).toLocaleString()} itens
          </p>
        </div>

        {/* Progresso Geral */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Progresso Geral</p>
            <Users className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {overallProgress}%
          </p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                parseFloat(overallProgress) >= 100
                  ? 'bg-green-500'
                  : parseFloat(overallProgress) >= 75
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(parseFloat(overallProgress), 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Meta Anual: MT{goal.annualTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Goal Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Período:</p>
            <p className="font-semibold text-gray-900">{periodLabel}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Valor Financeiro Base:</p>
            <p className="font-semibold text-gray-900">
              {currency}
              {goal.financialTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Contingência:</p>
            <p className="font-semibold text-gray-900">{(goal.contingencyMargin * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Estratégia:</p>
            <p className="font-semibold text-blue-700">{goal.achievementStrategy}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(hasCritical || hasAtRisk) && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 border ${
            hasCritical
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm md:text-base font-medium">
            {hasCritical
              ? 'Distribuições em estado crítico! Aja imediatamente.'
              : 'Algumas distribuições estão em risco. Monitorize.'}
          </p>
        </div>
      )}

      {/* Breakdown Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Vendas por tipo de item</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {breakdown.map((b) => (
            <div
              key={b.itemType}
              className={`p-5 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                selectedType === b.itemType ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''
              }`}
              onClick={() => setSelectedType(b.itemType)}
            >
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {b.itemType}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                {currency}
                {b.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-600 font-medium">{b.count} itens</p>
                <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Type Details */}
      {selectedType && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Top items em {selectedType}</h3>
          </div>
          <div className="overflow-x-auto">
            {typeItems.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">Nenhum item encontrado.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3 text-right">Receita</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {typeItems.map((i) => (
                    <tr key={i.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {currency}
                        {i.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{i.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Distribution Performance */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Performance por Distribuição</h2>

        {/* Table for Tablet/Desktop */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Papel</th>
                <th className="px-6 py-4">Meta Anual</th>
                <th className="px-6 py-4">Meta {periodLabel}</th>
                <th className="px-6 py-4">Realizado</th>
                <th className="px-6 py-4">Progresso</th>
                <th className="px-6 py-4 text-center">Saúde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {performanceData.map((dist) => {
                const periodDist = dist.annualTarget / periodMultiplier;
                const progress = ((dist.actualRevenue / dist.annualTarget) * 100).toFixed(1);

                return (
                  <tr key={dist._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                     {dist.role && typeof dist.role === 'object' && 'roleName' in dist.role 
                      ? dist.role.roleName 
                      : 'Utilizador'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {currency}
                      {dist.annualTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <p className="font-medium">
                        {currency}
                        {periodDist.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500">{periodLabel}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {currency}
                      {dist.actualRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              parseFloat(progress) >= 100
                                ? 'bg-green-500'
                                : parseFloat(progress) >= 75
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(parseFloat(progress), 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-10 text-right">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          dist.healthStatus === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : dist.healthStatus === 'at-risk'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {dist.healthStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Card List for Mobile */}
        <div className="md:hidden space-y-3">
          {performanceData.map((dist) => {
            const periodDist = dist.annualTarget / periodMultiplier;
            const progress = ((dist.actualRevenue / dist.annualTarget) * 100).toFixed(1);

            return (
              <div
                key={dist._id}
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-900">{dist.role?.roleName || 'Utilizador'}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      dist.healthStatus === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : dist.healthStatus === 'at-risk'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                   {dist.healthStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Meta Anual</p>
                    <p className="font-semibold text-gray-900">
                      {currency}
                      {dist.annualTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Meta {periodLabel}</p>
                    <p className="font-semibold text-blue-600">
                      {currency}
                      {periodDist.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Realizado</p>
                    <p className="font-semibold text-gray-900">
                      {currency}
                      {dist.actualRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Progresso</p>
                    <p className="font-bold text-purple-600">{progress}%</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      parseFloat(progress) >= 100
                        ? 'bg-green-500'
                        : parseFloat(progress) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(parseFloat(progress), 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};