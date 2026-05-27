// config/subscriptionPlans.cjs
const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Básico',
    price: 3500,   
    maxLimits: {
      users: 1,
      products: 10,
      services: 10,
      bundles: 10, 
      clients: 10,
      suppliers: 10,
      proposals: 10,
      documents: 10,
    },
    features: [
      'Até 5 produtos registados',
      'POS para vendas rápidas',
      'Relatórios de faturação',
      '1 utilizador administrativo',
      'Website de vendas padrão',
    ]
  },
  professional: {
    id: 'professional',
    name: 'Profissional',
    price: 5900,
    maxLimits: {
      users: 5,
      products: 15,
      services: 15,
      bundles: 15,
      requisitions: 15,
      leads: 15,
      clients: 15,
      suppliers: 15,
      proposals: 15,
      documents: 15,
    },
    features: [
      'Documentos e produtos ilimitados',
      'Gestão de Metas Estratégicas',
      'Análise de Rentabilidade por Produto/Serviço',
      'Website Online Customizado',
      'Controle de Stock Avançado',
      'Gestão de parceiros e propostas comerciais',
      'Suporte via chat e email'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresarial',
    price: 0,
    features: [
      'Múltiplas Lojas Integradas',
      'Suporte prioritário 24/7',
      'APIs & Integrações Customizadas',
      'Formação presencial de equipas',
      'Gestor de conta dedicado',
      'Backup de dados em tempo real'
    ]
  }
};

// Array útil para selects / listagens
const PLANS_ARRAY = Object.values(SUBSCRIPTION_PLANS);

module.exports = {
  SUBSCRIPTION_PLANS,
  PLANS_ARRAY
};