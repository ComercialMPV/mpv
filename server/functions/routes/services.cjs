const express = require('express');
const Service = require('../models/Service.cjs');
const Company = require('../models/Company.cjs');
const { auth } = require('../middleware/auth.cjs');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs');

const router = express.Router();

// Get all services for the company
router.get('/', auth, checkSubscriptionLimit('services'), async (req, res) => {
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
      .select('_id name description  basePrice unit allowedInstallments penaltyPercentagePerInstallment images includedItems')
      .lean();

    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar serviços' });
  }
});

// Create a new service
router.post('/', auth, checkSubscriptionLimit('services'),async (req, res) => {
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
router.post('/:id/images', auth, async (req, res) => {
  try {
    // Parseia o multipart/form-data
    const { files, fields } = await parseMultipart(req, {
      limits: { files: 5, fileSize: 10 * 1024 * 1024 } // max 5 ficheiros, 10MB cada
    });

    // Verifica se há ficheiros no campo 'images'
    const imageFiles = files.filter(f => f.fieldname === 'images');
    if (imageFiles.length === 0) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada no campo "images"' });
    }

    if (imageFiles.length > 5) {
      return res.status(400).json({ message: 'Máximo de 5 imagens permitidas por upload' });
    }

    const service = await Service.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!service) {
      return res.status(404).json({ message: 'Serviço não encontrado' });
    }

    // Processa cada imagem em paralelo
    const uploadPromises = imageFiles.map(async (file) => {
      const fileName = `services/${service._id}/${Date.now()}-${file.originalname}`;
      const blob = bucket.file(fileName);

      await blob.save(file.buffer, {
        metadata: { contentType: file.mimetype }
      });

      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    });

    const newImageUrls = await Promise.all(uploadPromises);

    // Adiciona as novas URLs ao array existente
    service.images = [...(service.images || []), ...newImageUrls];
    await service.save();

    res.json({
      message: 'Imagens enviadas com sucesso',
      images: service.images
    });
  } catch (error) {
    console.error('Erro no upload de imagens do serviço:', error);
    res.status(500).json({ message: error.message || 'Erro interno no upload' });
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