// src/components/SubscriptionsSection.tsx
import React, { useEffect, useState } from 'react';
import { Crown, Zap, Check, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi, companyApi } from '../services/api';
import CheckoutModal from './CheckoutModal';

export const SubscriptionsSection: React.FC = () => {
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subRes, plansRes] = await Promise.all([
          subscriptionsApi.getCurrent(),
          subscriptionsApi.getPlans()
        ]);

        setSubscription(subRes);
        setPlans(plansRes);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar informações de subscrição');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleUpgrade = (plan: any) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const isCurrentPlan = (planId: string) => subscription?.planId === planId;

  if (loading) {
    return <div className="text-center py-12">Carregando planos...</div>;
  }

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Crown className="text-amber-500" /> Plano Atual
        </h2>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-6">
          <div>
            <h3 className="text-3xl font-bold">{subscription?.planName || 'Básico'}</h3>
            <p className="text-gray-600 mt-1">
              {subscription?.status === 'trial' ? 'Período de Teste' : 'Ativo'}
            </p>
          </div>

          {subscription?.currentPeriodEnd && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Expira em</p>
              <p className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-MZ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Planos Disponíveis */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Escolha o seu Plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isFeatured = plan.id === 'professional';

            return (
              <div
                key={plan.id}
                className={`border rounded-3xl p-8 transition-all hover:shadow-xl ${
                  isCurrent ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                } ${isFeatured ? 'ring-2 ring-purple-500 scale-105' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-4xl font-semibold mt-4">
                      {plan.price === 0 ? 'Grátis' : `${plan.price.toLocaleString('pt-MZ')} MT`}
                      <span className="text-base font-normal text-gray-500">/mês</span>
                    </p>
                  </div>
                  {isCurrent && <Check className="w-8 h-8 text-emerald-600" />}
                </div>

                <ul className="mt-8 space-y-3 text-sm">
                  {plan.features?.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent}
                  className={`mt-10 w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : isFeatured
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110'
                      : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                >
                  {isCurrent ? 'Plano Atual' : plan.price === 0 ? 'Usar Plano Gratuito' : 'Escolher este Plano'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Checkout */}
      {selectedPlan && modalOpen && (
        <CheckoutModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
        />
      )}
    </div>
  );
};

export default SubscriptionsSection;