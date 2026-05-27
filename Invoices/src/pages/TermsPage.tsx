"use client";
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020210] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Background Decorativo */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        {/* Header da Página */}
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition mb-12 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Voltar para a Home</span>
        </Link>

        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-medium text-white mb-6 tracking-tight">
            Termos e <span className="text-indigo-500 italic font-light">Condições</span>
          </h1>
          <p className="text-gray-500 font-light">Última atualização: {new Date().toLocaleDateString('pt-MZ')}</p>
        </header>

        {/* Conteúdo */}
        <div className="space-y-12 leading-relaxed">
          <section>
            <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-500" /> 1. Aceitação dos Termos
            </h2>
            <p className="font-light text-gray-400">
              Ao aceder ao portal **Meu Ponto de Venda (MPVD)**, o utilizador concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis. O software é fornecido como uma plataforma de crescimento e gestão empresarial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500" /> 2. Licença de Uso
            </h2>
            <p className="font-light text-gray-400 mb-4">
              É concedida permissão para aceder temporariamente aos recursos do software de acordo com o plano subscrito (Básico, Profissional ou Empresarial). Esta é a concessão de uma licença, não uma transferência de título.
            </p>
            <ul className="list-disc ml-6 space-y-2 font-light text-gray-500 text-sm">
              <li>Não é permitido modificar ou copiar o código-fonte;</li>
              <li>Não é permitido usar o software para fins ilícitos;</li>
              <li>A tentativa de descompilar ou fazer engenharia reversa é estritamente proibida.</li>
            </ul>
          </section>

          <section className="p-8 rounded-2xl bg-white/[0.02] border border-white/5">
            <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-indigo-500" /> Política de Privacidade (Resumo)
            </h2>
            <p className="font-light text-gray-400 mb-6">
              A sua privacidade é fundamental para nós. É política do MPVD respeitar a sua privacidade em relação a qualquer informação que possamos recolher no software.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-indigo-400 mb-2 uppercase tracking-wider">Dados Recolhidos</h4>
                <p className="text-xs text-gray-500">Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço (como dados de faturação e contacto).</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-indigo-400 mb-2 uppercase tracking-wider">Segurança de Dados</h4>
                <p className="text-xs text-gray-500">Protegemos os seus dados de vendas e metas com criptografia de ponta e padrões de segurança bancária.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-4">3. Limitação de Responsabilidade</h2>
            <p className="font-light text-gray-400">
              O MPVD não será responsável por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucros devido à interrupção do negócio) decorrentes do uso ou da incapacidade de usar o software, mesmo que tenhamos sido notificados oralmente ou por escrito da possibilidade de tais danos.
            </p>
          </section>
        </div>

        {/* Footer Simples */}
        <footer className="mt-24 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Meu Ponto de Venda - Maputo, Moçambique
          </p>
        </footer>
      </div>
    </div>
  );
};

export default TermsPage;