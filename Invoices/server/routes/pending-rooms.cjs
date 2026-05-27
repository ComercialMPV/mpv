const express = require('express');
const router = express.Router();
const PendingRoom = require('../models/PendingRoom.cjs');
const { auth, optionalAuth } = require('../middleware/auth.cjs');
const Product = require('../models/Product.cjs');
const emailService = require('../utils/emailService.cjs');

// Autenticar todas as rotas
router.use(auth);

// Criar novo room (Aguardando Pagamento) ou retornar já existente
router.post('/', async (req, res) => {
  try {
    const { clientName, clientPhone, clientId, partnerId: providedPartnerId } = req.body;
const userRoleName = req.user.role?.roleName || req.user.role;
// Lógica para determinar o partnerId
    let partnerId = (userRoleName === 'partner') ? req.user._id : providedPartnerId;
    // primeiro verificar se já existe um room aberto para este cliente (id, nome ou telefone)
    const query = {
      company: req.user.company,
      status: 'open',
      $or: []
    };
    if (clientId) query.$or.push({ clientId });
    if (clientName) query.$or.push({ clientName });
    if (clientPhone) query.$or.push({ clientPhone });

    let existing = null;
    if (query.$or.length > 0) {
      existing = await PendingRoom.findOne(query);
    }

    if (existing) {
      // return the existing room instead of creating a new one
      return res.json(existing);
    }

    const room = new PendingRoom({
      company: req.user.company,
      clientName,
      clientPhone,
      clientId,
      partnerId,
      items: [],
      status: 'open'
    });

    await room.save();

    // ensure the customer is in clients collection too
    try {
      const Client = require('../models/Client.cjs');
      if (!clientId && clientName) {
        let client = await Client.findOne({
          company: req.user.company,
          $or: [
            { name: clientName },
            ...(clientPhone ? [{ phone: clientPhone }] : [])
          ]
        });
        if (!client) {
          // Generate email if not provided
          const generateEmail = (name, phone) => {
            const sanitized = name.toLowerCase().replace(/\s+/g, '').substring(0, 20);
            const hash = phone ? phone.replace(/\D/g, '').slice(-4) : Math.random().toString(36).substring(7);
            return `${sanitized}${hash}@cliente.local`;
          };
          client = new Client({
            company: req.user.company,
            name: clientName,
            phone: clientPhone,
            email: generateEmail(clientName, clientPhone),
            createdBy: req.user._id
          });
          await client.save();
        }
        // link room to client record
        room.clientId = client._id;
        await room.save();
      }
    } catch (err) {
      console.warn('failed to ensure client record for room', err);
    }

    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Listar rooms (com filtro de status)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = { company: req.user.company };
    
    if (status) {
      query.status = status;
    }
    
    const rooms = await PendingRoom.find(query).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obter room específico
router.get('/:id', async (req, res) => {
  try {
    const room = await PendingRoom.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room não encontrado' });
    }
    
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obter room por ticket
router.get('/ticket/:code', async (req, res) => {
  try {
    const room = await PendingRoom.findOne({
      ticketCode: req.params.code,
      company: req.user.company
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Adicionar item ao room
router.post('/:id/items', async (req, res) => {
  try {
    const { itemId, name, price, qty, type } = req.body;
    
    const room = await PendingRoom.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room não encontrado' });
    }
    
    // Verificar se item já existe
    const existingItem = room.items.find(i => i.itemId === itemId);
    
    if (existingItem) {
      existingItem.qty += qty || 1;
    } else {
      room.items.push({
        itemId,
        name,
        price,
        qty: qty || 1,
        type
      });
    }
    
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remover item do room
// pending-rooms.cjs - dentro do router.delete('/:id/items/:itemId')

router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const { reason } = req.query;
    
    const room = await PendingRoom.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room não encontrado' });
    }
    
    // Log da remoção (opcional, mas bom para auditoria)
    if (reason) {
      const itemName = room.items.find(i => i._id.toString() === req.params.itemId)?.name || 'Item desconhecido';
      console.log(`[AUDIT] Item removido do room ${room.ticketCode}: ${itemName} - Motivo: ${reason}`);
    }
    
    // Remover o item
    room.items = room.items.filter(i => i._id.toString() !== req.params.itemId);
    
    // Se depois da remoção não houver mais itens → eliminar o room
    if (room.items.length === 0) {
      await PendingRoom.deleteOne({ _id: room._id });
      return res.json({ 
        message: 'Último item removido → room eliminado automaticamente',
        roomDeleted: true,
        ticketCode: room.ticketCode 
      });
    }
    
    // Caso contrário, só guarda as alterações
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar quantidade de item
router.patch('/:id/items/:itemId', async (req, res) => {
  try {
    const { qty } = req.body;
    
    const room = await PendingRoom.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room não encontrado' });
    }
    
    const item = room.items.find(i => i._id.toString() === req.params.itemId);
    if (item) {
      item.qty = qty;
    }
    
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fechar room (com status final)
// Fechar room (com status final) → converte para venda
router.post('/:id/close', auth, async (req, res) => {
  try {
    const { status, notes, amountPaidNow = 0 } = req.body; // amountPaidNow opcional (ex: para paid-50)

    const room = await PendingRoom.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!room) {
      return res.status(404).json({ error: 'Room não encontrado' });
    }

    // 1. Recuperar dados do parceiro (se existir no room)
    let partnerId = room.partnerId;
    let commissionRate = 0;
    let commissionValue = 0;

    if (partnerId) {
      const User = require('../models/User.cjs');
      const partner = await User.findById(partnerId);
      commissionRate = Number(partner?.commissionRate) || 0;
      commissionValue = (room.total || 0) * (commissionRate / 100);
    }

    if (room.status !== 'open') {
      return res.status(400).json({ error: 'Room já foi fechado' });
    }

    // Definir valores de pagamento conforme o status escolhido
    let finalSaleStatus = 'Pendente';
    let paidAmount = 0;
    let remaining = room.total;

    if (status === 'paid-full') {
      finalSaleStatus = 'Pago 100%';
      paidAmount = room.total;
      remaining = 0;
    } else if (status === 'paid-50') {
      finalSaleStatus = 'Pago 50%';
      // Usa valor real enviado (se existir), senão assume 50%
      paidAmount = Number(amountPaidNow) > 0 ? Number(amountPaidNow) : room.total * 0.5;
      remaining = room.total - paidAmount;
    } else if (status === 'reserved') {
      finalSaleStatus = 'Reserva';
      paidAmount = Number(amountPaidNow) || 0; // pode ter sinal / depósito
      remaining = room.total - paidAmount;
    } else {
      return res.status(400).json({ error: 'Status final inválido' });
    }

    // Atualizar o room primeiro
    room.status = 'closed';
    room.closedAt = new Date();
    room.closedBy = req.user._id;
    room.finalStatus = status;
    if (notes) {
      room.notes = (room.notes ? room.notes + '\n' : '') + notes;
    }

    await room.save();

    // Criar a venda correspondente
    const Sale = require('../models/Sale.cjs');

   const newSale = new Sale({
  company: req.user.company,
  createdBy: req.user._id,
  origin: 'pending-room',
  pendingRoomId: room._id,
// Mapeamento de parceiro para a venda
      partnerId: partnerId,
      commissionRate: commissionRate,
      commissionValue: commissionValue,
      netAmount: (room.total || 0) - commissionValue,
  customer: {
    id: room.clientId ? room.clientId.toString() : null,
    name: room.clientName,
    phone: room.clientPhone,
  },

  // ── ATUALIZAÇÃO IMPORTANTE: estrutura completa e consistente ──
  items: room.items.map((roomItem) => ({
    itemId: roomItem.itemId,
    name: roomItem.name,
    quantity: roomItem.qty || 1,                  // nome padronizado: quantity
    priceAtSale: roomItem.price || 0,             // nome que o Receipt espera
    unitPrice: roomItem.price || 0,               // redundante, mas útil para alguns recibos
    unit: roomItem.unit || 'unid',                // ← novo campo
    category: roomItem.category || '',            // ← novo campo
    type: roomItem.type || 'product',
    discount: roomItem.discount || 0,             // ← por item (se vier do room)
    subtotal: (roomItem.price || 0) * (roomItem.qty || 1),
    orderPrice: roomItem.orderPrice || 0,         // ← novo
    deliveryDays: roomItem.deliveryDays || 0,     // ← novo
    // Outros campos que possam existir no item original
    ...(roomItem.madeToOrder && { madeToOrder: roomItem.madeToOrder }),
  })),

  subtotal: room.subtotal || 0,
  discount: room.discount || 0,
  total: room.total || 0,

  amountPaid: paidAmount,
  remainingAmount: remaining,

  paymentMethod: 'Pendente', // pode ser atualizado depois
  status: finalSaleStatus,

  dueDate: remaining > 0 ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : null,

  notes: notes ? `Fechado como ${status} - ${notes}` : `Fechado como ${status}`,

  createdAt: new Date(),
});

await newSale.save();

    // Opcional: diminuir stock aqui (se ainda não foi feito quando adicionou itens)
for (const saleItem of newSale.items) {
  if (saleItem.itemType === 'Product' && saleItem.productId) {
    const product = await Product.findById(saleItem.productId);
    
    if (product) {
      // 1. Verificação de stock suficiente (antes de subtrair)
      if (product.stockQuantity < saleItem.quantity && !product.madeToOrder) {
        // Reverte a venda e o room se for estrito
        await Sale.findByIdAndDelete(newSale._id);
        room.status = 'open'; // reverte
        await room.save();
        
        return res.status(400).json({
          error: `Stock insuficiente para o produto "${product.name}". Disponível: ${product.stockQuantity}, solicitado: ${saleItem.quantity}`
        });
      }

      // 2. Atualiza o stock
      const oldStock = product.stockQuantity;
      product.stockQuantity -= saleItem.quantity;
      product.lastStockUpdate = new Date();

      // 3. Verifica se entrou em stock baixo (e envia email apenas se passou o limite agora)
      const minLevel = product.minStockLevel || 5;
      const wasLow = oldStock <= minLevel;
      const isNowLow = product.stockQuantity <= minLevel;

      if (isNowLow && !wasLow) {
        // Envia email de alerta de stock baixo
        try {
          // Quem criou a venda (para notificar o operador)
          const user = await require('../models/User.cjs').findById(req.user._id).select('firstName lastName email');
          
          // Email do responsável (podes ter um campo company.stockAlertEmail ou fixo)
          const alertEmails = [
            user?.email || 'admin@exemplo.com',                    // quem fez a venda
            'gerencia@kikipay.com',                                // email da gerência (ajusta)
            // ... podes adicionar mais
          ].filter(Boolean);

          const content = `
            <h2 style="color: #dc2626;">ALERTA: Stock baixo detectado</h2>
            <p>O produto <strong>${product.name}</strong> (SKU: ${product.sku || '—'}) atingiu stock crítico.</p>
            
            <div style="background: #fef2f2; padding: 16px; border-radius: 12px; border: 1px solid #fecaca; margin: 20px 0;">
              <p><strong>Detalhes:</strong></p>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>Stock atual: <strong>${product.stockQuantity}</strong></li>
                <li>Nível mínimo configurado: <strong>${minLevel}</strong></li>
                <li>Última venda: <strong>${saleItem.quantity} unid</strong> (venda #${newSale._id.toString().slice(-6)})</li>
                <li>Operador: <strong>${user ? user.firstName + ' ' + user.lastName : 'Sistema'}</strong></li>
              </ul>
            </div>

            <p><strong>Ação recomendada:</strong> Reabastecer o produto o mais rápido possível.</p>
            <p>Este é um alerta automático gerado pelo KikiPay ERP.</p>
          `;

          await emailService.sendMail({
            from: `"KikiPay ERP - Alerta Stock" <${process.env.SMTP_USER}>`,
            to: alertEmails.join(', '),
            subject: `⚠️ Stock baixo: ${product.name} (${product.stockQuantity} unid)`,
            html: baseTemplate(content, 'Alerta de Stock Baixo'),
          });

          console.log(`Email de stock baixo enviado para: ${alertEmails.join(', ')}`);
          
        } catch (emailErr) {
          console.error('Erro ao enviar email de stock baixo:', emailErr);
          // Não falha a venda por causa do email
        }
      }

      await product.save();
    }
  }
}

    // Resposta com ambos os documentos
    res.json({
      success: true,
      message: `Room fechado como ${status} e convertido em venda`,
      room: room.toObject(),
      sale: newSale.toObject(),
    });
  } catch (error) {
    console.error('[POST /pending-rooms/:id/close]', error);
    res.status(500).json({
      error: 'Erro ao fechar room e criar venda',
      details: error.message,
    });
  }
});

// Atualizar notas do room
router.patch('/:id', async (req, res) => {
  try {
    const { notes, discount } = req.body;
    
    const room = await PendingRoom.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room não encontrado' });
    }
    
    if (notes !== undefined) room.notes = notes;
    if (discount !== undefined) room.discount = discount;
    
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
