const express = require('express');
const Requisition = require('../models/Requisition.cjs');
const Service = require('../models/Service.cjs');
const Client = require('../models/Client.cjs');
const Company = require('../models/Company.cjs');
const { auth } = require('../middleware/auth.cjs');
const Product = require('../models/Product.cjs');   // ← ADICIONADO
const Bundle = require('../models/Bundle.cjs'); 
const emailService = require('../utils/emailService.cjs');    // ← ADICIONADO
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs'); // ← ADICIONADO
const router = express.Router();


// ====================== GET ALL (já estava boa, mas confirmada) ======================
// GET /api/requisitions - Listagem principal
router.get('/', auth, async (req, res) => {
  try {
    const requisitions = await Requisition.find({ 
      company: req.user.company._id 
    })
    .populate('client', 'name email contactPerson phone')
    .populate({
      path: 'items.item',
      select: 'name basePrice price billingPricePerCycle type shortDescription description image unit madeToOrder orderPrice deliveryDays'
    })
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .lean();   // lean() para melhor performance

    // Normalizar preço para o frontend (facilita muito no React)
    const normalizedRequisitions = requisitions.map(req => {
      const items = req.items.map(item => {
        let finalPrice = item.priceAtTime || 0;
        const itemDoc = item.item || {};

        if (item.itemType === 'Bundle' && itemDoc) {
          if (itemDoc.type === 'Subscription' || itemDoc.billingPricePerCycle) {
            finalPrice = itemDoc.billingPricePerCycle || itemDoc.price || finalPrice;
          } else {
            finalPrice = itemDoc.price || finalPrice;
          }
        } else if (!finalPrice) {
          finalPrice = itemDoc.basePrice || itemDoc.price || 0;
        }

        return {
          ...item,
          finalPrice,                    // ← campo útil para frontend
          itemName: itemDoc.name || 'Item sem nome',
          itemType: item.itemType
        };
      });

      return {
        ...req,
        items,
        totalFormatted: (req.finalTotal || req.baseTotal || 0).toFixed(2),
        
         type: 'requisition'
      };
    });

    res.json(normalizedRequisitions);

  } catch (error) {
    console.error('Fetch requisitions error:', error);
    res.status(500).json({ message: 'Erro ao carregar requisições' });
  }
});



// ← ROTA PÚBLICA: Submissão de Requisição Externa
router.post('/public-submit', async (req, res) => {
  try {
    const { clientData, requisitionData, companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId é obrigatório' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
    }

    // ================== CLIENTE ==================
    if (!clientData?.name || !clientData?.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome e email do cliente são obrigatórios' 
      });
    }

    const normalizedEmail = clientData.email.toLowerCase().trim();
    const normalizedPhone = clientData.phone?.trim() || null;
    const normalizedName = clientData.name.trim();

    let client = await Client.findOne({
      company: companyId,
      $or: [
        { email: normalizedEmail },
        { 
          name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
          phone: normalizedPhone 
        }
      ]
    });

    if (!client) {
      client = new Client({
        ...clientData,
        email: normalizedEmail,
        phone: normalizedPhone,
        name: normalizedName,
        company: companyId,
        origin: 'external',
        createdBy: null,
        currency: clientData.currency || company.currency || 'MT',
        paymentTerms: clientData.paymentTerms || 'Net 30',
        isActive: true
      });
      await client.save();
      console.log(`[Public Submit] Novo cliente criado: ${client.name}`);
    } else {
      // Atualiza apenas campos seguros
      client.name = normalizedName;
      client.email = normalizedEmail;
      client.phone = normalizedPhone;
      client.contactPerson = clientData.contactPerson || client.contactPerson;
      client.billingAddress = clientData.billingAddress || client.billingAddress;
      client.shippingAddress = clientData.shippingAddress || client.shippingAddress;
      client.notes = clientData.notes || client.notes;
      await client.save();
    }

    // ================== PROCESSAR ITENS ==================
    const ServiceModel = require('../models/Service.cjs');
    const ProductModel = require('../models/Product.cjs');
    const BundleModel = require('../models/Bundle.cjs');

    const processedItems = [];

    for (const item of (requisitionData.items || [])) {
      let doc = null;
      let detectedType = null;
      let priceAtTime = 0;

      // Tenta Bundle primeiro
      doc = await BundleModel.findById(item.item);
      if (doc) {
        detectedType = 'Bundle';
        if (doc.type === 'Subscription') {
          priceAtTime = doc.billingPricePerCycle || doc.price || 0;
        } else {
          priceAtTime = doc.price || 0;
        }
      }

      // Depois Service
      if (!doc) {
        doc = await ServiceModel.findById(item.item);
        if (doc) {
          detectedType = 'Service';
          priceAtTime = doc.basePrice || 0;
        }
      }

      // Depois Product
      if (!doc) {
        doc = await ProductModel.findById(item.item);
        if (doc) {
          detectedType = 'Product';
          priceAtTime = doc.basePrice || doc.price || 0;
        }
      }

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: `Item com ID ${item.item} não encontrado`
        });
      }

      if (doc.company.toString() !== companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: `Item ${item.item} não pertence à empresa`
        });
      }

      processedItems.push({
        itemType: detectedType,
        item: doc._id,
        quantity: Number(item.quantity) || 1,
        priceAtTime: priceAtTime,                    // ← Agora correto!
        madeToOrder: !!item.isMadeToOrder,
        orderPrice: Number(item.priceAtOrder) || 0,
        deliveryDays: Number(doc.deliveryDays) || 0
      });
    }

    if (processedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A requisição deve conter pelo menos um item'
      });
    }

    // ================== CRIAR REQUISIÇÃO ==================
    const count = await Requisition.countDocuments({ company: companyId });

    const requisition = new Requisition({
      number: `EXT-${2000 + count + 1}`,
      company: companyId,
      client: client._id,
      items: processedItems,
      origin: 'external',
      requestedInstallments: Number(requisitionData.requestedInstallments) || 1,
      deliveryDate: requisitionData.deliveryDate ? new Date(requisitionData.deliveryDate) : undefined,
      notes: requisitionData.notes?.trim() || undefined,
      requestIntent: requisitionData.requestIntent || 'quotation',
      status: requisitionData.requestIntent === 'invoice' ? 'invoice_requested' : 'quotation_requested',
    });

    await requisition.save();

    // ================== NOTIFICAÇÃO ==================
    if (company.email && client.email) {
      try {
        const populatedRequisition = await Requisition.findById(requisition._id)
          .populate('items.item')
          .lean();

        await emailService.sendNewRequisitionNotification(
          client.email,
          company.email,
          client.phone,
          populatedRequisition,
          client.toObject(),
          company.toObject()
        );
      } catch (emailErr) {
        console.error('Erro ao enviar email:', emailErr);
      }
    }

    return res.status(201).json({
      success: true,
      requisitionId: requisition._id.toString(),
      number: requisition.number,
      clientId: client._id.toString(),
      message: 'Requisição submetida com sucesso! Em breve entraremos em contacto.'
    });

  } catch (error) {
    console.error('Erro em /public-submit:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar a requisição'
    });
  }
});

// Create a requisition
// ====================== CREATE (POST /) - AGORA SUPORTA SERVICE + PRODUCT + BUNDLE ======================
router.post('/', auth, checkSubscriptionLimit('requisitions'), async (req, res) => {
  try {
    const { items, requestedInstallments, client, deliveryDate, notes, requestIntent } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const processedItems = [];

    for (const it of items) {
      const { itemType, item: itemId, quantity } = it;

      let doc;
      let detectedPrice = 0;
     let priceFieldUsed = 'price';
     if (itemType.toLowerCase() === 'service') {
    doc = await Service.findById(itemId);
    detectedPrice = doc?.basePrice || 0;
  } 
  else if (itemType.toLowerCase() === 'product') {
    doc = await Product.findById(itemId);
    detectedPrice = doc?.basePrice || doc?.price || 0;
  } 
  else if (itemType.toLowerCase() === 'bundle') {
    doc = await Bundle.findById(itemId);
    if (doc) {
      if (doc.type === 'Subscription') {
        detectedPrice = doc.billingPricePerCycle || doc.price || 0;
        priceFieldUsed = 'billingPricePerCycle';
      } else {
        // Combo normal
        detectedPrice = doc.price || 0;
        priceFieldUsed = 'price';
      }
    }
  }

  if (!doc) {
    return res.status(404).json({ message: `${itemType} ${itemId} not found` });
  }

  const normalizedType = itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase();

  processedItems.push({
    itemType: normalizedType,
    item: doc._id,
    quantity: Number(quantity),
    priceAtTime: detectedPrice,           // ← Snapshot importante
    bundlePriceType: priceFieldUsed,      // ← Novo campo útil para frontend
  });
}

    const count = await Requisition.countDocuments({ company: req.user.company._id });
    const number = `REQ-${1000 + count + 1}`;

    const requisition = new Requisition({
      number,
      company: req.user.company._id,
      client,
      origin: 'internal',
      items: processedItems,
      requestedInstallments: Number(requestedInstallments) || 1,
      deliveryDate,
      notes,
      requestIntent: requestIntent || 'quotation',
      createdBy: req.user._id
    });

    await requisition.save();

    // Populate para devolver ao frontend
    const populatedReq = await Requisition.findById(requisition._id)
      .populate('client', 'name email')
      .populate({
        path: 'items.item',
        select: 'name basePrice price'
      })
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(populatedReq);
  } catch (error) {
    console.error('Create requisition error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get single requisition details
// Em router.get('/:id', ...) e também no GET '/'
// GET /api/requisitions/:id - Detalhe completo
router.get('/:id', auth, async (req, res) => {
  try {
    let requisition = await Requisition.findOne({
      _id: req.params.id,
      company: req.user.company._id
    })
    .populate('client', 'name email contactPerson phone')
    .populate({
      path: 'items.item',
      select: 'name basePrice price billingPricePerCycle type shortDescription description image unit madeToOrder orderPrice deliveryDays'
    })
    .populate('createdBy', 'firstName lastName email')
    .lean();

    if (!requisition) {
      return res.status(404).json({ message: 'Requisição não encontrada' });
    }

    // Normalizar cada item com preço correto
    const normalizedItems = requisition.items.map(item => {
      const itemDoc = item.item || {};
      let finalPrice = item.priceAtTime || 0;

      if (item.itemType === 'Bundle' && itemDoc) {
        if (itemDoc.type === 'Subscription') {
          finalPrice = itemDoc.billingPricePerCycle || itemDoc.price || finalPrice;
        } else {
          // Combo normal
          finalPrice = itemDoc.price || finalPrice;
        }
      } else if (finalPrice === 0) {
        finalPrice = itemDoc.basePrice || itemDoc.price || 0;
      }

      return {
        ...item,
        finalPrice,
        itemName: itemDoc.name || 'Item sem nome',
        itemImage: itemDoc.image,
        itemType: item.itemType,
        // campos extras úteis
        unit: itemDoc.unit,
        madeToOrder: item.madeToOrder || itemDoc.madeToOrder
      };
    });

    // Adicionar campos calculados no nível da requisição
    const response = {
      ...requisition,
      items: normalizedItems,
      totalFormatted: (requisition.finalTotal || requisition.baseTotal || 0).toFixed(2),
      currency: requisition.currency || 'MT'
    };

    res.json(response);

  } catch (error) {
    console.error('Get requisition by id error:', error);
    res.status(500).json({ message: 'Erro ao carregar detalhes da requisição' });
  }
});
// Update status specifically
// Update status specifically
// Update status specifically
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  // Updated to match frontend/model enum
  const allowedStatuses = ['pending', 'approved', 'rejected', 'converted_to_invoice'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const requisition = await Requisition.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      { status },
      { new: true, runValidators: true, lean: true } // lean for perf
    )
      .populate('client', 'name email') // Direct client populate
      .populate('items.item', 'name unit basePrice')
      .populate('createdBy', 'firstName lastName email');

    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found' });
    }

    res.json(requisition);
  } catch (error) {
    console.error('Status update error:', error); // Log for debugging
    res.status(400).json({ message: error.message || 'Failed to update status' });
  }
});

// PUT /api/requisitions/:id - Atualizar requisição
router.put('/:id', auth, async (req, res) => {
  try {
    const { items, requestedInstallments, client, deliveryDate, notes, requestIntent } = req.body;

    const requisition = await Requisition.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!requisition) {
      return res.status(404).json({ message: 'Requisição não encontrada' });
    }

    // ==================== ATUALIZAÇÃO DE ITENS ====================
    if (items && Array.isArray(items)) {
      const ServiceModel = require('../models/Service.cjs');
      const ProductModel = require('../models/Product.cjs');
      const BundleModel = require('../models/Bundle.cjs');

      const processedItems = [];
      let subtotal = 0;
      let minAllowedInstallments = 99;
      let maxPenaltyRate = 0;
      let hasServices = false;

      for (const it of items) {
        const { itemType, item: itemId, quantity } = it;
        let doc = null;
        let priceAtTime = 0;

        const normalizedType = itemType && typeof itemType === 'string'
          ? itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase()
          : 'Service';

        if (normalizedType === 'Service') {
          doc = await ServiceModel.findById(itemId);
          if (doc) {
            priceAtTime = doc.basePrice || 0;
            hasServices = true;
            minAllowedInstallments = Math.min(minAllowedInstallments, doc.allowedInstallments || 1);
            maxPenaltyRate = Math.max(maxPenaltyRate, doc.penaltyPercentagePerInstallment || 0);
          }
        } 
        else if (normalizedType === 'Product') {
          doc = await ProductModel.findById(itemId);
          if (doc) priceAtTime = doc.basePrice || doc.price || 0;
        } 
        else if (normalizedType === 'Bundle') {
          doc = await BundleModel.findById(itemId);
          if (doc) {
            if (doc.type === 'Subscription') {
              priceAtTime = doc.billingPricePerCycle || doc.price || 0;
            } else {
              priceAtTime = doc.price || 0;
            }
          }
        }

        if (!doc) {
          return res.status(404).json({ 
            message: `Item do tipo ${normalizedType} com ID ${itemId} não encontrado` 
          });
        }

        processedItems.push({
          itemType: normalizedType,
          item: doc._id,
          quantity: Number(quantity) || 1,
          priceAtTime: priceAtTime
        });

        subtotal += priceAtTime * (Number(quantity) || 1);
      }

      // Atualiza os itens e totais
      requisition.items = processedItems;

      let finalTotal = subtotal;
      const inst = Number(requestedInstallments) || requisition.requestedInstallments || 1;

      if (hasServices && inst > minAllowedInstallments) {
        const extra = inst - minAllowedInstallments;
        finalTotal += subtotal * (extra * (maxPenaltyRate / 100));
      }

      requisition.finalTotal = finalTotal;
      requisition.baseTotal = subtotal;
    }

    // ==================== CAMPOS SIMPLES ====================
    if (client !== undefined) requisition.client = client;
    if (requestedInstallments !== undefined) requisition.requestedInstallments = Number(requestedInstallments);
    if (deliveryDate !== undefined) requisition.deliveryDate = deliveryDate ? new Date(deliveryDate) : undefined;
    if (notes !== undefined) requisition.notes = notes;
    if (requestIntent !== undefined) requisition.requestIntent = requestIntent;

    await requisition.save();

    // Retorna a requisição atualizada com populate
    const updatedReq = await Requisition.findById(requisition._id)
      .populate('client', 'name email contactPerson phone')
      .populate({
        path: 'items.item',
        select: 'name basePrice price billingPricePerCycle type'
      })
      .populate('createdBy', 'firstName lastName email');

    res.json(updatedReq);

  } catch (error) {
    console.error('Update requisition error:', error);
    res.status(400).json({ message: error.message || 'Erro ao atualizar requisição' });
  }
});
// Add to requisitions.cjs
router.delete('/:id', auth, async (req, res) => {
  try {
    const requisition = await Requisition.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;