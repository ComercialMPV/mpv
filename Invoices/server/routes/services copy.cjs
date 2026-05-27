const express = require('express');
const Service = require('../models/Service.cjs');
const Company = require('../models/Company.cjs');
const { auth } = require('../middleware/auth.cjs');
const upload = require('../middleware/upload.cjs');
const router = express.Router();

// Get all services for the company
router.get('/', auth, async (req, res) => {
  try {
    const services = await Service.find({ company: req.user.company._id, isActive: true }).select('-__v');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services' });
  }
});
// In services router
// services.cjs
router.get('/public/portal/:slug', async (req, res) => {
  try {
    const company = await Company.findOne({
      'publicPortal.slug': req.params.slug.toLowerCase().trim(),
      'publicPortal.enabled': true
    })
      .select('_id name logo currency publicPortal')
      .lean();

    if (!company) {
      return res.status(404).json({ message: 'Portal não encontrado ou desativado' });
    }

    const services = await Service.find({
      company: company._id,
      isActive: true
    })
      .select('_id name description basePrice unit allowedInstallments penaltyPercentagePerInstallment images')
      .lean();

    res.json({
      company: {
        _id: company._id,
        name: company.name,
        logo: company.logo,
        currency: company.currency,
        publicPortal: company.publicPortal
      },
      services,
      formToken: ''
    });
  } catch (err) {
    console.error('Erro em /public/portal/:slug:', err);
    res.status(500).json({ message: 'Erro interno ao carregar serviços' });
  }
});

// Em services.cjs
router.get('/public/company/:companyId', async (req, res) => {
  try {
    const services = await Service.find({
      company: req.params.companyId,
      isActive: true
    })
      .select('_id name description basePrice unit allowedInstallments penaltyPercentagePerInstallment images')
      .lean();

    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar serviços' });
  }
});

// Create a new service
router.post('/', auth, async (req, res) => {
  try {
    const service = new Service({
      ...req.body,
      company: req.user.company._id
    });
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a service
router.put('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      req.body,
      { new: true }
    );
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a service
router.delete('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload images for a service
router.post('/:id/images', auth, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Nenhuma imagem foi enviada' });
    }

    const service = await Service.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Converter paths dos ficheiros para URLs públicas
    const imagePaths = req.files.map(file => `/uploads/images/${file.filename}`);

    // Adicionar às imagens existentes (ou criar novo array)
    service.images = [...(service.images || []), ...imagePaths];
    await service.save();

    res.json({
      message: 'Imagens enviadas com sucesso',
      images: service.images
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove specific image from service
router.delete('/:id/images', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl é obrigatório' });
    }

    const service = await Service.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Remover a imagem do array
    service.images = service.images.filter((img) => img !== imageUrl);
    await service.save();

    res.json({
      message: 'Imagem removida com sucesso',
      images: service.images
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;