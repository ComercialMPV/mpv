// src/pages/TemplateCheckout.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShieldCheck, Phone, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TemplateCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const variantId = searchParams.get('variant');

  const [variant, setVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'emola' | 'visa'>('emola');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');

  useEffect(() => {
    if (variantId) loadVariant();
  }, [variantId]);

  const loadVariant = async () => {
    try {
      const data = await api.adminBuiltInVariants.getById(variantId!);
      setVariant(data);
    } catch (err) {
      toast.error('Template não encontrado');
      navigate('/gallery');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!variant || !variantId) {
      toast.error("Template inválido");
      return;
    }

    // Validação de telefone para mobile money
    if ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !phoneNumber) {
      toast.error('Número de telefone é obrigatório para M-Pesa e E-Mola');
      return;
    }

    setSubmitting(true);
    try {
      // Garantir dados do cliente (prioridade: user → fallback)
      const customerName = user?.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : user?.name || "Cliente Template";

      const customerEmail = user?.email || "cliente@meupontodevenda.com";

      const payload = {
        variantId,
        variantName: variant.name,
        totalAmount: variant.price,
        method: paymentMethod,
        customer: {
          name: customerName,
          phone: phoneNumber,
          email: customerEmail
        },
        companyId: user?.company?._id || user?.company,
        userId: user?._id,
      };

      console.log("📤 Payload enviado:", payload);

      const response = await api.checkout.template(payload);

      if (response?.success) {
        if (response.url) {
          toast.loading("Redirecionando para o pagamento...", { id: 'payment' });
          window.location.href = response.url;
        } else {
          toast.success('Template ativado com sucesso!');
          navigate('/dashboard?tab=public-portal');
        }
      } else {
        toast.error(response?.message || 'Não foi possível iniciar o pagamento');
      }
    } catch (err: any) {
      console.error('Template payment error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Erro ao processar pagamento';
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020210] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Carregando template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020210] text-white pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 mb-8 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={20} /> Voltar à Galeria
        </button>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Detalhes */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="text-amber-400" size={32} />
                <h1 className="text-3xl font-bold">Checkout - Template Premium</h1>
              </div>

              <h2 className="text-2xl font-semibold mb-3">{variant?.name}</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">{variant?.description}</p>

              {/* Métodos de Pagamento */}
              <div className="mb-8">
                <p className="text-sm text-gray-400 mb-3">Método de Pagamento</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'emola', label: 'E-Mola', icon: '📱' },
                    { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
                    { id: 'visa',  label: 'Cartão', icon: '💳' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-4 rounded-2xl border transition-all text-center ${
                        paymentMethod === m.id 
                          ? 'border-indigo-500 bg-indigo-500/10' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="text-2xl mb-2">{m.icon}</div>
                      <div className="font-medium text-sm">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Telefone */}
              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div className="mb-8">
                  <label className="text-sm text-gray-400 mb-2 block">
                    Número de Telefone ({paymentMethod.toUpperCase()})
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 text-gray-500" size={20} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="84 123 4567"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="bg-black/40 rounded-2xl p-6">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400 text-lg">Pagamento Único</span>
                  <div>
                    <span className="text-5xl font-bold text-white">{variant?.price}</span>
                    <span className="text-2xl font-medium text-gray-400"> MT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="lg:col-span-2">
            <div className="sticky top-8 bg-[#0a0a0a] border border-white/10 rounded-3xl p-8">
              <h3 className="font-bold text-xl mb-6">Resumo da Compra</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Template</span>
                  <span className="font-medium text-right">{variant?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Tipo</span>
                  <span className="text-amber-400 font-medium">PREMIUM • Vitalício</span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 flex justify-between items-center text-3xl font-bold">
                <span>Total</span>
                <span>{variant?.price} MT</span>
              </div>

              <button
                onClick={handlePayment}
                disabled={submitting || 
                  ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !phoneNumber)}
                className="mt-10 w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {submitting ? 'Processando...' : 'Pagar e Ativar Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateCheckout;