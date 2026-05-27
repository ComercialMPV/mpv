const mongoose = require('mongoose');

// Goal Distribution: metas por colaborador/role
const goalDistributionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
    
    // Pode ser por role ou por user específico
     role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RolePermission',
    required: true
  },// e.g., 'sales', 'manager', 'director'
    assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // opcional, para atribuição individual

    // Metas distribuídas (somadas devem = goal.annualTarget)
    annualTarget: { type: Number, required: true },
    
    // Distribuição mensal desta meta anual
    monthlyBreakdown: [
      {
        month: { type: Number }, // 1-12
        target: { type: Number },
      },
    ],

    // Breakdown por item type para este colaborador
    itemTypeTargets: [
      {
        itemType: { type: String, enum: ['Product', 'Service', 'Combo'] },
        target: { type: Number },
      },
    ],

    // Tracking de performance
    actualRevenue: { type: Number, default: 0 },
    actualCount: { type: Number, default: 0 },

    // Performance details por mês
    monthlyPerformance: [
      {
        month: { type: Number },
        revenue: { type: Number },
        count: { type: Number },
        percentage: { type: Number }, // (revenue / target) * 100
      },
    ],

    // Health status
    healthStatus: { type: String, enum: ['on-track', 'at-risk', 'critical'], default: 'on-track' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

goalDistributionSchema.index({ company: 1, goal: 1 });
goalDistributionSchema.index({ company: 1, role: 1 });
goalDistributionSchema.index({ assignedUser: 1 });

module.exports = mongoose.model('GoalDistribution', goalDistributionSchema);
