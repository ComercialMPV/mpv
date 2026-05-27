const express = require('express');
const Client = require('../models/Client.cjs');
const { auth } = require('../middleware/auth.cjs');
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs');

const router = express.Router();

// Get all clients
router.get('/', auth, async (req, res) => {
  try {
    const { 
      search, 
      origin, 
      active, 
      onlyMine, 
      page = 1, 
      limit = 12 
    } = req.query;

    const companyId = req.user.company._id;
    const userId = req.user._id;
    const roleName = req.user.role?.roleName || req.user.role;

    // Roles que têm permissão total (veem tudo sempre)
    const fullAccessRoles = ['admin', 'owner', 'superadmin'];

    // Filtro base multi-tenant
    let filter = { 
      company: companyId,
      isActive: true  // padrão: só ativos (pode ser sobrescrito)
    };

    // 1. Filtro de ativo/inativo
    if (active !== undefined) {
      filter.isActive = active === 'true' || active === true;
    }

    // 2. Filtro de origem
    if (origin && origin !== 'all') {
      filter.origin = origin;
    }

    // 3. Busca textual (nome, email, phone, taxId, contactPerson)
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { taxId: searchRegex },
        { contactPerson: searchRegex }
      ];
    }

    // 4. Lógica de visibilidade por role (regra principal)
    const isFullAccess = fullAccessRoles.includes(roleName);

    if (roleName === 'partner') {
      // Parceiros: SEMPRE só veem os clientes que criaram
      filter.createdBy = userId;
    } 
    else if (!isFullAccess && (onlyMine === 'true' || onlyMine === true)) {
      // Outros utilizadores normais: podem filtrar para ver só os seus
      filter.createdBy = userId;
    }
    // Caso contrário:
    // - admin/owner/superadmin → veem tudo (ignoram onlyMine)
    // - utilizadores normais sem onlyMine → veem todos da empresa

    // Contagem total para paginação
    const total = await Client.countDocuments(filter);

    // Busca paginada + ordenação descendente por data de criação
    const clients = await Client.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    res.json({
      clients,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: 'Erro ao listar clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});
// Get client by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new client (Internal via Auth)
// Create new client (Internal via Auth)
router.post('/', auth, checkSubscriptionLimit('clients'), async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      contactPerson, 
      billingAddress, 
      shippingAddress, 
      taxId, 
      vatNumber, 
      paymentTerms, 
      currency 
    } = req.body;

    const companyId = req.user.company._id;
    const userId = req.user._id;

    // ================== VALIDAÇÃO DE DUPLICADOS ==================
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: 'Nome e email são obrigatórios' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone?.trim() || null;

    // Procurar cliente existente com nome + email + telefone
    const existingClient = await Client.findOne({
      company: companyId,
      $or: [
        { email: normalizedEmail },
        { 
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          phone: normalizedPhone 
        }
      ]
    });

    if (existingClient) {
      return res.status(409).json({
        message: 'Cliente já existe',
        existingClient: {
          _id: existingClient._id,
          name: existingClient.name,
          email: existingClient.email,
          phone: existingClient.phone
        },
        suggestion: 'Quer atualizar este cliente em vez de criar um novo?'
      });
    }
    // ============================================================

    const clientData = {
      ...req.body,
      company: companyId,
      createdBy: userId,           // ← Mantém sempre o criador original
      origin: 'internal',
      email: normalizedEmail,
      phone: normalizedPhone,
      isActive: true
    };

    const client = new Client(clientData);
    await client.save();

    res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      client
    });

  } catch (error) {
    console.error('Create client error:', error);

    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Já existe um cliente com este email ou telefone' 
      });
    }

    res.status(500).json({ message: 'Erro ao criar cliente' });
  }
});

// Update client
router.put('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Top up wallet balance
router.put('/:id/top-up', auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount) || 0;
    if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const client = await Client.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.balance = (client.balance || 0) + amount;
    await client.save();

    // optional: send warning if still low
    if (client.balance <= 10) {
      const emailService = require('../utils/emailService.cjs');
      const salesHistory = await require('../models/Sale.cjs').find({ 'customer.id': client._id });
      await emailService.sendWalletWarningEmail(client.email, client, salesHistory);
    }

    res.json(client);
  } catch (error) {
    console.error('Top-up error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete client
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;