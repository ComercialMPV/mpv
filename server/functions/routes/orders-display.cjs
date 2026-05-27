// orders-display.cjs
const express = require('express');
const router = express.Router();
const Requisition = require('../models/Requisition.cjs');
const Sale = require('../models/Sale.cjs');
const { auth } = require('../middleware/auth.cjs');




// ====================== ROTA PÚBLICA PARA TV ======================
// Não requer autenticação (para tela pública na TV)
router.get('/display/public', async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    // Requisições (não pagas)
    const requisitions = await Requisition.find({
      status: { $nin: ['rejected', 'converted_to_invoice'] }
    })
      .populate('client', 'name phone')
      .populate({ path: 'items.item', select: 'name' })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Vendas (apenas as relevantes para display)
    const sales = await Sale.find({
      status: { $in: ['Pago 100%', 'Em Preparo', 'Pendente', 'Pronto'] }
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Normalizar Requisições
    const normalizedRequisitions = requisitions.map(req => ({
      _id: req._id,
      number: req.number,
      type: 'requisition',
      client: req.client || { name: 'Cliente Balcão' },
      items: req.items.map(item => ({
        name: item.item?.name || 'Item sem nome',
        quantity: item.quantity || 1,
      })),
      status: req.status,
      displayStatus: getDisplayStatus(req.status, 'requisition'),
      total: req.finalTotal || req.baseTotal || 0,
      createdAt: req.createdAt,
      isPaid: false,
      isDelivered: false
    }));

    // Normalizar Vendas
    const normalizedSales = sales.map(sale => ({
      _id: sale._id,
      number: sale._id.toString().slice(-6).toUpperCase(),
      type: 'sale',
      client: sale.customer || { name: 'Consumidor Final' },
      items: (sale.items || []).map(item => ({
        name: item.name || 'Item',
        quantity: item.quantity || 1,
      })),
      status: sale.status,
      displayStatus: getDisplayStatus(sale.status, 'sale'),
      total: sale.total || 0,
      createdAt: sale.createdAt,
      isPaid: true,
      isDelivered: sale.status === 'Pronto'
    }));

    const allOrders = [...normalizedRequisitions, ...normalizedSales]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Contadores
    const pendingRequisitions = normalizedRequisitions.length;
    const kitchenOrders = normalizedSales.filter(s => 
      ['Pago 100%', 'Em Preparo', 'Pendente'].includes(s.status)
    ).length;

    res.json({
      success: true,
      orders: allOrders,
      counters: {
        pendingRequisitions,
        kitchenOrders,
        totalOrders: allOrders.length
      }
    });

  } catch (error) {
    console.error('Public Display Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.use(auth);

// ====================== DISPLAY GERAL (TV / Monitor) ======================
// Mostra Requisições + Vendas (para sala de espera / balcão)
router.get('/display', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // 1. Requisições (pedidos não pagos)
    const requisitions = await Requisition.find({
      company: req.user.company._id,
      status: { $nin: ['rejected', 'converted_to_invoice'] } // excluir rejeitadas e já convertidas
    })
      .populate('client', 'name phone')
      .populate({ path: 'items.item', select: 'name' })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // 2. Vendas (pedidos pagos / confirmados)
    const sales = await Sale.find({
      company: req.user.company._id
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Normalizar Requisições
    const normalizedRequisitions = requisitions.map(req => ({
      _id: req._id,
      number: req.number,
      type: 'requisition',
      client: req.client || { name: 'Cliente Balcão' },
      items: req.items.map(item => ({
        name: item.item?.name || 'Item sem nome',
        quantity: item.quantity || 1,
      })),
      status: req.status,
      displayStatus: getDisplayStatus(req.status, 'requisition'),
      total: req.finalTotal || req.baseTotal || 0,
      createdAt: req.createdAt,
      isPaid: false
    }));

    // Normalizar Vendas
    const normalizedSales = sales.map(sale => ({
      _id: sale._id,
      number: sale._id.toString().slice(-6).toUpperCase(),
      type: 'sale',
      client: sale.customer || { name: 'Consumidor Final' },
      items: (sale.items || []).map(item => ({
        name: item.name || 'Item',
        quantity: item.quantity || 1,
      })),
      status: sale.status,
      displayStatus: getDisplayStatus(sale.status, 'sale'),
      total: sale.total || 0,
      createdAt: sale.createdAt,
      isPaid: true
    }));

    // Requisições primeiro, depois Vendas
    const allOrders = [...normalizedRequisitions, ...normalizedSales]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      orders: allOrders
    });

  } catch (error) {
    console.error('Orders Display Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====================== KITCHEN VIEW (Apenas Vendas) ======================
router.get('/kitchen', async (req, res) => {
  try {
    const sales = await Sale.find({
      company: req.user.company._id,
      status: { $in: ['Pago 100%', 'Em Preparo', 'Pendente', 'Pronto'] }
    })
      .sort({ createdAt: 1 }) // mais antigos primeiro na cozinha
      .lean();

    const normalizedSales = sales.map(sale => ({
      _id: sale._id,
      number: sale._id.toString().slice(-6).toUpperCase(),
      type: 'sale',
      client: sale.customer || { name: 'Consumidor Final' },
      items: (sale.items || []).map(item => ({
        name: item.name || 'Item',
        quantity: item.quantity || 1,
      })),
      status: sale.status,
      displayStatus: getDisplayStatus(sale.status, 'sale'),
      total: sale.total || 0,
      createdAt: sale.createdAt,
      isPaid: true
    }));

    res.json({
      success: true,
      kitchenOrders: normalizedSales
    });

  } catch (error) {
    console.error('Kitchen route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====================== MARCAR COMO PRONTO ======================
router.patch('/:type/:id/ready', async (req, res) => {
  const { type, id } = req.params;
  const { notes } = req.body || {};

  try {
    if (type === 'sale') {
      const sale = await Sale.findOneAndUpdate(
        { _id: id, company: req.user.company._id },
        { 
          status: 'Pronto',
          $push: { 
            auditTrail: { 
              action: 'marked_ready', 
              user: req.user._id, 
              notes: notes || 'Pedido pronto pela cozinha' 
            } 
          }
        },
        { new: true }
      );

      if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

      return res.json({ success: true, message: 'Venda marcada como pronta' });
    }

    return res.status(400).json({ message: 'Esta rota só aceita type=sale para cozinha' });

  } catch (error) {
    console.error('Mark as ready error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar' });
  }
});


// ====================== HELPER ======================
const getDisplayStatus = (status, type) => {
  const map = {
    pending: 'Aguardando Confirmação',
    approved: 'Em Preparo',
    quotation_requested: 'Cotação Solicitada',
    invoice_requested: 'Fatura Solicitada',
    converted_to_quotation: 'Cotação Gerada',
    converted_to_invoice: 'Convertido em Venda',
    rejected: 'Rejeitado',

    'Pago 100%': 'Pago & Em Preparo',
    'Pago 50%': 'Pagamento Parcial',
    Pendente: 'Em Espera',
    Reserva: 'Reserva',
    Cancelada: 'Cancelado',
    Pronto: '✓ Entregue',
    'Em Preparo': 'Em Preparo'
  };

  return map[status] || status || (type === 'requisition' ? 'Novo Pedido' : 'Em Processamento');
};

module.exports = router;