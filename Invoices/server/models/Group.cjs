const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'declined', 'removed'],
    default: 'pending'
  }
});

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  inviteCode: {
    type: String,
    unique: true,
    required: true
  },
  members: [memberSchema]
}, {
  timestamps: true
});

groupSchema.index({ inviteCode: 1 });
module.exports = mongoose.model('Group', groupSchema);
