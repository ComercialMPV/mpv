const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon.cjs');
const { auth } = require('../middleware/auth.cjs');

// Validar cupão (Rota usada pelo PDV)
router.get('/validate/:code', auth, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ 
      code: req.params.code.toUpperCase(), 
      active: true,
      company: req.user.company._id 
    });

    if (!coupon) return res.status(404).json({ valid: false, message: 'Cupão inválido' });
    
    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return res.status(400).json({ valid: false, message: 'Cupão expirado' });
    }

    res.json({ valid: true, value: coupon.value, discountType: coupon.discountType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Listar todos os cupões da empresa
router.get('/', auth, async (req, res) => {
  const coupons = await Coupon.find({ company: req.user.company._id });
  res.json(coupons);
});

// Criar cupão
router.post('/', auth, async (req, res) => {
  try {
    const coupon = new Coupon({ ...req.body, company: req.user.company._id });
    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;