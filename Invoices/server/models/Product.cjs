const mongoose = require('mongoose');

// --- SCHEMA BASE (Comum a todos os negócios) ---
const productSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, unique: true, sparse: true }, // Código único gerado
  category: { 
    type: String, 
    required: true, 
    enum: [
      'Restaurante', 'Construção', 'Gráfica', 'Utensílios', 'Perfumaria', 
      'Calçados', 'Cabelos', 'Bijuteria', 'Plantas', 'Acessórios Auto', 
      'Veículos', 'Informática', 'Talho', 'Geral', 'Microcrédito'
    ] 
  },
    madeToOrder: {
    type: Boolean,
    default: false
  },
  orderPrice: {
    type: Number,
    default: 0
  },
  deliveryDays: {
    type: Number,
    default: 0
  },

  basePrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, min: 0 },
  promoPrice: { type: Number },
  stockQuantity: { type: Number, default: 0 },
 minStockLevel: { type: Number, default: 5 },      // alerta quando stock <= este valor
  isLowStock: { type: Boolean, default: false },    // flag para filtrar produtos com stock baixo
  lastStockUpdate: { type: Date },                  // rastrear última atualização
  shortDescription: { type: String, required: true, maxlength: 160 },
  fullDescription: { type: String },
  images: [{ type: String }],
  unit: { type: String, default: 'unid' }, // kg, dose, m2, pack, etc.
  isFeatured: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  view_count: { type: Number, default: 0 }
}, { 
  discriminatorKey: 'category', 
  timestamps: true 
});

const Product = mongoose.model('Product', productSchema);

// --- DISCRIMINADORES POR SETOR ---

// 1. Restaurante (Pratos, Bebidas e Consumíveis)
Product.discriminator('Restaurante', new mongoose.Schema({
  restaurantItemType: { type: String, enum: ['Prato', 'Bebida', 'Sobremesa', 'Entrada', 'Consumível'], default: 'Prato' },
  ingredients: [String],
  allergens: [String], // Novo: Importante para segurança alimentar
  calories: Number,
  isVegetarian: { type: Boolean, default: false },
  isVegan: { type: Boolean, default: false }, // Novo
  isGlutenFree: { type: Boolean, default: false }, // Novo
  preparationTime: Number, // em minutos
  serves: { type: Number, default: 1 },
  volume: String, // Novo: Para bebidas (ex: 330ml, 75cl)
  brand: String, // Novo: Para bebidas/consumíveis de marca (ex: Coca-Cola)
  storageCondition: { type: String, enum: ['Fresco', 'Congelado', 'Ambiente'] } // Novo
}));

// 2. Construção (Material Bruto)
// Construção e Materiais
Product.discriminator('Construção', new mongoose.Schema({
  material: { type: String }, // ex: Cerâmica, Cimento, Aço
  brand: { type: String },
  dimensions: { type: String }, // ex: 60x60cm, 12mm x 6m
  weightPerUnit: { type: Number }, // em kg (crucial para frete)
  coverageArea: { type: Number }, // m² por caixa/unidade
  resistanceClass: { type: String }, // ex: PEI 4, C30, Classe A
  application: { type: String }, // ex: Piso, Parede, Estrutural
  isWeatherResistant: { type: Boolean, default: false }, // Resistente a exterior
  technicalDocUrl: { type: String } // Link para PDF da ficha técnica
}));

// 3. Gráfica e Serigrafia
// Gráfica, Serigrafia e Brindes
Product.discriminator('Gráfica', new mongoose.Schema({
  printCategory: { 
    type: String, 
    enum: ['Papelaria', 'Têxtil', 'Grandes Formatos', 'Brindes', 'Outros'],
    default: 'Papelaria' 
  },
  materialSupport: { type: String }, // Papel Couchê, Algodão, Vinil, Cerâmica (Canecas)
  dimensions: { type: String },      // A4, 2x1m, XL, etc.
  finish: { type: String },          // Verniz, Plastificação, Bainha e Ilhós
  printTechnique: { type: String },  // Offset, Digital, Serigrafia, Sublimação, DTF
  colorType: { type: String },       // 4x0, 4x4, 1 Cor, Full Color
  productionTime: { type: String },  // Prazo de produção (ex: 3-5 dias úteis)
  minQuantity: { type: Number, default: 1 }
}));

// 4. Utensílios (Cozinha/Casa)
Product.discriminator('Utensílios', new mongoose.Schema({
  material: String, // Inox, Plástico, Silicone
  isDishwasherSafe: Boolean,
  capacity: String // ex: 500ml
}));

// 5. Perfumaria e Cosméticos
// Perfumaria e Cosméticos
Product.discriminator('Perfumaria', new mongoose.Schema({
  concentration: { 
    type: String, 
    enum: ['Parfum', 'EDP', 'EDT', 'EDC', 'Splash', 'Oleo'], 
    default: 'EDP' 
  },
  volume: { type: String }, // ex: "100ml", "50ml"
  gender: { type: String, enum: ['Masculino', 'Feminino', 'Unissex'], default: 'Unissex' },
  olfactiveFamily: { type: String }, // ex: "Amadeirado, Floral, Cítrico"
  topNotes: [String],    // Notas de Saída
  middleNotes: [String], // Notas de Coração
  baseNotes: [String],   // Notas de Fundo
  brand: { type: String }
}));

// 6. Calçados
// Calçados
Product.discriminator('Calçados', new mongoose.Schema({
  brand: { type: String },
  model: { type: String },
  gender: { type: String, enum: ['Masculino', 'Feminino', 'Unissex', 'Infantil'], default: 'Unissex' },
  sizes: [String], // Array de tamanhos disponíveis
  colors: [String], // Cores disponíveis
  upperMaterial: { type: String }, // Material exterior (Couro, Sintético, Lona)
  soleMaterial: { type: String },  // Material da sola (Borracha, EVA, PVC)
  liningMaterial: { type: String }, // Material forro interno
  closureType: { type: String },   // Tipo de fecho (Atacadores, Velcro, Slip-on)
  isOrthopedic: { type: Boolean, default: false }
}));

// 7. Cabelos
// Cabelos e Extensões
Product.discriminator('Cabelos', new mongoose.Schema({
  hairType: { type: String, enum: ['Humano', 'Sintético', 'Bio-vegetal', 'Mistura'], default: 'Humano' },
  origin: { type: String }, // ex: Brasileiro, Indiano, Vietnamita
  length: { type: Number }, // em centímetros
  weight: { type: Number }, // em gramas
  texture: { type: String, enum: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'], default: 'Liso' },
  color: { type: String },   // ex: #1B, Loiro Platinado
  applicationMethod: { type: String }, // ex: Queratina, Tic-Tac, Fita, Tecido
  isChemicalTreated: { type: Boolean, default: false }
}));

// 8. Bijuteria
// Bijuteria e Acessórios
Product.discriminator('Bijuteria', new mongoose.Schema({
  material: { type: String }, // ex: Aço Inoxidável, Latão, Zamak
  plating: { type: String },  // ex: Banho de Ouro 18k, Prata 925, Ródio
  stoneType: { type: String }, // ex: Zircónia, Pérola Cultivada, Cristal
  mainColor: { type: String },
  isHypoallergenic: { type: Boolean, default: true },
  accessoryType: { 
    type: String, 
    enum: ['Anel', 'Colar', 'Brincos', 'Pulseira', 'Tornozeleira', 'Conjunto'],
    default: 'Colar'
  },
  sizeLength: { type: String }, // ex: "45cm + 5cm extensor" ou "Ajustável"
  careInstructions: { type: String } // Notas breves de conservação
}));

// 9. Plantas e Jardim
// Plantas e Jardinagem
Product.discriminator('Plantas', new mongoose.Schema({
  scientificName: { type: String },
  sunlightRequirement: { 
    type: String, 
    enum: ['Sol Pleno', 'Meia Sombra', 'Sombra', 'Luz Indireta'], 
    default: 'Meia Sombra' 
  },
  wateringFrequency: { type: String }, // ex: "2-3 vezes por semana"
  isToxicToPets: { type: Boolean, default: false },
  isToxicToChildren: { type: Boolean, default: false },
  potSize: { type: String }, // ex: "Vaso 14", "Pote 6"
  currentHeight: { type: Number }, // em cm
  includesPot: { type: Boolean, default: true },
  careLevel: { type: String, enum: ['Fácil', 'Médio', 'Avançado'], default: 'Fácil' }
}));

// 10. Acessórios Automóveis
Product.discriminator('Acessórios Auto', new mongoose.Schema({
  compatibility: [String], // Marcas/Modelos compatíveis
  partNumber: String,
  warrantyMonths: Number
}));

// 11. Veículos (Viaturas e Motociclos)
// Veículos (Carros, Motos, Barcos)
Product.discriminator('Veículos', new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number },
  mileage: { type: Number }, // Quilometragem
  fuelType: { 
    type: String, 
    enum: ['Gasolina', 'Gasóleo', 'Híbrido', 'Elétrico', 'GPL'], 
    default: 'Gasóleo' 
  },
  transmission: { type: String, enum: ['Manual', 'Automática'], default: 'Manual' },
  engineSize: { type: String }, // Cilindrada (ex: 2000 cm3)
  horsePower: { type: Number }, // Cavalos (cv)
  vinNumber: { type: String },  // Número de Quadro (importante para transparência)
  colorExterior: { type: String },
  doors: { type: Number, default: 5 },
  features: [String], // Ar condicionado, GPS, Bluetooth, etc.
  condition: { type: String, enum: ['Novo', 'Usado', 'Seminovo'], default: 'Usado' }
}));

// 12. Informática e Periféricos
Product.discriminator('Informática', new mongoose.Schema({
  brand: String,
  connectionType: { type: String, enum: ['USB', 'Wireless', 'Bluetooth', 'USB-C'] },
  specs: String, // ex: 16GB RAM, 1TB SSD
  osCompatibility: [String]
}));

// 13. Talho (Produtor Alimentar)
// Talho e Carnes
Product.discriminator('Talho', new mongoose.Schema({
  animalOrigin: { 
    type: String, 
    enum: ['Bovino', 'Suíno', 'Aves', 'Caprino', 'Ovino', 'Caça', 'Outros'], 
    default: 'Bovino' 
  },
  cutType: { type: String }, // ex: Picanha, Entrecosto, Peito
  conservationState: { 
    type: String, 
    enum: ['Fresco', 'Congelado', 'Maturado (Dry Aged)', 'Vácuo'], 
    default: 'Fresco' 
  },
  maturationDays: { type: Number, default: 0 }, // Dias de maturação se aplicável
  traceabilityCountry: { type: String }, // Origem/Nascimento do animal
  isHalal: { type: Boolean, default: false },
  isOrganic: { type: Boolean, default: false },
  fatContent: { type: String } // ex: Magra, Média, Gorda
}));

// 14. Microcrédito (Empréstimos / Linhas de crédito concedidas)
Product.discriminator('Microcrédito', new mongoose.Schema({
  // ── Dados principais do empréstimo ──
  loanAmountRequested: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  loanAmountApproved: { 
    type: Number, 
    min: 0 
  },
  interestRate: { 
    type: Number, 
    required: true, 
    min: 0 
  }, // % ao ano
  interestType: { 
    type: String, 
    enum: ['Simples', 'Composto', 'Flat', 'Decrescente'], 
    default: 'Flat' 
  },
  termMonths: { 
    type: Number, 
    required: true, 
    min: 1 
  }, // Prazo em meses
  installmentValue: { 
    type: Number 
  }, // Prestação mensal (pode ser calculada)
  gracePeriodDays: { 
    type: Number, 
    default: 0 
  },
  paymentFrequency: { 
    type: String, 
    enum: ['Diário', 'Semanal', 'Quinzenal', 'Mensal', 'Trimestral'], 
    default: 'Mensal' 
  },
  purpose: { 
    type: String, 
    maxlength: 500 
  }, // Finalidade do crédito
  guaranteeType: { 
    type: String, 
    enum: ['Sem garantia', 'Penhor', 'Avalista', 'Hipoteca', 'Outros'], 
    default: 'Sem garantia' 
  },
  guarantors: [{
    name: String,
    identification: String, // BI / NUI / Passaporte
    phone: String,
    address: String,
    guaranteedAmount: Number
  }],
  payments: [{
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  method: { 
    type: String, 
    enum: ['Cash', 'M-Pesa', 'E-Mola', 'Transferência', 'POS', 'Outro'],
    default: 'Cash'
  },
  notes: { type: String, maxlength: 500 },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}],

  // ── Análise e aprovação ──
  creditScore: { type: Number, min: 0, max: 1000 },
  riskLevel: { 
    type: String, 
    enum: ['Baixo', 'Médio', 'Alto', 'Muito Alto'], 
    default: 'Médio' 
  },
  approvalStatus: { 
    type: String, 
    enum: ['Pendente', 'Aprovado', 'Rejeitado', 'Cancelado'], 
    default: 'Pendente' 
  },
  lastOverdueCheck: { type: Date },           // última vez que a rota de overdue correu
lastNotificationSent: {                     // evita spam de emails repetidos
  type: Map,
  of: Date
},
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvalDate: { type: Date },

  // ── Desembolso e acompanhamento ──
  disbursementDate: { type: Date },
  firstPaymentDate: { type: Date },
  totalPaid: { type: Number, default: 0 },
  outstandingBalance: { type: Number },
  daysOverdue: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },

  // Opcional: referência ao cliente (se não usar o campo customer do Sale)
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },

  // Notas internas / observações
  internalNotes: { type: String, maxlength: 1000 }
}));

module.exports = Product;