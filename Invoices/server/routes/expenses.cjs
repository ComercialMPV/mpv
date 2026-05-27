const express = require('express');
const Expense = require('../models/Expense.cjs');
const { auth } = require('../middleware/auth.cjs');

const router = express.Router();

// Middleware para garantir que todas as rotas usam a empresa do usuário
router.use(auth);

// ====================== GET ALL (com filtros) ======================
router.get('/', async (req, res) => {
  try {
    const { period, startDate, endDate, category, type } = req.query;
    const companyId = req.user.company._id;

    let query = { company: companyId };

    // Filtro por período
    if (period === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.date = { $gte: today };
    } 
    else if (period === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      query.date = { $gte: startOfWeek };
    } 
    else if (period === 'month' || !period) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      query.date = { $gte: startOfMonth };
    } 
    else if (period === 'custom' && startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (category) query.category = category;
    if (type) query.type = type;

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .populate('createdBy', 'firstName lastName')
      .lean();

    // Estatísticas rápidas
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = expenses.length;

    const byCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      expenses,
      summary: {
        total,
        count,
        byCategory
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Erro ao carregar despesas' });
  }
});

// ====================== CREATE ======================
router.post('/', async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      company: req.user.company._id,
      createdBy: req.user._id
    });

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      expense: populated,
      message: 'Despesa registada com sucesso'
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(400).json({ message: error.message });
  }
});

// ====================== UPDATE ======================
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    Object.assign(expense, req.body);
    await expense.save();

    const updated = await Expense.findById(expense._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      expense: updated,
      message: 'Despesa atualizada com sucesso'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ====================== DELETE ======================
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    res.json({
      success: true,
      message: 'Despesa eliminada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao eliminar despesa' });
  }
});

module.exports = router;