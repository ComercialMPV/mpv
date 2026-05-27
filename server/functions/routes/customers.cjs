const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale.cjs');
const Client = require('../models/Client.cjs');




const { auth } = require('../middleware/auth.cjs');

// ===== CUSTOMER ANALYTICS =====

// GET overall customer analytics: top/bottom customers, metrics
// GET overall customer analytics: top/bottom customers, metrics
// GET /api/customers/analytics
router.get('/', auth, async (req, res) => {
  try {
    const clients = await Client.find({
      company: req.user.company._id
    })
      .select('name phone email billingAddress createdAt') // campos que precisas
      .sort({ name: 1 })
      .lean(); // mais rápido, retorna POJO

    res.json(clients);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro ao carregar clientes' });
  }
});
// GET /api/customers/analytics
// GET /api/customers/analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { limit = 200, sortBy = 'revenue', view = 'all' } = req.query;
    const limitNum = parseInt(limit, 10) || 200;

    const isAdminOrOwner = ['superadmin', 'super_admin', 'super admin', 'owner', 'admin'].includes(
      (req.user.role?.roleName || req.user.role || '').toString().toLowerCase().trim()
    );

    const matchStage = {
      company: req.user.company._id,
      total: { $gt: 0 },
      status: { $ne: 'Cancelada' },
    };

    if (view === 'personal' || !isAdminOrOwner) {
      matchStage['createdBy'] = req.user._id;
    }

    const pipeline = [
      { $match: matchStage },

      {
        $group: {
          _id: '$customer.id',
          customerName: { $first: { $ifNull: ['$customer.name', 'Sem nome'] } },
          origin: { $first: '$origin' },
          totalRevenue: { $sum: '$total' },
          totalCount: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgOrderValue: { $avg: '$total' },
          lastSale: { $max: '$createdAt' },
          firstSale: { $min: '$createdAt' },
          sales: { $push: '$$ROOT' }
        }
      },

      {
        $project: {
          _id: 0,
          customerId: '$_id',
          customerName: 1,
          origin: 1,
          totalRevenue: 1,
          totalCount: 1,
          totalItems: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          lastSale: 1,
          firstSale: 1,
          purchaseFrequency: {
            $cond: [
              { $eq: ['$totalCount', 0] },
              0,
              {
                $round: [
                  {
                    $divide: [
                      '$totalCount',
                      { $max: [1, { $divide: [{ $subtract: ['$lastSale', '$firstSale'] }, 86400000] }] }
                    ]
                  },
                  2
                ]
              }
            ]
          },
          // === TOP ITEMS - Versão Simples e Correta ===
          topItems: {
            $slice: [
              {
                $sortArray: {
                  input: {
                    $map: {
                      input: {
                        $reduce: {
                          input: "$sales",
                          initialValue: [],
                          in: { $concatArrays: ["$$value", "$$this.items"] }
                        }
                      },
                      as: "item",
                      in: {
                        name: "$$item.name",
                        quantity: "$$item.quantity",
                        priceAtSale: "$$item.priceAtSale",
                        totalSpent: { $multiply: ["$$item.quantity", "$$item.priceAtSale"] }
                      }
                    }
                  },
                  sortBy: { totalSpent: -1 }
                }
              },
              5
            ]
          }
        }
      }
    ];

    let allCustomers = await Sale.aggregate(pipeline);

    // ==================== DEBUG ====================
    console.log(`\n🔍 [Customer Analytics] Total clientes: ${allCustomers.length}`);
    if (allCustomers.length > 0) {
      const first = allCustomers[0];
      console.log("🔍 Primeiro cliente - topItems:", JSON.stringify(first.topItems, null, 2));
      console.log("🔍 Campos disponíveis:", Object.keys(first));
    }
    // ===============================================

    // Ordenação
    if (sortBy === 'revenue') allCustomers.sort((a, b) => b.totalRevenue - a.totalRevenue);
    else if (sortBy === 'count') allCustomers.sort((a, b) => b.totalCount - a.totalCount);
    else if (sortBy === 'frequency') allCustomers.sort((a, b) => b.purchaseFrequency - a.purchaseFrequency);

    allCustomers = allCustomers.slice(0, limitNum);

    const totalRevenue = allCustomers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const totalCustomers = allCustomers.length;
    const totalTransactions = allCustomers.reduce((sum, c) => sum + (c.totalCount || 0), 0);
    const avgLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgAOV = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    res.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCustomers,
        avgLTV: Math.round(avgLTV * 100) / 100,
        avgAOV: Math.round(avgAOV * 100) / 100,
        totalTransactions,
        isPersonalView: !isAdminOrOwner || view === 'personal'
      },
      allCustomers,
      topCustomers: allCustomers.slice(0, 10),
      bottomCustomers: [...allCustomers]
        .filter(c => (c.averageDelayDays || 0) > 0)
        .sort((a, b) => (b.averageDelayDays || 0) - (a.averageDelayDays || 0))
        .slice(0, 10),
    });

  } catch (error) {
    console.error('[CustomerAnalytics] Error:', error);
    res.status(500).json({ message: 'Erro ao gerar analytics de clientes' });
  }
});

router.get('/breakdown', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;
    console.log('🔍 [Breakdown] CompanyId:', companyId.toString());

    // 1. Breakdown normal por origin da venda
    const breakdown = await Sale.aggregate([
      {
        $match: {
          company: companyId,
          status: { $ne: 'Cancelada' },
          total: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$origin',
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$customer.id' }
        },
      },
      {
        $project: {
          _id: 0,
          origin: '$_id',
          revenue: { $round: ['$revenue', 2] },
          count: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' }
        },
      }
    ]);

    console.log(`📊 [Breakdown] Vendas normais: ${breakdown.length} origens`);

    // === REFERRAL PARTNER - CORRIGIDO (coleção 'clients') ===
    console.log('🔎 [Referral] Buscando vendas de clientes Referral Partner...');

    const referralPartnerSales = await Sale.aggregate([
      {
        $match: {
          company: companyId,
          status: { $ne: 'Cancelada' },
          total: { $gt: 0 }
        }
      },
      {
        $addFields: {
          customerId: '$customer.id'
        }
      },
      {
        $lookup: {
          from: 'clients',                    // ← CORRIGIDO: 'clients' e não 'customers'
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerDoc'
        }
      },
      {
        $unwind: {
          path: '$customerDoc',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'customerDoc.referredByPartner': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: 'referralPartner',
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$customerId' }
        }
      },
      {
        $project: {
          _id: 0,
          origin: '$_id',
          revenue: { $round: ['$revenue', 2] },
          count: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    console.log(`✅ [Referral] Vendas encontradas: ${referralPartnerSales.length}`);

    if (referralPartnerSales.length > 0) {
      console.log('📈 Dados de Referral Partner:');
      console.dir(referralPartnerSales[0], { depth: 2 });
    } else {
      console.log('⚠️ Nenhuma venda de Referral Partner encontrada');
    }

    const referralData = referralPartnerSales[0] || {
      origin: 'referralPartner',
      revenue: 0,
      count: 0,
      uniqueCustomers: 0
    };

    // Combinar os resultados
    let allBreakdown = [...breakdown];

    const existingReferralIndex = allBreakdown.findIndex(item => item.origin === 'referralPartner');
    if (existingReferralIndex !== -1) {
      allBreakdown[existingReferralIndex] = referralData;
    } else {
      allBreakdown.push(referralData);
    }

    // Garantir todas as origens
    const allOrigins = ['POS', 'pending-room', 'internal', 'external', 'Partner_Portal', 'referralPartner'];

    const result = allOrigins.map(origin => {
      const existing = allBreakdown.find(b => b.origin === origin);
      return existing || {
        origin,
        revenue: 0,
        count: 0,
        uniqueCustomers: 0
      };
    });

    // Calcular percentagens
    const totalRevenue = result.reduce((sum, item) => sum + item.revenue, 0);

    const finalResult = result.map(item => ({
      ...item,
      percentage: totalRevenue > 0
        ? Math.round((item.revenue / totalRevenue) * 1000) / 10
        : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    console.log('🎯 Resultado final enviado:');
    console.table(finalResult.map(r => ({
      origin: r.origin,
      revenue: r.revenue,
      count: r.count,
      percentage: r.percentage + '%'
    })));

    res.json(finalResult);

  } catch (error) {
    console.error('❌ [Customer Breakdown] Erro:', error);
    res.status(500).json({
      message: 'Erro ao gerar breakdown de origens',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET detailed stats for a single customer
// GET /api/customers/:customerId/stats
router.get('/:customerId/stats', auth, async (req, res) => {
  try {
    const { customerId } = req.params;

    const isWalkIn = customerId === 'walk-in';

    const matchStage = {
      company: req.user.company._id,
      ...(isWalkIn 
        ? { 'customer.id': null } 
        : { 'customer.id': customerId }
      ),
      status: { $ne: 'Cancelada' },
      total: { $gt: 0 },
    };

    const stats = await Sale.aggregate([
      { $match: matchStage },

      // Ordenar por data descendente para que $first pegue a venda mais recente
      { $sort: { createdAt: -1 } },

      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalCount: { $sum: 1 },
          avgOrder: { $avg: '$total' },
          lastPurchase: { $max: '$createdAt' },
          firstPurchase: { $min: '$createdAt' },
          itemsTotal: { $sum: { $size: '$items' } },
          origins: { $push: '$origin' },                    // array com todas as origens
          mostRecentOrigin: { $first: '$origin' },          // origin da venda mais recente
        },
      },

      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalTransactions: '$totalCount',
          avgOrderValue: { $round: ['$avgOrder', 2] },
          totalItems: '$itemsTotal',
          firstPurchase: 1,
          lastPurchase: 1,
          daysActive: {
            $cond: [
              { $gt: ['$firstPurchase', null] },
              { $floor: { $divide: [{ $subtract: ['$lastPurchase', '$firstPurchase'] }, 86400000] } },
              0
            ]
          },
          origin: '$mostRecentOrigin',

          // Cálculo do origin mais frequente (modo)
          mostFrequentOrigin: {
            $let: {
              vars: {
                // Criar array de {origin, count}
                originCounts: {
                  $map: {
                    input: { $setUnion: ['$origins'] },
                    as: 'o',
                    in: {
                      origin: '$$o',
                      count: {
                        $size: {
                          $filter: {
                            input: '$origins',
                            as: 'orig',
                            cond: { $eq: ['$$orig', '$$o'] }
                          }
                        }
                      }
                    }
                  }
                }
              },
              in: {
                $let: {
                  vars: {
                    maxCount: { $max: '$$originCounts.count' }
                  },
                  in: {
                    $arrayElemAt: [
                      '$$originCounts',
                      {
                        $indexOfArray: [
                          '$$originCounts.count',
                          '$$maxCount'
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
    ]);

    if (!stats.length || !stats[0].totalTransactions) {
      return res.status(404).json({ 
        message: 'Nenhuma venda encontrada para este cliente' 
      });
    }

    const stat = stats[0];

    const purchaseFrequency = stat.daysActive > 0 
      ? (stat.totalTransactions / stat.daysActive).toFixed(2) 
      : stat.totalTransactions > 0 ? '∞' : '0.00';

    res.json({
      totalRevenue: Math.round(stat.totalRevenue * 100) / 100,
      totalTransactions: stat.totalTransactions,
      avgOrderValue: stat.avgOrderValue,
      totalItems: stat.totalItems,
      firstPurchase: stat.firstPurchase,
      lastPurchase: stat.lastPurchase,
      daysActive: stat.daysActive,
      purchaseFrequency,
      origin: stat.origin || 'unknown',
      mostFrequentOrigin: stat.mostFrequentOrigin?.origin || stat.origin || 'unknown',
    });
  } catch (error) {
    console.error('[CustomerStats] Error:', error);
    res.status(500).json({ 
      message: 'Erro ao obter estatísticas do cliente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET list of registered customers (for dropdown selection)
// GET /api/customers/list
// Lista todos os clientes da empresa com campos úteis + origin
router.get('/list', auth, async (req, res) => {
  try {
    const { active, search, limit = 100, sort = 'name' } = req.query;

    const query = {
      company: req.user.company._id,
    };

    // Filtro por estado ativo/inativo
    if (active !== undefined) {
      query.isActive = active === 'true' || active === '1';
    }

    // Pesquisa por nome, email ou telefone (case insensitive)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Construir o pipeline de agregação para incluir contagem de vendas
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'customer.id',
          as: 'sales',
        },
      },
      {
        $addFields: {
          totalRevenue: { $sum: '$sales.total' },
          transactionCount: { $size: '$sales' },
          lastSale: { $max: '$sales.createdAt' },
          origin: { $ifNull: ['$origin', 'unknown'] }, // fallback caso esteja vazio
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          email: 1,
          origin: 1,
          isActive: 1,
          isWalkIn: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          transactionCount: 1,
          lastSale: 1,
          createdAt: 1,
        },
      },
      {
        $sort: sort === 'revenue' 
          ? { totalRevenue: -1 }
          : sort === 'transactions' 
            ? { transactionCount: -1 }
            : sort === 'lastSale' 
              ? { lastSale: -1 }
              : { name: 1 }, // default: por nome
      },
      { $limit: parseInt(limit, 10) || 100 },
    ];

    const clients = await Client.aggregate(pipeline);

    // Contagem total (sem limite) para paginação futura
    const total = await Client.countDocuments(query);

    res.json({
      clients,
      total,
      limit: parseInt(limit, 10) || 100,
      filters: { active, search, sort },
    });
  } catch (error) {
    console.error('[CustomerList] Error:', error.message);
    res.status(500).json({ 
      message: 'Erro ao listar clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/customers/:customerId/individual-stats
router.get('/:customerId/individual-stats', auth, async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Client.findById(customerId)
      .select('_id name phone email balance origin isActive isWalkIn createdAt')
      .lean();

    if (!customer) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const sales = await Sale.find({
      company: req.user.company._id,
      'customer.id': customerId,
      status: { $ne: 'Cancelada' },
      total: { $gt: 0 },
    })
      .sort({ createdAt: 1 })   // ordenado do mais antigo para o mais recente
      .lean();

    if (!sales.length) {
      return res.json({
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          balance: customer.balance || 0,
          origin: customer.origin || 'unknown',
          isActive: customer.isActive ?? true,
          isWalkIn: customer.isWalkIn ?? false,
          createdAt: customer.createdAt,
        },
        ltv: 0,
        aov: 0,
        cac: 0,
        totalTransactions: 0,
        totalItems: 0,
        firstPurchase: null,
        lastPurchase: null,
        daysActive: 0,
        purchaseFrequency: '0.00',
        totalPaid: 0,
        totalPending: 0,
        averagePaymentDelay: 0,
        paymentDelayRisk: 'Baixo',
        delayedTransactions: 0,
        origin: 'unknown',
        mostFrequentOrigin: 'unknown',
        salesByOrigin: {},
      });
    }

    // === CÁLCULOS CORRIGIDOS ===

    const ltv = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalTransactions = sales.length;
    const aov = totalTransactions > 0 ? ltv / totalTransactions : 0;
    const cac = aov * 0.15;

    const totalItems = sales.reduce((sum, s) => sum + (s.items?.length || 0), 0);

    const firstPurchase = sales[0]?.createdAt;
    const lastPurchase = sales[sales.length - 1]?.createdAt;

    // 1. Dias Ativos = número de dias distintos com compras
    const activeDaysSet = new Set();
    sales.forEach(sale => {
      if (sale.createdAt) {
        const dateStr = new Date(sale.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        activeDaysSet.add(dateStr);
      }
    });
    const daysActive = activeDaysSet.size;

    // 2. Frequência = média de compras por dia ativo
    const purchaseFrequency = daysActive > 0 
      ? (totalTransactions / daysActive).toFixed(2) 
      : '0.00';

    // Pagamentos
    const paidSales = sales.filter(s => s.status === 'Pago 100%');
    const pendingSales = sales.filter(s => s.status !== 'Pago 100%');

    const totalPaid = paidSales.reduce((sum, s) => sum + (s.amountPaid || s.total || 0), 0);
    const totalPending = pendingSales.reduce((sum, s) => sum + ((s.total || 0) - (s.amountPaid || 0)), 0);

    // Atrasos de pagamento
    const today = new Date();
    const delayedSales = sales.filter(sale => {
      if (!sale.dueDate || sale.status === 'Pago 100%') return false;
      return today > new Date(sale.dueDate);
    });

    const totalDelayDays = delayedSales.reduce((sum, sale) => {
      const due = new Date(sale.dueDate);
      const delay = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, delay);
    }, 0);

    const averagePaymentDelay = delayedSales.length > 0 
      ? Math.round(totalDelayDays / delayedSales.length) 
      : 0;

    let paymentDelayRisk = 'Baixo';
    if (averagePaymentDelay > 30) paymentDelayRisk = 'Crítico';
    else if (averagePaymentDelay > 14) paymentDelayRisk = 'Alto';
    else if (averagePaymentDelay > 7) paymentDelayRisk = 'Médio';

    // Análise de origens
    const originCounts = sales.reduce((acc, sale) => {
      const o = sale.origin || 'unknown';
      acc[o] = (acc[o] || 0) + 1;
      return acc;
    }, {});

    let mostFrequentOrigin = 'unknown';
    let maxCount = 0;
    Object.entries(originCounts).forEach(([origin, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentOrigin = origin;
      }
    });

    const mostRecentOrigin = sales[sales.length - 1]?.origin || customer.origin || 'unknown';

    res.json({
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        balance: customer.balance || 0,
        origin: customer.origin || 'unknown',
        isActive: customer.isActive ?? true,
        isWalkIn: customer.isWalkIn ?? false,
        createdAt: customer.createdAt,
      },
      ltv: Math.round(ltv * 100) / 100,
      aov: Math.round(aov * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      totalTransactions,
      totalItems,
      firstPurchase,
      lastPurchase,
      daysActive,                    // ← Número de dias com compras
      purchaseFrequency,             // ← Média de compras por dia ativo
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      averagePaymentDelay,
      paymentDelayRisk,
      delayedTransactions: delayedSales.length,
      origin: mostRecentOrigin,
      mostFrequentOrigin,
      salesByOrigin: originCounts,
    });

  } catch (error) {
    console.error('[IndividualCustomerStats] Error:', error);
    res.status(500).json({ 
      message: 'Erro ao obter estatísticas individuais do cliente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// GET payment analysis for all customers (best/worst payers)
router.get('/payment-analysis/all', auth, async (req, res) => {
  try {
    const pipeline = [
      // 1. Filtrar vendas relevantes
      {
        $match: {
          company: req.user.company._id,
          'customer.id': { $ne: null },
          status: { $nin: ['Cancelada', 'Reserva'] },
          total: { $gt: 0 },
        },
      },
      // 2. Agrupar por cliente
      {
        $group: {
          _id: '$customer.id',
          customerName: { $first: '$customer.name' },
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          onTimePayments: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$dueDate', null] }, { $lte: [new Date(), '$dueDate'] }] },
                1,
                0
              ]
            }
          },
          latePayments: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$dueDate', null] }, { $gt: [new Date(), '$dueDate'] }] },
                1,
                0
              ]
            }
          },
          totalDelayDays: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$dueDate', null] }, { $gt: [new Date(), '$dueDate'] }] },
                {
                  $floor: {
                    $divide: [{ $subtract: [new Date(), '$dueDate'] }, 86400000]
                  }
                },
                0
              ]
            }
          },
          origins: { $push: '$origin' }
        }
      },
      // 3. Calcular métricas derivadas
      {
        $project: {
          customerId: '$_id',
          customerName: 1,
          totalTransactions: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          onTimePayments: 1,
          latePayments: 1,
          totalDelayDays: 1,
          averageDelayDays: {
            $cond: [
              { $gt: ['$latePayments', 0] },
              { $round: [{ $divide: ['$totalDelayDays', '$latePayments'] }, 1] },
              0
            ]
          },
          paymentReliability: {
            $cond: [
              { $gt: ['$totalTransactions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$onTimePayments', '$totalTransactions'] }, 100] }] },
              100
            ]
          },
          // Origin mais frequente (usando $reduce para encontrar o com maior count)
          mostFrequentOrigin: {
            $reduce: {
              input: { $setUnion: ['$origins'] },
              initialValue: { origin: 'unknown', count: 0 },
              in: {
                $let: {
                  vars: {
                    currentCount: {
                      $size: {
                        $filter: {
                          input: '$origins',
                          as: 'o',
                          cond: { $eq: ['$$o', '$$this'] }
                        }
                      }
                    }
                  },
                  in: {
                    $cond: [
                      { $gt: ['$$currentCount', '$$value.count'] },
                      { origin: '$$this', count: '$$currentCount' },
                      '$$value'
                    ]
                  }
                }
              }
            }
          }
        }
      },
      // 4. Ordenar por confiabilidade (melhores primeiro)
      { $sort: { paymentReliability: -1, latePayments: 1 } }
    ];

    const results = await Sale.aggregate(pipeline);

    // Formatar resposta
    const formatted = results.map(r => ({
      customerId: r.customerId.toString(),
      customerName: r.customerName || 'Cliente sem nome',
      totalTransactions: r.totalTransactions,
      totalRevenue: r.totalRevenue,
      onTimePayments: r.onTimePayments,
      latePayments: r.latePayments,
      averageDelayDays: r.averageDelayDays,
      paymentReliability: r.paymentReliability,
      mostFrequentOrigin: r.mostFrequentOrigin?.origin || 'unknown',
      hasPaymentIssues: r.latePayments > 0,
      reliabilityCategory:
        r.paymentReliability >= 95 ? 'Excelente' :
        r.paymentReliability >= 85 ? 'Bom' :
        r.paymentReliability >= 70 ? 'Regular' : 'Atenção Necessária'
    }));

    res.json(formatted);

  } catch (error) {
    console.error('[PaymentAnalysisAll] Error:', error);
    res.status(500).json({
      message: 'Erro ao gerar análise de pagamentos de todos os clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



module.exports = router;
