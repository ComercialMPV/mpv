// src/pages/RegisterReferralPartner.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const RegisterReferralPartner: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [verificationCode, setVerificationCode] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthYear: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Nome é obrigatório';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apelido é obrigatório';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) 
      newErrors.email = 'Email inválido';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.birthYear || parseInt(formData.birthYear) < 1900 || parseInt(formData.birthYear) > new Date().getFullYear()) 
      newErrors.birthYear = 'Ano de nascimento inválido';

    // Validação de password
    if (!formData.password) newErrors.password = 'A palavra-passe é obrigatória';
    else if (formData.password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
    else if (formData.password.length > 128) newErrors.password = 'Muito longa (máx. 128 caracteres)';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirme a palavra-passe';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As palavras-passe não coincidem';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      toast.error('Por favor corrija os erros');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/referrals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          birthYear: parseInt(formData.birthYear),
          password: formData.password,           // ← novo campo
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Erro ao registar');

      toast.success('Registo efetuado! Verifique o seu email.');
      setStep('verify');

    } catch (err: any) {
      setServerError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      toast.error('Insira o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          token: verificationCode.trim()
        }),
      });

      toast.success('Conta verificada com sucesso!');
      navigate('/login?type=referral&verified=true');

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Código inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05051e] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl"
      >
        <AnimatePresence mode="wait">
          {step === 'register' ? (
            <motion.div key="register">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white">Seja um Parceiro de Recomendação</h2>
                <p className="text-gray-400 mt-2">Ganhe comissões recorrentes recomendando clientes</p>
              </div>

              {serverError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Nome</label>
                    <input name="firstName" value={formData.firstName} onChange={handleChange}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.firstName ? 'border-red-500' : ''}`}
                      placeholder="João" required />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Apelido</label>
                    <input name="lastName" value={formData.lastName} onChange={handleChange}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.lastName ? 'border-red-500' : ''}`}
                      placeholder="Silva" required />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Email</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="seuemail@gmail.com" required />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Telefone (com DDI)</label>
                  <input name="phone" value={formData.phone} onChange={handleChange}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="+258 84 123 4567" required />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Ano de Nascimento</label>
                  <input name="birthYear" type="number" value={formData.birthYear} onChange={handleChange}
                    min="1900" max={new Date().getFullYear()}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.birthYear ? 'border-red-500' : ''}`}
                    placeholder="1995" required />
                  {errors.birthYear && <p className="text-red-400 text-xs mt-1">{errors.birthYear}</p>}
                </div>

                {/* NOVOS CAMPOS DE PASSWORD */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Palavra-passe</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                      <input
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full pl-11 bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.password ? 'border-red-500' : ''}`}
                        placeholder="Mínimo 8 caracteres"
                        required
                      />
                    </div>
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Confirmar</label>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Repita a palavra-passe"
                      required
                    />
                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? 'A registar...' : 'Quero ser Parceiro'}
                  {!loading && <ArrowRight size={20} />}
                </button>
              </form>
            </motion.div>
          ) : (
            /* PASSO DE VERIFICAÇÃO (mantido igual) */
            <motion.div key="verify" className="text-center">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={40} className="text-indigo-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Verifique o seu Email</h3>
              <p className="text-gray-400 mb-8">
                Introduza o código de 6 dígitos enviado para<br />
                <span className="text-white font-medium">{formData.email}</span>
              </p>

              <form onSubmit={handleVerify} className="space-y-6">
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-4xl tracking-[1rem] py-6 bg-white/5 border-2 border-white/10 rounded-xl text-white font-mono focus:border-indigo-500"
                  required
                />

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {loading ? "A validar..." : "Confirmar Código"}
                </button>
              </form>

              <button
                onClick={() => setStep('register')}
                className="mt-6 text-sm text-gray-400 hover:text-white"
              >
                ← Voltar e corrigir dados
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default RegisterReferralPartner;