const mongoose = require('mongoose');

// Goal schema for company targets/metas
const goalSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Period type selected (monthly, quarterly, semester, annual)
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'semester', 'annual'],
      required: true
    },

    // Date range for the goal
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Financial target for the selected period
    financialTarget: { type: Number, required: true },

    // Metas Financeiras Anuais/Mensais/Semestrais (calculated from financialTarget and period)
    year: { type: Number, required: true },
    
    annualTarget: { type: Number, required: true },
    monthlyTarget: { type: Number, default: 0 },
    quarterlyTarget: { type: Number, default: 0 },
    semesterTarget: { type: Number, default: 0 },

    // Como atingir: products, services, combos, or mixed
    achievementStrategy: {
      type: String,
      enum: ['products', 'services', 'combos', 'mixed'],
      default: 'mixed'
    },

    // Intervalo de segurança para imprevistos (e.g., 10% = 0.10)
    // Usado para alertar sobre saúde da receita
    contingencyMargin: { type: Number, default: 0.1 },

    // Distribuição de metas por item type (apenas se strategy = 'mixed')
    breakdown: [
      {
        itemType: { type: String, enum: ['Product', 'Service', 'Combo'] },
        percentage: { type: Number }, // e.g., 50 for 50%
        targetAmount: { type: Number }, // calculated
      },
    ],

    // Status
    status: { type: String, enum: ['draft', 'active', 'completed', 'archived'], default: 'draft' },

    notes: String,
  },
  { timestamps: true }
);

goalSchema.index({ company: 1, year: 1 });
goalSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);