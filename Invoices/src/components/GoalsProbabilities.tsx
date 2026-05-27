import React, { useEffect, useState } from 'react';
import { goalsApi, Goal, GoalDistribution, BreakdownItem, api } from '../services/api';
import { TrendingUp, AlertCircle, Package, Users, Target, Gift, Repeat, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProbabilityAnalysis {
  itemType: string;
  currentCount: number;
  currentRevenue: number;
  requiredRevenue: number;
  requiredCount: number;
  gap: number;
  gapPercentage: number;
  items: BreakdownItem[];
}

interface RoleContribution {
  role: string;
  annualTarget: number;
  periodTarget: number;
  percentage: number;
  requiredRevenue: number;
  itemTypeBreakdown: {
    itemType: string;
    target: number;
    requiredCount: number;
  }[];
}

interface AllItemsProjection {
  type: 'Product' | 'Service' | 'Combo' | 'Subscription';
  name: string;
  price: number;
  unit: string;
  requiredRevenue: number;
  requiredUnits: number;
  weight: string;
}

interface GoalsProbabilitiesProps {
  goalId: string;
  goal: Goal;
  distributions: GoalDistribution[];
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

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  Product: <Package className="w-4 h-4 text-purple-600" />,
  Service: <Users className="w-4 h-4 text-blue-600" />,
  Combo: <Gift className="w-4 h-4 text-pink-600" />,
  Subscription: <Repeat className="w-4 h-4 text-teal-600" />,
};

export const GoalsProbabilities: React.FC<GoalsProbabilitiesProps> = ({
  goalId,
  goal,
  distributions,
}) => {
  const [analysis, setAnalysis] = useState<ProbabilityAnalysis[]>([]);
  const [roleContributions, setRoleContributions] = useState<RoleContribution[]>([]);
  const [allItemsProjection, setAllItemsProjection] = useState<AllItemsProjection[]>([]);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const periodMultiplier = PERIOD_MULTIPLIERS[goal.period];
  const periodLabel = PERIOD_LABELS[goal.period];
  const periodTarget = goal.annualTarget / periodMultiplier;
  const getEffortFactor = (price: number): number => {
  if (price >= 50000) return 2.5; // Complexo: maior ciclo de venda
  if (price >= 20000) return 1.8; // Médio-Alto
  if (price >= 5000) return 1.3;  // Médio
  return 1.0;                     // Simples
};
const getImportanceLevel = (revenue: number, totalTarget: number) => {
  const percent = (revenue / totalTarget) * 100;
  if (percent >= 40) return { label: 'Crítico', color: 'text-red-600' };
  if (percent >= 20) return { label: 'Elevado', color: 'text-orange-600' };
  return { label: 'Estável', color: 'text-teal-600' };
};

// Cálculo de dias no período (assumindo que você tem essa variável ou pode calcular)
const diasNoPeriodo = 30;
// Agrupa os itens da projeção pelo seu tipo (Product, Service, etc.)
const groupedItems = allItemsProjection.reduce((acc, item) => {
  if (!acc[item.type]) acc[item.type] = [];
  acc[item.type].push(item);
  return acc;
}, {} as Record<string, AllItemsProjection[]>);

  useEffect(() => {
    if (!goalId) return;

    const loadMainAnalysis = async () => {
      try {
        setLoading(true);

        const breakdown = await goalsApi.getBreakdown(goalId);
        const typeItems: Record<string, BreakdownItem[]> = {};

        for (const bd of breakdown) {
          try {
            const items = await goalsApi.getBreakdownItems(goalId, bd.itemType);
            typeItems[bd.itemType] = items;
          } catch (err) {
            console.error(`Failed to load items for ${bd.itemType}`, err);
            typeItems[bd.itemType] = [];
          }
        }

        const analysisData: ProbabilityAnalysis[] = breakdown.map((bd) => {
          const gap = periodTarget - bd.revenue;
          const gapPercentage = periodTarget > 0 ? (gap / periodTarget) * 100 : 0;

          const items = typeItems[bd.itemType] || [];
          const avgPrice =
            items.length > 0
              ? items.reduce((sum, item) => sum + (item.revenue / item.count), 0) / items.length
              : 0;

          const requiredCount = avgPrice > 0 ? Math.ceil(Math.max(0, gap) / avgPrice) : 0;

          return {
            itemType: bd.itemType,
            currentCount: bd.count,
            currentRevenue: bd.revenue,
            requiredRevenue: periodTarget,
            requiredCount,
            gap: Math.max(0, gap),
            gapPercentage: Math.max(0, gapPercentage),
            items,
          };
        });

        setAnalysis(analysisData);

        // Role contributions (mantido igual)
        const roleData: RoleContribution[] = distributions.map((dist) => {
          const requiredRevenuePeriod = dist.annualTarget / periodMultiplier;

          const itemTypeBreakdown = dist.itemTypeTargets
            ? dist.itemTypeTargets.map((target) => {
                const type = analysisData.find((a) => a.itemType === target.itemType);
                const avgPrice = type
                  ? type.items.reduce((sum, item) => sum + (item.revenue / item.count), 0) /
                    type.items.length
                  : 0;

                const requiredCount = avgPrice > 0 ? Math.ceil(target.target / avgPrice) : 0;

                return {
                  itemType: target.itemType,
                  target: target.target,
                  requiredCount,
                };
              })
            : [];

          const percentage = (dist.annualTarget / goal.annualTarget) * 100;

          return {
            role: dist.role || 'Utilizador Específico',
            annualTarget: dist.annualTarget,
            periodTarget: requiredRevenuePeriod,
            percentage,
            requiredRevenue: requiredRevenuePeriod,
            itemTypeBreakdown,
          };
        });

        setRoleContributions(roleData);
      } catch (err) {
        console.error('Error loading main analysis', err);
        toast.error('Erro ao carregar análise baseada em vendas');
      } finally {
        setLoading(false);
      }
    };

    loadMainAnalysis();
  }, [goalId, goal.annualTarget, goal.period, distributions]);

  // Carregar a projeção de todos os itens (separado)
useEffect(() => {
  if (!goalId) {
    console.warn("Nenhum goalId fornecido → não vou tentar carregar projeção");
    return;
  }

 const loadAllItemsProjection = async () => {
  try {
    setProjectionLoading(true); // Certifique-se de usar o estado de carregamento correto
    const response = await goalsApi.getAllItemsProjection(goalId);
    
    // Supondo que a API retorne um objeto com a propriedade 'items'
    // Ajuste conforme a estrutura real que sua API retorna
    if (response && response.items) {
      setAllItemsProjection(response.items);
    } else {
      setAllItemsProjection([]);
    }
  } catch (error: any) {
    console.error('[Projeção] Falha:', error);
    toast.error('Erro ao carregar dados de projeção');
  } finally {
    setProjectionLoading(false);
  }
};

  loadAllItemsProjection();
}, [goalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
function getRoleDisplayName(role: any): string {
  if (!role) return 'Sem cargo definido';
  if (typeof role === 'string') return role;
  if (typeof role === 'object') {
    return role.roleName || role.name || role.title || 'Cargo sem nome';
  }
  return '—';
}
  const totalCurrentRevenue = analysis.reduce((sum, a) => sum + a.currentRevenue, 0);
  const totalGap = Math.max(0, periodTarget - totalCurrentRevenue);
  const totalGapPercentage = periodTarget > 0 ? (totalGap / periodTarget) * 100 : 0;
  return (
   <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          Análise de Prospecção de Vendas
        </h2>
        <p className="text-gray-600">
          Projeção necessária para atingir a meta {periodLabel} de{' '}
          <strong className="text-blue-700">
            MT{periodTarget.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
          </strong>
        </p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Meta */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Meta {periodLabel}</h3>
          <p className="text-3xl font-bold text-blue-900">
            MT{periodTarget.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Realizado */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
          <h3 className="text-sm font-semibold text-green-900 mb-1">Realizado</h3>
          <p className="text-3xl font-bold text-green-900">
            MT{totalCurrentRevenue.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Gap */}
        <div
          className={`rounded-xl border p-6 ${
            totalGapPercentage > 30
              ? 'bg-red-50 border-red-200'
              : totalGapPercentage > 15
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-1 ${
              totalGapPercentage > 30
                ? 'text-red-800'
                : totalGapPercentage > 15
                ? 'text-yellow-800'
                : 'text-green-800'
            }`}
          >
            Gap restante
          </h3>
          <p
            className={`text-3xl font-bold ${
              totalGapPercentage > 30
                ? 'text-red-700'
                : totalGapPercentage > 15
                ? 'text-yellow-700'
                : 'text-green-700'
            }`}
          >
            MT{totalGap.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm mt-1 opacity-80">
            {totalGapPercentage.toFixed(1)}% da meta
          </p>
        </div>
      </div>

      {/* Análise por Tipo de Item */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Análise por Tipo de Item
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Clique em cada tipo para ver detalhes de quantidades específicas por item
          </p>
        </div>

       <div className="divide-y divide-gray-100">
  {analysis.length === 0 ? (
    <p className="p-6 text-center text-gray-500">Nenhum tipo disponível</p>
  ) : (
    analysis.map((item) => {
      // === CÁLCULOS PROPORCIONAIS CORRETOS ===
      const totalCurrentAllTypes = analysis.reduce((sum, a) => sum + a.currentRevenue, 0);
      const weight = totalCurrentAllTypes > 0 ? item.currentRevenue / totalCurrentAllTypes : 0;

      const proportionalTarget = Math.round(periodTarget * weight);           // Meta deste grupo
      const proportionalGap = Math.max(0, proportionalTarget - item.currentRevenue);
      const gapPercentage = proportionalTarget > 0 ? (proportionalGap / proportionalTarget) * 100 : 0;

      // Preço médio dos itens deste grupo
      const avgPrice = item.items.length > 0
        ? item.items.reduce((sum, p) => sum + (p.revenue / p.count), 0) / item.items.length
        : 0;

      const requiredCount = avgPrice > 0 ? Math.ceil(proportionalGap / avgPrice) : 0;

      // Top 3 prioridades (proporcional ao gap deste grupo)
      const topItems = item.items
        .map((product) => {
          const unitPrice = product.count > 0 ? product.revenue / product.count : 0;
          const itemShare = item.currentRevenue > 0 ? product.revenue / item.currentRevenue : 0;
          const proportionalRequired = Math.ceil(requiredCount * itemShare);
          return { product, proportionalRequired, unitPrice };
        })
        .filter((ti) => ti.proportionalRequired > 0)
        .sort((a, b) => b.proportionalRequired - a.proportionalRequired)
        .slice(0, 3);

      return (
        <div
          key={item.itemType}
          className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() =>
            setExpandedType(expandedType === item.itemType ? null : item.itemType)
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {item.itemType}
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Vendido Actualmente</p>
                  <p className="text-sm font-semibold text-gray-900">
                    MT{item.currentRevenue.toLocaleString('pt-MZ')}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {item.currentCount.toLocaleString()} unidades
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Meta {periodLabel} (proporcional)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    MT{proportionalTarget.toLocaleString('pt-MZ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gap Restante</p>
                  <p className="text-sm font-bold text-red-600">
                    MT{proportionalGap.toLocaleString('pt-MZ')}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {gapPercentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Unidades Necessárias</p>
                  <p className="text-sm font-bold text-blue-600">
                    +{requiredCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {topItems.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">
                    🎯 Top Prioridades:
                  </p>
                  <div className="space-y-1">
                    {topItems.map((ti, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-blue-900">
                          <span className="font-bold">{ti.product.name}</span> –
                        </span>
                        <span className="font-bold text-blue-600">
                          {ti.proportionalRequired.toLocaleString()} unid.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {gapPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">gap</p>
              <p className="text-sm text-gray-600 mt-3 cursor-pointer text-blue-600 font-semibold">
                {expandedType === item.itemType ? '▼ Menos' : '▶ Mais detalhes'}
              </p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  gapPercentage <= 10
                    ? 'bg-green-500'
                    : gapPercentage <= 25
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, 100 - gapPercentage)}%` }}
              />
            </div>
          </div>

          {/* Detalhes expandidos */}
          {expandedType === item.itemType && item.items.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Itens prioritários para cobrir o gap de MT{proportionalGap.toLocaleString('pt-MZ')}
              </p>

              <div className="space-y-3">
                {item.items
                  .map((product) => {
                    const unitPrice = product.count > 0 ? product.revenue / product.count : 0;
                    const itemShare = item.currentRevenue > 0 ? product.revenue / item.currentRevenue : 0;
                    const proportionalRequired = Math.ceil(requiredCount * itemShare);

                    return {
                      product,
                      unitPrice,
                      proportionalRequired,
                    };
                  })
                  .filter((it) => it.proportionalRequired > 0)
                  .sort((a, b) => b.proportionalRequired - a.proportionalRequired)
                  .map((it, idx) => {
                    const { product, unitPrice, proportionalRequired } = it;
                    const isHighPriority = proportionalRequired >= 10;

                    return (
                      <div
                        key={`${product.name}-${idx}`}
                        className={`p-4 rounded-lg border-l-4 flex justify-between items-center ${
                          isHighPriority ? 'bg-red-50 border-l-red-500' : 'bg-gray-50 border-l-blue-500'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-900">{product.name}</p>
                            {isHighPriority && (
                              <span className="px-2 py-0.5 bg-red-200 text-red-700 text-xs font-bold rounded">
                                PRIORIDADE
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 flex flex-wrap gap-4">
                            <span>Preço unit.: MT{unitPrice.toFixed(2)}</span>
                            <span>Vendidas: {product.count.toLocaleString()}</span>
                            <span>Faturado: MT{product.revenue.toLocaleString('pt-MZ')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-600">
                            +{proportionalRequired.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-600">unidades</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      );
    })
  )}
</div>
      </div>

      {/* Contribuição por Papel */}
      {roleContributions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Contribuição por Papel
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Papel</th>
                  <th className="px-6 py-4">Meta Anual</th>
                  <th className="px-6 py-4">Meta {periodLabel}</th>
                  <th className="px-6 py-4">% da Meta Total</th>
                  <th className="px-6 py-4">Itens Prioritários</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
  {roleContributions.map((role) => (
    <tr key={typeof role.role === 'object' ? role.role._id : role.role} className="hover:bg-gray-50 transition-colors">
    <td className="px-6 py-4 font-semibold text-gray-900">
  {(() => {
    if (!role.role) return 'Sem atribuição';
    if (typeof role.role === 'string') return role.role;
    if (typeof role.role === 'object') {
      return (
        (role.role as any).roleName ||
        (role.role as any).name ||
        (role.role as any).title ||
        'Cargo sem nome'
      );
    }
    return '—';
  })()}
</td>
      <td className="px-6 py-4">
        MT{role.annualTarget.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
      </td>
      <td className="px-6 py-4 text-blue-600 font-medium">
        MT{role.periodTarget.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(role.percentage, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {role.percentage.toFixed(1)}%
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {role.itemTypeBreakdown.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {role.itemTypeBreakdown.map((item) => (
              <span
                key={item.itemType}
                className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium"
              >
                {item.itemType}: +{item.requiredCount.toLocaleString()}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-500 text-sm">—</span>
        )}
      </td>
    </tr>
  ))}
</tbody>
            </table>
          </div>
        </div>
      )}

{/* 2. Nova secção: Projeção Ideal Agrupada */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  <div className="p-6 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <Layers className="w-5 h-5 text-teal-600" />
      Projeção Ideal Agrupada — Meta {periodLabel}
    </h3>
    <p className="text-sm text-gray-600 mt-1">
      Distribuição probabilística para atingir exatamente a meta {periodLabel} de MT{periodTarget.toLocaleString('pt-MZ')}
    </p>
  </div>

  <div className="divide-y divide-gray-200">
    {Object.entries(groupedItems).map(([type, items]) => {
      const isExpanded = expandedType === type;

      // Cálculo total do grupo (baseado no weight de cada item)
      const groupTotalRevenue = items.reduce((sum, item) => {
        const weight = parseFloat(item.weight.replace('%', '')) / 100 || 0;
        return sum + (periodTarget * weight);
      }, 0);

      const groupTotalUnits = items.reduce((sum, item) => {
        const weight = parseFloat(item.weight.replace('%', '')) / 100 || 0;
        const effort = getEffortFactor(item.price);
        const unitsNeeded = Math.ceil(((periodTarget * weight) / item.price) * effort);
        return sum + unitsNeeded;
      }, 0);

      const dailyProjection = diasNoPeriodo > 0 
        ? (groupTotalUnits / diasNoPeriodo).toFixed(1) 
        : '0';

      const impactPercentage = periodTarget > 0 
        ? ((groupTotalRevenue / periodTarget) * 100).toFixed(1) 
        : '0';

      return (
        <div key={type}>
          {/* Header do Grupo */}
          <div 
            className="p-6 bg-white hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
            onClick={() => setExpandedType(isExpanded ? null : type)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{type}</h4>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getImportanceLevel(groupTotalRevenue, periodTarget).color} bg-gray-100`}>
                  {getImportanceLevel(groupTotalRevenue, periodTarget).label}
                </span>
              </div>
              <span className="text-sm text-gray-500 font-medium">
                {isExpanded ? '▼ Ocultar' : '▶ Detalhar'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Lucro Potencial ({periodLabel})</p>
                <p className="text-sm font-bold text-gray-900">
                  MT{groupTotalRevenue.toLocaleString('pt-MZ')}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Projeção Diária</p>
                <p className="text-sm font-bold text-blue-700">
                  {dailyProjection} unid./dia
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Impacto na Meta {periodLabel}</p>
                <p className="text-sm font-bold text-purple-700">
                  {impactPercentage}%
                </p>
              </div>
            </div>
          </div>

          {/* Itens do Grupo (Expandível) */}
          {isExpanded && (
            <div className="bg-gray-50 px-6 pb-6 space-y-3">
              {items.map((item, idx) => {
                const weightPercent = parseFloat(item.weight.replace('%', '')) || 0;
                const weight = weightPercent / 100;
                const effort = getEffortFactor(item.price);

                // Cálculo probabilístico correto baseado no periodTarget
                const revenueShare = periodTarget * weight;
                const units = Math.ceil((revenueShare / item.price) * effort);

                return (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Peso: {weightPercent.toFixed(1)}% • Preço: MT{item.price.toLocaleString('pt-MZ')} • Esforço: {effort.toFixed(1)}x
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">+{units.toLocaleString()} unidades</p>
                      <p className="text-xs text-gray-600">
                        MT{(units * item.price).toLocaleString('pt-MZ')} ({(revenueShare).toLocaleString('pt-MZ')} MT)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>
    {/* Insights */}
{analysis.length > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3">
    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
      <AlertCircle className="w-5 h-5" />
      Insights Principais
    </h3>
    <ul className="space-y-2 text-sm text-blue-800">
      {analysis
        .filter((a) => {
          // Recalcula o gapPercentage proporcional (mesma lógica da secção anterior)
          const totalCurrentAllTypes = analysis.reduce((sum, b) => sum + b.currentRevenue, 0);
          const weight = totalCurrentAllTypes > 0 ? a.currentRevenue / totalCurrentAllTypes : 0;
          const proportionalTarget = Math.round(periodTarget * weight);
          const proportionalGap = Math.max(0, proportionalTarget - a.currentRevenue);
          const gapPercentage = proportionalTarget > 0 ? (proportionalGap / proportionalTarget) * 100 : 0;

          return gapPercentage > 15;
        })
        .map((a) => {
          // Recálculo proporcional para mostrar valores corretos
          const totalCurrentAllTypes = analysis.reduce((sum, b) => sum + b.currentRevenue, 0);
          const weight = totalCurrentAllTypes > 0 ? a.currentRevenue / totalCurrentAllTypes : 0;
          const proportionalTarget = Math.round(periodTarget * weight);
          const proportionalGap = Math.max(0, proportionalTarget - a.currentRevenue);
          const gapPercentage = proportionalTarget > 0 ? (proportionalGap / proportionalTarget) * 100 : 0;

          const avgPrice = a.items.length > 0
            ? a.items.reduce((sum, p) => sum + (p.revenue / p.count), 0) / a.items.length
            : 0;

          const requiredCount = avgPrice > 0 ? Math.ceil(proportionalGap / avgPrice) : 0;

          return (
            <li key={a.itemType}>
              • <span className="font-medium">{a.itemType}</span> precisa de mais{' '}
              <span className="font-semibold">{gapPercentage.toFixed(1)}%</span> da sua meta proporcional (
              <span className="font-semibold">{requiredCount.toLocaleString()} unidades adicionais</span>)
            </li>
          );
        })}

      {roleContributions.length > 0 && (
        <li>
          • Maior responsabilidade: {' '}
          <span className="font-medium">
            {(() => {
              const top = roleContributions.reduce((prev, curr) =>
                curr.percentage > prev.percentage ? curr : prev
              );
              return getRoleDisplayName(top.role);
            })()}
          </span>{' '}
          ({roleContributions.reduce((prev, curr) =>
            curr.percentage > prev.percentage ? curr : prev
          ).percentage.toFixed(1)}% da meta total)
        </li>
      )}
    </ul>
  </div>
)}
    </div>
  );
};

function setProjectionData(data: any) {
  throw new Error('Function not implemented.');
}
