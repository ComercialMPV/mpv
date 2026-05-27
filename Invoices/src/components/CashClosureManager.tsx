import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Trash2, Plus, X } from 'lucide-react';

interface CashClosureManagerProps {
  onClose?: () => void;
}

const CashClosureManager: React.FC<CashClosureManagerProps> = ({ onClose }) => {
  // const { user } = useAuth(); // not needed currently
  const { user } = useAuth();
  const [mine, setMine] = useState<any[]>([]);
  const [pendingOpens, setPendingOpens] = useState<any[]>([]); // admin view
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [countedTotal, setCountedTotal] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>('other');
  
  // Confirmation modal state
  const [showConfirmClosureModal, setShowConfirmClosureModal] = useState(false);
  // no pending id needed now


  const fetchMine = async () => {
    setLoading(true);
    try {
      const res = await api.cashClosures.getMine();
      setMine(res);
      if (user && (user.role === 'admin' || user.role === 'supervisor')) {
        // load pending open requests for review
        const opens: any = await api.cashClosures.getAll({ openStatus: 'pending' });
        setPendingOpens(opens);
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const fetchExpenses = async (closureId: string) => {
    try {
      const res = await api.cashClosures.getExpenses(closureId);
      setExpenses(res);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    }
  };

  useEffect(() => { fetchMine(); }, []);

  const handleCreate = () => {
    // just open modal asking user to confirm
    setShowConfirmClosureModal(true);
  };

  const handleConfirmClosureSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await api.cashClosures.create();
      setMine([response, ...mine]);
      setShowConfirmClosureModal(false);
      alert('Fecho submetido com sucesso');
    } catch (err: any) {
      alert(err.message || 'Erro ao submeter fecho');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectClosure = async (closure: any) => {
    setSelected(closure);
    setCountedTotal('');
    setNotes(closure.notes || '');
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('other');
    await fetchExpenses(closure._id);
  };

  const handleAddExpense = async () => {
    if (!expenseDesc || !expenseAmount) {
      alert('Preenchimento obrigatório: descrição e valor');
      return;
    }
    try {
      await api.cashClosures.createExpense(selected._id, expenseDesc, Number(expenseAmount), expenseCategory);
      setExpenseDesc('');
      setExpenseAmount('');
      setExpenseCategory('other');
      await fetchExpenses(selected._id);
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar despesa');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await api.cashClosures.deleteExpense(selected._id, expenseId);
      await fetchExpenses(selected._id);
    } catch (err: any) {
      alert(err.message || 'Erro ao remover despesa');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const handleOpenDecision = async (id: string, status: 'approved' | 'denied') => {
    try {
      await api.cashClosures.updateOpenStatus(id, status);
      toast.success(`Solicitação ${status}`);
      // refresh lists
      fetchMine();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar');
    }
  };

  const handleConfirm = async (closureId: string) => {
    setSubmitting(true);
    try {
      await api.cashClosures.confirm(closureId, Number(countedTotal || 0), notes);
      await fetchMine();
      setSelected(null);
      setCountedTotal('');
      setNotes('');
      alert('Fecho confirmado');
      // Close drawer if onClose callback provided
      if (onClose) onClose();
    } catch (err: any) {
      alert(err.message || 'Erro');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-md font-semibold">Fecho de Caixa</h3>
          <p className="text-sm text-gray-500">Submeta o fecho do seu turno diário. Será enviado ao admin e supervisor.</p>
        </div>
        <div>
          <button onClick={handleCreate} disabled={submitting} className="px-3 py-2 bg-blue-600 text-white rounded">
            {submitting ? 'Enviando...' : 'Submeter Fecho'}
          </button>
        </div>
      </div>
      {user && (user.role === 'admin' || user.role === 'supervisor') && pendingOpens.length > 0 && (
        <div className="mt-6 p-4 border rounded bg-yellow-50">
          <h4 className="font-semibold">Pedidos de Abertura de Caixa</h4>
          <ul className="space-y-3 mt-2">
            {pendingOpens.map(o => (
              <li key={o._id} className="p-3 bg-white border rounded flex justify-between items-center">
                <div className="text-sm">
                  <p>Usuário: {o.createdBy?.firstName} {o.createdBy?.lastName}</p>
                  <p>Valor inicial: {Number(o.initialFloat||0).toLocaleString()} MT</p>
                  <p className="text-xs text-gray-500">Solicitado em {new Date(o.openRequestedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenDecision(o._id, 'approved')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Aprovar</button>
                  <button onClick={() => handleOpenDecision(o._id, 'denied')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Negar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">Seus fechos recentes</h4>
        {loading ? <p>Carregando...</p> : (
          <ul className="space-y-3">
            {mine.map(c => (
              <li key={c._id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(c.date).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-600">Vendas: {c.salesCount} — Total: {Number(c.totalSalesAmount || 0).toLocaleString()} MT</div>
                  <div className="text-sm text-gray-600">Status: {c.status}</div>
                </div>
                <div>
                  {c.status !== 'confirmed' && (
                    <button onClick={() => handleSelectClosure(c)} className="px-3 py-1 border rounded text-sm hover:bg-blue-50">
                      Gerir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="mt-4 p-4 border rounded bg-gradient-to-b from-blue-50 to-white space-y-4">
          <h4 className="font-semibold text-lg">Fecho de Caixa — {new Date(selected.date).toLocaleDateString()}</h4>

          {/* Resumo do Dia */}
          <div className="bg-white border rounded p-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Total de Vendas</p>
                <p className="font-bold">{Number(selected.totalSalesAmount || 0).toLocaleString()} MT</p>
              </div>
              <div>
                <p className="text-gray-600">Total Recebido</p>
                <p className="font-bold text-green-600">{Number(selected.totalAmountPaid || 0).toLocaleString()} MT</p>
              </div>
              <div>
                <p className="text-gray-600">Despesas do Turno</p>
                <p className="font-bold text-red-600">{Number(totalExpenses).toLocaleString()} MT</p>
              </div>
            </div>
          </div>

          {/* Gestão de Despesas */}
          <div className="bg-white border rounded p-3 space-y-3">
            <h5 className="font-semibold text-sm">Despesas e Saídas</h5>
            {expenses.length > 0 ? (
              <ul className="space-y-2">
                {expenses.map(exp => (
                  <li key={exp._id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <p className="font-medium">{exp.description}</p>
                      <p className="text-xs text-gray-600">{exp.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-red-600">{Number(exp.amount).toLocaleString()} MT</p>
                      <button onClick={() => handleDeleteExpense(exp._id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Sem despesas registadas</p>
            )}
            
            <div className="border-t pt-3 space-y-2">
              <input
                placeholder="Descrição da despesa (ex: Compra emergência energia)"
                value={expenseDesc}
                onChange={e => setExpenseDesc(e.target.value)}
                className="w-full px-2 py-2 border rounded text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Valor (MT)"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  className="col-span-1 px-2 py-2 border rounded text-sm"
                />
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="col-span-1 px-2 py-2 border rounded text-sm"
                >
                  <option value="emergency">Emergência</option>
                  <option value="supplies">Suprimentos</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="other">Outro</option>
                </select>
                <button
                  onClick={handleAddExpense}
                  className="col-span-1 px-2 py-2 bg-amber-500 text-white rounded text-sm flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Confirmação de Fecho */}
          <div className="bg-white border rounded p-3 space-y-3">
            <h5 className="font-semibold text-sm">Confirmar Fecho</h5>
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Valor contado (MT)</label>
              <input
                type="number"
                value={countedTotal}
                onChange={e => setCountedTotal(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Notas do fecho (opcional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Diferença devida a compra emergência ou erro no registo..."
                className="w-full px-3 py-2 border rounded text-sm"
                rows={3}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-sm text-yellow-800">
              <p className="font-medium">Resumo:</p>
              <p>Total recebido: {Number(selected.totalAmountPaid || 0).toLocaleString()} MT</p>
              <p>Menos despesas: -{Number(totalExpenses).toLocaleString()} MT</p>
              <p className="font-bold">Esperado em caixa: {Number((selected.totalAmountPaid || 0) - totalExpenses).toLocaleString()} MT</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirm(selected._id)}
                disabled={submitting}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-medium disabled:opacity-50"
              >
                {submitting ? 'Confirmando...' : 'Confirmar Fecho'}
              </button>
              <button onClick={() => setSelected(null)} className="px-3 py-2 border rounded">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL - Close Day? */}
      {showConfirmClosureModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Confirmar Fecho</h2>
                <button
                  onClick={() => {
                    setShowConfirmClosureModal(false);
                    setSubmitting(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Tem certeza que deseja <strong>submeter o fecho do dia</strong>? Será enviado para aprovação pelo supervisor/admin.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800">
                  ⚠️ <strong>Nota:</strong> Após fechar o dia, você não poderá fazer mais alterações neste fecho.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmClosureModal(false);
                    setSubmitting(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition"
                >
                  Mais Tarde
                </button>
                <button
                  onClick={handleConfirmClosureSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Fechar Dia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashClosureManager;
