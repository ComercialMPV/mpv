const express = require('express');
const User = require('../models/User.cjs');
const { auth, adminOwnerAuth, superAdminAuth } = require('../middleware/auth.cjs');
const mongoose = require('mongoose');
const emailService = require('../utils/emailService.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const Company = require('../models/Company.cjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs');
const validator = require('validator');

const router = express.Router();

// Rate limiting para registro
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: 'Demasiadas tentativas de registo. Tente novamente mais tarde.'
});
const partnerManagementAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  // role agora é um objeto populado
  const userRoleName = req.user.role?.roleName;

  const allowed = ['admin', 'owner', 'superadmin'];

  if (!userRoleName || !allowed.includes(userRoleName)) {
    return res.status(403).json({ 
      message: 'Acesso restrito a administradores, proprietários ou superadmin' 
    });
  }

  next();
};
// Validation helper
const validateInput = (email, password, firstName, lastName) => {
  const errors = [];
  
  if (!validator.isEmail(email)) {
    errors.push('Email inválido');
  }

  if (password.length < 8) errors.push('A palavra-passe deve ter pelo menos 8 caracteres');
  if (password.length > 128) errors.push('A palavra-passe é demasiado longa');

  const trimmedFirst  = (firstName  || '').trim();
  const trimmedLast   = (lastName   || '').trim();

  if (trimmedFirst.length === 0)  errors.push('O nome é obrigatório');
  if (trimmedLast.length === 0)   errors.push('O apelido é obrigatório');

  const nameRegex = /^[\p{Letter}\s'’-]{1,60}$/u;

  if (trimmedFirst.length > 0 && !nameRegex.test(trimmedFirst)) {
    errors.push('O nome contém caracteres inválidos');
  }
  if (trimmedLast.length > 0 && !nameRegex.test(trimmedLast)) {
    errors.push('O apelido contém caracteres inválidos');
  }

  if (trimmedFirst.length > 60) errors.push('O nome é demasiado longo (máx. 60 caracteres)');
  if (trimmedLast.length > 60)  errors.push('O apelido é demasiado longo (máx. 60 caracteres)');

  return errors;
};

// POST /api/users - Create a new user
router.post('/', auth, partnerManagementAuth, checkSubscriptionLimit('users'), registerLimiter, async (req, res) => {
  const { email, password, firstName, lastName, role, commissionRate, phone, isVerified } = req.body;

  // 1. Validação inicial
  const errors = validateInput(email, password || 'tempPass123', firstName, lastName);
  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(', ') });
  }

  try {
    // 2. Busca o RolePermission (garantindo que pertence à empresa logada)
    // Usamos o nome do cargo (role) ou o ID caso o frontend envie o ObjectId
    const query = {
      $or: [{ roleName: role }, { _id: role }],
      company: req.user.company._id,
      isActive: true
    };

    const roleDoc = await RolePermission.findOne(query);

    if (!roleDoc) {
      return res.status(400).json({ message: 'Role (cargo) inválido ou inativo para esta empresa' });
    }

    // 3. Verifica duplicidade de email
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      company: req.user.company._id 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está registado nesta empresa' });
    }

    // 4. Criação do utilizador
    const finalPassword = password || crypto.randomBytes(8).toString('hex');
// Dentro da rota POST /
const verificationCode = crypto.randomBytes(32).toString('hex'); // Token longo para link
const verificationTokenHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas para o convite
    const newUser = new User({
      email: email.toLowerCase(),
      password: finalPassword, // O middleware do User.cjs irá hashear automaticamente
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      role: roleDoc._id, // Salvamos o ObjectId validado
      company: req.user.company._id,
      commissionRate: roleDoc.roleName === 'partner' ? (Number(commissionRate) || 0) : 0,
      isActive: true,
      isVerified: false, // Usuário criado por admin é considerado verificado
      verificationTokenHash,
      verificationTokenExpires
    });

    await newUser.save();

    // 5. Envio de notificação (Email)
    try {
      await emailService.sendInvitationEmail(
        email,
        firstName,
        finalPassword,
        req.user.company.name || 'sua empresa',
        verificationCode
      );
    } catch (emailErr) {
      console.error('Erro ao enviar email de boas-vindas:', emailErr);
      // Não bloqueamos a criação do usuário se apenas o email falhar
    }

    res.status(201).json({ 
      message: 'Usuário criado com sucesso.',
      user: {
        _id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: roleDoc.roleName, // Retornamos o nome do role para facilitar o frontend
        isVerified: newUser.isVerified
      }
    });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ message: 'Erro interno ao processar a criação do usuário' });
  }
});

// Add other user routes as needed (GET, PUT, DELETE)

module.exports = router;

// List users for the current company (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ company: req.user.company._id })
      .populate('role', 'roleName description') // ← populate para mostrar roleName
      .select('-password -refreshTokens')
      .lean();

    res.json({ users });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});
// GET /api/users/performance - Visão completa para Admin/Owner/Superadmin
// GET /api/users/performance
router.get('/performance', auth, async (req, res) => {
  try {
    const userRole = req.user.role?.roleName || req.user.role;
    
    if (!['admin', 'owner', 'superadmin'].includes(userRole)) {
      return res.status(403).json({ message: 'Acesso restrito a administradores' });
    }

    const companyId = req.user.company._id;
    const { roleId } = req.query;   // só precisamos do roleId por enquanto

    console.log('[Performance Filter] Recebido roleId:', roleId); // ← para debug

    const matchStage = {
      company: companyId,
      isActive: true
    };

    // FILTRO POR CARGO - CORRIGIDO
    if (roleId && roleId !== 'all' && roleId !== '') {
      try {
        matchStage.role = new mongoose.Types.ObjectId(roleId);
        console.log('[Performance Filter] Aplicando filtro role:', roleId);
      } catch (e) {
        console.error('Erro ao converter roleId para ObjectId:', e);
      }
    }

    const performanceData = await User.aggregate([
      { $match: matchStage },

      // Sales
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'createdBy',
          as: 'sales'
        }
      },

      // Goal Distributions
      {
        $lookup: {
          from: 'goaldistributions',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$assignedUser', '$$userId'] } } },
            { $project: { annualTarget: 1, actualRevenue: 1 } }
          ],
          as: 'distributions'
        }
      },

      // Role Info
      {
        $lookup: {
          from: 'rolepermissions',
          localField: 'role',
          foreignField: '_id',
          as: 'roleInfo'
        }
      },
      { $unwind: { path: '$roleInfo', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          roleName: { $ifNull: ['$roleInfo.roleName', 'Sem cargo'] },
          totalSales: { $size: '$sales' },
          totalRevenue: { $sum: '$sales.total' },
          totalCommission: { $sum: '$sales.commissionValue' },
          goalAnnual: { $sum: '$distributions.annualTarget' },
          goalAchieved: { $sum: '$distributions.actualRevenue' }
        }
      },
      {
        $addFields: {
          goalProgress: {
            $cond: [
              { $gt: ['$goalAnnual', 0] },
              { $multiply: [{ $divide: ['$goalAchieved', '$goalAnnual'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          healthStatus: {
            $cond: [
              { $gte: ['$goalProgress', 85] },
              'on-track',
              {
                $cond: [
                  { $gte: ['$goalProgress', 60] },
                  'at-risk',
                  'critical'
                ]
              }
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    console.log(`[Performance] Retornando ${performanceData.length} utilizadores`);
    res.json(performanceData);

  } catch (err) {
    console.error('[User Performance Error]:', err);
    res.status(500).json({ message: 'Erro ao carregar performance dos utilizadores' });
  }
});

// GET /api/users/my-performance - Visão individual
router.get('/my-performance', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company._id;

    const myData = await User.aggregate([
      { $match: { _id: userId, company: companyId } },
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'createdBy',
          as: 'sales'
        }
      },
      {
        $lookup: {
          from: 'goaldistributions',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$assignedUser', '$$userId'] } } },
            { $project: { annualTarget: 1, actualRevenue: 1 } }
          ],
          as: 'distributions'
        }
      },
      // Lookup para Role
      {
        $lookup: {
          from: 'rolepermissions',
          localField: 'role',
          foreignField: '_id',
          as: 'roleInfo'
        }
      },
      { $unwind: { path: '$roleInfo', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          roleName: { $ifNull: ['$roleInfo.roleName', 'Sem cargo'] },
          totalSales: { $size: '$sales' },
          totalRevenue: { $sum: '$sales.total' },
          totalCommission: { $sum: '$sales.commissionValue' },
          goalAnnual: { $sum: '$distributions.annualTarget' },
          goalAchieved: { $sum: '$distributions.actualRevenue' }
        }
      },
      {
        $addFields: {
          goalProgress: {
            $cond: [
              { $gt: ['$goalAnnual', 0] },
              { $multiply: [{ $divide: ['$goalAchieved', '$goalAnnual'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          healthStatus: {
            $cond: [
              { $gte: ['$goalProgress', 85] },
              'on-track',
              {
                $cond: [
                  { $gte: ['$goalProgress', 60] },
                  'at-risk',
                  'critical'
                ]
              }
            ]
          }
        }
      }
    ]);

    const result = myData[0] || {
      _id: userId,
      firstName: req.user.firstName || 'Utilizador',
      lastName: req.user.lastName || '',
      roleName: req.user.role?.roleName || 'Sem cargo',
      totalSales: 0,
      totalRevenue: 0,
      totalCommission: 0,
      goalAnnual: 0,
      goalAchieved: 0,
      goalProgress: 0,
      healthStatus: 'on-track'
    };

    res.json(result);
  } catch (err) {
    console.error('[My Performance Error]:', err);
    res.status(500).json({ message: 'Erro ao carregar o seu desempenho' });
  }
});
// ====================== REGISTO PÚBLICO COM VERIFICAÇÃO ======================
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      companyName, 
      companyEmail, 
      commissionRate, 
      role,
      variant           // ← NOVO: template selecionado na galeria
    } = req.body;

    // 1. Validações Iniciais
    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios são necessários' });
    }

    const errors = validateInput(email, password, firstName, lastName);
    if (errors.length > 0) return res.status(400).json({ message: 'Validação falhou', errors });

    if (companyEmail && !validator.isEmail(companyEmail)) {
      return res.status(400).json({ message: 'Email da empresa inválido' });
    }

    // 2. Verificar duplicidade de utilizador
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Este email já está registado' });

    // 3. Criar Empresa
    const newCompany = new Company({ 
      name: companyName.trim(), 
      email: (companyEmail || email).toLowerCase(),
      publicPortal: {
        enabled: false,
        variant: variant || 'default'
      }
    });
    await newCompany.save();

    // ==================== ATIVAR PORTAL AUTOMATICAMENTE ====================
    if (variant && variant !== 'default') {
      try {
        let slug = companyName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');

        // Evitar conflito de slug
        const existingSlug = await Company.findOne({
          _id: { $ne: newCompany._id },
          'publicPortal.slug': slug
        });

        if (existingSlug) {
          slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        await Company.findByIdAndUpdate(newCompany._id, {
          'publicPortal.enabled': true,
          'publicPortal.variant': variant,
          'publicPortal.slug': slug,
          'publicPortal.publishedAt': new Date()
        });

        console.log(`✅ Portal ativado automaticamente durante registo: ${variant} | slug: ${slug}`);

      } catch (pubError) {
        console.error('Erro ao ativar portal automaticamente:', pubError);
      }
    }

    // 4. Lógica de Role Segura
    const targetRoleName = role || 'admin';
    
    const isAdminRole = ['admin', 'owner', 'superadmin'].includes(targetRoleName);
    const defaultPermissions = isAdminRole 
      ? ['Dashboard', 'Vendas', 'Clientes', 'Definições', 'Gestão de cargos'] 
      : ['Dashboard'];

    const roleDoc = await RolePermission.findOneAndUpdate(
      { roleName: targetRoleName, company: newCompany._id },
      { 
        $setOnInsert: {
          company: newCompany._id,
          allowedMenuItems: defaultPermissions,
          description: `Role ${targetRoleName} criado automaticamente para ${companyName}`,
          isActive: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 5. Configurar Token de Verificação
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // 6. Criar Utilizador
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: roleDoc._id,
      company: newCompany._id,
      commissionRate: targetRoleName === 'partner' ? (Number(commissionRate) || 0) : 0,
      isVerified: false,
      verificationTokenHash,
      verificationTokenExpires
    });

    await user.save();

    // 7. Enviar Email
    try {
      await emailService.sendVerificationEmail(email, firstName, verificationCode);
    } catch (emailErr) {
      console.error('Falha ao enviar email de verificação:', emailErr);
    }

    res.status(201).json({
      message: 'Conta criada com sucesso! Verifique o seu email para ativar.',
      email: email.toLowerCase(),
      variant: variant || 'default'
    });

  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Erro de duplicidade: verifique os dados enviados.' });
    }
    res.status(500).json({ message: 'Erro interno ao criar conta' });
  }
});


// ====================== VERIFICAR EMAIL ======================
// POST /api/users/verify-email  → formulário de código no frontend
router.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!validator.isEmail(email) || !token || token.length !== 6) {
      return res.status(400).json({ message: 'Email ou código inválido' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    if (user.isVerified) return res.status(400).json({ message: 'Conta já verificada' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (!user.verificationTokenHash || 
        user.verificationTokenHash !== tokenHash || 
        new Date() > user.verificationTokenExpires) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;
    user.emailVerifiedAt = new Date();
    await user.save();

    res.json({ message: 'Conta verificada com sucesso! Pode agora fazer login.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ message: 'Erro ao verificar conta' });
  }
});

// GET /api/users/verify-email  → link clicado no email
// GET /api/users/verify-email
router.get('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.query;

    if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    if (user.isVerified) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?verified=true`);
    }

    let isValid = false;

    // Caso 1: Código de 6 dígitos (formulário)
    if (token.length === 6) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      isValid = user.verificationTokenHash === tokenHash;
    }
    // Caso 2: Token longo do link (o verificationToken original, não o hash)
    else {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      isValid = user.verificationTokenHash === tokenHash;
    }

    if (!isValid || new Date() > user.verificationTokenExpires) {
      return res.status(400).json({ message: 'Código ou link inválido/expirado' });
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;
    user.emailVerifiedAt = new Date();
    await user.save();

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (err) {
    console.error('Verify email link error:', err);
    res.status(500).json({ message: 'Erro ao verificar conta' });
  }
});
// Get single user (admin or self)
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar se é um ObjectId válido
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID de utilizador inválido' });
    }

    const user = await User.findById(id).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Same company required
    if (String(user.company) !== String(req.user.company._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allow if admin or requesting own profile
    if (req.user.role !== 'admin' && String(req.user._id) !== String(id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin or self)
// PUT /api/users/:id - Atualizar utilizador
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validar ObjectId do utilizador
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de utilizador inválido' });
    }

    const target = await User.findById(id).populate('role', 'roleName');
    if (!target) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }

    // Verifica se pertence à mesma empresa
    if (String(target.company) !== String(req.user.company._id)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const isSelf = String(req.user._id) === String(id);
    const requesterRole = req.user.role?.roleName;

    // Bloqueia se não for admin/owner/superadmin e não for o próprio utilizador
    if (!isSelf && !['superadmin', 'admin', 'owner'].includes(requesterRole)) {
      return res.status(403).json({ 
        message: 'Acesso restrito a administradores, proprietários ou superadmin' 
      });
    }

    // Campos críticos só podem ser alterados por admin/owner/superadmin (e não pelo próprio, exceto senha)
    if (!['superadmin', 'admin', 'owner'].includes(requesterRole) || isSelf) {
      delete updates.role;        // só admins mudam role
      delete updates.isActive;    // só admins ativam/desativam
      delete updates.company;     // nunca muda empresa
    }

    // Validação extra para alteração de role (se permitido)
    if (updates.role && !mongoose.Types.ObjectId.isValid(updates.role)) {
      return res.status(400).json({ message: 'ID de role inválido' });
    }

    // Se alterar role, verifica se o novo role existe na empresa
    if (updates.role) {
      const newRole = await RolePermission.findOne({
        _id: updates.role,
        company: req.user.company._id,
        isActive: true
      });

      if (!newRole) {
        return res.status(400).json({ message: 'Role inválido ou inativo' });
      }
    }

    // Se password for enviada, valida
    if (updates.password) {
      if (updates.password.length < 8 || updates.password.length > 128) {
        return res.status(400).json({ message: 'Palavra-passe inválida (mínimo 8 caracteres)' });
      }
      target.password = updates.password; // será hasheada no pre-save
    }

    // Whitelist de campos permitidos (mesmo para admins)
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'walletIds', 
      'commissionRate' // só se role for partner, mas validamos depois
    ];

    allowedFields.forEach(key => {
      if (updates[key] !== undefined) {
        if (key === 'walletIds') {
          // Merge em vez de substituir
          target.walletIds = {
            mpesa: updates.walletIds.mpesa ?? target.walletIds.mpesa,
            emola: updates.walletIds.emola ?? target.walletIds.emola,
            visa: updates.walletIds.visa ?? target.walletIds.visa,
            debitoPat: updates.walletIds.debitoPat ?? target.walletIds.debitoPat,
          };
        } else {
          target[key] = updates[key];
        }
      }
    });

    // Campos extras só para admins/owner/superadmin alterarem em outros usuários
    if (['superadmin', 'admin', 'owner'].includes(requesterRole) && !isSelf) {
      if (updates.role !== undefined) target.role = updates.role;
      if (updates.isActive !== undefined) target.isActive = updates.isActive;
      if (updates.email !== undefined) target.email = updates.email.toLowerCase();
    }

    await target.save();

    // Retorna utilizador atualizado com role populado
    const updatedUser = await User.findById(id)
      .populate('role', 'roleName description')
      .select('-password -refreshTokens');

    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Erro ao atualizar utilizador:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Erro no servidor ao atualizar utilizador' });
  }
});
// Delete user (admin only) - prevents removing last admin

// ====================== PERFORMANCE ROUTES ======================


// DELETE /api/users/:id - Remover usuário (já estava bom, só ajustei mensagem)
router.delete('/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const target = await User.findById(id).populate('role', 'roleName');

    if (!target) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (String(target.company) !== String(req.user.company._id)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Não permitir deletar a si mesmo
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'Não pode deletar a sua própria conta' });
    }

    // Bloqueia se for o último admin/owner/superadmin ativo
    if (['admin', 'owner', 'superadmin'].includes(target.role?.roleName)) {
      const adminCount = await User.countDocuments({ 
        company: req.user.company._id, 
        role: target.role._id, // ← usa ObjectId do role
        isActive: true,
        _id: { $ne: id }
      });

      if (adminCount < 1) {
        return res.status(400).json({ 
          message: 'Não pode deletar o último administrador, proprietário ou superadmin ativo da empresa' 
        });
      }
    }

    await User.deleteOne({ _id: id });
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ message: 'Erro ao remover usuário' });
  }
});



module.exports = router;