import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle, HelpCircle } from 'lucide-react';

const faqCategories = [
  {
    id: 'pos',
    title: 'Ponto de Venda (POS)',
    icon: '🧾',
    questions: [
      {
        q: 'O sistema funciona como um ponto de venda completo?',
        a: 'Sim. O sistema permite registar vendas, emitir documentos comerciais, gerir produtos e acompanhar receitas em tempo real.'
      },
      {
        q: 'Posso ter vários utilizadores a usar o sistema ao mesmo tempo?',
        a: 'Sim. O sistema suporta múltiplos utilizadores com controlo de acessos.'
      },
      {
        q: 'Posso vender produtos e serviços?',
        a: 'Sim. É possível registar tanto produtos físicos como serviços.'
      },
      {
        q: 'O sistema controla stock automaticamente?',
        a: 'Sim, sempre que uma venda é registada, o stock é atualizado automaticamente.'
      },
      {
        q: 'Posso consultar vendas anteriores?',
        a: 'Sim. O histórico completo de vendas fica disponível para consulta e análise.'
      },
    ]
  },
  {
    id: 'metas',
    title: 'Metas (Goals)',
    icon: '🎯',
    questions: [
      {
        q: 'O que significa definir metas dentro do sistema?',
        a: 'Significa planear quanto precisa vender por mês ou por ano para atingir um objetivo financeiro específico.'
      },
      {
        q: 'Posso definir metas anuais e acompanhar mensalmente?',
        a: 'Sim. O sistema permite criar metas anuais e monitorar o progresso mensalmente.'
      },
      {
        q: 'Posso distribuir metas por produto ou categoria?',
        a: 'Sim. Pode planear estrategicamente quanto cada produto deve contribuir para a meta total.'
      },
      {
        q: 'O sistema mostra se estou abaixo ou acima da meta?',
        a: 'Sim. O painel indica claramente o desempenho em relação ao objetivo definido.'
      },
      {
        q: 'Porque é importante usar o módulo de metas?',
        a: 'Porque transforma vendas aleatórias em crescimento planeado e estruturado.'
      },
    ]
  },
  {
    id: 'unit-economics',
    title: 'Unit Economics',
    icon: '📊',
    questions: [
      {
        q: 'O que é Unit Economics?',
        a: 'É a análise da rentabilidade por cliente, produto ou operação, permitindo saber onde realmente está o lucro.'
      },
      {
        q: 'Posso saber quais clientes dão mais lucro?',
        a: 'Sim. O sistema identifica clientes mais rentáveis com base nas transações realizadas.'
      },
      {
        q: 'Posso identificar clientes que geram prejuízo?',
        a: 'Sim. A plataforma permite analisar padrões que indicam baixa rentabilidade.'
      },
      {
        q: 'Isso ajuda na tomada de decisão?',
        a: 'Sim. Permite ajustar preços, políticas comerciais e foco estratégico.'
      },
      {
        q: 'Preciso entender contabilidade para usar essa função?',
        a: 'Não. O sistema apresenta dados de forma simples e visual.'
      },
    ]
  },
  {
    id: 'portal',
    title: 'Website / Portal Público',
    icon: '🌐',
    questions: [
      {
        q: 'O sistema permite ter um website próprio?',
        a: 'Sim. O Portal Público permite apresentar produtos e receber pedidos online.'
      },
      {
        q: 'Posso vender online através do sistema?',
        a: 'Sim. Clientes podem visualizar produtos e enviar pedidos diretamente.'
      },
      {
        q: 'O website está integrado com o sistema interno?',
        a: 'Sim. As informações são sincronizadas automaticamente.'
      },
      {
        q: 'Posso personalizar o portal público?',
        a: 'Sim. É possível adaptar informações, imagens e identidade visual.'
      },
      {
        q: 'Isso substitui uma loja online tradicional?',
        a: 'Depende do plano e necessidades, mas permite presença digital funcional e integrada.'
      },
    ]
  },
  {
    id: 'faturacao',
    title: 'Faturação e Documentos',
    icon: '🧾',
    questions: [
      {
        q: 'O sistema permite emitir faturas?',
        a: 'Sim. Permite gerar documentos comerciais organizados e registados.'
      },
      {
        q: 'Posso emitir diferentes tipos de documentos?',
        a: 'Sim. Faturas, recibos e outros documentos comerciais conforme necessidade.'
      },
      {
        q: 'O sistema guarda histórico de faturação?',
        a: 'Sim. Todos os documentos ficam armazenados e organizados.'
      },
      {
        q: 'Posso consultar relatórios de faturação?',
        a: 'Sim. O sistema oferece relatórios detalhados por período.'
      },
      {
        q: 'O sistema ajuda no controlo financeiro?',
        a: 'Sim. Permite acompanhar receitas, vendas e desempenho geral.'
      },
    ]
  },
  {
    id: 'seguranca',
    title: 'Segurança e Operação',
    icon: '🔐',
    questions: [
      {
        q: 'Meus dados estão seguros?',
        a: 'Sim. A plataforma utiliza medidas de segurança para proteção de dados.'
      },
      {
        q: 'Posso aceder ao sistema de qualquer lugar?',
        a: 'Sim. Sendo uma solução online, pode ser acedida via navegador.'
      },
      {
        q: 'Preciso instalar algum programa?',
        a: 'Não. Funciona diretamente no navegador.'
      },
      {
        q: 'Existe suporte técnico?',
        a: 'Sim. A plataforma oferece suporte conforme o plano contratado.'
      },
      {
        q: 'O sistema é indicado para empresas pequenas?',
        a: 'Sim. Foi desenvolvido especialmente para pequenas e médias empresas que querem crescer com estrutura.'
      },
    ]
  },
];

const FAQSection = () => {
  const [activeTab, setActiveTab] = useState('pos');
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const activeCategory = faqCategories.find(cat => cat.id === activeTab);

  const toggleQuestion = (index: number) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

 


  return (
    <section className="bg-[#05051e] py-24 relative overflow-hidden">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 rounded-md border border-indigo-500/20"
          >
            <HelpCircle size={14} /> Suporte e Ajuda
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-medium text-white mb-6 tracking-tight"
          >
            Perguntas <span className="text-indigo-400">Frequentes</span>
          </motion.h2>
          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
             className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            Tudo o que precisa de saber sobre o Meu Ponto de Venda num só lugar.
          </motion.p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start max-w-7xl mx-auto">
          
          {/* Navegação e Conteúdo Unificados */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            {faqCategories.map((category) => (
              <div key={category.id} className="flex flex-col gap-4">
                {/* Título da Aba / Botão */}
                <button
                  onClick={() => {
                    setActiveTab(category.id);
                    setOpenQuestion(null);
                  }}
                  className={`
                    flex items-center gap-4 px-6 py-4 rounded-md text-sm font-medium transition-all duration-300 group
                    ${
                      activeTab === category.id
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)] backdrop-blur-md'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/10 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <span className={`text-xl transition-transform group-hover:scale-125 ${activeTab === category.id ? 'scale-110' : ''}`}>
                      {category.icon}
                  </span>
                  <span className="flex-1 text-left">{category.title}</span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === category.id ? 'bg-indigo-400 scale-100' : 'bg-transparent scale-0'}`}></div>
                </button>

                {/* CONTEÚDO MOBILE: Aparece apenas se for a aba ativa e em telas pequenas */}
                <div className="lg:hidden">
                  <AnimatePresence>
                    {activeTab === category.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 pt-2 pb-6"
                      >
                        {category.questions.map((item, index) => (
                          <AccordionItem 
                            key={index} 
                            item={item} 
                            isOpen={openQuestion === index} 
                            onClick={() => toggleQuestion(index)} 
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {/* Card de Ajuda Rápida (Sempre visível no final da lista no mobile, ou na lateral no desktop) */}
            <div className="mt-4 lg:mt-8 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-md backdrop-blur-sm">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <MessageCircle size={18} className="text-indigo-400" /> Ainda tem dúvidas?
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                A nossa equipa está pronta para ajudar o seu negócio a crescer.
              </p>
              <a
                href="mailto:suporte@meupontodevenda.com"
                className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-center text-xs font-bold rounded-md transition"
              >
                Contactar Suporte
              </a>
            </div>
          </div>

          {/* CONTEÚDO DESKTOP: Escondido no Mobile, fixo na direita no Desktop */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden lg:block lg:w-2/3 min-h-[500px]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {activeCategory?.questions.map((item, index) => (
                  <AccordionItem 
                    key={index} 
                    item={item} 
                    isOpen={openQuestion === index} 
                    onClick={() => toggleQuestion(index)} 
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
// Componente Sub-Extraído para evitar repetição de código
const AccordionItem = ({ item, isOpen, onClick }: { item: any, isOpen: boolean, onClick: () => void }) => (
  <div className="group relative">
    <div className={`
      rounded-md border transition-all duration-300 backdrop-blur-md
      ${isOpen 
        ? 'bg-white/10 border-indigo-500/30 shadow-xl' 
        : 'bg-white/5 border-white/5 hover:border-white/10'
      }
    `}>
      <button
        onClick={onClick}
        className="w-full px-6 lg:px-8 py-5 lg:py-6 text-left flex items-center justify-between transition-colors"
      >
        <span className={`font-medium text-base lg:text-lg pr-8 transition-colors ${isOpen ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
          {item.q}
        </span>
        <div className={`
          shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'bg-white/5 text-indigo-400'}
        `}>
          <ChevronDown size={18} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 lg:px-8 pb-6 lg:pb-8 pt-0 text-gray-400 text-sm lg:text-base leading-relaxed">
              <div className="h-px w-full bg-white/5 mb-6"></div>
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

export default FAQSection;