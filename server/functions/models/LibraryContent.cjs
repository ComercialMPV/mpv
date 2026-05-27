const mongoose = require('mongoose');

const libraryContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String, required: true },           // YouTube embed ou Vimeo
  thumbnailUrl: { type: String },                       // opcional
  tags: [{ type: String }],
  relatedScreens: [{ type: String }],                   // ex: ["Dashboard", "Empresa"]
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LibraryContent', libraryContentSchema);