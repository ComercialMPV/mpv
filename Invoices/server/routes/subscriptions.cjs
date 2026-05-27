// routes/subscriptions.cjs
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.cjs');

const Subscription = require('../models/Subscription.cjs');
const SubscriptionPlan = require('../models/SubscriptionPlan.cjs');
const Company = require('../models/Company.cjs');
const User = require('../models/User.cjs');

// ====================== GET /api/subscriptions/current ======================
router.get('/current', auth, async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(404).json({ message: 'Empresa não associada ao utilizador' });
    }

    // Buscar subscrição com o plano populado
    let subscription = await Subscription.findOne({ company: companyId })
      .populate('plan', 'name maxLimits features id price currency')
      .lean();

    // Se não existir subscrição, criar fallback básico
    if (!subscription) {
      const basicPlan = await SubscriptionPlan.findOne({ id: 'basic' });

      subscription = {
        _id: null,
        company: companyId,
        plan: basicPlan || { id: 'basic', name: 'Básico', maxLimits: {} },
        planId: 'basic',
        planName: basicPlan?.name || 'Básico',
        status: 'trial',
        price: basicPlan?.price || 0,
        currency: basicPlan?.currency || 'MZN',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias trial
        nextBillingDate: null,
        autoRenew: false,
        limits: basicPlan?.maxLimits || {}
      };
    } else {
      // Adicionar limites do plano para facilitar no frontend
      subscription.limits = subscription.plan?.maxLimits || {};
    }

    res.json(subscription);
  } catch (error) {
    console.error('Erro ao carregar subscrição atual:', error);
    res.status(500).json({ message: 'Erro ao carregar subscrição' });
  }
});

// ====================== GET /api/subscriptions/plans ======================
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
      .select('id name price currency billingCycle maxLimits features description isDefault')
      .sort({ price: 1, name: 1 });

    res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ message: 'Erro ao carregar planos disponíveis' });
  }
});

// ====================== PATCH /api/subscriptions/current ======================
// Atualizar plano atual (usado por admin/owner)
router.patch('/current', auth, async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    const { planId, months = 1, manualActivation = true } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'planId é obrigatório' });
    }

    if (months < 1 || months > 36) {
      return res.status(400).json({ message: 'Período inválido (1 a 36 meses)' });
    }

    // Buscar o plano dinâmico
    const selectedPlan = await SubscriptionPlan.findOne({ id: planId });
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Plano inválido' });
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);

    const billingCycle = months === 12 ? 'annual' : (months === 1 ? 'monthly' : 'custom');

    const subscription = await Subscription.findOneAndUpdate(
      { company: companyId },
      {
        plan: selectedPlan._id,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        currency: selectedPlan.currency,
        status: manualActivation ? 'active' : 'pending_payment',
        billingCycle,
        initialMonths: billingCycle === 'custom' ? months : undefined,
        renewalCycle: months === 12 ? 'annual' : 'monthly',
        currentPeriodStart: start,
        currentPeriodEnd: end,
        nextBillingDate: end,
        autoRenew: true,
        updatedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('plan');

    // Atualizar campo plan na Company (para acesso rápido)
    await Company.findByIdAndUpdate(companyId, { plan: selectedPlan.id });

    // Atualizar todos os usuários da empresa
    await User.updateMany(
      { company: companyId },
      { $set: { plan: selectedPlan.id } }
    );

    res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      subscription
    });

  } catch (error) {
    console.error('Erro ao atualizar subscrição:', error);
    res.status(500).json({ message: 'Erro interno ao atualizar subscrição' });
  }
});

// ====================== POST /api/subscriptions/activate ======================
// Ativar plano (usado principalmente para basic/trial)
router.post('/activate', auth, async (req, res) => {
  try {
    const { planId = 'basic' } = req.body;
    const companyId = req.user.company?._id || req.user.company;

    const selectedPlan = await SubscriptionPlan.findOne({ id: planId });
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Plano inválido' });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { company: companyId },
      {
        plan: selectedPlan._id,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true
      },
      { upsert: true, new: true }
    );

    await Company.findByIdAndUpdate(companyId, { plan: selectedPlan.id });
    await User.updateMany({ company: companyId }, { $set: { plan: selectedPlan.id } });

    res.json({ success: true, subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao ativar plano' });
  }
});

// ====================== POST /api/subscriptions/cancel ======================
router.post('/cancel', auth, async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;

    const subscription = await Subscription.findOne({ company: companyId });
    if (!subscription) {
      return res.status(404).json({ message: 'Nenhuma subscrição ativa' });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscription.updatedAt = new Date();
    await subscription.save();

    // Downgrade para plano básico
    const basicPlan = await SubscriptionPlan.findOne({ id: 'basic' });

    await Company.findByIdAndUpdate(companyId, { plan: 'basic' });
    await User.updateMany(
      { company: companyId },
      { $set: { plan: 'basic' } }
    );

    res.json({
      success: true,
      message: 'Subscrição cancelada com sucesso',
      subscription
    });
  } catch (error) {
    console.error('Erro ao cancelar subscrição:', error);
    res.status(500).json({ message: 'Erro ao cancelar subscrição' });
  }
});

// ====================== GET /api/subscriptions/plans (para frontend) ======================
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
      .select('id name price currency billingCycle maxLimits features description isDefault')
      .sort({ price: 1 });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar planos' });
  }
});

module.exports = router;