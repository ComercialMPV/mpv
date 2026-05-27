const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs');
const Company = require('../models/Company.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const { auth } = require('../middleware/auth.cjs');
const nodemailer = require('nodemailer');
const emailService = require('../utils/emailService.cjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';

// Configuração do Transportador de E-mail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Helper para Gerar Tokens (Remember Me afeta o Access Token)
const generateTokens = (userId, rememberMe = false) => {
  const accessTokenExpires = rememberMe ? '30d' : '7d'; 
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: accessTokenExpires });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};
// Register - Versão corrigida e robusta
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName, companyEmail, variant, isPaidTemplate } = req.body;

    if (!companyName?.trim()) {
      return res.status(400).json({ message: 'Nome da empresa é obrigatório' });
    }

    const normalizedCompanyName = companyName.trim();
    const normalizedCompanyEmail = (companyEmail || email).toLowerCase().trim();
    const normalizedUserEmail = email.toLowerCase().trim();

    // ================== VALIDAÇÕES ANTI-DUPLICADOS ==================
    // 1. Empresa com mesmo nome
    const existingCompanyByName = await Company.findOne({ 
      name: { $regex: new RegExp(`^${normalizedCompanyName}$`, 'i') } 
    });
    if (existingCompanyByName) {
      return res.status(409).json({ message: 'Já existe uma empresa com este nome' });
    }

    // 2. Empresa com mesmo email (mais robusto)
    const existingCompanyByEmail = await Company.findOne({ 
      email: normalizedCompanyEmail 
    });
    if (existingCompanyByEmail) {
      return res.status(409).json({ 
        message: 'Já existe uma empresa com este email corporativo' 
      });
    }

    // 3. Utilizador com mesmo email pessoal
    const existingUser = await User.findOne({ email: normalizedUserEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Este email pessoal já está registado' });
    }
    // ================================================================
// ====================== CRIAR EMPRESA ======================
const company = new Company({
  name: normalizedCompanyName,
  email: normalizedCompanyEmail,
  publicPortal: {
    enabled: false,
    variant: variant || 'default',
    variantPurchased: false,
    variantPricePaid: 0
  }
});

await company.save();

console.log("📌 Empresa criada com variant:", variant || 'default');

// ====================== ATIVAR PORTAL AUTOMATICAMENTE ======================
if (variant && variant !== 'default') {
  try {
    console.log(`🔄 Tentando ativar portal com variant: ${variant}`);

    let slug = normalizedCompanyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Evitar conflito de slug
    const existing = await Company.findOne({
      _id: { $ne: company._id },
      'publicPortal.slug': slug
    });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      {
        'publicPortal.enabled': true,
        'publicPortal.variant': variant,
        'publicPortal.slug': slug,
        'publicPortal.publishedAt': new Date()
      },
      { new: true }
    );

    console.log("✅ Portal ativado automaticamente!", {
      variant: updatedCompany?.publicPortal?.variant,
      slug: updatedCompany?.publicPortal?.slug,
      enabled: updatedCompany?.publicPortal?.enabled
    });

  } catch (pubError) {
    console.error("❌ Erro ao ativar portal automaticamente:", pubError);
  }
} else {
  console.log("ℹ️ Nenhum variant específico selecionado ou é 'default'");
}
    // 2. Criar TODOS os cargos padrão (um documento por role)
    const defaultRoles = [
      { roleName: 'admin', 
        allowedMenuItems: ['Dashboard', 'Vendas', 'Clientes', 'Utilizadores', 'Definições', 'Relatórios', 'Gestão de Cargos'],
        description: 'Administrador com acesso total' },

      { roleName: 'supervisor', 
        allowedMenuItems: ['Dashboard', 'Vendas', 'Clientes', 'Relatórios'],
        description: 'Supervisor de equipa' },

      { roleName: 'sale', 
        allowedMenuItems: ['Dashboard', 'Vendas', 'Clientes'],
        description: 'Gestor de Vendas' },

      { roleName: 'seller', 
        allowedMenuItems: ['Dashboard', 'Vendas', 'Clientes'],
        description: 'Vendedor' },

      { roleName: 'referralPartner', 
        allowedMenuItems: ['Dashboard', 'Vendas'],
        description: 'Parceiro de Referral' }
    ];

    const roleMap = {}; // roleName → roleId

    for (const roleData of defaultRoles) {
      // Verificar se já existe (proteção contra falhas parciais)
      let roleDoc = await RolePermission.findOne({
        roleName: roleData.roleName,
        company: company._id
      });

      if (!roleDoc) {
        roleDoc = new RolePermission({
          ...roleData,
          company: company._id,
          isActive: true
        });
        await roleDoc.save();
      }

      roleMap[roleData.roleName] = roleDoc._id;
    }

    // 3. Criar utilizador Admin
    const user = new User({
      email: normalizedUserEmail,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company._id,
      role: roleMap.admin   // ← Role admin
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // 4. Emails
    try {
      await emailService.sendWelcomeEmail(user.email, user.firstName, company.name);
    } catch (e) {
      console.error('Falha welcome email:', e);
    }

    try {
      const notifyEmails = ['comercial@meupontodevenda.com', 'accounts@meupontodevenda.com'];
      await emailService.sendNewRegistrationNotification(notifyEmails, user, company);
    } catch (e) {
      console.error('Falha notificação interna:', e);
    }

    // Resposta final
    const userWithData = await User.findById(user._id)
  .populate('company')
  .populate('role')
  .select('-password -refreshTokens');

res.status(201).json({
  message: 'Conta criada com sucesso',
  user: userWithData,
  accessToken,
  refreshToken,
  requiresTemplatePayment: !!(variant && (isPaidTemplate || true)), 
  selectedVariant: variant,
  redirectToCheckout: !!(variant && selectedVariant?.price > 0) // opcional
});

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Localize a rota de LOGIN no seu auth.cjs
// Login
router.post('/login', async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('role', 'roleName isActive allowedMenuItems');

    if (!user) {
      return res.status(401).json({ 
        message: 'Credenciais inválidas',  // Genérico para segurança
        errorType: 'user_not_found'  // Campo extra para frontend diferenciar
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Conta não verificada. Por favor, verifique o seu email para ativar a conta.' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Conta inativa. Contacte o administrador.' });
    }

    // Verifica se o role ainda está ativo
    if (user.role && !user.role.isActive) {
      return res.status(403).json({ 
        message: 'O seu role está inativo. Contacte o administrador.' 
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, rememberMe);

    // Adiciona refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.roleName || 'user',
        rolePermissions: user.role?.allowedMenuItems || [],
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});
// FORGOT PASSWORD (EMAIL & WHATSAPP)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Por segurança, você pode retornar 200 mesmo se não encontrar,
      // mas aqui manteremos 404 para facilitar seu debug inicial
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = code;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();

    // Chamando o serviço de e-mail com o template personalizado
    await emailService.sendPasswordReset(user.email, user.firstName, code);

    res.json({ message: 'Código de recuperação enviado com sucesso' });

  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ message: 'Erro ao enviar e-mail de recuperação' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    user.password = newPassword; // O pre-save hook fará o hash
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token não fornecido' });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    const user = await User.findOne({
      _id: decoded.userId,
      'refreshTokens.token': refreshToken   // procura o token exato
    }).populate('role', 'roleName isActive allowedMenuItems');

    if (!user) {
      return res.status(401).json({ message: 'Refresh token inválido ou expirado' });
    }

    // Remove TODOS os refresh tokens antigos (boa prática)
    user.refreshTokens = user.refreshTokens.filter(rt => {
      // Mantém só tokens recentes (ex: últimos 30-60 dias)
      return (Date.now() - new Date(rt.createdAt).getTime()) < 60 * 24 * 60 * 60 * 1000;
    });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, true);

    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();
    res.json({
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.roleName || 'user',
        rolePermissions: user.role?.allowedMenuItems || [],
      }
    });
  } catch (error) {
    console.error('Erro no refresh:', error);
    res.status(401).json({ message: 'Refresh token inválido ou expirado' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(rt => rt.token !== refreshToken);
    } else {
      // Logout total - limpa todos os refresh tokens
      req.user.refreshTokens = [];
    }
    
    await req.user.save();
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer logout' });
  }
});

// routes/auth.cjs
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role', 'roleName description allowedMenuItems isActive')
      .populate({
        path: 'company',
        select: 'name email logo currency taxRate plan planId',
        populate: {
          path: 'subscription',
          select: 'planId planName status currentPeriodEnd billingCycle price',
          populate: {
            path: 'plan',
            select: 'id name maxLimits'
          }
        }
      })
      .select('-password -refreshTokens -verificationTokenHash -verificationTokenExpires');

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }

    const userObj = user.toObject({ virtuals: true });

      // Garantir que company seja sempre um objeto plano com os campos importantes
      if (userObj.company) {
        if (userObj.company._doc) {
          userObj.company = { ...userObj.company._doc, ...userObj.company };
        }
        
        // Garantir planName e subscription no nível correto
        userObj.company.name = userObj.company.name || userObj.company._doc?.name;
        userObj.company.planName = userObj.company.planName || 
                                  userObj.company.subscription?.planName;
      }

    res.json({
      ...userObj,
      roleName: user.role?.roleName || 'user',
      rolePermissions: user.role?.allowedMenuItems || [],

      // Normalização clara para o frontend
      company: user.company ? {
        ...user.company,
        planName: user.company.subscription?.planName || 
                  user.company.planName || 
                  user.company.subscription?.plan?.name || 
                  'Básico',
        planId: user.company.subscription?.planId || 
                user.company.planId || 
                'basic',
        subscription: user.company.subscription || null
      } : null
    });

  } catch (err) {
    console.error('Erro em /auth/me:', err);
    res.status(500).json({ message: 'Erro ao carregar perfil do utilizador' });
  }
});

module.exports = router;