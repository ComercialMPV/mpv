const mongoose = require('mongoose');

const BundleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Combo', 'Subscription'], required: true },
  image: String, // Guardará a string Base64 ou URL da imagem
  isArchived: { type: Boolean, default: false }, // Para funcionalidade de arquivo
  description: String,
  
  // Para Combos: Lista de produtos e/ou serviços e quantidades
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, refPath: 'items.itemType' }, // Referência dinâmica para Product ou Service
    itemType: { type: String, enum: ['Product', 'Service'], default: 'Product' },
    quantity: { type: Number, default: 1 }
  }],
  
  price: { type: Number, required: true },           // ← preço final com desconto
  originalPrice: { type: Number },                   // novo: soma sem desconto
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  
  isSubscription: { 
    type: Boolean, 
    default: function() { return this.type === 'Subscription'; } 
  },
  billingCycle: { 
    type: String, 
    enum: ['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Custom', 'N/A'],
    default: 'Mensal' 
  },
  billingPricePerCycle: { type: Number },      // preço cobrado por ciclo (ex: 10000 por mês)
  commitmentMonths: { type: Number, min: 1 },  // duração mínima do contrato (opcional)

  // Benefícios / limites / extras (muito útil para mostrar valor)
  includedLimits: [{
    description: String,                       // "Até 10 utilizadores"
    maxValue: Number,                          // 10
    unit: String,                              // "utilizadores", "consultas", "GB", etc.
  }],

  extraBenefits: [String],                     // "Suporte prioritário 24/7", "Acesso a relatórios premium"

  // Opcional: preço base sem desconto (para mostrar "de X por Y")
  originalCyclePrice: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bundle', BundleSchema);