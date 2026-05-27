// src/pages/ReferralPartnerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Clock, DollarSign, Copy } from 'lucide-react';
import { referralsApi } from '../services/api';
import toast from 'react-hot-toast';
import { ReferralDashboardSummary } from '../services/api';

const ReferralPartnerDashboard: React.FC = () => {
  const [data, setData] = useState<ReferralDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const res = await referralsApi.getDashboard();
      setData(res);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const copyReferralCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      toast.success('Código copiado com sucesso!');
    }
  };

  const formatCurrency = (value: number = 0) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Bem-vindo, Parceiro!</h1>
          <p className="text-lg text-gray-600 mt-2">Acompanhe suas recomendações e ganhos em tempo real</p>
        </div>

        {/* Código de Recomendação */}
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Seu Código</p>
            <p className="font-mono text-2xl font-semibold text-indigo-700 tracking-widest">
              {data?.referralCode}
            </p>
          </div>
          <button
            onClick={copyReferralCode}
            className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
            title="Copiar código"
          >
            <Copy size={24} className="text-indigo-600" />
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Total Recomendados */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Recomendados</p>
              <p className="text-2bxl font-bold text-gray-900 mt-2">{data?.totalReferred || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Clientes indicados por si</p>
        </div>

        {/* Total Ganho */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Ganho</p>
              <p className="text-2xl font-bold text-emerald-700 mt-2">
                {formatCurrency(data?.totalEarned)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Comissões acumuladas</p>
        </div>

        {/* Pendente */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendente</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {formatCurrency(data?.pendingAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Aguardando aprovação</p>
        </div>

        {/* Já Pago */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Já Recebido</p>
              <p className="text-2xl font-bold text-purple-700 mt-2">
                {formatCurrency(data?.paidAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Comissões pagas</p>
        </div>
      </div>

      {/* Como Funciona */}
      <div className="bg-white border border-gray-200 rounded-3xl p-8">
        <h2 className="text-2xl font-semibold mb-4">Como funciona o programa?</h2>
        <div className="prose text-gray-700 max-w-none">
          <p>
            Recomende clientes usando o seu código <strong className="font-mono text-indigo-700">{data?.referralCode}</strong>. 
            Sempre que o cliente recomendado fizer compras na empresa, você recebe uma comissão recorrente 
            conforme a percentagem definida pela empresa.
          </p>
          <p className="mt-4">
            Quanto mais clientes ativos você indicar, mais ganhos recorrentes terá ao longo do tempo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralPartnerDashboard;