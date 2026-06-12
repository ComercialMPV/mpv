"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ContainerScroll } from '../components/ui/container-scroll-animation';
import {PricingSection} from '../components/PlansSection';
import {
  Check,
  Users,
  TrendingUp,
  Box,
  LayoutDashboard,
  Globe,
  Menu,
  X,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  Zap,
  Target,
  ArrowRight,
  BarChart3,
  Monitor,
  Download
} from 'lucide-react';
import FAQSection from '../components/FAQSection';

gsap.registerPlugin(ScrollTrigger);

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

const LandingPage: React.FC = () => {
  const bgRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
  { 
    label: "Portal", 
    sub: "Cliente visualiza e compra online",
    image: "https://meupontodevenda.com/cdn/portal.gif",
    imageMobile: "https://meupontodevenda.com/cdn/portal-tablet.gif" // Substituir pelas tuas imagens reais
  },
  { 
    label: "Pedido", 
    sub: "Notificação de entrada automática",
    image: "https://meupontodevenda.com/cdn/request.gif",
    imageMobile: "https://meupontodevenda.com/cdn/request-tablet.png" 
  },
  { 
    label: "POS", 
    sub: "Faturação e gestão em tempo real",
    image: "https://meupontodevenda.com/cdn/pos.png",
    imageMobile: "https://meupontodevenda.com/cdn/pos-tablet.png" 
  },
  { 
    label: "Relatórios", 
    sub: "Análise de decisão estratégica",
    image: "https://meupontodevenda.com/cdn/report.gif",
    imageMobile: "https://meupontodevenda.com/cdn/report-tablet.png" 
  }
];

  useEffect(() => {
    gsap.to(bgRef.current, {
      backgroundPosition: "0px 100px",
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen text-slate-300 antialiased bg-[#020210] selection:bg-indigo-500/30">
      
      {/* Background Grid Dinâmico */}
      <div 
        ref={bgRef}
        className="fixed inset-0 opacity-[0.07] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
          backgroundSize: '30px 30px' 
        }}
      />

      <div className="relative z-10 min-h-screen font-sans">
        
        {/* Header */}
        <header className="container mx-auto px-4 md:px-6 py-6 flex items-center justify-between relative z-[60]">
       <div className="flex items-center gap-3">
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

          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-gray-400">
            <Link to="/planos" className="hover:text-white transition">Preços e Planos</Link>
            <Link to="#features" className="hover:text-white transition">Funcionalidades</Link>
            <Link to="/websites" className="hover:text-white transition">Websites</Link>
            <Link to="#faq" className="hover:text-white transition">FAQ's</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white mr-4">Entrar</Link>
            <Link
              to="/websites"
              className="px-5 py-2.5 bg-indigo-600 rounded-full text-xs md:text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Activar website em 24h
            </Link>
            <button className="lg:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </header>

        {/* FASE 1: CAPTAR ATENÇÃO (Impacto Emocional) */}
        <section className="relative pt-12 md:pt-24 px-4 flex flex-col items-center text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-4xl mx-auto">
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-6 tracking-widest uppercase">
              <Zap className="w-3 h-3 fill-current" /> Evolução Digital
            </motion.div>
            
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-6xl md:text-6xl font-medium tracking-tight mb-8 leading-[0.95] text-white">
              Sua empresa tem <span className="text-indigo-500">presença online</span>... ou apenas um WhatsApp?
            </motion.h2>

            <motion.p variants={fadeInUp} className="text-gray-400 text-lg md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed">
                         Transforme a presença online da sua empresa numa máquina de vendas, active o seu website em 24h e acelere as suas vendas hoje .
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-[#d9f99d] text-black font-bold rounded-full hover:scale-105 transition-all shadow-xl shadow-lime-500/20 flex items-center justify-center gap-2">
                CRIAR MEU PONTO DE VENDA <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

     {/* FASE 2: VALORIZAR (Máquina de Vendas Interativa) */}
<section className="py-20">
  <ContainerScroll titleComponent={
    <div className="mb-10 text-center">
       <h3 className="text-2xl md:text-4xl font-semibold text-white mb-2">Não é apenas um website.</h3>
       <p className="text-indigo-400 text-xl italic font-light">É uma máquina de vendas conectada. Captação de clientes - POS - Gestão Financeira - Crescimento escalável.</p>
    </div>
  }>
    <div className="relative w-full h-full bg-[#080825] rounded-xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
      
      {/* Visualizador de Telas (Slide dinâmico) */}
      <div className="relative flex-1 w-full overflow-hidden group">
        <motion.div
          key={activeStep} // Isso faz o Framer Motion re-animar ao trocar o índice
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full"
        >
         <picture>
      {/* Se a tela for menor que 768px (md), usa a imagem mobile */}
      <source media="(max-width: 767px)" srcSet={steps[activeStep].imageMobile} />
      {/* Caso contrário, usa a imagem padrão (Desktop) */}
      <img 
        src={steps[activeStep].image} 
        alt={steps[activeStep].label} 
        className="object-cover w-full h-full opacity-90 transition-opacity"
        style={{ objectPosition: 'top center' }} // Garante que o topo da interface (header) apareça sempre
      />
    </picture>
        </motion.div>

        {/* Overlay de Gradiente para leitura dos cards */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020210] via-transparent to-transparent"></div>
        
        {/* Badge de Status da Etapa */}
        <div className="absolute top-6 right-6">
           <div className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full animate-pulse uppercase tracking-widest">
             Live Demo: {steps[activeStep].label}
           </div>
        </div>
      </div>
      
      {/* Navegação por Cards (Triggers) */}
      <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 right-4 md:right-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`text-left p-4 rounded-xl border transition-all duration-300 backdrop-blur-md ${
              activeStep === i 
              ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-[1.02]' 
              : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className={`font-bold text-xs md:text-sm uppercase tracking-tighter ${
                activeStep === i ? 'text-indigo-400' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
              {activeStep === i && <motion.div layoutId="dot" className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
            </div>
            <p className="text-white text-[10px] md:text-xs opacity-70 leading-tight">
              {step.sub}
            </p>
          </button>
        ))}
      </div>
    </div>
  </ContainerScroll>
</section>

        {/* FASE 3: SOLIDIFICAR (Clareza Estratégica) */}
        <section className="py-24 bg-white/[0.02] border-y border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full"></div>
          
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="max-w-3xl mb-20">
                <h3 className="text-4xl md:text-6xl font-medium text-white mb-6 leading-tight">
                  Vender é fácil. <br/>
                  <span className="text-indigo-500 italic font-medium">Crescer com direção é diferente.</span>
                </h3>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Com o Meu Ponto de Venda, a empresa deixa de trabalhar às cegas e passa a ter metas financeiras bem definidas e distribuídas de 
forma estratégica. 
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Sub-seção 1: Inteligência Automática */}
              <FadeIn delay={0.2}>
                <div className="p-1 w-full bg-gradient-to-br from-indigo-500/20 to-transparent rounded-2xl">
                  <div className="bg-[#05051e] p-8 md:p-12 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 mb-8">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <h4 className="text-2xl font-medium text-white mb-4">Inteligência Automática</h4>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                      O sistema analisa padrões silenciosos para que o seu negócio "fale" com consigo. Saiba quem são os 20% de clientes que geram 80% do lucro.
                    </p>
                    <ul className="space-y-4">
                      {['Unit Economics (Lucro real por produto)', 'Análise de retenção de clientes', 'Ranking de performance de equipa'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-emerald-400" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>

              {/* Espaço para Imagem: Dashboard de Unit Economics */}
              <FadeIn delay={0.4}>
                <div className="relative">
                  <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full"></div>
                  <img src="https://meupontodevenda.com/cdn/unit.gif" alt="Analytics Dashboard" className="relative rounded-xl border border-white/10 shadow-2xl" />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

       {/* FASE 5: METAS (Diferencial Supremo) */}
<section className="py-24 relative overflow-hidden">
  <div className="container mx-auto px-6 text-center">
    <FadeIn>
      <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] text-emerald-400 uppercase bg-emerald-400/10 rounded-full border border-emerald-400/20">
        O Diferencial Supremo
      </div>
      <h3 className="text-4xl md:text-7xl font-medium text-white mb-8 tracking-tighter">
        Pare de trabalhar <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-500">sem destino.</span>
      </h3>
    </FadeIn>

    {/* Cards de Descrição */}
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 mb-20">
      {[
        { 
          title: "Defina o Alvo", 
          desc: "Estabeleça seu objetivo anual e o sistema fragmenta em metas mensais e diárias automaticamente.",
          icon: <Target className="w-6 h-6" />
        },
        { 
          title: "Distribuição Inteligente", 
          desc: "Divida a carga por colaborador e por categoria de produto. Todos saberão exatamente o que fazer.",
          icon: <Users className="w-6 h-6" />
        },
        { 
          title: "Cálculo de Probabilidade", 
          desc: "O sistema avisa se você está no ritmo certo ou se precisa ajustar a estratégia antes do mês acabar.",
          icon: <TrendingUp className="w-6 h-6" />
        }
      ].map((card, i) => (
        <FadeIn key={i} delay={i * 0.1}>
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-all text-left group h-full">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
              {card.icon}
            </div>
            <h4 className="text-xl font-bold text-white mb-3">{card.title}</h4>
            <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
          </div>
        </FadeIn>
      ))}
    </div>

    {/* NOVO: Container de Imagem da Tela de Goals */}
    <FadeIn delay={0.3}>
      <div className="relative max-w-6xl mx-auto mb-24">
        {/* Efeito de brilho atrás da imagem */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 blur-3xl opacity-50"></div>
        
        <div className="relative bg-[#05051e] rounded-2xl border border-white/10 p-2 shadow-2xl overflow-hidden group">
          {/* Header da "Janela" do Sistema */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"></div>
            </div>
            <div className="mx-auto text-[10px] text-gray-500 font-mono tracking-widest uppercase">Sistema de Gestão de Metas v2.0</div>
          </div>

          {/* Imagem Real da Interface de Metas */}
          <div className="relative aspect-video md:aspect-[21/12] overflow-hidden">
            <img 
              src="https://meupontodevenda.com/cdn/goal.gif" 
              alt="Interface de Metas e Objetivos" 
              className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-700"
            />
            
            {/* Overlay flutuante de "Probabilidade de Sucesso" */}
            <div className="absolute top-10 right-10 bg-black/60 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-xl hidden md:block">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Probabilidade de Meta</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">87.4%</div>
              <div className="text-[10px] text-gray-400 mt-1">Baseado no ritmo de vendas atual</div>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>

    {/* Banner Final Emocional */}
 <FadeIn delay={0.5}>
  <div className="mt-20 px-6 py-20 bg-[#020210] rounded-3xl relative overflow-hidden group border border-white/5 flex flex-col items-center text-center">
    
    {/* Elementos Visuais Inspirados na Imagem */}
    {/* Gradiente Radial Central */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60" />
    
    {/* Arco Brilhante Esquerdo */}
    <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 border-[16px] border-indigo-500/20 rounded-full blur-md opacity-50" />
    <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 border-t-[2px] border-l-[2px] border-indigo-400/40 rounded-full rotate-45" />

    {/* Arco Brilhante Direito */}
    <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-80 h-80 border-[20px] border-indigo-600/10 rounded-full blur-xl opacity-40" />
    <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-80 h-80 border-t-[2px] border-r-[2px] border-indigo-500/30 rounded-full -rotate-45" />

    {/* Conteúdo Centralizado */}
    <div className="relative z-10 max-w-2xl flex flex-col items-center">
      
      {/* Badge Pequena Superior */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 mb-8 uppercase tracking-[0.2em]">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        Foco na Performance
      </div>

      <h4 className="text-3xl md:text-[3.5rem] font-medium text-white mb-8 leading-[1.1] tracking-tight">
        Empresas que crescem <br className="hidden md:block" />
        não vendem por acaso.
      </h4>

      <p className="text-gray-400 text-sm md:text-base font-light mb-10 max-w-lg leading-relaxed">
        Desbloqueie o potencial máximo do seu negócio através de uma gestão baseada em métodos e dados reais.
      </p>

      <Link 
        to="/register" 
        className="px-10 py-4 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-500 transition-all shadow-[0_0_25px_rgba(79,70,229,0.3)] hover:shadow-[0_0_35px_rgba(79,70,229,0.5)] border border-indigo-400/20"
      >
        Começar com Método
      </Link>
    </div>
  </div>
</FadeIn>
  </div>
</section>

        {/* POSICIONAMENTO FINAL */}
        <section className="py-24 border-t border-white/5">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-2xl md:text-4xl font-medium text-gray-400 mb-4 italic">
              "Não somos apenas uma ferramenta."
            </h3>
            <h2 className="text-4xl md:text-6xl font-medium text-white mb-12">
              Somos o <span className="text-indigo-500 underline decoration-lime-400 underline-offset-8">combustível</span> que transforma <br className="hidden md:block" />
              vendas em crescimento empresarial.
            </h2>
            <p className="text-indigo-400 font-medium tracking-[0.3em] uppercase text-sm">Seu agente estratégico 24/7</p>
          </div>
        </section>

        {/* DESKTOP APP */}
        <section className="py-24 relative overflow-hidden border-t border-white/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full" />

          <div className="container mx-auto px-6 text-center relative">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-6 tracking-widest uppercase">
                <Monitor className="w-3 h-3" /> Multiplataforma
              </div>

              <h3 className="text-4xl md:text-6xl font-medium text-white mb-6 leading-tight">
                Leve o MPVD para o <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-lime-400">seu Desktop</span>
              </h3>

              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                Mais rápido, sempre disponível, sem depender do browser. 
                A experiência completa do Meu Ponto de Venda nativa no seu sistema operativo.
              </p>
            </FadeIn>

            {/* Benefícios em cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
              {[
                { icon: <Zap className="w-5 h-5" />, title: "Performance nativa", desc: "Carregamento instantâneo, sem abas, sem distrações." },
                { icon: <Download className="w-5 h-5" />, title: "Offline parcial", desc: "Continue trabalhando mesmo sem internet. Sincroniza quando voltar." },
                { icon: <LayoutDashboard className="w-5 h-5" />, title: "Espaço dedicado", desc: "Atalho no dock/barra de tarefas, foco total no seu negócio." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-left h-full">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 mb-4">
                      {item.icon}
                    </div>
                    <h4 className="text-white font-semibold mb-2">{item.title}</h4>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Botões de download */}
            <FadeIn delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/downloads/Meu PDV_0.1.0_x64-setup.exe"
                  className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-medium rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                >
                  <Monitor className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Windows</div>
                    <div className="text-sm">Download .exe</div>
                  </div>
                </a>

                <a
                  href="/downloads/Meu PDV_0.1.0_x64-setup.exe"
                  className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-medium rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                >
                  <Monitor className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Windows</div>
                    <div className="text-sm">Download .exe</div>
                  </div>
                </a>

                <div
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-gray-500 font-medium rounded-2xl flex items-center justify-center gap-3 opacity-60"
                >
                  <Monitor className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">macOS / Linux</div>
                    <div className="text-sm">Em breve</div>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-xs mt-6">
                Versão v0.1.0 (x64). 
                <span className="text-indigo-400 ml-1">Grátis para todos os planos.</span>
              </p>
            </FadeIn>
          </div>
        </section>

        <FAQSection />

       
{/* FASE 6: PARCEIROS (Ganho Recorrente) */}
<section id="referral" className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent to-indigo-950/20">
  <div className="container mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      
      {/* Lado Esquerdo: Conteúdo e Proposta de Valor */}
      <FadeIn>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-6 tracking-widest uppercase">
          <DollarSign className="w-3 h-3" /> Programa de Afiliados
        </div>
        
        <h3 className="text-4xl md:text-6xl font-medium text-white mb-6 leading-tight">
          Ganhe enquanto <br/>
          <span className="text-emerald-400 italic">ajuda outros a crescer.</span>
        </h3>
        
        <p className="text-xl text-gray-400 mb-8 leading-relaxed max-w-lg">
          Torne-se um Parceiro de Referência e receba comissões recorrentes. Sempre que um cliente indicado por si realizar uma compra, uma parte do valor vai directamente para a sua conta.
        </p>

        <div className="space-y-6 mb-10">
          {[
            { title: "Renda Recorrente", desc: "Ganhe todos os meses enquanto o cliente estiver activo." },
            { title: "Dashboard de Parceiro", desc: "Acompanhe as suas indicações e ganhos em tempo real." },
            { title: "Apoio Estratégico", desc: "Receba materiais de marketing para facilitar a conversão." }
          ].map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h5 className="text-white font-bold text-sm">{item.title}</h5>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link 
          to="/register-referral-partner" 
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-black font-bold rounded-full hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          QUERO SER PARCEIRO <ArrowRight className="w-4 h-4" />
        </Link>
      </FadeIn>

      {/* Lado Direito: Visual de "Earnings" ou App Feature */}
      <FadeIn delay={0.3}>
        <div className="relative">
          {/* Decoração de fundo */}
          <div className="absolute -inset-10 bg-emerald-500/10 blur-[80px] rounded-full opacity-50"></div>
          
          <div className="relative bg-[#05051e] rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl overflow-hidden group">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Saldo Acumulado</p>
                <h4 className="text-3xl font-bold text-white">42.500,00 MT</h4>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            {/* Simulação de Lista de Referências */}
            <div className="space-y-4">
              {[
                { name: "Loja Exemplo A", date: "Hoje", amount: "+ 1.200 MT", status: "Pago" },
                { name: "Supermercado B", date: "Ontem", amount: "+ 2.500 MT", status: "Processando" },
                { name: "Restaurante C", date: "Há 2 dias", amount: "+ 1.200 MT", status: "Pago" }
              ].map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.08] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                      {ref.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{ref.name}</p>
                      <p className="text-gray-500 text-[10px]">{ref.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-xs font-bold">{ref.amount}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-tighter">{ref.status}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Link para o Dashboard do App */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center">
              <span className="text-[10px] text-gray-500 italic">Interface integrada no ecossistema MPVD</span>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  </div>
</section>
        {/* Planos e Investimento */}
        {/* <PricingSection /> */}

        {/* Footer */}
        <footer className="py-20 border-t border-white/5">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  {/* Logo Icon / Symbol - Visible only on Mobile (below 'sm' breakpoint) */}
                  <img 
                    src="https://meupontodevenda.com/cdn/logo-white.svg" 
                    alt="MPVD Icon" 
                    className="block sm:hidden w-38 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  />

                  {/* Full Logo - Visible on Tablets and Desktops ('sm' and up) */}
                  <img 
                    src="https://meupontodevenda.com/cdn/logo-white.svg" 
                    alt="Meu Ponto de Venda" 
                    className="hidden sm:block w-44 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  />          
                </div>
                <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                  Transforme a presença online da sua empresa ou negócio numa máquina de vendas
                </p>
              </div>

              <div>
                <h6 className="text-white text-sm font-bold mb-6 uppercase tracking-widest">Produto</h6>
                <ul className="space-y-4 text-sm text-gray-500">
                  <li><Link to="#" className="hover:text-white transition">Metas Estratégicas</Link></li>
                  <li><Link to="/planos" className="hover:text-white transition">website de Vendas</Link></li>
                  <li><Link to="#" className="hover:text-white transition">Unit Economics</Link></li>
                </ul>
              </div>

              <div>
                <h6 className="text-white text-sm font-bold mb-6 uppercase tracking-widest">Legal</h6>
                <ul className="space-y-4 text-sm text-gray-500">
                  <li><Link to="/terms" className="hover:text-white transition">Termos de Uso</Link></li>
                  <li><Link to="/privacy" className="hover:text-white transition">Privacidade</Link></li>
                  <li className="text-xs pt-4 font-bold text-gray-600 uppercase">Maputo, Moçambique</li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-600 text-[10px] uppercase tracking-[0.3em]">
                © {new Date().getFullYear()} MEU PONTO DE VENDA. TODOS OS DIREITOS RESERVADOS.
              </p>
              <div className="flex gap-6">
                <Globe className="w-4 h-4 text-gray-600 hover:text-indigo-400 cursor-pointer transition" />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;