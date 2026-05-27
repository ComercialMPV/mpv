import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, Key, ArrowLeft, 
  ShieldCheck, ArrowRight, Info,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

export const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ code: '', newPassword: '' });
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success('Código enviado com sucesso!');
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.code.length !== 6) {
      toast.error('O código deve ter 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, ...formData });
      toast.success('Senha alterada com sucesso!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#05051e] flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* Coluna Esquerda: Branding & Security (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 border-r border-white/5">
        {/* Efeito de luz de fundo */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        
        <Link to="/" className="flex items-center gap-2 relative z-10 group">
        <div className="flex items-center gap-3 mb-6">
                  {/* Logo Icon / Symbol - Visible only on Mobile (below 'sm' breakpoint) */}
                  <img 
                    src="https://meupontodevenda.com/cdn/logo-icon.svg" 
                    alt="MPVD Icon" 
                    className="block sm:hidden w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  />

                  {/* Full Logo - Visible on Tablets and Desktops ('sm' and up) */}
                  <img 
                    src="https://meupontodevenda.com/cdn/logo-white.svg" 
                    alt="Meu Ponto de Venda" 
                    className="hidden sm:block w-44 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  />          
                </div>
        </Link>

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-8 text-indigo-400"
          >
            <ShieldCheck size={32} />
          </motion.div>
          
          <h2 className="text-5xl font-medium text-white leading-tight mb-6">
            Recupere o seu acesso de forma <span className="text-indigo-400 italic">segura.</span>
          </h2>
          
          <p className="text-gray-400 text-lg leading-relaxed">
            Protegemos os dados da sua empresa com os mais altos padrões de segurança. Siga os passos para redefinir a sua credencial.
          </p>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/5">
          <p className="text-gray-500 text-sm italic">
            "Segurança e simplicidade na gestão do seu negócio."
          </p>
        </div>
      </div>

      {/* Coluna Direita: Formulários (Glassmorphism) */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            /* PASSO 1: Solicitar Código */
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mb-8 transition-colors">
                  <ArrowLeft size={16} /> Voltar ao Login
                </Link>

                <div className="mb-10">
                  <h3 className="text-3xl font-bold text-white mb-2">Esqueceu a senha?</h3>
                  <p className="text-gray-400">Introduza o seu e-mail para receber um código de 6 dígitos.</p>
                </div>

                <form onSubmit={handleRequestCode} className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-400 ml-1 group-focus-within:text-indigo-400 transition-colors">E-mail Corporativo</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {loading ? "A processar..." : "Enviar Código de Acesso"}
                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            /* PASSO 2: Código e Nova Senha */
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] uppercase tracking-widest font-bold mb-4">
                    <CheckCircle2 size={12} /> Código enviado
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">Nova Senha</h3>
                  <p className="text-gray-400 text-sm">Introduza o código de 6 dígitos e a sua nova senha.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 text-center block">Código de Verificação</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:border-indigo-500 outline-none transition-all"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 ml-1">Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <input
                        type="password"
                        required
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-500/5 rounded-xl flex gap-3 items-start border border-indigo-500/10">
                    <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Certifique-se de escolher uma senha forte que não tenha utilizado anteriormente nesta plataforma.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {loading ? "A redefinir..." : "Redefinir Senha"}
                  </button>
                </form>

                <button
                  onClick={() => setStep(1)}
                  className="mt-8 w-full text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={14} /> Não recebeu o código? Tentar novamente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};