const express = require('express');
const router = express.Router();
const CommissionRule = require('../models/CommissionRule.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const CommissionTransaction = require('../models/CommissionTransaction.cjs');
const mongoose = require('mongoose');
const Product = require('../models/Product.cjs');
const Service = require('../models/Service.cjs');
const Bundle = require('../models/Bundle.cjs');
const { auth, adminOwnerAuth } = require('../middleware/auth.cjs');

/**
 * 1. Cargos da Empresa do Usuário (Lookup)
 * 
 * 
 */

/**
 * 1. Cargos da Empresa (Usado pelo frontend para popular o select)
 */
router.get('/roles', auth, async (req, res) => {
  try {
    const roles = await RolePermission.find({ 
      company: req.user.company._id,
      isActive: true 
    }).select('roleName _id');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar cargos' });
  }
});
router.get('/lookups/roles', auth, async (req, res) => {
  try {
    const roles = await RolePermission.find({ 
      company: req.user.company._id,
      isActive: true 
    }).select('roleName _id');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar cargos' });
  }
});

/**
 * 2. Itens Dinâmicos (Lookup de Produtos, Serviços ou Bundles)
 * Query Params: ?type=Product | Service | Bundle
 */
router.get('/lookups/items', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const companyId = req.user.company._id;
    let items = [];

    switch (type) {
      case 'Product':
        items = await Product.find({ company: companyId, isActive: true }).select('name basePrice');
        break;
      case 'Service':
        items = await Service.find({ company: companyId, isActive: true }).select('name basePrice');
        break;
      case 'Bundle':
        items = await Bundle.find({ company: companyId, isArchived: false })
          .select('name price type billingCycle');
        break;
      default:
        return res.status(400).json({ message: 'Tipo de item inválido' });
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar itens' });
  }
});

/**
 * 3. Listar todas as regras da empresa
 */
router.get('/rules', auth, adminOwnerAuth, async (req, res) => {
  try {
    const rules = await CommissionRule.find({ company: req.user.company._id })
      .populate('userRole', 'roleName')
      .sort({ minQuantity: 1, createdAt: -1 }); 
    
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar regras' });
  }
});

/**
 * 4. Criar nova regra (com suporte a Escalões)
 */
/**
 * 4. Criar nova regra (com suporte a Escalões + Referral Program)
 */
router.post('/rules', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { 
      name, 
      targetType: frontendTargetType,
      targetId, 
      userRole, 
      ranges, 
      period = 'monthly',
      referralProgramRule = false 
    } = req.body || {};

    // Validação inicial
    if (!name?.trim()) {
      return res.status(400).json({ message: 'O nome da regra é obrigatório' });
    }

    // ==================== CASO ESPECIAL: REGRA DE REFERRAL PROGRAM ====================
    if (referralProgramRule) {
      // Validações específicas para regras de referral
      if (!frontendTargetType) {
        return res.status(400).json({ message: 'targetType é obrigatório para regras de referral' });
      }

      const newRule = new CommissionRule({
        company: req.user.company._id,
        name: name.trim(),
        targetType: frontendTargetType,
        targetId: targetId || null,
        userRole: null,                    // Permitido apenas para referral
        referralProgramRule: true,
        period,
        ranges: ranges && Array.isArray(ranges) && ranges.length > 0 
          ? ranges.map(r => ({
              minQuantity: Number(r.minQuantity) || 0,
              maxQuantity: r.maxQuantity == null ? null : Number(r.maxQuantity),
              commissionType: r.commissionType || 'percentage',
              value: Number(r.value) || 0,
              minMonths: Number(r.minMonths) || 0
            }))
          : [{ minQuantity: 0, maxQuantity: null, commissionType: 'percentage', value: 10, minMonths: 0 }],
        isActive: true
      });

      await newRule.save();

      const populated = await newRule.populate('userRole', 'roleName'); // vai ficar null, mas evita erro

      return res.status(201).json({
        ...populated.toObject(),
        message: 'Regra de Referral Program criada com sucesso'
      });
    }

    // ==================== CASO NORMAL: REGRA PARA CARGOS INTERNOS ====================

    if (!frontendTargetType || !['Product', 'Service', 'Combo', 'General', 'Subscription'].includes(frontendTargetType)) {
      return res.status(400).json({ message: 'Tipo de alvo inválido' });
    }

    if (frontendTargetType !== 'General' && !targetId) {
      return res.status(400).json({ message: 'Selecione um item específico' });
    }

    if (!userRole) {
      return res.status(400).json({ message: 'Cargo (userRole) é obrigatório para regras normais' });
    }

    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      return res.status(400).json({ message: 'Defina pelo menos um escalão' });
    }

    // Determinar o targetType REAL (especialmente para Combo)
    let finalTargetType = frontendTargetType;
    let finalTargetId = targetId || null;

    if (frontendTargetType === 'Combo' && targetId) {
      const bundle = await Bundle.findById(targetId).lean();
      if (!bundle) {
        return res.status(400).json({ message: 'Bundle não encontrado' });
      }
      finalTargetType = bundle.type || 'Combo';
      finalTargetId = targetId;
    }

    // Formatação e validação dos ranges
    let formattedRanges;
    try {
      formattedRanges = ranges
        .map((r, index) => {
          if (!r || typeof r !== 'object') {
            throw new Error(`Escalão inválido na posição ${index}`);
          }

          const minQty = Number(r.minQuantity);
          if (isNaN(minQty) || minQty < 0) {
            throw new Error(`minQuantity inválido no escalão ${index}`);
          }

          const maxQty = r.maxQuantity == null || r.maxQuantity === '' 
            ? null 
            : Number(r.maxQuantity);

          if (maxQty !== null && (isNaN(maxQty) || maxQty < minQty)) {
            throw new Error(`maxQuantity inválido no escalão ${index}`);
          }

          return {
            minQuantity: minQty,
            maxQuantity: maxQty,
            commissionType: r.commissionType === 'fixed' ? 'fixed' : 'percentage',
            value: Number(r.value) || 0,
            minMonths: Number(r.minMonths) || 0
          };
        })
        .sort((a, b) => a.minQuantity - b.minQuantity);

      // Verificação simples de sobreposição
      for (let i = 1; i < formattedRanges.length; i++) {
        if (formattedRanges[i].minQuantity <= (formattedRanges[i-1].maxQuantity ?? Infinity)) {
          console.warn(`[WARNING] Possível sobreposição entre escalões ${i-1} e ${i}`);
        }
      }
    } catch (rangeErr) {
      return res.status(400).json({ 
        message: 'Erro na validação dos escalões: ' + rangeErr.message 
      });
    }

    // Criação da regra normal
    const newRule = new CommissionRule({
      company: req.user.company._id,
      name: name.trim(),
      targetType: finalTargetType,
      targetId: finalTargetId,
      userRole,                    // ← Aqui é obrigatório
      period,
      ranges: formattedRanges,
      referralProgramRule: false,
      isActive: true
    });

    await newRule.save();

    const populated = await CommissionRule.findById(newRule._id)
      .populate('userRole', 'roleName');

    res.status(201).json(populated);

  } catch (err) {
    console.error('[POST /rules] Erro ao criar regra:', err);
    
    const userMessage = err.name === 'ValidationError' 
      ? 'Dados inválidos: ' + Object.values(err.errors || {})[0]?.message
      : err.message || 'Erro interno ao criar a regra de comissão';

    res.status(400).json({ 
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
/**
 * 6. Atualizar regra (Suporte a RANGES)
 */
/**
 * 6. Atualizar regra (Suporte completo a Referral Program + Escalões)
 */
router.put('/rules/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { 
      name, 
      targetType, 
      targetId, 
      userRole, 
      ranges, 
      isActive,
      referralProgramRule   // ← Novo campo que pode vir do frontend
    } = req.body;

    // 1. Buscar a regra existente para saber se é de referral
    const existingRule = await CommissionRule.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!existingRule) {
      return res.status(404).json({ message: 'Regra não encontrada ou sem permissão' });
    }

    const isReferralRule = existingRule.referralProgramRule || referralProgramRule === true;

    // 2. Preparar dados de atualização
    const updateData = {
      name: name?.trim(),
      targetType,
      targetId: targetId || null,
      isActive: isActive !== undefined ? isActive : existingRule.isActive,
    };

    // Para regras de Referral: permitir userRole = null
    if (isReferralRule) {
      updateData.userRole = null;
      updateData.referralProgramRule = true;
    } else {
      // Para regras normais: userRole é obrigatório
      if (userRole) {
        updateData.userRole = userRole;
      }
      // Se não enviou userRole mas a regra antiga não era referral, mantemos o antigo
      else if (!existingRule.referralProgramRule) {
        updateData.userRole = existingRule.userRole;
      }
    }

    // 3. Processar ranges (se enviados)
    if (ranges && Array.isArray(ranges) && ranges.length > 0) {
      const formattedRanges = ranges.map(r => ({
        minQuantity: Number(r.minQuantity) || 0,
        maxQuantity: (r.maxQuantity === '' || r.maxQuantity === null || r.maxQuantity === undefined) 
          ? null 
          : Number(r.maxQuantity),
        commissionType: r.commissionType || 'percentage',
        value: Number(r.value) || 0,
        minMonths: Number(r.minMonths) || 0
      })).sort((a, b) => a.minQuantity - b.minQuantity);

      // Verificação simples de sobreposição
      for (let i = 1; i < formattedRanges.length; i++) {
        const prevMax = formattedRanges[i-1].maxQuantity;
        if (prevMax !== null && formattedRanges[i].minQuantity <= prevMax) {
          console.warn(`[WARNING] Possível sobreposição entre escalões ${i-1} e ${i}`);
        }
      }

      updateData.ranges = formattedRanges;
    }

    // 4. Atualizar no banco
    const updatedRule = await CommissionRule.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedRule) {
      return res.status(404).json({ message: 'Regra não encontrada ou sem permissão' });
    }

    // 5. Popular userRole (mesmo que seja null)
    const populated = await updatedRule.populate('userRole', 'roleName');

    res.json({
      message: 'Regra atualizada com sucesso',
      rule: populated || updatedRule
    });

  } catch (err) {
    console.error('[PUT /rules/:id] Erro ao atualizar regra:', err);
    
    let userMessage = 'Erro ao atualizar a regra';

    if (err.name === 'ValidationError') {
      userMessage = 'Dados inválidos: ' + 
        (Object.values(err.errors || {})[0]?.message || err.message);
    } else if (err.message) {
      userMessage = err.message;
    }

    res.status(400).json({ 
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * 5. Obter detalhes de uma regra
 */
router.get('/rules/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    const rule = await CommissionRule.findOne({
      _id: req.params.id,
      company: req.user.company._id
    }).populate('userRole');

    if (!rule) return res.status(404).json({ message: 'Regra não encontrada' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar regra' });
  }
});



/**
 * 7. Eliminar regra (Seguro)
 */
router.delete('/rules/:id', auth, adminOwnerAuth, async (req, res) => {
  try {
    const rule = await CommissionRule.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!rule) return res.status(404).json({ message: 'Regra não encontrada' });
    
    res.json({ message: 'Regra eliminada com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao eliminar regra' });
  }
});

// GET /commissions/my-pending
// Visão do utilizador logado: comissões pendentes (e totais recentes)
// GET /commissions/my-pending
// Visão do utilizador logado: comissões pendentes + cálculo retroativo por ranges
router.get('/my-pending', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company._id;

    // Parâmetros de paginação e filtro
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const status = req.query.status || 'pending';
    const periodStart = req.query.periodStart ? new Date(req.query.periodStart) : null;

    const match = {
      user: userId,
      company: companyId,
      status: status === 'all' ? { $in: ['pending', 'approved', 'paid'] } : status
    };

    if (periodStart) {
      match.createdAt = { $gte: periodStart };
    }

    // 1. Contagem total para paginação
    const totalCountPromise = CommissionTransaction.countDocuments(match);

    // 2. Lista paginada de transações (campos essenciais)
    const pendingPromise = CommissionTransaction.find(match)
      .select(
        'sale commissionAmount baseAmount tierApplied appliedRule createdAt status ' +
        'quantityContributed cumulativeQuantity periodStart periodEnd'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sale', 'total createdAt')
      .populate('appliedRule', 'name targetType targetId ranges')  // traz ranges para recalcular
      .lean();

    // 3. Resumo simples por status
    const summaryPromise = CommissionTransaction.aggregate([
      { $match: { user: userId, company: companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSaved: { $sum: '$commissionAmount' }  // comissão salva originalmente
        }
      },
      { $match: { _id: { $in: ['pending', 'approved', 'paid'] } } }
    ]);

    // 4. Cálculo retroativo: comissão correta por regra (tiered)
    const retroactivePromise = CommissionTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$appliedRule',
          totalQty: { $sum: '$quantityContributed' },
          totalBase: { $sum: '$baseAmount' },
          savedCommission: { $sum: '$commissionAmount' },
          transactions: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'commissionrules',
          localField: '_id',
          foreignField: '_id',
          as: 'rule'
        }
      },
      { $unwind: '$rule' },
      {
        $project: {
          ruleName: '$rule.name',
          targetType: '$rule.targetType',
          totalQty: 1,
          totalBase: 1,
          savedCommission: 1,
          correctCommission: {
            $let: {
              vars: {
                sortedRanges: { $sortArray: { input: '$rule.ranges', sortBy: { minQuantity: 1 } } }
              },
              in: {
                $reduce: {
                  input: '$$sortedRanges',
                  initialValue: { remainingQty: '$totalQty', commission: 0 },
                  in: {
                    remainingQty: {
                      $cond: [
                        { $gt: ['$$value.remainingQty', 0] },
                        {
                          $max: [
                            0,
                            {
                              $subtract: [
                                '$$value.remainingQty',
                                {
                                  $cond: [
                                    { $lte: ['$$this.maxQuantity', '$$value.remainingQty'] },
                                    { $subtract: ['$$this.maxQuantity', '$$this.minQuantity'] },
                                    { $subtract: ['$$value.remainingQty', '$$this.minQuantity'] }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        0
                      ]
                    },
                    commission: {
                      $add: [
                        '$$value.commission',
                        {
                          $cond: [
                            { $gte: ['$$value.remainingQty', '$$this.minQuantity'] },
                            {
                              $multiply: [
                                {
                                  $min: [
                                    '$$value.remainingQty',
                                    { $cond: [{ $eq: ['$$this.maxQuantity', null] }, '$$value.remainingQty', '$$this.maxQuantity'] }
                                  ]
                                },
                                {
                                  $cond: [
                                    { $eq: ['$$this.commissionType', 'percentage'] },
                                    { $multiply: ['$totalBase', { $divide: ['$$this.value', 100] }] },
                                    '$$this.value'
                                  ]
                                }
                              ]
                            },
                            0
                          ]
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    const [pending, summaryRaw, retroactive, totalCount] = await Promise.all([
      pendingPromise,
      summaryPromise,
      retroactivePromise,
      totalCountPromise
    ]);

    const summary = summaryRaw.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, totalSaved: curr.totalSaved };
      return acc;
    }, {});

    res.json({
      pendingTransactions: pending,
      summary,
      retroactiveCalculation: retroactive,  // comissão correta vs salva
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: skip + limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('[my-pending]', err);
    res.status(500).json({ message: 'Erro ao listar comissões pendentes' });
  }
});

// GET /commissions/admin-summary
router.get('/admin-summary', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { 
      userId, 
      periodStart, 
      periodEnd, 
      status = 'all', 
      ruleId,           // novo: filtro por regra específica
      page = 1, 
      limit = 20 
    } = req.query;

    const companyId = req.user.company._id;

    // Filtro base
    const match = { company: companyId };

    if (userId) match.user = new mongoose.Types.ObjectId(userId);
    if (status !== 'all') match.status = status;
    if (periodStart) match.periodStart = { $gte: new Date(periodStart) };
    if (periodEnd) match.periodEnd = { $lte: new Date(periodEnd) };
    if (ruleId) match.appliedRule = new mongoose.Types.ObjectId(ruleId);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. Total de transações (paginação)
    const totalPromise = CommissionTransaction.countDocuments(match);

    // 2. Lista paginada de transações individuais
    const transactionsPromise = CommissionTransaction.find(match)
      .select('user sale commissionAmount baseAmount status createdAt appliedRule periodStart periodEnd quantityContributed cumulativeQuantity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName email')
      .populate('sale', 'total createdAt items customer.name')
      .populate('appliedRule', 'name targetType targetId')
      .lean();

    // 3. Resumo global da empresa (totais por status)
    const globalSummaryPromise = CommissionTransaction.aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$commissionAmount' }
        }
      },
      { $match: { _id: { $in: ['pending', 'approved', 'paid'] } } }
    ]);

    // 4. Resumo por utilizador (top 20 com mais comissão)
    const byUserPromise = CommissionTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$user',
          totalCommission: { $sum: '$commissionAmount' },
          totalQty: { $sum: '$quantityContributed' },
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          user: {
            _id: '$_id',
            name: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
            email: '$userInfo.email'
          },
          totalCommission: 1,
          totalQty: 1,
          count: 1,
          pending: 1,
          approved: 1
        }
      },
      { $sort: { totalCommission: -1 } },
      { $limit: 20 }
    ]);

    // 5. Resumo por regra (para ver quais regras geram mais comissão)
    const byRulePromise = CommissionTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$appliedRule',
          totalCommission: { $sum: '$commissionAmount' },
          totalQty: { $sum: '$quantityContributed' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'commissionrules',
          localField: '_id',
          foreignField: '_id',
          as: 'ruleInfo'
        }
      },
      { $unwind: { path: '$ruleInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          rule: {
            _id: '$_id',
            name: '$ruleInfo.name',
            targetType: '$ruleInfo.targetType',
            targetId: '$ruleInfo.targetId'
          },
          totalCommission: 1,
          totalQty: 1,
          count: 1
        }
      },
      { $sort: { totalCommission: -1 } },
      { $limit: 10 }
    ]);

    const [transactions, globalSummaryRaw, byUser, byRule, total] = await Promise.all([
      transactionsPromise,
      globalSummaryPromise,
      byUserPromise,
      byRulePromise,
      totalPromise
    ]);

    const globalSummary = globalSummaryRaw.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, total: curr.total };
      return acc;
    }, {});

    res.json({
      transactions,                  // lista paginada
      globalSummary,                 // totais da empresa por status
      topUsers: byUser,              // top 20 utilizadores
      topRules: byRule,              // top 10 regras mais rentáveis
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error('[admin-summary]', err);
    res.status(500).json({ message: 'Erro ao obter resumo de comissões' });
  }
});

/**
 * 8. Batch update de comissões (approve / pay / reject)
 * POST /api/commissions/batch-update
 */
router.post('/batch-update', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { ids, action, approvedBy, notes } = req.body || {};

    // Validações claras
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        message: 'É obrigatório enviar um array de ids (pelo menos 1)' 
      });
    }

    if (!['approve', 'pay', 'reject'].includes(action)) {
      return res.status(400).json({ 
        message: 'Action inválida. Valores permitidos: approve, pay, reject' 
      });
    }

    const companyId = req.user.company._id;
    const now = new Date();

    let updateFields = {};
    let statusFilter = { status: 'pending' };

    switch (action) {
      case 'approve':
        updateFields = {
          status: 'approved',
          approvedAt: now,
          approvedBy: approvedBy || req.user._id,
          ...(notes && { notes })
        };
        break;

      case 'pay':
        updateFields = {
          status: 'paid',
          paidAt: now,
          paidBy: req.user._id,
          ...(notes && { notes })
        };
        statusFilter = { status: { $in: ['pending', 'approved'] } };
        break;

      case 'reject':
        updateFields = {
          status: 'rejected',
          rejectedAt: now,
          rejectedBy: req.user._id,
          rejectionReason: notes || 'Rejeitado via dashboard'
        };
        break;
    }

    // Converte ids para ObjectId (muito importante!)
    const objectIds = ids.map(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID inválido: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    const result = await CommissionTransaction.updateMany(
      {
        _id: { $in: objectIds },
        company: companyId,
        ...statusFilter
      },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        message: 'Nenhuma transação encontrada ou não tem permissão para alterar (verifique se estão "pending" ou "approved" para pay)' 
      });
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} transação(ões) ${action === 'approve' ? 'aprovada(s)' : action === 'pay' ? 'marcada(s) como paga(s)' : 'rejeitada(s)'}`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });

  } catch (err) {
    console.error('[batch-update commissions] ERRO:', err);

    let message = 'Erro ao processar atualização em lote';

    if (err.message.includes('ID inválido')) {
      message = err.message;
    } else if (err.name === 'ValidationError') {
      message = 'Dados inválidos: ' + Object.values(err.errors).map(e => e.message).join(', ');
    }

    res.status(500).json({ message });
  }
});

// GET /commissions/:id
// Detalhe de uma transação específica (útil para auditoria)
// Detalhe de uma transação específica (útil para auditoria)
router.get('/:id', auth, async (req, res) => {
  try {
    const tx = await CommissionTransaction.findOne({
      _id: req.params.id,
      company: req.user.company._id
    })
      .select(
        '-__v -updatedAt' // remover campos desnecessários
      )
      .populate('user', 'firstName lastName email')
      .populate('sale', 'total createdAt items customer.name customer.phone')
      .populate('appliedRule', 'name ranges targetType targetId')
      .lean();

    if (!tx) return res.status(404).json({ message: 'Não encontrada' });

    const isOwner = String(tx.user) === String(req.user._id);
    const isAdmin = ['admin', 'owner'].includes(req.user.role?.roleName);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;