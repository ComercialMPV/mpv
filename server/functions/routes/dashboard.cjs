// routes/company.cjs  (ou crie dashboard.cjs)
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.cjs');
const User = require('../models/User.cjs');
const Product = require('../models/Product.cjs');
const Service = require('../models/Service.cjs');
const Bundle = require('../models/Bundle.cjs');
const Client = require('../models/Client.cjs');
const Lead = require('../models/Lead.cjs');
const Supplier = require('../models/Supplier.cjs');
const Proposal = require('../models/Proposal.cjs');
const Requisition = require('../models/Requisition.cjs');
const Document = require('../models/Document.cjs');
const Company = require('../models/Company.cjs');
const Sale = require('../models/Sale.cjs');

const entityModels = {
  users:       User,
  products:    Product,
  services:    Service,
  bundles:     Bundle,
  clients:     Client,
  leads:       Lead,
  suppliers:   Supplier,
  proposals:   Proposal,
  requisitions: Requisition,
  documents:   Document,
};

router.get('/usage-limits', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;

    const company = await Company.findById(companyId)
      .select('subscriptionPlan name')
      .lean();

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const plan = SUBSCRIPTION_PLANS[company.subscriptionPlan] || {};
    const isEnterprise = company.subscriptionPlan === 'enterprise';

    const limits = plan.maxLimits || {};
    const usage = {};

    // Contar em paralelo (muito mais rápido)
    await Promise.all(
      Object.entries(entityModels).map(async ([key, Model]) => {
        const count = await Model.countDocuments({
          company: companyId,
          isActive: { $ne: false }   // ignora inativos/arquivados quando aplicável
        });

        usage[key] = {
          current: count,
          max: isEnterprise ? '∞' : (limits[key] ?? '—'),
          percentage: isEnterprise 
            ? 0 
            : limits[key] ? Math.min(100, Math.round((count / limits[key]) * 100)) : 0
        };
      })
    );

    res.json({
      plan: {
        id: company.subscriptionPlan,
        name: plan.name || 'Sem plano',
        isEnterprise,
      },
      usage,
      companyName: company.name,
    });

  } catch (err) {
    console.error('Erro ao obter uso de limites:', err);
    res.status(500).json({ message: 'Erro ao carregar dados de utilização' });
  }
});

// NOVO ENDPOINT: Dashboard Analytics (dados reais para gráficos)
router.get('/analytics', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;

    // 1. STATUS DISTRIBUTION (dos documentos) - com labels em português
    const statusDistribution = await Document.aggregate([
      { $match: { company: companyId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { 
          _id: 0, 
          name: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'draft'] }, then: 'Rascunho' },
                { case: { $eq: ['$_id', 'sent'] }, then: 'Enviado' },
                { case: { $eq: ['$_id', 'paid'] }, then: 'Pago' },
                { case: { $eq: ['$_id', 'overdue'] }, then: 'Atrasado' },
                { case: { $eq: ['$_id', 'cancelled'] }, then: 'Cancelado' },
              ],
              default: '$_id'
            }
          }, 
          value: '$count' 
        } 
      },
    ]);

    // 2. TYPE DISTRIBUTION (dos documentos) - com labels em português
    const typeDistribution = await Document.aggregate([
      { $match: { company: companyId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { 
          _id: 0, 
          name: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'invoice'] }, then: 'Faturas' },
                { case: { $eq: ['$_id', 'quotation'] }, then: 'Cotações' },
                { case: { $eq: ['$_id', 'worksheet'] }, then: 'Guias de entrega' },
                { case: { $eq: ['$_id', 'purchase_order'] }, then: 'Ordens de Compra' },
              ],
              default: '$_id'
            }
          }, 
          value: '$count' 
        } 
      },
    ]);

    // 3. SALES FUNNEL - dados reais
    const totalLeads = await Lead.countDocuments({ company: companyId });

    const convertedLeads = await Client.countDocuments({ 
      company: companyId,
      source: 'lead' // Clientes que vieram de leads
    });

    const totalSales = await Sale.countDocuments({ company: companyId });

    const repeatCustomers = await Sale.aggregate([
      { $match: { company: companyId } },
      { $group: { 
          _id: '$customer._id', 
          count: { $sum: 1 } 
        } 
      },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' }
    ]);

    const repeatCustomerCount = repeatCustomers[0]?.total || 0;

    const salesFunnel = [
      { name: 'Leads Registados', value: totalLeads },
      { name: 'Convertidos p/ Cliente', value: convertedLeads },
      { name: 'Vendas Realizadas', value: totalSales },
      { name: 'Clientes Recorrentes', value: repeatCustomerCount },
    ];

    res.json({
      statusDistribution,
      typeDistribution,
      salesFunnel,
    });
  } catch (error) {
    console.error('Erro ao obter analytics:', error);
    res.status(500).json({ message: 'Erro ao carregar dados de analytics' });
  }
});

module.exports = router;