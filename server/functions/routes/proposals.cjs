const express = require('express');
const router = express.Router();
const Document = require('../models/Document.cjs');
const Proposal = require('../models/Proposal.cjs');
const Template = require('../models/Template.cjs');
const { auth } = require('../middleware/auth.cjs');
const emailService = require('../utils/emailService.cjs');
const handlebars = require('handlebars'); // Certifique-se de ter o handlebars importado
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Helper para converter logo em Base64 (conforme usado no seu pdf.cjs)
async function getBase64Logo(logoValue) {
  if (!logoValue) return null;
  try {
    let buffer;
    if (logoValue.startsWith('/') || logoValue.startsWith('C:\\') || path.isAbsolute(logoValue)) {
      const fullPath = logoValue.startsWith('/') ? path.join(process.cwd(), logoValue) : logoValue;
      buffer = await fs.readFile(fullPath);
    } else if (logoValue.startsWith('http')) {
      const response = await fetch(logoValue);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      return logoValue; // Já é base64 ou formato desconhecido
    }
    const extension = path.extname(logoValue).substring(1) || 'png';
    return `data:image/${extension};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('Erro ao processar logo para template:', err);
    return null;
  }
}

// 1. Upload temporário de anexos (antes de criar a proposta)
// proposals.cjs – rota /temp-attachments
router.post('/temp-attachments', auth, async (req, res) => {
  try {
    const { files, fields } = await parseMultipart(req);  // ← Busboy vai ler req.pipe(busboy)

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum ficheiro recebido' });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const ext = path.extname(file.originalname || '.bin');
      const gcsPath = `temp-proposals/${uuidv4()}${ext}`;
      const blob = bucket.file(gcsPath);

      await blob.save(file.buffer, {
        resumable: false,
        metadata: { contentType: file.mimetype || 'application/octet-stream' }
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`;

      uploadedFiles.push({
        filename: file.originalname,
        publicUrl,
        gcsPath,
        mimetype: file.mimetype,
        size: file.size
      });
    }

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (err) {
    console.error('Erro no upload temporário:', err);
    res.status(500).json({ 
      error: 'Falha ao processar upload', 
      details: err.message 
    });
  }
});

// 2. Criar + enviar proposta
// 2. Criar + enviar proposta (versão simplificada – só Proposal)

router.post('/', auth, async (req, res) => {
  try {
    const { recipients, items, message, subject, attachments = [], clientId, templateId } = req.body;

    if (!recipients?.length || !items?.length || !subject || !clientId) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    const proposal = new Proposal({
      company: req.user.company._id,
      client: clientId,
      template: templateId, // Permite escolher um template específico se desejar
      createdBy: req.user._id,
      subject,
      message,
      recipients: recipients.map(r => ({
        type: r.type,
        id: r.id,
        email: r.email,
        name: r.name || '',
      })),

      // --- ADEQUAÇÃO AO TEMPLATE GLOBAL ---
      // Mapeamos os campos do frontend para os campos que o template já renderiza
      items: items.map(item => ({
        // O template provavelmente usa {{description}} ou {{name}}
        description: item.name || item.description || 'Item', 
        
        // O template usa {{quantity}}
        quantity: Number(item.quantity) || 1,
        
        // O template usa {{unitPrice}} ou {{price}}? 
        // Ajustamos para unitPrice que é o padrão do seu Schema Proposal.cjs
        unitPrice: Number(item.price) || Number(item.unitPrice) || 0,
      })),

      attachments: attachments.map(a => ({
        filename: a.originalname || a.filename || 'anexo',
        publicUrl: a.publicUrl,
        size: a.size || 0,
      })),

      status: 'sent',
      sentAt: new Date(),
      // Define validade (usado no template como {{expiresAtFormatted}})
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      shareToken: uuidv4(),
    });

    await proposal.save();

    const shareUrl = `${process.env.CLIENT_URL}/share/${proposal.shareToken}`;

    // Envio de email com objeto puro para evitar erros de context do Mongoose
    for (const recipient of recipients) {
      if (!recipient.email) continue;
      await emailService.sendProposalEmail(
        recipient.email,
        proposal.toObject(), 
        shareUrl,
        message,
        [], 
        subject,
        proposal.attachments || []
      );
    }

    res.json({
      success: true,
      proposalId: proposal._id,
      shareUrl
    });

  } catch (err) {
    console.error('Erro ao criar proposta:', err);
    res.status(500).json({ error: 'Erro ao processar proposta' });
  }
});

// routes/proposals.cjs
// routes/proposals.cjs
router.get('/', auth, async (req, res) => {
  try {
    const filter = { company: req.user.company._id };

    // 1. Lógica de visibilidade por role (CORRIGIDO)
    // req.user.role é um objeto { _id, name, ... }, não uma string
    const userRoleName = req.user.role?.name?.toLowerCase() || 'user';

    if (!['superadmin', 'admin', 'owner'].includes(userRoleName)) {
      // Utilizadores que não são admin só veem as propostas que criaram
      filter.createdBy = req.user._id;
    }

    // 2. Busca as propostas com os novos relacionamentos
    const proposals = await Proposal.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('client', 'name email phone')
      .populate('template', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    // 3. Enriquecer os dados
    const enrichedProposals = proposals.map(p => {
      const proposalObj = p.toObject();
      
      const total = (proposalObj.items || []).reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return acc + (qty * price);
      }, 0);

      return {
        ...proposalObj,
        total,
        totalFormatted: total.toLocaleString('pt-MZ', { 
          style: 'currency', 
          currency: 'MZN' 
        }).replace('MZN', 'MT'),
        isExpired: proposalObj.expiresAt ? new Date(proposalObj.expiresAt) < new Date() : false,
        daysUntilExpiration: proposalObj.expiresAt 
          ? Math.ceil((new Date(proposalObj.expiresAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
          : null
      };
    });

    res.json({ 
      success: true,
      proposals: enrichedProposals 
    });
  } catch (err) {
    console.error('Erro ao listar propostas:', err);
    res.status(500).json({ 
      error: 'Erro ao listar propostas', 
      details: err.message 
    });
  }
});

// proposals.cjs – adicione estas rotas ao final do ficheiro (depois das rotas existentes)

// DELETE /api/proposals/:id  → Apagar uma proposta
router.delete('/:id', auth, async (req, res) => {
  try {
    const proposal = await Proposal.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

   // Na rota DELETE (linha ~196)
const userRoleName = req.user.role?.name?.toLowerCase() || 'user';
const isAdminOrSuper = ['superadmin', 'admin'].includes(userRoleName);

    // Só o criador ou admin/superadmin pode apagar
    if (!isAdminOrSuper && proposal.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Sem permissão para apagar esta proposta' });
    }

    // Opcional: também apagar o Document associado se não for usado em mais lado
    // await Document.findByIdAndDelete(proposal.document);

    await Proposal.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Proposta eliminada com sucesso' });
  } catch (err) {
    console.error('Erro ao eliminar proposta:', err);
    res.status(500).json({ error: 'Erro ao eliminar proposta', details: err.message });
  }
});

// PUT /api/proposals/:id  → Editar proposta (ex: mensagem, assunto, status, etc.)
// routes/proposals.cjs
router.put('/:id', auth, async (req, res) => {
  try {
    const proposal = await Proposal.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

   // Na rota PUT (linha ~232)
const userRoleName = req.user.role?.name?.toLowerCase() || 'user';
const isAdminOrSuper = ['superadmin', 'admin'].includes(userRoleName);

    // Só o criador ou admin/superadmin pode editar
    if (!isAdminOrSuper && proposal.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Sem permissão para editar esta proposta' });
    }

    // Campos permitidos para edição direta no Proposal
    const allowedUpdates = ['subject', 'message', 'status', 'expiresAt'];
    const updates = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Se o frontend enviar novos items → atualiza a lista de itens
    if (req.body.items && Array.isArray(req.body.items)) {
      updates.items = req.body.items.map(item => ({
        description: item.name || item.description || 'Item',
        quantity: item.quantity || 1,
        unitPrice: item.price || item.unitPrice || 0
      }));

      // Opcional: recalcular total (se quiseres guardar no model)
      updates.total = updates.items.reduce((acc, item) => {
        return acc + ((item.quantity || 1) * (item.unitPrice || 0));
      }, 0);
    }

    // Se o frontend enviar novos attachments → atualiza (ex: adicionar/remover)
    if (req.body.attachments && Array.isArray(req.body.attachments)) {
      updates.attachments = req.body.attachments.map(a => ({
        filename: a.filename || a.originalname || 'anexo',
        publicUrl: a.publicUrl,
        size: a.size || 0
        // gcsPath, mimetype opcionais
      }));
    }

    // Aplicar as atualizações
    Object.assign(proposal, updates);
    await proposal.save();

    // Re-popular apenas o createdBy (não tem document)
    const updated = await Proposal.findById(proposal._id)
      .populate('createdBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Proposta atualizada com sucesso',
      proposal: updated
    });
  } catch (err) {
    console.error('Erro ao atualizar proposta:', err);
    res.status(500).json({ error: 'Erro ao atualizar proposta', details: err.message });
  }
});

// POST /api/proposals/:id/resend  → Re-enviar a proposta para os mesmos destinatários
// routes/proposals.cjs
// routes/proposals.cjs
router.post('/:id/resend', auth, async (req, res) => {
  try {
    // 1. Procurar a proposta e popular o cliente (necessário para o template do email)
    const proposal = await Proposal.findOne({
      _id: req.params.id,
      company: req.user.company._id
    }).populate('client');

    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    // 2. Lógica de permissões atualizada conforme o seu sistema de roles
    // Na rota RESEND (linha ~305)
const userRoleName = req.user.role?.name?.toLowerCase() || 'user';
const isAdminOrSuper = ['superadmin', 'admin', 'owner'].includes(userRoleName);

    if (!isAdminOrSuper && proposal.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Sem permissão para re-enviar esta proposta' });
    }

    // 3. Gerar URL de partilha (garantir que usamos o token existente)
    const shareUrl = `${process.env.CLIENT_URL}/share/${proposal.shareToken}`;

    // 4. Converter para objeto simples para o emailService (evita erros de "own property")
    const proposalData = proposal.toObject();

    // 5. Re-enviar emails para todos os destinatários
    for (const recipient of proposal.recipients) {
      if (!recipient.email) continue;

      await emailService.sendProposalEmail(
        recipient.email,
        proposalData,           // Passamos o objeto puro
        shareUrl,
        proposal.message,       
        [],                     // CC (opcional)
        proposal.subject,       
        proposal.attachments || []
      );

      // Atualiza rastreio individual
      recipient.sentAt = new Date();
    }

    // 6. Atualizar metadados da proposta
    proposal.status = 'sent';
    proposal.sentAt = new Date();
    
    // Incrementa contador ou reseta conforme a sua regra de negócio
    // proposal.viewCount = 0; 

    // Usamos validateModifiedOnly para evitar o erro "client is required" 
    // causado pelo populate anterior
    await proposal.save({ validateModifiedOnly: true });

    res.json({
      success: true,
      message: `Proposta re-enviada com sucesso para ${proposal.recipients.length} destinatário(s)`,
      sentAt: proposal.sentAt
    });

  } catch (err) {
    console.error('Erro ao re-enviar proposta:', err);
    res.status(500).json({ 
      error: 'Erro ao re-enviar proposta', 
      details: err.message 
    });
  }
});
// routes/proposals.cjs
router.get('/track/open/:proposalId/:recipientId', async (req, res) => {
  try {
    const { proposalId, recipientId } = req.params;

    // Atualiza o recipient específico dentro da proposta
    const updatedProposal = await Proposal.findOneAndUpdate(
      { 
        _id: proposalId,
        'recipients._id': recipientId  // procura o recipient pelo _id interno
      },
      { 
        $set: { 
          'recipients.$.openedAt': new Date(),     // data de abertura
          'recipients.$.ignored': false             // marca como não ignorado (opcional)
        },
        $inc: { openCount: 1 }                     // incrementa contador geral (se adicionares o campo)
      },
      { new: true }  // retorna o documento atualizado
    );

    if (!updatedProposal) {
      console.warn(`Tentativa de track open falhou: proposalId=${proposalId}, recipientId=${recipientId}`);
      // Ainda envia pixel para não quebrar o tracking (mas loga o erro)
    } else {
      // Opcional: atualiza status geral da proposta se necessário
      const allOpened = updatedProposal.recipients.every(r => r.openedAt);
      if (allOpened && updatedProposal.status !== 'opened') {
        updatedProposal.status = 'opened';
        await updatedProposal.save();
      }
    }

    // Retorna pixel 1x1 transparente (sempre, mesmo em erro – evita alertas no email)
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.status(200).send(pixel);
  } catch (err) {
    console.error('Erro no pixel de tracking de abertura:', err);
    // Mesmo em erro, retorna pixel para não quebrar o email
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.status(200).send(pixel);
  }
});

// ====================== ROTA PÚBLICA PARA VISUALIZAR PROPOSTA ======================
// GET /api/share/:token  → Acesso público via link enviado por email


// ROTA ATUALIZADA: Visualização Pública de Propostas/Documentos
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Usamos .lean() para retornar um objeto JS puro (resolve o erro do Handlebars)
    // Mas atenção: se usarmos .lean(), não podemos usar .save() depois.
    // Por isso, primeiro buscamos o documento Mongoose normal para atualizar métricas.
    const proposalDoc = await Proposal.findOne({
      shareToken: token,
      status: { $in: ['sent', 'opened', 'accepted', 'rejected', 'expired'] }
    })
    .populate('company')
    .populate('client')
    .populate('template');

    if (!proposalDoc) {
      return res.status(404).json({ message: 'Documento não encontrado.' });
    }

    // 2. Atualizar métricas (fazemos isto ANTES de transformar em objeto simples)
    proposalDoc.viewCount = (proposalDoc.viewCount || 0) + 1;
    if (proposalDoc.status === 'sent') {
      proposalDoc.status = 'opened';
    }
    
    // IMPORTANTE: Para evitar o erro de validação do 'client', 
    // dizemos ao Mongoose para não validar campos que não alteramos.
    await proposalDoc.save({ validateModifiedOnly: true });

    // 3. Converter para objeto simples para o Handlebars não reclamar de "own property"
    const proposal = proposalDoc.toObject();

    // 4. Lógica de Template (Default da Empresa)
    let template = proposal.template;
    if (!template) {
      template = await Template.findOne({
        company: proposal.company._id,
        isDefault: true
      }).lean(); // lean() aqui também
    }

    if (!template) {
      template = await Template.findOne({ isBuiltIn: true, isDefault: true }).lean();
    }

    // 5. Preparar dados
    const base64Logo = await getBase64Logo(proposal.company?.logo);
    
    const templateData = {
      ...proposal,
      logo: base64Logo,
      date: new Date(proposal.createdAt).toLocaleDateString('pt-MZ'),
      expiresAtFormatted: proposal.expiresAt 
        ? new Date(proposal.expiresAt).toLocaleDateString('pt-MZ') 
        : 'N/A',
      total: (proposal.items || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    };

    // 6. Renderizar (Agora o Handlebars terá acesso total às propriedades)
    const compiledTemplate = handlebars.compile(template.htmlContent);
    const renderedHtml = compiledTemplate(templateData);

    res.json({
      ...proposal,
      renderedHtml,
      total: templateData.total
    });

  } catch (err) {
    console.error('Erro crítico na rota de partilha:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;