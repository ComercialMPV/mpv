// models/Subscription.cjs
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
    index: true
  },

  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Referência ao plano configurável (novo!)
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },

  // Campos mantidos para compatibilidade e performance rápida
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending', 'trial'],
    default: 'active'
  },

  price: { type: Number, required: true },
  currency: { type: String, default: 'MZN' },

  billingCycle: {
    type: String,
    enum: ['monthly', 'annual', 'custom'],
    default: 'monthly'
  },

  initialMonths: { type: Number, min: 1, max: 36 },
  renewalCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },

  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  nextBillingDate: Date,

  autoRenew: { type: Boolean, default: true },

  transactionId: String,
  externalRef: String,
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'emola', 'visa', 'card', 'transfer', 'manual']
  },

  renewalHistory: [{
    date: Date,
    transactionId: String,
    externalRef: String,
    status: String,
    amount: Number
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Atualizar timestamp automaticamente
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

subscriptionSchema.index({ nextBillingDate: 1, status: 1 });
subscriptionSchema.index({ company: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);