// routes/company-portal.cjs
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.cjs');
const Company = require('../models/Company.cjs');
const path = require('path');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const PublicPortalContent = require('../models/PublicPortalContent.cjs');

// Obter configuração do portal da empresa atual
router.get('/portal-content', auth, async (req, res) => {
  try {
    let content = await PublicPortalContent.findOne({ company: req.user.company._id });
    if (!content) {
      content = new PublicPortalContent({ company: req.user.company._id });
      await content.save();
    }
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao obter configuração do portal' });
  }
});

// Atualizar configuração
router.put('/portal-content', auth, async (req, res) => {
  try {
    const content = await PublicPortalContent.findOneAndUpdate(
      { company: req.user.company._id },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(content);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Erro ao atualizar portal' });
  }
});

// ────────────────────────────────────────────────
// UPLOAD DE IMAGENS / VÍDEOS PARA PUBLIC PORTAL CONTENT
// ────────────────────────────────────────────────
router.post('/portal-content/upload', auth, async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    const { section } = req.query; // ?section=hero ou ?section=about
    if (!['hero', 'about'].includes(section)) {
      return res.status(400).json({ message: 'Section inválido (hero ou about)' });
    }

    const { files } = await parseMultipart(req, {
  limits: { files: 1, fileSize: 15 * 1024 * 1024 }
});

console.log('Files received:', files); // DEBUG: Check the structure here

if (!files || !files[0]) {
  return res.status(400).json({ message: 'Nenhum ficheiro enviado ou nome de campo incorreto' });
}

const file = files[0];

// Fallback if mimetype is missing
const mimetype = file.mimetype || file.type || ''; 
const isVideo = mimetype.startsWith('video/');
    const ext = path.extname(file.originalname) || (isVideo ? '.mp4' : '.jpg');

    const folder = isVideo ? 'portal-videos' : 'portal-images';
    const fileName = `${folder}/${companyId}/${section}-${Date.now()}${ext}`;

    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: { contentType: file.mimetype }
    });

    blobStream.on('error', (err) => {
      console.error('GCS error:', err);
      res.status(500).json({ message: 'Erro no upload para GCS' });
    });

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      const updateData = {};
      if (section === 'hero') {
        if (isVideo) {
          updateData['hero.backgroundVideo'] = publicUrl;
        } else {
          updateData['hero.backgroundImage'] = publicUrl;
        }
      } else if (section === 'about') {
        updateData['about.image'] = publicUrl;
      }

      const content = await PublicPortalContent.findOneAndUpdate(
        { company: companyId },
        { $set: updateData },
        { new: true, upsert: true }
      );

      res.json({
        message: 'Upload realizado com sucesso',
        url: publicUrl,
        images: [publicUrl]   // compatível com ImageUploader
      });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error('Upload portal-content error:', err);
    res.status(500).json({ message: 'Erro interno no upload' });
  }
});

// ────────────────────────────────────────────────
// DELETE (limpa o campo correspondente)
// ────────────────────────────────────────────────
router.delete('/portal-content/upload', auth, async (req, res) => {
  try {
    const { section } = req.query;
    const { imageUrl } = req.body;

    if (!['hero', 'about'].includes(section)) {
      return res.status(400).json({ message: 'Section inválido' });
    }

    const companyId = req.user.company._id.toString();
    const updateData = {};

    if (section === 'hero') {
      updateData['hero.backgroundImage'] = null;
      updateData['hero.backgroundVideo'] = null; // limpa ambos por segurança
    } else if (section === 'about') {
      updateData['about.image'] = null;
    }

    await PublicPortalContent.findOneAndUpdate(
      { company: companyId },
      { $set: updateData }
    );

    res.json({ message: 'Imagem/vídeo removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao remover' });
  }
});

module.exports = router;