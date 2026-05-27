const mongoose = require('mongoose');

const publicPortalContentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true, // 1:1 com empresa
  },

  // Configuração geral
  enabled: { type: Boolean, default: false },
  variantId: { type: String, default: 'default' }, // referência ao variant escolhido

  // Hero (obrigatório quando enabled = true)
  hero: {
    enabled: { type: Boolean, default: true },
    headline: { type: String, trim: true },
    subheadline: { type: String, trim: true },
    backgroundImage: { type: String },     // URL GCS ou externa
    backgroundVideo: { type: String },     // URL opcional
    ctaText: { type: String, default: 'Solicitar Serviço' },
    ctaLink: { type: String, default: '#services' },
  },

  // Sobre / Quem Somos
  about: {
    enabled: { type: Boolean, default: false },
    title: { type: String },
    body: { type: String },
    image: { type: String },
  },

  // Clientes / Parceiros (logos)
  clients: {
    enabled: { type: Boolean, default: false },
    items: [{
      name: String,
      logo: String,           // URL
      website: String,
    }],
  },

  // Testemunhos
  testimonials: {
    enabled: { type: Boolean, default: false },
    items: [{
      name: String,
      role: String,
      company: String,
      photo: String,
      text: String,
      rating: { type: Number, min: 1, max: 5, default: 5 },
    }],
  },

  // Missão, Visão, Valores
  missionVision: {
    enabled: { type: Boolean, default: false },
    mission: {
      title: { type: String, default: 'Missão' },
      content: { type: String }
    },
    vision: {
      title: { type: String, default: 'Visão' },
      content: { type: String }
    },
    values: {
      title: { type: String, default: 'Valores' },
      items: [{ type: String }] // Fixed 'string' to 'String'
    },
  },
 

   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
 }, { timestamps: true });

module.exports = mongoose.model('PublicPortalContent', publicPortalContentSchema);