const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  isPublic: { type: Boolean, default: false },
  stage: { 
    type: String, 
    enum: ['new', 'contacted', 'negotiation', 'pending', 'won', 'lost'], 
    default: 'new' 
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});
// Índice Único: Impede email duplicado dentro da mesma EMPRESA
leadSchema.index({ company: 1, email: 1 }, { unique: true });
// Índice Único: Impede telefone duplicado dentro da mesma EMPRESA (opcional, se phone for obrigatório)
leadSchema.index({ company: 1, phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Lead', leadSchema);