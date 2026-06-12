import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  Eye,
  ShoppingCart,
  Wrench,
} from 'lucide-react';

import { documentsApi, clientsApi, suppliersApi, usersApi, templatesApi, salesApi, requisitionsApi, dashboardApi, api } from '../services/api';
import { Document } from '../services/api';
import { RevenueChart } from '../components/RevenueChart';
import { format, subDays, startOfYear } from 'date-fns';
import toast from 'react-hot-toast';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface DashboardStats {
  totalDocuments: number;
  totalClients: number;
  totalSuppliers: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalSales: number;
  totalSalesRevenue: number;
  todaySalesCount: number;
  todaySalesRevenue: number;
  totalRequisitions: number;
  pendingCashOpens: number;
  totalUsers: number;
  totalTemplates: number;
}

type PeriodOption = '7d' | '30d' | '90d' | '180d' | 'ytd' | 'custom';

export const Dashboard: React.FC = () => {
  const [dailySeries, setDailySeries] = useState<{ date: string; total: number; count: number }[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<ChartDataPoint[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<ChartDataPoint[]>([]);
  const [salesFunnel, setSalesFunnel] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalClients: 0,
    totalSuppliers: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalSales: 0,
    totalSalesRevenue: 0,
    todaySalesCount: 0,
    todaySalesRevenue: 0,
    totalRequisitions: 0,
    pendingCashOpens: 0,
    totalUsers: 0,
    totalTemplates: 0,
  });

  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<string>('30');

  useEffect(() => {
    loadDashboardData();
  }, [days]);

  useEffect(() => {
    const handler = () => loadDashboardData();
    window.addEventListener('workspaceChanged', handler);
    return () => window.removeEventListener('workspaceChanged', handler);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const numDays = parseInt(days, 10);

      const [
        documentsResponse,
        clientsResponse,
        suppliersResponse,
        usersList,
        templatesList,
        salesStats,
        salesDaily,
        requisitionsList,
        cashOpenList,
        analyticsData,
      ] = await Promise.all([
        documentsApi.getAll({ limit: 5 }),
        clientsApi.getAll({ limit: 1 }),
        suppliersApi.getAll({ limit: 1 }),
        usersApi.getAll(),
        templatesApi.getAll(),
        salesApi.getStats(),
        salesApi.getDailyStats(numDays),
        requisitionsApi.getAll(),
        api.cashClosures.getAll({ openStatus: 'pending' }),
        dashboardApi.getAnalytics(), // ← Dados reais do backend
      ]);

      const documents = documentsResponse.documents;
      const totalRevenue = documents
        .filter((doc) => doc.type === 'invoice' && doc.status === 'paid')
        .reduce((sum, doc) => sum + doc.total, 0);

      const pendingInvoices = documents.filter(
        (doc) => doc.type === 'invoice' && doc.status === 'sent'
      ).length;

      const overdueInvoices = documents.filter(
        (doc) => doc.type === 'invoice' && doc.status === 'overdue'
      ).length;

      // ✅ USAR DADOS REAIS DO BACKEND
      setStatusDistribution(analyticsData?.statusDistribution || []);
      setTypeDistribution(analyticsData?.typeDistribution || []);
      setSalesFunnel(analyticsData?.salesFunnel || []);

      setStats({
        totalDocuments: documentsResponse.pagination.total,
        totalClients: clientsResponse.pagination.total,
        totalSuppliers: suppliersResponse.pagination.total,
        totalRevenue,
        pendingInvoices,
        overdueInvoices,
        totalSales: salesStats.totalSales || 0,
        totalSalesRevenue: salesStats.totalRevenue || 0,
        todaySalesCount: salesStats.todaySalesCount || 0,
        todaySalesRevenue: salesStats.todayRevenue || 0,
        totalRequisitions: Array.isArray(requisitionsList) ? requisitionsList.length : 0,
        pendingCashOpens: Array.isArray(cashOpenList) ? cashOpenList.length : 0,
        totalUsers: Array.isArray(usersList) ? usersList.length : 0,
        totalTemplates: Array.isArray(templatesList) ? templatesList.length : 0,
      });

      if (Array.isArray(salesDaily)) {
        setDailySeries(salesDaily);
      }

      setRecentDocuments(documents);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Falha ao carregar dados do dashboard');
      
      // Fallback: dados vazios para evitar erro
      setStatusDistribution([]);
      setTypeDistribution([]);
      setSalesFunnel([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Rascunho' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Enviado' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pago' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Atrasado' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelado' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovado' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const periodText = {
    '7': 'Últimos 7 dias',
    '30': 'Últimos 30 dias',
    '90': 'Últimos 90 dias',
    '180': 'Últimos 180 dias',
    '365': 'Últimos 365 dias',
  }[days];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // KPIs principais (destaque)
  const primaryKpis = [
    {
      title: 'Vendas Hoje',
      value: stats.todaySalesCount.toLocaleString(),
      icon: Plus,
      color: 'bg-orange-600',
    },
    {
      title: 'Receita Hoje',
      value: `MZN ${stats.todaySalesRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-600',
    },
    {
      title: 'Receita Total',
      value: `MZN ${stats.totalSalesRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-teal-600',
    },
    {
      title: 'Cash Opens Pendentes',
      value: stats.pendingCashOpens.toString(),
      icon: Eye,
      color: 'bg-rose-600',
    },
  ];

  // KPIs secundários (menores)
  const secondaryKpis = [
    {
      title: 'Total Vendas',
      value: stats.totalSales.toLocaleString(),
      icon: ShoppingCart,
      color: 'bg-cyan-600',
    },
    {
      title: 'Requisições',
      value: stats.totalRequisitions.toLocaleString(),
      icon: Package,
      color: 'bg-violet-600',
    },
    {
      title: 'Clientes',
      value: stats.totalClients.toLocaleString(),
      icon: Users,
      color: 'bg-purple-600',
    },
    {
      title: 'Documentos',
      value: stats.totalDocuments.toLocaleString(),
      icon: FileText,
      color: 'bg-blue-600',
    },
    {
      title: 'Usuários',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-indigo-600',
    },
    {
      title: 'Templates',
      value: stats.totalTemplates.toLocaleString(),
      icon: FileText,
      color: 'bg-sky-600',
    },
  ];

  return (
    <div className="space-y-10 pb-12 max-w-[1600px] mx-auto px-2">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Visão geral da operação
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Período:
            </label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="block w-full sm:w-40 rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
            >
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">365 dias</option>
            </select>
          </div>

          <Link
            to="/sales"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-md active:scale-[0.98] transition-all text-sm sm:text-base"
          >
            <Plus className="h-5 w-5" />
            <span>Iniciar venda</span>
          </Link>
        </div>
      </div>

      {/* KPIs principais – destaque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {primaryKpis.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-md shadow border border-gray-100 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{item.title}</p>
                <p className="text-xl font-bold text-gray-900 mt-2">{item.value}</p>
              </div>
              <div className={`${item.color} p-2 rounded-md`}>
                <item.icon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos – área principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          series={dailySeries}
          title="Receita ao Longo do Tempo"
          subtitle="Evolução da receita e número de vendas"
          chartType="line"
          metric="revenue"
          height={380}
        />

        <RevenueChart
          title="Distribuição por Estado de Documento"
          subtitle="Rascunho, Enviado, Pago, Atrasado e Cancelado"
          chartType="pie"
          data={statusDistribution}
          height={380}
        />

        <RevenueChart
          title="Distribuição por Tipo de Documento"
          subtitle="Faturas, Orçamentos, Folhas de Obra e Ordens de Compra"
          chartType="pie"
          data={typeDistribution}
          height={380}
        />

        <RevenueChart
          title="Funil de Vendas - Conversão de Leads"
          subtitle="Etapas: Leads → Clientes → Vendas → Clientes Recorrentes"
          chartType="funnel"
          data={salesFunnel}
          height={380}
        />
      </div>

      {/* KPIs secundários – grid mais compacto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {secondaryKpis.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`${item.color} p-3 rounded-lg`}>
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{item.title}</p>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de documentos recentes */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Documentos Recentes</h2>
            <Link
              to="/documents"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              Ver todos <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente/Fornecedor
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentDocuments.map((doc) => (
                <tr key={doc._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{doc.number}</div>
                    <div className="text-sm text-gray-500">
                      {((type: string) => {
                        const typeLabels: Record<string, string> = {
                          invoice: 'Fatura',
                          quotation: 'Orçamento',
                          worksheet: 'Folha de Obra',
                          purchase_order: 'Ordem de Compra',
                        };
                        return typeLabels[type] || type;
                      })(doc.type)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {doc.client?.name || doc.supplier?.name || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    MZN {doc.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(doc.issueDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/documents/${doc._id}`}
                      className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentDocuments.length === 0 && (
          <div className="text-center py-16">
            <FileText className="mx-auto h-14 w-14 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum documento ainda</h3>
            <p className="mt-2 text-gray-500">Comece criando o seu primeiro documento.</p>
            <div className="mt-6">
              <Link
                to="/documents/new"
                className="inline-flex items-center px-3 py-2 border border-transparent shadow text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-3 w-3 mr-2" />
                Novo Documento
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions – final */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/sales"
          className="flex items-center justify-center px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium shadow hover:shadow-lg transition-all text-lg"
        >
          Abrir PDV
        </Link>
        <Link
          to="/sales"
          className="flex items-center justify-center px-6 py-5 border-2 border-rose-500 text-rose-700 rounded-xl font-medium hover:bg-rose-50 transition-all text-lg"
        >
          Cash Opens Pendentes
        </Link>
        <Link
          to="/requisitions"
          className="flex items-center justify-center px-6 py-5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all text-lg"
        >
          Ver Requisições
        </Link>
      </div>
    </div>
  );
};