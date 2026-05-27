// middleware/auth.cjs
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Carrega o usuário SEMPRE com o role populado
    const user = await User.findById(decoded.userId)
      .populate('role', 'roleName allowedMenuItems isActive')   // ← Sempre populado
      .select('-password -refreshTokens');

    if (!user) {
      return res.status(401).json({ message: 'Utilizador não encontrado' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Conta inativa' });
    }

    // Segurança extra: caso o role ainda seja apenas um ID (usuários criados manualmente)
    if (user.role && typeof user.role === 'string') {
      await user.populate('role', 'roleName allowedMenuItems isActive');
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error.name, error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expirado',
        errorType: 'token_expired' 
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token inválido',
        errorType: 'invalid_token' 
      });
    }

    res.status(401).json({ message: 'Erro de autenticação' });
  }
};

// ====================== MIDDLEWARES ESPECIAIS ======================

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('-password -refreshTokens');

    if (user && user.isActive) {
      if (!user.role || typeof user.role === 'string') {
        await user.populate('role', 'roleName allowedMenuItems isActive');
      }
      req.user = user;
    }
  } catch (error) {
    // Silencioso - optionalAuth não deve bloquear
    console.warn('optionalAuth falhou:', error.message);
  }
  next();
};

const superAdminAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

  const roleName = req.user.role?.roleName || req.user.role;
  if (roleName === 'superadmin') return next();

  return res.status(403).json({ message: 'Acesso restrito a superadmin' });
};

const adminOwnerAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

  const roleName = req.user.role?.roleName || req.user.role;
  if (['superadmin', 'admin', 'owner'].includes(roleName)) return next();

  return res.status(403).json({ message: 'Acesso restrito a administradores' });
};

const referralPartnerAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

  const roleName = req.user.role?.roleName || req.user.role;
  if (roleName === 'referralPartner') return next();

  return res.status(403).json({ message: 'Acesso restrito a parceiros de recomendação' });
};

// Permissão granular
const requireMenuPermission = (menuItemName) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

  const roleName = req.user.role?.roleName || req.user.role;

  // Roles privilegiados sempre passam
  if (['superadmin', 'admin', 'owner'].includes(roleName)) {
    return next();
  }

  // Para outros roles → verifica permissões
  if (!req.user.role) {
    await req.user.populate('role', 'allowedMenuItems');
  }

  if (!req.user.role?.allowedMenuItems?.includes(menuItemName)) {
    return res.status(403).json({ 
      message: `Acesso negado: permissão "${menuItemName}" necessária` 
    });
  }

  next();
};

module.exports = { 
  auth, 
  optionalAuth, 
  superAdminAuth,
  adminOwnerAuth,
  referralPartnerAuth,
  requireMenuPermission 
};