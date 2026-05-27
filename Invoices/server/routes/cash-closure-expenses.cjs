const express = require('express');
const router = express.Router();
const CashClosureExpense = require('../models/CashClosureExpense.cjs');
const CashClosure = require('../models/CashClosure.cjs');
const { auth } = require('../middleware/auth.cjs');

// Create expense for a cash closure
router.post('/:closureId/expenses', auth, async (req, res) => {
  try {
    const { closureId } = req.params;
    const { description, amount, category = 'other' } = req.body;

    // Verify closure belongs to user's company
    const closure = await CashClosure.findOne({ _id: closureId, company: req.user.company._id });
    if (!closure) return res.status(404).json({ message: 'Cash closure not found' });

    const expense = new CashClosureExpense({
      cashClosure: closureId,
      description,
      amount,
      category,
      createdBy: req.user._id
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get expenses for a cash closure
router.get('/:closureId/expenses', auth, async (req, res) => {
  try {
    const { closureId } = req.params;

    // Verify closure belongs to user's company
    const closure = await CashClosure.findOne({ _id: closureId, company: req.user.company._id });
    if (!closure) return res.status(404).json({ message: 'Cash closure not found' });

    const expenses = await CashClosureExpense.find({ cashClosure: closureId })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete expense
router.delete('/:closureId/expenses/:expenseId', auth, async (req, res) => {
  try {
    const { closureId, expenseId } = req.params;

    // Verify closure belongs to user's company
    const closure = await CashClosure.findOne({ _id: closureId, company: req.user.company._id });
    if (!closure) return res.status(404).json({ message: 'Cash closure not found' });

    const expense = await CashClosureExpense.findOneAndDelete({ _id: expenseId, cashClosure: closureId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
