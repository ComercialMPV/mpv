const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Company = require('../models/Company.cjs');
const Subscription = require('../models/Subscription.cjs');
const { auth } = require('../middleware/auth.cjs');
// const { Storage } = require('@google-cloud/storage');
const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const router = express.Router();





// Get company profile (single handler)
// Get company profile - Versão melhorada
router.get('/profile', auth, async (req, res) => {
  try {
    // Garantir que temos um companyId válido
    let companyId = null;

    if (req.user.company) {
      companyId = typeof req.user.company === 'object' 
        ? req.user.company._id || req.user.company 
        : req.user.company;
    }

    if (!companyId) {
      console.error('[Company Profile] req.user.company está vazio para user:', req.user._id);
      return res.status(404).json({ 
        message: 'Company not found',
        detail: 'Utilizador não tem empresa associada'
      });
    }

    const company = await Company.findById(companyId)
      .select('-__v')   // remove versão interna do mongoose
      .lean();          // mais rápido (retorna objeto simples)

    if (!company) {
      console.error('[Company Profile] Empresa não encontrada no BD com ID:', companyId);
      return res.status(404).json({ message: 'Company not found' });
    }

    console.log('[Company Profile] Sucesso →', company.name);

    res.json(company);

  } catch (error) {
    console.error('[Company Profile] Erro:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET /api/company/referral-enabled
router.get('/referral-enabled', async (req, res) => {
  try {
    const companies = await Company.find({
      referralProgramEnabled: true,
      isActive: { $ne: false }
    })
    .select('name referralCommissionRate')
    .lean();

    res.json(companies);
  } catch (err) {
    console.error('Erro ao buscar empresas com referral:', err);
    res.status(500).json({ message: 'Erro ao carregar empresas' });
  }
});


router.put('/profile', auth, async (req, res) => {
  try {
    // allow update of banking/mobilewallets as well
    const allowedFields = [
      'name',
      'email',
      'phone',
      'website',
      'address',
      'currency',
      'paymentTerms',
      'invoiceNumberPrefix',
      'quotationNumberPrefix',
      'worksheetNumberPrefix',
      'purchaseOrderNumberPrefix',
      'taxId',
      'vatNumber',
      'bankAccounts',
      'mobileWallets',
      'debitoMerchantId',
      'debitoPat',
      'debitoWebhookSecret',
      'referralProgramEnabled',     // ← ADICIONADO
      'referralCommissionRate',     // ← ADICIONADO (opcional)
      'referralCommissionPeriod'    // ← ADICIONADO (opcional)
      // 'logo' is still handled via /logo
    ];

    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // merge address if provided
    if (req.body.address) {
      updateData.address = { ...req.user.company.address, ...req.body.address };
    }

    const company = await Company.findByIdAndUpdate(
      req.user.company._id,
      { $set: updateData },
      { new: true, runValidators: true, context: 'query' }
    ).select('-__v');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // update the cached user object when possible
    req.user.company = company;

    res.json({
      message: 'Company profile updated successfully',
      company,
    });
  } catch (err) {
    console.error('Update company profile error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload company logo
router.post('/upload-logo', auth, async (req, res) => {
  try {
    // Parseia o multipart/form-data manualmente
    const { files, fields } = await parseMultipart(req);

    // Pega o ficheiro do campo 'logo'
    const logoFile = files.find(f => f.fieldname === 'logo');
    if (!logoFile) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada no campo "logo"' });
    }

    // Definir nome do ficheiro
    const fileName = `logos/${req.user.company._id}-${Date.now()}${path.extname(logoFile.originalname)}`;
    const blob = bucket.file(fileName);

    // Upload para o Google Cloud Storage
    await blob.save(logoFile.buffer, {
      metadata: { contentType: logoFile.mimetype }
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Atualizar no banco
    const company = await Company.findByIdAndUpdate(
      req.user.company._id,
      { logo: publicUrl },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    res.json({
      message: 'Logo atualizado com sucesso',
      logo: company.logo
    });
  } catch (error) {
    console.error('Erro no upload de logo:', error);
    res.status(500).json({ message: error.message || 'Erro interno no upload' });
  }
});

// Get company settings
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = {
      currency: req.user.company.currency,
      taxRate: req.user.company.taxRate,
      paymentTerms: req.user.company.paymentTerms,
      invoiceNumberPrefix: req.user.company.invoiceNumberPrefix,
      quotationNumberPrefix: req.user.company.quotationNumberPrefix,
      worksheetNumberPrefix: req.user.company.worksheetNumberPrefix,
      purchaseOrderNumberPrefix: req.user.company.purchaseOrderNumberPrefix,
      nextInvoiceNumber: req.user.company.nextInvoiceNumber,
      nextQuotationNumber: req.user.company.nextQuotationNumber,
      nextWorksheetNumber: req.user.company.nextWorksheetNumber,
      nextPurchaseOrderNumber: req.user.company.nextPurchaseOrderNumber,
      menuVisibility: req.user.company.menuVisibility ? Object.fromEntries(req.user.company.menuVisibility) : {}
    };

    res.json(settings);
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update company settings
router.put('/settings', auth, async (req, res) => {
  try {
    const allowedFields = [
      'currency',
      'taxRate',
      'paymentTerms',
      'invoiceNumberPrefix',
      'quotationNumberPrefix',
      'worksheetNumberPrefix',
      'purchaseOrderNumberPrefix',
      'menuVisibility'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // convert menuVisibility plain object into Map if necessary
    if (updateData.menuVisibility && !(updateData.menuVisibility instanceof Map)) {
      updateData.menuVisibility = new Map(Object.entries(updateData.menuVisibility));
    }

    const company = await Company.findByIdAndUpdate(
      req.user.company._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ message: 'Settings updated successfully', company });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/company/public-portal/publish
// routes/company.cjs  (ou onde estiver esta rota)
router.post('/public-portal/publish', auth, async (req, res) => {
  try {
    const { 
      variant = 'default', 
      customSlug, 
      subdomainPrefix, 
      customDomain 
    } = req.body;

    // ==================== CARREGA COMPANY ====================
    await req.user.populate('company');

    // ==================== VALIDAÇÕES ====================

    // Variant
    if (!variant || typeof variant !== 'string' || !variant.trim()) {
      return res.status(400).json({ message: 'Variante inválida' });
    }

    // Subdomain Prefix (se fornecido)
    let finalSubdomainPrefix = null;
    if (subdomainPrefix) {
      finalSubdomainPrefix = subdomainPrefix
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (finalSubdomainPrefix.length < 3) {
        return res.status(400).json({ message: 'O prefixo do subdomínio deve ter pelo menos 3 caracteres' });
      }
    }

    // Custom Domain (se fornecido)
    let finalCustomDomain = null;
    if (customDomain) {
      finalCustomDomain = customDomain.trim().toLowerCase();
      // Validação básica de domínio
      if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(finalCustomDomain)) {
        return res.status(400).json({ message: 'Domínio personalizado inválido' });
      }
    }

    // ==================== SLUG ====================
    let slug = customSlug 
      ? customSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : null;

    // Se não foi fornecido slug, gera automaticamente a partir do nome da empresa
    if (!slug) {
      slug = req.user.company.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    // Verifica se o slug já está em uso por outra empresa
    const existingSlug = await Company.findOne({
      _id: { $ne: req.user.company._id },
      'publicPortal.slug': slug,
      'publicPortal.enabled': true
    });

    if (existingSlug) {
      return res.status(409).json({ message: 'Este slug já está em uso por outra empresa' });
    }

    // Verifica se o subdomainPrefix já está em uso
    if (finalSubdomainPrefix) {
      const existingSubdomain = await Company.findOne({
        _id: { $ne: req.user.company._id },
        'publicPortal.subdomainPrefix': finalSubdomainPrefix,
        'publicPortal.enabled': true
      });

      if (existingSubdomain) {
        return res.status(409).json({ message: 'Este prefixo de subdomínio já está em uso' });
      }
    }

    // ==================== ATUALIZAÇÃO ====================
    const updatedCompany = await Company.findByIdAndUpdate(
      req.user.company._id,
      {
        'publicPortal.enabled': true,
        'publicPortal.variant': variant,
        'publicPortal.slug': slug,
        'publicPortal.subdomainPrefix': finalSubdomainPrefix,
        'publicPortal.customDomain': finalCustomDomain,
        'publicPortal.publishedAt': new Date(),
        'publicPortal.publishedBy': req.user._id
      },
      { new: true, runValidators: true }
    ).select('publicPortal');

    if (!updatedCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const publicUrl = `${process.env.PUBLIC_PORTAL_BASE_URL || 'https://meupontodevenda.com/public'}/${slug}`;

    res.json({
      success: true,
      enabled: true,
      slug,
      subdomainPrefix: finalSubdomainPrefix,
      customDomain: finalCustomDomain,
      publicUrl,
      variant,
      message: 'Portal público atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao publicar portal público:', error);
    res.status(500).json({ 
      message: 'Erro interno ao ativar o portal público',
      error: error.message 
    });
  }
});


// GET /api/company/public-portal/status
router.get('/public-portal/status', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id)
      .select('publicPortal name')   // incluímos 'name' para gerar sugestão caso necessário
      .lean();

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const portal = company.publicPortal || {};

    // Se o portal não estiver ativado
    if (!portal.enabled) {
      return res.json({ 
        enabled: false,
        variant: portal.variant || 'default',
        variantPurchased: portal.variantPurchased || false,
        variantPricePaid: portal.variantPricePaid || 0,
        variantPurchasedAt: portal.variantPurchasedAt || null,
        suggestedSubdomain: company.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
      });
    }

    // Portal está ativado
    const publicUrl = `${process.env.PUBLIC_PORTAL_BASE_URL || 'https://meupontodevenda.com/public'}/${portal.slug}`;

    // Subdomínio completo (se existir prefixo)
    const fullSubdomainUrl = portal.subdomainPrefix 
      ? `https://${portal.subdomainPrefix}.meupontodevenda.com` 
      : null;

    res.json({
      enabled: true,
      slug: portal.slug,
      subdomainPrefix: portal.subdomainPrefix || null,
      fullSubdomainUrl,
      customDomain: portal.customDomain || null,
      variant: portal.variant || 'default',
      variantPurchased: portal.variantPurchased || false,
      variantPricePaid: portal.variantPricePaid || 0,
      variantPurchasedAt: portal.variantPurchasedAt || null,
      publishedAt: portal.publishedAt,
      publicUrl,
      // Informação útil para o frontend
      suggestedSubdomain: company.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    });

  } catch (error) {
    console.error('Erro ao obter status do portal:', error);
    res.status(500).json({ 
      message: 'Erro ao consultar status do portal público' 
    });
  }
});

// ====================== GET /api/company/usage-limits ======================
// Retorna os limites atuais do plano + contagem real de cada recurso
router.get('/usage-limits', auth, async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(401).json({ message: 'Empresa não identificada' });
    }

    // 1. Buscar subscrição ativa com o plano populado
    const subscription = await Subscription.findOne({ company: companyId })
      .populate('plan', 'id name maxLimits features')
      .lean();

    if (!subscription) {
      return res.status(403).json({ 
        message: 'Nenhuma subscrição ativa encontrada' 
      });
    }

    const plan = subscription.plan;
    const isEnterprise = plan?.id === 'enterprise';

    // 2. Definição dos recursos que queremos contar
    const entityMap = {
      users:        require('../models/User.cjs'),
      products:     require('../models/Product.cjs'),
      services:     require('../models/Service.cjs'),
      bundles:      require('../models/Bundle.cjs'),
      clients:      require('../models/Client.cjs'),
      leads:        require('../models/Lead.cjs'),
      suppliers:    require('../models/Supplier.cjs'),
      requisitions: require('../models/Requisition.cjs'),
      documents:    require('../models/Document.cjs'),
      sales:        require('../models/Sale.cjs'),
      proposals:    require('../models/Proposal.cjs'),
    };

    const usage = {};

    // 3. Contar cada recurso
    await Promise.all(
      Object.entries(entityMap).map(async ([entityName, Model]) => {
        try {
          const current = await Model.countDocuments({
            company: companyId,
            isActive: { $ne: false }
          });

          let max = plan?.maxLimits?.[entityName];

          // Enterprise → ilimitado
          if (isEnterprise || max === null || max === undefined) {
            usage[entityName] = {
              current,
              max: null,
              isUnlimited: true,
              percentage: 0
            };
          } else {
            const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

            usage[entityName] = {
              current,
              max,
              isUnlimited: false,
              percentage: Math.min(percentage, 100)
            };
          }
        } catch (countErr) {
          console.error(`Erro ao contar ${entityName}:`, countErr);
          usage[entityName] = { current: 0, max: 0, percentage: 0, isUnlimited: false };
        }
      })
    );

    res.json({
      success: true,
      companyName: req.user.company?.name || 'Empresa',
      plan: {
        id: plan?.id || subscription.planId,
        name: plan?.name || subscription.planName || 'Básico',
        isEnterprise
      },
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      usage
    });

  } catch (err) {
    console.error('Erro na rota /usage-limits:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno ao calcular limites de utilização' 
    });
  }
});
// routes/company.cjs
router.post('/public-portal/purchase-variant', auth, async (req, res) => {
  try {
    const { variantId, paymentMethod, price } = req.body;

    const variant = await BuiltInPortalVariant.findOne({ variantId });
    if (!variant || variant.tier !== 'premium') {
      return res.status(400).json({ message: 'Template inválido ou não é premium' });
    }

    // TODO: Integrar com gateway real (M-Pesa, etc.)

    const company = await Company.findByIdAndUpdate(
      req.user.company._id,
      {
        'publicPortal.variant': variantId,
        'publicPortal.variantPurchased': true,
        'publicPortal.variantPricePaid': price,
        'publicPortal.variantPurchasedAt': new Date(),
        'publicPortal.variantTransactionId': `TX-${Date.now()}`
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Template Premium ativado com sucesso',
      company: company.publicPortal
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar compra do template' });
  }
});


module.exports = router;