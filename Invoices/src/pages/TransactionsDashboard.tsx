// src/pages/TransactionsDashboard.tsx
import React, { useEffect, useState } from 'react';
import { transactionsApi } from '../services/api';
import toast from 'react-hot-toast';
import { 
  CreditCard, TrendingUp, AlertTriangle, Clock, Search, Filter 
} from 'lucide-react';

interface Transaction {
  _id: string;
  externalRef: string;
  paymentId?: string;
  type: string;
  amount: number;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  paymentMethod: string;
  createdAt: string;
  metadata?: {
    customerName?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    variantName?: string;
    planId?: string;
    companyName?: string;
    customer?: { name?: string; phone?: string };
  };
  user?: { name: string; email?: string };
}

export const TransactionsDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txRes, statsRes] = await Promise.all([
        transactionsApi.getAll({ ...filters, page }),
        transactionsApi.getStats()
      ]);

      setTransactions(txRes.transactions || []);
      setStats(statsRes.stats);
    } catch (err: any) {
      toast.error('Erro ao carregar transações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <CreditCard className="w-10 h-10 text-indigo-600" />
          Transações
        </h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow border">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-600" />
              <div>
                <p className="text-sm text-gray-500">Total Recebido</p>
                <p className="text-3xl font-bold">{stats.successAmount?.toLocaleString()} MT</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow border">
            <div className="flex items-center gap-3">
              <CreditCard className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Transações</p>
                <p className="text-3xl font-bold">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Falhas</p>
                <p className="text-3xl font-bold text-red-600">{stats.failedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow border">
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-600" />
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-2xl shadow border flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Ref, ID ou cliente..."
              className="w-full pl-10 border rounded-xl py-3"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Status</label>
          <select
            className="border rounded-xl py-3 px-4"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="success">Sucesso</option>
            <option value="failed">Falha</option>
            <option value="pending">Pendente</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Tipo</label>
          <select
            className="border rounded-xl py-3 px-4"
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="order">Venda</option>
            <option value="subscription">Subscrição</option>
            <option value="template_purchase">Template</option>
          </select>
        </div>

        <button
          onClick={loadData}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow overflow-hidden border">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left">Referência</th>
              <th className="px-6 py-4 text-left">Cliente</th>
              <th className="px-6 py-4 text-left">Itens</th>
              <th className="px-6 py-4 text-left">Tipo</th>
              <th className="px-6 py-4 text-left">Método</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-left">Data</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{tx.externalRef}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {tx.user?.name || tx.metadata?.customerName || tx.metadata?.customer?.name || '—'}
                  </div>
                  {tx.user?.email && <div className="text-xs text-gray-400">{tx.user.email}</div>}
                </td>
                <td className="px-6 py-4">
                  {tx.metadata?.variantName ? (
                    <div className="text-sm">
                      <span className="text-blue-600 font-medium">Template:</span>{' '}
                      <span className="text-gray-700">{tx.metadata.variantName}</span>
                    </div>
                  ) : tx.metadata?.planId ? (
                    <div className="text-sm">
                      <span className="text-indigo-600 font-medium">Subscrição:</span>{' '}
                      <span className="text-gray-700">{tx.metadata.planId}</span>
                    </div>
                  ) : tx.metadata?.items && tx.metadata.items.length > 0 ? (
                    <div className="text-sm space-y-0.5">
                      {tx.metadata.items.slice(0, 2).map((item: { name: string; quantity: number }, i: number) => (
                        <div key={i} className="text-gray-700">
                          {item.name} <span className="text-gray-400">x{item.quantity}</span>
                        </div>
                      ))}
                      {tx.metadata.items.length > 2 && (
                        <div className="text-xs text-gray-400">+{tx.metadata.items.length - 2} mais</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 capitalize text-sm">{tx.type.replace(/_/g, ' ')}</td>
                <td className="px-6 py-4 uppercase text-sm">{tx.paymentMethod}</td>
                <td className="px-6 py-4 text-right font-semibold">
                  {tx.amount.toLocaleString()} MT
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(tx.createdAt).toLocaleString('pt-MZ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-12">Nenhuma transação encontrada</p>
      )}
    </div>
  );
};

export default TransactionsDashboard;