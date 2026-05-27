import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
// Dentro do componente
const location = useLocation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
// Toast de verificação bem-sucedida
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      toast.success('Conta verificada com sucesso! Faça login para continuar.');
    }
  }, [location]);

  // REDIRECIONAMENTO AUTOMÁTICO quando o user mudar no contexto
  useEffect(() => {
    if (user) {
      const roleName = user.role?.roleName || user.role;

      if (roleName === 'referralPartner') {
        navigate('/referral/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      toast.success('Bem-vindo de volta!');

      // NÃO precisamos de setTimeout nem de verificar user aqui
      // O useEffect acima vai fazer o redirecionamento automaticamente

    } catch (err: any) {
      let msg = 'Falha no login. Tente novamente.';

      if (err.response?.data?.message) {
        msg = err.response.data.message;

        if (err.response.data.errorType === 'user_not_found') {
          msg = 'Não encontramos nenhuma conta com este email. Quer criar uma?';
        }
      } else if (err.message) {
        msg = err.message;
      }

      if (msg.includes('No refresh token available')) {
        msg = 'Falha no login. Verifique suas credenciais.';
      }

      if (err.response?.status === 403 && msg.includes('não verificada')) {
        msg += ' Verifique o seu email para ativar a conta.';
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#05051e] flex flex-col lg:flex-row overflow-hidden">
      
      {/* Coluna Esquerda: Marketing & Branding (Visível apenas em Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden border-r border-white/5">
        {/* Background Decorativo */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/20 blur-[100px] rounded-full"></div>

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

        <div className="relative z-10 max-w-lg">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-medium text-white leading-tight mb-8"
          >
            Acompanhe o seu negócio de <span className="text-indigo-400 italic">qualquer lugar.</span>
          </motion.h2>

          <div className="space-y-6">
            {[
              { icon: <TrendingUp className="text-indigo-400" />, text: "Visualize as suas metas em tempo real." },
              { icon: <ShieldCheck className="text-indigo-400" />, text: "Dados protegidos com criptografia de ponta." },
              { icon: <CheckCircle2 className="text-indigo-400" />, text: "Gestão completa de stock e vendas online." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="flex items-center gap-4 text-gray-400"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  {item.icon}
                </div>
                <p className="text-lg">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/5">
          <p className="text-gray-500 text-sm italic">
            "Transformamos a forma como PMEs em Moçambique gerem o seu crescimento."
          </p>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Login */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        {/* Mobile Logo */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
             <img 
                    src={"https://meupontodevenda.com/cdn/logo-white.svg"} 
                    alt="Meu Ponto de Venda"
                    className="w-auto h-10 object-contain shrink-0"
                  />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
            <div className="mb-10 text-left">
              <h3 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h3>
              <p className="text-gray-400">Introduza as suas credenciais para aceder ao ERP.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 mb-6"
              >
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-200">{error}</p>
                {error.includes('nenhuma conta') && (
                  <Link to="/register" className="text-indigo-400 hover:underline ml-2">
                    Criar conta agora
                  </Link>
                )}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-indigo-400 transition-colors">E-mail Corporativo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                      placeholder="exemplo@empresa.com"
                    />
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-400 group-focus-within:text-indigo-400 transition-colors">Senha</label>
                    <Link to="/forgot-password" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border rounded-md transition-all ${rememberMe ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                      {rememberMe && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Manter a minha sessão aberta</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>Aceder à conta <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-gray-400 text-sm">
                Ainda não tem conta?{' '}
                <Link 
                  to="/register" 
                  className="font-bold text-white hover:text-indigo-400 transition-colors underline underline-offset-4"
                >
                  Registe a sua empresa agora
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};