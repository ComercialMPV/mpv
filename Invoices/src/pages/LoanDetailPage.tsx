// src/pages/LoanDetailPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, User, Calendar, Clock, CheckCircle2, 
  XCircle, Ban, AlertCircle, FileText, CreditCard, History 
} from 'lucide-react';
import { useLoan, useApproveLoan, useRejectLoan, useDisburseLoan, useRegisterPayment } from '../hooks/useLoans';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export const LoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: loan, isLoading, error } = useLoan(id!);
  const approveMutation = useApproveLoan(id!);
  const rejectMutation = useRejectLoan(id!);
  const disburseMutation = useDisburseLoan(id!);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  if (isLoading) {
    return <div className="p-8 text-center">A carregar dados do crédito...</div>;
  }

  if (error || !loan) {
    return (
      <div className="p-8 text-center text-red-600">
        Não foi possível carregar o microcrédito. Tente novamente.
      </div>
    );
  }

  const handleApprove = () => {
    if (!confirm('Confirmar aprovação deste crédito?')) return;
    approveMutation.mutate(
      { loanAmountApproved: loan.loanAmountRequested },
      {
        onSuccess: () => toast.success('Crédito aprovado!'),
      }
    );
  };

  const handleReject = () => {
    const reason = prompt('Motivo da rejeição (opcional):');
    rejectMutation.mutate(
      { reason: reason || undefined },
      {
        onSuccess: () => toast.success('Crédito rejeitado'),
      }
    );
  };

  const handleDisburse = () => {
    if (!confirm('Confirmar desembolso? O valor será considerado entregue.')) return;
    disburseMutation.mutate(undefined, {
      onSuccess: () => toast.success('Desembolso registado'),
    });
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      toast.error('Valor do pagamento inválido');
      return;
    }

    // usar mutation do useLoans
    // (adiciona useRegisterPayment no hook se ainda não tens)
    toast.success('Pagamento registado (simulação)'); // placeholder
    setShowPaymentForm(false);
    setPaymentAmount(0);
  };

  const getStatusColor = () => {
    if (loan.daysOverdue > 0) return 'text-red-600';
    switch (loan.approvalStatus) {
      case 'Pendente': return 'text-yellow-600';
      case 'Aprovado': return 'text-green-600';
      case 'Rejeitado':
      case 'Cancelado': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/loans')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900">
              Microcrédito #{loan._id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-gray-600 mt-1">
              {loan.client?.name} • {loan.client?.phone || '—'}
            </p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-full font-bold text-lg ${getStatusColor()}`}>
          {loan.daysOverdue > 0
            ? `Atraso de ${loan.daysOverdue} dias`
            : loan.approvalStatus}
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 – Resumo financeiro */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-blue-600" />
              Resumo Financeiro
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Solicitado:</span>
                <span className="font-medium">{loan.loanAmountRequested.toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aprovado:</span>
                <span className="font-bold text-green-700">
                  {loan.loanAmountApproved?.toLocaleString() || '—'} MT
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Saldo devedor:</span>
                <span className={`font-bold text-xl ${loan.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {loan.outstandingBalance.toLocaleString()} MT
                </span>
              </div>
            </div>
          </div>

          {/* Próxima prestação */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-purple-600" />
              Próximos Pagamentos
            </h3>
            <p className="text-gray-700">
              {loan.daysOverdue > 0 ? (
                <span className="text-red-600 font-bold">Em atraso há {loan.daysOverdue} dias</span>
              ) : (
                'Nenhum pagamento pendente no momento'
              )}
            </p>
          </div>
        </div>

        {/* Coluna 2+3 – Detalhes e timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline de estados */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History size={20} className="text-indigo-600" />
              Histórico e Estados
            </h3>

            <div className="relative pl-8 space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {/* Solicitado */}
              <div className="relative">
                <div className="absolute -left-8 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <p className="font-medium">Pedido registado</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(loan.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
                </p>
              </div>

              {/* Aprovado */}
              {loan.approvalDate && (
                <div className="relative">
                  <div className="absolute -left-8 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <p className="font-medium">Aprovado</p>
                  <p className="text-sm text-gray-500">
                    Por {loan.approvedBy?.firstName} {loan.approvedBy?.lastName} •{' '}
                    {format(new Date(loan.approvalDate), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                  </p>
                </div>
              )}

              {/* Desembolsado */}
              {loan.disbursementDate && (
                <div className="relative">
                  <div className="absolute -left-8 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <CreditCard size={16} className="text-purple-600" />
                  </div>
                  <p className="font-medium">Desembolsado</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(loan.disbursementDate), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de pagamentos */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <History size={20} className="text-teal-600" />
              Pagamentos Realizados ({loan.payments?.length || 0})
            </h3>

            {loan.payments && loan.payments.length > 0 ? (
              <div className="space-y-4">
                {loan.payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium">
                        {p.amount.toLocaleString()} MT • {p.method}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(p.date), "dd/MM/yyyy HH:mm", { locale: pt })}
                      </p>
                    </div>
                    {p.notes && <p className="text-sm text-gray-600 italic">"{p.notes}"</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Ainda não existem pagamentos registados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Botões de ação (fixos no fundo em mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:static md:mt-8 md:p-0 md:border-none flex flex-wrap gap-3 justify-end">
        {loan.approvalStatus === 'Pendente' && (
          <>
            <button
              onClick={handleReject}
              className="px-6 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition flex items-center gap-2"
            >
              <XCircle size={18} /> Rejeitar
            </button>
            <button
              onClick={handleApprove}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2"
            >
              <CheckCircle2 size={18} /> Aprovar
            </button>
          </>
        )}

        {loan.approvalStatus === 'Aprovado' && !loan.disbursementDate && (
          <button
            onClick={handleDisburse}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-2"
          >
            <CreditCard size={18} /> Desembolsar
          </button>
        )}

        {loan.approvalStatus === 'Aprovado' && loan.disbursementDate && loan.outstandingBalance > 0 && (
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
          >
            <DollarSign size={18} /> Registar Pagamento
          </button>
        )}
      </div>

      {/* Modal simples para registar pagamento (podes evoluir para componente separado) */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Registar Pagamento</h3>
            
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valor (MT)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={loan.outstandingBalance}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Método</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                >
                  <option value="Cash">Numerário</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="E-Mola">E-Mola</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 py-3 border rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};