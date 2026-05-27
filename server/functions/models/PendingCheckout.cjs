const mongoose = require('mongoose');

const pendingCheckoutSchema = new mongoose.Schema({
  externalRef: { type: String, required: true, unique: true, index: true },
  paymentId: { type: String, default: null, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  checkoutType: { type: String, enum: ['order', 'template'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'MZN' },
  method: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  customer: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, expires: '24h' }
});

module.exports = mongoose.model('PendingCheckout', pendingCheckoutSchema);
