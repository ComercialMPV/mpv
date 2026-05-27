// routes/loans.cjs
const express = require('express');
const router = express.Router();
const Product = require('../models/Product.cjs'); // o modelo com discriminador
const Client = require('../models/Client.cjs');
const User = require('../models/User.cjs');
const emailService = require('../services/emailService.cjs'); // serviço de email hipotético
const { auth, restrictTo } = require('../middleware/auth.cjs'); // assumindo que tens restrictTo para roles

// Middleware auxiliar para garantir que é microcrédito
const ensureMicrocredit = async (req, res, next) => {
  try {
    const loan = await Product.findOne({
      _id: req.params.id,
      company: req.user.company._id,
      category: 'Microcrédito',
      isActive: true
    });
    if (!loan) return res.status(404).json({ message: 'Microcrédito não encontrado' });
    req.loan = loan;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// ────────────────────────────────────────────────
// CRUD BÁSICO
// ────────────────────────────────────────────────

// Criar novo pedido de microcrédito
router.post('/', auth, async (req, res) => {
  try {
    const {
      // ── Identificação do cliente ──
      client,                    // ObjectId ref Client (obrigatório)
      
      // ── Dados financeiros do pedido ──
      loanAmountRequested,       // Valor solicitado (obrigatório)
      purpose,                   // Finalidade (obrigatório – texto livre)
      termMonths,                // Prazo pretendido em meses (obrigatório)
      interestRate,              // Taxa de juro proposta (% ao ano) – pode ser ajustada depois
      paymentFrequency,          // Frequência pretendida (Mensal, Quinzenal, etc.)
      gracePeriodDays,           // Dias de carência pretendidos
      
      // ── Informações complementares úteis na solicitação ──
      guaranteeType,             // Tipo de garantia oferecida
      guarantors,                // Array de avalistas (opcional)
      additionalDocuments,       // Array de strings com nomes de documentos ou URLs (opcional)
      
      // ── Campos que normalmente são preenchidos depois (análise/aprovação) ──
      // Podem vir no body, mas geralmente ficam vazios ou default aqui
      loanAmountApproved,
      installmentValue,
      creditScore,
      riskLevel,
      approvalStatus = 'Pendente',  // default
      internalNotes,
      
      // ── Campos de desembolso e acompanhamento (geralmente não vêm no POST inicial) ──
      // São ignorados ou definidos como null/0 se vierem
    } = req.body;

    // Validações mínimas obrigatórias
    if (!client) {
      return res.status(400).json({ message: 'Cliente é obrigatório (ObjectId)' });
    }
    if (!loanAmountRequested || loanAmountRequested <= 0) {
      return res.status(400).json({ message: 'Valor solicitado deve ser maior que zero' });
    }
    if (!purpose || purpose.trim().length < 5) {
      return res.status(400).json({ message: 'Finalidade do crédito é obrigatória e deve ser descritiva' });
    }
    if (!termMonths || termMonths < 1 || termMonths > 60) { // exemplo: limite razoável
      return res.status(400).json({ message: 'Prazo em meses inválido (1 a 60 meses)' });
    }
    if (interestRate === undefined || interestRate < 0) {
      return res.status(400).json({ message: 'Taxa de juro é obrigatória e não pode ser negativa' });
    }

    // Preparar o documento
    const newLoan = new Product({
      category: 'Microcrédito',
      company: req.user.company._id,
      createdBy: req.user._id,
      
      // Campos principais da solicitação
      client,
      loanAmountRequested: Number(loanAmountRequested),
      purpose: purpose.trim(),
      termMonths: Number(termMonths),
      interestRate: Number(interestRate),
      
      // Campos opcionais com defaults seguros
      paymentFrequency: paymentFrequency || 'Mensal',
      gracePeriodDays: Number(gracePeriodDays) || 0,
      guaranteeType: guaranteeType || 'Sem garantia',
      guarantors: Array.isArray(guarantors) ? guarantors : [],
      additionalDocuments: Array.isArray(additionalDocuments) ? additionalDocuments : [],
      
      // Estados iniciais
      approvalStatus: approvalStatus || 'Pendente',
      outstandingBalance: 0,              // só atualiza após desembolso
      totalPaid: 0,
      daysOverdue: 0,
      
      // Campos que normalmente são preenchidos depois
      loanAmountApproved: loanAmountApproved ? Number(loanAmountApproved) : undefined,
      installmentValue: installmentValue ? Number(installmentValue) : undefined,
      creditScore: creditScore ? Number(creditScore) : undefined,
      riskLevel: riskLevel || undefined,
      internalNotes: internalNotes ? internalNotes.trim() : '',
      
      // Timestamps automáticos já vêm do schema
    });

    // Guardar
    await newLoan.save();

    // Opcional: popular dados do cliente para resposta mais útil
    const populatedLoan = await Product.findById(newLoan._id)
      .populate('client', 'name phone balance email')
      .populate('createdBy', 'firstName lastName');

    // Opcional: disparar email de confirmação / notificação interna
    // await emailService.sendMicrocreditRequestReceived(
    //   'credito@empresa.com', 
    //   populatedLoan
    // );

    res.status(201).json({
      success: true,
      message: 'Pedido de microcrédito registado com sucesso',
      loan: populatedLoan
    });

  } catch (err) {
    console.error('Erro ao criar microcrédito:', err);
    res.status(400).json({ 
      message: 'Erro ao registar o pedido',
      error: err.message 
    });
  }
});

// Listar microcréditos (com filtros úteis)
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,           // Pendente, Aprovado, Rejeitado, etc.
      clientId,
      overdue,          // true → só em atraso
      minAmount,
      maxAmount,
      page = 1,
      limit = 20
    } = req.query;

    let query = { 
      company: req.user.company._id,
      category: 'Microcrédito',
      isActive: true 
    };

    if (status) query.approvalStatus = status;
    if (clientId) query.client = clientId;
    if (overdue === 'true') query.daysOverdue = { $gt: 0 };
    if (minAmount) query.loanAmountApproved = { $gte: Number(minAmount) };
    if (maxAmount) query.loanAmountApproved = { ...query.loanAmountApproved, $lte: Number(maxAmount) };

    const loans = await Product.find(query)
      .populate('client', 'name phone balance')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({ loans, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obter um microcrédito detalhado
router.get('/:id', auth, ensureMicrocredit, async (req, res) => {
  res.json(req.loan);
});

// Atualizar dados (pode ser usado em várias fases)
router.patch('/:id', auth, ensureMicrocredit, async (req, res) => {
  try {
    const allowedUpdates = [
      'loanAmountApproved', 'interestRate', 'termMonths', 'installmentValue',
      'gracePeriodDays', 'paymentFrequency', 'guaranteeType', 'guarantors',
      'purpose', 'internalNotes', 'creditScore', 'riskLevel'
      // NÃO permitir mudar approvalStatus aqui → usar rotas específicas
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    Object.assign(req.loan, updates);
    await req.loan.save();

    res.json(req.loan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────
// WORKFLOW / ESTADOS
// ────────────────────────────────────────────────

router.patch('/:id/analyze', auth, restrictTo('admin', 'credit-analyst'), ensureMicrocredit, async (req, res) => {
  const { creditScore, riskLevel, internalNotes } = req.body;

  req.loan.creditScore = creditScore;
  req.loan.riskLevel = riskLevel;
  req.loan.internalNotes = (req.loan.internalNotes || '') + `\nAnálise: ${internalNotes || ''}`;
  
  await req.loan.save();
  res.json({ message: 'Análise registada', loan: req.loan });
});

router.patch('/:id/approve', auth, restrictTo('admin', 'credit-manager'), ensureMicrocredit, async (req, res) => {
  try {
    if (req.loan.approvalStatus !== 'Pendente') {
      return res.status(400).json({ message: 'Estado inválido para aprovação' });
    }

    // Atualizar dados
    req.loan.approvalStatus = 'Aprovado';
    req.loan.approvedBy = req.user._id;
    req.loan.approvalDate = new Date();
    req.loan.loanAmountApproved = Number(req.body.loanAmountApproved) || req.loan.loanAmountRequested;

    // Opcional: se quiseres forçar outros campos na aprovação
    if (req.body.installmentValue) {
      req.loan.installmentValue = Number(req.body.installmentValue);
    }
    if (req.body.internalNotes) {
      req.loan.internalNotes = (req.loan.internalNotes || '') + `\nAprovado: ${req.body.internalNotes}`;
    }

    await req.loan.save();

    // Popular dados necessários para os emails
    await req.loan.populate([
      { path: 'client', select: 'name phone email' },
      { path: 'approvedBy', select: 'firstName lastName email' }
    ]);

    const client = req.loan.client;
    const approver = req.loan.approvedBy;

    // ─── Envio de emails (assíncrono para não bloquear a resposta) ───
    setImmediate(async () => {
      try {
        // 1. Email para o cliente
        if (client?.email) {
          await emailService.sendMicrocreditApprovedToClient(
            client.email,
            req.loan,
            client,
            approver
          );
          console.log(`[EMAIL] Aprovação enviada para cliente: ${client.email}`);
        } else {
          console.warn(`[EMAIL] Cliente ${client.name} sem email registado`);
        }

        // 2. Email interno para equipa de crédito (ex: email fixo ou do approver)
        const internalRecipients = [
          approver?.email || 'credito@empresa.com',
          'gerencia@empresa.com'  // adiciona mais se quiseres
        ].filter(Boolean).join(', ');

        if (internalRecipients) {
          await emailService.sendMicrocreditApprovedInternal(
            internalRecipients,
            req.loan,
            client,
            approver
          );
          console.log(`[EMAIL] Notificação interna enviada para: ${internalRecipients}`);
        }
      } catch (emailErr) {
        console.error('[EMAIL ERROR] Falha ao enviar emails de aprovação:', emailErr);
        // Não falha a aprovação por causa de email
      }
    });

    // Resposta imediata (sem esperar emails)
    res.json({
      success: true,
      message: 'Crédito aprovado com sucesso',
      loan: req.loan
    });

  } catch (err) {
    console.error('Erro ao aprovar microcrédito:', err);
    res.status(500).json({ message: 'Erro ao processar aprovação', error: err.message });
  }
});

router.patch('/:id/reject', auth, restrictTo('admin', 'credit-manager'), ensureMicrocredit, async (req, res) => {
  if (req.loan.approvalStatus !== 'Pendente') {
    return res.status(400).json({ message: 'Estado inválido para rejeição' });
  }

  req.loan.approvalStatus = 'Rejeitado';
  req.loan.internalNotes = (req.loan.internalNotes || '') + `\nRejeitado: ${req.body.reason || 'Motivo não especificado'}`;

  await req.loan.save();
  // TODO: email para cliente
  res.json({ message: 'Crédito rejeitado', loan: req.loan });
});

router.patch('/:id/disburse', auth, restrictTo('admin', 'credit-cashier'), ensureMicrocredit, async (req, res) => {
  if (req.loan.approvalStatus !== 'Aprovado') {
    return res.status(400).json({ message: 'Apenas créditos aprovados podem ser desembolso' });
  }
  if (req.loan.disbursementDate) {
    return res.status(400).json({ message: 'Já foi desembolsado' });
  }

  req.loan.disbursementDate = new Date();
  req.loan.outstandingBalance = req.loan.loanAmountApproved;
  // Calcular primeira prestação se não estiver definido
  if (!req.loan.firstPaymentDate) {
    const date = new Date();
    date.setDate(date.getDate() + req.loan.gracePeriodDays + 30); // exemplo
    req.loan.firstPaymentDate = date;
  }

  await req.loan.save();
  res.json({ message: 'Desembolso registado', loan: req.loan });
});

// ────────────────────────────────────────────────
// PAGAMENTOS / PRESTAÇÕES
// ────────────────────────────────────────────────

// Registar pagamento (prestação ou amortização extraordinária)
router.post('/:id/payments', auth, ensureMicrocredit, async (req, res) => {
  try {
    const {
      amount,
      paymentDate = new Date(),
      method = 'Cash',
      notes = '',
    } = req.body;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'O valor do pagamento deve ser maior que zero' });
    }

    if (req.loan.approvalStatus !== 'Aprovado') {
      return res.status(400).json({ message: 'Só é possível registar pagamentos em créditos aprovados' });
    }

    if (!req.loan.disbursementDate) {
      return res.status(400).json({ message: 'O crédito ainda não foi desembolsado' });
    }

    if (req.loan.outstandingBalance <= 0) {
      return res.status(400).json({ message: 'O crédito já está totalmente pago' });
    }

    const paymentAmount = Number(amount);
    if (paymentAmount > req.loan.outstandingBalance) {
      return res.status(400).json({ 
        message: `Valor excede o saldo em dívida. Máximo permitido: ${req.loan.outstandingBalance.toLocaleString()} MT` 
      });
    }

    // Registar o pagamento no histórico
    const newPayment = {
      date: new Date(paymentDate),
      amount: paymentAmount,
      method,
      notes: notes.trim(),
      receivedBy: req.user._id
    };

    // Atualizar campos do empréstimo
    req.loan.payments.push(newPayment);
    req.loan.totalPaid += paymentAmount;
    req.loan.outstandingBalance = Math.max(0, req.loan.outstandingBalance - paymentAmount);
    req.loan.lastPaymentDate = newPayment.date;
    req.loan.daysOverdue = 0; // Reset de atraso

    // Se o saldo chegar a zero → marcar como quitado (opcional)
    if (req.loan.outstandingBalance <= 0) {
      req.loan.outstandingBalance = 0;
      // Poderias adicionar um campo como: status: 'Quitado' ou algo assim
    }

    await req.loan.save();

    // Popular dados para email e resposta
    await req.loan.populate([
      { path: 'client', select: 'name phone email' },
      { path: 'payments.receivedBy', select: 'firstName lastName' }
    ]);

    const client = req.loan.client;
    const latestPayment = req.loan.payments[req.loan.payments.length - 1];

    // ─── Envio de email de confirmação (assíncrono) ───
    setImmediate(async () => {
      try {
        // Email para o cliente
        if (client?.email) {
          await emailService.sendMicrocreditPaymentReceivedToClient(
            client.email,
            req.loan,
            client,
            latestPayment,
            req.user // quem recebeu
          );
          console.log(`[PAGAMENTO] Email enviado ao cliente: ${client.email}`);
        }

        // Email interno (opcional)
        const internalEmail = 'credito@empresa.com'; // ou lista
        if (internalEmail) {
          await emailService.sendMicrocreditPaymentInternal(
            internalEmail,
            req.loan,
            client,
            latestPayment,
            req.user
          );
        }
      } catch (emailErr) {
        console.error('[EMAIL] Falha ao enviar confirmação de pagamento:', emailErr);
      }
    });

    // Resposta
    res.status(201).json({
      success: true,
      message: 'Pagamento registado com sucesso',
      payment: latestPayment,
      loan: {
        _id: req.loan._id,
        totalPaid: req.loan.totalPaid,
        outstandingBalance: req.loan.outstandingBalance,
        daysOverdue: req.loan.daysOverdue,
        lastPaymentDate: req.loan.lastPaymentDate,
        paymentsCount: req.loan.payments.length
      }
    });

  } catch (err) {
    console.error('Erro ao registar pagamento:', err);
    res.status(500).json({ 
      message: 'Erro ao processar o pagamento',
      error: err.message 
    });
  }
});

// ────────────────────────────────────────────────
// ATUALIZAÇÃO AUTOMÁTICA DE ATRASOS (pode ser chamada por cron)
// ────────────────────────────────────────────────

router.post('/update-overdue', auth, restrictTo('admin'), async (req, res) => {
  try {
    const now = new Date();

    // Buscar apenas empréstimos que precisam de verificação
    const overdueLoans = await Product.find({
      category: 'Microcrédito',
      approvalStatus: 'Aprovado',
      disbursementDate: { $exists: true, $ne: null },
      outstandingBalance: { $gt: 0 },
      firstPaymentDate: { $exists: true, $ne: null, $lt: now }
    }).populate('client', 'name phone email');

    let updatedCount = 0;
    let notifiedCount = 0;
    const notificationsSent = [];

    for (const loan of overdueLoans) {
      // ─── 1. Determinar a data esperada da próxima prestação ───
      let expectedNextPayment;

      if (loan.lastPaymentDate) {
        expectedNextPayment = new Date(loan.lastPaymentDate);
      } else {
        expectedNextPayment = new Date(loan.firstPaymentDate);
      }

      // Avançar para a próxima data esperada com base na frequência
      const frequencyDays = {
        'Diário': 1,
        'Semanal': 7,
        'Quinzenal': 15,
        'Mensal': 30,
        'Trimestral': 90
      }[loan.paymentFrequency] || 30; // fallback mensal

      // Se já passou a data esperada, avançamos até a próxima prestação teórica
      while (expectedNextPayment < now) {
        expectedNextPayment.setDate(expectedNextPayment.getDate() + frequencyDays);
      }

      // Voltar uma prestação (a que está em atraso)
      const dueDate = new Date(expectedNextPayment);
      dueDate.setDate(dueDate.getDate() - frequencyDays);

      // ─── 2. Calcular dias em atraso ───
      const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));

      // Só atualizamos se mudou ou nunca foi calculado
      if (loan.daysOverdue !== daysOverdue || !loan.lastOverdueCheck) {
        loan.daysOverdue = daysOverdue;
        loan.lastOverdueCheck = now;
        updatedCount++;
      }

      // ─── 3. Notificações por escalão de atraso ───
      const thresholds = [5, 15, 30];
      let shouldNotify = false;
      let notificationLevel = null;

      for (const threshold of thresholds) {
        const key = `${threshold}days`;
        const lastSent = loan.lastNotificationSent?.get(key);

        if (daysOverdue >= threshold && (!lastSent || (now - lastSent) > 7 * 24 * 60 * 60 * 1000)) {
          // Notificar apenas se passou 7 dias desde o último aviso desse nível
          shouldNotify = true;
          notificationLevel = threshold;
          break; // notificar apenas o nível mais crítico atual
        }
      }

      if (shouldNotify && loan.client?.email) {
        setImmediate(async () => {
          try {
            await emailService.sendMicrocreditOverdueNotification(
              loan.client.email,
              loan,
              loan.client,
              notificationLevel,
              daysOverdue
            );
            console.log(`[OVERDUE NOTIFY] Enviado para ${loan.client.name} (${notificationLevel} dias)`);

            // Atualizar última notificação
            if (!loan.lastNotificationSent) loan.lastNotificationSent = new Map();
            loan.lastNotificationSent.set(`${notificationLevel}days`, now);
            await loan.save();
          } catch (err) {
            console.error(`[OVERDUE EMAIL FAIL] ${loan._id}:`, err);
          }
        });

        notifiedCount++;
        notificationsSent.push({
          client: loan.client.name,
          level: notificationLevel,
          days: daysOverdue
        });
      }

      await loan.save();
    }

    res.json({
      success: true,
      message: 'Verificação de atrasos concluída',
      updatedLoans: updatedCount,
      notificationsSent: notifiedCount,
      details: notificationsSent.length > 0 ? notificationsSent : undefined,
      totalProcessed: overdueLoans.length,
      timestamp: now.toISOString()
    });

  } catch (err) {
    console.error('[UPDATE-OVERDUE ERROR]', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estado de atrasos',
      error: err.message
    });
  }
});

module.exports = router;