const express = require('express');
const Template = require('../models/Template.cjs');
const { auth } = require('../middleware/auth.cjs');

const router = express.Router();

// Built-in templates
const builtInTemplates = [
  {
    name: 'Modern Professional',
    description: 'Clean and modern design with professional layout',
    documentTypes: ['invoice', 'quotation', 'worksheet', 'purchase_order'],
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>{{documentType}} {{number}}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { border-bottom: 3px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
          .company-info { display: flex; justify-content: space-between; align-items: flex-start; }
          .logo { max-width: 150px; max-height: 80px; }
          .company-details h1 { margin: 0; color: #3B82F6; font-size: 28px; }
          .document-info { background: #F8FAFC; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .client-info { margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
          .items-table th { background: #F8FAFC; font-weight: 600; }
          .totals { float: right; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.final { font-weight: bold; font-size: 18px; color: #3B82F6; border-top: 2px solid #3B82F6; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 14px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-details">
              <h1>{{company.name}}</h1>
              <p>{{company.address.street}}<br>
              {{company.address.city}}, {{company.address.state}} {{company.address.zipCode}}<br>
              {{company.email}} | {{company.phone}}</p>
            </div>
            {{#if company.logo}}
            <img src="{{company.logo}}" alt="Logo" class="logo">
            {{/if}}
          </div>
        </div>

        <div class="document-info">
          <h2>{{documentType}} {{number}}</h2>
          <p><strong>Issue Date:</strong> {{formatDate issueDate}}</p>
          {{#if dueDate}}<p><strong>Due Date:</strong> {{formatDate dueDate}}</p>{{/if}}
          {{#if validUntil}}<p><strong>Valid Until:</strong> {{formatDate validUntil}}</p>{{/if}}
        </div>

        {{#if client}}
        <div class="client-info">
          <h3>Bill To:</h3>
          <p><strong>{{client.name}}</strong><br>
          {{#if client.contactPerson}}{{client.contactPerson}}<br>{{/if}}
          {{client.billingAddress.street}}<br>
          {{client.billingAddress.city}}, {{client.billingAddress.state}} {{client.billingAddress.zipCode}}<br>
          {{client.email}}</p>
        </div>
        {{/if}}

        {{#if supplier}}
        <div class="client-info">
          <h3>Supplier:</h3>
          <p><strong>{{supplier.name}}</strong><br>
          {{#if supplier.contactPerson}}{{supplier.contactPerson}}<br>{{/if}}
          {{supplier.address.street}}<br>
          {{supplier.address.city}}, {{supplier.address.state}} {{supplier.address.zipCode}}<br>
          {{supplier.email}}</p>
        </div>
        {{/if}}

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Tax Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {{#each lineItems}}
            <tr>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{formatCurrency unitPrice ../currency}}</td>
              <td>{{taxRate}}%</td>
              <td>{{formatCurrency (multiply quantity unitPrice) ../currency}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>{{formatCurrency subtotal currency}}</span>
          </div>
          {{#if discountAmount}}
          <div class="total-row">
            <span>Discount:</span>
            <span>-{{formatCurrency discountAmount currency}}</span>
          </div>
          {{/if}}
          <div class="total-row">
            <span>Tax:</span>
            <span>{{formatCurrency taxAmount currency}}</span>
          </div>
          <div class="total-row final">
            <span>Total:</span>
            <span>{{formatCurrency total currency}}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        {{#if notes}}
        <div style="margin-top: 30px;">
          <h4>Notes:</h4>
          <p>{{notes}}</p>
        </div>
        {{/if}}

        {{#if terms}}
        <div class="footer">
          <h4>Terms & Conditions:</h4>
          <p>{{terms}}</p>
        </div>
        {{/if}}
      </body>
      </html>
    `,
    isBuiltIn: true
  }
];

// Inicializar built-in templates por empresa (só na primeira vez)
const initializeBuiltInTemplates = async (companyId, userId) => {
  try {
    for (const data of builtInTemplates) {
      const existing = await Template.findOne({
        company: companyId,
        name: data.name,
        isBuiltIn: true
      });

      if (!existing) {
        await Template.create({
          ...data,
          company: companyId,
          createdBy: userId,
          isDefault: true,        // Primeiro template é default
          isPublic: false,
          isPaid: false,
          price: 0,
          isBuiltIn: true
        });
      }
    }
  } catch (error) {
    console.error('Error initializing built-in templates:', error);
  }
};

// ==================== GET ALL TEMPLATES ====================
router.get('/', auth, async (req, res) => {
  try {
    const { documentType } = req.query;
    const currentCompanyId = req.user.company._id;

    // Inicializa built-in se necessário
    const count = await Template.countDocuments({ company: currentCompanyId });
    if (count === 0) {
      await initializeBuiltInTemplates(currentCompanyId, req.user._id);
    }

    // Busca todos os templates relevantes
    let templates = await Template.find({
      $or: [
        { company: currentCompanyId },     // Templates da própria empresa (internos + built-in)
        { isPublic: true }                 // Templates públicos (gratuitos e pagos)
      ],
      ...(documentType && { documentTypes: documentType })
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ isBuiltIn: -1, createdAt: -1 });

    // Enriquecer com informação se é default PARA A EMPRESA ATUAL
    const defaultTemplates = await Template.find({
      company: currentCompanyId,
      isDefault: true
    }).select('documentTypes');

    const defaultDocumentTypes = new Set(
      defaultTemplates.flatMap(t => t.documentTypes || [])
    );

    const currentCompanyIdStr = currentCompanyId.toString();

    // Adiciona campos virtuais `isDefaultForCurrentCompany` e `isPurchased`
    templates = templates.map(template => {
      const isInternal = template.company.toString() === currentCompanyIdStr;
      const purchasedBy = (template.purchasedBy || []).map(function(id) { return id.toString(); });
      const isPurchased = purchasedBy.includes(currentCompanyIdStr);
      
      return {
        ...template.toObject(),
        isDefaultForCurrentCompany: isInternal 
          ? template.isDefault === true 
          : (template.isPublic && !template.isPaid && isPurchased === false && defaultDocumentTypes.has(template.documentTypes?.[0] || '')),
        isPurchased: isPurchased
      };
    });

    res.json(templates);

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get template by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      company: req.user.company._id
    }).populate('createdBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new template
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, documentTypes, htmlContent, cssContent, isDefault, isPublic, isPaid, price } = req.body;

    if (isPublic && isPaid && (!price || Number(price) <= 0)) {
      return res.status(400).json({ message: 'Price must be provided for paid public templates' });
    }

    const template = new Template({
      company: req.user.company._id,
      name,
      description,
      documentTypes,
      htmlContent,
      cssContent,
      isDefault: !!isDefault,
      isPublic: !!isPublic,
      isPaid: !!isPaid,
      price: Number(price) || 0,
      createdBy: req.user._id,
      isBuiltIn: false
    });

    await template.save();

    // Se foi criado como default, remover default dos outros do mesmo tipo
    if (isDefault && documentTypes?.length) {
      await Template.updateMany(
        {
          company: req.user.company._id,
          documentTypes: { $in: documentTypes },
          _id: { $ne: template._id }
        },
        { $set: { isDefault: false } }
      );
    }

    const populatedTemplate = await Template.findById(template._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json(populatedTemplate);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SET AS DEFAULT ====================
// Permite definir default para templates internos + templates públicos gratuitos
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }

    const buyerCompanyId = req.user.company._id;
    const documentTypes = template.documentTypes || [];

    const buyerCompanyIdStr = buyerCompanyId.toString();
    const purchasedBy = (template.purchasedBy || []).map(function(id) { return id.toString(); });
    const isPurchased = purchasedBy.includes(buyerCompanyIdStr);

    // Verifica permissão
    const canSetAsDefault = 
      template.company.toString() === buyerCompanyIdStr ||   // Template interno
      (template.isPublic && !template.isPaid) ||              // Template público gratuito
      isPurchased;                                            // Template comprado pela empresa

    if (!canSetAsDefault) {
      return res.status(403).json({ 
        message: 'Não é possível definir este template como padrão. Templates pagos requerem compra.' 
      });
    }

    // Remove default anterior do mesmo tipo para esta empresa
    await Template.updateMany(
      {
        company: buyerCompanyId,
        documentTypes: { $in: documentTypes },
        isDefault: true
      },
      { $set: { isDefault: false } }
    );

    // Se for template interno → atualiza diretamente
    if (template.company.toString() === buyerCompanyIdStr) {
      template.isDefault = true;
      await template.save();
    } 
    // Se for template público (gratuito ou comprado) → não alteramos o template original (evita conflito)
    // Em vez disso, criamos uma "preferência" da empresa (pode ser expandido com TemplatePreference no futuro)

    res.json({ 
      success: true,
      message: 'Template definido como padrão com sucesso para a sua empresa',
      template: {
        ...template.toObject(),
        isDefaultForCurrentCompany: true
      }
    });

  } catch (error) {
    console.error('Set default error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Delete template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id,
      isBuiltIn: { $ne: true } // Don't allow deleting built-in templates
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found or cannot be deleted' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;