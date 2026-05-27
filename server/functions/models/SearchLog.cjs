const mongoose = require('mongoose');

// simple log of searches performed on public portals, used to power "most searched" analytics
const SearchLogSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  term: { type: String, required: true },
  catalog: { type: String, enum: ['services', 'products', 'bundles', 'subsciptions', 'all'], default: 'services' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SearchLog', SearchLogSchema);
