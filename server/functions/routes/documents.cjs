const express = require('express');
const Document = require('../models/Document.cjs');
const Company = require('../models/Company.cjs');
const Requisition = require('../models/Requisition.cjs');
const Sale = require('../models/Sale.cjs');
const { generateDocumentNumber } = require('../utils/documentUtils.cjs');
const Client = require('../models/Client.cjs');
const Supplier = require('../models/Supplier.cjs');
const { auth } = require('../middleware/auth.cjs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all documents with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      type,
      status,
      client,
      supplier,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { company: req.user.company._id };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (client) filter.client = client;
    if (supplier) filter.supplier = supplier;

    if (dateFrom || dateTo) {
      filter.issueDate = {};
      if (dateFrom) filter.issueDate.$gte = new Date(dateFrom);
      if (dateTo) filter.issueDate.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { number: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const documents = await Document.find(filter)
      .populate('client', 'name email')
      .populate('supplier', 'name email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get document by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      company: req.user.company._id
    })
      .populate('client')
      .populate('supplier')
      .populate('template')
      .populate('createdBy', 'firstName lastName')
      .populate('auditTrail.user', 'firstName lastName')
      .populate('requisition', 'number client items');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new document
router.post('/', auth, async (req, res) => {
  try {
    const {
      type,
      client,
      supplier,
      lineItems,
      dueDate,
      validUntil,
      currency,
      paymentTerms,
      notes,
      terms,
      template,
      requisition,  // NEW: Accept requisition ID
    } = req.body;

    // Generate document number ────────────────────────────────────────────────
    const company = req.user.company;
    let number;
    let nextNumberField = '';
    let prefix = '';

    // Determine prefix and counter field
    switch (type) {
      case 'invoice':
        prefix = company.invoiceNumberPrefix || 'INV-';
        nextNumberField = 'nextInvoiceNumber';
        break;
      case 'quotation':
        prefix = company.quotationNumberPrefix || 'QUO-';
        nextNumberField = 'nextQuotationNumber';
        break;
      case 'worksheet':
        prefix = company.worksheetNumberPrefix || 'WS-';
        nextNumberField = 'nextWorksheetNumber';
        break;
      case 'purchase_order':
        prefix = company.purchaseOrderNumberPrefix || 'PO-';
        nextNumberField = 'nextPurchaseOrderNumber';
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }

    // Safely read current counter with strong fallback & auto-repair
    let nextNumber = company[nextNumberField];

    if (
      typeof nextNumber !== 'number' ||
      isNaN(nextNumber) ||
      nextNumber < 1 ||
      !Number.isFinite(nextNumber)
    ) {
      console.warn(
        `Company ${company._id} has invalid/missing ${nextNumberField} ` +
        `(value: ${nextNumber}) — resetting to 1`
      );
      nextNumber = 1;

      // Fix it immediately in DB so next request starts correctly
      await Company.updateOne(
        { _id: company._id },
        { $set: { [nextNumberField]: 1 } }
      );
    }

    // Build the final document number
    number = `${prefix}${nextNumber}`;

    // ────────────────────────────────────────────────────────────────────────

    let requisitionId = null;
    if (requisition && requisition.trim() !== '' && requisition.length >= 24) {
      requisitionId = requisition;
    }

    const document = new Document({
      company: company._id,
      type,
      number,
      client: type === 'purchase_order' ? null : client,
      supplier: type === 'purchase_order' ? supplier : null,
      lineItems: lineItems || [],
      dueDate,
      validUntil,
      currency: currency || company.currency,
      paymentTerms: paymentTerms || company.paymentTerms,
      notes,
      terms,
      template,
      requisition: requisitionId,
      createdBy: req.user._id,
      auditTrail: [{
        action: 'created',
        user: req.user._id,
        details: `Document created as ${type}`
      }]
    });

    await document.save();

    // Atomically increment the counter (safer than read → write)
    await Company.updateOne(
      { _id: company._id },
      { $inc: { [nextNumberField]: 1 } }
    );

    const populatedDocument = await Document.findById(document._id)
      .populate('client')
      .populate('supplier')
      .populate('template')
      .populate('requisition', 'number client items');

    res.status(201).json(populatedDocument);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// documents.cjs (continuação)

// POST /api/documents/:id/convert-to-sale
// POST /api/documents/:id/convert-to-sale
router.post('/:id/convert-to-sale', auth, async (req, res) => {
  try {
    console.log(`[Convert-to-Sale] Iniciando conversão do documento: ${req.params.id}`);

    const document = await Document.findOne({
      _id: req.params.id,
      company: req.user.company._id,
    })
    .populate('client')
    .populate('requisition');

    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    if (document.type !== 'invoice') {
      return res.status(400).json({ 
        message: `Apenas invoices podem ser convertidas em venda. Tipo atual: ${document.type}` 
      });
    }

    if (document.convertedToSale) {
      return res.status(409).json({ message: 'Este documento já foi convertido em venda' });
    }

    // Lógica de origin
    let finalOrigin = 'internal';
    if (req.body.origin && req.body.origin !== 'internal') finalOrigin = req.body.origin;
    else if (document.origin && document.origin !== 'internal') finalOrigin = document.origin;
    else if (document.requisition?.origin) finalOrigin = document.requisition.origin;
    else if (document.notes?.includes('external')) finalOrigin = 'external';

    const Product = require('../models/Product.cjs');
    const Bundle = require('../models/Bundle.cjs');   // ← Importante!
    
    const saleItems = [];

    for (const li of document.lineItems || []) {
      let itemType = (li.itemType || 'Service').trim();
      let productId = li.productId || null;
      let finalItemType = itemType;

      // ==================== TRATAMENTO ESPECIAL PARA BUNDLE ====================
      if (itemType === 'Bundle' || itemType.toLowerCase() === 'bundle') {
        if (li.bundleId || li.productId) {   // bundleId ou productId pode estar no lineItem
          const bundleId = li.bundleId || li.productId;
          
          const bundle = await Bundle.findById(bundleId);
          
          if (bundle) {
            finalItemType = bundle.type;           // 'Combo' ou 'Subscription'
            console.log(`[Convert] Bundle ${bundle.name} convertido para itemType: ${finalItemType}`);
          } else {
            finalItemType = 'Combo'; // fallback seguro
            console.warn(`[Convert] Bundle não encontrado (ID: ${bundleId}) → usando Combo`);
          }
        } else {
          finalItemType = 'Combo'; // fallback se não tiver ID
        }
      }

      // Fallback: tentar encontrar produto pelo nome (para Products normais)
      if ((finalItemType === 'Product') && !productId && li.description) {
        const product = await Product.findOne({
          company: document.company,
          name: { $regex: new RegExp(`^${li.description.trim()}$`, 'i') }
        });
        if (product) productId = product._id;
      }

      const saleItem = {
        productId: productId,
        name: li.description || li.name || 'Item sem descrição',
        quantity: Number(li.quantity) || 1,
        priceAtSale: Number(li.unitPrice) || Number(li.price) || 0,
        itemType: finalItemType,                    // ← Aqui está a correção principal
      };

      // Atualização de stock (APENAS para Products reais, não para Combo/Subscription/Bundle)
      if (finalItemType === 'Product' && productId) {
        const product = await Product.findById(productId);
        if (product) {
          const qty = Number(li.quantity) || 0;

          if (product.stockQuantity < qty && !product.madeToOrder) {
            return res.status(400).json({ 
              error: `Stock insuficiente para ${product.name}. Disponível: ${product.stockQuantity}` 
            });
          }

          product.stockQuantity -= qty;
          await product.save();
        }
      }

      saleItems.push(saleItem);
    }

    // Criar a Venda
    const newSale = new Sale({
      company: document.company,
      origin: finalOrigin,
      documentId: document._id,
      items: saleItems,
      total: document.total || 0,
      amountPaid: document.total || 0,
      discount: { amount: document.discountAmount || 0 },
      paymentMethod: document.paymentMethod || 'Transferência',
      customer: document.client 
        ? { 
            id: document.client._id, 
            name: document.client.name, 
            phone: document.client.phone 
          }
        : { name: 'Consumidor Final' },
      status: 'Pago 100%',
      dueDate: document.dueDate,
      createdBy: req.user._id,
      notes: `Convertido do documento ${document.number} (${document.type})`,
    });

    await newSale.save();

    // Atualiza documento
    document.convertedToSale = newSale._id;
    document.convertedAt = new Date();
    if (!document.auditTrail) document.auditTrail = [];
    document.auditTrail.push({
      action: 'converted_to_sale',
      user: req.user._id,
      timestamp: new Date(),
      details: `Convertido para venda #${newSale._id}`
    });
    await document.save();

    res.status(201).json({
      success: true,
      message: 'Documento convertido em venda com sucesso.',
      saleId: newSale._id
    });

  } catch (err) {
    console.error('[Convert Document → Sale]', err);
    res.status(500).json({ 
      message: 'Erro ao converter documento em venda', 
      error: err.message 
    });
  }
});

// documents.cjs — Substitua apenas a rota convert-to-invoice

router.post('/:id/convert-to-invoice', auth, async (req, res) => {
  try {
    const original = await Document.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    if (!['quotation', 'worksheet'].includes(original.type)) {
      return res.status(400).json({ 
        error: 'Apenas quotation ou worksheet podem ser convertidas em invoice' 
      });
    }

    // Geração do número do documento
    const number = await generateDocumentNumber('invoice', req.user.company);

    const newInvoice = new Document({
      ...original.toObject(),
      _id: undefined,
      company: req.user.company._id,
      type: 'invoice',
      number,
      previousDocument: original._id,
      requisition: original.requisition,        // ← Mantém ligação com a requisição original
      status: 'draft',
      issueDate: new Date(),
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
      // Limpar campos desnecessários
      shareToken: undefined,
      shareExpiresAt: undefined,
      pdfPath: undefined,
      convertedTo: [],
      auditTrail: [],
    });

    await newInvoice.save();

    // ====================== ATUALIZAR A REQUISIÇÃO ORIGINAL ======================
    if (original.requisition) {
      await Requisition.findByIdAndUpdate(
        original.requisition,
        { 
          status: 'converted_to_invoice',
          $push: {
            auditTrail: {
              action: 'converted_to_invoice',
              user: req.user._id,
              details: `Convertido para Invoice ${newInvoice.number}`,
              timestamp: new Date()
            }
          }
        }
      );
    }

    // Atualiza o documento original (quotation/worksheet)
    original.status = 'converted';

    if (!original.convertedTo || !Array.isArray(original.convertedTo)) {
      original.convertedTo = [];
    }

    original.convertedTo.push({
      type: 'invoice',
      documentId: newInvoice._id,
      documentModel: 'Document',
      convertedAt: new Date(),
      convertedBy: req.user._id
    });

    await original.save();

    res.json({ 
      success: true, 
      newInvoice,
      message: `Documento convertido com sucesso para fatura ${newInvoice.number}`
    });

  } catch (err) {
    console.error('[convert-to-invoice] Erro:', err);
    res.status(500).json({ 
      error: 'Erro ao converter documento para fatura',
      details: err.message 
    });
  }
});

// Update document
router.put('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const updateData = { ...req.body };
    delete updateData.company;
    delete updateData.number;
    delete updateData.type;

    updateData.lastModifiedBy = req.user._id;

    // ──── Normalize reference fields ─────
    const normalizeId = (val) => {
      if (!val || val.trim() === '' || val === 'null' || val === 'undefined') {
        return null;  // or undefined — both safe for update
      }
      // Optional: add mongoose.isValidObjectId(val) check if you want strictness
      return val;
    };

    if ('client' in updateData)    updateData.client    = normalizeId(updateData.client);
    if ('supplier' in updateData)  updateData.supplier  = normalizeId(updateData.supplier);
    if ('requisition' in updateData) updateData.requisition = normalizeId(updateData.requisition);
    if ('template' in updateData)  updateData.template  = normalizeId(updateData.template);

    // Add audit trail
    if (!document.auditTrail) document.auditTrail = [];
    document.auditTrail.push({
      action: 'updated',
      user: req.user._id,
      details: 'Document updated'
    });

    Object.assign(document, updateData);
    await document.save();

    const updatedDocument = await Document.findById(document._id)
      .populate('client')
      .populate('supplier')
      .populate('template')
      .populate('requisition', 'number client items');

    res.json(updatedDocument);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Update document status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const document = await Document.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const oldStatus = document.status;
    document.status = status;
    document.lastModifiedBy = req.user._id;
    
    // Add audit trail
    document.auditTrail.push({
      action: 'status_changed',
      user: req.user._id,
      details: `Status changed from ${oldStatus} to ${status}`
    });

    await document.save();

    res.json({ message: 'Status updated successfully', document });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate share link (and optionally email it)
router.post('/:id/share', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const { to, cc } = req.body || {};

    // make sure we have a share token
    if (!document.shareToken || document.shareExpiresAt < new Date()) {
      document.shareToken = uuidv4();
      document.shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    // Add audit trail entry
    document.auditTrail.push({
      action: 'share_link_generated',
      user: req.user._id,
      details: 'Share link generated'
    });

    await document.save();

    const shareUrl = `${process.env.CLIENT_URL}/share/${document.shareToken}`;

    // if an email address was provided, send the link by email
    if (to) {
      const emailService = require('../utils/emailService.cjs');
      try {
        await emailService.sendDocumentLinkEmail(to, document, shareUrl, cc);
        document.auditTrail.push({
          action: 'share_email_sent',
          user: req.user._id,
          details: `Email sent to ${to}${cc ? ` cc ${cc}` : ''}`
        });
        await document.save();
      } catch (emailErr) {
        console.error('Error sending share email:', emailErr);
        // continue, we'll still return shareUrl
      }
    }

    res.json({
      message: 'Share link generated successfully' + (to ? ' and email sent' : ''),
      shareUrl,
      expiresAt: document.shareExpiresAt
    });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;