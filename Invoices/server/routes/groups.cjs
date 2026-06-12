const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.cjs');
const Group = require('../models/Group.cjs');
const Company = require('../models/Company.cjs');
const User = require('../models/User.cjs');
const Sale = require('../models/Sale.cjs');
const Goal = require('../models/Goal.cjs');
const Lead = require('../models/Lead.cjs');
const Document = require('../models/Document.cjs');
const crypto = require('crypto');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function isActiveMember(member) {
  return member && member.status === 'active';
}

function resolveCompanyId(val) {
  return (val && val._id) ? val._id.toString() : val ? val.toString() : null;
}

async function isGroupMember(group, companyId) {
  const strId = companyId.toString();
  return group.members.some(m =>
    m.status === 'active' && resolveCompanyId(m.company) === strId
  );
}

async function canAccessGroupData(group, companyId) {
  const strId = companyId.toString();
  const isOwner = resolveCompanyId(group.ownerCompany) === strId;
  const isMember = await isGroupMember(group, companyId);
  return isOwner || isMember;
}

// POST /api/groups — Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nome do grupo é obrigatório' });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      return res.status(400).json({ message: 'Usuário não possui empresa' });
    }

    let inviteCode;
    let attempts = 0;
    while (attempts < 10) {
      inviteCode = generateInviteCode();
      const existing = await Group.findOne({ inviteCode });
      if (!existing) break;
      attempts++;
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user._id,
      ownerCompany: companyId,
      inviteCode,
      members: [{
        company: companyId,
        invitedBy: req.user._id,
        status: 'active',
        joinedAt: new Date()
      }]
    });

    await group.populate('ownerCompany', 'name logo email');
    await group.populate('members.company', 'name logo email');

    res.status(201).json(group);
  } catch (error) {
    console.error('[Groups] Create error:', error);
    res.status(500).json({ message: 'Erro ao criar grupo', error: error.message });
  }
});

// GET /api/groups — List groups I belong to
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;

    const groups = await Group.find({
      $or: [
        { ownerCompany: companyId },
        { 'members': { $elemMatch: { company: companyId, status: 'active' } } }
      ]
    })
      .populate('ownerCompany', 'name logo')
      .populate('members.company', 'name logo email phone')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('[Groups] List error:', error);
    res.status(500).json({ message: 'Erro ao listar grupos', error: error.message });
  }
});

// GET /api/groups/:id — Get group details
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('ownerCompany', 'name logo email')
      .populate('members.company', 'name logo email phone');

    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    const canAccess = await canAccessGroupData(group, companyId);
    if (!canAccess) {
      return res.status(403).json({ message: 'Sem permissão para ver este grupo' });
    }

    res.json(group);
  } catch (error) {
    console.error('[Groups] Get error:', error);
    res.status(500).json({ message: 'Erro ao obter grupo', error: error.message });
  }
});

// GET /api/groups/:id/invite-code — Get invite code (owner only)
router.get('/:id/invite-code', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (group.ownerCompany.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Apenas o criador do grupo pode ver o código de convite' });
    }

    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    console.error('[Groups] Invite code error:', error);
    res.status(500).json({ message: 'Erro ao obter código de convite', error: error.message });
  }
});

// DELETE /api/groups/:id/members/:companyId — Remove member
router.delete('/:id/members/:companyId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    const isOwner = group.ownerCompany.toString() === companyId.toString();

    const targetId = req.params.companyId;
    const isSelf = targetId === companyId.toString();

    if (!isOwner && !isSelf) {
      return res.status(403).json({ message: 'Sem permissão para remover este membro' });
    }

    group.members = group.members.filter(m => m.company.toString() !== targetId);
    await group.save();

    res.json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    console.error('[Groups] Remove member error:', error);
    res.status(500).json({ message: 'Erro ao remover membro', error: error.message });
  }
});

// PUT /api/groups/:id — Update group (name/description)
router.put('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (group.ownerCompany.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Apenas o criador do grupo pode editar' });
    }

    if (req.body.name !== undefined) group.name = req.body.name.trim();
    if (req.body.description !== undefined) group.description = req.body.description.trim();

    await group.save();
    await group.populate('members.company', 'name logo email phone');

    res.json(group);
  } catch (error) {
    console.error('[Groups] Update error:', error);
    res.status(500).json({ message: 'Erro ao atualizar grupo', error: error.message });
  }
});

// DELETE /api/groups/:id — Delete group (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (group.ownerCompany.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Apenas o criador do grupo pode excluí-lo' });
    }

    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: 'Grupo excluído com sucesso' });
  } catch (error) {
    console.error('[Groups] Delete error:', error);
    res.status(500).json({ message: 'Erro ao excluir grupo', error: error.message });
  }
});

// ===================== INVITE & JOIN =====================

// POST /api/groups/join/:inviteCode — Join a group by invite code
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!group) {
      return res.status(404).json({ message: 'Código de convite inválido' });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      return res.status(400).json({ message: 'Usuário não possui empresa' });
    }

    const strCompanyId = companyId.toString();

    if (group.ownerCompany.toString() === strCompanyId) {
      return res.status(400).json({ message: 'Você já é o criador deste grupo' });
    }

    const existingMember = group.members.find(m => m.company.toString() === strCompanyId);
    if (existingMember) {
      if (existingMember.status === 'active') {
        return res.status(400).json({ message: 'A sua empresa já faz parte deste grupo' });
      }
      if (existingMember.status === 'removed') {
        return res.status(400).json({ message: 'A sua empresa foi removida deste grupo' });
      }
      existingMember.status = 'active';
      existingMember.joinedAt = new Date();
    } else {
      group.members.push({
        company: companyId,
        invitedBy: null,
        status: 'active',
        joinedAt: new Date()
      });
    }

    await group.save();
    await group.populate('members.company', 'name logo email');

    res.json({ message: 'Entrou no grupo com sucesso', group });
  } catch (error) {
    console.error('[Groups] Join error:', error);
    res.status(500).json({ message: 'Erro ao entrar no grupo', error: error.message });
  }
});

// POST /api/groups/:id/invite — Invite a company by email
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email da empresa é obrigatório' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (group.ownerCompany.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Apenas o criador do grupo pode convidar' });
    }

    const targetCompany = await Company.findOne({ email: email.toLowerCase().trim() });
    if (!targetCompany) {
      return res.status(404).json({ message: 'Nenhuma empresa encontrada com este email' });
    }

    const strTargetId = targetCompany._id.toString();
    if (group.ownerCompany.toString() === strTargetId) {
      return res.status(400).json({ message: 'Não pode convidar a si mesmo' });
    }

    const existingMember = group.members.find(m => m.company.toString() === strTargetId);
    if (existingMember) {
      if (existingMember.status === 'active') {
        return res.status(400).json({ message: 'Esta empresa já faz parte do grupo' });
      }
      if (existingMember.status === 'pending') {
        return res.status(400).json({ message: 'Convite já enviado para esta empresa' });
      }
    }

    group.members.push({
      company: targetCompany._id,
      invitedBy: req.user._id,
      status: 'pending',
      invitedAt: new Date()
    });

    await group.save();
    await group.populate('members.company', 'name logo email');

    res.json({ message: 'Convite enviado com sucesso', group });
  } catch (error) {
    console.error('[Groups] Invite error:', error);
    res.status(500).json({ message: 'Erro ao enviar convite', error: error.message });
  }
});

// POST /api/groups/:id/accept — Accept pending invitation
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    const strId = companyId.toString();

    const member = group.members.find(m => m.company.toString() === strId);
    if (!member) {
      return res.status(400).json({ message: 'Nenhum convite pendente para este grupo' });
    }

    if (member.status !== 'pending') {
      return res.status(400).json({ message: 'Este convite já foi processado' });
    }

    member.status = 'active';
    member.joinedAt = new Date();
    await group.save();

    res.json({ message: 'Convite aceite com sucesso', group });
  } catch (error) {
    console.error('[Groups] Accept error:', error);
    res.status(500).json({ message: 'Erro ao aceitar convite', error: error.message });
  }
});

// POST /api/groups/:id/decline — Decline pending invitation
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const companyId = req.user.company?._id || req.user.company;
    const strId = companyId.toString();

    const member = group.members.find(m => m.company.toString() === strId);
    if (!member || member.status !== 'pending') {
      return res.status(400).json({ message: 'Nenhum convite pendente para recusar' });
    }

    member.status = 'declined';
    await group.save();

    res.json({ message: 'Convite recusado' });
  } catch (error) {
    console.error('[Groups] Decline error:', error);
    res.status(500).json({ message: 'Erro ao recusar convite', error: error.message });
  }
});

// ===================== CROSS-COMPANY DATA ACCESS =====================

// Helper: verify group access and return company id
async function verifyGroupAccess(groupId, companyId) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: 'Grupo não encontrado' };

  const canAccess = await canAccessGroupData(group, companyId);
  if (!canAccess) throw { status: 403, message: 'Sem permissão' };

  return group;
}

function getCompanyId(req) {
  return req.user.company?._id || req.user.company;
}

// GET /api/groups/:id/companies — List active companies in group
router.get('/:id/companies', auth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const group = await verifyGroupAccess(req.params.id, companyId);

    const activeCompanyIds = group.members
      .filter(m => m.status === 'active')
      .map(m => m.company);

    const companies = await Company.find({
      _id: { $in: [...activeCompanyIds, group.ownerCompany] }
    }).select('name logo email phone address city currency');

    res.json(companies);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('[Groups] Companies error:', error);
    res.status(500).json({ message: 'Erro ao listar empresas do grupo', error: error.message });
  }
});

// GET /api/groups/:id/company/:targetCompanyId/dashboard
router.get('/:id/company/:targetCompanyId/dashboard', auth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const group = await verifyGroupAccess(req.params.id, companyId);

    const targetId = req.params.targetCompanyId;
    const isMember = await canAccessGroupData(group, targetId);
    if (!isMember) {
      return res.status(403).json({ message: 'Empresa alvo não faz parte do grupo' });
    }

    const targetObjectId = targetId;

    const [
      totalSales,
      todaySales,
      totalDocuments,
      totalClients,
      totalLeads,
      totalGoals,
      totalRevenue,
    ] = await Promise.all([
      Sale.countDocuments({ company: targetObjectId }),
      Sale.countDocuments({
        company: targetObjectId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Document.countDocuments({ company: targetObjectId }),
      require('../models/Client.cjs').countDocuments({ company: targetObjectId, isActive: { $ne: false } }),
      Lead.countDocuments({ company: targetObjectId, isActive: { $ne: false } }),
      Goal.countDocuments({ company: targetObjectId }),
      Sale.aggregate([
        { $match: { company: targetObjectId, status: { $in: ['paid', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
    ]);

    const companyInfo = await Company.findById(targetId).select('name logo email phone currency');

    res.json({
      company: companyInfo,
      stats: {
        totalSales,
        todaySales,
        totalDocuments,
        totalClients,
        totalLeads,
        totalGoals,
        totalRevenue: totalRevenue[0]?.total || 0,
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('[Groups] Company dashboard error:', error);
    res.status(500).json({ message: 'Erro ao carregar dados da empresa', error: error.message });
  }
});

module.exports = router;
