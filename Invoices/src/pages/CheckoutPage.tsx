"use client";
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, CreditCard, ArrowLeft, 
  Zap, Lock, Wallet, Building2, User, Phone, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Recupera o plano selecionado (ex: vindo da landing page ou registo)
  const planData = location.state?.plan || {
    name: 'Profissional',
    price: 1999,
    period: 'mensal'
  };

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'emola' | 'visa' | 'none'>('none');
  const [billingPeriod, setBillingPeriod] = useState(planData.period || 'mensal');
  
  // Dados do Cliente (Campos solicitados)
  const [customer, setCustomer] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    address: ''
  });

  const calculateTotal = () => {
    let price = Number(planData.price);
    // Se mudar para anual no checkout, aplica-se a lógica de desconto (ex: 20%)
    if (billingPeriod === 'anual') {
      price = price * 12 * 0.8; 
    }
    return price;
  };

  const total = calculateTotal();

  const handleProcessPayment = async () => {
    if (paymentMethod === 'none') return toast.error('Selecione um método de pagamento');
    if (!customer.fullName || !customer.companyName || !customer.phone) {
      return toast.error('Preencha todos os campos obrigatórios');
    }

    setSubmitting(true);
    try {
      // Utiliza a lógica de checkout adaptada do portal
      const resp = await api.checkout.process({
        totalAmount: total,
        method: paymentMethod,
        planId: planData.name.toLowerCase(),
        customer: {
          name: customer.fullName,
          company: customer.companyName,
          phone: customer.phone,
          address: customer.address
        },
        items: [{
          name: `Subscrição ${planData.name} - ${billingPeriod.toUpperCase()}`,
          quantity: 1,
          price: total,
          type: 'subscription'
        }]
      });

      if (resp?.success && resp.url) {
        window.location.href = resp.url;
      } else {
        toast.success('Subscrição ativada!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar subscrição');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020210] text-white pt-20 pb-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Lado Esquerdo: Formulário */}
        <div className="lg:col-span-7 space-y-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Voltar
          </button>

          <header>
            <h1 className="text-3xl font-medium tracking-tight">Dados de <span className="text-indigo-500 italic">Faturação</span></h1>
            <p className="text-gray-500 text-sm mt-2">Preencha as informações para ativar a sua conta profissional.</p>
          </header>

          {/* Período de Subscrição */}
          <section className="grid grid-cols-2 gap-4 p-2 bg-white/5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setBillingPeriod('mensal')}
              className={`py-3 rounded-xl text-xs font-medium transition-all ${billingPeriod === 'mensal' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
            >
              Mensal
            </button>
            <button 
              onClick={() => setBillingPeriod('anual')}
              className={`py-3 rounded-xl text-xs font-medium transition-all ${billingPeriod === 'anual' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
            >
              Anual (-20%)
            </button>
          </section>

          {/* Informações do Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={customer.fullName}
                  onChange={e => setCustomer({...customer, fullName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Ex: João Silva"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 ml-1">Nome da Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={customer.companyName}
                  onChange={e => setCustomer({...customer, companyName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Nome do seu negócio"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 ml-1">Contacto Telefónico</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="tel" 
                  value={customer.phone}
                  onChange={e => setCustomer({...customer, phone: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-indigo-500 outline-none transition-all" 
                  placeholder="+258 ..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 ml-1">Endereço de Faturação</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={customer.address}
                  onChange={e => setCustomer({...customer, address: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Cidade, Bairro, Rua"
                />
              </div>
            </div>
          </div>

          {/* Métodos de Pagamento */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Pagamento Local</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['mpesa', 'emola', 'visa'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as any)}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    paymentMethod === method ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{method}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Lado Direito: Resumo */}
        <div className="lg:col-span-5">
          <div className="sticky top-32 p-8 rounded-[2.5rem] bg-[#080825] border border-white/5">
            <h4 className="text-lg font-medium mb-6">Resumo da <span className="text-indigo-400">Ativação</span></h4>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plano</span>
                <span>{planData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ciclo</span>
                <span className="capitalize">{billingPeriod}</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total</span>
                <span className="text-3xl font-medium tracking-tighter">
                  {total.toLocaleString()} <span className="text-sm font-light">MT</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleProcessPayment}
              disabled={submitting}
              className="w-full py-5 bg-white text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'A Processar...' : 'Confirmar Subscrição'}
              <Zap size={14} className="fill-current" />
            </button>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[9px] text-gray-600 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-indigo-500" /> Ativação Imediata após pagamento
              </div>
              <div className="flex items-center gap-2 text-[9px] text-gray-600 uppercase tracking-widest">
                <Lock size={12} className="text-indigo-500" /> Dados seguros e encriptados
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;