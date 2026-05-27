const mongoose = require('mongoose');

const commissionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }, // Empresa que gerou a venda
  originType: { type: String, enum: ['subscription', 'sale'], required: true },
  originId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID da Venda ou Subscrição
  
  baseAmount: { type: Number, required: true }, // Valor total da venda
  commissionValue: { type: Number, required: true }, // Valor calculado a ganhar
  
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  paidAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('CommissionLog', commissionLogSchema);