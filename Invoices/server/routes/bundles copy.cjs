const express = require('express');
const router = express.Router();
const Bundle = require('../models/Bundle.cjs');
const { auth } = require('../middleware/auth.cjs');
const upload = require('../middleware/upload.cjs');

// Listar todos (Combos e Subscrições)
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = { company: req.user.company._id, isActive: true };
    if (type) query.type = type;

    const bundles = await Bundle.find(query).populate('items.productId');
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar itens: ' + error.message });
  }
});

// Criar novo Combo/Subscrição
router.post('/', auth, async (req, res) => {
  try {
    const bundle = new Bundle({
      ...req.body,
      company: req.user.company._id
    });
    await bundle.save();
    res.status(201).json(bundle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Atualizar
router.put('/:id', auth, async (req, res) => {
  try {
    const bundle = await Bundle.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      req.body,
      { new: true }
    );
    res.json(bundle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Rota de Arquivo (Toggle)
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const bundle = await Bundle.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!bundle) return res.status(404).json({ message: 'Bundle não encontrado' });
    
    bundle.isArchived = !bundle.isArchived;
    await bundle.save();
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota de Delete (Eliminação lógica)
router.delete('/:id', auth, async (req, res) => {
  try {
    await Bundle.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      { isActive: false }
    );
    res.json({ message: 'Bundle removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload de imagem para Bundle
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhuma imagem foi enviada' });
    }

    const bundle = await Bundle.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!bundle) {
      return res.status(404).json({ message: 'Bundle não encontrado' });
    }

    // Converter para URL pública
    const imagePath = `/uploads/images/${req.file.filename}`;
    bundle.image = imagePath;
    await bundle.save();

    res.json({
      message: 'Imagem enviada com sucesso',
      image: bundle.image
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove imagem do Bundle
router.delete('/:id/image', auth, async (req, res) => {
  try {
    const bundle = await Bundle.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!bundle) {
      return res.status(404).json({ message: 'Bundle não encontrado' });
    }

    bundle.image = undefined;
    await bundle.save();

    res.json({
      message: 'Imagem removida com sucesso'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;