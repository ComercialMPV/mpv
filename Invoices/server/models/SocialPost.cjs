// models/SocialPost.cjs
const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema({
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
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialAccount',
    required: true
  },
  instagramBusinessId: String,
  postId: String,                    // ID retornado pelo Instagram
  caption: String,
  imageUrl: String,                  // URL da imagem que foi publicada
  status: {
    type: String,
    enum: ['published', 'failed', 'processing'],
    default: 'published'
  },
  errorMessage: String,
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('SocialPost', socialPostSchema);