// src/components/CompanyRegisterModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface CompanyRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCompany: { _id: string; name: string; email: string }) => void;
}

interface SubscriptionPlan {
  _id: string;
  id: string;
  name: string;
  price: number;
}

export const CompanyRegisterModal: React.FC<CompanyRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    adminFirstName: 'Admin',
    adminLastName: 'Empresa',
    adminEmail: '',
    planId: 'basic',        // valor padrão
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar planos dinâmicos
  useEffect(() => {
    if (!isOpen) return;

    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const res = await api.request<any>('/admin/subscription-plans');
        setPlans(res.plans || []);
        
        // Definir plano padrão (o primeiro ativo ou 'basic')
        const defaultPlan = res.plans?.find((p: any) => p.isActive) || res.plans?.[0];
        if (defaultPlan) {
          setFormData(prev => ({ ...prev, planId: defaultPlan.id }));
        }
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
        toast.error('Não foi possível carregar os planos');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = 'Nome da empresa é obrigatório';
    if (!formData.email.trim()) errs.email = 'Email da empresa é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email inválido';

    if (!formData.adminEmail.trim()) errs.adminEmail = 'Email do administrador é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) errs.adminEmail = 'Email inválido';

    if (!formData.planId) errs.planId = 'Selecione um plano';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminFirstName: formData.adminFirstName.trim(),
        adminLastName: formData.adminLastName.trim(),
        planId: formData.planId,
      };

      const data = await api.request<any>('/admin/companies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const createdCompany = data.company || data;

      toast.success(`Empresa "${createdCompany.name}" criada com sucesso!`);
      
      if (onSuccess) onSuccess(createdCompany);
      onClose();

      // Resetar formulário
      setFormData({
        name: '',
        email: '',
        adminFirstName: 'Admin',
        adminLastName: 'Empresa',
        adminEmail: '',
        planId: plans[0]?.id || 'basic',
      });

    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Erro ao criar empresa';
      toast.error(message);
      console.error('[CompanyRegisterModal]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="text-white" size={28} />
            <h2 className="text-2xl font-bold text-white">Registar Nova Empresa</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 p-2 rounded-full hover:bg-white/10 transition"
          >
            <X size={26} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Nome da Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-5 py-4 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
              placeholder="Ex: Tech Solutions Lda"
            />
            {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Email da Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email da Empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-5 py-4 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
              placeholder="geral@empresa.com"
            />
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Plano de Subscrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plano Inicial <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.planId}
              onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
              className={`w-full px-5 py-4 border ${errors.planId ? 'border-red-500' : 'border-gray-300'} rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
              disabled={loadingPlans}
            >
              {loadingPlans ? (
                <option>Carregando planos...</option>
              ) : (
                plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price.toLocaleString('pt-MZ')} MT
                  </option>
                ))
              )}
            </select>
            {errors.planId && <p className="mt-1.5 text-sm text-red-600">{errors.planId}</p>}
          </div>

          {/* Dados do Administrador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email do Administrador <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                className={`w-full px-5 py-4 border ${errors.adminEmail ? 'border-red-500' : 'border-gray-300'} rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                placeholder="admin@empresa.com"
              />
              {errors.adminEmail && <p className="mt-1.5 text-sm text-red-600">{errors.adminEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Administrador
              </label>
              <input
                type="text"
                value={formData.adminFirstName}
                onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Admin"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || loadingPlans}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Criando Empresa...
                </>
              ) : (
                'Criar Empresa'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyRegisterModal;