// components/UsageLimits.tsx
import React, { useEffect, useState } from 'react';
import { Progress } from 'antd';
import { AlertCircle, Crown, Zap, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

import { subscriptionsApi, companyApi } from '../services/api';

interface UsageItem {
  current: number;
  max: number | 'Ilimitado';
  percentage: number;
  isUnlimited?: boolean;
}

interface UsageLimitsData {
  planName: string;
  planId: string;
  isEnterprise: boolean;
  usage: Record<string, UsageItem>;
  companyName: string;
}

const resourceLabels: Record<string, string> = {
  users: 'Utilizadores',
  products: 'Produtos',
  services: 'Serviços',
  bundles: 'Bundles / Pacotes',
  clients: 'Clientes',
  leads: 'Leads',
  suppliers: 'Fornecedores',
  requisitions: 'Requisições',
  documents: 'Documentos / Faturas',
  sales: 'Vendas',
  proposals: 'Propostas',
};

export default function UsageLimits() {
  const [data, setData] = useState<UsageLimitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageLimits = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Buscar subscrição atual com plano populado
        const subscription = await subscriptionsApi.getCurrent();

        if (!subscription) {
          throw new Error('Não foi possível carregar a subscrição');
        }

        // 2. Buscar limites de utilização (nova rota recomendada)
        const usageResponse = await companyApi.getUsageLimits?.() || 
          // fallback se ainda não tiver o método no api
          (await fetch('/api/company/usage-limits', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).then(res => res.json()));

        const usageData = usageResponse.usage || usageResponse;

        // Preparar dados de uso
        const processedUsage: Record<string, UsageItem> = {};

        Object.entries(usageData).forEach(([key, value]: [string, any]) => {
          const max = value.max === null || value.max === Infinity || value.isUnlimited 
            ? 'Ilimitado' 
            : value.max;

          const current = value.current || 0;
          const percentage = max === 'Ilimitado' 
            ? 0 
            : Math.min(Math.round((current / (max as number)) * 100), 100);

          processedUsage[key] = {
            current,
            max,
            percentage,
            isUnlimited: max === 'Ilimitado'
          };
        });

        setData({
          planName: subscription.planName || subscription.plan?.name || 'Básico',
          planId: subscription.planId || subscription.plan?.id || 'basic',
          isEnterprise: subscription.planId === 'enterprise' || subscription.plan?.id === 'enterprise',
          usage: processedUsage,
          companyName: subscription.companyName || 'Sua Empresa',
        });

      } catch (err: any) {
        console.error('Erro ao carregar limites de utilização:', err);
        setError(err.message || 'Falha ao carregar limites de uso');
        toast.error('Não foi possível carregar os limites de utilização');
      } finally {
        setLoading(false);
      }
    };

    fetchUsageLimits();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">A carregar limites de utilização...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-red-700 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Não foi possível carregar os limites</p>
          <p className="text-sm mt-1 opacity-80">{error || 'Tente recarregar a página'}</p>
        </div>
      </div>
    );
  }

  const { planName, isEnterprise, usage } = data;
  const hasNearLimit = Object.values(usage).some(u => u.percentage >= 85);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {isEnterprise ? (
            <Crown className="w-9 h-9 text-amber-500" />
          ) : (
            <Zap className="w-9 h-9 text-indigo-600" />
          )}
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Limites de Utilização
            </h3>
            <p className="text-gray-600">Plano: <span className="font-semibold">{planName}</span></p>
          </div>
        </div>

        {isEnterprise && (
          <div className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Ilimitado
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(usage).map(([key, item]) => {
          const label = resourceLabels[key] || key.charAt(0).toUpperCase() + key.slice(1);
          const isUnlimited = item.max === 'Ilimitado' || item.isUnlimited;

          return (
            <div
              key={key}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="font-medium text-gray-800">{label}</div>
                <div className="text-right text-sm">
                  <span className="font-mono font-semibold">
                    {item.current}
                  </span>
                  <span className="text-gray-400"> / </span>
                  <span className={isUnlimited ? 'text-emerald-600 font-medium' : ''}>
                    {isUnlimited ? '∞' : item.max}
                  </span>
                </div>
              </div>

              {!isUnlimited && (
                <Progress
                  percent={item.percentage}
                  showInfo={false}
                  strokeColor={
                    item.percentage >= 95
                      ? '#ef4444'
                      : item.percentage >= 80
                      ? '#f59e0b'
                      : '#3b82f6'
                  }
                  trailColor="#e5e7eb"
                  className="mb-3"
                />
              )}

              <div className="flex items-center justify-between text-xs">
                {isUnlimited ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> Sem limite
                  </span>
                ) : (
                  <span className={`font-medium ${
                    item.percentage >= 90 ? 'text-red-600' : 
                    item.percentage >= 75 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {item.percentage}% utilizado
                  </span>
                )}

                {item.percentage >= 90 && !isUnlimited && (
                  <span className="text-red-600 font-medium">Atenção</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aviso global */}
      {hasNearLimit && !isEnterprise && (
        <div className="mt-10 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">
                Alguns recursos estão próximos do limite
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Considere fazer upgrade para o plano Professional ou Enterprise para remover limitações.
              </p>
              <button
                onClick={() => window.location.href = '/settings#subscription'}
                className="mt-4 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition"
              >
                Ver Planos e Fazer Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}