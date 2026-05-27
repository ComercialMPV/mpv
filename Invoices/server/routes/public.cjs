// routes/public.cjs
const express = require('express');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const Company = require('../models/Company.cjs');
const Service = require('../models/Service.cjs');
const Product = require('../models/Product.cjs');
const PublicPortalContent = require('../models/PublicPortalContent.cjs');
const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
const Bundle = require('../models/Bundle.cjs');
const Requisition = require('../models/Requisition.cjs');
const { auth } = require('../middleware/auth.cjs');

const router = express.Router();

// ────────────────────────────────────────────────
// CSP ajustado para permitir Lucide + Tailwind + inline scripts (necessário para o teu template)
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",                // permite <script> inline no template
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"     // ← corrigido: permite Lucide CSS
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));


// ────────────────────────────────────────────────
// ===============================================
// ROTA PÚBLICA PRINCIPAL - para subdomínios e slugs
// ===============================================
router.get('/portal/:identifier?', async (req, res) => {
  try {
    let identifier = req.params.identifier;
    const hostname = req.hostname.toLowerCase().trim();

    console.log(`[PUBLIC PORTAL] Request recebido - hostname: ${hostname}, identifier param: ${identifier}`);

    // ==================== MELHOR DETECÇÃO DE SUBDOMÍNIO ====================
    const isCloudRunDomain = hostname.endsWith('.a.run.app') || 
                             hostname.includes('run.app');

    const isMainDomain = hostname === 'meupontodevenda.com' || 
                         hostname === 'www.meupontodevenda.com' ||
                         hostname.includes('localhost') ||
                         hostname.includes('127.0.0.1');

    if (!isMainDomain && !isCloudRunDomain) {
      // É um subdomínio real (ex: minhaempresa.meupontodevenda.com)
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'www') {
        identifier = subdomain;
        console.log(`[PUBLIC PORTAL] Subdomínio real detectado: ${identifier}`);
      }
    } 
    // Se for Cloud Run ou domínio principal → usar o parâmetro da URL
    else if (identifier) {
      console.log(`[PUBLIC PORTAL] Usando identifier da URL: ${identifier}`);
    }

    if (!identifier) {
      return res.status(400).json({ 
        message: 'Identificador do portal não fornecido (slug ou subdomínio)' 
      });
    }

    identifier = identifier.toLowerCase().trim();

    // ==================== BUSCA NO BANCO ====================
    const company = await Company.findOne({
      $or: [
        { 'publicPortal.subdomainPrefix': identifier },
        { 'publicPortal.slug': identifier },
        { 'publicPortal.customDomain': hostname }
      ],
      'publicPortal.enabled': true
    })
    .select('name email phone website logo address currency publicPortal bankAccounts mobileWallets')
    .lean();

    console.log(`[PUBLIC PORTAL] Busca por "${identifier}" → Encontrado: ${!!company}`);

    if (!company) {
      // Debug útil
      const allActive = await Company.find({ 'publicPortal.enabled': true })
        .select('name publicPortal.slug publicPortal.subdomainPrefix')
        .lean();

      console.log(`[PUBLIC PORTAL] Portais ativos no sistema:`, 
        allActive.map(c => ({ 
          name: c.name, 
          slug: c.publicPortal?.slug, 
          subdomainPrefix: c.publicPortal?.subdomainPrefix 
        })));

      return res.status(404).json({ 
        message: 'Portal não encontrado ou desativado',
        debug: { 
          searchedFor: identifier, 
          hostname,
          isCloudRun: isCloudRunDomain 
        }
      });
    }

    // ====================== RESTO DO CÓDIGO (mantém igual) ======================
    const services = await Service.find({ company: company._id, isActive: true })
      .select('name description basePrice unit allowedInstallments penaltyPercentagePerInstallment images includedItems')
      .lean();

    const products = await Product.find({ company: company._id, isActive: true })
      .select('name shortDescription basePrice category images sku stockQuantity minStockLevel madeToOrder deliveryDays orderPrice')
      .lean();

    const bundles = await Bundle.find({ company: company._id, isActive: true })
      .select('name type description price items image billingCycle billingPricePerCycle commitmentMonths includedLimits extraBenefits originalCyclePrice')
      .populate('items.productId')
      .lean();

    let portalContent = await PublicPortalContent.findOne({ company: company._id }).lean() || {
      enabled: true,
      variantId: 'default',
      hero: { enabled: true, headline: company.name, subheadline: '', ctaText: 'Solicitar Serviço' },
      about: { enabled: false },
      clients: { enabled: false, items: [] },
      testimonials: { enabled: false, items: [] },
      missionVision: { enabled: false }
    };

    const formToken = crypto.randomBytes(32).toString('hex');

    res.json({
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        website: company.website,
        logo: company.logo,
        address: company.address,
        currency: company.currency,
        publicPortal: company.publicPortal,
        bankAccounts: company.bankAccounts || [],
        mobileWallets: company.mobileWallets || {}
      },
      services,
      products,
      bundles,
      formToken,
      portalContent,
      accessedVia: !isMainDomain && !isCloudRunDomain ? 'subdomain' : 'slug'
    });

  } catch (err) {
    console.error('Erro na rota /portal:', err);
    res.status(500).json({ 
      message: 'Erro interno ao carregar o portal',
      error: err.message 
    });
  }
});

// ===============================================
// ROTA INTERNA - para o PortalCustomization.tsx (admin)
// ===============================================
router.get('/api/public/portal/status', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id)
      .select('publicPortal')
      .lean();

    res.json(company?.publicPortal || { enabled: false, slug: '', variant: 'default' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar status do portal' });
  }
});

// POST /public/portal/:slug/search
// body: { term: string, catalog?: 'services'|'products'|'bundles' }
// logs a search performed by a visitor so we can aggregate later
router.post('/portal/:slug/search', async (req, res) => {
  try {
    const { slug } = req.params;
    const { term, catalog } = req.body;
    if (!term || typeof term !== 'string') {
      return res.status(400).json({ message: 'Termo de busca inválido' });
    }

    const company = await Company.findOne({
      'publicPortal.slug': slug.toLowerCase().trim(),
      'publicPortal.enabled': true
    }).select('_id').lean();

    if (!company) {
      return res.status(404).json({ message: 'Portal não encontrado' });
    }

    const SearchLog = require('../models/SearchLog.cjs');
    await SearchLog.create({
      company: company._id,
      term: term.trim().toLowerCase(),
      catalog: catalog || 'services'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao registrar busca pública:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});
router.get('/', async (req, res) => {
  try {
    const templates = await PublicPortalTemplate.find({
      $or: [
        { company: req.user.company._id },
        { isBuiltIn: true }
      ]
    })
      .select('name description isDefault isBuiltIn')
      .sort({ isDefault: -1, name: 1 })
      .lean();

    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar templates' });
  }
});



module.exports = router;