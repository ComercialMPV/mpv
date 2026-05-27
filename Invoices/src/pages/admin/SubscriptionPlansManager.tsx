// src/pages/admin/SubscriptionPlansManager.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Save, Plus, Trash2, Edit2, AlertTriangle, 
  CheckCircle, X 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PlanFeature {
  id: string;
  text: string;
}

interface SubscriptionPlan {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'annual';
  maxLimits: {
    users: number;
    products: number;
    services: number;
    bundles: number;
    requisitions: number;
    clients: number;
    documents: number;
    leads: number;
  };
  features: PlanFeature[];
  isActive: boolean;
  isDefault?: boolean;
}

export const SubscriptionPlansManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Buscar todos os planos
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.request<any>('/admin/subscription-plans');
      setPlans(res.plans || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar planos de subscrição');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // ================== ABRIR MODAL PARA EDITAR ==================
  const handleEditPlan = (plan: SubscriptionPlan) => {
    // Garantir que features seja um array de objetos com id + text
    const normalizedFeatures = (plan.features || []).map((f: any, index: number) => ({
      id: f.id || `feat-${Date.now()}-${index}`,
      text: typeof f === 'string' ? f : (f.text || '')
    }));

    setEditingPlan({
      ...plan,
      features: normalizedFeatures
    });
  };

  // Adicionar novo plano
  const handleAddPlan = () => {
    const newPlan: SubscriptionPlan = {
      id: `custom_${Date.now()}`,
      name: 'Novo Plano Personalizado',
      description: '',
      price: 0,
      currency: 'MT',
      billingCycle: 'monthly',
      maxLimits: {
        users: 5,
        products: 50,
        services: 50,
        bundles: 20,
        requisitions: 100,
        clients: 200,
        documents: 500,
        leads: 100,
      },
      features: [{ id: Date.now().toString(), text: 'Novo recurso incluído' }],
      isActive: true,
    };
    setEditingPlan(newPlan);
  };

// ================== SALVAR ==================
  const handleSavePlan = async () => {
    if (!editingPlan) return;

    setSaving(true);
    try {
      const payload = {
        ...editingPlan,
        features: editingPlan.features
          .map(f => f.text.trim())
          .filter(Boolean),
      };

      if (editingPlan._id) {
        await api.request(`/admin/subscription-plans/${editingPlan._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Plano atualizado com sucesso!');
      } else {
        await api.request('/admin/subscription-plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Novo plano criado com sucesso!');
      }

      setEditingPlan(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao guardar o plano');
    } finally {
      setSaving(false);
    }
  };

// ================== ATUALIZAR CAMPOS ==================
  const updatePlanField = (field: keyof SubscriptionPlan, value: any) => {
    if (!editingPlan) return;
    setEditingPlan(prev => ({ ...prev!, [field]: value }));
  };

  const updateLimit = (key: string, value: number) => {
    if (!editingPlan) return;
    setEditingPlan(prev => ({
      ...prev!,
      maxLimits: { ...prev!.maxLimits, [key]: Math.max(0, value) }
    }));
  };

  // Gerir funcionalidades
 const addFeature = () => {
    if (!editingPlan) return;
    const newFeature = { id: `feat-${Date.now()}`, text: '' };
    
    setEditingPlan(prev => ({
      ...prev!,
      features: [...prev!.features, newFeature]
    }));
  };

  const updateFeature = (id: string, text: string) => {
    if (!editingPlan) return;

    setEditingPlan(prev => ({
      ...prev!,
      features: prev!.features.map(feature =>
        feature.id === id ? { ...feature, text } : feature
      )
    }));
  };

  const removeFeature = (id: string) => {
    if (!editingPlan) return;
    setEditingPlan(prev => ({
      ...prev!,
      features: prev!.features.filter(feature => feature.id !== id)
    }));
  };

  const deletePlan = async (planId: string, planName: string) => {
    if (!window.confirm(`Tem certeza que deseja eliminar o plano "${planName}"?`)) return;

    try {
      await api.request(`/admin/subscription-plans/${planId}`, { method: 'DELETE' });
      toast.success('Plano eliminado com sucesso');
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao eliminar plano');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-lg">A carregar planos de subscrição...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Planos de Subscrição</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Gerencie planos, limites e funcionalidades de forma dinâmica
          </p>
        </div>

        <button
          onClick={handleAddPlan}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-lg transition"
        >
          <Plus size={24} />
          Novo Plano
        </button>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan._id || plan.id}
            className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-3xl font-semibold text-indigo-600 mt-2">
                  {plan.price.toLocaleString('pt-MZ')} MT
                  <span className="text-base font-normal text-gray-500">/{plan.billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                </p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {plan.isActive ? 'Ativo' : 'Inativo'}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">LIMITES</p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {Object.entries(plan.maxLimits).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize text-gray-600">{key}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">FUNCIONALIDADES ({plan.features.length})</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {plan.features.slice(0, 6).map((feat, i) => (
                    <li key={i}>• {feat}</li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-gray-400">+ {plan.features.length - 6} mais...</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-10">
             <button
                onClick={() => handleEditPlan(plan)}   // ← Alterado aqui!
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl font-medium transition"
              >
                <Edit2 size={18} />
                Editar
              </button>

              {!plan.isDefault && (
                <button
                  onClick={() => deletePlan(plan._id!, plan.name)}
                  className="flex items-center justify-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-2xl transition"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ====================== MODAL DE EDIÇÃO ====================== */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            
            <div className="px-8 py-6 border-b flex items-center justify-between bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPlan._id ? 'Editar Plano' : 'Criar Novo Plano'}
              </h2>
              <button onClick={() => setEditingPlan(null)} className="text-gray-500 hover:text-gray-800">
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-10">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">ID do Plano (único)</label>
                  <input
                    type="text"
                    value={editingPlan.id}
                    onChange={(e) => updatePlanField('id', e.target.value)}
                    className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500"
                    disabled={!!editingPlan._id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Nome do Plano</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => updatePlanField('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Preço (MT)</label>
                  <input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => updatePlanField('price', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Ciclo de Faturação</label>
                  <select
                    value={editingPlan.billingCycle}
                    onChange={(e) => updatePlanField('billingCycle', e.target.value as 'monthly' | 'annual')}
                    className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Estado</label>
                  <select
                    value={editingPlan.isActive ? 'active' : 'inactive'}
                    onChange={(e) => updatePlanField('isActive', e.target.value === 'active')}
                    className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Limites */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={22} />
                  Limites Máximos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {Object.keys(editingPlan.maxLimits).map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input
                        type="number"
                        value={editingPlan.maxLimits[key as keyof typeof editingPlan.maxLimits]}
                        onChange={(e) => updateLimit(key, parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-2xl px-5 py-4 text-center text-lg font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Funcionalidades - Versão Corrigida */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Funcionalidades ({editingPlan.features.length})</h3>
                  <button
                    onClick={addFeature}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Plus size={20} /> Adicionar funcionalidade
                  </button>
                </div>

                <div className="space-y-4">
                  {editingPlan.features.map((feature) => (
                    <div key={feature.id} className="flex gap-4">
                      <input
                        type="text"
                        value={feature.text}
                        onChange={(e) => updateFeature(feature.id, e.target.value)}
                        placeholder="Ex: Relatórios avançados de rentabilidade"
                        className="flex-1 border border-gray-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => removeFeature(feature.id)}
                        className="px-5 text-red-600 hover:bg-red-50 rounded-2xl transition"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="border-t p-8 flex justify-end gap-4">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-10 py-4 border border-gray-300 rounded-2xl font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center gap-3 hover:bg-indigo-700 disabled:opacity-70"
              >
                {saving ? 'Guardando...' : <><Save size={22} /> Guardar Plano</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansManager;