const express = require('express');
const router = express.Router();
const Bundle = require('../models/Bundle.cjs');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth.cjs');
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');

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
router.post('/', auth, checkSubscriptionLimit('bundles'), async (req, res) => {
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
router.post('/:id/image', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID do bundle inválido' });
    }
    // 1. Parseia o multipart (limite de 1 ficheiro para esta rota)
    const { files, fields } = await parseMultipart(req, {
      limits: {
        files: 1,                    // só permite 1 imagem
        fileSize: 10 * 1024 * 1024   // 10MB
      }
    });

    // 2. Procura o ficheiro no campo 'image'
    const imageFile = files.find(f => f.fieldname === 'image');
    if (!imageFile) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada no campo "image"' });
    }

    // 3. Busca o bundle
    const bundle = await Bundle.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!bundle) {
      return res.status(404).json({ message: 'Bundle não encontrado' });
    }

    // 4. Define nome único no GCS
    const fileName = `bundles/${bundle._id}/${Date.now()}-${imageFile.originalname}`;
    const blob = bucket.file(fileName);

    // 5. Upload do buffer
    await blob.save(imageFile.buffer, {
      metadata: { contentType: imageFile.mimetype }
    });

    // 6. URL pública
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // 7. Atualiza o campo image no bundle
    bundle.image = imageUrl;
    await bundle.save();

    res.json({
      message: 'Imagem enviada com sucesso',
      image: bundle.image
    });
  } catch (error) {
    console.error('Erro no upload de imagem do bundle:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno ao fazer upload da imagem' 
    });
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