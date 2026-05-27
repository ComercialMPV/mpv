import { useState, useEffect } from 'react';
import { api } from '../services/api';

// src/constants/onboarding.ts
export interface OnboardingContent {
  name: string;
  shortDescription: string;
  longDescription: string;
  videoUrl?: string;
}

export const fallbackOnboarding: Record<string, OnboardingContent> = {
  'Dashboard': {
    name: 'Dashboard',
    shortDescription: 'Visão geral completa do seu negócio em tempo real.',
    longDescription: 'Aqui você acompanha vendas, clientes, metas, rentabilidade e alertas importantes num único lugar.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA', // substitua pelo vídeo real
  },
  'Minhas Empresas': {
    name: 'Minhas Empresas',
    shortDescription: 'Gerencie todas as empresas que você administra.',
    longDescription: 'Troque entre empresas, veja estatísticas globais e configure permissões.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
  'Painel do Parceiro': {
    name: 'Painel do Parceiro',
    shortDescription: 'Área exclusiva para parceiros de indicação.',
    longDescription: 'Acompanhe suas comissões, clientes indicados e ganhos em tempo real.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
  'Gestão de Comissões': {
    name: 'Gestão de Comissões',
    shortDescription: 'Gerencie suas comissões e ganhos.',
    longDescription: 'Acompanhe o desempenho das suas comissões, clientes indicados e ganhos em tempo real.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
   'Minhas comissões': {
    name: 'Minhas comissões',
    shortDescription: 'Acompanhe suas comissões acumuladas e ganhos.',
    longDescription: 'Veja um resumo detalhado das suas comissões, clientes indicados e ganhos em tempo real.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },

    'Meus ganhos': {
    name: 'Meus ganhos',
    shortDescription: 'Acompanhe seus ganhos e comissões acumuladas.',
    longDescription: 'Veja um resumo detalhado dos seus ganhos, comissões acumuladas e histórico de pagamentos.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
    'Gestão de cargos': {
    name: 'Gestão de cargos',
    shortDescription: 'Gerencie os cargos e permissões dos seus usuários.',
    longDescription: 'Crie, edite e atribua cargos para controlar o acesso às funcionalidades do sistema.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
    'Vendas': {
    name: 'Vendas',
    shortDescription: 'Gerencie suas vendas e oportunidades de negócio.',  
    longDescription: 'Acompanhe suas vendas, oportunidades de negócio e desempenho comercial em tempo real.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },   'Metas': {
    name: 'Metas',
    shortDescription: 'Defina e acompanhe suas metas de vendas e desempenho.',
    longDescription: 'Defina metas claras para sua equipe e acompanhe o progresso em direção a esses objetivos.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },   'Rentabilidade': {  
    name: 'Rentabilidade',
    shortDescription: 'Acompanhe a rentabilidade do seu negócio.',
    longDescription: 'Veja um resumo detalhado da rentabilidade do seu negócio, incluindo margens de lucro e custos operacionais.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },   'Requisições': {
    name: 'Requisições',
    shortDescription: 'Gerencie suas requisições e solicitações de serviço.',
    longDescription: 'Acompanhe suas requisições, solicitações de serviço e status de atendimento em tempo real.',
    videoUrl: 'https://www.youtube.com/embed/l_ugLArRkvA?list=RDl_ugLArRkvA',
    },   'Serviços': {
    name: 'Serviços',
    shortDescription: 'Gerencie seus serviços e oferecimentos.',
    longDescription: 'Crie, edite e gerencie seus serviços, incluindo descrições, preços e disponibilidade.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
    'Documentos': {
    name: 'Documentos',
    shortDescription: 'Gerencie seus documentos e arquivos importantes.',
    longDescription: 'Armazene e organize seus documentos importantes, como contratos, propostas e relatórios.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },    'Clientes': {
    name: 'Clientes',
    shortDescription: 'Gerencie seus clientes e contatos.',
    longDescription: 'Acompanhe seus clientes, contatos e histórico de interações para oferecer um atendimento personalizado.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },    'Leads': {
    name: 'Leads',
    shortDescription: 'Gerencie seus leads e oportunidades de negócio.',
    longDescription: 'Acompanhe seus leads, oportunidades de negócio e status de conversão em tempo real.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },    'Propostas': {
    name: 'Propostas',
    shortDescription: 'Gerencie suas propostas e negociações.',
    longDescription: 'Crie, edite e gerencie suas propostas comerciais, incluindo detalhes de negociação e status de aprovação.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
    },    'Fornecedores': {
    name: 'Fornecedores',
    shortDescription: 'Gerencie seus fornecedores e parcerias.',
    longDescription: 'Acompanhe seus fornecedores, parcerias e histórico de transações para garantir uma gestão eficiente.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
    'Modelos documentos': {
    name: 'Modelos documentos',
    shortDescription: 'Gerencie seus modelos de documentos e templates.',
    longDescription: 'Crie, edite e gerencie seus modelos de documentos e templates, incluindo layouts e estruturas padrão.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
    },    'Portais Públicos': {
    name: 'Portais Públicos',
    shortDescription: 'Gerencie seus portais públicos e templates.',
    longDescription: 'Crie, edite e gerencie seus portais públicos e templates, incluindo layouts e estruturas padrão.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },
    'Empresa': {
    name: 'Empresa',
    shortDescription: 'Gerencie as informações e configurações da sua empresa.',
    longDescription: 'Acompanhe as informações e configurações da sua empresa, incluindo detalhes de contato e preferências.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  }
    ,    'Definições': {    
    name: 'Definições',
    shortDescription: 'Gerencie as definições e preferências do sistema.',
    longDescription: 'Acompanhe as definições e preferências do sistema, incluindo configurações de conta e notificações.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },    'Configurar Website Público': {
    name: 'Configurar Website Público',
    shortDescription: 'Personalize o website público da sua empresa.',
    longDescription: 'Personalize o website público da sua empresa, incluindo layout, cores e conteúdo para atrair mais clientes.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
    },    'Social media': {
    name: 'Social media',
    shortDescription: 'Gerencie suas publicações e presença nas redes sociais.',
    longDescription: 'Acompanhe suas publicações e presença nas redes sociais, incluindo agendamento de posts e análise de engajamento.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },    'Gestão de Usuários': {
    name: 'Gestão de Usuários',
    shortDescription: 'Gerencie os usuários e permissões do sistema.',
    longDescription: 'Acompanhe e gerencie os usuários do sistema, incluindo permissões e atribuições de cargos.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  }
    ,    'Performance dos Usuários': {
    name: 'Performance dos Usuários',
    shortDescription: 'Acompanhe a performance e atividades dos usuários.',
    longDescription: 'Acompanhe a performance e atividades dos usuários, incluindo métricas de uso e engajamento.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
  },    'Configurações de Pagamento': {
    name: 'Configurações de Pagamento',
    shortDescription: 'Gerencie suas configurações de pagamento e faturamento.',
    longDescription: 'Acompanhe suas configurações de pagamento e faturamento, incluindo métodos de pagamento e histórico de transações.',
    videoUrl: 'https://youtu.be/l_ugLArRkvA?list=RDl_ugLArRkvA',
    },
};

// Hook principal - tenta carregar do backend, senão usa fallback
export const useOnboarding = () => {
  const [onboardingData, setOnboardingData] = useState<Record<string, OnboardingContent>>(fallbackOnboarding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOnboarding = async () => {
      try {
        const backendData = await api.onboarding.getAll();

        if (backendData && backendData.length > 0) {
          const formatted: Record<string, OnboardingContent> = {};

          backendData.forEach((item: any) => { 
            formatted[item.menuName] = {
              name: item.menuName,
              shortDescription: item.shortDescription || '',
              longDescription: item.longDescription || '',
              videoUrl: item.videoUrl || '',
            };
          });

          // Mescla com fallback (caso algum menu ainda não tenha sido configurado)
          setOnboardingData({ ...fallbackOnboarding, ...formatted });
        }
      } catch (error) {
        console.warn('Não foi possível carregar onboarding do backend. Usando dados locais.', error);
        // Mantém o fallback
      } finally {
        setLoading(false);
      }
    };

    loadOnboarding();
  }, []);

  return { onboardingData, loading };
};


export default fallbackOnboarding;
