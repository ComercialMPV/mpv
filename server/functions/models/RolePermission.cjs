// models/RolePermission.cjs
const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  // REMOVA o unique: true daqui
  roleName: { type: String, required: true }, 
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  allowedMenuItems: [{ type: String }],
  description: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Este índice é o correto para Multi-tenancy (Múltiplas empresas)
rolePermissionSchema.index({ roleName: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);