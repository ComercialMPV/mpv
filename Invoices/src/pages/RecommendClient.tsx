// src/pages/RecommendClient.tsx
import React, { useState, useEffect } from 'react';
import { referralsApi, companyApi } from '../services/api';
import toast from 'react-hot-toast';
import { Building2, User, Phone, ArrowRight, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompanyOption {
  _id: string;
  name: string;
  referralCommissionRate?: number;
}

const RecommendClient: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '' // Novo campo para email do cliente
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar empresas com referralProgramEnabled = true
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true);
        
        // ✅ CORREÇÃO: Usar um endpoint que retorna lista (não getProfile)
        const res = await companyApi.getReferralEnabledCompanies();

        if (Array.isArray(res)) {
          setCompanies(res);
        } else {
          setCompanies([]);
          toast.error('Não foi possível carregar as empresas');
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Erro ao carregar empresas disponíveis para recomendação');
        setCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.companyId) newErrors.companyId = 'Selecione uma empresa';
    if (!form.customerName.trim()) newErrors.customerName = 'Nome do cliente é obrigatório';
    if (!form.customerPhone.trim()) newErrors.customerPhone = 'Telefone do cliente é obrigatório';
    if (!form.customerEmail.trim()) newErrors.customerEmail = 'Email do cliente é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Por favor corrija os erros');
      return;
    }

    setLoading(true);
    try {
      await referralsApi.recommendClient({
        companyId: form.companyId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() // Enviar email para o backend
      });

      toast.success('Cliente recomendado com sucesso! Você receberá comissão nas compras dele.');

      setForm({ companyId: '', customerName: '', customerPhone: '', customerEmail: '' });
      setErrors({});

    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erro ao recomendar cliente';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">Recomendar Cliente</h1>
          <p className="text-gray-600 mt-3 text-lg">
            Indique um cliente e ganhe comissão recorrente em todas as compras dele
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <div className="space-y-8">
            {/* Seleção de Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa para recomendar
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-4 text-gray-400" size={20} />
                <select
                  name="companyId"
                  value={form.companyId}
                  onChange={handleChange}
                  className={`w-full pl-12 border rounded-2xl py-4 focus:ring-2 focus:ring-indigo-500 bg-white ${errors.companyId ? 'border-red-500' : 'border-gray-300'}`}
                  required
                  disabled={loadingCompanies}
                >
                  <option value="">Selecione uma empresa...</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name} 
                      {company.referralCommissionRate && ` (${company.referralCommissionRate}% comissão)`}
                    </option>
                  ))}
                </select>
              </div>
              {errors.companyId && <p className="text-red-500 text-sm mt-1">{errors.companyId}</p>}
              {loadingCompanies && <p className="text-sm text-gray-500 mt-1">A carregar empresas disponíveis...</p>}
            </div>

            {/* Nome do Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo do cliente</label>
              <div className="relative">
                <User className="absolute left-4 top-4 text-gray-400" size={20} />
                <input
                  type="text"
                  name="customerName"
                  placeholder="Ex: Maria João dos Santos"
                  value={form.customerName}
                  onChange={handleChange}
                  className={`w-full pl-12 border rounded-2xl py-4 focus:ring-2 focus:ring-indigo-500 ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
              </div>
              {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefone do cliente</label>
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-gray-400" size={20} />
                <input
                  type="tel"
                  name="customerPhone"
                  placeholder="+258 84 123 4567"
                  value={form.customerPhone}
                  onChange={handleChange}
                  className={`w-full pl-12 border rounded-2xl py-4 focus:ring-2 focus:ring-indigo-500 ${errors.customerPhone ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
              </div>
              {errors.customerPhone && <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>}
            </div>
              {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email do cliente</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                <input
                  type="email"
                  name="customerEmail"
                  placeholder="cliente@exemplo.com"
                  value={form.customerEmail}
                  onChange={handleChange}
                  className={`w-full pl-12 border rounded-2xl py-4 focus:ring-2 focus:ring-indigo-500 ${errors.customerPhone ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
              </div>
              {errors.customerPhone && <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || loadingCompanies || !form.companyId}
            className="mt-10 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/70 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg"
          >
            {loading ? 'A recomendar cliente...' : 'Recomendar Cliente'} 
            <ArrowRight size={22} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default RecommendClient;