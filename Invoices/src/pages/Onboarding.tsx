import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Home, Users, ShoppingCart, FileText, Settings, BarChart3, Target } from 'lucide-react';

const sections = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    description: 'O painel principal da plataforma, onde você pode visualizar métricas e informações importantes sobre o desempenho do seu negócio.',
    recommendations: 'Ideal para acompanhar o progresso geral do seu negócio em tempo real.',
    advantages: [
      'Visualização rápida de métricas importantes.',
      'Acesso centralizado às informações mais relevantes.',
    ],
    connections: 'Conecta-se com todas as outras seções para fornecer uma visão geral do desempenho.',
  },
  {
    id: 'user-management',
    title: 'Gestão de Usuários',
    icon: Users,
    description: 'Permite adicionar, editar e gerenciar usuários da plataforma, atribuindo permissões e funções específicas.',
    recommendations: 'Recomendado para empresas com equipes que precisam de acesso controlado.',
    advantages: [
      'Controle total sobre quem pode acessar o quê.',
      'Facilidade para gerenciar permissões.',
    ],
    connections: 'Conecta-se com todas as seções para garantir que os usuários tenham acesso apropriado.',
  },
  {
    id: 'sales',
    title: 'Vendas',
    icon: ShoppingCart,
    description: 'Gerencie e acompanhe todas as vendas realizadas, incluindo detalhes de transações e relatórios.',
    recommendations: 'Ideal para empresas que desejam monitorar e otimizar suas vendas.',
    advantages: [
      'Relatórios detalhados de vendas.',
      'Identificação de tendências e oportunidades.',
    ],
    connections: 'Conecta-se com o Dashboard e a Gestão de Clientes para fornecer insights completos.',
  },
  {
    id: 'documents',
    title: 'Documentos',
    icon: FileText,
    description: 'Gerencie documentos importantes, como contratos, faturas e modelos personalizados.',
    recommendations: 'Perfeito para empresas que precisam organizar e acessar documentos rapidamente.',
    advantages: [
      'Centralização de documentos.',
      'Facilidade de acesso e compartilhamento.',
    ],
    connections: 'Conecta-se com Vendas e Gestão de Parceiros para facilitar o fluxo de trabalho.',
  },
  {
    id: 'settings',
    title: 'Definições',
    icon: Settings,
    description: 'Configure as preferências da plataforma, incluindo opções de pagamento e personalização.',
    recommendations: 'Essencial para configurar a plataforma de acordo com as necessidades do seu negócio.',
    advantages: [
      'Personalização completa.',
      'Configuração de métodos de pagamento.',
    ],
    connections: 'Conecta-se com todas as seções para garantir uma experiência integrada.',
  },
  {
    id: 'analytics',
    title: 'Rentabilidade',
    icon: BarChart3,
    description: 'Analise o desempenho financeiro do seu negócio, incluindo métricas de receita e lucratividade.',
    recommendations: 'Recomendado para empresas que desejam tomar decisões baseadas em dados.',
    advantages: [
      'Insights financeiros detalhados.',
      'Identificação de áreas de melhoria.',
    ],
    connections: 'Conecta-se com Vendas e o Dashboard para fornecer uma visão completa.',
  },
  {
    id: 'goals',
    title: 'Metas',
    icon: Target,
    description: 'Defina e acompanhe metas para o seu negócio, garantindo que você esteja no caminho certo.',
    recommendations: 'Ideal para empresas que trabalham com objetivos claros e mensuráveis.',
    advantages: [
      'Monitoramento de progresso.',
      'Alinhamento com os objetivos do negócio.',
    ],
    connections: 'Conecta-se com o Dashboard para exibir o progresso das metas.',
  },
];

export const Onboarding: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  return (
    <div className="flex h-screen">
      {/* Sidebar Menu */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-lg font-bold mb-6">Onboarding</h2>
        <nav className="space-y-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <section.icon className="h-5 w-5" />
              {section.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className={`space-y-6 ${activeSection === section.id ? 'block' : 'hidden'}`}
          >
            <h1 className="text-2xl font-bold">{section.title}</h1>
            <p className="text-gray-700">{section.description}</p>

            <div>
              <h2 className="text-lg font-semibold">Recomendações</h2>
              <p className="text-gray-600">{section.recommendations}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Vantagens</h2>
              <ul className="list-disc list-inside text-gray-600">
                {section.advantages.map((advantage, index) => (
                  <li key={index}>{advantage}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Conexões</h2>
              <p className="text-gray-600">{section.connections}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Upload de Vídeos e Imagens</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload de Vídeo
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-gray-700 hover:file:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload de Imagens
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-gray-700 hover:file:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Onboarding;