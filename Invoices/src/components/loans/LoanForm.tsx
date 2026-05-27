// src/components/loans/LoanForm.tsx
import React, { useState } from 'react';
import { X, Save, User, DollarSign, Calendar, FileText, Users, AlertCircle } from 'lucide-react';
import { useCreateLoan } from '../../hooks/useLoans';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface LoanFormProps {
  onClose: () => void;
}

export const LoanForm: React.FC<LoanFormProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const createLoan = useCreateLoan();

  const [formData, setFormData] = useState({
    client: '',                    // ID do cliente (string)
    loanAmountRequested: 0,
    purpose: '',
    termMonths: 12,
    interestRate: 5.0,             // valor inicial sugerido
    paymentFrequency: 'Mensal',
    gracePeriodDays: 0,
    guaranteeType: 'Sem garantia',
    guarantors: [] as Array<{ name: string; identification: string; phone?: string }>,
    notes: '',
  });

  const [newGuarantor, setNewGuarantor] = useState({ name: '', identification: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client) {
      toast.error('Selecione um cliente');
      return;
    }
    if (formData.loanAmountRequested <= 0) {
      toast.error('O valor solicitado deve ser maior que zero');
      return;
    }
    if (!formData.purpose.trim()) {
      toast.error('A finalidade do crédito é obrigatória');
      return;
    }

    try {
      await createLoan.mutateAsync({
        client: formData.client,
        loanAmountRequested: Number(formData.loanAmountRequested),
        purpose: formData.purpose.trim(),
        termMonths: Number(formData.termMonths),
        interestRate: Number(formData.interestRate),
        paymentFrequency: formData.paymentFrequency,
        gracePeriodDays: Number(formData.gracePeriodDays),
        guaranteeType: formData.guaranteeType,
        guarantors: formData.guarantors.length > 0 ? formData.guarantors : undefined,
        internalNotes: formData.notes.trim(),
      });

      onClose();
      // Opcional: redirecionar para lista ou detalhe
      navigate('/loans');
    } catch (err) {
      // erro já tratado no hook com toast
    }
  };

  const addGuarantor = () => {
    if (!newGuarantor.name.trim() || !newGuarantor.identification.trim()) {
      toast.error('Nome e identificação do avalista são obrigatórios');
      return;
    }

    setFormData({
      ...formData,
      guarantors: [...formData.guarantors, { ...newGuarantor }],
    });
    setNewGuarantor({ name: '', identification: '', phone: '' });
  };

  const removeGuarantor = (index: number) => {
    setFormData({
      ...formData,
      guarantors: formData.guarantors.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
              <DollarSign className="text-blue-600" size={28} />
              Novo Pedido de Microcrédito
            </h2>
            <p className="text-sm text-gray-500 mt-1">Registe um novo pedido de crédito</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* 1. Cliente */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <User size={20} /> Cliente Solicitante
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aqui podes colocar um componente de busca/seleção de cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {/* Aqui viriam as opções reais – podes usar um useQuery para carregar clientes */}
                  <option value="cliente-id-exemplo-1">Eugénio Mabjaia</option>
                  <option value="cliente-id-exemplo-2">Maria da Silva</option>
                  {/* ... */}
                </select>
              </div>

              {/* Valor solicitado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Solicitado (MT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg"
                  value={formData.loanAmountRequested}
                  onChange={(e) => setFormData({ ...formData, loanAmountRequested: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Detalhes do Crédito */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finalidade do Crédito <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Ex: Compra de stock para loja, aquisição de equipamento, capital de giro..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prazo Pretendido (meses) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.termMonths}
                  onChange={(e) => setFormData({ ...formData, termMonths: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa de Juro Anual (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Condições de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequência de Pagamento</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.paymentFrequency}
                onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
              >
                <option value="Mensal">Mensal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Semanal">Semanal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Diário">Diário</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dias de Carência</label>
              <input
                type="number"
                min="0"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.gracePeriodDays}
                onChange={(e) => setFormData({ ...formData, gracePeriodDays: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Garantia</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.guaranteeType}
                onChange={(e) => setFormData({ ...formData, guaranteeType: e.target.value })}
              >
                <option value="Sem garantia">Sem garantia</option>
                <option value="Avalista">Avalista</option>
                <option value="Penhor">Penhor</option>
                <option value="Hipoteca">Hipoteca</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          {/* 4. Avalistas (opcional) */}
          <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} /> Avalistas / Garantidores
            </h3>

            {/* Lista atual */}
            {formData.guarantors.length > 0 && (
              <div className="space-y-3 mb-6">
                {formData.guarantors.map((g, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="text-sm text-gray-600">{g.identification} {g.phone ? `• ${g.phone}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGuarantor(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar novo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="w-full p-3 border rounded-xl"
                  value={newGuarantor.name}
                  onChange={(e) => setNewGuarantor({ ...newGuarantor, name: e.target.value })}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="BI / NUI / Passaporte"
                  className="w-full p-3 border rounded-xl"
                  value={newGuarantor.identification}
                  onChange={(e) => setNewGuarantor({ ...newGuarantor, identification: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <input
                  type="text"
                  placeholder="Telefone (opcional)"
                  className="w-full p-3 border rounded-xl"
                  value={newGuarantor.phone}
                  onChange={(e) => setNewGuarantor({ ...newGuarantor, phone: e.target.value })}
                />
                <button
                  type="button"
                  onClick={addGuarantor}
                  className="ml-3 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* 5. Notas internas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Internas / Observações
            </label>
            <textarea
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Informações adicionais para a equipa de análise..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-8 py-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLoan.isPending}
              className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {createLoan.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  A registar...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Registar Pedido
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};