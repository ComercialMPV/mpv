// routes/admin.cjs
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Company = require('../models/Company.cjs');
const User = require('../models/User.cjs');
const Client = require('../models/Client.cjs');
const Supplier = require('../models/Supplier.cjs');
const Lead = require('../models/Lead.cjs');
const emailService = require('../utils/emailService.cjs');
const Sale = require('../models/Sale.cjs');
const Requisition = require('../models/Requisition.cjs');
const Document = require('../models/Document.cjs');
const Bundle = require('../models/Bundle.cjs');
const Product = require('../models/Product.cjs');
const Service = require('../models/Service.cjs');
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription.cjs');

// Importa os planos de subscrição centralizados
const { SUBSCRIPTION_PLANS, PLANS_ARRAY } = require('../config/subscriptionPlans.cjs');

// Middlewares
const RolePermission = require('../models/RolePermission.cjs');
const { auth, superAdminAuth } = require('../middleware/auth.cjs');


const adminOwnerAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

  // Popula o role caso ainda não esteja populado para garantir acesso ao nome
  // (Nota: O populate no auth original já deveria ter feito isso)
  const roleName = req.user.role?.roleName;

  if (['admin', 'owner', 'superadmin'].includes(roleName)) {
    return next();
  }

  return res.status(403).json({ message: 'Acesso restrito a administradores' });
};

// POST /api/admin/companies  (Criar empresa - usado por SuperAdmin/Owner)
// POST /api/admin/companies
router.post('/companies', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      adminEmail, 
      adminFirstName = 'Admin', 
      adminLastName = 'Empresa',
      planId = 'basic',
      trialDays = 14
    } = req.body;

    // ================== VALIDAÇÕES INICIAIS ==================
    if (!name?.trim()) return res.status(400).json({ message: 'Nome da empresa é obrigatório' });
    if (!email?.trim()) return res.status(400).json({ message: 'Email da empresa é obrigatório' });

    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedAdminEmail = adminEmail?.toLowerCase().trim();

    // Verificar duplicados da empresa
    if (await Company.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } })) {
      return res.status(409).json({ message: 'Já existe uma empresa com este nome' });
    }
    if (await Company.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'Já existe uma empresa com este email' });
    }

    // Verificar se email do admin já existe
    if (normalizedAdminEmail) {
      const existingAdmin = await User.findOne({ email: normalizedAdminEmail });
      if (existingAdmin) {
        return res.status(409).json({ message: 'Este email de administrador já está registado' });
      }
    }

    // Buscar plano dinâmico
    const SubscriptionPlanModel = require('../models/SubscriptionPlan.cjs');
    const selectedPlan = await SubscriptionPlanModel.findOne({ id: planId });
    if (!selectedPlan) {
      return res.status(400).json({ message: `Plano "${planId}" não encontrado` });
    }

    // ================== CRIAR EMPRESA ==================
    const company = new Company({
      name: normalizedName,
      email: normalizedEmail,
      createdBy: req.user._id,
      plan: selectedPlan.id,
      currency: 'MT',
      paymentTerms: 'Net 30',
      invoiceNumberPrefix: 'INV-',
      quotationNumberPrefix: 'QUO-',
    });

    await company.save();

    // ================== CRIAR SUBSCRIÇÃO ==================
    const Subscription = require('../models/Subscription.cjs');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + trialDays);

    const subscription = new Subscription({
      company: company._id,
      plan: selectedPlan._id,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      price: selectedPlan.price || 0,
      currency: 'MT',
      status: 'trial',
      billingCycle: 'monthly',
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      nextBillingDate: endDate,
      autoRenew: false,
      purchasedBy: req.user._id,
    });

    await subscription.save();

    // ================== LIGAR SUBSCRIÇÃO À EMPRESA ==================
    company.subscription = subscription._id;
    await company.save();

    // ================== CRIAR ROLE ADMIN ==================
    const RolePermission = require('../models/RolePermission.cjs');
    let adminRole = await RolePermission.findOne({ roleName: 'admin', company: company._id });

    if (!adminRole) {
      adminRole = new RolePermission({
        roleName: 'admin',
        company: company._id,
        allowedMenuItems: [
          'Dashboard', 'Vendas', 'Clientes', 'Leads', 'Propostas', 
          'Definições', 'Empresa', 'Gestão de cargos', 'Gestão de Usuários'
        ],
        description: 'Administrador da empresa',
        isActive: true
      });
      await adminRole.save();
    }

    // ================== CRIAR UTILIZADOR ADMIN ==================
    const crypto = require('crypto');
    const tempPassword = crypto.randomBytes(12).toString('hex');

    // Gerar código de ativação
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const activationTokenHash = crypto.createHash('sha256').update(activationCode).digest('hex');
    const activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const adminUser = new User({
      email: normalizedAdminEmail || `${normalizedName.toLowerCase().replace(/\s+/g, '')}@admin.local`,
      password: tempPassword,
      firstName: adminFirstName.trim(),
      lastName: adminLastName.trim(),
      company: company._id,
      role: adminRole._id,
      isActive: true,                    // ← Importante: começa inativo até verificar
      isVerified: false,
      verificationTokenHash: activationTokenHash,
      verificationTokenExpires: activationTokenExpires,
    });

    await adminUser.save();

    // ================== ENVIAR EMAIL COM LINK DE ATIVAÇÃO ==================
    const emailService = require('../utils/emailService.cjs');
    
    await emailService.sendCompanyCreationEmail(
      normalizedEmail,           // email da empresa (ou adminEmail?)
      company.name,
      adminUser.email,
      tempPassword,
      activationCode             // ← Agora estamos a passar o código real!
    );

    // ================== RESPOSTA SUCESSO ==================
    return res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso. Credenciais enviadas por email.',
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        plan: selectedPlan.name
      },
      subscription: {
        _id: subscription._id,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        status: 'trial',
        endsAt: endDate
      }
    });

  } catch (err) {
    console.error('Erro ao criar empresa:', err);

    // Tratamento específico para erro de duplicado do MongoDB
    if (err.code === 11000) {
      const field = err.keyPattern && Object.keys(err.keyPattern)[0];
      if (field === 'email') {
        return res.status(409).json({ message: 'Este email de empresa já está em uso' });
      }
      if (field === 'name') {
        return res.status(409).json({ message: 'Já existe uma empresa com este nome' });
      }
    }

    // Erro genérico
    res.status(500).json({ 
      message: 'Erro interno ao criar empresa. Por favor, tente novamente.' 
    });
  }
});
// ====================== VERIFICAÇÃO DE DISPONIBILIDADE ======================
// Rota pública para verificar se nome ou email da empresa já existe
router.post('/companies/check', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (name) {
      const existingName = await Company.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
      });

      if (existingName) {
        return res.status(409).json({ 
          message: 'Já existe uma empresa com este nome' 
        });
      }
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingEmail = await Company.findOne({ email: normalizedEmail });

      if (existingEmail) {
        return res.status(409).json({ 
          message: 'Já existe uma empresa com este email' 
        });
      }
    }

    // Se chegou aqui, está disponível
    res.json({ available: true });

  } catch (error) {
    console.error('Erro no check de empresa:', error);
    res.status(500).json({ message: 'Erro ao verificar disponibilidade' });
  }
});
// GET /api/admin/companies/overview
// GET /api/admin/companies/overview
router.get('/companies/overview', auth, async (req, res) => {
  try {
    const user = req.user;
    const roleName = user.role?.roleName || user.role;

    // 1. Definir o Filtro de Visibilidade
    let filter = {};
    // Se não for superadmin, filtra apenas empresas criadas pelo próprio usuário
    if (roleName !== 'superadmin') {
      filter.createdBy = user._id;
    }

    // 2. Buscar o ID do role 'partner' para contagens
    const partnerRole = await RolePermission.findOne({ roleName: 'partner' }).select('_id');
    const partnerRoleId = partnerRole ? partnerRole._id : null;

    // 3. Buscar empresas com base no filtro aplicado
    const companies = await Company.find(filter)
      .select('_id name email createdAt publicPortal slug subscription plan createdBy')
      .lean();

    const result = await Promise.all(
      companies.map(async (company) => {
        const companyId = company._id;

        // Contagens básicas
        const userCount = await User.countDocuments({ company: companyId });
        const clientCount = await Client.countDocuments({ company: companyId });
        const partnerCount = partnerRoleId 
          ? await User.countDocuments({ company: companyId, role: partnerRoleId, isActive: true })
          : 0;

        // Buscar dados do "parceiro principal"
        const primaryPartner = partnerRoleId 
          ? await User.findOne({ company: companyId, role: partnerRoleId }).select('monthlySalesGoal monthlyLeadsGoal').lean()
          : null;

        // Lógica de Subscription
        let subscription = await Subscription.findOne({ company: companyId }).lean();
        if (!subscription) {
          subscription = {
            planId: 'basic',
            planName: 'Básico',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10),
          };
        }

        // Estatísticas de Vendas (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const salesStats = await Sale.aggregate([
          { $match: { company: companyId, createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
            },
          },
        ]);

        const avgMonthlyRevenue =
          salesStats.length > 0
            ? Math.round((salesStats[0].totalRevenue / 6) * 100) / 100
            : 0;

        return {
          _id: company._id.toString(),
          name: company.name,
          email: company.email,
          createdAt: company.createdAt,
          slug: company.publicPortal?.slug || null,
          subscription: {
            plan: subscription.planName || subscription.planId,
            status: subscription.status,
            endsAt: subscription.currentPeriodEnd,
            planId: subscription.planId,
          },
          monthlySalesGoal: primaryPartner?.monthlySalesGoal || 0,
          monthlyLeadsGoal: primaryPartner?.monthlyLeadsGoal || 0,
          usersCount: userCount,
          clientsCount: clientCount,
          partnersCount: partnerCount,
          avgMonthlyProduction: avgMonthlyRevenue,
          // Flags de permissão para o Frontend
          canManage: roleName === 'superadmin' || company.createdBy?.toString() === user._id.toString(),
          canDelete: roleName === 'superadmin',
        };
      })
    );

    // Ordenação
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      companies: result,
      totalCompanies: result.length,
      summary: {
        totalUsers: result.reduce((sum, c) => sum + c.usersCount, 0),
        totalClients: result.reduce((sum, c) => sum + c.clientsCount, 0),
        totalPartners: result.reduce((sum, c) => sum + c.partnersCount, 0),
        totalActiveSubscriptions: result.filter(c => c.subscription.status === 'active').length,
      },
    });
  } catch (err) {
    console.error('[admin overview] Erro:', err);
    res.status(500).json({ message: 'Erro ao carregar visão geral das empresas' });
  }
});

// PATCH /api/admin/companies/:id/subscription
router.patch('/companies/:id/subscription', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { planId, months = 1, manualActivation = true } = req.body;
    const companyId = req.params.id;

    if (!planId) {
      return res.status(400).json({ message: 'planId é obrigatório' });
    }

    const SubscriptionPlan = require('../models/SubscriptionPlan.cjs');
    const selectedPlan = await SubscriptionPlan.findOne({ id: planId });
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Plano inválido ou não encontrado' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);

    let billingCycle = 'monthly';
    if (months === 12) billingCycle = 'annual';
    else if (months !== 1) billingCycle = 'custom';

    const Subscription = require('../models/Subscription.cjs');

    // Criar ou atualizar subscrição
    const subscription = await Subscription.findOneAndUpdate(
      { company: companyId },
      {
        plan: selectedPlan._id,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price || 0,
        currency: 'MT',
        status: 'active',
        billingCycle,
        initialMonths: billingCycle === 'custom' ? months : undefined,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        nextBillingDate: end,
        autoRenew: true,
        ...(manualActivation && {
          transactionId: null,
          externalRef: null,
          paymentMethod: 'manual'
        }),
      },
      { upsert: true, new: true, runValidators: true }
    );

    // ← GARANTIR QUE A EMPRESA FICA LIGADA À SUBSCRIÇÃO
    company.subscription = subscription._id;
    company.plan = selectedPlan.id;
    company.planName = selectedPlan.name;   // opcional, mas útil
    await company.save();

    res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      subscription,
      company: {
        _id: company._id,
        name: company.name,
        plan: company.plan,
        subscription: company.subscription
      }
    });

  } catch (err) {
    console.error('[admin subscription update] Erro:', err);
    res.status(500).json({ 
      message: 'Erro ao atualizar subscrição',
      error: err.message 
    });
  }
});

// GET /api/admin/companies/:id/users
router.get('/companies/:id/users', auth, adminOwnerAuth, async (req, res) => {
  try {
    const companyId = req.params.id;
    const users = await User.find({ company: companyId })
      .select('firstName lastName email role isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar utilizadores' });
  }
});

// GET /api/admin/companies/:id/clients
router.get('/companies/:id/clients', auth, adminOwnerAuth, async (req, res) => {
  try {
    const companyId = req.params.id;
    const clients = await Client.find({ company: companyId })
      .select('name email phone createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar clientes' });
  }
});

// DELETE /api/admin/companies/:id
router.delete('/companies/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    const companyId = req.params.id;

    // 1. Verificar se a empresa existe
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // 2. Eliminar todos os dados relacionados (ordem importante)

    // Eliminar subscrição
    await Subscription.deleteOne({ company: companyId });

    // Eliminar todos os utilizadores da empresa (inclui o admin)
    const deletedUsers = await User.deleteMany({ company: companyId });
    console.log(`Eliminados ${deletedUsers.deletedCount} utilizadores da empresa ${company.name}`);

    // Eliminar clientes
    await Client.deleteMany({ company: companyId });

    // Eliminar leads
    await Lead.deleteMany({ company: companyId });

    // Eliminar fornecedores
    await Supplier.deleteMany({ company: companyId });

    // Eliminar requisições
    await Requisition.deleteMany({ company: companyId });

    // Eliminar documentos
    await Document.deleteMany({ company: companyId });

    // Eliminar vendas
    await Sale.deleteMany({ company: companyId });

    // Eliminar bundles/produtos/serviços (se quiser ser completo)
    await Bundle.deleteMany({ company: companyId });
    await Product.deleteMany({ company: companyId });
    await Service.deleteMany({ company: companyId });

    // 3. Eliminar a própria empresa
    await Company.findByIdAndDelete(companyId);

    res.json({ 
      success: true,
      message: `Empresa "${company.name}" e todos os dados associados foram eliminados permanentemente.`,
      deleted: {
        users: deletedUsers.deletedCount,
        company: company.name
      }
    });

  } catch (err) {
    console.error('Erro ao eliminar empresa:', err);
    res.status(500).json({ 
      message: 'Erro interno ao eliminar a empresa',
      error: err.message 
    });
  }
});
// GET /api/admin/partners/overview
// Retorna overview completo de todos os parceiros ativos da empresa
// GET /api/admin/partners/overview
router.get('/partners/overview', auth, adminOwnerAuth, async (req, res) => {
  try {
    const companyId = req.user.company._id;

    // 1. Buscar o Role "partner" DA EMPRESA LOGADA (Correção principal)
    const partnerRole = await RolePermission.findOne({
      roleName: 'partner',
      company: companyId,        // ← ESSA LINHA É FUNDAMENTAL
      isActive: true
    }).select('_id').lean();

    if (!partnerRole) {
      console.warn(`[partners/overview] Role "partner" não encontrado para a empresa ${companyId}`);
      return res.json({ partners: [] });
    }

    const partnerRoleId = partnerRole._id;

    // 2. Buscar os parceiros da empresa
    const partners = await User.find({
      company: companyId,
      role: partnerRoleId,
      isActive: true,
    })
      .select('_id firstName lastName email phone commissionRate createdAt monthlySalesGoal monthlyLeadsGoal')
      .lean();

    if (partners.length === 0) {
      return res.json({ partners: [] });
    }

    // 3. Enriquecer cada parceiro com métricas (otimizado)
    const enrichedPartners = await Promise.all(
      partners.map(async (partner) => {
        const partnerId = partner._id;

        // a) Empresas registadas via link de referral
        const referralCount = await User.countDocuments({
          'referral.referredBy': partnerId,
          company: { $ne: companyId },   // empresas criadas por referral
        });

        // b) Clientes criados pelo parceiro
        const clientCount = await Client.countDocuments({
          company: companyId,
          createdBy: partnerId,
        });

        // c) Estatísticas de vendas
        const salesStats = await Sale.aggregate([
          {
            $match: {
              company: companyId,
              createdBy: partnerId,        // ← Alterei de partnerId para createdBy (mais comum)
              // partnerId: partnerId      // manténs se usares este campo também
            }
          },
          {
            $group: {
              _id: null,
              saleCount: { $sum: 1 },
              totalSalesValue: { $sum: '$total' },
              totalCommissionGenerated: { $sum: '$commissionValue' },
            }
          }
        ]);

        const salesData = salesStats[0] || {
          saleCount: 0,
          totalSalesValue: 0,
          totalCommissionGenerated: 0,
        };

        // d) Leads em aberto
        const openLeads = await Lead.countDocuments({
          company: companyId,
          createdBy: partnerId,
          stage: { $in: ['new', 'contacted', 'negotiation', 'pending', 'proposal'] }
        });

        return {
          _id: partner._id,
          firstName: partner.firstName,
          lastName: partner.lastName,
          email: partner.email,
          phone: partner.phone || null,
          commissionRate: partner.commissionRate || 0,
          isActive: true,
          createdAt: partner.createdAt,
          monthlySalesGoal: partner.monthlySalesGoal || 0,
          monthlyLeadsGoal: partner.monthlyLeadsGoal || 0,

          // Métricas
          referralCount,
          clientCount,
          saleCount: salesData.saleCount,
          totalSalesValue: salesData.totalSalesValue,
          totalCommissionGenerated: salesData.totalCommissionGenerated,
          openLeads,
        };
      })
    );

    // Ordenar por comissão gerada (descendente) → mais útil para gestão
    enrichedPartners.sort((a, b) => 
      b.totalCommissionGenerated - a.totalCommissionGenerated
    );

    res.json({ partners: enrichedPartners });

  } catch (err) {
    console.error('[GET /admin/partners/overview] Erro:', err);
    res.status(500).json({
      message: 'Erro ao carregar overview dos parceiros'
    });
  }
});
// Criar parceiro
// Criar parceiro
// POST /api/admin/partners  (ou /api/users/partners)
router.post('/partners', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, commissionRate = 10 } = req.body;

    // 1. Validação básica
    if (!firstName?.trim() || !lastName?.trim() || !email) {
      return res.status(400).json({ 
        message: 'Nome, apelido e email são obrigatórios' 
      });
    }

    // 2. Buscar o Role "partner" DA EMPRESA LOGADA (CORREÇÃO CRÍTICA)
    const partnerRole = await RolePermission.findOne({ 
      roleName: 'partner',
      company: req.user.company._id,   // ← ESSA LINHA É A MAIS IMPORTANTE
      isActive: true
    });

    if (!partnerRole) {
      return res.status(400).json({ 
        message: 'Role de parceiro não encontrado ou inativo para a sua empresa. Contacte o administrador.' 
      });
    }

    // 3. Verifica duplicidade de email NA MESMA EMPRESA
    const existing = await User.findOne({ 
      email: email.toLowerCase(), 
      company: req.user.company._id 
    });

    if (existing) {
      return res.status(400).json({ 
        message: 'Este email já está registado na sua empresa' 
      });
    }

    // 4. Gera senha e token de verificação
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    const verificationCode = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256')
      .update(verificationCode)
      .digest('hex');
    
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 5. Criar o parceiro
    const partner = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      phone: phone?.trim() || undefined,
      password: generatedPassword,
      role: partnerRole._id,                    // Agora é o role correto da empresa
      company: req.user.company._id,            // Garantido
      commissionRate: Number(commissionRate) || 10,
      isActive: true,
      isVerified: false,
      verificationTokenHash,
      verificationTokenExpires
    });

    await partner.save();

    // 6. Enviar email (não bloquear se falhar)
    try {
      await emailService.sendInvitationEmail(
        email,
        firstName.trim(),
        generatedPassword,
        req.user.company.name || 'a sua empresa',
        verificationCode
      );
    } catch (emailErr) {
      console.error('Erro ao enviar email de convite:', emailErr);
      // Não falha a criação por causa do email
    }

    res.status(201).json({
      message: 'Parceiro criado com sucesso. Email de convite enviado.',
      partner: {
        _id: partner._id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        commissionRate: partner.commissionRate,
        isActive: partner.isActive,
        role: partnerRole.roleName   // útil para frontend
      }
    });

  } catch (err) {
    console.error('Erro ao criar parceiro:', err);
    res.status(500).json({ 
      message: 'Erro interno ao criar parceiro' 
    });
  }
});

// Atualizar parceiro
// Atualizar parceiro
// PUT /api/admin/partners/:id
router.put('/partners/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validação básica do ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de parceiro inválido' });
    }

    // 1. Buscar o Role "partner" DA EMPRESA LOGADA (Correção principal)
    const partnerRole = await RolePermission.findOne({
      roleName: 'partner',
      company: req.user.company._id,   // ← ESSA LINHA É FUNDAMENTAL
      isActive: true
    }).select('_id');

    if (!partnerRole) {
      return res.status(400).json({ 
        message: 'Role de parceiro não encontrado ou inativo para a sua empresa' 
      });
    }

    // 2. Campos permitidos para atualização (whitelist por segurança)
    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'commissionRate',
      'isActive',
      'monthlySalesGoal',
      'monthlyLeadsGoal'
    ];

    // Filtrar apenas os campos permitidos
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Não permitir alterar email ou role por esta rota (segurança)
    delete filteredUpdates.email;
    delete filteredUpdates.role;
    delete filteredUpdates.company;

    // 3. Realizar o update
    const partner = await User.findOneAndUpdate(
      { 
        _id: id, 
        company: req.user.company._id, 
        role: partnerRole._id   // Garante que é realmente um partner da empresa
      },
      filteredUpdates,
      { 
        new: true,           // Retorna o documento atualizado
        runValidators: true 
      }
    ).select('-password -refreshTokens -verificationTokenHash');

    if (!partner) {
      return res.status(404).json({ 
        message: 'Parceiro não encontrado ou não pertence à sua empresa' 
      });
    }

    // Popular o role para retornar informação útil
    await partner.populate('role', 'roleName');

    res.json({
      message: 'Parceiro atualizado com sucesso',
      partner: {
        _id: partner._id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        phone: partner.phone,
        commissionRate: partner.commissionRate,
        isActive: partner.isActive,
        monthlySalesGoal: partner.monthlySalesGoal,
        monthlyLeadsGoal: partner.monthlyLeadsGoal,
        role: partner.role?.roleName
      }
    });

  } catch (err) {
    console.error('Erro ao atualizar parceiro:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Dados inválidos: ' + err.message 
      });
    }

    res.status(500).json({ 
      message: 'Erro ao atualizar parceiro' 
    });
  }
});

// Apagar parceiro
router.delete('/partners/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    // 1. Buscamos o ID do role 'partner' para garantir que o filtro seja compatível com a migração
    const partnerRole = await RolePermission.findOne({ roleName: 'partner' }).select('_id');
    
    if (!partnerRole) {
      return res.status(400).json({ message: 'Role de parceiro não encontrado' });
    }

    // 2. Realizamos a deleção filtrando pelo ID do role (ObjectId)
    const partner = await User.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id,
      role: partnerRole._id, // Usando o ObjectId aqui
    });

    if (!partner) {
      return res.status(404).json({ message: 'Parceiro não encontrado ou não pertence a esta empresa' });
    }

    res.json({ message: 'Parceiro removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover parceiro:', err);
    res.status(500).json({ message: 'Erro ao remover parceiro' });
  }
});

// Definir metas
// PATCH /api/admin/partners/:id/goals
router.patch('/partners/:id/goals', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { monthlySalesGoal, monthlyLeadsGoal } = req.body;

    // Validação básica dos valores
    if (monthlySalesGoal === undefined && monthlyLeadsGoal === undefined) {
      return res.status(400).json({ 
        message: 'Pelo menos uma meta deve ser enviada (monthlySalesGoal ou monthlyLeadsGoal)' 
      });
    }

    // 1. Buscar o Role "partner" DA EMPRESA LOGADA (Correção principal)
    const partnerRole = await RolePermission.findOne({
      roleName: 'partner',
      company: req.user.company._id,     // ← ESSA LINHA É FUNDAMENTAL
      isActive: true
    }).select('_id');

    if (!partnerRole) {
      return res.status(400).json({ 
        message: 'Role de parceiro não encontrado ou inativo para a sua empresa' 
      });
    }

    // 2. Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de parceiro inválido' });
    }

    // 3. Atualizar apenas as metas
    const partner = await User.findOneAndUpdate(
      { 
        _id: id, 
        company: req.user.company._id, 
        role: partnerRole._id   // Garante que é um partner da empresa
      },
      { 
        monthlySalesGoal: Number(monthlySalesGoal) || 0,
        monthlyLeadsGoal: Number(monthlyLeadsGoal) || 0,
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('firstName lastName email commissionRate monthlySalesGoal monthlyLeadsGoal isActive');

    if (!partner) {
      return res.status(404).json({ 
        message: 'Parceiro não encontrado ou não pertence à sua empresa' 
      });
    }

    // Popular role (opcional, mas útil)
    await partner.populate('role', 'roleName');

    res.json({
      message: 'Metas atualizadas com sucesso',
      partner: {
        _id: partner._id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        commissionRate: partner.commissionRate,
        monthlySalesGoal: partner.monthlySalesGoal,
        monthlyLeadsGoal: partner.monthlyLeadsGoal,
        isActive: partner.isActive,
        role: partner.role?.roleName || 'partner'
      }
    });

  } catch (err) {
    console.error('Erro ao atualizar metas do parceiro:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Valores inválidos para as metas' 
      });
    }

    res.status(500).json({ 
      message: 'Erro ao atualizar metas do parceiro' 
    });
  }
});
// GET /api/partners/my-goals-progress
// GET /api/users/my-goals-progress   (ou /api/partners/my-goals-progress)
router.get('/my-goals-progress', auth, async (req, res) => {
  try {
    // 1. Verificação de role + empresa (Correção importante)
    const roleName = req.user.role?.roleName || req.user.role;

    if (roleName !== 'partner') {
      return res.status(403).json({ 
        message: 'Acesso exclusivo a parceiros' 
      });
    }

    // Verifica se o role realmente pertence à empresa do utilizador
    const userCompanyId = req.user.company._id;
    const partnerRole = await RolePermission.findOne({
      roleName: 'partner',
      company: userCompanyId,
      isActive: true
    }).select('_id');

    if (!partnerRole || String(req.user.role?._id || req.user.role) !== String(partnerRole._id)) {
      return res.status(403).json({ 
        message: 'Acesso negado. Role inválido para esta empresa.' 
      });
    }

    const partnerId = req.user._id;
    const companyId = req.user.company._id;

    // 2. Buscar metas atualizadas do parceiro
    const partnerData = await User.findById(partnerId)
      .select('monthlySalesGoal monthlyLeadsGoal')
      .lean();

    // Período: mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês

    // 3. Vendas do mês atual
    // Nota: Usei `createdBy` para manter consistência com as outras rotas de performance
    // Se o teu modelo de Sale usa `partnerId`, podes manter ou adicionar ambos
    const salesThisMonth = await Sale.aggregate([
      {
        $match: {
          company: companyId,
          createdBy: partnerId,           // ← Recomendado (mais consistente)
          // partnerId: partnerId,        // descomenta se também usares este campo
          createdAt: { 
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth 
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        }
      }
    ]);

    // 4. Leads criados este mês
    const leadsThisMonth = await Lead.countDocuments({
      company: companyId,
      createdBy: partnerId,
      createdAt: { 
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth 
      }
    });

    res.json({
      monthlySalesGoal: partnerData?.monthlySalesGoal || 0,
      monthlyLeadsGoal: partnerData?.monthlyLeadsGoal || 0,
      currentMonthSales: salesThisMonth[0]?.total || 0,
      currentMonthLeads: leadsThisMonth || 0,
      // Informação extra útil
      progressSales: partnerData?.monthlySalesGoal 
        ? Math.round(((salesThisMonth[0]?.total || 0) / partnerData.monthlySalesGoal) * 100) 
        : 0,
      progressLeads: partnerData?.monthlyLeadsGoal 
        ? Math.round(((leadsThisMonth || 0) / partnerData.monthlyLeadsGoal) * 100) 
        : 0
    });

  } catch (err) {
    console.error('[my-goals-progress] Erro:', err);
    res.status(500).json({ 
      message: 'Erro ao carregar progresso das metas' 
    });
  }
});

module.exports = router;