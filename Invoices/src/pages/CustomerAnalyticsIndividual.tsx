import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, DollarSign, BarChart3, AlertTriangle, ArrowLeft } from 'lucide-react';
import { customersApi, IndividualCustomerStats, PaymentAnalysisResult, CustomerClient, companyApi } from '../services/api';
import toast from 'react-hot-toast';

interface IndividualCustomerAnalyticsProps {
  onBack: () => void;
}

export const CustomerAnalyticsIndividual: React.FC<IndividualCustomerAnalyticsProps> = ({ onBack }) => {
  const [customers, setCustomers] = useState<CustomerClient[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [stats, setStats] = useState<IndividualCustomerStats | null>(null);
  const [paymentAnalysis, setPaymentAnalysis] = useState<PaymentAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<string>('MT');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
  try {
    setLoading(true);
    const [customerList, settings] = await Promise.all([
      customersApi.getList(),
      companyApi.getSettings(),
    ]);
    
    // Add logging to debug the API response
    console.log('Customer list response:', customerList);
    
    // Handle potential response formats (array or object with clients property)
    const customersArray = Array.isArray(customerList) ? customerList : customerList?.clients || [];
    setCustomers(customersArray);
    
    console.log('Processed customers:', customersArray); // Log the processed array
    
    setCurrency(settings.currency || 'MT');
    
    // Load payment analysis for all customers
    const paymentData = await customersApi.getPaymentAnalysis();
    setPaymentAnalysis(paymentData);
  } catch (error) {
    console.error('Error loading customers:', error);
    toast.error('Erro ao carregar lista de clientes');
    setCustomers([]); // Fallback to empty array
  } finally {
    setLoading(false);
  }
};

  const handleCustomerSelect = async (customerId: string) => {
    setSelectedCustomer(customerId);
    setStats(null);
    
    try {
      const customerStats = await customersApi.getIndividualStats(customerId);
      setStats(customerStats);
    } catch (error) {
      console.error('Error loading customer stats:', error);
      toast.error('Erro ao carregar dados do cliente');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Crítico': return 'text-red-600';
      case 'Alto': return 'text-orange-600';
      case 'Médio': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getRiskBgColor = (risk: string) => {
    switch (risk) {
      case 'Crítico': return 'bg-red-50';
      case 'Alto': return 'bg-orange-50';
      case 'Médio': return 'bg-yellow-50';
      default: return 'bg-green-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rentabilidade - Análise Individual</h1>
          <p className="text-gray-600 mt-1">Análise detalhada de cada cliente com LTV, AOV e CAC</p>
        </div>
      </div>

      {/* Customer Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Seleccione um Cliente
        </label>
        <select
          value={selectedCustomer}
          onChange={(e) => handleCustomerSelect(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="">-- Escolha um cliente --</option>
          {customers.map(customer => (
            <option key={customer._id} value={customer._id}>
              {customer.name} {customer.phone ? `(${customer.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Individual Customer Stats */}
      {stats && (
        <div className="space-y-6">
          {/* Customer Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{stats.customer.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="text-lg font-medium text-gray-900">{stats.customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cliente Desde</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(stats.customer.createdAt).toLocaleDateString('pt-PT')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dias Activo</p>
                <p className="text-lg font-medium text-gray-900">{stats.daysActive > 0 ? `${stats.daysActive} dias` : '—'} dias</p>
              </div>
            </div>
          </div>

          {/* Main Metrics - LTV, AOV, CAC */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">LTV (Lifetime Value)</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {currency}{stats.ltv.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Valor total gasto</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">AOV (Avg Order Value)</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {currency}{stats.aov.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Ticket médio</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-200" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">CAC (Customer Acquis.)</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {currency}{stats.cac.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Custo estimado</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Purchase Frequency & Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade de Compra</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Transações:</span>
                  <span className="font-bold text-gray-900">{stats.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frequência (por dia):</span>
                  <span className="font-bold text-blue-600">{stats.purchaseFrequency === '∞' ? 'Muito frequente' : `${stats.purchaseFrequency}× / dia`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Itens:</span>
                  <span className="font-bold text-gray-900">{stats.totalItems}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-gray-600">Primeira Compra:</span>
                  <span className="text-sm text-gray-500">
                    {new Date(stats.firstPurchase).toLocaleDateString('pt-PT')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última Compra:</span>
                  <span className="text-sm text-gray-500">
                    {new Date(stats.lastPurchase).toLocaleDateString('pt-PT')}
                  </span>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow p-6 ${getRiskBgColor(stats.paymentDelayRisk)}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${getRiskColor(stats.paymentDelayRisk)}`} />
                Análise de Pagamento
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Risco de Atraso:</span>
                  <span className={`font-bold text-lg ${getRiskColor(stats.paymentDelayRisk)}`}>
                    {stats.paymentDelayRisk}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Atraso Médio:</span>
                  <span className="font-bold text-gray-900">{stats.averagePaymentDelay} dias</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transações Atrasadas:</span>
                  <span className="font-bold text-orange-600">{stats.delayedTransactions}</span>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pago:</span>
                    <span className="font-bold text-green-600">
                      {currency}{stats.totalPaid.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pendente:</span>
                    <span className="font-bold text-red-600">
                      {currency}{stats.totalPending.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Resumo de Insights</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                • Este cliente gastou <strong>{currency}{stats.ltv.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</strong> em {stats.totalTransactions} transações
              </p>
              <p>
                • Ticket médio de <strong>{currency}{stats.aov.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</strong>, fazendo uma compra a cada <strong>{stats.purchaseFrequency === '∞' ? 'Muito frequente' : `${stats.purchaseFrequency}× / dia`} dias</strong>
              </p>
              <p>
                • O custo de aquisição estimado é <strong>{currency}{stats.cac.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</strong> (15% do AOV)
              </p>
              {stats.paymentDelayRisk !== 'Baixo' && (
                <p className="text-orange-600">
                  ⚠️ Risco de pagamento: Atraso médio de <strong>{stats.averagePaymentDelay} dias</strong>
                </p>
              )}
              {stats.totalPending > 0 && (
                <p className="text-red-600">
                  ⚠️ Valor pendente: <strong>{currency}{stats.totalPending.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Reliability Ranking */}
      {paymentAnalysis.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Ranking de Confiabilidade de Pagamento
          </h2>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-center text-gray-700 font-semibold">Confiabilidade</th>
                  <th className="px-4 py-3 text-center text-gray-700 font-semibold">No Prazo</th>
                  <th className="px-4 py-3 text-center text-gray-700 font-semibold">Atrasado</th>
                  <th className="px-4 py-3 text-center text-gray-700 font-semibold">Atraso Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paymentAnalysis.slice(0, 10).map((customer, idx) => (
                  <tr key={customer.customerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">#{idx + 1} - {customer.customerName}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-green-600">{customer.paymentReliability}%</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{customer.onTimePayments}</td>
                    <td className="px-4 py-3 text-center text-red-600 font-medium">{customer.latePayments}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{customer.averageDelayDays} dias</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {paymentAnalysis.slice(0, 10).map((customer, idx) => (
              <div key={customer.customerId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-gray-900">#{idx + 1} - {customer.customerName}</p>
                  <span className="font-bold text-green-600">{customer.paymentReliability}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">No Prazo</p>
                    <p className="font-bold">{customer.onTimePayments}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Atrasado</p>
                    <p className="font-bold text-red-600">{customer.latePayments}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Atraso Médio</p>
                    <p className="font-bold">{customer.averageDelayDays}d</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};