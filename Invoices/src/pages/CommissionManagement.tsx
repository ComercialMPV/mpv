import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, X, Loader2, FileText, TrendingUp, CheckCircle2, 
  Users
} from 'lucide-react';
import { commissionsApi, companyApi } from '../services/api';
import toast from 'react-hot-toast';

interface Range {
  minQuantity: number;
  maxQuantity: string | number | null;
  commissionType: 'percentage' | 'fixed';
  value: number;
  minMonths: number;
}

interface FormData {
  name: string;
  userRole: string;
  targetType: 'Product' | 'Service' | 'Combo' | 'General';
  targetId: string;
  period: string;
  ranges: Range[];
  referralProgramRule: boolean;
}

interface CommissionRule {
  _id: string;
  name: string;
  userRole: { _id: string; roleName: string } | string;
  targetType: string;
  targetId?: string | null;
  period?: string;
  ranges: Range[];
}

interface LookupItem {
  _id: string;
  name: string;
  type?: 'Combo' | 'Subscription'; // para diferenciar no frontend
}

const CommissionManagement: React.FC = () => {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [roles, setRoles] = useState<{ _id: string; roleName: string }[]>([]);
  const [itemsLookup, setItemsLookup] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [companyReferralEnabled, setCompanyReferralEnabled] = useState(false);

  const initialForm: FormData = {
    name: '',
    userRole: '',
    targetType: 'Product',
    targetId: '',
    period: 'monthly',
    ranges: [{ minQuantity: 0, maxQuantity: '', commissionType: 'percentage', value: 0, minMonths: 0 }],
    referralProgramRule: false,
  };

  const [formData, setFormData] = useState<FormData>(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [rulesRes, rolesRes, companyRes] = await Promise.all([
        commissionsApi.getRules(),
        commissionsApi.getRoles(),
        companyApi.getProfile()
        
      ]);

      setRules(rulesRes || []);
      setRoles(rolesRes || []);
      setCompanyReferralEnabled(companyRes.referralProgramEnabled || false);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar regras e cargos');
    } finally {
      setLoading(false);
    }
  };

  const toggleReferralProgram = async () => {
    try {
      await companyApi.updateProfile({ referralProgramEnabled: !companyReferralEnabled });
      setCompanyReferralEnabled(!companyReferralEnabled);
      toast.success(`Programa de Recomendações ${!companyReferralEnabled ? 'ativado' : 'desativado'}`);
    } catch (err) {
      toast.error('Erro ao atualizar programa');
    }
  };

  const loadItemsForType = async (type: string) => {
    if (type === 'General') {
      setItemsLookup([]);
      return;
    }

    try {
      // Sempre carrega Bundles para targetType "Combo"
      const items = await commissionsApi.getLookupsItems(type === 'Combo' ? 'Bundle' : type);
      setItemsLookup(items || []);
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setItemsLookup([]);
      toast.error('Não foi possível carregar os itens');
    }
  };

  const handleTargetTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      targetType: value as FormData['targetType'],
      targetId: '',
    }));

    loadItemsForType(value);
  };

  // Verifica se o item selecionado é Subscription
  const isSubscriptionItem = () => {
    if (formData.targetType !== 'Combo' || !formData.targetId) return false;
    const selectedItem = itemsLookup.find(item => item._id === formData.targetId);
    return selectedItem?.type === 'Subscription';
  };

  const addRange = () => {
    setFormData(prev => ({
      ...prev,
      ranges: [...prev.ranges, { minQuantity: 0, maxQuantity: '', commissionType: 'percentage', value: 0, minMonths: 0 }],
    }));
  };

  const removeRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index),
    }));
  };

  const handleRangeChange = (index: number, field: keyof Range, value: any) => {
    setFormData(prev => {
      const newRanges = [...prev.ranges];
      newRanges[index] = { ...newRanges[index], [field]: value };
      return { ...prev, ranges: newRanges };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

      // Validações
  if (!formData.name.trim()) {
    toast.error('O nome da regra é obrigatório');
    return;
  }

  if (!formData.userRole.trim()) {
    toast.error('Selecione um cargo');
    return;
  }

  if (formData.targetType !== 'General' && !formData.targetId) {
    toast.error('Selecione um item específico');
    return;
  }

    // Validação para Subscription
    if (isSubscriptionItem()) {
      for (const range of formData.ranges) {
        if (range.minMonths <= 0) {
          toast.error('Para subscrições, defina o mínimo de meses (minMonths > 0)');
          return;
        }
      }
    }

    const payload = {
      ...formData,
      targetId: formData.targetType === 'General' ? null : formData.targetId,
      ranges: formData.ranges.map(r => ({
        ...r,
        maxQuantity: r.maxQuantity === '' ? null : Number(r.maxQuantity),
      })),
    };

    try {
      if (editingId) {
        await commissionsApi.updateRule(editingId, payload);
        toast.success('Regra atualizada');
      } else {
        await commissionsApi.createRule(payload);
        toast.success('Regra criada');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialForm);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar regra');
    }
  };

  const handleEdit = (rule: CommissionRule) => {
    setEditingId(rule._id);
    setFormData({
      name: rule.name,
      userRole: typeof rule.userRole === 'object' ? rule.userRole._id : rule.userRole,
      targetType: rule.targetType === 'Bundle' ? 'Combo' : rule.targetType as FormData['targetType'],
      targetId: rule.targetId || '',
      period: rule.period || 'monthly',
      ranges: rule.ranges.map(r => ({
        minQuantity: r.minQuantity,
        maxQuantity: r.maxQuantity ?? '',
        commissionType: r.commissionType,
        value: r.value,
        minMonths: r.minMonths || 0,
      })),
    });

    loadItemsForType(rule.targetType === 'Bundle' ? 'Combo' : rule.targetType);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      await commissionsApi.deleteRule(id);
      toast.success('Regra excluída');
      loadData();
    } catch (err) {
      toast.error('Erro ao excluir regra');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
     {/* Cabeçalho de Gestão de Regras - 100% Responsivo */}
<div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-8 gap-6">
  {/* Título: Ajuste de tamanho para não ocupar 3 linhas no mobile */}
  <div className="max-w-2xl">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
      Gestão de Regras de Comissão
    </h1>
  </div>

  {/* Ações: No mobile ocupam largura total, no desktop alinham à direita */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
    
    {/* Botão de Toggle: Texto condicional mais curto no mobile para evitar quebra */}
    <button
      onClick={toggleReferralProgram}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all active:scale-[0.98] flex-1 xl:flex-none text-sm md:text-base ${
        companyReferralEnabled 
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
      }`}
    >
      <Users size={20} className="shrink-0" />
      <span className="inline">
        {companyReferralEnabled 
          ? (
            <>
              <span className="hidden xs:inline text-sm">Programa Ativo</span>
              <span className="xs:hidden">Ativo</span>
            </>
          )
          : (
            <>
              <span className="hidden xs:inline">Ativar Recomendações</span>
              <span className="xs:hidden">Ativar Programa</span>
            </>
          )
        }
      </span>
    </button>

    {/* Botão Nova Regra */}
    <button
      onClick={() => {
        setEditingId(null);
        setFormData(initialForm);
        setIsModalOpen(true);
      }}
      className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-md active:scale-[0.98] transition-all text-sm md:text-base"
    >
      <Plus size={20} className="shrink-0" />
      <span className="whitespace-nowrap">Nova Regra</span>
    </button>
  </div>
</div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhuma regra de comissão criada ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map(rule => (
            <div key={rule._id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{rule.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                     {typeof rule.userRole === 'object' && rule.userRole !== null ? rule.userRole.roleName : 'Cargo'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p><strong>Tipo de alvo:</strong> {rule.targetType}</p>
                {rule.targetId && <p><strong>Item específico:</strong> {rule.targetId}</p>}
                <p><strong>Período:</strong> {rule.period || 'monthly'}</p>
                <p><strong>Escalões:</strong> {rule.ranges.length}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-5 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Editar Regra' : 'Nova Regra de Comissão'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-3 hover:bg-gray-100 rounded-full transition"
              >
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Nome */}
              <div>
                {/* Novo Toggle: Regra para Parceiros Externos */}
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <div>
                  <p className="font-medium">Regra para Parceiros de Recomendação</p>
                  <p className="text-sm text-gray-600">Aplica-se a todos os parceiros externos que recomendam clientes</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.referralProgramRule}
                  onChange={(e) => setFormData({ ...formData, referralProgramRule: e.target.checked })}
                  className="w-6 h-6 accent-emerald-600"
                />
              </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Regra
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                  required
                />
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo (userRole)
                </label>
                <select
                  value={formData.userRole}
                  onChange={e => setFormData({ ...formData, userRole: e.target.value })}
                  className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                  required
                >
                  <option value="">Selecione um cargo</option>
                  {roles.map(role => (
                    <option key={role._id} value={role._id}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de alvo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Alvo
                </label>
                <select
                  value={formData.targetType}
                  onChange={e => handleTargetTypeChange(e.target.value)}
                  className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                  required
                >
                  <option value="Product">Produto</option>
                  <option value="Service">Serviço</option>
                  <option value="Combo">Combo / Subscrição</option>
                  <option value="General">Geral (todas as vendas)</option>
                </select>
              </div>

              {/* Item específico */}
              {formData.targetType !== 'General' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Específico
                  </label>
                  {itemsLookup.length === 0 ? (
                    <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl">
                      Carregando itens... ou nenhum disponível
                    </div>
                  ) : (
                    <select
                      value={formData.targetId}
                      onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                      required
                    >
                      <option value="">Selecione um item</option>
                      {itemsLookup.map(item => (
                        <option key={item._id} value={item._id}>
                          {item.name} {item.type ? `(${item.type})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período de Cálculo
                </label>
                <select
                  value={formData.period}
                  onChange={e => setFormData({ ...formData, period: e.target.value })}
                  className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>

              {/* Escalões */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Escalões (Ranges)</h3>
                  <button
                    type="button"
                    onClick={addRange}
                    className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-200 transition"
                  >
                    <Plus size={18} />
                    Adicionar Escalão
                  </button>
                </div>

                <div className="space-y-6">
                  {formData.ranges.map((range, index) => (
                    <div key={index} className="border border-gray-200 rounded-2xl p-5 bg-gray-50 relative">
                      {formData.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRange(index)}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantidade Mínima
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                            value={range.minQuantity}
                            onChange={e => handleRangeChange(index, 'minQuantity', Number(e.target.value))}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantidade Máxima (vazio = ilimitado)
                          </label>
                          <input
                            type="number"
                            min={range.minQuantity}
                            placeholder="Deixe vazio para ilimitado"
                            className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                            value={range.maxQuantity === null ? '' : range.maxQuantity}
                            onChange={e => handleRangeChange(index, 'maxQuantity', e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Comissão
                          </label>
                          <select
                            value={range.commissionType}
                            onChange={e => handleRangeChange(index, 'commissionType', e.target.value)}
                            className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                          >
                            <option value="percentage">Percentagem (%)</option>
                            <option value="fixed">Valor Fixo</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor ({range.commissionType === 'percentage' ? '%' : 'MT'})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                            value={range.value}
                            onChange={e => handleRangeChange(index, 'value', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* minMonths só aparece se for Combo e o item selecionado for Subscription */}
                      {formData.targetType === 'Combo' && isSubscriptionItem() && (
                        <div className="mt-5">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mínimo de Meses de Subscrição (obrigatório para Subscription)
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full bg-white rounded-xl p-3 border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
                            value={range.minMonths}
                            onChange={e => handleRangeChange(index, 'minMonths', Number(e.target.value))}
                            required
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-6 border border-gray-300 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[1.6] bg-indigo-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  {editingId ? 'Guardar Alterações' : 'Criar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionManagement;