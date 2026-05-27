import React, { useState, useEffect } from 'react';
import { 
  Loader2, DollarSign, Users, Clock, CheckCircle2, 
  AlertCircle, TrendingUp, FileText, Filter, RefreshCw, Search,
  ChevronLeft, ChevronRight, X, CheckSquare, Square
} from 'lucide-react';
import { commissionsApi } from '../services/api';
import toast from 'react-hot-toast';
import { format, subMonths, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { pt } from 'date-fns/locale';
import ReactECharts from 'echarts-for-react';

interface CommissionUserSummary {
  user: { _id: string; name: string; email: string };
  totalCommission: number;
  totalQty: number;
  count: number;
  pending: number;
  approved: number;
}

interface CommissionRuleSummary {
  rule: { _id: string; name: string; targetType: string };
  totalCommission: number;
  totalQty: number;
  count: number;
}

interface CommissionTransaction {
  _id: string;
  user?: { name: string; email: string };
  sale?: { _id: string; total: number; createdAt: string };
  commissionAmount: number;
  baseAmount: number;
  status: string;
  createdAt: string;
  appliedRule?: { name?: string; targetType?: string };
  tierApplied?: { commissionType: string; value: number };
  quantityContributed?: number;
  cumulativeQuantity?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const AdminCommissionsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [globalSummary, setGlobalSummary] = useState<Record<string, { count: number; total: number }>>({});
  const [topUsers, setTopUsers] = useState<CommissionUserSummary[]>([]);
  const [topRules, setTopRules] = useState<CommissionRuleSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    pages: 1,
    hasNext: false,
    hasPrev: false
  });

  // Filtros
  const [userFilter, setUserFilter] = useState<string>('');
  const [ruleFilter, setRuleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('last3months');

  // Seleção em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [selectedTx, setSelectedTx] = useState<CommissionTransaction | null>(null);

  const loadData = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);

      let periodStartDate: string | undefined;
      const now = new Date();

      if (periodFilter === 'lastmonth') periodStartDate = subMonths(now, 1).toISOString().split('T')[0];
      else if (periodFilter === 'last3months') periodStartDate = subMonths(now, 3).toISOString().split('T')[0];
      else if (periodFilter === 'last6months') periodStartDate = subMonths(now, 6).toISOString().split('T')[0];
      else if (periodFilter === 'last12months') periodStartDate = subMonths(now, 12).toISOString().split('T')[0];

      const response = await commissionsApi.getAdminCommissionSummary({
        userId: userFilter || undefined,
        ruleId: ruleFilter || undefined,
        status: statusFilter,
        periodStart: periodStartDate,
        page: pageNum,
        limit: pagination.limit
      });

      setTransactions(response.transactions || []);
      setGlobalSummary(response.globalSummary || {});
      setTopUsers(response.topUsers || []);
      setTopRules(response.topRules || []);
      setPagination(response.pagination || {
        page: 1,
        limit: 15,
        total: 0,
        pages: 1,
        hasNext: false,
        hasPrev: false
      });

      // Limpa seleção ao mudar filtros
      setSelectedIds([]);

    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao carregar dados de comissões';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [userFilter, ruleFilter, statusFilter, periodFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      loadData(newPage);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace('MZN', 'MT');

  const formatDate = (dateStr?: string) =>
    dateStr ? format(new Date(dateStr), "dd MMM yyyy", { locale: pt }) : '—';

  // Totais globais
  const pendingTotal = globalSummary.pending?.total || 0;
  const approvedTotal = globalSummary.approved?.total || 0;
  const paidTotal = globalSummary.paid?.total || 0;

  // Gráfico de evolução (agrupado por mês/trimestre/ano)
  const chartData = React.useMemo(() => {
    const grouped: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.status !== 'pending') {
        const date = new Date(tx.createdAt);
        let key: string;

        if (periodFilter.includes('month')) {
          key = format(startOfMonth(date), 'MMM yyyy', { locale: pt });
        } else if (periodFilter.includes('quarter')) {
          key = format(startOfQuarter(date), 'QQQ yyyy', { locale: pt });
        } else {
          key = format(startOfYear(date), 'yyyy');
        }

        grouped[key] = (grouped[key] || 0) + tx.commissionAmount;
      }
    });

    return Object.entries(grouped)
      .map(([period, value]) => ({ period, value }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions, periodFilter]);

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => `${params[0].name}<br/>Comissão: ${formatCurrency(params[0].value)}`
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: chartData.map(d => d.period) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value} MT' } },
    series: [{
      name: 'Comissão',
      type: 'line',
      smooth: true,
      data: chartData.map(d => d.value),
      itemStyle: { color: '#4f46e5' },
      areaStyle: { color: '#4f46e5', opacity: 0.2 }
    }]
  };

  // Ações em lote
  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.filter(t => t.status === 'pending').length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.filter(t => t.status === 'pending').map(t => t._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

 const handleBatchAction = async (action: 'approve' | 'pay' | 'reject') => {
  if (selectedIds.length === 0) {
    toast.error('Selecione pelo menos uma transação');
    return;
  }

  const actionText = 
    action === 'approve' ? 'aprovar' : 
    action === 'pay' ? 'marcar como pago' : 'rejeitar';

  if (!window.confirm(`Tem certeza que deseja ${actionText} ${selectedIds.length} transação(ões)?`)) {
    return;
  }

  setBatchLoading(true);

  try {
    await commissionsApi.batchUpdateCommissions({
      ids: selectedIds,
      action,
      // approvedBy não é necessário enviar do frontend
      // o backend vai usar req.user._id automaticamente
      ...(action === 'reject' && { notes: 'Rejeitado via dashboard admin' })
    });

    toast.success(`Transações ${actionText} com sucesso!`);
    
    setSelectedIds([]);
    loadData(pagination.page);        // recarrega a página atual

  } catch (err: any) {
    console.error('Batch error full:', err);
    
    const errorMsg = err.response?.data?.message 
      || err.message 
      || 'Erro ao processar lote';

    toast.error(errorMsg);
  } finally {
    setBatchLoading(false);
  }
};

  // Skeleton para cards
  const SkeletonCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-10 w-32 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-20 bg-gray-200 rounded"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Comissões (Admin)</h1>
          <p className="text-gray-600 mt-1">Visão global, utilizadores e regras</p>
        </div>
        <button
          onClick={() => loadData(pagination.page)}
          disabled={loading || batchLoading}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={18} className="mr-2" />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>

          <input
            type="text"
            placeholder="Filtrar por utilizador"
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 min-w-[220px]"
            disabled={loading || batchLoading}
          />

          <input
            type="text"
            placeholder="Filtrar por regra"
            value={ruleFilter}
            onChange={e => setRuleFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 min-w-[220px]"
            disabled={loading || batchLoading}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 min-w-[160px]"
            disabled={loading || batchLoading}
          >
            <option value="all">Todos estados</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="paid">Pago</option>
          </select>

          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 min-w-[180px]"
            disabled={loading || batchLoading}
          >
            <option value="lastmonth">Último mês</option>
            <option value="last3months">Últimos 3 meses</option>
            <option value="last6months">Últimos 6 meses</option>
            <option value="last12months">Últimos 12 meses</option>
            <option value="all">Todo o histórico</option>
          </select>
        </div>
      </div>

      {/* Cards globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Pendente</h3>
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-700">{formatCurrency(pendingTotal)}</p>
              <p className="text-sm text-gray-500 mt-1">{globalSummary.pending?.count || 0} transações</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Aprovado</h3>
                <CheckCircle2 className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-indigo-700">{formatCurrency(approvedTotal)}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Pago</h3>
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(paidTotal)}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Total Empresa</h3>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {formatCurrency(pendingTotal + approvedTotal + paidTotal)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Top Utilizadores */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-10">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          Top 20 Utilizadores
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex justify-between items-center py-3 border-b">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum utilizador com comissão neste período
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Utilizador</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Comissão Total</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantidade Total</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Pendente</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map(u => (
                  <tr key={u.user._id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{u.user.name}</div>
                      <div className="text-sm text-gray-600">{u.user.email}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-700">
                      {formatCurrency(u.totalCommission)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-800">{u.totalQty}</td>
                    <td className="py-4 px-4 text-right text-gray-600">{u.count}</td>
                    <td className="py-4 px-4 text-right text-amber-700 font-medium">
                      {formatCurrency(u.pending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Regras */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-10">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Top 10 Regras mais rentáveis
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex justify-between items-center py-3 border-b">
                <div className="h-5 w-64 bg-gray-200 rounded"></div>
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : topRules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma regra gerou comissão neste período
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Regra</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Comissão Total</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Vendas</th>
                </tr>
              </thead>
              <tbody>
                {topRules.map(r => (
                  <tr key={r.rule._id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4 font-medium">{r.rule.name}</td>
                    <td className="py-4 px-4 text-gray-600">{r.rule.targetType}</td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-700">
                      {formatCurrency(r.totalCommission)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-800">{r.totalQty}</td>
                    <td className="py-4 px-4 text-center text-gray-600">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela de transações + ações em lote */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Transações ({pagination.total} registos)
          </h2>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="text-indigo-600 hover:text-indigo-800"
              >
                {selectedIds.length === transactions.filter(t => t.status === 'pending').length ? (
                  <CheckSquare size={20} />
                ) : (
                  <Square size={20} />
                )}
              </button>
              <span className="text-sm text-gray-600">
                {selectedIds.length} selecionadas
              </span>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleBatchAction('approve')}
                  disabled={batchLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Aprovar
                </button>
                <button
                  onClick={() => handleBatchAction('pay')}
                  disabled={batchLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  <DollarSign size={16} />
                  Marcar Pago
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev || loading || batchLoading}
                  className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext || loading || batchLoading}
                  className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex justify-between py-4 px-6 border-b">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <FileText className="h-14 w-14 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase w-10"></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Utilizador</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Venda</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Regra</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Valor Base</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(tx => (
                    <tr
                      key={tx._id}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="px-6 py-4">
                        {tx.status === 'pending' && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleSelect(tx._id);
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {selectedIds.includes(tx._id) ? (
                              <CheckSquare size={20} />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{tx.user?.name || '—'}</div>
                        <div className="text-sm text-gray-600">{tx.user?.email || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        #{tx.sale?._id?.slice(-8) || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {tx.appliedRule?.name || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-800">
                        {formatCurrency(tx.baseAmount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-emerald-700">
                          {formatCurrency(tx.commissionAmount)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev || loading}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                <span className="text-sm text-gray-700">
                  Página {pagination.page} de {pagination.pages}
                </span>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext || loading}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition flex items-center gap-1"
                >
                  Próximo <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalhe */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-5 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Transação #{selectedTx._id.slice(-8)}
              </h2>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-3 hover:bg-gray-100 rounded-full transition"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-emerald-50 p-5 rounded-xl">
                  <p className="text-sm text-emerald-700 font-medium">Comissão</p>
                  <p className="text-3xl font-bold text-emerald-800 mt-2">
                    {formatCurrency(selectedTx.commissionAmount)}
                  </p>
                </div>

                <div className="bg-blue-50 p-5 rounded-xl">
                  <p className="text-sm text-blue-700 font-medium">Valor Base</p>
                  <p className="text-3xl font-bold text-blue-800 mt-2">
                    {formatCurrency(selectedTx.baseAmount)}
                  </p>
                </div>

                <div className="bg-indigo-50 p-5 rounded-xl">
                  <p className="text-sm text-indigo-700 font-medium">Estado</p>
                  <p className="text-xl font-bold mt-2 capitalize">
                    {selectedTx.status}
                  </p>
                </div>

                <div className="bg-purple-50 p-5 rounded-xl">
                  <p className="text-sm text-purple-700 font-medium">Qty Contribuída</p>
                  <p className="text-3xl font-bold text-purple-800 mt-2">
                    {selectedTx.quantityContributed || '—'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Detalhes</h3>
                <div className="bg-gray-50 p-5 rounded-xl space-y-3">
                  <p><strong>Utilizador:</strong> {selectedTx.user?.name || '—'} ({selectedTx.user?.email || '—'})</p>
                  <p><strong>Venda ID:</strong> {selectedTx.sale?._id || '—'}</p>
                  <p><strong>Data:</strong> {formatDate(selectedTx.createdAt)}</p>
                  {selectedTx.appliedRule && (
                    <p><strong>Regra:</strong> {selectedTx.appliedRule.name || '—'} ({selectedTx.appliedRule.targetType})</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommissionsDashboard;