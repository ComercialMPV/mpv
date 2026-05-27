const mongoose = require('mongoose');

const onboardingContentSchema = new mongoose.Schema({
  menuName: { 
    type: String, 
    required: true 
  },
  shortDescription: { 
    type: String, 
    required: true,
    maxlength: 160
  },
  longDescription: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  videoUrl: { 
    type: String, 
    default: '' 
  },  
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Índice único por empresa + nome do menu
onboardingContentSchema.index({ menuName: 1 }, { unique: true });

module.exports = mongoose.model('OnboardingContent', onboardingContentSchema);