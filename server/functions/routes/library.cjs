const express = require('express');
const router = express.Router();
const LibraryContent = require('../models/LibraryContent.cjs');
const { auth } = require('../middleware/auth.cjs');

// PUBLIC - Lista todos os conteúdos da biblioteca
router.get('/public', async (req, res) => {
  try {
    const items = await LibraryContent.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar biblioteca' });
  }
});

// ADMIN - CRUD completo
router.get('/', auth, async (req, res) => {
  const items = await LibraryContent.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', auth, async (req, res) => {
  const item = new LibraryContent(req.body);
  await item.save();
  res.status(201).json(item);
});

router.put('/:id', auth, async (req, res) => {
  const item = await LibraryContent.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

router.delete('/:id', auth, async (req, res) => {
  await LibraryContent.findByIdAndDelete(req.params.id);
  res.json({ message: 'Conteúdo removido' });
});

module.exports = router;