const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true,
    description: "Telefone com DDI para WhatsApp (ex: 258840000000)"
  },
  resetPasswordCode: String,
resetPasswordExpires: Date,
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RolePermission',
    required: true
  },
  verificationTokenHash: String,
  verificationTokenExpires: Date,
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
 
  commissionRate: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  menuVisibility: {
    type: Map,
    of: Boolean,
    default: () => new Map(),  // Mapa vazio por padrão → tudo visível
  },
  lastLogin: {
    type: Date
  },
  monthlySalesGoal: { type: Number, default: 0 },
monthlyLeadsGoal: { type: Number, default: 0 },
    walletIds: {
    mpesa: { type: String, default: '' },
    emola: { type: String, default: '' },
    visa:  { type: String, default: '' },
    debitoPat: { type: String, default: '' },
  },
  // === NOVOS CAMPOS PARA VERIFICAÇÃO ===
  isVerified: { type: Boolean, default: false },
  verificationCode: String,
  verificationCodeExpires: Date,
 refreshTokens: [{
  token: String,
  createdAt: {
    type: Date,
    default: Date.now,
    // Impede TTL neste campo
    index: false
  }
}]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshTokens;
  return userObject;
};
userSchema.virtual('isSuperAdmin').get(function() {
  return this.role?.roleName === 'superadmin';
});

// Método para verificar se tem permissão específica (ex: 'Vendas')
userSchema.methods.hasMenuPermission = async function(menuItemName) {
  if (this.isSuperAdmin) return true; // superadmin vê tudo

  await this.populate('role');
  if (!this.role) return false;

  return this.role.allowedMenuItems.includes(menuItemName);
};
userSchema.index({ 'refreshTokens.createdAt': 1 }, { background: true });

module.exports = mongoose.model('User', userSchema);