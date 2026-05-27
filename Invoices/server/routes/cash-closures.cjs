const express = require('express');
const router = express.Router();
const CashClosure = require('../models/CashClosure.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const Sale = require('../models/Sale.cjs');
const User = require('../models/User.cjs');
const { auth } = require('../middleware/auth.cjs');
const emailService = require('../utils/emailService.cjs');

// Helper to get day boundaries for a date
function dayRange(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const start = new Date(d);
  const end = new Date(d);
  end.setHours(23,59,59,999);
  return { start, end };
}

// Request to open cash register (will be reviewed by admin/supervisor)
router.post('/open', auth, async (req, res) => {
  try {
    const { initialFloat, notes } = req.body;
    const now = new Date();

    // 1. Criar o registro de abertura de caixa
    const closure = new CashClosure({
      company: req.user.company._id,
      createdBy: req.user._id,
      date: now,
      openRequestedAt: now,
      initialFloat: initialFloat || 0,
      notes: notes || '',
      status: 'draft',
      openStatus: 'pending'
    });

    await closure.save();

    // 2. BUSCA DE ROLES: Encontrar os IDs dos roles permitidos para notificação
    const allowedRoleNames = ['admin', 'supervisor', 'owner', 'manager'];
    const roles = await RolePermission.find({ 
      roleName: { $in: allowedRoleNames } 
    }).select('_id');
    
    const roleIds = roles.map(r => r._id);

    // 3. Notificar administradores e supervisores usando os ObjectIds encontrados
    const recipients = await User.find({ 
      company: req.user.company._id, 
      role: { $in: roleIds }, // Agora usamos a lista de ObjectIds
      isActive: true 
    }).select('email');

    const emails = recipients.map(r => r.email).filter(Boolean);
    
    if (emails.length) {
      try {
        // Assume-se que o req.user.company já foi populado no middleware 'auth'
        await emailService.sendCashClosureOpenRequest(
          emails.join(','), 
          closure, 
          req.user, 
          req.user.company
        );
      } catch (err) {
        console.error('Failed to send cash open notifications:', err);
      }
    }

    res.status(201).json(closure);
  } catch (err) {
    console.error('Open cash request error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create cash closure for current user for a date (defaults to today)
router.post('/', auth, async (req, res) => {
  try {
    const { date: dateStr } = req.body;
    const date = dateStr ? new Date(dateStr) : new Date();
    const { start, end } = dayRange(date);

    // 1. Agregação de vendas (Filtros por ID funcionam normalmente aqui)
    const sales = await Sale.find({
      company: req.user.company._id,
      createdBy: req.user._id,
      createdAt: { $gte: start, $lte: end }
    });

    const salesCount = sales.length;
    const totalSalesAmount = sales.reduce((s, item) => s + (item.total || 0), 0);
    const totalAmountPaid = sales.reduce((s, item) => s + (item.amountPaid || 0), 0);

    const closure = new CashClosure({
      company: req.user.company._id,
      createdBy: req.user._id,
      date: start,
      salesCount,
      totalSalesAmount,
      totalAmountPaid,
      notes: req.body.notes || ''
    });

    await closure.save();

    // 2. BUSCA DE ROLES: Obter os ObjectIds para os papéis de admin e supervisor
    const targetRoles = await RolePermission.find({ 
      roleName: { $in: ['admin', 'supervisor'] } 
    }).select('_id');
    
    const roleIds = targetRoles.map(r => r._id);

    // 3. Notificar administradores e supervisores usando os IDs encontrados
    if (roleIds.length > 0) {
      const recipients = await User.find({ 
        company: req.user.company._id, 
        role: { $in: roleIds }, // Uso correto do ObjectId após a migração
        isActive: true 
      }).select('email');

      const emails = recipients.map(r => r.email).filter(Boolean);
      
      if (emails.length) {
        try {
          // O req.user.company deve estar populado via middleware auth
          await emailService.sendCashClosureNotification(
            emails.join(','), 
            closure, 
            req.user, 
            req.user.company
          );
        } catch (err) {
          console.error('Failed to send cash closure notifications:', err);
        }
      }
    }

    res.status(201).json(closure);
  } catch (err) {
    console.error('Create cash closure error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all closures (admins see company-wide, users see their own)
// allows filtering by openStatus (pending/approved/denied) and normal status
router.get('/', auth, async (req, res) => {
  try {
    const { openStatus, status } = req.query;
    const filter = { company: req.user.company._id };

    // 1. Extração segura do nome do role (populado pelo middleware auth)
    const roleName = req.user.role?.roleName || req.user.role;

    // 2. Verificação de permissão corrigida
    // Se NÃO for admin nem supervisor, ele só vê os próprios fechos
    if (roleName !== 'admin' && roleName !== 'supervisor') {
      filter.createdBy = req.user._id;
    }

    // 3. Filtros opcionais da query string
    if (openStatus) {
      filter.openStatus = openStatus;
    }
    if (status) {
      filter.status = status;
    }

    // 4. Execução da busca com populate
    const closures = await CashClosure.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ date: -1 });

    res.json(closures);
  } catch (err) {
    console.error('[CashClosure List] Erro:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get mine (current user closures)
router.get('/mine', auth, async (req, res) => {
  try {
    const closures = await CashClosure.find({ company: req.user.company._id, createdBy: req.user._id }).sort({ date: -1 });
    res.json(closures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Confirm closure (cashier confirms counted total and optionally add notes)
router.put('/:id/confirm', auth, async (req, res) => {
  try {
    const { countedTotal, notes } = req.body;
    const closure = await CashClosure.findOne({ _id: req.params.id, company: req.user.company._id });
    
    if (!closure) return res.status(404).json({ message: 'Fecho não encontrado' });

    // 1. Extração segura do nome do role (populado pelo middleware auth)
    const roleName = req.user.role?.roleName || req.user.role;

    // 2. Verificação de permissão: Apenas o criador ou um admin pode confirmar
    if (String(closure.createdBy) !== String(req.user._id) && roleName !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    closure.countedTotal = countedTotal !== undefined ? countedTotal : closure.countedTotal;
    closure.notes = notes !== undefined ? notes : closure.notes;
    closure.status = 'confirmed';
    closure.confirmedAt = new Date();
    closure.confirmedBy = req.user._id;

    await closure.save();

    // 3. BUSCA DE ROLES: Obter os ObjectIds para os papéis de admin e supervisor
    const targetRoles = await RolePermission.find({ 
      roleName: { $in: ['admin', 'supervisor'] } 
    }).select('_id');
    
    const roleIds = targetRoles.map(r => r._id);

    // 4. Notificar administradores e supervisores usando os IDs encontrados
    if (roleIds.length > 0) {
      const recipients = await User.find({ 
        company: req.user.company._id, 
        role: { $in: roleIds }, 
        isActive: true 
      }).select('email');

      const emails = recipients.map(r => r.email).filter(Boolean);
      
      if (emails.length) {
        try {
          await emailService.sendCashClosureConfirmedNotification(
            emails.join(','), 
            closure, 
            req.user, 
            req.user.company
          );
        } catch (err) {
          console.error('Failed to send cash closure confirmed notifications:', err);
        }
      }
    }

    res.json(closure);
  } catch (err) {
    console.error('Confirm cash closure error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Approve / deny open request (admin or supervisor)
router.put('/:id/open-status', auth, async (req, res) => {
  try {
    const { openStatus } = req.body; // 'approved' or 'denied'
    
    // 1. Validação básica do status
    if (!['approved', 'denied'].includes(openStatus)) {
      return res.status(400).json({ message: 'Status de abertura inválido' });
    }

    const closure = await CashClosure.findOne({ 
      _id: req.params.id, 
      company: req.user.company._id 
    });
    
    if (!closure) return res.status(404).json({ message: 'Fecho de caixa não encontrado' });

    // 2. Extração segura do nome do role (populado pelo middleware auth)
    const roleName = req.user.role?.roleName || req.user.role;

    // 3. Verificação de permissão corrigida: apenas cargos de gestão podem aprovar/negar
    const allowedRoles = ['admin', 'supervisor', 'owner', 'manager'];
    
    if (!allowedRoles.includes(roleName)) {
      return res.status(403).json({ message: 'Acesso negado: permissões insuficientes' });
    }

    // 4. Atualização do status
    closure.openStatus = openStatus;
    
    // Se aprovado, podemos registrar quem aprovou (opcional, mas recomendado)
     closure.approvedBy = req.user._id; 
    
    await closure.save();

    // 5. Notificar o caixa (quem solicitou a abertura) sobre o resultado
    const requester = await User.findById(closure.createdBy).select('email firstName');
    
    if (requester?.email) {
      try {
        await emailService.sendCashClosureOpenResult(
          requester.email, 
          closure, 
          openStatus
        );
      } catch (err) {
        console.error('Failed to send open request result email:', err);
      }
    }

    res.json(closure);
  } catch (err) {
    console.error('[open-status] Erro:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
