// src/components/CheckoutModal.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Lock,
  X,
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, type SubscriptionPlan, requisitionsApi } from '../services/api';
import { format, addDays } from 'date-fns';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
}

const BILLING_CYCLES = [
  { months: 1,  label: '1 Mês (Mensal)',      discount: 0   },
  { months: 3,  label: '3 Meses (Trimestral)', discount: 5   },
  { months: 6,  label: '6 Meses (Semestral)',  discount: 8   },
  { months: 12, label: '12 Meses (Anual)',     discount: 11  },
  { months: 0,  label: 'Personalizado',        discount: 0   },
];

const PAYMENT_METHODS = [
  { id: 'mpesa',         name: 'M-Pesa',         icon: Smartphone, color: 'text-green-500' },
  { id: 'emola',         name: 'E-Mola',         icon: Smartphone, color: 'text-blue-500'   },
  { id: 'visa',          name: 'Cartão Visa',    icon: CreditCard, color: 'text-indigo-500' },
  { id: 'transferencia', name: 'Transferência Bancária', icon: Banknote, color: 'text-purple-500' },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, plan }) => {
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('none');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [billingCycle, setBillingCycle] = useState<number>(1);
  const [customMonths, setCustomMonths] = useState<number | ''>('');
  const [customer, setCustomer] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    address: ''
  });
  const [showAwaitingConfirmation, setShowAwaitingConfirmation] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState('');
  const [pollStatus, setPollStatus] = useState<'waiting'|'confirmed'|'failed'>('waiting');
  const [pollAttempts, setPollAttempts] = useState(0);

  if (!isOpen) return null;

  const selectedCycle = BILLING_CYCLES.find(c => c.months === billingCycle) || BILLING_CYCLES[0];
  const isCustom = billingCycle === 0;
  const effectiveMonths = isCustom ? (Number(customMonths) || 1) : billingCycle;
  const discount = isCustom ? 0 : selectedCycle.discount;

  const calculateTotal = () => {
    if (plan.price === 0) return 0;
    const base = plan.price * effectiveMonths;
    const discounted = base * (1 - discount / 100);
    return Math.round(discounted);
  };

  const total = calculateTotal();

  const validate = (): string | null => {
    if (paymentMethod === 'none') return 'Selecione um método de pagamento';
    if (!customer.fullName.trim()) return 'Informe o nome completo';
    if (!customer.companyName.trim()) return 'Informe o nome da empresa';
    if (!customer.phone.trim()) return 'Informe o telefone';
    const phoneDigits = customer.phone.replace(/\D/g, '');
    if (phoneDigits.length < 9) return 'Telefone deve ter pelo menos 9 dígitos';
    if (isCustom && (!customMonths || Number(customMonths) < 1 || Number(customMonths) > 36)) {
      return 'Informe uma quantidade de meses entre 1 e 36';
    }
    if (paymentMethod === 'mpesa' || paymentMethod === 'emola') {
      const cleaned = mobileMoneyPhone.replace(/[^0-9]/g, '');
      if (!cleaned) return `Informe o número ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para cobrança`;
      if (paymentMethod === 'mpesa' && !cleaned.startsWith('84') && !cleaned.startsWith('85')) {
        return 'Número M-Pesa deve começar com 84 ou 85';
      }
      if (paymentMethod === 'emola' && !cleaned.startsWith('86') && !cleaned.startsWith('87')) {
        return 'Número E-Mola deve começar com 86 ou 87';
      }
    }
    return null;
  };

  const handleProcessPayment = async () => {
    const validationError = validate();
    if (validationError) return toast.error(validationError);

    setSubmitting(true);

    try {
      if (paymentMethod === 'transferencia') {
        const tomorrow = addDays(new Date(), 1).toISOString();

        const requisitionPayload = {
          items: [{
            itemType: 'Bundle',
            item: plan.id,
            quantity: effectiveMonths,
            priceAtTime: total
          }],
          client: null,
          deliveryDate: tomorrow,
          notes: `Subscrição ${plan.name} - ${effectiveMonths} mês(es) via Transferência`,
          requestIntent: 'factura',
          requestedInstallments: 1
        };

        await api.requisitions.create(requisitionPayload);
        toast.success('Requisição de fatura criada com sucesso! Aguarde confirmação.');
        onClose();
      } else {
        const payload = {
          totalAmount: total,
          method: paymentMethod,
          mobileMoneyPhone: (paymentMethod === 'mpesa' || paymentMethod === 'emola') ? mobileMoneyPhone : undefined,
          customer: {
            name: customer.fullName.trim(),
            companyName: customer.companyName.trim(),
            phone: customer.phone.trim(),
            address: customer.address.trim() || undefined
          },
          planId: plan.id,
          isSubscription: true,
          billingCycle: isCustom ? 'custom' : effectiveMonths === 12 ? 'annual' : 'monthly',
          customMonths: isCustom ? Number(customMonths) : undefined,
          items: [{
            name: `Subscrição ${plan.name} - ${effectiveMonths} mês(es)`,
            price: total,
            quantity: 1
          }]
        };

        const response = await api.checkout.process(payload);

        if (response.awaiting_confirmation || (response.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
          setAwaitingRef(response.externalRef || response.reference || '');
          setShowAwaitingConfirmation(true);
        } else if (response.url) {
          window.location.href = response.url;
        } else {
          toast.success('Pagamento processado com sucesso!');
          onClose();
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || (err.message?.includes('Network') ? 'Erro de rede — verifique sua conexão' : null)
        || 'Erro ao processar pagamento. Tente novamente.';
      toast.error(msg);
      console.error('Process error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Poll transaction status when awaiting confirmation ──
  useEffect(() => {
    if (!showAwaitingConfirmation || !awaitingRef) return;
    let cancelled = false;
    setPollStatus('waiting');
    setPollAttempts(0);

    const interval = setInterval(async () => {
      try {
        const res = await api.checkout.transactionStatus(awaitingRef);
        if (cancelled) return;
        if (res?.found && res.transaction) {
          if (res.transaction.status === 'success') {
            setPollStatus('confirmed');
            clearInterval(interval);
            setTimeout(() => {
              setShowAwaitingConfirmation(false);
              toast.success('Pagamento processado com sucesso!');
              onClose();
            }, 1500);
            return;
          } else if (res.transaction.status === 'failed') {
            setPollStatus('failed');
            clearInterval(interval);
            setTimeout(() => setShowAwaitingConfirmation(false), 3000);
            return;
          }
        }
        setPollAttempts(p => p + 1);
      } catch {}
    }, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [showAwaitingConfirmation, awaitingRef]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-gray-900 to-black p-5 md:p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Finalizar Subscrição</h2>
            <p className="text-gray-400 text-sm md:text-base mt-1">
              Plano <span className="text-indigo-400 font-semibold">{plan.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
            <X size={28} />
          </button>
        </div>

        <div className="p-5 md:p-8 space-y-6 md:space-y-8">
          {/* Aguardando Confirmação */}
          {showAwaitingConfirmation ? (
            <div className="text-center py-12">
              {pollStatus === 'waiting' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mb-6">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">A aguardar confirmação</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Um pedido de pagamento foi enviado para o seu telemóvel.<br />
                    <strong className="text-white">Introduza o seu PIN no telefone</strong> para autorizar.
                  </p>
                  {awaitingRef && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-6 inline-block">
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Referência</p>
                      <p className="font-mono text-sm text-amber-400">{awaitingRef}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mb-5">A verificar a cada 3 segundos... (tentativa {pollAttempts})</p>
                  <button onClick={onClose} className="px-8 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all">
                    Fechar
                  </button>
                </>
              )}
              {pollStatus === 'confirmed' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Pagamento Confirmado!</h3>
                  <p className="text-gray-400 text-sm">Redirecionando...</p>
                </>
              )}
              {pollStatus === 'failed' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-400/20 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Pagamento não confirmado</h3>
                  <p className="text-gray-400 text-sm">O pagamento não foi autorizado. Tente novamente.</p>
                </>
              )}
            </div>
          ) : (
          <>
          {/* Resumo do Plano */}
          <div className="bg-white/5 rounded-2xl p-5 md:p-6 border border-white/10">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Resumo</h3>
            <div className="space-y-4 text-sm md:text-base">
              <div className="flex justify-between">
                <span className="text-gray-400">Plano</span>
                <span className="font-medium text-white">{plan.name}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <span className="text-gray-400">Ciclo de Cobrança</span>
                <select
                  value={billingCycle}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBillingCycle(val);
                    if (val !== 0) setCustomMonths('');
                  }}
                  className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:border-indigo-500 outline-none w-full sm:w-auto"
                >
                  {BILLING_CYCLES.map(cycle => (
                    <option key={cycle.months} value={cycle.months}>
                      {cycle.label}
                    </option>
                  ))}
                </select>
              </div>

              {isCustom && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                  <span className="text-gray-400 whitespace-nowrap">Meses personalizados:</span>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={customMonths}
                    onChange={e => setCustomMonths(e.target.value ? Number(e.target.value) : '')}
                    className="bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-2.5 focus:border-indigo-500 outline-none w-full sm:w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Ex: 4"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 block">Total</span>
                  {discount > 0 && (
                    <span className="text-xs text-green-400">
                      {discount}% desconto aplicado
                    </span>
                  )}
                </div>
                <span className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  {total.toLocaleString('pt-MZ')} <span className="text-xl font-normal">MT</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-5">
            <h3 className="text-lg md:text-xl font-semibold text-white">Dados de Cobrança</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nome Completo *</label>
                <input
                  type="text"
                  value={customer.fullName}
                  onChange={e => setCustomer({ ...customer, fullName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nome da Empresa *</label>
                <input
                  type="text"
                  value={customer.companyName}
                  onChange={e => setCustomer({ ...customer, companyName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Telefone *</label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                  placeholder="+258 84 XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Morada (opcional)</label>
                <input
                  type="text"
                  value={customer.address}
                  onChange={e => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                  placeholder="Endereço completo"
                />
              </div>
            </div>
          </div>

          {/* Métodos de Pagamento */}
          <div className="space-y-4">
            <h3 className="text-lg md:text-xl font-semibold text-white">Forma de Pagamento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-white flex flex-col items-center gap-2 text-center ${
                    paymentMethod === method.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <method.icon size={28} className={method.color} />
                  <span className="text-xs md:text-sm font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Money Phone */}
          {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {paymentMethod === 'mpesa' ? 'Número M-Pesa (84/85)' : 'Número E-Mola (86/87)'}
              </label>
              <input
                type="tel"
                value={mobileMoneyPhone}
                onChange={e => setMobileMoneyPhone(e.target.value)}
                placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
              />
              <p className="text-[10px] text-gray-500">
                {paymentMethod === 'mpesa'
                  ? 'O número deve começar com 84 ou 85'
                  : 'O número deve começar com 86 ou 87'}
              </p>
            </div>
          )}

          {/* Botão Final */}
          <button
            onClick={handleProcessPayment}
            disabled={submitting || paymentMethod === 'none' || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg uppercase tracking-wider hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-900/30 mt-6"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                A Processar...
              </>
            ) : paymentMethod === 'transferencia' ? (
              <>
                Criar Requisição de Fatura
                <Zap size={20} className="fill-current" />
              </>
            ) : (
              <>
                Confirmar Pagamento
                <Zap size={20} className="fill-current" />
              </>
            )}
          </button>

          </>
          )}
          {/* Segurança */}
          {!showAwaitingConfirmation && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-gray-500 pt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-400" />
              Pagamento 100% seguro
            </div>
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-green-400" />
              Criptografia ponta a ponta
            </div>
          </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutModal;