const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.cjs');
const Client = require('../models/Client.cjs');
const { auth } = require('../middleware/auth.cjs');
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs');

// Criar Lead
// routes/leads.cjs
// Criar Lead com verificação de duplicados
router.post('/', auth, checkSubscriptionLimit('leads'), async (req, res) => {
  try {
    const { email, phone } = req.body;

    // Verificação manual para resposta amigável (além do índice do DB)
    const existing = await Lead.findOne({
      company: req.user.company._id,
      $or: [{ email }, { phone }]
    });

    if (existing) {
      return res.status(400).json({ 
        message: 'Já existe um lead com este email ou telefone nesta empresa.' 
      });
    }

    const leadData = {
      ...req.body,
      company: req.user.company._id, 
      createdBy: req.user._id, 
      isPublic: req.body.isPublic || false
    };

    const lead = new Lead(leadData);
    await lead.save(); 
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Listar Leads com Filtro de Privacidade
const workspaceAuth = require('../middleware/workspace.cjs');
router.get('/', auth, workspaceAuth, async (req, res) => {
  const query = {
    company: req.workspaceCompanyId || req.user.company._id,
    $or: [
      { createdBy: req.user._id }, // Criados por mim
      { isPublic: true }           // Ou públicos para a empresa
    ]
  };

  const leads = await Lead.find(query); 
  res.json(leads);
});

// Atualizar Estágio (Kanban Drag & Drop)
router.patch('/:id/stage', auth, async (req, res) => {
  const { stage } = req.body;
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, company: req.user.company._id },
    { stage },
    { new: true }
  );
  res.json(lead);
});

// Converter Lead para Cliente (O passo crucial)
// routes/leads.cjs - Reforço na Conversão 
router.post('/:id/convert', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      company: req.user.company._id 
    });

    if (!lead) return res.status(404).json({ message: 'Lead não encontrado' });

    // 1. Criar o Cliente
    const newClient = new Client({
      company: lead.company,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      origin: 'external',
      createdBy: lead.createdBy,
      notes: `Convertido do Lead: ${lead.notes || ''}\nOriginal createdBy: ${lead.createdBy}`,
    });
    await newClient.save();

    // 2. Atualizar o Lead para 'won' [cite: 22]
    lead.stage = 'won';
    lead.convertedTo = newClient._id;
    lead.convertedAt = new Date();
    await lead.save();

    res.json({ success: true, client: newClient, leadUpdated: lead });
  } catch (error) {
    console.error('Erro na conversão:', error);
    res.status(500).json({ message: 'Erro na conversão' });
  }
});
// Atualizar dados completos do Lead (PUT)
// Diferente do patch de estágio, este endpoint é para editar informações do formulário
// routes/leads.cjs - Validação de Permissão [cite: 23, 25]
router.put('/:id', auth, async (req, res) => {
  // Apenas o criador pode editar os dados principais
  const lead = await Lead.findOneAndUpdate(
    { 
      _id: req.params.id, 
      company: req.user.company._id,
      createdBy: req.user._id // Garante que só o dono edita
    },
    req.body,
    { new: true }
  );

  if (!lead) return res.status(403).json({ message: 'Sem permissão para editar este lead.' });
  res.json(lead);
});

// Deletar um Lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!lead) return res.status(404).json({ message: 'Lead não encontrado' });

    res.json({ message: 'Lead removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover o lead' });
  }
});
module.exports = router;