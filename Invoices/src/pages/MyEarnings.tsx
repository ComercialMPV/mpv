// src/pages/MyEarnings.tsx
import React, { useEffect, useState } from 'react';
import { referralsApi } from '../services/api';
import toast from 'react-hot-toast';
import { DollarSign, CheckCircle, Clock, Users, ArrowRight, CreditCard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EarningsByCompany {
  companyId: string;
  companyName: string;
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  commissionCount: number;
}

interface CommissionDetail {
  _id: string;
  customerName: string;
  customerPhone: string;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
  saleId?: string;
}

const MyEarnings: React.FC = () => {
  const [earningsByCompany, setEarningsByCompany] = useState<EarningsByCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<EarningsByCompany | null>(null);
  const [companyCommissions, setCompanyCommissions] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de detalhes da empresa
  const [modalOpen, setModalOpen] = useState(false);

  // Modal de solicitar pagamento
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);

  const [paymentData, setPaymentData] = useState({
    method: 'mpesa' as 'mpesa' | 'emola' | 'bank',
    phone: '',
    nib: '',
    accountHolder: '',
    notes: ''
  });

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const res = await referralsApi.getMyEarnings();

      // Agrupar por empresa
      const grouped = res.commissions.reduce((acc: any, comm: any) => {
        const companyId = comm.company || 'unknown';
        if (!acc[companyId]) {
          acc[companyId] = {
            companyId,
            companyName: comm.companyName || 'Empresa Desconhecida',
            totalEarned: 0,
            pendingAmount: 0,
            paidAmount: 0,
            commissionCount: 0
          };
        }

        acc[companyId].totalEarned += comm.commissionAmount || 0;
        acc[companyId].commissionCount += 1;

        if (comm.status === 'pending') acc[companyId].pendingAmount += comm.commissionAmount || 0;
        else if (comm.status === 'paid') acc[companyId].paidAmount += comm.commissionAmount || 0;

        return acc;
      }, {});

      setEarningsByCompany(Object.values(grouped));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar ganhos');
    } finally {
      setLoading(false);
    }
  };

  const openCompanyModal = async (company: EarningsByCompany) => {
    setSelectedCompany(company);
    setModalOpen(true);

    try {
      const res = await referralsApi.getMyEarnings();
      setCompanyCommissions(res.commissions || []);
    } catch (err) {
      toast.error('Erro ao carregar detalhes da empresa');
    }
  };

  const openPaymentModal = (company: EarningsByCompany) => {
    setSelectedCompany(company);
    setPaymentData({
      method: 'mpesa',
      phone: '',
      nib: '',
      accountHolder: '',
      notes: ''
    });
    setPaymentModalOpen(true);
    setModalOpen(false); // fecha o modal anterior
  };

  const requestPayment = async () => {
    if (!selectedCompany) return;

    if (paymentData.method === 'mpesa' && !paymentData.phone) {
      toast.error('Por favor introduza o número de telefone para M-Pesa');
      return;
    }
    if (paymentData.method === 'bank' && (!paymentData.nib || !paymentData.accountHolder)) {
      toast.error('Por favor preencha os dados bancários');
      return;
    }

    setRequestingPayment(true);
    try {
      await referralsApi.requestPayment({
        companyId: selectedCompany.companyId,
        requestedAmount: selectedCompany.pendingAmount,
        paymentMethod: paymentData.method,
        phoneNumber: paymentData.method === 'mpesa' ? paymentData.phone : undefined,
        nibOrIban: paymentData.method === 'bank' ? paymentData.nib : undefined,
        accountHolder: paymentData.method === 'bank' ? paymentData.accountHolder : undefined,
        bankName: paymentData.method === 'bank' ? 'Banco' : undefined,
        notes: paymentData.notes
      });

      toast.success('Pedido de pagamento enviado com sucesso! A empresa será notificada.');
      setPaymentModalOpen(false);
      loadEarnings(); // recarrega os dados
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar pedido de pagamento');
    } finally {
      setRequestingPayment(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">A carregar seus ganhos...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Meus Ganhos</h1>
      <p className="text-gray-600 mb-10">Acompanhe suas comissões por empresa</p>

      {earningsByCompany.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <DollarSign className="h-20 w-20 mx-auto mb-4 opacity-40" />
          <p className="text-xl">Ainda não tem comissões</p>
          <p className="mt-2">Recomende clientes para começar a ganhar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {earningsByCompany.map((company) => (
            <motion.div
              key={company.companyId}
              whileHover={{ scale: 1.02 }}
              onClick={() => openCompanyModal(company)}
              className="bg-white border border-gray-200 rounded-3xl p-8 cursor-pointer hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-2xl text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {company.companyName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{company.commissionCount} comissões</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-700">
                    {company.totalEarned.toLocaleString('pt-MZ')} MT
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-amber-600 font-medium">Pendente</p>
                  <p className="text-2xl font-semibold">{company.pendingAmount.toLocaleString('pt-MZ')} MT</p>
                </div>
                <div>
                  <p className="text-green-600 font-medium">Já Recebido</p>
                  <p className="text-2xl font-semibold">{company.paidAmount.toLocaleString('pt-MZ')} MT</p>
                </div>
              </div>

              {company.pendingAmount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); openPaymentModal(company); }}
                  className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition"
                >
                  Solicitar Pagamento
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes da Empresa */}
      <AnimatePresence>
        {modalOpen && selectedCompany && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCompany.companyName}</h2>
                  <p className="text-gray-500">Comissões acumuladas</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-2xl text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-8 flex-1 overflow-auto">
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="bg-emerald-50 p-6 rounded-2xl">
                    <p className="text-sm text-emerald-700">Total Ganho</p>
                    <p className="text-3xl font-bold text-emerald-800 mt-2">
                      {selectedCompany.totalEarned.toLocaleString('pt-MZ')} MT
                    </p>
                  </div>
                  <div className="bg-amber-50 p-6 rounded-2xl">
                    <p className="text-sm text-amber-700">Pendente</p>
                    <p className="text-3xl font-bold text-amber-800 mt-2">
                      {selectedCompany.pendingAmount.toLocaleString('pt-MZ')} MT
                    </p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-2xl">
                    <p className="text-sm text-blue-700">Já Pago</p>
                    <p className="text-3xl font-bold text-blue-800 mt-2">
                      {selectedCompany.paidAmount.toLocaleString('pt-MZ')} MT
                    </p>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-4">Histórico de Comissões</h3>
                <div className="space-y-4">
                  {companyCommissions.map((item) => (
                    <div key={item._id} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl">
                      <div>
                        <p className="font-medium">{item.customerName}</p>
                        <p className="text-sm text-gray-500">{item.customerPhone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">
                          {item.commissionAmount.toLocaleString('pt-MZ')} MT
                        </p>
                        <p className={`text-xs mt-1 ${item.status === 'paid' ? 'text-green-600' : item.status === 'approved' ? 'text-blue-600' : 'text-amber-600'}`}>
                          {item.status === 'paid' ? 'Pago' : item.status === 'approved' ? 'Aprovado' : 'Pendente'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão Solicitar Pagamento */}
              {selectedCompany.pendingAmount > 0 && (
                <div className="border-t p-6">
                  <button
                    onClick={() => openPaymentModal(selectedCompany)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2"
                  >
                    Solicitar Pagamento de {selectedCompany.pendingAmount.toLocaleString('pt-MZ')} MT
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Solicitar Pagamento */}
      <AnimatePresence>
        {paymentModalOpen && selectedCompany && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Solicitar Pagamento</h2>
                <button onClick={() => setPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Valor a receber: <strong>{selectedCompany.pendingAmount.toLocaleString('pt-MZ')} MT</strong>
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Método de Pagamento</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['mpesa', 'emola', 'bank'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentData({ ...paymentData, method: method as any })}
                        className={`py-3 rounded-xl text-sm font-medium transition-all ${
                          paymentData.method === method
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {method === 'mpesa' ? 'M-Pesa' : method === 'emola' ? 'E-Mola' : 'Banco'}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentData.method === 'mpesa' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Número M-Pesa</label>
                    <input
                      type="tel"
                      placeholder="+258 84 XXX XXXX"
                      value={paymentData.phone}
                      onChange={(e) => setPaymentData({ ...paymentData, phone: e.target.value })}
                      className="w-full border rounded-xl p-4"
                    />
                  </div>
                )}

                {paymentData.method === 'emola' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Número E-Mola</label>
                    <input
                      type="tel"
                      placeholder="+258 82 XXX XXXX"
                      value={paymentData.phone}
                      onChange={(e) => setPaymentData({ ...paymentData, phone: e.target.value })}
                      className="w-full border rounded-xl p-4"
                    />
                  </div>
                )}

                {paymentData.method === 'bank' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">NIB / IBAN</label>
                      <input
                        type="text"
                        value={paymentData.nib}
                        onChange={(e) => setPaymentData({ ...paymentData, nib: e.target.value })}
                        className="w-full border rounded-xl p-4"
                        placeholder="0000 0000 0000 0000 0000 0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Titular da Conta</label>
                      <input
                        type="text"
                        value={paymentData.accountHolder}
                        onChange={(e) => setPaymentData({ ...paymentData, accountHolder: e.target.value })}
                        className="w-full border rounded-xl p-4"
                        placeholder="Nome completo do titular"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Notas (opcional)</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    className="w-full border rounded-xl p-4 h-24"
                    placeholder="Observações para a empresa..."
                  />
                </div>
              </div>

              <button
                onClick={requestPayment}
                disabled={requestingPayment}
                className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                {requestingPayment ? 'A enviar pedido...' : 'Enviar Pedido de Pagamento'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyEarnings;