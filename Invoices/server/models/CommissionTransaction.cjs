const mongoose = require('mongoose');

const commissionTransactionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RolePermission',
    required: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
    unique: true,          // ← evita duplicar comissão para a mesma venda
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  periodStart: { type: Date, required: true, index: true },
  periodEnd:   { type: Date, required: true },

  appliedRule:  { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionRule' },
  targetType:   String,
  targetId:     mongoose.Schema.Types.ObjectId,

  quantityContributed: Number,   // quantas unidades desta venda contam para o escalão
  cumulativeQuantity: Number,    // total acumulado no período (incluindo esta venda)

 tierApplied: {
  minQuantity: { type: Number, required: false },
  maxQuantity: { type: Number, default: null },  // null = sem limite superior
  commissionType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: false
  },
  value: { type: Number, default: null },
  minMonths: { type: Number, default: 0 }
},

  baseAmount: Number,            // valor base usado para cálculo (ex: total da venda ou subtotal do item alvo)
  commissionAmount: Number,      // valor final da comissão gerada por esta venda

  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,

  notes: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
}, {
  timestamps: true
});

// Índices compostos importantes para relatórios rápidos
commissionTransactionSchema.index({ company: 1, user: 1, periodStart: 1, status: 1 });
commissionTransactionSchema.index({ company: 1, periodStart: 1, status: 1 });
commissionTransactionSchema.index({ user: 1, company: 1, status: 1, createdAt: -1 });
commissionTransactionSchema.index({ user: 1, company: 1, periodStart: 1, periodEnd: 1 });
commissionTransactionSchema.index({ company: 1, status: 1 });
commissionTransactionSchema.index({ sale: 1 }); // se precisar buscar por venda

module.exports = mongoose.models.CommissionTransaction || 
                 mongoose.model('CommissionTransaction', commissionTransactionSchema);