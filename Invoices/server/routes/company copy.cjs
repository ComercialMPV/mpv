const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Company = require('../models/Company.cjs');
const { auth } = require('../middleware/auth.cjs');
const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/logos');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get company profile (single handler)
router.get('/profile', auth, async (req, res) => {
  try {
    // auth middleware already populated company
    let company = req.user.company;

    // if for some reason it's not populated, fetch explicitly and include all relevant fields
    if (!company) {
      company = await Company.findById(req.user.company?._id || req.user.company);
    }

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // respond with whatever we have; bankAccounts/mobileWallets/logo are part of the schema
    res.json(company);
  } catch (error) {
    console.error('Get company profile error:', error);
    res.status(500).json({ message: 'Server error' });
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
      'mobileWallets'
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
router.post('/logo', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    const company = await Company.findByIdAndUpdate(
      req.user.company._id,
      { logo: logoUrl },
      { new: true }
    );

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoUrl,
      company
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ message: 'Server error' });
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
router.post('/public-portal/publish', auth, async (req, res) => {
  try {
    const { variant = 'default', customSlug } = req.body;

    // Validate variant is a non-empty string
    if (!variant || typeof variant !== 'string' || !variant.trim()) {
      return res.status(400).json({ message: 'Variante inválida: deve ser uma string não vazia' });
    }

    let slug = customSlug ? customSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : null;

    if (!slug) {
      slug = req.user.company.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }

    const existing = await Company.findOne({
      _id: { $ne: req.user.company._id },
      'publicPortal.slug': slug,
      'publicPortal.enabled': true
    });

    if (existing) {
      return res.status(409).json({ message: 'Este slug já está em uso por outra empresa' });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.user.company._id,
      {
        'publicPortal.enabled': true,
        'publicPortal.variant': variant,
        'publicPortal.slug': slug,
        'publicPortal.publishedAt': new Date(),
        'publicPortal.publishedBy': req.user._id
      },
      { new: true, runValidators: true }
    ).select('publicPortal');

    const publicUrl = `${process.env.PUBLIC_PORTAL_BASE_URL || 'https://serverpay.brendkit.com/public'}/${slug}`;

    res.json({
      success: true,
      enabled: true,
      slug,
      publicUrl,
      variant
    });
  } catch (error) {
    console.error('Erro ao publicar portal público:', error);
    res.status(500).json({ message: 'Erro interno ao ativar o portal público' });
  }
});


// GET /api/company/public-portal/status
router.get('/public-portal/status', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id)
      .select('publicPortal')  // já inclui variant, slug, enabled...
      .lean();

    if (!company?.publicPortal?.enabled) {
      return res.json({ enabled: false });
    }

    const publicUrl = `${process.env.PUBLIC_PORTAL_BASE_URL || 'https://serverpay.brendkit.com/public'}/${company.publicPortal.slug}`;

    res.json({
      enabled: true,
      slug: company.publicPortal.slug,
      publicUrl,
      variant: company.publicPortal.variant || 'default',   // ← retorna o variant
      publishedAt: company.publicPortal.publishedAt
    });
  } catch (error) {
    console.error('Erro ao obter status do portal:', error);
    res.status(500).json({ message: 'Erro ao consultar status do portal público' });
  }
});

module.exports = router;