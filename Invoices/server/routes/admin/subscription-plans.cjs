// routes/admin/subscription-plans.cjs
const express = require('express');
const router = express.Router();
const { auth, adminOwnerAuth } = require('../../middleware/auth.cjs');
const SubscriptionPlan = require('../../models/SubscriptionPlan.cjs');

// ====================== MIDDLEWARE DE ADMIN ======================
router.use(auth);
router.use(adminOwnerAuth);   // Apenas Owner e SuperAdmin

// GET /api/admin/subscription-plans
router.get('/', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ name: 1 });
    res.json({ success: true, plans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao carregar planos' });
  }
});

// GET /api/admin/subscription-plans/:id
router.get('/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao carregar plano' });
  }
});

// POST /api/admin/subscription-plans
router.post('/', async (req, res) => {
  try {
    const { id, name, price, currency, billingCycle, maxLimits, features, description, isActive } = req.body;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'id e name são obrigatórios' });
    }

    const existing = await SubscriptionPlan.findOne({ id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Já existe um plano com este ID' });
    }

    const plan = new SubscriptionPlan({
      id,
      name,
      description,
      price: Number(price) || 0,
      currency: currency || 'MZN',
      billingCycle: billingCycle || 'monthly',
      maxLimits: maxLimits || {},
      features: features || [],
      isActive: isActive !== false
    });

    await plan.save();
    res.status(201).json({ success: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/subscription-plans/:id
router.put('/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!plan) return res.status(404).json({ success: false, message: 'Plano não encontrado' });

    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/subscription-plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plano não encontrado' });

    if (plan.isDefault) {
      return res.status(400).json({ success: false, message: 'Não pode eliminar o plano padrão' });
    }

    await plan.deleteOne();
    res.json({ success: true, message: 'Plano eliminado com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;