// models/SubscriptionPlan.cjs
const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'MZN'
  },

  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },

  // Limites dinâmicos
  maxLimits: {
    users: { type: Number, default: 5 },
    products: { type: Number, default: 50 },
    services: { type: Number, default: 50 },
    bundles: { type: Number, default: 20 },
    requisitions: { type: Number, default: 100 },
    clients: { type: Number, default: 200 },
    documents: { type: Number, default: 500 },
    leads: { type: Number, default: 100 },
    // Adicione aqui novos limites no futuro
  },

  features: [{
    type: String,
    trim: true
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

subscriptionPlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

subscriptionPlanSchema.index({ id: 1 });
subscriptionPlanSchema.index({ isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);