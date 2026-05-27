// models/BuiltInPortalVariant.cjs
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  variantId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  // Campos visuais / marketing (futuro)
  previewImageUrl: { type: String },
  category: { type: String },           // ex: "restaurant", "ecommerce", "professional"
  tags: [{ type: String }],             // ex: ["cardapio", "delivery", "moderno"]
  tier: {
    type: String,
    enum: ['freemium', 'premium'],
    default: 'freemium',
    index: true
  },
  // Controle de visibilidade
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  isPaid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Auditoria
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }, 
}, {
  timestamps: true,
});

module.exports = mongoose.model('BuiltInPortalVariant', schema);