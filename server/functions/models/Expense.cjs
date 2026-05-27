const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  date: {
    type: Date,
    required: true,
    default: Date.now
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  category: {
    type: String,
    enum: [
      'supplies',      // Material / Stock
      'maintenance',   // Manutenção
      'rent',          // Aluguer
      'salaries',      // Salários
      'utilities',     // Água, Luz, Internet
      'transport',     // Transporte
      'marketing',     // Publicidade
      'emergency',     // Emergências
      'other'          // Outros
    ],
    default: 'other'
  },

  type: {
    type: String,
    enum: ['fixed', 'variable'],
    default: 'variable'
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'card', 'wallet'],
    default: 'cash'
  },

  // Ligação opcional com venda ou documento
  relatedSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null
  },

  relatedDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },

  notes: {
    type: String,
    trim: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices para performance
expenseSchema.index({ company: 1, date: -1 });
expenseSchema.index({ company: 1, category: 1 });
expenseSchema.index({ company: 1, type: 1 });

module.exports = mongoose.model('Expense', expenseSchema);