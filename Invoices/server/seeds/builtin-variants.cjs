// seeds/seed-builtin-variants.js
// Executar uma única vez para popular as variantes built-in no banco de dados

require('dotenv').config(); // se você usa dotenv para MONGO_URI
const mongoose = require('mongoose');
const BuiltInPortalVariant = require('../models/BuiltInPortalVariant.cjs');

const variantsData = [
  {
    variantId: 'default',
    name: 'Padrão (Sidebar Escura)',
    description: 'Layout clássico com sidebar escura à direita',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 10,
    category: 'general',
    tags: ['sidebar', 'clássico', 'default'],
  },
  {
    variantId: 'minimal',
    name: 'Minimalista',
    description: 'Design limpo, sem sidebar fixa, tudo em coluna única',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 20,
    category: 'general',
    tags: ['clean', 'minimal', 'simples'],
  },
  {
    variantId: 'modern',
    name: 'Moderno',
    description: 'Estilo mais atual, cores vibrantes, animações leves',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 30,
    category: 'general',
    tags: ['moderno', 'animações', 'vibrante'],
  },
  {
    variantId: 'restaurant',
    name: 'Restaurante',
    description: 'Design especializado para restaurantes, com foco em apresentação de cardápio e pedidos',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 100,
    category: 'food',
    tags: ['restaurante', 'cardápio', 'pedidos'],
  },
  {
    variantId: 'hairstyle',
    name: 'Estilo de Cabelo',
    description: 'Design especializado para salões de beleza, com foco em apresentação de serviços de cabelo',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 110,
    category: 'beauty',
    tags: ['cabelo', 'salão', 'beleza'],
  },
  {
    variantId: 'catering',
    name: 'Catering',
    description: 'Design especializado para eventos de catering, com foco em apresentação de serviços e pacotes',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 120,
    category: 'events',
    tags: ['catering', 'eventos', 'pacotes'],
  },
  {
    variantId: 'ecommerce',
    name: 'Ecommerce',
    description: 'Design especializado para lojas virtuais e catálogos de produtos',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 130,
    category: 'shop',
    tags: ['loja', 'produtos', 'catálogo'],
  },
  {
    variantId: 'logistic',
    name: 'Logística',
    description: 'Design especializado para empresas de logística e transporte, com foco em apresentação de serviços e rastreamento de entregas',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 140,
    category: 'services',
    tags: ['logística', 'transporte', 'rastreamento'],
  },
  {
    variantId: 'plans',
    name: 'Planos de subscrição',
    description: 'Design especializado para empresas de subscrição e assinaturas',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 150,
    category: 'subscription',
    tags: ['planos', 'subscrição', 'assinatura'],
  },
  {
    variantId: 'boutique',
    name: 'Loja Virtual',
    description: 'Design especializado para lojas virtuais e catálogos de produtos',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 160,
    category: 'shop',
    tags: ['boutique', 'loja', 'virtual'],
  },
  {
    variantId: 'cosmetics',
    name: 'Cosméticos',
    description: 'Design especializado para lojas de cosméticos e produtos de beleza',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 170,
    category: 'beauty',
    tags: ['cosméticos', 'beleza', 'produtos'],
  },
  {
    variantId: 'takeaway',
    name: 'Takeaway Digital',
    description: 'Design especializado para restaurantes e lanchonetes, com foco em cardápio digital para pedidos de retirada ou delivery',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 180,
    category: 'food',
    tags: ['takeaway', 'delivery', 'cardápio digital'],
  },
  {
    variantId: 'lawyer',
    name: 'Advogado',
    description: 'Design especializado para escritórios de advocacia, com foco em apresentação de serviços jurídicos e áreas de atuação',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 190,
    category: 'professional',
    tags: ['advogado', 'jurídico', 'escritório'],
  },
  {
    variantId: 'bar',
    name: 'Bar',
    description: 'Design especializado para bares e pubs, com foco em apresentação de cardápio de bebidas e eventos',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 200,
    category: 'food',
    tags: ['bar', 'pub', 'bebidas'],
  },
  {
    variantId: 'clinica',
    name: 'Clínica',
    description: 'Específico para clínicas',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 210,
    category: 'health',
    tags: ['clínica', 'saúde', 'médico'],
  },
];

async function seedBuiltInVariants() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado ao MongoDB');

    let updatedCount = 0;
    let insertedCount = 0;

    for (const variant of variantsData) {
      const result = await BuiltInPortalVariant.findOneAndUpdate(
        { variantId: variant.variantId },
        { $set: variant },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.wasNew) {
        insertedCount++;
        console.log(`Inserido: ${variant.name} (${variant.variantId})`);
      } else {
        updatedCount++;
        console.log(`Atualizado: ${variant.name} (${variant.variantId})`);
      }
    }

    console.log('\nSeed concluído com sucesso!');
    console.log(`Inseridos: ${insertedCount}`);
    console.log(`Atualizados: ${updatedCount}`);
    console.log(`Total processados: ${variantsData.length}`);

  } catch (error) {
    console.error('Erro durante o seed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Conexão fechada');
    process.exit(0);
  }
}

// Executar o seed
seedBuiltInVariants();