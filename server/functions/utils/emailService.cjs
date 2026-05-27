// utils/emailService.cjs
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const baseTemplate = (content, title = "Notificação") => `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; padding: 20px;">
    <div style="background-color: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #181a46; padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">MPV <span style="font-weight: 300; opacity: 0.8;">powered by kikipay</span></h1>
        <p style="color: #bfdbfe; margin-top: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${title}</p>
      </div>
      
      <div style="padding: 40px 30px; color: #1f2937;">
        ${content}
      </div>

      <div style="padding: 20px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          &copy; ${new Date().getFullYear()} Meu Ponto de Venda. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </div>
`;

const emailService = {
  // Template de Boas-vindas
  sendWelcomeEmail: async (to, firstName, companyName, password) => {
    // if a password was provided we include it in the message
    const passwordSection = password
      ? `<p>Sua senha de acesso é <strong>${password}</strong>. Recomendamos alterá‑la após o primeiro acesso.</p>`
      : '';

    const html = baseTemplate(`
      <h2 style="color: #111827;">Bem-vindo ao MPV, ${firstName}!</h2>
      <p>É um prazer ter a <strong>${companyName}</strong> connosco.</p>
      ${passwordSection}
      <p>A sua conta administrativa foi configurada com sucesso. Agora pode começar a:</p>
      <ul>
        <li>Gerir os seus clientes e fornecedores.</li>
        <li>Criar faturas e orçamentos profissionais.</li>
        <li>Acompanhar as suas requisições de serviço.</li>
      </ul>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.CLIENT_URL}" style="background-color: #181a46; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Aceder ao Painel de Controlo
        </a>
      </div>
      <p>Se tiver alguma dúvida, a nossa equipa de suporte está sempre disponível para ajudar.</p>
    `);

    return transporter.sendMail({
      from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Bem-vindo ao Meu Ponto de Venda - Conta Ativada',
      html
    });
  },
  // send generic document link notification
  sendDocumentLinkEmail: async (to, document, link, cc) => {
    const html = baseTemplate(`
      <p>Olá,</p>
      <p>Segue o documento <strong>${document.type.toUpperCase()} #${document.number}</strong>.</p>
      <p>Você pode acessá‑lo através do link abaixo:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Obrigado!</p>
    `, `Documento ${document.number}`);

    return transporter.sendMail({
      from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
      to,
      cc,
      subject: `Documento: ${document.number}`,
      html,
    });
  },

// ==================== NOVO: AVISO DE LIMITE DE PLANO ====================
sendLimitWarningEmail: async (to, entityName, currentCount, maxAllowed, planName) => {
  const percentage = Math.round((currentCount / maxAllowed) * 100);
  
  const html = baseTemplate(`
    <h2 style="color: #b45309;">Aviso de Limite Próximo</h2>
    
    <p>Olá,</p>
    
    <div style="background: #fefce8; border: 1px solid #fef08a; padding: 24px; border-radius: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #854d0e;">
        Você está próximo do limite do seu plano <strong>${planName}</strong>
      </p>
      
      <div style="margin: 20px 0; padding: 16px; background: white; border-radius: 12px; border: 1px solid #facc15;">
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Recurso:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${entityName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Utilizado:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${currentCount} de ${maxAllowed}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Percentagem:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #b45309;">${percentage}%</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #854d0e;">
        <strong>Recomendação:</strong> Considere fazer upgrade para o plano Professional ou Enterprise para continuar crescendo sem interrupções.
      </p>
    </div>

    <p>Se precisar de ajuda para fazer o upgrade ou esclarecer dúvidas, entre em contacto com a nossa equipa de suporte.</p>
    
    <div style="margin: 32px 0; text-align: center;">
      <a href="${process.env.CLIENT_URL}/admin/subscription-plans" 
         style="background: #181a46; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
        Ver Planos Disponíveis
      </a>
    </div>
  `, "Aviso de Limite de Plano");

  try {
    await transporter.sendMail({
      from: `"MPV Suporte" <${process.env.SMTP_USER}>`,
      to,
      subject: `⚠️ Limite próximo: ${entityName} (${percentage}%) - Plano ${planName}`,
      html
    });

    console.log(`✅ Email de aviso de limite enviado para ${to} (${entityName} - ${percentage}%)`);
  } catch (error) {
    console.error('Erro ao enviar email de aviso de limite:', error);
  }
},


  

  // Notificação interna para a equipa quando uma nova empresa/utilizador se regista
sendNewRegistrationNotification: async (adminEmails, user, company) => {
  try {
    const html = baseTemplate(`
      <h2 style="color: #111827;">Nova Registo na Plataforma</h2>
      
      <p>Foi efetuado um novo registo na plataforma <strong>Meu Ponto de Venda</strong>.</p>
      
      <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:24px; margin:24px 0;">
        <table style="width:100%; border-collapse:collapse; font-size:15px;">
          <tr>
            <td style="padding:10px 0; color:#4b5563; width:160px;"><strong>Empresa:</strong></td>
            <td style="padding:10px 0; font-weight:600;">${company.name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4b5563;"><strong>Email da empresa:</strong></td>
            <td style="padding:10px 0;">${company.email}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4b5563;"><strong>Administrador:</strong></td>
            <td style="padding:10px 0; font-weight:600;">${user.firstName} ${user.lastName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4b5563;"><strong>Email pessoal:</strong></td>
            <td style="padding:10px 0;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4b5563;"><strong>Data do registo:</strong></td>
            <td style="padding:10px 0;">${new Date().toLocaleString('pt-MZ')}</td>
          </tr>
        </table>
      </div>

      <p style="color:#6b7280; font-size:13px;">
        Este é um email automático gerado pelo sistema.
      </p>
    `, 'Novo Registo - MPV');

    await transporter.sendMail({
      from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
      to: adminEmails,                    // pode ser string separada por vírgula ou array
      subject: `🆕 Novo registo: ${company.name} (${user.firstName} ${user.lastName})`,
      html
    });

    console.log(`✅ Notificação de novo registo enviada para ${adminEmails}`);
  } catch (error) {
    console.error('Erro ao enviar notificação de novo registo:', error);
    // Não bloqueia o registo do utilizador se o email falhar
  }
},

sendProposalEmail: async (to, proposal, shareUrl, customMessage = '', cc = [], customSubject = '', attachments = []) => {
  // 1. Detectar intenção (Promoção/Oferta) para mudar o tom do e-mail
  const isPromotion = customSubject?.toLowerCase().includes('promo') || 
                      customSubject?.toLowerCase().includes('oferta') ||
                      proposal.message?.toLowerCase().includes('desconto');

  const title = customSubject || (isPromotion ? 'Oferta Especial / Promoção' : 'Proposta Comercial');
  
  // 2. Cálculos seguros (Garante que são números)
  const currency = proposal.currency || 'MT';
  const total = (proposal.items || []).reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  // 3. Gerar Tabela de Itens (Fiel ao Schema Proposal.cjs)
  const itemsTable = (proposal.items || []).map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const lineTotal = qty * price;

    return `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #e5e7eb; color:#374151;">${item.description || 'Item'}</td>
        <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center; color:#374151;">${qty}</td>
        <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right; color:#374151;">${price.toLocaleString('pt-MZ')} ${currency}</td>
        <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:bold; color:#111827;">${lineTotal.toLocaleString('pt-MZ')} ${currency}</td>
      </tr>
    `;
  }).join('');

  // 4. Lista de Anexos
  const attachmentsList = (attachments && attachments.length > 0) ? `
    <div style="margin-top:32px; padding:20px; background:#f9fafb; border-radius:12px;">
      <h3 style="margin:0 0 12px; font-size:16px; color:#111827;">Documentos anexados:</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${attachments.map(att => `
          <a href="${att.publicUrl}" target="_blank" style="display:inline-block; background:white; border:1px solid #e5e7eb; padding:8px 12px; border-radius:8px; color:#181a46; text-decoration:none; font-size:13px; font-weight:500;">
            📄 ${att.filename}
          </a>
        `).join('')}
      </div>
    </div>
  ` : '';

  // 5. Montagem do HTML Final
  const html = baseTemplate(`
    <div style="padding: 10px 0;">
      <h2 style="color:#111827; margin:0 0 16px; font-size:24px; font-weight:800;">${title}</h2>

      <p style="font-size:16px; color:#374151; margin-bottom:24px;">
        Olá <strong>${proposal.recipients?.[0]?.name || proposal.client?.name || 'Exmo.(a) Cliente'}</strong>,
      </p>

      ${customMessage ? `
        <div style="background:#eff6ff; border-left:4px solid #181a46; padding:20px; margin:24px 0; border-radius:4px;">
          <p style="margin:0; white-space:pre-wrap; color:#1e40af; font-size:15px; line-height:1.6;">${customMessage.replace(/\n/g, '<br>')}</p>
        </div>
      ` : `<p style="color:#4b5563; font-size:15px; line-height:1.6;">Temos o prazer de submeter a nossa proposta comercial para a sua apreciação. Poderá encontrar os detalhes abaixo ou visualizar o documento completo no nosso portal seguro.</p>`}

      <div style="background:white; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; margin:30px 0 shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:14px; text-align:left; font-size:12px; text-transform:uppercase; color:#64748b;">Descrição</th>
              <th style="padding:14px; text-align:center; font-size:12px; text-transform:uppercase; color:#64748b;">Qtd</th>
              <th style="padding:14px; text-align:right; font-size:12px; text-transform:uppercase; color:#64748b;">Unitário</th>
              <th style="padding:14px; text-align:right; font-size:12px; text-transform:uppercase; color:#64748b;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTable || '<tr><td colspan="4" style="padding:20px; text-align:center; color:#94a3b8;">Itens detalhados no documento principal</td></tr>'}
          </tbody>
        </table>

        <div style="padding:20px; background:#f8fafc; border-top:2px solid #e5e7eb; text-align:right;">
          <span style="font-size:14px; color:#64748b; font-weight:500;">VALOR TOTAL:</span><br>
          <span style="font-size:24px; font-weight:800; color:#16a34a;">${total.toLocaleString('pt-MZ')} ${currency}</span>
        </div>
      </div>

      ${attachmentsList}

      <div style="text-align:center; margin:40px 0;">
        <a href="${shareUrl}" 
           style="display:inline-block; background:#181a46; color:white; padding:18px 40px; text-decoration:none; border-radius:14px; font-size:16px; font-weight:700; transition: background 0.3s ease;">
          Abrir Proposta no Navegador
        </a>
        <p style="margin-top:15px; font-size:12px; color:#94a3b8;">
          Válida até ${new Date(proposal.expiresAt).toLocaleDateString('pt-MZ')}
        </p>
      </div>

      <div style="border-top:1px solid #e5e7eb; margin-top:40px; padding-top:20px; text-align:center;">
        <p style="color:#64748b; font-size:13px;">
          Esta proposta foi gerada por <strong>${proposal.company?.name || 'Nossa Equipa'}</strong>.<br>
          Se tiver alguma dúvida, não hesite em contactar-nos diretamente.
        </p>
      </div>
    </div>
  `, title);

  // 6. Envio Final
  const companyName = proposal.company?.name || "MPV";
  
  return transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`, // Nome da empresa no remetente
    to,
    cc: cc.length ? cc : undefined,
    subject: customSubject || `${isPromotion ? '🎁 ' : ''}${title}: ${proposal.subject || 'Nova Proposta'}`,
    html
  });
},
  // Template de Recuperação (mantido)
sendInvitationEmail: async (to, firstName, password, companyName, token) => {
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verificationLink = `${process.env.API_URL || 'http://localhost:5000/api'}/users/verify-email?email=${encodeURIComponent(to)}&token=${token}`;

  const html = baseTemplate(`
    <h2 style="color: #111827;">Olá, ${firstName}!</h2>
    <p>Foi convidado para fazer parte da equipe <strong>${companyName}</strong>.</p>
    <p>A sua palavra-passe temporária é: <strong>${password}</strong></p>
    <p>Para ativar a sua conta e definir a sua palavra-passe, clique no link abaixo:</p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${verificationLink}" style="background: #181a46; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Ativar Conta
      </a>
    </div>
    <p>Este link expira em 24 horas.</p>
  `, 'Convite Meu Ponto de Venda');

  return transporter.sendMail({
    from: `"Suporte MPV" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Convite para Meu Ponto de Venda',
    html
  });
},

// Notificação de nova requisição submetida (para utilizador interno + cliente)
// Notificação de nova requisição submetida (para cliente + equipa interna)
sendNewRequisitionNotification: async (clientEmail, companyEmail, clientPhone, requisition, client, company) => {
  try {
    const reqNumber = requisition.number || '—';
    const clientName = client.name || client.email?.split('@')[0] || 'Cliente';
    const companyName = company.name || 'a nossa empresa';
    const createdAt = requisition.createdAt 
      ? new Date(requisition.createdAt).toLocaleString('pt-MZ', { 
          dateStyle: 'short', 
          timeStyle: 'short' 
        })
      : '—';

    const intentLabel = requisition.requestIntent === 'invoice' 
      ? 'Fatura solicitada' 
      : 'Cotação / Orçamento solicitada';

    const statusLabel = {
      'quotation_requested': 'Aguardando cotação',
      'invoice_requested':   'Aguardando fatura',
      'pending':             'Pendente'
    }[requisition.status] || requisition.status || '—';

    // === Tabela de itens (corrigida) ===
    const itemsRows = (requisition.items || []).map(item => {
      let desc = 'Item sem descrição';

      if (item.item && typeof item.item === 'object') {
        desc = item.item.name || item.item.title || desc;
      } else if (item.itemType) {
        desc = item.itemType === 'Product' ? 'Produto' :
               item.itemType === 'Service' ? 'Serviço' :
               item.itemType === 'Bundle'  ? 'Pacote/Combo' : 'Item';
      }

      const qty = Number(item.quantity) || 1;
      const price = Number(item.priceAtTime || item.orderPrice || 0);
      const priceFormatted = price.toLocaleString('pt-MZ');

      return `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${desc}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">${qty}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">${priceFormatted} MT</td>
        </tr>
      `;
    }).join('');

    const commonTable = `
      <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:24px; margin:24px 0;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:8px 0; color:#4b5563; width:140px;"><strong>Cliente:</strong></td><td>${clientName}</td></tr>
          <tr><td style="padding:8px 0; color:#4b5563;"><strong>Telefone:</strong></td><td>${clientPhone || '—'}</td></tr>
          <tr><td style="padding:8px 0; color:#4b5563;"><strong>Data da solicitação:</strong></td><td>${createdAt}</td></tr>
          <tr><td style="padding:8px 0; color:#4b5563;"><strong>Intenção:</strong></td><td>${intentLabel}</td></tr>
          <tr><td style="padding:8px 0; color:#4b5563;"><strong>Estado atual:</strong></td><td style="color:#2563eb; font-weight:600;">${statusLabel}</td></tr>
        </table>
      </div>

      <h3 style="margin:32px 0 12px; color:#111827;">Itens solicitados</h3>
      <table style="width:100%; border-collapse:collapse; background:white; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
        <thead style="background:#f1f5f9;">
          <tr>
            <th style="padding:12px; text-align:left;">Descrição</th>
            <th style="padding:12px; text-align:center;">Quantidade</th>
            <th style="padding:12px; text-align:right;">Preço unitário</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || `<tr><td colspan="3" style="padding:30px; text-align:center; color:#6b7280;">Nenhum item detalhado</td></tr>`}
        </tbody>
      </table>
    `;

    // ====================== EMAIL PARA O CLIENTE ======================
    const clientHtml = `
      <p>Olá ${clientName},</p>
      <p>A sua requisição foi <strong>recebida com sucesso</strong>! Obrigado por escolher a <strong>${companyName}</strong>.</p>
      
      ${commonTable}

      <div style="margin:40px 0; padding:24px; background:#eff6ff; border-radius:12px; text-align:center;">
        <p style="color:#1e40af; font-size:15px; margin:0;">
          Em breve a nossa equipa entrará em contacto para confirmar os detalhes,<br>
          enviar o orçamento ou prosseguir com a fatura.
        </p>
      </div>

      <p style="text-align:center; color:#6b7280; margin-top:32px;">
        Qualquer dúvida, responda diretamente a este email.
      </p>
    `;

    // ====================== EMAIL PARA A EMPRESA (INTERNO) ======================
    const internalHtml = `
      <h2 style="color:#dc2626;">Nova requisição externa</h2>
      <p>Foi submetida uma nova requisição pública pelo cliente <strong>${clientName}</strong>.</p>
      
      ${commonTable}

      <div style="margin:40px 0; text-align:center;">
        <a href="${process.env.CLIENT_URL}/admin/requisitions/${requisition._id}" 
           style="display:inline-block; background:#2563eb; color:white; padding:16px 48px; border-radius:12px; text-decoration:none; font-weight:600;">
          Ver Requisição no Painel →
        </a>
      </div>

      <p style="text-align:center; color:#6b7280; font-size:13px; margin-top:24px;">
        Origem: Submissão pública • Email: ${client.email}
      </p>
    `;

    // Envio dos dois emails
    await Promise.all([
      // Email para o cliente
      transporter.sendMail({
        from: `"${companyName}" <${process.env.SMTP_USER}>`,
        to: clientEmail,
        subject: `Recebemos a sua requisição #${reqNumber}`,
        html: baseTemplate(clientHtml, `Requisição #${reqNumber} – Recebida`)
      }),

      // Email interno
      transporter.sendMail({
        from: `"${companyName} – Requisições" <${process.env.SMTP_USER}>`,
        to: companyEmail,
        subject: `🆕 Nova requisição externa #${reqNumber} – ${clientName}`,
        html: baseTemplate(internalHtml, `Nova Requisição Externa #${reqNumber}`)
      })
    ]);

    console.log(`✅ Emails enviados com sucesso para requisição ${reqNumber}`);

  } catch (error) {
    console.error('Erro ao enviar notificação de requisição:', error);
  }
},
sendCompanyCreationEmail: async (to, companyName, adminEmail, tempPassword, activationCode) => {
  // IGUALAR À LÓGICA DO sendInvitationEmail
  const verificationLink = `${process.env.API_URL || 'http://localhost:5000/api'}/users/verify-email?email=${encodeURIComponent(adminEmail)}&token=${activationCode}`;

  const html = baseTemplate(`
    <h2 style="color: #111827;">Bem-vindo à sua nova empresa no Meu Ponto de Venda!</h2>
    
    <p>A empresa <strong>${companyName}</strong> foi criada com sucesso.</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <p><strong>Email de acesso:</strong> ${adminEmail}</p>
      <p><strong>Senha temporária:</strong> <code>${tempPassword}</code></p>
      <p style="color: #dc2626; font-weight: bold;">
        Altere esta senha após o primeiro acesso!
      </p>
    </div>

    <p>Para ativar a conta e validar o seu acesso, clique no botão abaixo:</p>
    
    <div style="margin: 30px 0; text-align: center;">
      <a href="${verificationLink}" style="background: #181a46; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Ativar Minha Conta
      </a>
    </div>

    <p>Este link é válido por 24 horas.</p>
  `, 'Nova Empresa Criada');

  return transporter.sendMail({
    from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
    to,
    subject: `Nova empresa criada: ${companyName}`,
    html
  });
},

    // Template de Recuperação (mantido)
  sendPasswordReset: async (to, firstName, code) => {
    const html = baseTemplate(`
      <h2 style="color: #111827;">Olá, ${firstName}!</h2>
      <p>Recebemos uma solicitação para redefinir a sua senha.</p>
      <div style="margin: 30px 0; text-align: center;">
        <span style="background-color: #f3f4f6; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #181a46; border-radius: 8px;">
          ${code}
        </span>
      </div>
      <p>Este código é válido por 1 hora.</p>
    `);

    return transporter.sendMail({
      from: `"Suporte MPV" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Código de Recuperação de Senha',
      html
    });
  },

  // email para abertura de caixa solicitado
  sendCashClosureOpenRequest: async (to, closure, user, company) => {
    const html = baseTemplate(`
      <h2>Solicitação de Abertura de Caixa</h2>
      <p>O usuário <strong>${user.firstName} ${user.lastName}</strong> solicitou a abertura de caixa às <strong>${new Date(closure.openRequestedAt).toLocaleString()}</strong> com um fundo inicial de <strong>${(closure.initialFloat||0).toLocaleString()} MT</strong>.</p>
      <p>Por favor, reveja e aprove ou negue a solicitação no painel administrativo.</p>
    `, 'Abertura de Caixa');

    return transporter.sendMail({
      from: `"MPV Financeiro" <${process.env.SMTP_USER}>`,
      to,
      subject: `🔔 Nova solicitação de abertura de caixa - ${company.name}`,
      html,
    });
  },

  sendCashClosureOpenResult: async (to, closure, status) => {
    const approved = status === 'approved';
    const html = baseTemplate(`
      <h2>Resultado da Solicitação de Abertura de Caixa</h2>
      <p>Sua solicitação de abertura de caixa feita em <strong>${new Date(closure.openRequestedAt).toLocaleString()}</strong> foi <strong>${approved ? 'APROVADA' : 'NEGADA'}</strong>.</p>
      ${approved ? '<p>Você já pode iniciar as operações.</p>' : '<p>Por favor, entre em contato com o supervisor para mais informações.</p>'}
    `, 'Abertura de Caixa - Resultado');

    return transporter.sendMail({
      from: `"MPV Financeiro" <${process.env.SMTP_USER}>`,
      to,
      subject: approved ? '✅ Abertura de Caixa Aprovada' : '❌ Abertura de Caixa Negada',
      html,
    });
  },
// ==================== EMAIL PARA PARCEIRO DE RECOMENDAÇÃO ====================
sendReferralWelcomeEmail: async (to, firstName, referralCode) => {
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login?type=referral`;

  const html = baseTemplate(`
    <h2 style="color: #111827;">Parabéns, ${firstName}!</h2>
    
    <p>O seu registo como <strong>Parceiro de Recomendação</strong> foi efetuado com sucesso.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 24px; border-radius: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 15px; color: #166534;">O seu código de recomendação é:</p>
      <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #15803d;">
        ${referralCode}
      </p>
    </div>

    <p>Guarde este código com segurança. Sempre que recomendar um cliente, utilize-o para que a comissão seja atribuída a si.</p>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${loginUrl}" 
         style="display: inline-block; background: #181a46; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
        Fazer Login Agora
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      Recomende clientes e ganhe comissões recorrentes sempre que eles comprarem na empresa!
    </p>
  `, 'Bem-vindo ao Programa de Recomendações');

  return transporter.sendMail({
    from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Bem-vindo ao Programa de Recomendações - Código de Parceiro',
    html
  });
},
  // aviso de vencimento próximo
 sendReminderEmail: async (to, sale) => {
    const missingValue = (sale.total - (sale.amountPaid || 0)).toLocaleString();
    const itemsHtml = (sale.items || []).map(i => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px;">${i.name}</td>
        <td style="border:1px solid #ddd;padding:4px;text-align:right;">${i.quantity}</td>
        <td style="border:1px solid #ddd;padding:4px;text-align:right;">${(i.priceAtSale || 0).toLocaleString()}</td>
      </tr>`).join('');
    const html = baseTemplate(`
      <p>Olá, informamos que a fatura abaixo está próxima do vencimento:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr><th style="border:1px solid #333;padding:4px;">Item</th><th style="border:1px solid #333;padding:4px;">Qtd</th><th style="border:1px solid #333;padding:4px;">Preço</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: bold;">Valor em Falta:</p>
        <p style="margin: 5px 0 0 0; color: #b45309; font-size: 28px; font-weight: 900;">${missingValue} MT</p>
        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 13px;">Vence em: <strong>${new Date(sale.dueDate).toLocaleDateString()}</strong></p>
      </div>
      <p>Evite multas e interrupções de serviço efetuando o pagamento até a data acima.</p>
    `, "Lembrete de Pagamento");

    return transporter.sendMail({
      from: `"MPV Financeiro" <${process.env.SMTP_USER}>`,
      to,
      subject: `⚠️ Lembrete: Venda vence em breve`,
      html
    });
  },

  // aviso após vencimento
sendOverdueEmail: async (to, sale) => {
    const missingValue = (sale.total - (sale.amountPaid || 0)).toLocaleString();
    const itemsHtml = (sale.items || []).map(i => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px;">${i.name}</td>
        <td style="border:1px solid #ddd;padding:4px;text-align:right;">${i.quantity}</td>
        <td style="border:1px solid #ddd;padding:4px;text-align:right;">${(i.priceAtSale || 0).toLocaleString()}</td>
      </tr>`).join('');
    const html = baseTemplate(`
      <p>Identificamos que o pagamento da venda abaixo expirou:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr><th style="border:1px solid #333;padding:4px;">Item</th><th style="border:1px solid #333;padding:4px;">Qtd</th><th style="border:1px solid #333;padding:4px;">Preço</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 16px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; color: #b91c1c; font-size: 14px; font-weight: bold;">FATURA EM ATRASO</p>
        <p style="margin: 5px 0 0 0; color: #991b1b; font-size: 28px; font-weight: 900;">${missingValue} MT</p>
        <p style="margin: 10px 0 0 0; color: #b91c1c; font-size: 13px;">Vencida em: ${new Date(sale.dueDate).toLocaleDateString()}</p>
      </div>
      <p style="color: #dc2626; font-weight: bold;">Por favor, regularize a sua situação imediatamente para evitar suspensão de serviços.</p>
    `, "Pagamento em Atraso");

    return transporter.sendMail({
      from: `"MPV Cobrança" <${process.env.SMTP_USER}>`,
      to,
      subject: `🚨 URGENTE: Pagamento em atraso`,
      html
    });
  },

  // enviar fatura com anexo PDF
  sendInvoiceEmail: async (to, sale, pdfBuffer, cc) => {
    const missingValue = (sale.total - (sale.amountPaid || 0)).toLocaleString();
    // build items table rows
    const itemsHtml = (sale.items || []).map(i => {
      const price = i.priceAtSale?.toLocaleString();
      return `
        <tr>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${i.name}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${price} MT</td>
        </tr>
      `;
    }).join('');

    const html = baseTemplate(`
      <p>Agradecemos pela sua preferência! Segue em anexo a fatura detalhada da sua compra.</p>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 16px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 13px;">Venda:</td>
            <td style="text-align: right; font-weight: bold;">#${sale._id.toString().slice(-6).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 13px; padding-top: 8px;">Total Pago:</td>
            <td style="text-align: right; font-weight: bold; color: #059669; padding-top: 8px;">${sale.amountPaid.toLocaleString()} MT</td>
            <td style="color: #6b7280; font-size: 13px; padding-top: 8px;">Valor em Falta:</td>
             <td style="text-align: right; font-weight: bold; color: #059669; padding-top: 8px;">${missingValue} MT</td>
          </tr>
        </table>
      </div>
      <div style="margin:20px 0;">
        <h3 style="margin-bottom:8px;">Itens da Fatura</h3>
        <table style="width:100%; border-collapse: collapse; font-size:13px;">
          <thead>
            <tr>
              <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left;">Nome</th>
              <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">Qtd</th>
              <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">Preço</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      <p>Poderá encontrar o comprovativo oficial em anexo a este e-mail.</p>
    `, "Fatura Confirmada");

    return transporter.sendMail({
      from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
      to,
      cc,
      subject: `Fatura: Venda #${sale._id.toString().slice(-6).toUpperCase()}`,
      html,
      attachments: [{ filename: `Fatura_${sale._id.toString().slice(-6)}.pdf`, content: pdfBuffer }]
    });
  },

  // Aviso de saldo baixo (≤ 500 MT)
sendWalletLowEmail: async (to, client, currentBalance) => {
  const balanceStr = Number(currentBalance).toLocaleString();
  
  const html = baseTemplate(`
    <h2>Olá ${client.name},</h2>
    <p>O seu saldo na carteira está atualmente em <strong>${balanceStr} MT</strong>.</p>
    
    <div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #854d0e;">
        Saldo baixo!
      </p>
      <p style="margin: 8px 0 0; color: #713f12;">
        Recomendamos recarregar em breve para continuar a usufruir dos pagamentos rápidos.
      </p>
    </div>

    <p>Carregamentos podem ser feitos diretamente no balcão ou através de transferência (contacte-nos para os dados).</p>
    <p>Obrigado por continuar connosco!</p>
  `, "Aviso de Saldo Baixo");

  return transporter.sendMail({
    from: `"MPV Suporte" <${process.env.SMTP_USER}>`,
    to,
    subject: `⚠️ Saldo da carteira baixo: ${balanceStr} MT`,
    html
  });
},

// Aviso crítico (≤ 0 MT)
sendWalletCriticalEmail: async (to, client, currentBalance) => {
  const balanceStr = Number(currentBalance).toLocaleString();
  
  const html = baseTemplate(`
    <h2>Olá ${client.name},</h2>
    
    <div style="background-color: #fee2e2; border: 1px solid #fecaca; padding: 24px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 28px; font-weight: bold; color: #991b1b;">
        Saldo insuficiente
      </p>
      <p style="margin: 12px 0 0; font-size: 18px; color: #7f1d1d;">
        ${balanceStr} MT
      </p>
    </div>

    <p>Não é mais possível realizar compras usando o saldo da carteira até que seja efetuado um carregamento.</p>
    <p>Dirija-se ao nosso balcão ou contacte-nos para regularizar o saldo.</p>
    
    <p style="margin-top: 24px; font-weight: bold;">Estamos à disposição para ajudar!</p>
  `, "Saldo da Carteira Esgotado");

  return transporter.sendMail({
    from: `"MPV Cobrança" <${process.env.SMTP_USER}>`,
    to,
    subject: `🚨 Saldo da carteira esgotado`,
    html
  });
},

  // notificação de saldo baixo ou esgotado
  sendWalletWarningEmail: async (to, client, sales) => {
    const balanceStr = (client.balance || 0).toLocaleString();
    const rows = (sales || []).map(s => `
      <tr>
        <td style="border:1px solid #ddd;padding:4px;">${new Date(s.createdAt).toLocaleDateString()}</td>
        <td style="border:1px solid #ddd;padding:4px;text-align:right;">${s.total.toLocaleString()} MT</td>
      </tr>
    `).join('');
    const html = baseTemplate(`
      <h2>Olá ${client.name},</h2>
      <p>O seu saldo de carteira está actualmente <strong>${balanceStr} MT</strong>.</p>
      <p>Segue abaixo o histórico das suas compras recentes:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr><th style="border:1px solid #333;padding:4px;">Data</th><th style="border:1px solid #333;padding:4px;">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Por favor, carregue mais saldo para continuar a fazer compras sem interrupções.</p>
    `, "Saldo de Carteira" );

    return transporter.sendMail({
      from: `"MPV Suporte" <${process.env.SMTP_USER}>`,
      to,
      subject: `Aviso de Saldo de Carteira: ${balanceStr} MT`,
      html
    });
  }
,

  // Notificação de Fecho de Caixa submetido
  sendCashClosureNotification: async (to, closure, user, company) => {
    const html = baseTemplate(`
      <h2>Fecho de Caixa Submetido</h2>
      <p>O utilizador <strong>${user.firstName} ${user.lastName}</strong> submeteu o fecho de caixa para <strong>${new Date(closure.date).toLocaleDateString()}</strong>.</p>
      <p>Resumo:</p>
      <ul>
        <li>Vendas: ${closure.salesCount}</li>
        <li>Valor total: ${Number(closure.totalSalesAmount || 0).toLocaleString()} MT</li>
        <li>Valor recebido: ${Number(closure.totalAmountPaid || 0).toLocaleString()} MT</li>
      </ul>
      <p>Notas do caixa: ${closure.notes || '—'}</p>
      <p>Consulte o painel para confirmar ou rever o fecho.</p>
    `, 'Fecho de Caixa Submetido');

    return transporter.sendMail({
      from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
      to,
      subject: `Fecho de Caixa submetido por ${user.firstName} ${user.lastName}`,
      html
    });
  },

  // Notificação de Fecho de Caixa confirmado
  sendCashClosureConfirmedNotification: async (to, closure, user, company) => {
    const html = baseTemplate(`
      <h2>Fecho de Caixa Confirmado</h2>
      <p>O utilizador <strong>${user.firstName} ${user.lastName}</strong> confirmou o fecho de caixa para <strong>${new Date(closure.date).toLocaleDateString()}</strong>.</p>
      <p>Resumo:</p>
      <ul>
        <li>Vendas: ${closure.salesCount}</li>
        <li>Valor total: ${Number(closure.totalSalesAmount || 0).toLocaleString()} MT</li>
        <li>Valor recebido: ${Number(closure.totalAmountPaid || 0).toLocaleString()} MT</li>
        <li>Valor contado: ${closure.countedTotal !== undefined ? Number(closure.countedTotal).toLocaleString() + ' MT' : '—'}</li>
      </ul>
      <p>Notas do caixa: ${closure.notes || '—'}</p>
    `, 'Fecho de Caixa Confirmado');

    return transporter.sendMail({
      from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
      to,
      subject: `Fecho de Caixa confirmado por ${user.firstName} ${user.lastName}`,
      html
    });
  },
// ==================== VERIFICAÇÃO DE CONTA ====================
sendVerificationEmail: async (to, firstName, code) => {
  // URL base do BACKEND para verificação (ajuste .env: API_URL=http://localhost:5000/api)
  const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
  const verificationLink = `${apiUrl}/users/verify-email?email=${encodeURIComponent(to)}&token=${encodeURIComponent(code)}`;

  // URL do frontend para login (para redirecionamento no backend, mas não usado aqui)
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const html = baseTemplate(`
    <h2 style="color: #111827;">Olá ${firstName}, bem-vindo ao Meu Ponto de Venda!</h2>
    <p>Para ativar a sua conta, introduza o código de verificação abaixo:</p>
    <div style="margin: 30px 0; text-align: center; font-size: 48px; font-weight: bold; letter-spacing: 12px; background: #f8fafc; padding: 24px; border-radius: 16px; color: #1e40af;">
      ${code}
    </div>
    <p>Ou clique no link abaixo para verificar automaticamente:</p>
    <a href="${verificationLink}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Verificar Conta Agora
    </a>
    <p><strong>Este código expira em 15 minutos.</strong></p>
    <p>Se não solicitou este registo, ignore este email.</p>
  `, 'Verificação de Conta');

  return transporter.sendMail({
    from: `"Meu Ponto de Venda" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Código de Verificação – Meu Ponto de Venda',
    html
  });
},

  // Notificação de aprovação de microcrédito para o cliente
sendMicrocreditApprovedToClient: async (to, loan, client, approver) => {
  const amount = Number(loan.loanAmountApproved || loan.loanAmountRequested).toLocaleString('pt-MZ');
  const rate = Number(loan.interestRate).toFixed(2);
  const firstPayment = loan.firstPaymentDate 
    ? new Date(loan.firstPaymentDate).toLocaleDateString('pt-MZ') 
    : 'A calcular';

  const html = baseTemplate(`
    <h2 style="color: #059669;">Parabéns, ${client.name}!</h2>
    <p>O seu pedido de microcrédito no valor de <strong>${amount} MT</strong> foi <strong>APROVADO</strong>!</p>
    
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #065f46;">Detalhes do Crédito Aprovado</h3>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
        <li><strong>Valor aprovado:</strong> ${amount} MT</li>
        <li><strong>Taxa de juro:</strong> ${rate}% ao ano (${loan.interestType})</li>
        <li><strong>Prazo:</strong> ${loan.termMonths} meses</li>
        <li><strong>Frequência de pagamento:</strong> ${loan.paymentFrequency}</li>
        <li><strong>Primeira prestação prevista:</strong> ${firstPayment}</li>
        ${loan.gracePeriodDays > 0 ? `<li><strong>Período de carência:</strong> ${loan.gracePeriodDays} dias</li>` : ''}
      </ul>
    </div>

    <p>Dirija-se à nossa sede ou contacte-nos para proceder ao <strong>desembolso</strong> e assinatura do contrato.</p>
    <p style="margin-top: 24px; font-weight: bold;">Estamos felizes por poder apoiar o seu negócio!</p>
    
    <p style="color: #6b7280; font-size: 13px;">
      Qualquer dúvida, contacte-nos através do telefone ${client.phone || '—'} ou email.
    </p>
  `, 'Aprovação de Microcrédito');

  return transporter.sendMail({
    from: `"MPV Crédito" <${process.env.SMTP_USER}>`,
    to,
    subject: `✅ Seu microcrédito de ${amount} MT foi APROVADO!`,
    html
  });
},

// Notificação interna para a equipa de crédito / analista
sendMicrocreditApprovedInternal: async (to, loan, client, approver) => {
  const amount = Number(loan.loanAmountApproved).toLocaleString('pt-MZ');
  
  const html = baseTemplate(`
    <h2>Novo microcrédito APROVADO</h2>
    <p>O crédito solicitado por <strong>${client.name}</strong> foi aprovado por <strong>${approver.firstName} ${approver.lastName}</strong>.</p>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px;"><strong>Cliente:</strong></td><td>${client.name} (${client.phone || client.email || '—'})</td></tr>
        <tr><td style="padding:8px;"><strong>Valor aprovado:</strong></td><td>${amount} MT</td></tr>
        <tr><td style="padding:8px;"><strong>Prazo:</strong></td><td>${loan.termMonths} meses</td></tr>
        <tr><td style="padding:8px;"><strong>Data de aprovação:</strong></td><td>${new Date(loan.approvalDate).toLocaleString('pt-MZ')}</td></tr>
        <tr><td style="padding:8px;"><strong>ID do crédito:</strong></td><td>#${loan._id.toString().slice(-8).toUpperCase()}</td></tr>
      </table>
    </div>

    <p>Próximos passos:</p>
    <ul>
      <li>Preparar contrato e agendar desembolso</li>
      <li>Verificar garantias / avalistas</li>
      <li>Atualizar o sistema após desembolso</li>
    </ul>

    <p><a href="${process.env.CLIENT_URL}/admin/loans/${loan._id}" style="color: #181a46; font-weight: bold;">Ver detalhes no painel →</a></p>
  `, 'Aprovação de Crédito');

  return transporter.sendMail({
    from: `"MPV Crédito" <${process.env.SMTP_USER}>`,
    to,
    subject: `Novo microcrédito aprovado: ${amount} MT - ${client.name}`,
    html
  });
},
sendMicrocreditOverdueNotification: async (to, loan, client, level, daysOverdue) => {
  const amountDue = loan.outstandingBalance.toLocaleString('pt-MZ');
  const urgency = level >= 30 ? 'URGENTE' : level >= 15 ? 'ATENÇÃO' : 'AVISO';

  const html = baseTemplate(`
    <h2 style="color: #dc2626;">${urgency}: Pagamento em Atraso</h2>
    <p>Olá ${client.name},</p>
    <p>Detectamos que a sua prestação do microcrédito está em atraso há <strong>${daysOverdue} dias</strong>.</p>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #991b1b;">
        Saldo em dívida: ${amountDue} MT
      </p>
      <p style="margin: 12px 0 0;">
        Por favor regularize o mais breve possível para evitar juros de mora e restrições futuras.
      </p>
    </div>

    <p>Formas de pagamento disponíveis:</p>
    <ul>
      <li>M-Pesa / E-Mola: [insira número]</li>
      <li>Transferência bancária: [dados]</li>
      <li>Presencial na sede</li>
    </ul>

    <p>Qualquer dúvida, contacte-nos urgentemente.</p>
    <p style="color: #6b7280; font-size: 13px;">
      ID do crédito: #${loan._id.toString().slice(-8).toUpperCase()}
    </p>
  `, 'Aviso de Atraso no Pagamento');

  return transporter.sendMail({
    from: `"MPV Cobrança" <${process.env.SMTP_USER}>`,
    to,
    subject: `⚠️ ${urgency} - Prestação em atraso há ${daysOverdue} dias`,
    html
  });
},
};


module.exports = emailService;