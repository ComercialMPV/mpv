const express = require('express');
const Supplier = require('../models/Supplier.cjs');
const { auth } = require('../middleware/auth.cjs');

const router = express.Router();

// Get all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const { search, active, page = 1, limit = 50 } = req.query;
    
    const filter = { company: req.user.company._id };
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    
    if (search) {
      filter.$text = { $search: search };
    }

    const suppliers = await Supplier.find(filter)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Supplier.countDocuments(filter);

    res.json({
      suppliers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get supplier by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new supplier
router.post('/', auth, async (req, res) => {
  try {
    const supplierData = {
      ...req.body,
      company: req.user.company._id
    };

    const supplier = new Supplier(supplierData);
    await supplier.save();

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update supplier
router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete supplier
router.delete('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;