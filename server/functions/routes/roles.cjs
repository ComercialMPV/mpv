// routes/admin.cjs (ou routes/roles.cjs) – Gestão de Roles/Permissões

const express = require('express');
const router = express.Router();

const RolePermission = require('../models/RolePermission.cjs');
const { auth, superAdminAuth } = require('../middleware/auth.cjs');

const adminOwnerAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

  // Popula o role caso ainda não esteja populado para garantir acesso ao nome
  // (Nota: O populate no auth original já deveria ter feito isso)
  const roleName = req.user.role?.roleName;

  if (['admin', 'owner', 'superadmin'].includes(roleName)) {
    return next();
  }

  return res.status(403).json({ message: 'Acesso restrito a administradores' });
};
// GET /api/admin/roles - Lista todos os roles customizados da empresa logada
router.get('/', auth, async (req, res) => {
  try {
    // 1. Popule o role para garantir que temos o nome do role no req.user
    await req.user.populate('role'); 
    
    // 2. Verificação manual de permissão
    const roleName = req.user.role?.roleName;
    if (!['admin', 'owner', 'superadmin', 'partner' ].includes(roleName)) {
      return res.status(403).json({ message: 'Acesso restrito' });
    }

    const roles = await RolePermission.find({ 
      company: req.user.company._id 
    }).lean();

    res.json({ roles });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar roles' });
  }
});
// Adicione isto ao seu routes/roles.cjs
router.get('/details/:roleId', auth, async (req, res) => {
  try {
    const role = await RolePermission.findById(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Role não encontrado' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar detalhes do role' });
  }
});
// POST /api/admin/roles - Criar novo role personalizado
router.post('/', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { name, description, allowedMenuItems = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'O nome do role é obrigatório' });
    }

    const existing = await RolePermission.findOne({ 
      roleName: name.trim(), 
      company: req.user.company._id 
    });

    if (existing) {
      return res.status(400).json({ message: 'Já existe um role com este nome na empresa' });
    }

    const role = new RolePermission({
      roleName: name.trim(),
      description: description?.trim() || undefined,
      allowedMenuItems,
      company: req.user.company._id,
      createdBy: req.user._id,
      isActive: true,
    });

    await role.save();

    res.status(201).json({ role });
  } catch (err) {
    console.error('Erro ao criar role:', err);
    res.status(500).json({ message: 'Erro ao criar role' });
  }
});


router.put('/:roleName', auth, adminOwnerAuth, async (req, res) => {
  try {
    const { allowedMenuItems, description, isActive } = req.body;

    const role = await RolePermission.findOneAndUpdate(
      { 
        roleName: req.params.roleName, 
        company: req.user.company._id 
      },
      { 
        allowedMenuItems: allowedMenuItems || [],
        description: description?.trim(),
        isActive: isActive !== undefined ? isActive : true,
      },
      { new: true, runValidators: true }
    );

    if (!role) {
      return res.status(404).json({ message: 'Role não encontrado' });
    }

    res.json({ role });
  } catch (err) {
    console.error('Erro ao atualizar role:', err);
    res.status(500).json({ message: 'Erro ao atualizar role' });
  }
});


router.delete('/:roleName', auth, adminOwnerAuth, async (req, res) => {
  try {
    const role = await RolePermission.findOneAndDelete({
      roleName: req.params.roleName,
      company: req.user.company._id,
    });

    if (!role) {
      return res.status(404).json({ message: 'Role não encontrado' });
    }

    res.json({ message: 'Role removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover role:', err);
    res.status(500).json({ message: 'Erro ao remover role' });
  }
});

module.exports = router;