const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  includedItems: [{
    description: { type: String, required: true }, // ex: "Suporte 24/7", "Setup inicial"
    quantity: { type: Number, default: 1 },        // opcional, caso queira especificar quantidades
    note: { type: String }                         // ex: "Até 5 utilizadores"
  }],
  unit: { 
    type: String, 
    enum: ['unit', 'box', 'set', 'monthly', 'weekly', 'daily', 'yearly'],
    default: 'unit'
  },
  images: [{ type: String }], // NOVO: Referência visual para o serviço
  basePrice: { type: Number, required: true, min: 0 },
  targetAudience: { type: String }, // e.g., "Corporate", "Individual"
  allowedInstallments: { type: Number, default: 3 }, // Free installments
  penaltyPercentagePerInstallment: { type: Number, default: 2 }, // % increase per extra installment
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);