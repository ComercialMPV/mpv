const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal.cjs');
const GoalDistribution = require('../models/GoalDistribution.cjs');
const User = require('../models/User.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const Product = require('../models/Product.cjs');
const Service = require('../models/Service.cjs');
const Bundle = require('../models/Bundle.cjs');
const Sale = require('../models/Sale.cjs');
const { auth } = require('../middleware/auth.cjs');

const PERIOD_MULTIPLIERS = {
  monthly: 1,
  quarterly: 3,
  semester: 6,
  annual: 12
};

// ===== GOALS CRUD =====

const workspaceAuth = require('../middleware/workspace.cjs');

// GET all goals for company
router.get('/', auth, workspaceAuth, async (req, res) => {
  try {
    const { year, status } = req.query;
    const filter = { company: req.workspaceCompanyId || req.user.company._id };
    if (year) filter.year = parseInt(year, 10);
    if (status) filter.status = status;

    const goals = await Goal.find(filter).sort({ year: -1, createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single goal by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new goal
router.post('/', auth, async (req, res) => {
  try {
    const {
      period,
      startDate,
      endDate,
      financialTarget,
      year,
      annualTarget: reqAnnual,
      monthlyTarget: reqMonthly,
      semesterTarget: reqSemester,
      quarterlyTarget: reqQuarterly,
      achievementStrategy,
      contingencyMargin,
      breakdown,
      status,
      notes,
    } = req.body;

    // requisitos mínimos
    if (!period || !year || financialTarget === undefined || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: 'period, year, financialTarget and date range are required' });
    }

    // valida period e intervalo
    const periodDivisors = { monthly: 12, quarterly: 4, semester: 2, annual: 1 };
    const periodMaxDays = { monthly: 31, quarterly: 122, semester: 183, annual: 365 };
    if (!periodDivisors[period]) {
      return res.status(400).json({ message: 'invalid period value' });
    }
    const sd = new Date(startDate);
    const ed = new Date(endDate);
    const days = Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24));
    if (days > periodMaxDays[period]) {
      return res
        .status(400)
        .json({ message: `date range exceeds maximum days for ${period}` });
    }

    const annualTarget = reqAnnual !== undefined
      ? reqAnnual
      : financialTarget * periodDivisors[period];
    const monthlyTarget = reqMonthly !== undefined
      ? reqMonthly
      : annualTarget / 12;
    const semesterTarget = reqSemester !== undefined
      ? reqSemester
      : annualTarget / 2;
    const quarterlyTarget = reqQuarterly !== undefined
      ? reqQuarterly
      : annualTarget / 4;

    const goal = new Goal({
      company: req.user.company._id,
      createdBy: req.user._id,
      period,
      startDate: sd,
      endDate: ed,
      financialTarget,
      year,
      annualTarget,
      monthlyTarget,
      quarterlyTarget,
      semesterTarget,
      achievementStrategy: achievementStrategy || 'mixed',
      contingencyMargin: contingencyMargin !== undefined ? contingencyMargin : 0.1,
      breakdown: breakdown || [],
      status: status || 'draft',
      notes,
    });

    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update goal
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      period,
      startDate,
      endDate,
      financialTarget,
      year,
      annualTarget,
      monthlyTarget,
      semesterTarget,
      quarterlyTarget,
      achievementStrategy,
      contingencyMargin,
      breakdown,
      status,
      notes,
    } = req.body;

    const goal = await Goal.findOne({
      _id: req.params.id,
      company: req.user.company._id,
    });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    if (period) goal.period = period;
    if (startDate) goal.startDate = new Date(startDate);
    if (endDate) goal.endDate = new Date(endDate);
    if (financialTarget !== undefined) goal.financialTarget = financialTarget;
    if (year !== undefined) goal.year = year;

    // recalcular metas derivadas caso base ou período tenham sido alterados
    const periodDivisors = { monthly: 12, quarterly: 4, semester: 2, annual: 1 };
    const divisor = periodDivisors[goal.period] || 1;

    if (annualTarget !== undefined) goal.annualTarget = annualTarget;
    else if (goal.financialTarget !== undefined)
      goal.annualTarget = goal.financialTarget * divisor;

    if (monthlyTarget !== undefined) goal.monthlyTarget = monthlyTarget;
    else goal.monthlyTarget = goal.annualTarget / 12;
    if (quarterlyTarget !== undefined) goal.quarterlyTarget = quarterlyTarget;
    else goal.quarterlyTarget = goal.annualTarget / 4;

    if (semesterTarget !== undefined) goal.semesterTarget = semesterTarget;
    else goal.semesterTarget = goal.annualTarget / 2;

    if (achievementStrategy) goal.achievementStrategy = achievementStrategy;
    if (contingencyMargin !== undefined)
      goal.contingencyMargin = contingencyMargin;
    if (breakdown) goal.breakdown = breakdown;
    if (status) goal.status = status;
    if (notes !== undefined) goal.notes = notes;

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== GOAL DISTRIBUTIONS CRUD =====

// GET distributions for a goal
router.get('/:goalId/distributions', auth, async (req, res) => {
  try {
    // 1. Validar se a meta pertence à empresa do utilizador
    const goal = await Goal.findOne({ 
      _id: req.params.goalId, 
      company: req.user.company._id 
    });
    
    if (!goal) return res.status(404).json({ message: 'Meta não encontrada' });

    // 2. Buscar distribuições com populações encadeadas (Deep Populate)
    // Populamos o utilizador e, dentro dele, o seu role
    const distributions = await GoalDistribution.find({ goal: goal._id })
      .populate({
        path: 'assignedUser',
        select: 'firstName lastName email',
      })
      .populate({
        path: 'role',
        select: 'roleName', // Garante que o nome do cargo (admin, partner, etc) seja retornado
      })
      .sort({ createdAt: -1 }); // Ajustado para ordenar por criação, mais útil que role

    res.json(distributions);
  } catch (error) {
    console.error('[GoalDistribution Error]:', error);
    res.status(500).json({ message: 'Erro ao carregar distribuições da meta' });
  }
});

// POST create distribution for a role or user
router.post('/:goalId/distributions', auth, async (req, res) => {
  try {
    const { role, assignedUser, annualTarget, monthlyBreakdown, itemTypeTargets } = req.body;

    // 1. Validar se a meta pertence à empresa do utilizador
    const goal = await Goal.findOne({ _id: req.params.goalId, company: req.user.company._id });
    if (!goal) {
      return res.status(404).json({ message: 'Meta não encontrada ou não pertence a esta empresa' });
    }

    // 2. Validação de Segurança: Verificar se o User atribuído existe na mesma empresa
    if (assignedUser) {
      const userExists = await User.findOne({ _id: assignedUser, company: req.user.company._id });
      if (!userExists) {
        return res.status(400).json({ message: 'Utilizador não encontrado ou não pertence a esta empresa' });
      }
    }

    // 3. Validação de Role: Garantir que o ID do role enviado é válido e pertence à empresa
    let roleExists = null;
    if (role) {
      roleExists = await RolePermission.findOne({ _id: role, company: req.user.company._id });
      if (!roleExists) {
        return res.status(400).json({ message: 'Cargo (Role) inválido ou não pertence à empresa' });
      }
    }

    // 4. Criação da distribuição
    const distribution = new GoalDistribution({
      company: req.user.company._id,
      goal: goal._id,
      role: roleExists ? roleExists._id : null, // Garante que o role é válido
      assignedUser: assignedUser || null,
      annualTarget: Number(annualTarget) || 0,
      monthlyBreakdown: monthlyBreakdown || [],
      itemTypeTargets: itemTypeTargets || [],
    });

    await distribution.save();

    res.status(201).json(distribution);
  } catch (error) {
    console.error('[Create Distribution Error]:', error);
    res.status(500).json({ message: 'Erro interno ao criar distribuição de meta', error: error.message });
  }
});

// PUT update distribution
router.put('/:goalId/distributions/:distId', auth, async (req, res) => {
  try {
    const { annualTarget, monthlyBreakdown, itemTypeTargets, role, assignedUser } = req.body;

    // 1. Buscar a distribuição e validar se pertence à empresa do utilizador
    const distribution = await GoalDistribution.findOne({ _id: req.params.distId, company: req.user.company._id });
    if (!distribution) return res.status(404).json({ message: 'Distribuição não encontrada' });

    // 2. Validação de Role: Garantir que o ID do role enviado é válido e pertence à empresa
    if (role) {
      const roleExists = await RolePermission.findOne({ _id: role, company: req.user.company._id });
      if (!roleExists) {
        return res.status(400).json({ message: 'Cargo (Role) inválido ou não pertence à empresa' });
      }
      distribution.role = role; // Atualizar o role
    }

    // 3. Validação de Segurança: Verificar se o User atribuído existe na mesma empresa
    if (assignedUser) {
      const userExists = await User.findOne({ _id: assignedUser, company: req.user.company._id });
      if (!userExists) {
        return res.status(400).json({ message: 'Utilizador não encontrado ou não pertence à empresa' });
      }
      distribution.assignedUser = assignedUser; // Atualizar o utilizador atribuído
    }

    // 4. Atualizar os campos restantes
    if (annualTarget !== undefined) distribution.annualTarget = Number(annualTarget);
    if (monthlyBreakdown) distribution.monthlyBreakdown = monthlyBreakdown;
    if (itemTypeTargets) distribution.itemTypeTargets = itemTypeTargets;

    // 5. Salvar as alterações
    await distribution.save();
    res.json(distribution);
  } catch (error) {
    console.error('[Update Distribution Error]:', error);
    res.status(500).json({ message: 'Erro ao atualizar a distribuição', error: error.message });
  }
});

// DELETE distribution
router.delete('/:goalId/distributions/:distId', auth, async (req, res) => {
  try {
    await GoalDistribution.deleteOne({ _id: req.params.distId, company: req.user.company._id });
    res.json({ message: 'Distribution deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== PERFORMANCE ENDPOINTS =====

// GET performance summary for all distributions in a goal
router.get('/:goalId/performance', auth, async (req, res) => {
  try {
    // 1. Validar se a meta pertence à empresa do utilizador
    const goal = await Goal.findOne({ _id: req.params.goalId, company: req.user.company._id });
    if (!goal) return res.status(404).json({ message: 'Meta não encontrada' });

    const startYear = new Date(goal.year, 0, 1);
    const endYear = new Date(goal.year + 1, 0, 1);

    // 2. Agregação otimizada: Buscar vendas e vincular cargos e utilizadores
    const performanceData = await Sale.aggregate([
      {
        $match: {
          company: req.user.company._id,
          createdAt: { $gte: startYear, $lt: endYear },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator',
        },
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            userId: '$createdBy',
            roleId: '$creator.role', // O role agora é ObjectId
          },
          revenue: { $sum: '$total' },
        },
      },
    ]);

    // 3. Buscar distribuições populando os dados de Role e AssignedUser
    const distributions = await GoalDistribution.find({ goal: goal._id })
      .populate('assignedUser', 'firstName lastName')
      .populate('role', 'roleName'); // Populando o nome do cargo para comparação

    // 4. Mapeamento da performance
    const performance = distributions.map((dist) => {
      let actualRev = 0;

      if (dist.assignedUser) {
        // Match por utilizador específico
        const userMatch = performanceData.find(
          (p) => p._id.userId?.toString() === dist.assignedUser._id.toString()
        );
        actualRev = userMatch?.revenue || 0;
      } else if (dist.role) {
        // Match por cargo (role)
        actualRev = performanceData
          .filter((p) => p._id.roleId?.toString() === dist.role._id.toString())
          .reduce((sum, p) => sum + p.revenue, 0);
      }

      const percentage = dist.annualTarget > 0 ? (actualRev / dist.annualTarget) * 100 : 0;

      // Lógica de Health Status
      let healthStatus = 'on-track';
      const margin = (1 - (goal.contingencyMargin || 0.1)) * 100;
      if (percentage < margin) {
        healthStatus = percentage < 50 ? 'critical' : 'at-risk';
      }

      return {
        ...dist.toObject(),
        actualRevenue: actualRev,
        percentage,
        healthStatus,
      };
    });

    res.json(performance);
  } catch (error) {
    console.error(`[Performance Error]:`, error);
    res.status(500).json({ message: 'Erro ao calcular a performance', error: error.message });
  }
});

// GET breakdown by item type
// GET breakdown by item type
router.get('/:goalId/breakdown', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.goalId, company: req.user.company._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const startYear = new Date(goal.year, 0, 1);
    const endYear   = new Date(goal.year + 1, 0, 1);

    const breakdown = await Sale.aggregate([
      {
        $match: {
          company: req.user.company._id,
          createdAt: { $gte: startYear, $lt: endYear },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemType',                           // 'Product', 'Service', 'Combo', 'Subscription'
          revenue: { 
            $sum: { $multiply: ['$items.quantity', '$items.priceAtSale'] } 
          },
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          itemType: '$_id',
          revenue: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json(breakdown);
  } catch (error) {
    console.error('Breakdown error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET top items inside a specific item type for the goal year
router.get('/:goalId/breakdown/:itemType/items', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.goalId, company: req.user.company._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const itemType = req.params.itemType;
    const startYear = new Date(goal.year, 0, 1);
    const endYear = new Date(goal.year + 1, 0, 1);

    const items = await Sale.aggregate([
      { $match: { company: req.user.company._id, createdAt: { $gte: startYear, $lt: endYear } } },
      { $unwind: '$items' },
      { $match: { 'items.itemType': itemType } },
      {
        $group: {
          _id: '$items.name',
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtSale'] } },
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);

    res.json(items.map(i => ({ name: i._id, revenue: i.revenue, count: i.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Em goals.cjs
router.get('/:goalId/projection/all-items', auth, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.goalId);
    if (!goal) return res.status(404).json({ message: 'Meta não encontrada' });

    const periodTarget = goal.annualTarget / PERIOD_MULTIPLIERS[goal.period];

    // 1. Pegar todos os itens ativos
    const [products, services, bundles] = await Promise.all([
      Product.find({ company: req.user.company._id, isActive: true, isArchived: false })
        .select('name category basePrice price unit images'),
      Service.find({ company: req.user.company._id, isActive: true })
        .select('name basePrice unit images'),
      Bundle.find({ company: req.user.company._id, isActive: true, isArchived: false })
        .select('name type price billingPricePerCycle image')
    ]);

    // 2. Normalizar para formato comum
    const allItems = [
      ...products.map(p => ({
        type: 'Product',
        name: p.name,
        price: p.price || p.basePrice || 0,
        unit: p.unit || 'unidade'
      })),
      ...services.map(s => ({
        type: 'Service',
        name: s.name,
        price: s.basePrice || 0,
        unit: s.unit || 'serviço'
      })),
      ...bundles.map(b => ({
        type: b.type, // 'Combo' ou 'Subscription'
        name: b.name,
        price: b.price || b.billingPricePerCycle || 0,
        unit: b.type === 'Subscription' ? b.billingCycle?.toLowerCase() : 'pacote'
      }))
    ].filter(item => item.price > 0); // ignorar itens sem preço

    if (allItems.length === 0) {
      return res.json({ items: [], totalGap: 0, message: 'Nenhum item com preço registado' });
    }

    // 3. Distribuir o gap (exemplo: proporcional ao preço)
    const totalPriceSum = allItems.reduce((sum, i) => sum + i.price, 0);
    
    const projected = allItems.map(item => {
      const weight = totalPriceSum > 0 ? item.price / totalPriceSum : 1 / allItems.length;
      const requiredRevenue = periodTarget * weight;
      const requiredUnits = Math.ceil(requiredRevenue / item.price);
      
      return {
        ...item,
        requiredRevenue: Math.round(requiredRevenue),
        requiredUnits,
        weight: (weight * 100).toFixed(2) + '%'
      };
    }).sort((a, b) => b.requiredUnits - a.requiredUnits);

    res.json({
      periodTarget,
      totalItems: allItems.length,
      items: projected.slice(0, 100), // limite inicial para performance
      note: 'Distribuição proporcional ao preço unitário'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
