const mongoose = require('mongoose');

const SocialAccountSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Facebook Page
  facebookPageId: { type: String, required: true },
  pageName: String,

  // Instagram Business (ligado à Page)
  instagramBusinessId: { type: String, required: true },
  instagramUsername: String,

  // Token longo (válido ~60 dias)
  longLivedToken: { type: String, required: true },

  // Para futuro agendamento e refresh
  tokenExpiresAt: { type: Date },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SocialAccount || mongoose.model('SocialAccount', SocialAccountSchema);