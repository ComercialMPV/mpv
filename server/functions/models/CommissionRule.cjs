const mongoose = require('mongoose');

/**
 * CommissionRule Model
 * Agrupa múltiplos intervalos (tiers) para um mesmo alvo e define o período de cálculo.
 */
const commissionRuleSchema = new mongoose.Schema({
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  }, 
  
  // O tipo de alvo: Produto específico, Serviço, Combo ou Geral (todas as vendas)
  targetType: { 
    type: String, 
    enum: ['Product', 'Service', 'Combo', 'General', 'Subscription'], 
    required: true 
  },
  referralTarget: {
  type: Boolean,
  default: false,
  description: "Se esta regra se aplica a parceiros de recomendação (Referral Program)"
},
  
  // ID do item (nulo se targetType for 'General')
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'targetType', 
    default: null 
  },

  // Cargo ao qual esta regra se aplica (ex: Vendedor, Parceiro)
  userRole: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'RolePermission', 
  required: function() {
    return !this.referralProgramRule;   // obrigatório apenas se NÃO for referral
  }
},
referralProgramRule: {
  type: Boolean,
  default: false
},
  // NOVO: Período para resetar a contagem de vendas/metas
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  
  // NOVO: Array de Escalões (Ranges)
  // Substitui os campos minQuantity/maxQuantity individuais
  ranges: [{
    minQuantity: { type: Number, default: 0 },
    maxQuantity: { type: Number, default: null }, // null = sem limite superior
    commissionType: { 
      type: String, 
      enum: ['percentage', 'fixed'], 
      default: 'percentage' 
    },
    value: { type: Number, required: true }, // % ou Valor Fixo
    minMonths: { type: Number, default: 0 }  // Específico para Subscriptions
  }],

  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// Índice para evitar duplicidade: Uma regra por Empresa, Alvo e Cargo
commissionRuleSchema.index({ company: 1, targetId: 1, userRole: 1, period: 1 });

module.exports = mongoose.model('CommissionRule', commissionRuleSchema);