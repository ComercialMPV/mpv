// CustomerAnalytics.tsx (corrigido - 11 de março de 2026)
// Mostra todos os clientes reais + origens corretas das vendas

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, BarChart3, PieChart as PieChartIcon, Eye } from 'lucide-react';
import { customersApi, CustomerAnalyticsResponse, CustomerSourceBreakdown, companyApi } from '../services/api';
import toast from 'react-hot-toast';
import { CustomerAnalyticsIndividual } from './CustomerAnalyticsIndividual';
import { useAuth } from '../contexts/AuthContext';

export const CustomerAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'revenue' | 'count' | 'frequency'>('revenue');
  const [currency, setCurrency] = useState<string>('MT');
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual'>('aggregate');
const isAdminOrOwner = useMemo(() => {
    const role = (user?.role?.roleName || user?.role || '').toString().toLowerCase().trim();
    return ['superadmin', 'super_admin', 'owner', 'admin'].includes(role);
  }, [user]);
  const loadData = async () => {
    try {
      setLoading(true);

      const viewParam = isAdminOrOwner ? 'all' : 'personal';

      const [analyticsRes, breakdownRes, paymentRes, settings] = await Promise.all([
        customersApi.getAnalytics(200, sortBy, viewParam),   // ← passa o view
        customersApi.getBreakdown(),
        customersApi.getPaymentAnalysis(),
        companyApi.getSettings(),
      ]);
console.log("🔍 TOP ITEMS no primeiro cliente:", 
  analyticsRes.allCustomers[0]?.topItems
);

console.log("🔍 Exemplo completo do primeiro cliente:", 
  analyticsRes.allCustomers[0]
);
      const enrichedCustomers = analyticsRes.allCustomers.map((c: any) => {
        const payment = paymentRes.find((p: any) => p.customerId === c.customerId);
        return {
          ...c,
          latePayments: payment?.latePayments || 0,
          averageDelayDays: payment?.averageDelayDays || 0,
          paymentReliability: payment?.paymentReliability || 100,
        };
      });

      const topCustomers = [...enrichedCustomers]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      const bottomCustomers = [...enrichedCustomers]
        .filter(c => c.latePayments > 0)
        .sort((a, b) => (b.averageDelayDays || 0) - (a.averageDelayDays || 0))
        .slice(0, 10);

      setData({
        ...analyticsRes,
        sourceBreakdown: breakdownRes,
        allCustomers: enrichedCustomers,
        topCustomers,
        bottomCustomers,
      });

      setCurrency(settings.currency || 'MT');

    } catch (err: any) {
      console.error("Erro ao carregar analytics:", err);
      toast.error('Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sortBy, isAdminOrOwner]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('workspaceChanged', handler);
    return () => window.removeEventListener('workspaceChanged', handler);
  }, []);

  // ────────────────────────────────────────────────
  // Helpers para exibição das origens
  // ────────────────────────────────────────────────
  const getOriginLabel = (origin?: string) => {
    if (!origin) return 'Desconhecida';
    const map: Record<string, string> = {
      POS: 'Caixa / Balcão (POS)',
      'pending-room': 'Pagamentos pendentes',
      internal: 'Interno (pelo painel de requisições)',
      external: 'Externo (Website, redes sociais, etc.)',
      Partner_Portal: 'Venda por Parceiro',
      referralPartner: 'Venda por indicação',
    };
    return map[origin] || origin;
  };

  const getOriginBadgeStyle = (origin?: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      POS: { bg: 'bg-orange-100', text: 'text-orange-800' },
      'pending-room': { bg: 'bg-purple-100', text: 'text-purple-800' },
      internal: { bg: 'bg-green-100', text: 'text-green-800' },
      external: { bg: 'bg-blue-100', text: 'text-blue-800' },
      Partner_Portal: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      referralPartner: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    };
    const s = styles[origin || ''] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `text-xs px-2.5 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`;
  };
 const getOriginBarColor = (origin: string): string => {
    const map: Record<string, string> = {
      POS: 'bg-orange-600',
      'pending-room': 'bg-purple-600',
      internal: 'bg-green-600',
      external: 'bg-blue-600',
      Partner_Portal: 'bg-indigo-600',
      referralPartner: 'bg-emerald-600',
    };
    return map[origin as keyof typeof map] || 'bg-gray-600';
  };

 // ────────────────────────────────────────────────
  // Breakdown por origem (prioriza dados do backend)
  // ────────────────────────────────────────────────
  const sourceBreakdown = useMemo<CustomerSourceBreakdown[]>(() => {
    if (data?.sourceBreakdown && Array.isArray(data.sourceBreakdown)) {
      return data.sourceBreakdown;
    }

    // Fallback (caso o backend ainda não devolva sourceBreakdown)
    if (!data?.allCustomers?.length) return [];

    const originMap = new Map<string, { revenue: number; count: number; uniqueCustomers: Set<string> }>();

    const knownOrigins = ['POS', 'pending-room', 'internal', 'external', 'Partner_Portal'];

    knownOrigins.forEach(origin => {
      originMap.set(origin, { revenue: 0, count: 0, uniqueCustomers: new Set() });
    });

    data.allCustomers.forEach(customer => {
      const origin = customer.origin || 'internal';
      if (!originMap.has(origin)) {
        originMap.set(origin, { revenue: 0, count: 0, uniqueCustomers: new Set() });
      }
      const entry = originMap.get(origin)!;

      entry.revenue += Number(customer.totalRevenue) || 0;
      entry.count += Number(customer.totalCount) || 0;
      if (customer.customerId) entry.uniqueCustomers.add(customer.customerId);
    });

    return Array.from(originMap.entries())
      .map(([origin, stats]) => ({
        origin,
        revenue: stats.revenue,
        count: stats.count,
        uniqueCustomers: stats.uniqueCustomers.size,
        percentage: data.summary.totalRevenue > 0
          ? Math.round((stats.revenue / data.summary.totalRevenue) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  // ────────────────────────────────────────────────
  // Insights realistas baseados nos dados reais
  // ────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!sourceBreakdown.length || !data) return [];

    const sortedByAvg = [...sourceBreakdown].sort((a, b) =>
      (b.revenue / (b.count || 1)) - (a.revenue / (a.count || 1))
    );

    const best = sortedByAvg[0];
    const worst = sortedByAvg[sortedByAvg.length - 1];

    const messages = [];

    if (best.count > 0) {
      messages.push(
        `✅ ${getOriginLabel(best.origin)} tem o maior ticket médio (${currency}${Math.round(best.revenue / best.count)} por cliente). Vale a pena investir mais aqui.`
      );
    }

    if (worst.count > 0 && worst.percentage < 5) {
      messages.push(
        `⚠️ ${getOriginLabel(worst.origin)} representa apenas ${worst.percentage.toFixed(1)}% da receita com ${worst.count} cliente(s). Pode precisar de mais atenção ou revisão estratégica.`
      );
    }

    if (data.summary.totalCustomers > 0) {
      messages.push(
        `Total de clientes únicos: ${data.summary.totalCustomers} • Receita média por cliente: ${currency}${Math.round(data.summary.totalRevenue / data.summary.totalCustomers)}`
      );
    }

    return messages.length > 0 ? messages : ['Dados insuficientes para gerar insights relevantes.'];
  }, [sourceBreakdown, data, currency]);

  // Ordenação local baseada no filtro selecionado
const sortedCustomers = useMemo(() => {
  if (!data?.allCustomers?.length) return [];

  const customers = [...data.allCustomers];

  switch (sortBy) {
    case 'revenue':
      return customers.sort((a, b) => b.totalRevenue - a.totalRevenue);

    case 'count':
      return customers.sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0));

    case 'frequency':
      return customers.sort((a, b) => 
        (b.purchaseFrequency || 0) - (a.purchaseFrequency || 0)
      );

    default:
      return customers;
  }
}, [data?.allCustomers, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-red-600">
        Não foi possível carregar os dados. Tente novamente mais tarde.
      </div>
    );
  }

  if (viewMode === 'individual') {
    return <CustomerAnalyticsIndividual onBack={() => setViewMode('aggregate')} />;
  }

  const { summary, topCustomers, bottomCustomers, allCustomers } = data;

  const pageTitle = isAdminOrOwner 
    ? "Métricas de Rentabilidade — Clientes" 
    : "Minha Performance — Clientes Atendidos";

  const subtitle = isAdminOrOwner 
    ? "Análise completa da empresa" 
    : "Apenas as vendas e clientes que você atendeu";

  return (
    <div className="space-y-8 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {pageTitle}
          </h1>
          <p className="text-gray-600 mt-1">
            {subtitle}
          </p>
        </div>
        <button
          onClick={() => setViewMode('individual')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <Eye size={18} />
          Ver análise individual
        </button>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currency} {summary.totalRevenue.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-green-500 opacity-30" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Clientes Registados</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.totalCustomers.toLocaleString('pt-MZ')}
              </p>
            </div>
            <Users className="h-10 w-10 text-blue-500 opacity-30" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Todos os clientes únicos</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">LTV Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currency} {Math.round(summary.avgLTV).toLocaleString('pt-MZ')}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-500 opacity-30" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currency} {summary.avgAOV.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <BarChart3 className="h-10 w-10 text-amber-500 opacity-30" />
          </div>
        </div>
      </div>

      {/* Distribuição + Insights */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Distribuição de Origem */}
        {/* Distribuição de Origem */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <PieChartIcon size={20} />
            Distribuição por ponto de venda (origem da venda)
          </h2>

          <div className="space-y-5">
            {sourceBreakdown.map(item => (
              <div key={item.origin} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{getOriginLabel(item.origin)}</span>
                  <span className="font-semibold">{item.percentage.toFixed(1)}%</span>
                </div>

                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getOriginBarColor(item.origin)}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {currency}{item.revenue.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
                  </span>
                  <span>
                    {item.count} venda{item.count !== 1 ? 's' : ''} • 
                    {item.uniqueCustomers || 0} cliente{item.uniqueCustomers !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo + Insights */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-5">Resumo & Insights por Origem</h2>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Transações totais</p>
                <p className="font-bold text-lg">{summary.totalTransactions.toLocaleString('pt-MZ')}</p>
              </div>
              <div>
                <p className="text-gray-600">Clientes únicos</p>
                <p className="font-bold text-lg">{summary.totalCustomers.toLocaleString('pt-MZ')}</p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="font-medium mb-2">Observações principais:</p>
              <ul className="space-y-2.5 text-gray-700">
                {insights.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Melhores e Piores Clientes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Melhores */}
        {/* Melhores Clientes - Versão Melhorada + Scroll */}
<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-green-700">
    <TrendingUp size={20} />
    Melhores Clientes
  </h2>

  <div className="space-y-5 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
    {topCustomers.map((c, idx) => (
      <div 
        key={c.customerId} 
        className="border border-gray-100 rounded-xl p-5 hover:border-green-200 hover:shadow-sm transition-all duration-200"
      >
        {/* Cabeçalho do Cliente */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="font-semibold text-base leading-tight">
              {c.customerName || `Cliente ${c.customerId?.slice(-6)}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {c.totalCount} compras • {getOriginLabel(c.origin)}
            </p>
          </div>

          <div className="text-right">
            <p className="font-bold text-green-700 text-xl">
              {currency} {c.totalRevenue.toLocaleString('pt-MZ')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Ticket médio: {currency} {c.avgOrderValue?.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Top Items - Scrollable Horizontal */}
        {c.topItems && c.topItems.length > 0 && (
          <div className="mt-2 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">
              Produtos/Serviços mais comprados
            </p>
            
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {c.topItems.slice(0, 6).map((item, i) => (
                <div
                  key={i}
                  className="min-w-[180px] bg-gray-50 border border-gray-100 rounded-xl p-3 snap-start hover:bg-white hover:border-green-100 transition-colors"
                >
                  <p className="font-medium text-sm line-clamp-2 leading-tight">
                    {item.name}
                  </p>
                  <div className="mt-2 flex justify-between items-end">
                    <div>
                      <span className="text-green-600 font-semibold">×{item.quantity}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-700 text-sm">
                        {currency}{item.totalSpent.toLocaleString('pt-MZ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!c.topItems || c.topItems.length === 0) && (
          <p className="text-xs text-gray-400 italic mt-2">Sem itens detalhados disponíveis</p>
        )}
      </div>
    ))}

    {topCustomers.length === 0 && (
      <div className="text-center py-12 text-gray-500">
        Nenhum cliente com receita registrada
      </div>
    )}
  </div>

  {/* Indicador de scroll */}
  {topCustomers.length > 3 && (
    <p className="text-center text-[10px] text-gray-400 mt-3">
      ↓ Arraste para ver mais clientes ↓
    </p>
  )}
</div>

        {/* Piores (mais atrasos) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
         <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-red-700">
          <TrendingDown size={20} />
          Clientes com Mais Atrasos
          <span className="text-xs font-normal text-red-500 ml-2">
            (ordenado por dias médios de atraso)
          </span>
        </h2>
          <div className="space-y-4">
            {bottomCustomers.map((c, idx) => (
              <div key={c.customerId} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{c.customerName || `Cliente ${c.customerId?.slice(-6)}`}</p>
                 <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                  {getOriginLabel(c.origin)}
                  <span className="text-red-600 font-medium">
                    • {c.averageDelayDays || 0} dias médios de atraso
                  </span>
                </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-700">
                    {currency}{c.totalRevenue.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.avgOrderValue.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
            {bottomCustomers.length === 0 && (
              <p className="text-gray-500 text-center py-8">Nenhum cliente com atrasos significativos</p>
            )}
          </div>
        </div>
      </div>

     {/* Todos os Clientes */}
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
  <div className="p-6 border-b bg-gray-50">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h2 className="text-lg font-semibold">Todos os Clientes</h2>
      
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'revenue', label: 'Receita Total' },
          { key: 'count', label: 'Nº de Compras' },
          { key: 'frequency', label: 'Frequência' }
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key as 'revenue' | 'count' | 'frequency')}
            className={`px-5 py-2 text-sm rounded-xl font-medium transition-all ${
              sortBy === opt.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  </div>

  {/* Desktop Table */}
  <div className="hidden md:block overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-4 text-left font-semibold text-gray-700">Cliente</th>
          <th className="px-6 py-4 text-left font-semibold text-gray-700">Origem</th>
          <th className="px-6 py-4 text-right font-semibold text-gray-700">Receita Total</th>
          <th className="px-6 py-4 text-right font-semibold text-gray-700">Compras</th>
          <th className="px-6 py-4 text-right font-semibold text-gray-700">Ticket Médio</th>
          <th className="px-6 py-4 text-right font-semibold text-gray-700">Frequência</th>
          <th className="px-6 py-4 text-center font-semibold text-gray-700">Última Compra</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {sortedCustomers.map(c => (
          <tr key={c.customerId} className="hover:bg-gray-50/70 transition-colors">
            <td className="px-6 py-4 font-medium">
              {c.customerName || `Cliente ${c.customerId?.slice(-8) || '—'}`}
            </td>
            <td className="px-6 py-4">
              <span className={getOriginBadgeStyle(c.origin)}>
                {getOriginLabel(c.origin)}
              </span>
            </td>
            <td className="px-6 py-4 text-right font-semibold text-blue-700">
              {currency} {c.totalRevenue.toLocaleString('pt-MZ')}
            </td>
            <td className="px-6 py-4 text-right font-medium">{c.totalCount}</td>
            <td className="px-6 py-4 text-right">
              {currency} {c.avgOrderValue.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })}
            </td>
            <td className="px-6 py-4 text-right font-medium">
              {c.purchaseFrequency ? c.purchaseFrequency.toFixed(2) : '—'}×
            </td>
            <td className="px-6 py-4 text-center text-xs text-gray-500">
              {c.lastSale ? new Date(c.lastSale).toLocaleDateString('pt-PT') : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Mobile Cards */}
  <div className="md:hidden divide-y">
    {sortedCustomers.map(c => (
      <div key={c.customerId} className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-semibold text-base">
              {c.customerName || `Cliente ${c.customerId?.slice(-8)}`}
            </p>
            <span className={`inline-block mt-1 ${getOriginBadgeStyle(c.origin)}`}>
              {getOriginLabel(c.origin)}
            </span>
          </div>
          <p className="font-bold text-blue-700 text-lg">
            {currency} {c.totalRevenue.toLocaleString('pt-MZ')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Compras</p>
            <p className="font-medium">{c.totalCount}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Ticket Médio</p>
            <p className="font-medium">
              {currency} {c.avgOrderValue.toLocaleString('pt-MZ')}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Frequência</p>
            <p className="font-medium">{c.purchaseFrequency?.toFixed(2) || '—'}× / dia</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Última compra</p>
            <p className="font-medium text-xs">
              {c.lastSale ? new Date(c.lastSale).toLocaleDateString('pt-PT') : '—'}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>

  {sortedCustomers.length === 0 && (
    <div className="p-12 text-center text-gray-500">
      Nenhum cliente encontrado
    </div>
  )}
</div>
    </div>
  );
};