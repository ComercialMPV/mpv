// routes/admin-builtin-variants.cjs
const express = require('express');
const router = express.Router();
const BuiltInPortalVariant = require('../models/BuiltInPortalVariant.cjs');
const path = require('path');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const { superAdminAuth, adminOwnerAuth, auth } = require('../middleware/auth.cjs');

// Listar todas (apenas admin/owner/superadmin)
router.get('/', async (req, res) => {
  try {
    const variants = await BuiltInPortalVariant.find()
      .sort({ order: 1, name: 1 })
      .lean();
    res.json(variants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar variantes built-in' });
  }
});
router.post('/:variantId/images', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { files, fields } = await parseMultipart(req, {
      limits: { files: 1, fileSize: 5 * 1024 * 1024 } // máx 1 imagem, 5 MB
    });

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado' });
    }

    const file = files[0];
    const variantId = req.params.variantId;

    // Nome do ficheiro único
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `variants/${variantId}/preview-${Date.now()}${ext}`;

    // Upload para Google Cloud Storage
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error('Erro no upload GCS:', err);
      res.status(500).json({ message: 'Erro ao fazer upload da imagem' });
    });

   blobStream.on('finish', async () => {
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  // Atualiza a variante
  const variant = await BuiltInPortalVariant.findOneAndUpdate(
    { variantId },
    { previewImageUrl: publicUrl },
    { new: true }
  );

  if (!variant) {
    return res.status(404).json({ message: 'Variante não encontrada' });
  }

  // RESPOSTA PADRÃO – igual à de services
  res.json({
    message: 'Imagem enviada com sucesso',
    url: publicUrl,         
    images: [publicUrl]
  });
});
    blobStream.end(file.buffer);
  } catch (err) {
    console.error('Erro na rota de upload:', err);
    res.status(500).json({ message: 'Erro interno no upload' });
  }
});

// Obter uma por variantId
router.get('/:variantId', async (req, res) => {
  try {
    const variant = await BuiltInPortalVariant.findOne({ variantId: req.params.variantId });
    if (!variant) return res.status(404).json({ message: 'Variante não encontrada' });
    res.json(variant);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao obter variante' });
  }
});

// Criar
router.post('/', auth, async (req, res) => {
  try {
    const existing = await BuiltInPortalVariant.findOne({ variantId: req.body.variantId });
    if (existing) {
      return res.status(409).json({ message: 'Este variantId já existe' });
    }

    const variant = new BuiltInPortalVariant(req.body);
    await variant.save();
    res.status(201).json(variant);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Erro ao criar variante' });
  }
});

// Atualizar
router.put('/:variantId', auth, async (req, res) => {
  try {
    const variant = await BuiltInPortalVariant.findOneAndUpdate(
      { variantId: req.params.variantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!variant) return res.status(404).json({ message: 'Variante não encontrada' });
    res.json(variant);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Erro ao atualizar' });
  }
});

// Eliminar (ou soft-delete)
router.delete('/:variantId', auth, async (req, res) => {
  try {
    const variant = await BuiltInPortalVariant.findOneAndDelete({ variantId: req.params.variantId });
    if (!variant) return res.status(404).json({ message: 'Variante não encontrada' });
    res.json({ message: 'Variante eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao eliminar' });
  }
});

module.exports = router;