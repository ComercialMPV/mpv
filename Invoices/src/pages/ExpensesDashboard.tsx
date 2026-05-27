import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, TrendingDown, TrendingUp, Calendar, Edit2, Trash2, 
  DollarSign, PieChart 
} from 'lucide-react';
import { expensesApi, salesApi } from '../services/api';   // ← Importamos também salesApi
import toast from 'react-hot-toast';

const CATEGORIES: Record<string, string> = {
  supplies: 'Material / Stock',
  maintenance: 'Manutenção',
  rent: 'Aluguer',
  salaries: 'Salários',
  utilities: 'Água, Luz, Internet',
  transport: 'Transporte',
  marketing: 'Marketing',
  emergency: 'Emergência',
  other: 'Outros'
};

export const ExpensesDashboard: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);     // ← Novo estado
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'supplies',
    type: 'variable' as 'fixed' | 'variable',
    paymentMethod: 'cash',
    notes: ''
  });

  // Carregar Despesas + Receita Bruta (Produção Bruta)
  const loadData = async () => {
    try {
      setLoading(true);

      const filters: any = { period };
      if (period === 'custom' && startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      // 1. Carregar Despesas
      const expensesRes = await expensesApi.getAll(filters);
      setExpenses(expensesRes.expenses || []);

      // 2. Carregar Produção Bruta (Total de Vendas no mesmo período)
      const salesRes = await salesApi.getAll({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        // Não precisamos de mais filtros aqui
      });

      const revenue = salesRes.sales 
        ? salesRes.sales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0)
        : 0;

      setTotalRevenue(revenue);

    } catch (err) {
      toast.error('Erro ao carregar dados financeiros');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, startDate, endDate]);

  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, exp) => sum + exp.amount, 0), 
    [expenses]
  );

  const netResult = totalRevenue - totalExpenses;   // Lucro/Prejuízo real

  const categoryBreakdown = useMemo(() => {
    const grouped = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [expenses]);

  // ====================== FORMULÁRIO ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      return toast.error('Descrição e valor são obrigatórios');
    }

    try {
      const payload = { 
        ...formData, 
        amount: parseFloat(formData.amount) 
      };

      if (editingExpense) {
        await expensesApi.update(editingExpense._id, payload);
        toast.success('Despesa atualizada com sucesso!');
      } else {
        await expensesApi.create(payload);
        toast.success('Despesa registada com sucesso!');
      }

      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      loadData();        // Recarrega tudo (despesas + receita)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar despesa');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'supplies',
      type: 'variable',
      paymentMethod: 'cash',
      notes: ''
    });
  };

  const openEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date.split('T')[0],
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      type: expense.type,
      paymentMethod: expense.paymentMethod || 'cash',
      notes: expense.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja eliminar esta despesa?')) return;

    try {
      setDeletingId(id);
      await expensesApi.delete(id);
      toast.success('Despesa eliminada');
      loadData();
    } catch (err) {
      toast.error('Erro ao eliminar despesa');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-600 mt-1">Produção Bruta vs Despesas • Resultado Líquido</p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition-all shadow-sm"
        >
          <Plus size={20} />
          Nova Despesa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'today', label: 'Hoje' },
          { key: 'week', label: 'Esta Semana' },
          { key: 'month', label: 'Este Mês' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key as any)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              period === key 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white border border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setPeriod('custom')}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            period === 'custom' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white border border-gray-200 hover:border-gray-300'
          }`}
        >
          Personalizado
        </button>
      </div>

      {period === 'custom' && (
        <div className="flex gap-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
            className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
            className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Produção Bruta */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Produção Bruta</p>
              <p className="text-4xl font-bold text-emerald-600 mt-2">
                MT {totalRevenue.toLocaleString('pt-MZ')}
              </p>
            </div>
            <div className="p-4 bg-emerald-100 rounded-2xl">
              <TrendingUp className="text-emerald-600" size={32} />
            </div>
          </div>
        </div>

        {/* Total Despesas */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Despesas</p>
              <p className="text-4xl font-bold text-red-600 mt-2">
                MT {totalExpenses.toLocaleString('pt-MZ')}
              </p>
            </div>
            <div className="p-4 bg-red-100 rounded-2xl">
              <TrendingDown className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* Resultado Líquido */}
        <div className={`rounded-3xl p-8 shadow-sm border ${netResult >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resultado Líquido</p>
              <p className={`text-4xl font-bold mt-2 ${netResult >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                MT {netResult.toLocaleString('pt-MZ')}
              </p>
            </div>
            {netResult >= 0 ? (
              <TrendingUp className="text-emerald-600" size={32} />
            ) : (
              <TrendingDown className="text-red-600" size={32} />
            )}
          </div>
          <p className="text-xs mt-3 text-gray-500">
            {netResult >= 0 ? 'Lucro' : 'Prejuízo'} no período selecionado
          </p>
        </div>
      </div>

      {/* Distribuição por Categoria */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <PieChart size={20} /> Distribuição de Despesas por Categoria
          </h3>
          <div className="space-y-5">
            {categoryBreakdown.map(([cat, value]) => {
              const percentage = totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-5">
                  <div className="w-40 text-sm font-medium text-gray-700 truncate">
                    {CATEGORIES[cat] || cat}
                  </div>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-300" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right w-28">
                    <span className="font-semibold">MT {value.toLocaleString('pt-MZ')}</span>
                    <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Despesas */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-semibold">Histórico de Despesas</h2>
          <span className="text-sm text-gray-500">{expenses.length} registos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-medium text-gray-500">DATA</th>
                <th className="px-8 py-5 text-left text-xs font-medium text-gray-500">DESCRIÇÃO</th>
                <th className="px-8 py-5 text-left text-xs font-medium text-gray-500">CATEGORIA</th>
                <th className="px-8 py-5 text-right text-xs font-medium text-gray-500">VALOR</th>
                <th className="px-8 py-5 text-center text-xs font-medium text-gray-500">TIPO</th>
                <th className="px-8 py-5 text-center text-xs font-medium text-gray-500">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5 text-sm whitespace-nowrap">
                    {new Date(exp.date).toLocaleDateString('pt-MZ')}
                  </td>
                  <td className="px-8 py-5 font-medium">{exp.description}</td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 text-xs bg-gray-100 rounded-full">
                      {CATEGORIES[exp.category] || exp.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-semibold text-red-600">
                    MT {exp.amount.toLocaleString('pt-MZ')}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-4 py-1 text-xs font-medium rounded-full ${
                      exp.type === 'fixed' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {exp.type === 'fixed' ? 'Fixo' : 'Variável'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-4">
                      <button onClick={() => openEdit(exp)} className="text-blue-600 hover:text-blue-700">
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(exp._id)}
                        disabled={deletingId === exp._id}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-500">
                    Nenhuma despesa encontrada neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nova/Editar Despesa (mantido igual ao anterior, mas mais limpo) */}
     {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6">
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="text"
                  placeholder="Descrição da despesa"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="number"
                  placeholder="Valor em MT"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500"
                  required
                />

                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'fixed' | 'variable' })}
                    className="border border-gray-300 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="variable">Variável</option>
                    <option value="fixed">Fixo</option>
                  </select>

                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="border border-gray-300 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                  </select>
                </div>

                <textarea
                  placeholder="Notas adicionais (opcional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3 h-28 focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3.5 border border-gray-300 rounded-2xl font-medium hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-medium hover:bg-blue-700 transition"
                  >
                    {editingExpense ? 'Atualizar Despesa' : 'Registar Despesa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};