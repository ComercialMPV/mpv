// models/Transaction.cjs
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  paymentId: String,           // ID retornado pela Debitopay
  externalRef: { type: String, unique: true },
  
  type: { 
    type: String, 
    enum: ['order', 'subscription', 'template_purchase', 'sale'], 
    required: true 
  },
  
  amount: { type: Number, required: true },
  currency: { type: String, default: 'MZN' },
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  
  paymentMethod: { type: String, enum: ['mpesa', 'emola', 'visa', 'card'] },
  walletCode: String,
  
  metadata: { type: Object, default: {} },
  
  errorMessage: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transactionSchema.index({ company: 1, createdAt: -1 });
transactionSchema.index({ externalRef: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);