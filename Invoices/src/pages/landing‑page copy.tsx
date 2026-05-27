"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ContainerScroll } from '../components/ui/container-scroll-animation';
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
} from 'lucide-react';
import FAQSection from '../components/FAQSection';

gsap.registerPlugin(ScrollTrigger);

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.12 } },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};
// Componente auxiliar para animação de revelação suave
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
const sectionsRef = useRef<(HTMLElement | null)[]>([]);
const [isMenuOpen, setIsMenuOpen] = useState(false);
  useEffect(() => {
    // Efeito GSAP para movimento subtil do fundo ao fazer scroll
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
    <div className="flex flex-col min-h-screen text-slate-300 antialiased bg-[#05051e] selection:bg-indigo-500/30">
      
      {/* Background Grid Dinâmico */}
      <div 
        ref={bgRef}
        className="fixed inset-0 opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      <div className="relative z-10 min-h-screen font-sans">
        
        {/* Header */}
        {/* Header Responsivo */}
      <header className="container mx-auto px-4 md:px-6 py-6 flex items-center justify-between relative z-[60]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <h1 className="text-lg md:text-xl font-medium tracking-tight text-white">MPVD</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8 text-sm text-gray-400">
          <Link to="/planos" className="hover:text-white transition">Preçário</Link>
          <Link to="/company" className="hover:text-white transition">Empresa</Link>
          <Link to="/faq" className="hover:text-white transition">FAQ's</Link>
        </nav>

        {/* Botões Desktop & Toggle Mobile */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link to="/login" className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white">Entrar</Link>
          <Link
            to="/register"
            className="px-4 md:px-6 py-2 border border-gray-700 rounded-md text-xs md:text-sm font-medium text-white hover:bg-white hover:text-black transition-all"
          >
            Começar Grátis
          </Link>
          
          {/* Botão Menu Mobile */}
          <button 
            className="lg:hidden text-white" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Menu Mobile Overlay */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-20 left-0 w-full bg-[#080825] p-6 flex flex-col space-y-4 border-b border-white/10 lg:hidden shadow-2xl"
          >
            <Link to="/planos" className="text-gray-300 py-2">Preçário</Link>
            <Link to="/company" className="text-gray-300 py-2">Empresa</Link>
            <Link to="/faq" className="text-gray-300 py-2">FAQ's</Link>
            <Link to="/login" className="text-indigo-400 py-2">Entrar na conta</Link>
          </motion.div>
        )}
      </header>

        {/* Hero Section com Scroll Animation */}
       {/* Hero Section */}
        <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
        className="relative mt-12 md:mt-20 px-4 flex flex-col items-center text-center"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-7xl font-medium tracking-tight mb-6 md:mb-8 leading-[1.1] text-white"
          >
            Entenda seu negócio <br className="hidden md:block" />
            <span className="text-indigo-400 italic font-normal">Planeie. Venda. Escale.</span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-gray-400 text-base md:text-xl max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-2"
          >
            Transforme vendas em crescimento estruturado com o sistema que lhe mostra exatamente quanto precisa vender para atingir suas metas.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto px-10 py-4 bg-[#d9f99d] text-black font-semibold rounded-md hover:bg-lime-400 transition-all shadow-[0_10px_20px_rgba(217,249,157,0.2)] text-center"
            >
              Criar Conta Gratuita
            </Link>
          </motion.div>
        </div>
      </motion.section>
         <motion.section>
          <ContainerScroll titleComponent={null}>
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            src="https://meupontodevenda.com/cdn/dashboard.jpeg"
            alt="Dashboard Analytics"
            className="mx-auto rounded-md object-cover h-full w-full object-left-top shadow-2xl"
            draggable={false}
          />
        </ContainerScroll>
        </motion.section>

        {/* Seção Vídeo de Demonstração */}
        <section className="py-24 border-t border-gray-900">
          <div className="container mx-auto px-6 text-center">
            <FadeIn>
              <div className="inline-block px-4 py-1.5 mb-6 text-xs font-medium tracking-wider text-indigo-400 uppercase bg-indigo-500/10 rounded-md">
                Experiência Imersiva
              </div>
              <h4 className="text-4xl md:text-5xl font-medium text-white mb-12 tracking-tight">
               Veja como funciona na<span className="text-indigo-400">prática.</span>
              </h4>
            </FadeIn>
            
            <div className="relative group mx-auto max-w-4xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-md blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative aspect-video rounded-md overflow-hidden bg-black shadow-2xl border border-white/10">
                <iframe
                  src="https://www.youtube.com/embed/VIDEO_ID"
                  title="Demonstração"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Seção O Problema */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="max-w-3xl mx-auto text-center mb-16">
                <h3 className="text-3xl md:text-5xl font-medium text-white mb-6">
                  Por que muitas empresas <br/> 
                  <span className="text-red-400 italic font-normal">estagnam</span> no mercado?
                </h3>
                <p className="text-gray-400 text-lg">
                  Identificamos os principais gargalos que impedem as PMEs de alcançarem o próximo nível.
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Vendem sem metas', desc: 'Vendem sem saber onde querem chegar financeiramente.' },
                { title: 'Não sabem o lucro real', desc: 'Não identificam quais clientes ou produtos dão lucro real.' },
                { title: 'Não controlam números', desc: 'A ausência de controlo de números impede decisões seguras.' },
                { title: 'Crescem sem estrutura', desc: 'Expandem a operação sem a estrutura necessária para sustentar.' },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="p-8 bg-[#0a0a2a] border border-gray-800 rounded-md hover:border-indigo-500/50 transition-all group">
                    <div className="w-10 h-10 bg-red-500/10 rounded-md flex items-center justify-center mb-6">
                       <span className="text-red-500 font-medium text-xl">!</span>
                    </div>
                    <h4 className="text-white text-xl font-medium mb-3">{item.title}</h4>
                    <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.4}>
              <div className="mt-20 p-8 rounded-md bg-white/5 border border-white/10 backdrop-blur-sm text-center">
                <p className="text-xl md:text-2xl font-normal text-white italic">
                  "Crescer sem controlo é arriscar o futuro do seu negócio."
                </p>
                <div className="mt-6 flex justify-center items-center gap-2 text-indigo-400 font-medium">
                  <span>A solução é o Meu Ponto de Venda</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Secção A Solução */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="container mx-auto px-6 relative z-10">
            <FadeIn>
              <div className="text-center mb-16">
                <h3 className="text-4xl md:text-5xl font-medium text-white mb-6 tracking-tight">
                  Crescimento com <span className="text-emerald-400">Estrutura</span>
                </h3>
                <p className="max-w-3xl mx-auto text-gray-400 text-lg leading-relaxed">
                  O Meu Ponto de Venda integra POS, metas e análise de rentabilidade num único ambiente. 
                  Não é apenas faturação é inteligência estratégica.
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Box className="w-6 h-6" />, title: 'POS Inteligente', desc: 'Transforme vendas diárias em dados estratégicos.' },
                { icon: <TrendingUp className="w-6 h-6" />, title: 'Metas Estratégicas', desc: 'Planeamento financeiro claro para escalar.' },
                { icon: <ClipboardCheck className="w-6 h-6" />, title: 'Unit Economics', desc: 'Análise real de rentabilidade e performance.' },
                { icon: <Globe className="w-6 h-6" />, title: 'Portal Digital', desc: 'Website comercial integrado para presença online.' },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="group p-8 bg-white/5 border border-white/10 rounded-md backdrop-blur-sm hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-500">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-md flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      {item.icon}
                    </div>
                    <h4 className="text-white text-xl font-medium mb-3">{item.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-20">
                <h3 className="text-3xl md:text-5xl font-medium text-white mb-6">
                  O caminho para a sua <span className="text-indigo-400 font-normal">profissionalização</span>
                </h3>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              {[
                { step: '01', icon: <CalendarDays />, title: 'Configure a Empresa', desc: 'Estruture os seus dados base e categorias.' },
                { step: '02', icon: <Box />, title: 'Registe Vendas', desc: 'Utilize o POS inteligente para cada transação.' },
                { step: '03', icon: <TrendingUp />, title: 'Defina Metas', desc: 'Estabeleça objetivos financeiros claros.' },
                { step: '04', icon: <DollarSign />, title: 'Escale o Negócio', desc: 'Analise os números reais e cresça seguro.' },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="flex flex-col items-center text-center group">
                    <div className="relative w-20 h-20 bg-indigo-600/20 rounded-md flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform">
                      {item.icon}
                      <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold w-6 h-6 rounded-md flex items-center justify-center border-2 border-[#05051e]">
                        {item.step}
                      </span>
                    </div>
                    <h4 className="text-white font-medium text-lg mb-3">{item.title}</h4>
                    <p className="text-gray-500 text-sm px-4">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <div className="mt-20 text-center">
              <Link to="/register" className="px-10 py-4 bg-white text-black font-medium rounded-md hover:bg-emerald-400 transition-all">
                COMEÇAR HOJE &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Módulos Bento Grid */}
        <section className="py-24 border-t border-gray-900/50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-4xl md:text-5xl font-medium text-white mt-4">
                Módulos para <span className="text-indigo-400">Alta Performance</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <LayoutDashboard className="text-indigo-400" />, title: 'Dashboard Executivo', desc: 'Visão única dos KPIs e rentabilidade.', size: 'md:col-span-2' },
                { icon: <Box className="text-emerald-400" />, title: 'POS Inteligente', desc: 'Sistema multiutilizador para vendas rápidas.', size: 'md:col-span-1' },
                { icon: <TrendingUp className="text-indigo-400" />, title: 'Planeamento de Metas', desc: 'Gestão comercial baseada em metas.', size: 'md:col-span-1' },
                { icon: <DollarSign className="text-emerald-400" />, title: 'Unit Economics', desc: 'Análise profunda de lucro por produto.', size: 'md:col-span-1' },
                { icon: <Users className="text-indigo-400" />, title: 'Gestão de Clientes', desc: 'Histórico completo de transações.', size: 'md:col-span-1' },
                { icon: <Globe className="text-white" />, title: 'Portal de Vendas Online', desc: 'Sua montra digital para orçamentos e vendas 24/7.', size: 'md:col-span-3' },
              ].map((m, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <div className={`${m.size} p-8 bg-[#0a0a2a] border border-gray-800 rounded-md hover:border-indigo-500/50 transition-all group relative overflow-hidden`}>
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
                    <div className="relative z-10">
                      <div className="mb-6">{m.icon}</div>
                      <h4 className="text-xl font-medium text-white mb-2">{m.title}</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Para Quem É */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1">
                <h3 className="text-4xl md:text-6xl font-medium text-white mb-8 leading-tight">
                  Desenvolvido para quem quer <br/>
                  <span className="text-emerald-400 italic underline decoration-indigo-500 underline-offset-8 font-normal">profissionalizar.</span>
                </h3>
                <p className="text-xl text-gray-400">
                  Ideal para empresas que desejam transformar dados em decisões.
                </p>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['PMEs', 'Equipas de Venda', 'Empresas em Expansão', 'Empreendedores Estruturados'].map((txt, i) => (
                  <div key={i} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-md">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                    <span className="text-white text-sm font-medium">{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Diferencial */}
        <section className="py-24 border-t border-gray-900">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="lg:w-1/2">
                <h3 className="text-4xl md:text-5xl font-medium text-white mb-8 leading-tight">
                  Porquê escolher o <br/>
                  <span className="text-indigo-400">Meu Ponto de Venda?</span>
                </h3>
                <div className="space-y-6">
                  {[
                    { t: 'Planeamento por Metas', d: 'Metas financeiras transformadas em objetivos diários.' },
                    { t: 'Rentabilidade Real', d: 'Saiba exatamente quanto lucra por cliente.' },
                    { t: 'DNA Local', d: 'Desenvolvido para a realidade de Moçambique e PALOP.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <Check className="w-5 h-5 text-emerald-400 mt-1" />
                      <div>
                        <h4 className="text-white font-medium text-lg">{item.t}</h4>
                        <p className="text-gray-500 text-sm">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-1/2 w-full bg-[#0a0a2a] p-10 rounded-md border border-white/5 relative overflow-hidden">
                <h4 className="text-white text-xl font-medium mb-6">Foco na Performance</h4>
                <div className="space-y-6">
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 w-[85%]"></div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[65%]"></div>
                  </div>
                </div>
                <p className="mt-8 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Relatórios em Tempo Real</p>
      </div>
    </div>
  </div>
</section>

<FAQSection />

{/* Planos */}
<section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-4xl md:text-5xl font-medium text-white mb-4">Planos e Investimento</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                { name: 'Básico', price: 'Grátis', benefits: ['Até 5 produtos', 'Relatórios básicos'], cta: 'Começar Agora', featured: false },
                { name: 'Profissional', price: '2499 MT', period: '/mês', benefits: ['Documentos ilimitados', 'Gestão de Metas', 'Unit Economics', 'Portal Online'], cta: 'Escolher Profissional', featured: true },
                { name: 'Empresarial', price: 'Sob Consulta', benefits: ['Suporte 24/7', 'APIs & Integrações', 'Formação presencial'], cta: 'Contactar Equipa', featured: false },
              ].map((plan, i) => (
                <div key={i} className={`p-10 rounded-md flex flex-col transition-all duration-500 ${plan.featured ? 'bg-indigo-600 border-none scale-105 z-10' : 'bg-[#0a0a2a] border border-gray-800'}`}>
                  <h4 className="text-lg font-medium mb-2 text-white">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-medium text-white">{plan.price}</span>
                    {plan.period && <span className="text-gray-300 text-sm">{plan.period}</span>}
                  </div>
                  <ul className="mb-10 space-y-4 flex-1">
                    {plan.benefits.map((b, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-gray-200">
                        <Check className="w-4 h-4 text-emerald-300" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className={`py-3 rounded-md text-sm font-medium text-center transition-all ${plan.featured ? 'bg-white text-indigo-600 hover:bg-gray-100' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-900">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
              <div className="md:col-span-4">
                <h5 className="text-xl font-medium text-white mb-6">Meu Ponto de Venda</h5>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Plataforma de gestão comercial desenvolvida para PMEs que desejam profissionalizar a sua operação.
                </p>
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-md bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition cursor-pointer">
                      <Globe className="w-4 h-4 text-white" />
                   </div>
                </div>
              </div>

              <div className="md:col-span-2 md:col-start-7">
                <h6 className="text-white text-sm font-medium mb-6">Produto</h6>
                <ul className="space-y-4 text-xs text-gray-500">
                  <li><Link to="/features" className="hover:text-indigo-400 transition">Funcionalidades</Link></li>
                  <li><Link to="/pricing" className="hover:text-indigo-400 transition">Preçário</Link></li>
                  <li><Link to="/demo" className="hover:text-indigo-400 transition">Demonstração</Link></li>
                </ul>
              </div>

              <div className="md:col-span-2">
                <h6 className="text-white text-sm font-medium mb-6">Legal</h6>
                <ul className="space-y-4 text-xs text-gray-500">
                  <li><Link to="/terms" className="hover:text-indigo-400 transition">Termos</Link></li>
                  <li><Link to="/privacy" className="hover:text-indigo-400 transition">Privacidade</Link></li>
                </ul>
              </div>

              <div className="md:col-span-2">
                <h6 className="text-white text-sm font-medium mb-6">Contacto</h6>
                <p className="text-xs text-gray-500">hello@meuponto.com</p>
                <p className="text-[10px] uppercase tracking-widest font-bold mt-4 text-gray-600">Moçambique & PALOP</p>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-900 text-center">
              <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
                © {new Date().getFullYear()} Meu Ponto de Venda. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;