// routes/public-portal-templates.cjs (create this file if missing)
const express = require('express');
const router = express.Router();
const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
const { PORTAL_VARIANTS } = require('../config/publicPortalVariants.cjs');
const { auth } = require('../middleware/auth.cjs');

router.get('/', async (req, res) => {
  try {
    // Fetch user-created templates from database
    const dbTemplates = await PublicPortalTemplate.find({
      $or: [
        { company: req.user.company._id }
      ]
    })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    // Combine with built-in variants (not from DB, read from config)
    const allTemplates = [
      ...PORTAL_VARIANTS,  // Built-in variants first
      ...dbTemplates       // Then user-created templates
    ];

    res.json(allTemplates);
  } catch (err) {
    console.error('Error fetching public portal templates:', err);
    res.status(500).json({ message: 'Erro interno ao listar templates' });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    // Check if it's a built-in variant
    const builtInVariant = PORTAL_VARIANTS.find(v => v._id === req.params.id || v.id === req.params.id);
    if (builtInVariant) {
      return res.json(builtInVariant);
    }

    // Otherwise, fetch from database
    const template = await PublicPortalTemplate.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });
    
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create
router.post('/', auth, async (req, res) => {
  try {
    const data = req.body;
    const template = new PublicPortalTemplate({
      ...data,
      company: req.user.company._id,
      createdBy: req.user._id,
      isBuiltIn: false
    });
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update
router.put('/:id', auth, async (req, res) => {
  try {
    // Prevent updating built-in variants
    if (req.params.id.startsWith('builtin-')) {
      return res.status(403).json({ message: 'Cannot modify built-in templates' });
    }

    const template = await PublicPortalTemplate.findOne({ 
      _id: req.params.id, 
      company: req.user.company._id 
    });
    
    if (!template) return res.status(404).json({ message: 'Template not found' });
    
    Object.assign(template, req.body);
    await template.save();
    res.json(template);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    // Prevent deleting built-in variants
    if (req.params.id.startsWith('builtin-')) {
      return res.status(403).json({ message: 'Cannot delete built-in templates' });
    }

    const template = await PublicPortalTemplate.findOneAndDelete({ 
      _id: req.params.id, 
      company: req.user.company._id 
    });
    
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;