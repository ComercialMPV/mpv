// Workspace middleware — permite visualizar dados de outra empresa do grupo
// Enviar header: x-workspace-company-id: <companyId>
const Group = require('../models/Group.cjs');

module.exports = async function workspaceAuth(req, res, next) {
  try {
    const rawValue = req.headers['x-workspace-company-id'];
    if (!rawValue || rawValue === 'null' || rawValue === 'undefined') {
      req.workspaceCompanyId = null;
      return next();
    }

    const myCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (!myCompanyId) {
      return res.status(400).json({ message: 'Usuário não possui empresa' });
    }

    const targetStr = rawValue.toString();

    // Same company — no restriction
    if (myCompanyId === targetStr) {
      req.workspaceCompanyId = null;
      return next();
    }

    // Find a group where both companies are active members
    const sharedGroup = await Group.findOne({
      $or: [
        { ownerCompany: myCompanyId },
        { 'members': { $elemMatch: { company: myCompanyId, status: 'active' } } }
      ],
      $or: [
        { ownerCompany: targetStr },
        { 'members': { $elemMatch: { company: targetStr, status: 'active' } } }
      ]
    });

    if (!sharedGroup) {
      return res.status(403).json({ message: 'A empresa alvo não faz parte de nenhum grupo seu' });
    }

    req.workspaceCompanyId = targetStr;
    req.workspaceGroup = sharedGroup;
    next();
  } catch (error) {
    console.error('[Workspace] Error:', error);
    res.status(500).json({ message: 'Erro ao verificar acesso ao workspace' });
  }
};
