import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, Save, X, ChevronDown, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: 'emergency' | 'supplies' | 'maintenance' | 'other';
  createdBy?: any;
  createdAt?: string;
}

interface CashClosure {
  _id: string;
  date: string;
  status: string;
  totalAmountPaid: number;
  countedTotal?: number;
  notes?: string;
  expenses?: Expense[];
}

interface ExpenseManagerProps {
  onClose?: () => void;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onClose }) => {
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<CashClosure | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ description: '', amount: '', category: 'other' });

  // Category labels
  const categoryLabels: Record<string, string> = {
    emergency: '🚨 Emergência',
    supplies: '📦 Suprimentos',
    maintenance: '🔧 Manutenção',
    other: '📌 Outro'
  };

  const categoryColors: Record<string, string> = {
    emergency: 'bg-red-100 text-red-800 border-red-300',
    supplies: 'bg-blue-100 text-blue-800 border-blue-300',
    maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    other: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  // Load closures on mount
  useEffect(() => {
    const initLoad = async () => {
      try {
        setLoading(true);
        const data = await api.cashClosures.getMine();
        setClosures(data || []);
        // Auto-select latest non-confirmed closure
        const latest = data?.find((c: any) => c.status !== 'confirmed');
        if (latest) {
          setSelectedClosure(latest);
          await fetchExpenses(latest._id);
        }
      } catch {
        toast.error('Erro ao carregar fechos de caixa');
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, []);

  const fetchExpenses = async (closureId: string) => {
    try {
      const data = await api.cashClosures.getExpenses(closureId);
      setExpenses(data || []);
    } catch {
      console.error('Erro ao carregar despesas');
      setExpenses([]);
    }
  };

  const handleSelectClosure = async (closure: CashClosure) => {
    setSelectedClosure(closure);
    await fetchExpenses(closure._id);
    setShowAddForm(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClosure) return;
    if (!formData.description || !formData.amount) {
      toast.error('Preenchimento obrigatório: descrição e valor');
      return;
    }

    try {
      setLoading(true);
      await api.cashClosures.createExpense(
        selectedClosure._id,
        formData.description,
        Number(formData.amount),
        formData.category
      );
      toast.success('Despesa adicionada');
      setFormData({ description: '', amount: '', category: 'other' });
      setShowAddForm(false);
      await fetchExpenses(selectedClosure._id);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar despesa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedClosure) return;
    if (!window.confirm('Tem certeza que quer remover esta despesa?')) return;

    try {
      setLoading(true);
      await api.cashClosures.deleteExpense(selectedClosure._id, expenseId);
      toast.success('Despesa removida');
      await fetchExpenses(selectedClosure._id);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover despesa');
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const expectedInCash = (selectedClosure?.totalAmountPaid || 0) - totalExpenses;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Gestão de Despesas</h3>
          <p className="text-sm text-gray-600">Registar saídas de valores durante o turno</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition"
        >
          {expanded ? <EyeOff size={16} /> : <Eye size={16} />}
          {expanded ? 'Ocultar' : 'Expandir'}
          <ChevronDown size={16} className={`transform transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="bg-white border-2 border-amber-200 rounded-xl p-4 space-y-4">
          {/* Seletor de Fecho */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fecho de Caixa</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {closures.length === 0 ? (
                <p className="text-sm text-gray-500 col-span-2">Nenhum fecho de caixa disponível</p>
              ) : (
                closures.map(c => (
                  <button
                    key={c._id}
                    onClick={() => handleSelectClosure(c)}
                    className={`p-3 rounded-lg border-2 transition text-left ${
                      selectedClosure?._id === c._id
                        ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-300'
                        : 'bg-gray-50 border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900">
                      {new Date(c.date).toLocaleDateString('pt-PT')}
                    </p>
                    <p className={`text-xs ${c.status === 'confirmed' ? 'text-green-600' : 'text-amber-600'}`}>
                      {c.status === 'confirmed' ? '✓ Confirmado' : '⏳ Pendente'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Total: {Number(c.totalAmountPaid || 0).toLocaleString()} MT</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedClosure && (
            <>
              {/* Resumo do Fecho */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-sm text-gray-900">Resumo Financeiro</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Total Recebido</p>
                    <p className="font-bold text-green-600">{Number(selectedClosure.totalAmountPaid || 0).toLocaleString()} MT</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Despesas</p>
                    <p className="font-bold text-red-600">{Number(totalExpenses).toLocaleString()} MT</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Esperado em Caixa</p>
                    <p className="font-bold text-blue-600">{Number(expectedInCash).toLocaleString()} MT</p>
                  </div>
                </div>
              </div>

              {/* Lista de Despesas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-900">
                    Despesas Registadas ({expenses.length})
                  </h4>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    disabled={selectedClosure.status === 'confirmed'}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Plus size={14} /> Nova Despesa
                  </button>
                </div>

                {/* Formulário de Adição */}
                {showAddForm && selectedClosure.status !== 'confirmed' && (
                  <form onSubmit={handleAddExpense} className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
                      <input
                        type="text"
                        placeholder="Ex: Compra emergência energia, Café para equipa..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (MT)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={e => setFormData({...formData, amount: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                        <select
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-semibold"
                      >
                        <Save size={14} /> Guardar Despesa
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition font-semibold"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Despesas */}
                {expenses.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Nenhuma despesa registada</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {expenses.map(exp => (
                      <div key={exp._id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${categoryColors[exp.category]}`}>
                              {categoryLabels[exp.category]}
                            </span>
                          </div>
                          <p className="font-semibold text-sm text-gray-900">{exp.description}</p>
                          <p className="text-xs text-gray-600">
                            {exp.createdBy?.firstName} • {exp.createdAt ? new Date(exp.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="font-bold text-red-600 text-right">
                            {Number(exp.amount).toLocaleString()} MT
                          </p>
                          <button
                            onClick={() => handleDeleteExpense(exp._id)}
                            disabled={loading || selectedClosure.status === 'confirmed'}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo de Ações */}
              {selectedClosure.status !== 'confirmed' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
                  <p className="text-xs font-semibold text-blue-900 mb-1">💡 Dica:</p>
                  <p>Registar todas as saídas (emergências, compras, etc.) antes de confirmar o fecho.</p>
                </div>
              )}

              {selectedClosure.status === 'confirmed' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700 flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <p>Este fecho já foi confirmado. Não pode adicionar/remover despesas.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
