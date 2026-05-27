import React, { useState, useEffect } from 'react';
import { 
  Loader2, DollarSign, Clock, CheckCircle2, TrendingUp, AlertCircle, 
  FileText, ChevronLeft, ChevronRight, Filter, RefreshCw, X
} from 'lucide-react';
import { commissionsApi } from '../services/api';
import toast from 'react-hot-toast';
import { format, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';

// Interfaces (mantidas iguais + nova para transações do grupo)
interface CommissionTransaction {
  _id: string;
  sale: { _id: string; total: number; createdAt: string; customer?: { name?: string } };
  commissionAmount: number;
  baseAmount: number;
  tierApplied?: { commissionType: 'percentage' | 'fixed'; value: number };
  appliedRule?: { _id: string; name?: string; targetType?: string };
  createdAt: string;
  status: string;
  periodStart?: string;
  periodEnd?: string;
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

interface SummaryGroup {
  ruleId: string;
  ruleName?: string;
  targetType?: string;
  totalQty: number;
  totalBase: number;
  savedCommission: number;
  correctCommission: number;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
}

const MyCommissionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [groupedSummaries, setGroupedSummaries] = useState<SummaryGroup[]>([]);
  const [summary, setSummary] = useState<Record<string, { count: number; total: number }>>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    hasNext: false,
    hasPrev: false
  });

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [periodFilter, setPeriodFilter] = useState<string>('last3months');

  // Modal de grupo
  const [selectedGroup, setSelectedGroup] = useState<SummaryGroup | null>(null);
  const [groupTransactions, setGroupTransactions] = useState<CommissionTransaction[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

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

      const response = await commissionsApi.getMyPendingCommissions({
        page: pageNum,
        limit: pagination.limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        periodStart: periodStartDate
      });

      setTransactions(response.pendingTransactions || []);
      setSummary(response.summary || {});
      setPagination(response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
        hasNext: false,
        hasPrev: false
      });

      // Agrupar e calcular comissões corretas
      const grouped = groupAndCalculate(response.pendingTransactions || []);
      setGroupedSummaries(grouped);

    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao carregar comissões';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Função para agrupar e calcular comissão correta (tiered)
  const groupAndCalculate = (txs: CommissionTransaction[]): SummaryGroup[] => {
    const groups: Record<string, SummaryGroup> = {};

    txs.forEach(tx => {
      if (!tx.appliedRule?._id || !tx.periodStart) return;

      const key = `${tx.appliedRule._id}-${tx.periodStart}`;

      if (!groups[key]) {
        groups[key] = {
          ruleId: tx.appliedRule._id,
          ruleName: tx.appliedRule.name,
          targetType: tx.appliedRule.targetType,
          totalQty: 0,
          totalBase: 0,
          savedCommission: 0,
          correctCommission: 0,
          periodStart: tx.periodStart,
          periodEnd: tx.periodEnd || '',
          transactionCount: 0
        };
      }

      groups[key].totalQty += tx.quantityContributed || 0;
      groups[key].totalBase += tx.baseAmount || 0;
      groups[key].savedCommission += tx.commissionAmount || 0;
      groups[key].transactionCount += 1;
    });

    return Object.values(groups).map(group => {
      const rule = txs.find(tx => tx.appliedRule?._id === group.ruleId)?.appliedRule;
      if (!rule?.ranges) return group;

      const sortedRanges = [...rule.ranges].sort((a, b) => a.minQuantity - b.minQuantity);
      let remainingQty = group.totalQty;
      let correctComm = 0;

      for (const range of sortedRanges) {
        if (remainingQty <= 0) break;

        const qtyInThisTier = Math.min(
          remainingQty,
          range.maxQuantity === null ? remainingQty : range.maxQuantity - range.minQuantity + 1
        );

        if (qtyInThisTier > 0) {
          const tierValue = range.commissionType === 'percentage'
            ? group.totalBase * (range.value / 100)
            : range.value * qtyInThisTier;

          correctComm += tierValue;
          remainingQty -= qtyInThisTier;
        }
      }

      return {
        ...group,
        correctCommission: correctComm
      };
    });
  };

  // Carrega transações detalhadas do grupo selecionado
  const loadGroupDetails = async (group: SummaryGroup) => {
    setSelectedGroup(group);
    setGroupLoading(true);
    setGroupTransactions([]);

    try {
      const response = await commissionsApi.getMyPendingCommissions({
        ruleId: group.ruleId,
        periodStart: group.periodStart,
        status: 'all' // mostra todas do período/regra
      });

      setGroupTransactions(response.pendingTransactions || []);
    } catch (err: any) {
      toast.error('Erro ao carregar detalhes do grupo');
    } finally {
      setGroupLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [statusFilter, periodFilter]);

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

  const pendingTotal = summary.pending?.total || 0;
  const approvedTotal = summary.approved?.total || 0;
  const paidTotal = summary.paid?.total || 0;

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

  // Skeleton para tabela
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
      <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
      <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded"></div></td>
      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
      <td className="px-6 py-4 text-right"><div className="h-4 w-24 bg-gray-200 rounded ml-auto"></div></td>
    </tr>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
   {/* Cabeçalho Responsivo */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
  <div className="max-w-2xl">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
      As Minhas Comissões
    </h1>
    <p className="text-gray-600 mt-2 text-sm md:text-base leading-relaxed">
      Visão geral das suas comissões pendentes, aprovadas e históricas
    </p>
  </div>

  <button
    onClick={() => loadData(pagination.page)}
    disabled={loading}
    className="
      w-full sm:w-auto 
      inline-flex items-center justify-center 
      px-6 py-3 sm:py-2.5 
      bg-indigo-600 text-white 
      rounded-xl sm:rounded-lg 
      hover:bg-indigo-700 
      active:scale-95
      transition-all duration-200 
      shadow-md shadow-indigo-100 
      disabled:opacity-50 disabled:pointer-events-none
      text-sm font-semibold
    "
  >
    <RefreshCw 
      size={18} 
      className={`mr-2 ${loading ? 'animate-spin' : ''}`} 
    />
    {loading ? 'A carregar...' : 'Atualizar'}
  </button>
</div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 min-w-[160px]"
            disabled={loading}
          >
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="paid">Pago</option>
            <option value="all">Todos os estados</option>
          </select>

          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 min-w-[180px]"
            disabled={loading}
          >
            <option value="lastmonth">Último mês</option>
            <option value="last3months">Últimos 3 meses</option>
            <option value="last6months">Últimos 6 meses</option>
            <option value="last12months">Últimos 12 meses</option>
            <option value="all">Todo o histórico</option>
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
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
              <p className="text-sm text-gray-500 mt-1">{summary.pending?.count || 0} transações</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Aprovado</h3>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(approvedTotal)}</p>
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
                <h3 className="font-semibold text-gray-700">Total</h3>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {formatCurrency(pendingTotal + approvedTotal + paidTotal)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tabela resumida por regra/período */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Minhas Comissões ({groupedSummaries.length} grupos)
          </h2>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev || loading}
                className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
                className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : groupedSummaries.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <FileText className="h-14 w-14 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma comissão encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Regra / Período</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Acumulado Qty</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Valor Base Total</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Comissão Correta</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Comissão Salva</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Vendas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupedSummaries.map(group => (
                    <tr
                      key={`${group.ruleId}-${group.periodStart}`}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      onClick={() => loadGroupDetails(group)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{group.ruleName || 'Regra'}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(group.periodStart)} – {formatDate(group.periodEnd)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {group.totalQty}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-800 font-medium">
                        {formatCurrency(group.totalBase)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-700">
                        {formatCurrency(group.correctCommission)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {formatCurrency(group.savedCommission)}
                        {group.correctCommission > group.savedCommission && (
                          <span className="ml-2 text-xs text-green-600">
                            +{formatCurrency(group.correctCommission - group.savedCommission)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {group.transactionCount}
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

      {/* Modal de Detalhes do Grupo */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-5 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Detalhes do Grupo: {selectedGroup.ruleName || 'Regra'}
              </h2>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-3 hover:bg-gray-100 rounded-full transition"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Resumo do grupo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-emerald-50 p-5 rounded-xl">
                  <p className="text-sm text-emerald-700 font-medium">Comissão Correta</p>
                  <p className="text-3xl font-bold text-emerald-800 mt-2">
                    {formatCurrency(selectedGroup.correctCommission)}
                  </p>
                </div>

                <div className="bg-blue-50 p-5 rounded-xl">
                  <p className="text-sm text-blue-700 font-medium">Comissão Salva</p>
                  <p className="text-3xl font-bold text-blue-800 mt-2">
                    {formatCurrency(selectedGroup.savedCommission)}
                  </p>
                </div>

                <div className="bg-indigo-50 p-5 rounded-xl">
                  <p className="text-sm text-indigo-700 font-medium">Acumulado Qty</p>
                  <p className="text-3xl font-bold text-indigo-800 mt-2">
                    {selectedGroup.totalQty}
                  </p>
                </div>

                <div className="bg-purple-50 p-5 rounded-xl">
                  <p className="text-sm text-purple-700 font-medium">Vendas</p>
                  <p className="text-3xl font-bold text-purple-800 mt-2">
                    {selectedGroup.transactionCount}
                  </p>
                </div>
              </div>

              {/* Diferença */}
              {selectedGroup.correctCommission > selectedGroup.savedCommission && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-800">
                  <p className="font-medium">Diferença a favor: +{formatCurrency(selectedGroup.correctCommission - selectedGroup.savedCommission)}</p>
                  <p className="text-sm mt-1">Valor que deveria ter sido creditado com base no acumulado real</p>
                </div>
              )}

              {/* Lista de transações do grupo */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Transações deste grupo</h3>

                {groupLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  </div>
                ) : groupTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma transação detalhada encontrada para este grupo
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Venda</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Valor Base</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Comissão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupTransactions.map(tx => (
                          <tr key={tx._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700">
                              #{tx.sale?._id?.slice(-8) || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDate(tx.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {tx.sale?.customer?.name || 'Consumidor final'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-800">
                              {tx.quantityContributed || '—'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-800">
                              {formatCurrency(tx.baseAmount)}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-700">
                              {formatCurrency(tx.commissionAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCommissionsPage;