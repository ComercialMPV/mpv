// routes/referrals.cjs
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/User.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const ReferralPartner = require('../models/ReferralPartner.cjs');
const ReferralCommission = require('../models/ReferralCommission.cjs');
const ReferralPaymentRequest = require('../models/ReferralPaymentRequest.cjs');
const Client = require('../models/Client.cjs');
const { auth, referralPartnerAuth } = require('../middleware/auth.cjs');
const Company = require('../models/Company.cjs');
const emailService = require('../utils/emailService.cjs');

const registerLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Demasiadas tentativas. Tente novamente mais tarde.'
});

// Função auxiliar para gerar código único
const generateReferralCode = async () => {
  let code;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    code = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    exists = await ReferralPartner.findOne({ referralCode: code });
    attempts++;
  }

  if (exists) {
    code = 'REF-' + Date.now().toString(36).toUpperCase(); // fallback
  }
  return code;
};

// POST /api/referrals/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, birthYear, password } = req.body;

    // Validação dos campos obrigatórios
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim() || !birthYear) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Validação da password (agora enviada pelo utilizador)
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'A palavra-passe deve ter no mínimo 8 caracteres' });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: 'A palavra-passe é demasiado longa (máx. 128 caracteres)' });
    }

    if (birthYear < 1900 || birthYear > new Date().getFullYear()) {
      return res.status(400).json({ message: 'Ano de nascimento inválido' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Este email já está registado' });
    }

    // ================== EMPRESA DUMMY ==================
    let dummyCompany = await Company.findOne({ name: "MPV Referral Network" });

    if (!dummyCompany) {
      dummyCompany = new Company({
        name: "MPV Referral Network",
        email: "referral@meupontodevenda.com",
        phone: "+258 800 000 000",
        currency: "MZN",
        taxRate: 0,
        paymentTerms: "Immediate",
        referralProgramEnabled: true,
        referralCommissionRate: 10,
        referralCommissionPeriod: "lifetime"
      });
      await dummyCompany.save();
      console.log("✅ Empresa Dummy 'MPV Referral Network' criada automaticamente");
    }
    // ===================================================

    const referralRole = await RolePermission.findOne({ roleName: 'referralPartner' });
    if (!referralRole) {
      return res.status(500).json({ message: 'Role "referralPartner" não configurado' });
    }

    // Gerar código de verificação (email)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Gerar referralCode
    const referralCode = await generateReferralCode();

    // Criar utilizador com a password enviada pelo frontend
    const newUser = new User({
      email: normalizedEmail,
      password: password,                    // ← AGORA USA A PASSWORD DO UTILIZADOR
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      role: referralRole._id,
      company: dummyCompany._id,
      isVerified: false,
      isActive: true,
      verificationTokenHash,
      verificationTokenExpires
    });

    await newUser.save();

    // Criar ReferralPartner
    const referralPartner = new ReferralPartner({
      user: newUser._id,
      company: dummyCompany._id,
      birthYear: parseInt(birthYear),
      referralCode,
      totalReferred: 0,
      activeReferred: 0,
      totalEarned: 0
    });

    await referralPartner.save();

    // Enviar email de verificação
    try {
      await emailService.sendVerificationEmail(
        normalizedEmail,
        firstName,
        verificationCode
      );
    } catch (emailErr) {
      console.error('Erro ao enviar email de verificação:', emailErr);
    }

    res.status(201).json({
      message: 'Registo efetuado com sucesso! Verifique o seu email para ativar a conta.',
      email: normalizedEmail,
      referralCode
    });

  } catch (err) {
    console.error('Register referral partner error:', err);
    res.status(500).json({ message: 'Erro ao registar parceiro de recomendação' });
  }
});
// POST /api/referrals/recommend-client
router.post('/recommend-client', auth, referralPartnerAuth, async (req, res) => {
  try {
    const { companyId, customerName, customerPhone, customerEmail } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'É obrigatório selecionar uma empresa' });
    }
    if (!customerName?.trim() || !customerPhone?.trim()) {
      return res.status(400).json({ message: 'Nome e telefone do cliente são obrigatórios' });
    }

    // 1. Verificar se a empresa existe e permite recomendações
    const targetCompany = await Company.findById(companyId).select('name referralProgramEnabled');
    if (!targetCompany) {
      return res.status(404).json({ message: 'Empresa selecionada não encontrada' });
    }
    if (!targetCompany.referralProgramEnabled) {
      return res.status(400).json({ message: 'Esta empresa não permite recomendações de parceiros externos no momento.' });
    }

    // 2. Verificar parceiro
    const partnerDoc = await ReferralPartner.findOne({ user: req.user._id });
    if (!partnerDoc) {
      return res.status(404).json({ message: 'Parceiro não encontrado' });
    }

    // 3. Verificar se cliente já existe na empresa alvo
    const existingClient = await Client.findOne({
      company: companyId,
      $or: [
        { phone: customerPhone.trim() },
        ...(customerEmail?.trim() ? [{ email: customerEmail.trim().toLowerCase() }] : [])
      ]
    });

    if (existingClient) {
      return res.status(409).json({ 
        message: 'Este cliente já existe nesta empresa.',
        clientId: existingClient._id 
      });
    }

    // 4. Criar cliente FORÇANDO a empresa selecionada
    const newClient = new Client({
      company: companyId,                    // ← FORÇADO aqui (mais importante)
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail ? customerEmail.trim().toLowerCase() : undefined,
      
      origin: 'Referral',
      createdBy: req.user._id,
      referredBy: req.user._id,
      referredByPartner: partnerDoc._id,
      
      isActive: true
    });

    await newClient.save();

    // Atualizar contador do parceiro
    partnerDoc.totalReferred = (partnerDoc.totalReferred || 0) + 1;
    await partnerDoc.save();

    console.log(`[REFERRAL SUCCESS] Cliente criado na empresa ${companyId} por parceiro ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Cliente recomendado com sucesso!',
      client: {
        _id: newClient._id,
        name: newClient.name,
        phone: newClient.phone,
        company: newClient.company
      }
    });

  } catch (err) {
    console.error('[recommend-client] Erro completo:', err);
    res.status(500).json({ 
      message: 'Erro interno ao recomendar cliente',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/referrals/dashboard
router.get('/dashboard', auth, referralPartnerAuth, async (req, res) => {
  try {
    const partner = await ReferralPartner.findOne({ user: req.user._id });
    if (!partner) return res.status(404).json({ message: 'Parceiro não encontrado' });

    const stats = await ReferralCommission.aggregate([
      { $match: { referralPartner: partner._id } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0] } }
        }
      }
    ]);

    const s = stats[0] || { totalCommission: 0, pending: 0, approved: 0, paid: 0 };

    res.json({
      referralCode: partner.referralCode,
      totalReferred: partner.totalReferred || 0,
      totalEarned: s.totalCommission,
      pendingAmount: s.pending,
      approvedAmount: s.approved,
      paidAmount: s.paid
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao carregar dashboard' });
  }
});

// GET /api/referrals/my-referrals
router.get('/my-referrals', auth, referralPartnerAuth, async (req, res) => {
  try {
    const partner = await ReferralPartner.findOne({ user: req.user._id });
    if (!partner) return res.status(404).json({ message: 'Parceiro não encontrado' });

    const clients = await Client.find({ 
      referredByPartner: partner._id 
    })
    .select('name phone createdAt')
    .sort({ createdAt: -1 });

    const commissionsByClient = await ReferralCommission.aggregate([
      { $match: { referralPartner: partner._id } },
      {
        $group: {
          _id: '$referredClient',
          totalCommission: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      referralCode: partner.referralCode,
      totalReferred: clients.length,
      clients: clients.map(client => {
        const comm = commissionsByClient.find(c => String(c._id) === String(client._id));
        return {
          ...client.toObject(),
          totalCommission: comm ? comm.totalCommission : 0,
          salesCount: comm ? comm.count : 0
        };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao carregar clientes recomendados' });
  }
});

// GET /api/referrals/my-earnings
router.get('/my-earnings', auth, referralPartnerAuth, async (req, res) => {
  try {
    const partner = await ReferralPartner.findOne({ user: req.user._id });
    if (!partner) return res.status(404).json({ message: 'Parceiro não encontrado' });

    const commissions = await ReferralCommission.find({
      referralPartner: partner._id
    })
      .populate('sale', 'total createdAt _id')
      .populate('referredClient', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    const summary = await ReferralCommission.aggregate([
      { $match: { referralPartner: partner._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$commissionAmount' }
        }
      }
    ]);

    const totals = { pending: 0, approved: 0, paid: 0 };
    summary.forEach(s => { totals[s._id] = s.total; });

    res.json({
      totalEarned: partner.totalEarned || 0,
      pendingAmount: totals.pending,
      approvedAmount: totals.approved,
      paidAmount: totals.paid,
      commissions: commissions.map(c => ({
        _id: c._id,
        saleId: c.sale?._id,
        customerName: c.referredClient?.name,
        customerPhone: c.referredClient?.phone,
        commissionAmount: c.commissionAmount,
        commissionRate: c.commissionRate,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao carregar ganhos' });
  }
});

// POST /api/referrals/request-payment
router.post('/request-payment', auth, referralPartnerAuth, async (req, res) => {
  try {
    const { 
      companyId, 
      requestedAmount, 
      paymentMethod, 
      phoneNumber, 
      nibOrIban, 
      accountHolder, 
      bankName, 
      notes 
    } = req.body;

    console.log('[REQUEST-PAYMENT] Payload recebido:', req.body);

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: 'ID de empresa inválido' });
    }

    if (!requestedAmount || Number(requestedAmount) <= 0) {
      return res.status(400).json({ message: 'Valor solicitado deve ser maior que zero' });
    }

    if (!paymentMethod || !['mpesa', 'emola', 'mkesh', 'bank'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Método de pagamento inválido' });
    }

    const partnerDoc = await ReferralPartner.findOne({ user: req.user._id });
    if (!partnerDoc) {
      return res.status(404).json({ message: 'Parceiro não encontrado' });
    }

    const targetCompany = await Company.findById(companyId);
    if (!targetCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }
    if (!targetCompany.referralProgramEnabled) {
      return res.status(400).json({ message: 'Esta empresa não permite recomendações de parceiros' });
    }

    // Verificar saldo pendente real
    const pendingTotalResult = await ReferralCommission.aggregate([
      { 
        $match: { 
          referralPartner: partnerDoc._id,
          company: companyId,
          status: 'pending' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    const availableAmount = pendingTotalResult[0]?.total || 0;

    if (Number(requestedAmount) > availableAmount) {
      return res.status(400).json({ 
        message: `Valor máximo disponível para solicitação: ${availableAmount.toLocaleString('pt-MZ')} MT` 
      });
    }

    // Criar pedido
    const paymentRequest = new ReferralPaymentRequest({
      company: companyId,
      referralPartner: partnerDoc._id,
      requestedAmount: Number(requestedAmount),
      paymentMethod,
      phoneNumber: phoneNumber?.trim() || null,
      nibOrIban: nibOrIban?.trim() || null,
      accountHolder: accountHolder?.trim() || null,
      bankName: bankName?.trim() || null,
      notes: notes?.trim() || null,
      status: 'pending'
    });

    await paymentRequest.save();

    console.log(`[REQUEST-PAYMENT SUCCESS] Pedido criado: ${paymentRequest._id} | Valor: ${requestedAmount} MT`);

    res.status(201).json({
      success: true,
      message: 'Pedido de pagamento enviado com sucesso! A empresa será notificada.',
      requestId: paymentRequest._id
    });

  } catch (err) {
    console.error('[request-payment] ERRO COMPLETO:', err);
    res.status(500).json({ 
      message: 'Erro interno ao processar pedido de pagamento',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;