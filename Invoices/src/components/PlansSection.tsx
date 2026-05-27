import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: 'Básico',
      desc: 'Para pequenos empreendedores em fase inicial.',
      price: '0',
      benefits: [
        'Até 5 produtos registados',
        'POS básico para vendas rápidas',
        'Relatórios de faturação simples',
        '1 utilizador administrativo',
        'Acesso à comunidade MPVD'
      ],
      cta: 'Começar Agora',
      featured: false,
      path: '/register'
    },
    {
      name: 'Profissional',
      desc: 'O motor completo para escalar o seu negócio.',
      price: isAnnual ? '1999' : '2499',
      period: 'MT/mês',
      save: 'Economize 20% anualmente',
      benefits: [
        'Documentos e produtos ilimitados',
        'Gestão de Metas Estratégicas',
        'Análise de Unit Economics',
        'Website Online Integrado',
        'Controle de Stock Avançado',
        'Relatórios de Rentabilidade Real'
      ],
      cta: 'Ativar Profissional',
      featured: true,
      path: '/checkout'
    },
    {
      name: 'Empresarial',
      desc: 'Soluções customizadas para operações complexas.',
      price: 'Sob Consulta',
      benefits: [
        'Múltiplas Lojas Integradas',
        'Suporte prioritário 24/7',
        'APIs & Integrações Customizadas',
        'Formação presencial de equipas',
        'Gestor de conta dedicado',
        'Backup de dados em tempo real'
      ],
      cta: 'Contactar Equipa',
      featured: false,
      path: 'https://meupontodevenda.com/plans'
    }
  ];

 return (
    <section className="py-24 relative overflow-hidden bg-[#020210]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.15)_0%,_transparent_50%)]" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h3 className="text-4xl md:text-6xl font-medium text-white mb-6 tracking-tight">
            Escolha o seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-light italic">plano</span>
          </h3>
          
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>Mensal</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-7 bg-indigo-500/20 rounded-full relative p-1 transition-colors border border-indigo-500/30"
            >
              <motion.div 
                animate={{ x: isAnnual ? 28 : 0 }}
                className="w-5 h-5 bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50" 
              />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-white' : 'text-gray-500'}`}>Anual</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
              -20% Off
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`relative p-8 rounded-[2.5rem] flex flex-col transition-all duration-500 border ${
                plan.featured 
                ? 'bg-[#080825] border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.15)] ring-1 ring-indigo-400/20' 
                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest">
                  Mais Popular
                </div>
              )}

              <div className="mb-8">
                <h4 className={`text-xl font-medium mb-2 ${plan.featured ? 'text-indigo-400' : 'text-white'}`}>
                  {plan.name}
                </h4>
                <p className="text-gray-500 text-xs font-light leading-relaxed">{plan.desc}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-medium text-white tracking-tighter">
                  {plan.price === '0' ? 'Grátis' : plan.price}
                </span>
                {plan.price !== 'Sob Consulta' && plan.price !== '0' && (
                   <span className="text-gray-500 text-sm font-light">MT{plan.period}</span>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                {isAnnual && plan.save && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-emerald-400 text-[10px] font-medium mb-8"
                  >
                    {plan.save}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="space-y-4 mb-10 flex-1">
                {plan.benefits.map((b, j) => (
                  <div key={j} className="flex items-start gap-3 group text-left">
                    <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    <span className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors">{b}</span>
                  </div>
                ))}
              </div>

              {/* Lógica de Link Condicional */}
              {plan.external ? (
                <a 
                  href={plan.path}
                  className="py-4 rounded-2xl text-xs font-medium text-center bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  {plan.cta}
                </a>
              ) : (
                <Link 
                  to={plan.path} 
                  state={{ plan: { ...plan, period: isAnnual ? 'anual' : 'mensal' } }}
                  className={`py-4 rounded-2xl text-xs font-medium text-center transition-all flex items-center justify-center gap-2 ${
                    plan.featured 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_10px_20px_rgba(79,70,229,0.2)]' 
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {plan.featured && <Zap className="w-3 h-3 fill-current" />}
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};