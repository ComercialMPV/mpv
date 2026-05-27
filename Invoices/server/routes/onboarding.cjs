const express = require('express');
const router = express.Router();
const OnboardingContent = require('../models/OnboardingContent.cjs');
const { auth } = require('../middleware/auth.cjs');

// GET todos os itens de onboarding da empresa logada
router.get('/', auth, async (req, res) => {
  try {
    const items = await OnboardingContent.find({})
      .sort({ menuName: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar onboarding' });
  }
});

// PUT atualizar um item específico
router.put('/:menuName', auth, async (req, res) => {
  try {
    const { shortDescription, longDescription, videoUrl } = req.body;

    let item = await OnboardingContent.findOne({ 
      menuName: req.params.menuName
 
    });

    if (!item) {
      item = new OnboardingContent({
        menuName: req.params.menuName,      
        updatedBy: req.user._id
      });
    }

    item.shortDescription = shortDescription;
    item.longDescription = longDescription;
    item.videoUrl = videoUrl || '';
    item.updatedBy = req.user._id;

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar onboarding' });
  }
});

module.exports = router;