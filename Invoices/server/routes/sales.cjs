const express = require('express');
const router = express.Router();
delete require.cache[require.resolve('../models/Sale.cjs')];
const Sale = require('../models/Sale.cjs');
const Product = require('../models/Product.cjs');
const Client = require('../models/Client.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const { getPeriodBounds } = require('../utils/periods.cjs');
const emailService = require('../utils/emailService.cjs');
const SearchLog = require('../models/SearchLog.cjs');
const { auth } = require('../middleware/auth.cjs');

// sales.cjs

// additional route: statistics for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;
    const roleName = req.user.role?.roleName || req.user.role;
    const isPartner = roleName === 'partner';
    const partnerId = isPartner ? req.user._id : null;

    let matchQuery = { company: companyId };
    if (isPartner) {
      matchQuery.partnerId = partnerId;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [globalStats, todayStats] = await Promise.all([
      // Estatísticas gerais
      Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },           // contagem total de vendas
            totalRevenue: { $sum: '$total' }   // soma dos valores
          }
        }
      ]),
      // Estatísticas de hoje
      Sale.aggregate([
        { 
          $match: { 
            ...matchQuery, 
            createdAt: { $gte: todayStart } 
          } 
        },
        {
          $group: {
            _id: null,
            todaySalesCount: { $sum: 1 },
            todayRevenue: { $sum: '$total' }
          }
        }
      ])
    ]);

    const gs = globalStats[0] || { totalSales: 0, totalRevenue: 0 };
    const ts = todayStats[0] || { todaySalesCount: 0, todayRevenue: 0 };

    res.json({
      totalSales: gs.totalSales,         // número de vendas totais
      totalRevenue: gs.totalRevenue,     // receita total
      todaySalesCount: ts.todaySalesCount,
      todayRevenue: ts.todayRevenue,
      // campos extras opcionais (mantém compatibilidade com partner view)
      totalCommission: 0, // podes calcular se quiseres
      commissionRate: req.user.commissionRate || 0,
      isPartnerView: isPartner
    });
  } catch (error) {
    console.error('[Stats Error]:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
});
router.get('/partner-stats', auth, async (req, res) => {
  try {
    // 1. Verificação corrigida: o role agora é um objeto populado pelo middleware auth
    const roleName = req.user.role?.roleName || req.user.role;
    
    if (roleName !== 'partner') {
      return res.status(403).json({ message: 'Acesso restrito a parceiros' });
    }

    const partnerId = req.user._id;
    const companyId = req.user.company._id;

    // 2. Agregação de vendas (Filtros por ID funcionam normalmente)
    const statsAgg = await Sale.aggregate([
      { 
        $match: { 
          company: companyId,
          partnerId: partnerId 
        } 
      },
      { 
        $group: { 
          _id: null,
          totalSales: { $sum: '$total' },
          totalCommission: { $sum: '$commissionValue' },
          totalSalesCount: { $sum: 1 },
          avgCommissionRate: { $avg: '$commissionRate' }
        } 
      }
    ]);

    const stats = statsAgg[0] || {
      totalSales: 0,
      totalCommission: 0,
      totalSalesCount: 0,
      avgCommissionRate: 0
    };

    // 3. Clientes únicos - Ajustado para usar customer.phone ou customer.email 
    // se o cliente for apenas um subdocumento (e não uma referência de ID)
    const uniqueClients = await Sale.distinct('customer.phone', { 
      company: companyId,
      partnerId: partnerId
    });

    console.log(`[partner-stats] Parceiro ${partnerId}: ${stats.totalCommission} em comissão`);

    res.json({
      totalSales: stats.totalSales,
      totalCommission: stats.totalCommission,
      activeClients: uniqueClients.length,
      // Fallback para a taxa do user se ainda não houver histórico de vendas
      commissionRate: stats.avgCommissionRate || req.user.commissionRate || 0,
      totalSalesCount: stats.totalSalesCount
    });
  } catch (err) {
    console.error('[partner-stats] Erro:', err);
    res.status(500).json({ message: 'Erro ao obter estatísticas do parceiro' });
  }
});


// daily stats for last N days (GET /api/sales/stats/daily?days=7)
router.get('/stats/daily', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const companyId = req.user.company._id;

    const today = new Date();
    today.setHours(0,0,0,0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    // aggregate sales grouped by day
    const agg = await Sale.aggregate([
      { $match: { company: companyId, createdAt: { $gte: startDate, $lte: new Date() } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$total' },
        count: { $sum: 1 }
      } },
      { $sort: { '_id': 1 } }
    ]);

    // build full series for last N days, filling zeros
    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0,10);
      const row = agg.find(a => a._id === key);
      series.push({ date: key, total: row ? row.total : 0, count: row ? row.count : 0 });
    }

    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// sales.cjs - Rota POST /

router.post('/', auth, async (req, res) => {
  try {
    console.log('🔍 [SALE POST] Body recebido:', JSON.stringify(req.body, null, 2));
    const {
      customer = {},
      items = [],
      total = 0,
      amountPaid = 0,
      paymentMethod,
      status = 'Pago 100%',
      discount = 0,
      dueDate,
      actualWalletDeduction = 0,
      partnerId: providedPartnerId,
      pendingRoomId,
    } = req.body;

    // Inicialização de variáveis de controle
    let rawWalletDeduction = req.body.actualWalletDeduction ?? req.body.walletDeduction ?? 0;
    const walletAmountToSubtract = Number(rawWalletDeduction) || 0;
    console.log(`🔍 walletAmountToSubtract = ${walletAmountToSubtract} (veio como: actual=${req.body.actualWalletDeduction} | walletDeduction=${req.body.walletDeduction})`);
    const customerIdForWallet = customer.id || (customer._id ? customer._id.toString() : null);
    
    
    // Extração do Role Name para verificação segura
    const userRoleName = req.user.role?.roleName || req.user.role;

    let partnerId = null;
    let commissionRate = 0;
    let commissionValue = 0;

    // ────────────────────────────────────────────────
    // 1. Lógica de Parceiro e Comissão (Ajustado para Roles)
    // ────────────────────────────────────────────────
    
    // Caso 1: O utilizador logado é parceiro
    if (userRoleName === 'partner') {
      partnerId = req.user._id;
      commissionRate = Number(req.user.commissionRate) || 0;
    } 
    // Caso 2: Admin/Owner seleciona um parceiro manualmente
    else if (providedPartnerId) {
      const User = require('../models/User.cjs');
      const partner = await User.findById(providedPartnerId).populate('role');
      
      const partnerRoleName = partner?.role?.roleName || partner?.role;

      if (partner && partnerRoleName === 'partner' && partner.company.equals(req.user.company._id)) {
        partnerId = partner._id;
        commissionRate = Number(partner.commissionRate) || 0;
      } else {
        return res.status(400).json({ message: 'Parceiro inválido ou de outra empresa' });
      }
    }

   const totalAmount = Number(total) || 0;
    const paidAmount = Number(amountPaid) || 0;
    const walletDeduct = walletAmountToSubtract;

    // Comissão
    if (partnerId && commissionRate > 0) {
      commissionValue = totalAmount * (commissionRate / 100);
    }
    const netAmount = totalAmount - commissionValue;
// Cálculo do saldo devedor (remainingBalance)
    
    // ────────────────────────────────────────────────
    // 2. Gestão de Cliente (Consumidor Final vs Registado)
    // ────────────────────────────────────────────────
    let customerToSave = { ...customer };
    const isAnonymous = !customer.name || 
                        ['consumidor final', 'balcão', ''].includes(customer.name.trim().toLowerCase());
                        
    let finalClientId = null;
    if (!customer.id && !isAnonymous) {
      let existingClient = await Client.findOne({
        phone: customer.phone,
        company: req.user.company._id,
      });

      if (existingClient) {
        customerToSave.id = existingClient._id.toString();
        customerToSave.name = existingClient.name;
        finalClientId = existingClient._id.toString();
        console.log(`✅ Cliente existente encontrado → ID: ${finalClientId}`);
      } else {
        const newClient = new Client({
          company: req.user.company._id,
          name: customer.name.trim() || 'Cliente sem nome',
          phone: customer.phone?.trim() || null,
          email: customer.email || `pdv_${Date.now()}@sistema.local`,
          origin: userRoleName === 'partner' ? 'Partner_Portal' : 'POS',
          isActive: true,
        });
        const savedClient = await newClient.save();
        customerToSave.id = savedClient._id.toString();
        finalClientId = savedClient._id.toString();
        console.log(`✅ Novo cliente criado → ID: ${finalClientId}`);
      }
    }else if (customer.id) {
      finalClientId = customer.id.toString();
    }

    if (isAnonymous) {
      customerToSave = { name: 'Consumidor Final', phone: null, id: null };
      finalClientId = null;
      console.log('🔍 Venda para Consumidor Final (anônimo) → sem dedução de carteira');
    }

    const remainingBalance = Math.max(0, totalAmount - paidAmount - walletDeduct);
    console.log(`🔍 remainingBalance calculado: ${remainingBalance}`);
    // ────────────────────────────────────────────────
    // 3. Dedução na Carteira (Wallet)
    // ────────────────────────────────────────────────
    console.log(`🔍 Verificando dedução: walletAmountToSubtract=${walletAmountToSubtract}, finalClientId=${finalClientId}`);
    if (walletAmountToSubtract > 0 && finalClientId) {
      const client = await Client.findOne({ 
        _id: finalClientId, 
        company: req.user.company._id 
      });

      if (client) {
        const oldBalance = Number(client.balance) || 0;
        const newBalance = Math.max(0, oldBalance - walletAmountToSubtract);

        client.balance = newBalance;

        // Notificações assíncronas
        if (newBalance <= 500) {
          setImmediate(async () => {
            try {
              const emailService = require('../utils/emailService.cjs');
              const email = client.email || `${client.phone || 'sememail'}@sistema.local`;

              if (newBalance <= 0) {
                await emailService.sendWalletCriticalEmail(email, client, newBalance);
              } else {
                await emailService.sendWalletLowEmail(email, client, newBalance);
              }
            } catch (e) {
              console.error("Erro notificação wallet:", e);
            }
          });
        }

        await client.save();
        console.log(`✅ CARTEIRA DEDUZIDA COM SUCESSO → ${walletAmountToSubtract} MT | Anterior: ${oldBalance} | Atual: ${newBalance} | Cliente: ${client.name}`);
      } else {
        console.error(`❌ ERRO GRAVE: Cliente ${finalClientId} não encontrado para dedução de carteira!`);
      }
    } else if (walletAmountToSubtract > 0 && !finalClientId) {
      console.error(`❌ ERRO GRAVE: Tentativa de deduzir ${walletAmountToSubtract} MT sem cliente válido (anônimo ou ID ausente)`);
    }

   // ────────────────────────────────────────────────
// 4. Criação da Venda
// ────────────────────────────────────────────────
const sale = new Sale({
  company: req.user.company._id,
  createdBy: req.user._id,
  origin: pendingRoomId ? 'pending-room' : (userRoleName === 'partner' ? 'Partner_Portal' : 'POS'),
  partnerId,
  commissionRate,
  remainingBalance: remainingBalance,
  commissionValue,
  netAmount,
  customer: customerToSave,
  items: items.map(i => ({
    ...i,
    quantity: i.quantity || i.qty || 1,
    priceAtSale: i.priceAtSale || i.price || 0,
    subtotal: (i.priceAtSale || i.price || 0) * (i.quantity || i.qty || 1)
  })),
  total: totalAmount,
  amountPaid: Number(amountPaid),
  walletDeduction: walletAmountToSubtract,
  paymentMethod: paymentMethod || 'Cash',
  status,
  dueDate: dueDate ? new Date(dueDate) : null
});

if (sale.items.length === 0) 
  return res.status(400).json({ message: 'A venda deve conter itens' });

await sale.save();

console.log('✅ Venda salva com sucesso → ID:', sale._id.toString());

// ────────────────────────────────────────────────
// 5. Processamento de Comissão em BACKGROUND
// ────────────────────────────────────────────────

setImmediate(async () => {
  try {
    console.log('[COMISSÃO BACKGROUND] Iniciando para venda:', sale._id.toString());

    // Determinar quem é o responsável pela comissão
    let responsibleUserId;

    if (sale.partnerId) {
      responsibleUserId = sale.partnerId.toString();
    } else if (sale.createdBy) {
      responsibleUserId = 
        (typeof sale.createdBy === 'string') ? sale.createdBy :
        sale.createdBy?._id?.toString() || 
        sale.createdBy?.toString() || null;
    }

    if (!responsibleUserId) {
      console.log('[COMISSÃO BACKGROUND] Sem utilizador responsável → ignorado');
      return;
    }

    const User = require('../models/User.cjs');
    const CommissionRule = require('../models/CommissionRule.cjs');
    const CommissionTransaction = require('../models/CommissionTransaction.cjs');

    const user = await User.findById(responsibleUserId)
      .populate('role', 'roleName')
      .lean();

    if (!user) {
      console.log('[COMISSÃO BACKGROUND] Utilizador não encontrado');
      return;
    }

    const rules = await CommissionRule.find({
      company: sale.company,
      userRole: user.role?._id,
      isActive: true
    }).lean();

    if (rules.length === 0) {
      console.log('[COMISSÃO BACKGROUND] Nenhuma regra ativa');
      return;
    }

    const periodType = rules[0].period || 'monthly';
    const { start, end } = getPeriodBounds(new Date(), periodType);

    for (const rule of rules) {
      let ruleQty = 0;
      let ruleBase = 0;

      for (const item of sale.items) {
        const matches = 
          (rule.targetType === 'General') ||
          (rule.targetType === item.itemType && 
           (!rule.targetId || String(rule.targetId) === String(item.productId)));

        if (matches) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.priceAtSale) || 0;
          ruleQty += qty;
          ruleBase += qty * price;
        }
      }

      if (ruleQty === 0) continue;

      // Acumulado anterior neste período
      const prevTxAgg = await CommissionTransaction.aggregate([
        {
          $match: {
            user: user._id,
            periodStart: start,
            periodEnd: end,
            appliedRule: rule._id,
            status: { $in: ['pending', 'approved', 'paid'] }
          }
        },
        { $group: { _id: null, totalQty: { $sum: '$quantityContributed' } } }
      ]);

      const cumulativeBefore = prevTxAgg[0]?.totalQty || 0;
      const projectedCumulative = cumulativeBefore + ruleQty;

      const tier = rule.ranges?.find(r =>
        projectedCumulative >= r.minQuantity &&
        (r.maxQuantity === null || projectedCumulative <= r.maxQuantity)
      );

      let finalCommission = 0;
      let appliedTier = null;

      if (tier) {
        finalCommission = tier.commissionType === 'percentage'
          ? ruleBase * (tier.value / 100)
          : tier.value * ruleQty;
        appliedTier = tier;
      }

      // Criar transação de comissão
      await new CommissionTransaction({
        company: sale.company,
        user: user._id,
        role: user.role?._id,
        sale: sale._id,
        period: periodType,
        periodStart: start,
        periodEnd: end,
        appliedRule: rule._id,
        targetType: rule.targetType,
        targetId: rule.targetId,
        quantityContributed: ruleQty,
        cumulativeQuantity: cumulativeBefore + ruleQty,
        tierApplied: appliedTier,
        baseAmount: ruleBase,
        commissionAmount: finalCommission,
        status: 'pending'
      }).save();

      console.log(`[COMISSÃO BACKGROUND] Sucesso → Regra: ${rule.name || rule._id} | Comissão: ${finalCommission.toFixed(2)} MT`);
    }

  } catch (commErr) {
    console.error('[COMISSÃO BACKGROUND] ERRO:', commErr.message || commErr);
  }
});

// ────────────────────────────────────────────────
// 6. COMISSÃO PARA PARCEIROS DE RECOMENDAÇÃO (Referral)
// ────────────────────────────────────────────────
setImmediate(async () => {
  try {
    if (!sale.customer?.id) return;

    const Client = require('../models/Client.cjs');
    const ReferralPartner = require('../models/ReferralPartner.cjs');
    const ReferralCommission = require('../models/ReferralCommission.cjs');
    const Company = require('../models/Company.cjs');
    const CommissionRule = require('../models/CommissionRule.cjs');

    const client = await Client.findById(sale.customer.id)
      .select('referredByPartner company');

    if (!client?.referredByPartner) return;

    // Verificar se o parceiro ainda está ativo
    const partnerDoc = await ReferralPartner.findById(client.referredByPartner)
      .select('isActive totalEarned');

    if (!partnerDoc || !partnerDoc.isActive) return;

    // Buscar configuração da empresa (prioridade para regra específica de referral)
    const company = await Company.findById(sale.company)
      .select('referralProgramEnabled referralCommissionRate');

    if (!company?.referralProgramEnabled) return;

    // Tentar pegar a regra específica de referral (mais flexível)
    let commissionRate = company.referralCommissionRate || 10;

    const referralRule = await CommissionRule.findOne({
      company: sale.company,
      referralProgramRule: true,
      isActive: true
    });

    if (referralRule && referralRule.ranges?.length > 0) {
      commissionRate = referralRule.ranges[0].value || commissionRate;
    }

    const commissionAmount = Number(sale.total || 0) * (commissionRate / 100);

    if (commissionAmount <= 0) return;

    // Criar comissão
    const newCommission = new ReferralCommission({
      company: sale.company,
      referralPartner: client.referredByPartner,
      referredClient: client._id,
      sale: sale._id,
      commissionAmount: Number(commissionAmount.toFixed(2)),
      commissionRate: commissionRate,
      status: 'pending'
    });

    await newCommission.save();

    // Atualizar total ganho do parceiro
    await ReferralPartner.findByIdAndUpdate(
      client.referredByPartner,
      { $inc: { totalEarned: commissionAmount } }
    );

    console.log(`[REFERRAL SUCCESS] ${commissionAmount.toFixed(2)} MT gerada para parceiro ${client.referredByPartner} | Venda: ${sale._id}`);

  } catch (err) {
    console.error('[REFERRAL COMMISSION ERROR]', err.message || err);
  }
});

    // ────────────────────────────────────────────────
    // 5. Atualização de Stock & Alertas
    // ────────────────────────────────────────────────
    for (const item of sale.items) {
      if (item.itemType === 'Product' && item.productId) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        if (product.stockQuantity < item.quantity && !product.madeToOrder) {
           // Rollback simples se stock falhar
           await Sale.findByIdAndDelete(sale._id);
           return res.status(400).json({ error: `Stock insuficiente para ${product.name}` });
        }

        const wasAbove = product.stockQuantity > (product.minStockLevel || 5);
        product.stockQuantity -= item.quantity;
        const isBelow = product.stockQuantity <= (product.minStockLevel || 5);

        if (wasAbove && isBelow) {
          // Trigger de e-mail de alerta de stock baixo aqui...
          console.log(`[ALERTA] Stock baixo para ${product.name}`);
        }
        await product.save();
      }
    }

    res.status(201).json({
      success: true,
      sale: await sale.populate('createdBy', 'firstName lastName'),
      message: 'Venda registada com sucesso'
    });

  } catch (error) {
    console.error('[POST /sales error]', error);
    res.status(500).json({ message: 'Erro interno ao criar venda', error: error.message });
  }
});


// analytics for online / public portal activity
router.get('/online-analytics', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;

    // top search terms
    const searches = await SearchLog.aggregate([
      { $match: { company: companyId } },
      { $group: { _id: '$term', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // popular purchased items from external sales
    const items = await Sale.aggregate([
      { $match: { company: companyId, origin: 'external' } },
      { $unwind: '$items' },
      { $group: {
          _id: {
            itemId: '$items.productId',
            name: '$items.name',
            itemType: '$items.itemType'
          },
          count: { $sum: '$items.quantity' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      topSearches: searches.map(s => ({ term: s._id, count: s.count })),
      topItems: items.map(i => ({
        itemId: i._id.itemId,
        name: i._id.name,
        itemType: i._id.itemType,
        count: i.count
      }))
    });
  } catch (error) {
    console.error('online analytics error', error);
    res.status(500).json({ message: error.message });
  }
});

// 1. LISTAR COM FILTROS (GET /api/sales)
// 1. LISTAR COM FILTROS (GET /api/sales)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      search, 
      startDate, 
      endDate, 
      partnerId, 
      mine,
      sellerId   // ← Adicionado
    } = req.query;
    
    // Filtro base
    let query = { company: req.user.company._id };

    const roleName = req.user.role?.roleName || req.user.role;

    // ────────────────────────────────────────────────
    // LÓGICA DE ACESSO + FILTRO POR VENDEDOR
    // ────────────────────────────────────────────────
    if (roleName === 'partner') {
      // Parceiro só vê as suas vendas
      query.partnerId = req.user._id;
    } 
    else if (sellerId && sellerId !== 'all' && sellerId !== '') {
      // Admin/Gestor selecionou um vendedor específico
      query.createdBy = sellerId;
    } 
    else if (mine === 'true') {
      // "Só minhas vendas"
      query.createdBy = req.user._id;
    }
    // Se nenhum dos acima → Admin vê todas as vendas da empresa (comportamento desejado)

    // ────────────────────────────────────────────────
    // Outros filtros
    // ────────────────────────────────────────────────
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filtro de datas
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Busca por cliente
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { 'customer.name': searchRegex },
        { 'customer.phone': searchRegex },
        { 'customer.email': searchRegex }
      ];
    }

    // Busca + Populate
    const sales = await Sale.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    // Resumo financeiro
    const summary = {
      count: sales.length,
      totalGross: sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      totalCommission: sales.reduce((sum, s) => sum + (Number(s.commissionValue) || 0), 0),
      totalNet: sales.reduce((sum, s) => sum + (Number(s.netAmount) || 0), 0)
    };

    res.json({
      success: true,
      sales,
      summary,
      type: 'sale'
    });

  } catch (error) {
    console.error("Erro ao buscar vendas:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao carregar vendas',
      error: error.message 
    });
  }
});

// GET /api/sales/sellers - Retorna vendedores que têm vendas
router.get('/sellers', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;

    const sellers = await Sale.aggregate([
      { $match: { company: companyId } },
      { $group: { _id: '$createdBy' } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$user._id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          email: '$user.email'
        }
      },
      { $sort: { firstName: 1 } }
    ]);

    res.json(sellers);
  } catch (err) {
    console.error('Erro ao buscar vendedores:', err);
    res.status(500).json({ message: 'Erro ao carregar vendedores' });
  }
});

// 2. CANCELAR VENDA (PUT /api/sales/:id/cancel)
// Aberto a todos os usuários autenticados
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, company: req.user.company._id });
    
    if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });
    if (sale.status === 'Cancelada') return res.status(400).json({ message: 'Venda já está cancelada' });

    // Devolver stock ao cancelar
    for (const item of sale.items) {
      if (item.itemType === 'Product') {
        await Product.findByIdAndUpdate(item.productId, { 
          $inc: { stockQuantity: item.quantity } 
        });
      }
    }

    sale.status = 'Cancelada';
    await sale.save();
    
    res.json({ message: 'Venda cancelada e stock reposto', sale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// sales.cjs
router.put('/:id/pay-remaining', auth, async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

    sale.status = 'Pago 100%';
    sale.remainingBalance = 0;        // ← importante!

    await sale.save();
    res.json({ message: 'Pagamento finalizado com sucesso', sale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// reminder helper (now parameterized by company)
async function sendDueNotifications(companyId) {
  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);   // +2 dias
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // -1 dia

  const Client = require('../models/Client.cjs');
  const emailService = require('../utils/emailService.cjs');

  // ==================== ANTES DO VENCIMENTO ====================
  const salesToNotifyBefore = await Sale.find({
    company: companyId,
    dueDate: { $lte: twoDays, $gte: now },        // vencendo em até 2 dias
    notifiedBefore: false,
    status: { $ne: 'Pago 100%' },                  // opcional, mas recomendado
    // Só vendas que ainda têm dívida
    remainingBalance: { $gt: 0 }                   // ← NOVA CONDIÇÃO
  });

  // ==================== APÓS O VENCIMENTO ====================
  const salesToNotifyAfter = await Sale.find({
    company: companyId,
    dueDate: { $lte: now, $gte: oneDayAgo },     // vencido entre ontem e hoje
    notifiedAfter: false,
    status: { $ne: 'Pago 100%' },
    remainingBalance: { $gt: 0 }                  // ← NOVA CONDIÇÃO
  });

  // Envio dos lembretes antes do vencimento
  for (const sale of salesToNotifyBefore) {
    let email = null;

    if (sale.customer?.id) {
      const client = await Client.findById(sale.customer.id);
      email = client?.email;
    }

    if (email && sale.remainingBalance > 0) {   // dupla verificação (segurança)
      await emailService.sendReminderEmail(email, sale);
      sale.notifiedBefore = true;
      await sale.save();
    }
  }

  // Envio das cobranças após o vencimento
  for (const sale of salesToNotifyAfter) {
    let email = null;

    if (sale.customer?.id) {
      const client = await Client.findById(sale.customer.id);
      email = client?.email;
    }

    if (email && sale.remainingBalance > 0) {
      await emailService.sendOverdueEmail(email, sale);
      sale.notifiedAfter = true;
      await sale.save();
    }
  }
}
// attach helper to router so it travels with the module
router.sendDueNotifications = sendDueNotifications;

// trigger reminders via GET (can be hit by cron)
router.get('/reminders', auth, async (req, res) => {
  try {
    await sendDueNotifications(req.user.company._id);
    res.json({ message: 'Reminders processed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// share invoice by email
// download invoice as PDF
router.get('/:id/invoice', auth, async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

    // Fetch company for branding info
    const Company = require('../models/Company.cjs');
    const company = await Company.findById(req.user.company._id);
    if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });

    // Fetch the invoice template (built-in)
    const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
    let template = await PublicPortalTemplate.findOne({
      name: 'Default Invoice Template',
      isBuiltIn: true,
    });

    // Fallback to Requisition template if invoice template not found
    if (!template) {
      template = await PublicPortalTemplate.findOne({
        name: 'Default Public Requisition Portal',
        isBuiltIn: true,
      });
    }

    const { renderInvoiceWithTemplate } = require('../utils/templateRenderer.cjs');

    // Render invoice HTML with template
    let html;
    if (template && template.htmlContent) {
      html = renderInvoiceWithTemplate(sale, company, {
        htmlContent: template.htmlContent,
        cssContent: template.cssContent,
        logoOverride: template.logoOverride,
        primaryColor: template.primaryColor,
        accentColor: template.accentColor,
        checkoutBackground: template.checkoutBackground,
        checkoutTextColor: template.checkoutTextColor,
      });
    } else {
      // Fallback to simple invoice if no template found
      const itemsHtml = (sale.items || []).map(i => `
        <tr>
          <td style="padding:4px;border:1px solid #333;">${i.name}</td>
          <td style="padding:4px;border:1px solid #333;text-align:center;">${i.quantity}</td>
          <td style="padding:4px;border:1px solid #333;text-align:right;">${i.priceAtSale}</td>
        </tr>
      `).join('');
      html = `
        <h1>Fatura da venda ${sale._id.toString().slice(-6)}</h1>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr><th style="border:1px solid #333;padding:4px;">Nome</th><th style="border:1px solid #333;padding:4px;">Qtd</th><th style="border:1px solid #333;padding:4px;">Preço</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p>Total: ${sale.total}</p>
      `;
    }

    // Create PDF from rendered HTML using Playwright (with fallback)
    let pdfBuffer;
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox'],
        executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined
      });
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1024, height: 768 });
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
        pdfBuffer = await page.pdf({ 
          format: 'A4',
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
          printBackground: true
        });
        await page.close();
        await browser.close();
      } catch (innerErr) {
        if (page && !page.isClosed()) try { await page.close(); } catch (e) {}
        if (browser) try { await browser.close(); } catch (e) {}
        throw innerErr;
      }
    } catch (playErr) {
      console.error('Playwright PDF generation failed (sales route), attempting fallback:', playErr.message);
      // simple PDFKit fallback
      pdfBuffer = await (async function(sale, company){
        return new Promise((resolve, reject) => {
          try {
            const doc = new PDFDocument({ margins: 40, size: 'A4' });
            let data = Buffer.alloc(0);
            doc.on('data', chunk => data = Buffer.concat([data, chunk]));
            doc.on('end', () => resolve(data));
            doc.on('error', reject);

            doc.fontSize(20).font('Helvetica-Bold').text((company?.name || 'Fatura').toString());
            if (company?.address) doc.fontSize(10).text(company.address.toString());
            if (company?.phone) doc.text(company.phone.toString());
            doc.moveDown();
            
            doc.fontSize(14).font('Helvetica-Bold').text('FATURA', { align: 'center' }).moveDown();
            const invoiceNum = (sale._id?.toString?.() || String(sale._id)).slice(-6);
            doc.fontSize(10).font('Helvetica').text(`Fatura #: ${invoiceNum}`);
            doc.text(`Data: ${new Date(sale.createdAt).toLocaleDateString('pt-PT')}`);
            if (sale.dueDate) {
              doc.text(`Vencimento: ${new Date(sale.dueDate).toLocaleDateString('pt-PT')}`);
            }
            doc.moveDown();
            
            // items
            doc.font('Helvetica-Bold');
            doc.text('Item                      Qtd   Preço   Total');
            doc.font('Helvetica');
            (sale.items||[]).forEach(i=>{
              const qty=i.quantity||0; const price=i.priceAtSale||i.price||0;
              const total=qty*price;
              doc.text(`${(i.name||'').toString().slice(0,25)} ${qty} ${price.toFixed(2)} ${total.toFixed(2)}`);
            });
            doc.moveDown();
            doc.text(`TOTAL: ${(sale.total||0).toFixed(2)} MT`);
            doc.end();
          } catch(e){reject(e);}
        });
      })(sale, company);
    }

    // Send PDF as attachment
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Fatura_${sale._id.toString().slice(-6)}.pdf"`);
    res.send(pdfBuffer);
    return;
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// share invoice by email
router.put('/:id/share', auth, async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

    const { to, cc } = req.body || {};
    let email = to;
    if (!email && sale.customer?.id) {
      const Client = require('../models/Client.cjs');
      const client = await Client.findById(sale.customer.id);
      email = client?.email;
    }
    if (!email) return res.status(400).json({ message: 'Cliente não tem email' });

    // Fetch company for branding info
    const Company = require('../models/Company.cjs');
    const company = await Company.findById(req.user.company._id);
    if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });

    // Fetch the invoice template (built-in)
    const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
    let template = await PublicPortalTemplate.findOne({
      name: 'Default Invoice Template',
      isBuiltIn: true,
    });

    // Fallback to Requisition template if invoice template not found
    if (!template) {
      template = await PublicPortalTemplate.findOne({
        name: 'Default Public Requisition Portal',
        isBuiltIn: true,
      });
    }

    const emailService = require('../utils/emailService.cjs');
    const { renderInvoiceWithTemplate } = require('../utils/templateRenderer.cjs');

    // Render invoice HTML with template
    let html;
    if (template && template.htmlContent) {
      html = renderInvoiceWithTemplate(sale, company, {
        htmlContent: template.htmlContent,
        cssContent: template.cssContent,
        logoOverride: template.logoOverride,
        primaryColor: template.primaryColor,
        accentColor: template.accentColor,
        checkoutBackground: template.checkoutBackground,
        checkoutTextColor: template.checkoutTextColor,
      });
    } else {
      // Fallback to simple invoice if no template found
      const itemsHtml = (sale.items || []).map(i => `
        <tr>
          <td style="padding:4px;border:1px solid #333;">${i.name}</td>
          <td style="padding:4px;border:1px solid #333;text-align:center;">${i.quantity}</td>
          <td style="padding:4px;border:1px solid #333;text-align:right;">${i.priceAtSale}</td>
        </tr>
      `).join('');
      html = `
        <h1>Fatura da venda ${sale._id.toString().slice(-6)}</h1>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr><th style="border:1px solid #333;padding:4px;">Nome</th><th style="border:1px solid #333;padding:4px;">Qtd</th><th style="border:1px solid #333;padding:4px;">Preço</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p>Total: ${sale.total}</p>
      `;
    }

    // Create PDF from rendered HTML using Playwright, fallback to PDFKit if browser not available
    let pdfBuffer;
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox'],
        executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined
      });
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1024, height: 768 });
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
        pdfBuffer = await page.pdf({ 
          format: 'A4',
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
          printBackground: true
        });
        await page.close();
        await browser.close();
      } catch (innerErr) {
        if (page && !page.isClosed()) try { await page.close(); } catch (e) {}
        if (browser) try { await browser.close(); } catch (e) {}
        throw innerErr;
      }
    } catch (playErr) {
      console.error('Playwright PDF generation failed (share route), falling back:', playErr.message);
      // simple inline PDFKit generation
      pdfBuffer = await (async function(sale, company){
        return new Promise((resolve, reject) => {
          try {
            const doc = new PDFDocument({ margins: 40, size: 'A4' });
            let data = Buffer.alloc(0);
            doc.on('data', chunk => data = Buffer.concat([data, chunk]));
            doc.on('end', () => resolve(data));
            doc.on('error', reject);

            doc.fontSize(20).font('Helvetica-Bold').text((company?.name || 'Fatura').toString());
            if (company?.address) doc.fontSize(10).text(company.address.toString());
            if (company?.phone) doc.text(company.phone.toString());
            doc.moveDown();
            doc.fontSize(14).font('Helvetica-Bold').text('FATURA', { align: 'center' }).moveDown();
            const invoiceNum = (sale._id?.toString?.() || String(sale._id)).slice(-6);
            doc.fontSize(10).font('Helvetica').text(`Fatura #: ${invoiceNum}`);
            doc.text(`Data: ${new Date(sale.createdAt).toLocaleDateString('pt-PT')}`);
            if (sale.dueDate) {
              doc.text(`Vencimento: ${new Date(sale.dueDate).toLocaleDateString('pt-PT')}`);
            }
            doc.moveDown();
            doc.font('Helvetica-Bold');
            doc.text('Item                      Qtd   Preço   Total');
            doc.font('Helvetica');
            (sale.items||[]).forEach(i=>{
              const qty=i.quantity||0; const price=i.priceAtSale||i.price||0;
              const total=qty*price;
              doc.text(`${(i.name||'').toString().slice(0,25)} ${qty} ${price.toFixed(2)} ${total.toFixed(2)}`);
            });
            doc.moveDown();
            doc.text(`TOTAL: ${(sale.total||0).toFixed(2)} MT`);
            doc.end();
          } catch(e){reject(e);}
        });
      })(sale, company);
    }
    
    // Send email with PDF attachment
    await emailService.sendInvoiceEmail(email, sale, pdfBuffer, cc);
    res.json({ message: 'Email enviado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// send reminder/overdue email for single sale
router.put('/:id/remind', auth, async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

    if (!sale.dueDate) return res.status(400).json({ message: 'Venda não tem data de vencimento' });

    // determine which notification is appropriate
    const now = new Date();
    const due = new Date(sale.dueDate);
    const Client = require('../models/Client.cjs');
    const emailService = require('../utils/emailService.cjs');

    let email;
    if (sale.customer?.id) {
      const client = await Client.findById(sale.customer.id);
      email = client?.email;
    }
    if (!email) return res.status(400).json({ message: 'Cliente não tem email' });

    if (due.getTime() >= now.getTime() && due.getTime() - now.getTime() <= 2 * 24*60*60*1000 && !sale.notifiedBefore) {
      await emailService.sendReminderEmail(email, sale);
      sale.notifiedBefore = true;
      await sale.save();
      return res.json({ message: 'Reminder enviado' });
    }

    if (due.getTime() <= now.getTime() && now.getTime() - due.getTime() <= 1*24*60*60*1000 && !sale.notifiedAfter) {
      await emailService.sendOverdueEmail(email, sale);
      sale.notifiedAfter = true;
      await sale.save();
      return res.json({ message: 'Overdue alert enviado' });
    }

    res.json({ message: 'Nenhuma ação necessária' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. APAGAR VENDA (DELETE /api/sales/:id)
// RESTRITO APENAS A ADMINS
// RESTRITO APENAS A ADMINS E OWNERS
router.delete('/:id', auth, async (req, res) => {
  try {
    // 1. Extração segura do nome do role (populado pelo middleware auth)
    const roleName = req.user.role?.roleName || req.user.role;

    // 2. Verificação de Role usando a nova estrutura de ObjectId/RolePermission
    const authorizedRoles = ['admin', 'owner'];
    
    if (!authorizedRoles.includes(roleName)) {
      return res.status(403).json({ 
        message: 'Acesso negado. Apenas administradores e proprietários podem apagar registos.' 
      });
    }

    // 3. Eliminação com restrição de empresa (Segurança multi-tenant)
    const sale = await Sale.findOneAndDelete({ 
      _id: req.params.id, 
      company: req.user.company._id 
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Venda não encontrada ou não pertence à sua empresa' });
    }
    
    // Log de auditoria (opcional, mas recomendado para deleções)
    console.log(`[DELETE] Venda ${req.params.id} removida por ${req.user.email}`);

    res.json({ message: 'Registo de venda apagado permanentemente' });
  } catch (error) {
    console.error('[Sale Delete Error]:', error);
    res.status(500).json({ message: 'Erro ao processar a eliminação do registo' });
  }
});

module.exports = router;