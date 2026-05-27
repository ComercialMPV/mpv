const mongoose = require('mongoose');
// Sale.cjs
const SaleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  origin: { type: String, enum: ['POS', 'pending-room', 'internal', 'external', 'Partner_Portal'], default: 'POS' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: Number,
    priceAtSale: Number,
    itemType: { type: String, enum: ['Product', 'Service', 'Combo', 'Subscription'] }
  }],
  total: Number,
  amountPaid: Number, // Novo campo para registrar o valor pago no momento da venda 
  remainingBalance: { type: Number, default: 0 },
  discount: { code: String, amount: Number },
  paymentMethod: { type: String, enum: ['Cash', 'Wallet', 'M-Pesa', 'E-Mola', 'Visa', 'POS', 'Transferência', 'Pendente'] },
  walletDeduction: { type: Number, default: 0 },
  dueDate: { type: Date, default: null }, // data prevista para pagamento final
  notifiedBefore: { type: Boolean, default: false },
  notifiedAfter: { type: Boolean, default: false },
   partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Opcional, para vendas que não foram feitas por parceiros
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  commissionValue: {
    type: Number,
    default: 0,
    min: 0
  },
  // Atualização aqui:
  customer: { 
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    name: String,
    phone: String 
  },
  
  status: { 
    type: String, 
    enum: ['Pago 100%', 'Pago 50%', 'Reserva', 'Cancelada', 'Pendente'],
    default: 'Pago 100%' 
  },
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false,
    default: null
  },
  
  createdAt: { type: Date, default: Date.now }
});
// No schema de Sale
SaleSchema.index({ company: 1, dueDate: 1, notifiedBefore: 1, remainingBalance: 1 });
SaleSchema.index({ company: 1, dueDate: 1, notifiedAfter: 1, remainingBalance: 1 });
// Prevent overwriting the model if already compiled
module.exports = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);