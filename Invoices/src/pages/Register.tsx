import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, User, Building2, 
  AlertCircle, ArrowLeft, CheckCircle2, 
  ShieldCheck, Rocket, Zap, ArrowRight 
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { adminBuiltInVariantsApi, API_BASE_URL, authApi } from '../services/api';
const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_PORTAL_BASE_URL || 'http://localhost:5173/public';

export const Register: React.FC = () => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    companyEmail: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);  
  const [searchParams] = useSearchParams();
  const templateParam = searchParams.get('template');
  const isPaidTemplate = searchParams.get('paid') === 'true';

  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<any>(null)

  useEffect(() => {
    const loadVariant = async () => {
      if (!templateParam) return;
      
      try {
        const variant = await adminBuiltInVariantsApi.getById(templateParam);
        setSelectedVariant(variant);
        console.log("Template carregado:", variant.name, "Preço:", variant.price);
      } catch (err) {
        console.warn("Template não encontrado:", templateParam);
      }
    };

    loadVariant();
  }, [templateParam]);

  // Regex para nomes (aceita acentos, ç, ã, õ, espaços, hífen, apóstrofo)
  const nameRegex = /^[\p{Letter}\s'’-]{2,60}$/u;

  const validateField = (name: string, value: string) => {
    let error = '';

    switch (name) {
      case 'firstName':
        if (!value.trim()) error = 'O nome próprio é obrigatório';
        else if (!nameRegex.test(value.trim())) error = 'Nome com caracteres inválidos';
        else if (value.trim().length > 60) error = 'Nome muito longo (máx. 60 caracteres)';
        break;

      case 'lastName':
        if (!value.trim()) error = 'O apelido é obrigatório';
        else if (!nameRegex.test(value.trim())) error = 'Apelido com caracteres inválidos';
        else if (value.trim().length > 60) error = 'Apelido muito longo (máx. 60 caracteres)';
        break;

      case 'email':
        if (!value.trim()) error = 'O e-mail é obrigatório';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'E-mail inválido';
        break;

      case 'companyName':
        if (!value.trim()) error = 'O nome da empresa é obrigatório';
        else if (value.trim().length < 2) error = 'Nome da empresa muito curto';
        else if (value.trim().length > 100) error = 'Nome da empresa muito longo';
        break;

      case 'companyEmail':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'E-mail da empresa inválido';
        }
        break;
        

      case 'password':
        if (!value) error = 'A palavra-passe é obrigatória';
        else if (value.length < 8) error = 'Mínimo 8 caracteres';
        else if (value.length > 128) error = 'Muito longa (máx. 128)';
        break;

      case 'confirmPassword':
        if (!value) error = 'Confirme a palavra-passe';
        else if (value !== formData.password) error = 'As palavras-passe não coincidem';
        break;

      default:
        break;
    }

    return error;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key as keyof typeof formData]);
      if (err) newErrors[key] = err;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Verifica disponibilidade da empresa (nome ou email) em tempo real
const checkCompanyAvailability = async (field: 'name' | 'email', value: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/companies/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Empresa já existe
      setErrors(prev => ({
        ...prev,
        [field === 'name' ? 'companyName' : 'companyEmail']: data.message || 'Já existe'
      }));
    } else {
      // Disponível → remove erro se existir
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field === 'name' ? 'companyName' : 'companyEmail'];
        return newErrors;
      });
    }
  } catch (err) {
    console.error('Erro ao verificar disponibilidade:', err);
    // Não mostramos erro ao utilizador se falhar a verificação (evita frustração)
  }
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  setServerError(null);

  // Validação em tempo real dos campos já tocados
  if (touched[name]) {
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }

  // === NOVA VALIDAÇÃO EM TEMPO REAL PARA EMPRESA ===
  if (name === 'companyName' && value.trim().length >= 3) {
    checkCompanyAvailability('name', value.trim());
  }

  if (name === 'companyEmail' && value.trim().length > 5) {
    checkCompanyAvailability('email', value.trim().toLowerCase());
  }
};

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setServerError(null);

  const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
  setTouched(allTouched);

  if (!validateForm()) {
    toast.error('Por favor corrija os erros indicados');
    return;
  }

  setLoading(true);
  try {
    const response = await register({
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      companyName: formData.companyName.trim(),
      companyEmail: formData.companyEmail.trim() || undefined,
      variant: templateParam || 'default'
    });

    // SALVAR TOKENS (mesmo que ainda não esteja verificado)
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    toast.success('Conta criada! Verifique o seu email.');

    const needsCheckout = selectedVariant?.price && selectedVariant.price > 0;

    if (needsCheckout && templateParam) {
      // Para templates pagos → vai para verificação primeiro
      setStep('verify');
    } else {
      // Templates gratuitos → vai direto para dashboard
      navigate('/dashboard');
    }

  } catch (err: any) {
    const msg = err.response?.data?.message || 'Erro ao criar conta.';
    setServerError(msg);
    toast.error(msg);
  } finally {
    setLoading(false);
  }
};

// ====================== VERIFICAÇÃO ======================
const handleVerify = async (e: React.FormEvent) => {
  e.preventDefault();
  if (verificationCode.length !== 6) {
    toast.error('Insira o código completo de 6 dígitos');
    return;
  }

  setLoading(true);
  try {
    const verifyResponse = await authApi.verifyEmail(
      formData.email.trim(), 
      verificationCode.trim()
    );

    toast.success('E-mail verificado com sucesso!');

    const needsCheckout = selectedVariant?.price && selectedVariant.price > 0;

    if (needsCheckout && templateParam) {
      // Tenta fazer login automático após verificação
      try {
        await loginAfterVerification(formData.email.trim(), formData.password);
      } catch (loginErr) {
        console.warn("Não foi possível login automático, redirecionando para login...", loginErr);
        // Fallback: redireciona para login com mensagem
        navigate('/login?redirect=template-checkout&variant=' + templateParam);
        return;
      }

      // Se chegou aqui → já está logado
      navigate(`/template-checkout?variant=${templateParam}`);
    } else {
      navigate('/dashboard');
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Código inválido ou expirado');
  } finally {
    setLoading(false);
  }
};

// Função auxiliar para login automático após verificação
const loginAfterVerification = async (email: string, password: string) => {
   await login(email, password, true); // rememberMe = true
};

  return (
    <div className="min-h-screen w-full bg-[#05051e] flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* Coluna Esquerda: Branding & Social Proof */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col justify-between p-16 border-r border-white/5">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        
        <Link to="/" className="flex items-center gap-2 relative z-10">
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

        <div className="relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-medium text-white leading-tight mb-8"
          >
            Comece a escalar o seu negócio <span className="text-indigo-400 italic">hoje mesmo.</span>
          </motion.h2>

          <div className="space-y-6">
            {[
              { icon: <Zap className="text-indigo-400" />, title: "Configuração Instantânea", desc: "Registe a sua empresa e comece a vender em minutos." },
              { icon: <ShieldCheck className="text-indigo-400" />, title: "Segurança Certificada", desc: "Seus dados financeiros protegidos e encriptados." },
              { icon: <Rocket className="text-indigo-400" />, title: "Pronto para Crescer", desc: "Ferramentas integradas para PMEs em expansão." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex gap-4 p-4 rounded-md hover:bg-white/5 transition-colors"
              >
                <div className="mt-1">{item.icon}</div>
                <div>
                  <h4 className="text-white font-medium">{item.title}</h4>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-gray-500 text-xs tracking-widest uppercase font-medium">
          Moçambique & PALOP • Edição Business
        </div>
      </div>

      {/* Coluna Direita: Formulário Adaptável */}
     <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'register' ? (
            <motion.div 
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-xl"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
                <div className="mb-8">
                  <h3 className="text-3xl font-bold text-white mb-2">Criar conta</h3>
                  <p className="text-gray-400">Preencha os dados com atenção.</p>
                </div>

                {serverError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle size={18} /> {serverError}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                  {/* Nome e Apelido */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400 ml-1">Nome Próprio</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                          name="firstName"
                          placeholder="Ex: João"
                          value={formData.firstName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                            errors.firstName && touched.firstName ? 'border-red-500' : 'border-white/10'
                          }`}
                        />
                      </div>
                      {touched.firstName && errors.firstName && (
                        <p className="text-red-400 text-xs mt-1 ml-1">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400 ml-1">Apelido</label>
                      <input
                        name="lastName"
                        placeholder="Ex: Silva"
                        value={formData.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full px-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                          errors.lastName && touched.lastName ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                      {touched.lastName && errors.lastName && (
                        <p className="text-red-400 text-xs mt-1 ml-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 ml-1">E-mail de Acesso</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        name="email"
                        type="email"
                        placeholder="exemplo@dominio.com"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                          errors.email && touched.email ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {touched.email && errors.email && (
                      <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Empresa */}
                  <div className="p-5 bg-indigo-500/5 rounded-md border border-indigo-500/10 space-y-4">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Informação da Empresa</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1">Nome Legal</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <input
                            name="companyName"
                            placeholder="Nome da empresa"
                            value={formData.companyName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                              errors.companyName && touched.companyName ? 'border-red-500' : 'border-white/10'
                            }`}
                          />
                        </div>
                        {touched.companyName && errors.companyName && (
                          <p className="text-red-400 text-xs mt-1 ml-1">{errors.companyName}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1">E-mail Business (opcional)</label>
                        <input
                          name="companyEmail"
                          type="email"
                          placeholder="opcional"
                          value={formData.companyEmail}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                            errors.companyEmail && touched.companyEmail ? 'border-red-500' : 'border-white/10'
                          }`}
                        />
                        {touched.companyEmail && errors.companyEmail && (
                          <p className="text-red-400 text-xs mt-1 ml-1">{errors.companyEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Senhas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400 ml-1">Palavra-passe</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                          name="password"
                          type="password"
                          placeholder="Mín. 8 caracteres"
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                            (errors.password || errors.confirmPassword) && touched.password ? 'border-red-500' : 'border-white/10'
                          }`}
                        />
                      </div>
                      {touched.password && errors.password && (
                        <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400 ml-1">Confirmar</label>
                      <input
                        name="confirmPassword"
                        type="password"
                        placeholder="Repita a palavra-passe"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full px-4 py-3 bg-white/5 border rounded-md text-white focus:border-indigo-500 outline-none transition-all text-sm ${
                          errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                      {touched.confirmPassword && errors.confirmPassword && (
                        <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group disabled:opacity-50 mt-6"
                  >
                    {loading ? "A criar conta..." : "Finalizar Registo"}
                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-500 text-sm">
                    Já tem conta? {' '}
                    <Link to="/login" className="text-white font-bold hover:text-indigo-400 transition-colors underline underline-offset-4">Entrar</Link>
                  </p>
                </div>
              </div>
            </motion.div>
          ): (
            /* PASSO DE VERIFICAÇÃO */
            <motion.div 
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center shadow-2xl">
                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
                  <Mail size={40} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Verifique o E-mail</h3>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  Introduza o código de 6 dígitos enviado para <br/>
                  <span className="text-white font-medium">{formData.email}</span>
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    className="w-full text-center text-4xl tracking-[1rem] py-6 bg-white/5 border-2 border-white/10 rounded-md text-white focus:border-indigo-500 outline-none transition-all font-mono"
                    required
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                  >
                    {loading ? "A validar..." : "Confirmar Código"}
                  </button>
                </form>

                <button
                  onClick={() => setStep('register')}
                  className="mt-8 inline-flex items-center text-sm text-gray-500 hover:text-white transition-colors gap-2"
                >
                  <ArrowLeft size={16} /> Voltar e corrigir dados
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};