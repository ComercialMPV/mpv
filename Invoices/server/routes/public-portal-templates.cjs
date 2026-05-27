const express = require('express');
const router = express.Router();


const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
const BuiltInPortalVariant = require('../models/BuiltInPortalVariant.cjs'); // ← novo

const { PORTAL_VARIANTS } = require('../config/publicPortalVariants.cjs'); // mantenha por enquanto
const { auth } = require('../middleware/auth.cjs');

// GET / → lista todos (built-in + custom do usuário)
router.get('/', async (req, res) => {
  try {
    // A. Templates custom - APENAS se usuário autenticado
    let userTemplates = [];
    if (req.user) {
      userTemplates = await PublicPortalTemplate.find({
        company: req.user.company._id,
      })
        .sort({ isDefault: -1, name: 1 })
        .lean();
    }

    // B. Variantes built-in ATIVAS vindas do banco
    const activeBuiltIns = await BuiltInPortalVariant.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    // C. Transformar built-in do banco no formato que o frontend espera
    const builtInForFrontend = activeBuiltIns.map((v) => ({
      _id: `builtin-${v.variantId}`,
      id: v.variantId,
      name: v.name,
      description: v.description,
      templateType: 'variant',
      variantId: v.variantId,
      isBuiltIn: true,
      isPublic: v.isPublic,
      isPaid: v.isPaid,
      price: v.price,
      previewImage: v.previewImage,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    // D. Combinar: built-in primeiro + custom depois (se houver)
    const allTemplates = [
      ...builtInForFrontend,
      ...userTemplates,
    ];

    res.json(allTemplates);
  } catch (err) {
    console.error('Error listing public portal templates:', err);
    res.status(500).json({ message: 'Erro interno ao listar templates' });
  }
});

// GET /:id → detalhe de um template (built-in ou custom)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // 1. Tenta encontrar como built-in (pelo prefixo ou variantId)
    if (id.startsWith('builtin-') || !mongoose.isValidObjectId(id)) {
      const variantId = id.startsWith('builtin-') ? id.replace('builtin-', '') : id;

      const builtin = await BuiltInPortalVariant.findOne({ variantId });
      if (builtin) {
        return res.json({
          _id: `builtin-${builtin.variantId}`,
          id: builtin.variantId,
          name: builtin.name,
          description: builtin.description,
          templateType: 'variant',
          variantId: builtin.variantId,
          isBuiltIn: true,
          isPublic: builtin.isPublic,
          isPaid: builtin.isPaid,
          price: builtin.price,
        });
      }

      // Fallback temporário para variantes que ainda estão só no arquivo
      const legacyBuiltin = PORTAL_VARIANTS.find(v => v.id === variantId || v._id === id);
      if (legacyBuiltin) {
        return res.json(legacyBuiltin);
      }
    }

    // 2. Senão → template custom do usuário
    const template = await PublicPortalTemplate.findOne({
      _id: id,
      company: req.user.company._id,
    }).lean();

    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }

    res.json(template);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// ────────────────────────────────────────────────
// CRUD → APENAS para templates custom (usuário)
// ────────────────────────────────────────────────

router.post('/', auth, async (req, res) => {
  try {
    const template = new PublicPortalTemplate({
      ...req.body,
      company: req.user.company._id,
      createdBy: req.user._id,
      isBuiltIn: false,
    });
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar template' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.params.id.startsWith('builtin-')) {
      return res.status(403).json({ message: 'Templates built-in não podem ser editados' });
    }

    const template = await PublicPortalTemplate.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!template) return res.status(404).json({ message: 'Template não encontrado' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.params.id.startsWith('builtin-')) {
      return res.status(403).json({ message: 'Templates built-in não podem ser removidos' });
    }

    const template = await PublicPortalTemplate.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id,
    });

    if (!template) return res.status(404).json({ message: 'Template não encontrado' });
    res.json({ message: 'Template removido' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover' });
  }
});

module.exports = router;