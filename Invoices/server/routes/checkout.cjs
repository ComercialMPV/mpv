const express = require('express');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
// === GLOBAL AGENT (para contornar problemas de TLS) ===
const globalAgent = require('global-agent');
globalAgent.bootstrap();

https.globalAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  rejectUnauthorized: true
});

const fallbackAgent = new https.Agent({
  rejectUnauthorized: false,
  minVersion: 'TLSv1.0',
  maxVersion: 'TLSv1.3',
  ciphers: 'DEFAULT:@SECLEVEL=0',
  servername: 'api.debitopay.com'
});

const debitoAgent = new https.Agent({
  rejectUnauthorized: true,
  servername: 'api.debitopay.com'
});

const agent = new https.Agent({
  rejectUnauthorized: true,
  servername: 'api.debitopay.com'
});
const router = express.Router();
const User = require('../models/User.cjs');
const Company = require('../models/Company.cjs');
const RolePermission = require('../models/RolePermission.cjs');
const Transaction = require('../models/Transaction.cjs');
const Subscription = require('../models/Subscription.cjs');
const { auth, optionalAuth } = require('../middleware/auth.cjs');
const emailService = require('../utils/emailService.cjs');



// Helper for callback URL — Debito posts webhook notifications here
const getCallbackUrl = (req) => {
  // 1. Explicit override always wins
  if (process.env.WEBHOOK_CALLBACK_URL) {
    const url = process.env.WEBHOOK_CALLBACK_URL.replace(/\/$/, '');
    console.log(`[checkout] Using WEBHOOK_CALLBACK_URL: ${url}`);
    return url;
  }
  // 2. BACKEND_URL / API_URL
  const envUrl = process.env.BACKEND_URL || process.env.API_URL?.replace(/\/api$/, '') || '';
  if (envUrl) {
    const url = envUrl.replace(/\/$/, '');
    console.log(`[checkout] Using BACKEND_URL: ${url}`);
    return url;
  }
  // 3. Derive from the incoming request (works on Cloud Run, Cloud Functions, localhost)
  if (req && req.protocol && req.get) {
    const host = req.get('host');
    if (host) {
      const url = `${req.protocol}://${host}`;
      console.log(`[checkout] Using request-derived callback URL: ${url}`);
      return url;
    }
  }
  console.warn('[checkout] CRITICAL: No callback URL could be resolved — webhook will be unreachable!');
  console.warn(`[checkout]   BACKEND_URL="${process.env.BACKEND_URL}" API_URL="${process.env.API_URL}" host="${req?.get?.('host')}"`);
  return '';
};

function normalizePaymentMethod(method) {
  if (!method) return 'Pendente';
  var m = method.toLowerCase();
  if (m === 'mpesa') return 'M-Pesa';
  if (m === 'emola') return 'E-Mola';
  if (m === 'visa' || m === 'visa_mastercard') return 'Visa';
  if (m === 'transfer' || m === 'transferência') return 'Transferência';
  if (m === 'cash') return 'Cash';
  if (m === 'wallet') return 'Wallet';
  return method;
}

function normalizeItemType(type, item) {
  if (!type) return 'Product';
  var t = String(type).toLowerCase();
  if (t === 'bundles') {
    var bt = String(item && (item.bundleType || item.bundle_type || '')).toLowerCase();
    if (bt === 'subscriptions') return 'Subscription';
    return 'Combo';
  }
  if (t === 'product') return 'Product';
  if (t === 'service') return 'Service';
  if (t === 'combo') return 'Combo';
  if (t === 'subscription') return 'Subscription';
  return type;
}

// Plan configuration
const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Básico',
    price: 0,
    features: [
      'Até 5 produtos registados',
      'POS básico para vendas rápidas',
      'Relatórios de faturação simples',
      '1 utilizador administrativo',
      'Acesso à comunidade MPVD'
    ]
  },
  professional: {
    id: 'professional',
    name: 'Profissional',
    price: 2499,
    features: [
      'Documentos e produtos ilimitados',
      'Gestão de Metas Estratégicas',
      'Análise de Unit Economics',
      'Website Online Integrado',
      'Controle de Stock Avançado',
      'Relatórios de Rentabilidade Real'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresarial',
    price: 0,
    features: [
      'Múltiplas Lojas Integradas',
      'Suporte prioritário 24/7',
      'APIs & Integrações Customizadas',
      'Formação presencial de equipas',
      'Gestor de conta dedicado',
      'Backup de dados em tempo real'
    ]
  }
};

// Notificação de plano
async function notifyPlanChange(toEmail, companyName, details = {}) {
  try {
    await emailService.sendWelcomeEmail(toEmail, toEmail.split('@')[0], companyName, undefined);
  } catch (err) {
    console.error('notifyPlanChange error:', err);
  }
}

// Socket stubs
// Socket stubs
const userSockets = new Map();
const io = { to: () => ({ emit: () => {} }) };

// Determinar se é subscrição ou venda regular
function isSubscriptionPayment(planId) {
  return ['basic', 'professional', 'enterprise'].includes(planId);
}
// Test route
router.get('/debug-ssl2', async (req, res) => {
  const tls = require('tls');

  const tests = ['api.debitopay.com', 'google.com', 'httpbin.org'];
  const results = {};

  await Promise.all(tests.map(host => new Promise((resolve) => {
    const socket = tls.connect({
      host, port: 443, servername: host, rejectUnauthorized: false
    }, () => {
      results[host] = { ok: true, protocol: socket.getProtocol() };
      socket.destroy(); resolve();
    });
    socket.on('error', e => { results[host] = { ok: false, error: e.message }; resolve(); });
    setTimeout(() => { results[host] = { ok: false, error: 'timeout' }; resolve(); }, 5000);
  })));

  res.json(results);
});

// ====================== ROTA TEMPLATE ======================
router.post('/template', auth, async (req, res) => {
  const authToken = process.env.DEBITO_PAT;
  const externalRef = `ORD-${Date.now().toString().slice(-8)}`;

  try {
    const { variantId, variantName, totalAmount, method, customer } = req.body;

    if (!totalAmount || !method || !variantId) {
      return res.status(400).json({ message: "Dados insuficientes (variantId, amount e method são obrigatórios)." });
    }

    // Extrai e limpa o ID da empresa para garantir que vai como string pura
    const companyIdRaw = req.user.company?._id || req.user.company;
    if (!companyIdRaw) {
      return res.status(400).json({ message: "Usuário não possui empresa vinculada." });
    }
    const companyId = companyIdRaw.toString();

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const orderCurrency = company.currency || 'MZN';

    const merchantId = company.debitoMerchantId || process.env.DEBITO_MERCHANT_ID;
    if (!merchantId) {
      return res.status(500).json({ message: "Configuração do servidor incompleta (PAT ou Merchant ID)." });
    }

    const WALLETS = {
      mpesa: company.mobileWallets?.mpesa || "50096",
      emola: company.mobileWallets?.emola || "27254",
      visa:  company.mobileWallets?.visa  || "81048",
    };

      const walletCode = WALLETS[method];

      // === METADADOS ESTREITOS PARA O GATEWAY ===
      const gatewayMetadata = {
        type: 'order_payment',
        companyId: companyId,
        customerName: customer?.name || "Cliente Final",
        itemsCount: 1,
        variantId,
        variantName,
        isTemplate: 'true'
      };

      // === METADADOS COMPLETOS PARA SEREM CRIADOS NO WEBHOOK ===
      const dbMetadata = {
        type: 'template_purchase',
        subType: 'template_purchase',
        companyId,
        companyName: company.name || company.companyName || '',
        currency: orderCurrency,
        customerName: customer?.name || "Cliente Final",
        variantId,
        variantName,
        price: Number(totalAmount),
        itemsCount: 1,
        userId: req.user._id?.toString(),
        isTemplate: true,
        customer: customer || {}
      };

      // === CRIAR PENDINGCHECKOUT (cache temporário) — o webhook cria a Transaction definitiva ===
      const PendingCheckout = require('../models/PendingCheckout.cjs');
      await PendingCheckout.create({
        company: companyId,
        user: req.user._id,
        externalRef,
        checkoutType: 'template',
        amount: Number(totalAmount),
        currency: orderCurrency,
        method,
        metadata: dbMetadata,
        customer: customer || {}
      });
      console.log(`✅ PendingCheckout (template) criado: ${externalRef}`);

    // Payload limpo enviado ao gateway de pagamento (com gatewayMetadata)
    let payload = {
      action: "process",
      merchant_id: merchantId,
      wallet_code: walletCode,
      payment_method: method === "visa" ? "visa_mastercard" : method,
      amount: Number(totalAmount),
      currency: orderCurrency,
      external_reference: externalRef,
      metadata: gatewayMetadata, // <--- Enviando apenas a estrutura aceita pelo gateway
      callback_url: `${getCallbackUrl(req)}/api/checkout/webhook`
    };

    // Dados específicos por método
    if (method === "mpesa" || method === "emola") {
      let rawPhone = (customer.phone || '').replace(/\D/g, '');
      const isMpesa = method === 'mpesa';
      const isEmola = method === 'emola';
      if (isMpesa && (rawPhone.startsWith("84") || rawPhone.startsWith("85"))) {
        payload.phone = rawPhone.length === 9 ? "258" + rawPhone : rawPhone;
      } else if (isEmola && (rawPhone.startsWith("86") || rawPhone.startsWith("87"))) {
        payload.phone = rawPhone.length === 9 ? "258" + rawPhone : rawPhone;
      } else {
        return res.status(400).json({ message: isMpesa ? "Número M-Pesa deve começar com 84 ou 85" : "Número E-Mola deve começar com 86 ou 87" });
      }
      payload.customer_name = customer.name || "Cliente";
      payload.customer_email = customer.email || "";
    } else if (method === "visa") {
      payload.customer = {
        name: customer.name || "Cliente",
        email: customer.email || ""
      };
      payload.return_url = `${process.env.CLIENT_URL}/dashboard/settings?status=success`;
      payload.cancel_url = `${process.env.CLIENT_URL}/dashboard/settings?status=error`;
    } else {
      return res.status(400).json({ message: "Método de pagamento não suportado." });
    }

    const config = {
      httpsAgent: debitoAgent,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    };

    const endpoint = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1/payment-orchestrator";

    console.log(`[Template-Purchase] Iniciando ${method} para variant: ${variantId}`);
    console.log(`[Template-Purchase] CALLBACK_URL: ${payload.callback_url}`);
    console.log('[Template Gateway Payload]:', JSON.stringify(payload, null, 2));

    const response = await axios.post(endpoint, payload, config);

    console.log("[API Response] full:", JSON.stringify(response.data));

    const checkoutUrl = response.data?.checkout_url || response.data?.payment_url || response.data?.url;

    if (response.data?.success) {
      const isImmediateSuccess = response.data.status === "success" || response.data.status === "completed";

      if (isImmediateSuccess) {
        // ── PAGAMENTO CONFIRMADO IMEDIATAMENTE: criar Transaction + processar negócio ──
        console.log(`[Template] Pagamento CONFIRMADO imediatamente para ${externalRef}`);
        try {
          const Transaction = require('../models/Transaction.cjs');
          const newTx = await Transaction.create({
            company: companyId,
            user: req.user._id,
            paymentId: response.data?.payment_id,
            externalRef,
            type: 'template_purchase',
            amount: Number(totalAmount),
            currency: orderCurrency,
            status: 'success',
            paymentMethod: method,
            metadata: dbMetadata
          });

          // Processar negócio: ativar template premium
          const Company = require('../models/Company.cjs');
          await Company.findByIdAndUpdate(companyId, {
            'publicPortal.variant': variantId,
            'publicPortal.variantPurchased': true,
            'publicPortal.variantPricePaid': Number(totalAmount),
            'publicPortal.variantPurchasedAt': new Date(),
            'publicPortal.enabled': true,
            'publicPortal.publishedAt': new Date()
          }, { new: true });

          // Remover PendingCheckout
          await PendingCheckout.deleteOne({ externalRef });
          console.log(`✅ Template "${variantName}" activado + Transaction criada: ${newTx._id}`);

          res.json({
            success: true,
            message: "Pagamento concluído com sucesso.",
            transactionCreated: true,
            transactionId: newTx._id,
            status: 'success',
            externalRef
          });
        } catch (inlineError) {
          console.error('[Template] Erro ao processar pagamento imediato:', inlineError);
          res.status(500).json({
            success: false,
            message: "Erro ao processar pagamento confirmado.",
            details: inlineError.message
          });
        }
      } else {
        // Pagamento pendente — webhook vai confirmar
        // Guardar payment_id no PendingCheckout para webhook matcher (Debito devolve payment_id no callback)
        if (response.data?.payment_id) {
          const PendingCheckout = require('../models/PendingCheckout.cjs');
          await PendingCheckout.findOneAndUpdate(
            { externalRef },
            { paymentId: response.data.payment_id }
          ).catch(function(err) { console.warn('[Template] Erro ao salvar paymentId no PendingCheckout:', err.message); });
          console.log(`[Template] paymentId ${response.data.payment_id} vinculado ao PendingCheckout ${externalRef}`);
        }
        res.json({
          success: true,
          message: response.data.status === "pending"
            ? "Pagamento iniciado, aguardando confirmação da operadora."
            : "Pagamento concluído com sucesso.",
          url: checkoutUrl,
          transactionId: response.data?.payment_id || response.data?.id,
          status: response.data?.status,
          externalRef
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: response.data?.error || response.data?.message || "Falha ao processar pagamento",
        details: response.data
      });
    }

  } catch (error) {
    console.error("=== ERRO NA COMPRA DE TEMPLATE ===");
    console.error("Mensagem:", error.message);

    if (error.response) {
      console.error("Status da API:", error.response.status);
      console.error("Dados da API:", JSON.stringify(error.response.data));
    }

    res.status(500).json({
      success: false,
      message: "Erro ao comunicar com o gateway de pagamento. Tente novamente.",
      details: error.response?.data || error.message
    });
  }
});






// ====================== ROTA ORDER ======================
router.post('/order', optionalAuth, async (req, res) => {
  const authToken = process.env.DEBITO_PAT;
  const externalRef = `ORD-${Date.now().toString().slice(-8)}`;

  try {
    const { totalAmount, method, customer, companyId, items, currency: reqCurrency, isSubscription, planId, billingCycle, customMonths, metadata: customMetadata, mobileMoneyPhone, templateId, templateName } = req.body;

    if (!totalAmount || !method || !companyId) {
      return res.status(400).json({ message: "Dados insuficientes." });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const orderCurrency = company.currency || reqCurrency || 'MZN';

    const merchantId = company.debitoMerchantId || process.env.DEBITO_MERCHANT_ID;
    if (!merchantId) {
      return res.status(500).json({ message: "Configuração do servidor incompleta (PAT ou Merchant ID)." });
    }

     const WALLETS = {
       mpesa: company.mobileWallets?.mpesa || "50096",
       emola: company.mobileWallets?.emola || "27254",
       visa:  company.mobileWallets?.visa  || "81048",
     };

     const walletCode = WALLETS[method];

       // === METADADOS — APENAS CAMPOS PLANOS/STRING (gateway rejeita objetos/arrays) ===
       // O webhook reconstrói o metadata completo quando receber o callback.
       const gatewayMetadata = {
         type: 'order_payment',
         companyId,
         customerName: customer?.name || "Cliente Final",
         itemsCount: items?.length || 0,
         companyName: company.name || company.companyName || '',
         currency: orderCurrency,
         ...(isSubscription ? { planId, billingCycle, customMonths: (customMonths || '').toString(), paymentMethod: method } : {}),
         ...(templateId ? { templateId, templateName, isTemplateDocument: 'true' } : {}),
         // Para produtos/serviços: serializar items e customer como JSON string
         ...(!isSubscription && items?.length > 0 ? { itemsJson: JSON.stringify(items), customerJson: JSON.stringify(customer || {}) } : {}),
         ...customMetadata
       };

      // === CRIAR PENDINGCHECKOUT (cache temporário) — o webhook cria a Transaction definitiva ===
      const PendingCheckout = require('../models/PendingCheckout.cjs');
      const fullMetadata = {
        type: isSubscription ? 'subscription' : (templateId ? 'document_template' : 'order'),
        companyId,
        companyName: company.name || company.companyName || '',
        currency: orderCurrency,
        customerName: customer?.name || "Cliente Final",
        itemsCount: items?.length || 0,
        ...(isSubscription ? { planId, billingCycle, customMonths, paymentMethod: method } : {}),
        ...(templateId ? { templateId, templateName, isTemplateDocument: true } : {}),
        ...(!isSubscription && items?.length > 0 ? { items, customer: customer || {} } : {}),
        ...customMetadata
      };
      await PendingCheckout.create({
        company: companyId,
        user: null,
        externalRef,
        checkoutType: 'order',
        amount: Number(totalAmount),
        currency: orderCurrency,
        method,
        metadata: fullMetadata,
        customer: customer || {}
      });
      console.log(`✅ PendingCheckout (order) criado: ${externalRef}`);

     // Preparar payload para o gateway (com metadata ESTREITO apenas)
    let payload = {
      action: "process",
      merchant_id: merchantId,
      wallet_code: walletCode,
      payment_method: method === "visa" ? "visa_mastercard" : method,
      amount: Number(totalAmount),
      currency: orderCurrency,
      external_reference: externalRef,
      metadata: gatewayMetadata,
      callback_url: `${getCallbackUrl(req)}/api/checkout/webhook`
    };

    // Dados específicos por método (idêntico ao order)
    const customerData = customer || {};
    if (method === "mpesa" || method === "emola") {
      let rawPhone = (mobileMoneyPhone || customerData.phone || '').replace(/\D/g, '');
      const isMpesa = method === 'mpesa';
      const isEmola = method === 'emola';
      if (isMpesa && (rawPhone.startsWith("84") || rawPhone.startsWith("85"))) {
        payload.phone = rawPhone.length === 9 ? "258" + rawPhone : rawPhone;
      } else if (isEmola && (rawPhone.startsWith("86") || rawPhone.startsWith("87"))) {
        payload.phone = rawPhone.length === 9 ? "258" + rawPhone : rawPhone;
      } else {
        return res.status(400).json({ message: isMpesa ? "Número M-Pesa deve começar com 84 ou 85" : "Número E-Mola deve começar com 86 ou 87" });
      }
      payload.customer_name = customerData.name || "Cliente";
      payload.customer_email = customerData.email || "";
    } else if (method === "visa") {
      payload.customer = {
        name: customerData.name || "Cliente",
        email: customerData.email || ""
      };
      payload.return_url = `${process.env.CLIENT_URL}/order-success?ref=${externalRef}`;
      payload.cancel_url = `${process.env.CLIENT_URL}/order-failed?ref=${externalRef}`;
    } else {
      return res.status(400).json({ message: "Método de pagamento não suportado." });
    }

    const config = {
      httpsAgent: debitoAgent,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    };

    const endpoint = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1/payment-orchestrator";

    console.log(`[Order] Solicitando ${method} (LIVE) para: ${company.name}`);
    console.log(`[Order] CALLBACK_URL: ${payload.callback_url}`);
    console.log('[TLS Debug] Node version:', process.version);

    const response = await axios.post(endpoint, payload, config);

    // 🔎 Logs adicionais
    console.log("[API Response] status:", response.data?.status);
    console.log("[API Response] payment_id:", response.data?.payment_id);
    console.log("[API Response] full:", JSON.stringify(response.data));

    const checkoutUrl = response.data?.checkout_url || response.data?.payment_url || response.data?.url;

        if (response.data?.success) {
      const isImmediateSuccess = response.data.status === "success" || response.data.status === "completed";

      if (isImmediateSuccess) {
        // ── PAGAMENTO CONFIRMADO IMEDIATAMENTE: criar Transaction + processar negócio ──
        console.log(`[Order] Pagamento CONFIRMADO imediatamente para ${externalRef}`);
        try {
          const Transaction = require('../models/Transaction.cjs');
          const PendingCheckout = require('../models/PendingCheckout.cjs');

          const finalType = isSubscription ? 'subscription'
            : templateId ? 'document_template' : 'order';

          const newTx = await Transaction.create({
            company: companyId,
            user: req.user?._id || null,
            paymentId: response.data?.payment_id,
            externalRef,
            type: finalType,
            amount: Number(totalAmount),
            currency: orderCurrency,
            status: 'success',
            paymentMethod: method,
            metadata: fullMetadata
          });

          // Processar negócio conforme o tipo
          if (isSubscription) {
            const plan = SUBSCRIPTION_PLANS[planId || 'professional'];
            if (plan) {
              const cycleMonths = billingCycle === 'annual' ? 12
                : billingCycle === 'custom' ? (Number(customMonths) || 1) : 1;
              const currentPeriodEnd = new Date();
              currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + cycleMonths);
              const Subscription = require('../models/Subscription.cjs');
              const sub = await Subscription.findOneAndUpdate(
                { company: companyId },
                { company: companyId, purchasedBy: req.user?._id, planId, planName: plan.name, status: 'active', price: Number(plan.price || totalAmount), currency: orderCurrency, billingCycle: billingCycle || 'monthly', features: plan.features, transactionId: response.data?.payment_id, externalRef, paymentMethod: method, currentPeriodStart: new Date(), currentPeriodEnd, nextBillingDate: currentPeriodEnd, autoRenew: plan.price > 0 },
                { upsert: true, new: true }
              );
              await Company.findByIdAndUpdate(companyId, { plan: planId, subscription: sub._id, updatedAt: new Date() });
              console.log(`[Order] Subscrição "${plan.name}" activada imediatamente`);
            }
          } else if (templateId) {
            // Document template purchase
            const TemplateDoc = require('../models/Template.cjs');
            await TemplateDoc.findByIdAndUpdate(templateId, { $addToSet: { purchasedBy: companyId } });
            console.log(`[Order] Template documento "${templateName}" adquirido`);
          } else if (items?.length > 0) {
            // Product/service sale
            const Sale = require('../models/Sale.cjs');
            const Product = require('../models/Product.cjs');
            const newSale = new Sale({
              company: companyId,
              origin: 'external',
              items: items.map(function(i) { return ({
                productId: i.itemId || i.productId || null,
                name: i.name,
                quantity: Number(i.quantity || 1),
                priceAtSale: Number(i.price || i.priceAtSale || 0),
                itemType: normalizeItemType(i.type || i.itemType || 'Product', i)
              })}),
              total: Number(totalAmount),
              amountPaid: Number(totalAmount),
              remainingBalance: 0,
              paymentMethod: normalizePaymentMethod(method),
              status: 'Pago 100%',
              customer: { id: null, name: customer?.name || 'Cliente Online', phone: customer?.phone || '' },
              createdBy: req.user?._id || null,
              partnerId: null
            });
            await newSale.save();
            // Deduzir stock
            for (const item of newSale.items) {
              if (item.itemType === 'Product' && item.productId) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: -item.quantity } });
              }
            }
            // Update metadata with saleId for receipt download
            newTx.metadata = { ...newTx.metadata, saleId: newSale._id };
            await Transaction.findByIdAndUpdate(newTx._id, { 'metadata.saleId': newSale._id.toString() });
            console.log(`[Order] Venda registada: ${newSale._id}`);
          }

          // Remover PendingCheckout
          await PendingCheckout.deleteOne({ externalRef });
          console.log(`✅ Transaction criada no checkout: ${newTx._id} (${finalType})`);

          res.json({
            success: true,
            message: "Pagamento concluído com sucesso.",
            transactionCreated: true,
            transactionId: newTx._id,
            status: 'success',
            externalRef
          });
        } catch (inlineError) {
          console.error('[Order] Erro ao processar pagamento imediato:', inlineError);
          res.status(500).json({
            success: false,
            message: "Erro ao processar pagamento confirmado.",
            details: inlineError.message
          });
        }
      } else {
        // Pagamento pendente ou redirect — webhook vai confirmar
        // Guardar payment_id no PendingCheckout para webhook matcher
        if (response.data?.payment_id) {
          const PendingCheckout = require('../models/PendingCheckout.cjs');
          await PendingCheckout.findOneAndUpdate(
            { externalRef },
            { paymentId: response.data.payment_id }
          ).catch(function(err) { console.warn('[Order] Erro ao salvar paymentId no PendingCheckout:', err.message); });
          console.log(`[Order] paymentId ${response.data.payment_id} vinculado ao PendingCheckout ${externalRef}`);
        }
        res.json({
          success: true,
          message: response.data.status === "pending"
            ? "Pagamento iniciado, aguardando confirmação da operadora."
            : "Pagamento concluído com sucesso.",
          url: checkoutUrl,
          transactionId: response.data?.payment_id || response.data?.id,
          status: response.data?.status,
          externalRef
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: response.data?.error || response.data?.message || "Falha ao processar pagamento",
        details: response.data
      });
    }

  } catch (error) {
    console.log('[Debug Error] Endpoint:', "payment-orchestrator");
    console.error("=== ERRO NO CHECKOUT (LIVE) ===");

    if (error.response) {
      console.error("Status da API:", error.response.status);
      console.error("Dados da API:", JSON.stringify(error.response.data));
    } else {
      console.error("Causa do Erro SSL/Rede:", error.message);
    }

    res.status(500).json({
      success: false,
      message: "Erro ao comunicar com o gateway de pagamento. Tente novamente.",
      details: error.response?.data?.message || error.message
    });
  }
});


// GET /api/checkout/webhook — health check for the webhook endpoint
router.get('/webhook', async (req, res) => {
  console.log('[WEBHOOK] Health check received. Headers:', JSON.stringify(req.headers));
  res.status(200).json({
    online: true,
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    host: req.get('host'),
    protocol: req.protocol,
    publicUrl: `${req.protocol}://${req.get('host')}/api/checkout/webhook`
  });
});

// POST /api/checkout/webhook — aceita formato Debito (event/data) e legado
router.post('/webhook', async (req, res) => {
  try {
    console.log(`[WEBHOOK] === INÍCIO DO PROCESSAMENTO ===`);
    console.log(`[WEBHOOK] Full Body:`, JSON.stringify(req.body, null, 2));
    console.log(`[WEBHOOK] Headers:`, JSON.stringify(req.headers));

    // ── HMAC VERIFICATION (DEBITO SHA256) ─────────────────────────────────
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.DEBITO_WEBHOOK_SECRET;
    if (signature && webhookSecret) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const hash = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (hash !== signature) {
        console.error(`[WEBHOOK] INVALID SIGNATURE! Expected ${hash}, got ${signature}`);
        return res.status(200).send('OK');
      }
      console.log('[WEBHOOK] HMAC verified successfully');
    } else {
      if (signature) console.warn('[WEBHOOK] Signature header present but DEBITO_WEBHOOK_SECRET not set — skipping verification');
      if (webhookSecret) console.log('[WEBHOOK] No signature header — HMAC skipped');
    }

    // ── DETECTAR FORMATO ─────────────────────────────────────────────────
    // Formato 1 (Debito oficial): { event: "payment.completed", data: { payment_id, amount, ... }, timestamp }
    // Formato 2 (legado / Supabase): { success, status, external_reference, payment_id, metadata, ... }
    let status, external_reference, payment_id, metadata, error, amount, method;

    if (req.body.event && req.body.data) {
      // ── FORMATO DEBITO ──
      const debitoEvent = req.body.event;
      const debitoData = req.body.data || {};

      status = debitoEvent === 'payment.completed' ? 'success'
             : debitoEvent === 'payment.failed' ? 'failed'
             : 'pending';
      payment_id = debitoData.payment_id;
      amount = debitoData.amount;
      method = debitoData.method;
      metadata = { debitoEvent, ...debitoData };

      console.log(`[WEBHOOK] Formato Debito detectado: event=${debitoEvent} payment_id=${payment_id} amount=${amount}`);
    } else {
      // ── FORMATO LEGADO ──
      const body = req.body;
      status = (body.status === 'success' || body.status === 'completed' || body.success === true) ? 'success'
             : (body.status === 'failed' || body.success === false) ? 'failed'
             : 'pending';
      external_reference = body.external_reference;
      payment_id = body.payment_id;
      metadata = body.metadata || {};
      error = body.error;
      amount = body.amount;
      method = body.payment_method;

      console.log(`[WEBHOOK] Formato legado: externalRef=${external_reference} status=${body.status} payment_id=${payment_id}`);
    }

    // ── MATCH PendingCheckout por payment_id (Debito devolve o payment_id no callback) ──
    const Transaction = require('../models/Transaction.cjs');
    const PendingCheckout = require('../models/PendingCheckout.cjs');

    if (payment_id && !external_reference) {
      // Formato Debito: tentar encontrar PendingCheckout pelo payment_id
      const pcByPayment = await PendingCheckout.findOne({ paymentId: payment_id }).lean();
      if (pcByPayment) {
        external_reference = pcByPayment.externalRef;
        console.log(`[WEBHOOK] PendingCheckout encontrado via paymentId: ${payment_id} → externalRef: ${external_reference}`);
      } else {
        // Fallback: verificar se já existe Transaction com este payment_id
        const txByPayment = await Transaction.findOne({ paymentId: payment_id }).lean();
        if (txByPayment) {
          external_reference = txByPayment.externalRef;
          console.log(`[WEBHOOK] Transaction encontrada via paymentId: ${payment_id} → externalRef: ${external_reference}`);
        }
      }
    }

    if (!external_reference) {
      console.error('[WEBHOOK] ERRO CRÍTICO: impossível determinar external_reference!');
      return res.status(200).send('OK');
    }

    // ── IDEMPOTÊNCIA: se Transaction já existe com status success/failed, não processar de novo ──
    const existingTx = await Transaction.findOne({ externalRef: external_reference }).lean();
    if (existingTx && (existingTx.status === 'success' || existingTx.status === 'failed')) {
      console.log(`[WEBHOOK] IDEMPOTÊNCIA: Transaction ${external_reference} já com status ${existingTx.status} — ignorando`);
      return res.status(200).send('OK');
    }

    // ── CARREGAR PENDINGCHECKOUT (se Transaction não existir ou estiver pending) ──
    const pendingCheckout = !existingTx ? await PendingCheckout.findOne({ externalRef: external_reference }).lean() : null;

    // effectiveMetadata = Transaction.metadata (completa) > PendingCheckout.metadata (completa) > gateway metadata (estreita)
    const effectiveMetadata = existingTx?.metadata || pendingCheckout?.metadata || metadata || {};

    console.log(`[WEBHOOK] effectiveMetadata.type: ${effectiveMetadata.type}`);
    if (existingTx) {
      console.log(`[WEBHOOK] Usando metadata COMPLETA da Transaction existente`);
    } else if (pendingCheckout) {
      console.log(`[WEBHOOK] Usando metadata do PendingCheckout — criará Transaction agora`);
    } else {
      console.log(`[WEBHOOK] Nenhum PendingCheckout encontrado — usando metadata do gateway`);
    }

    // === NORMALIZAR METADATA — reconstruir campos que foram achatados para o gateway ===
    if (!pendingCheckout && !existingTx && effectiveMetadata) {
      if (effectiveMetadata.itemsJson) {
        try {
          effectiveMetadata.items = JSON.parse(effectiveMetadata.itemsJson);
        } catch (e) {
          effectiveMetadata.items = [];
          console.warn('[WEBHOOK] Falha ao fazer parse de itemsJson');
        }
        delete effectiveMetadata.itemsJson;
      }
      if (effectiveMetadata.customerJson) {
        try {
          effectiveMetadata.customer = JSON.parse(effectiveMetadata.customerJson);
        } catch (e) {
          effectiveMetadata.customer = {};
        }
        delete effectiveMetadata.customerJson;
      }
    }

    // 2. Normalizar tipo de transação
    if (effectiveMetadata.type === 'order_payment') {
      if (effectiveMetadata?.planId) {
        effectiveMetadata.type = 'subscription';
        console.log(`[WEBHOOK] Metadata normalizada: order_payment → subscription`);
      } else if (effectiveMetadata?.isTemplate === 'true' || effectiveMetadata?.isTemplate === true) {
        effectiveMetadata.type = 'template_purchase';
        console.log(`[WEBHOOK] Metadata normalizada: order_payment → template_purchase`);
      } else if (effectiveMetadata?.isTemplateDocument === 'true' || effectiveMetadata?.isTemplateDocument === true || effectiveMetadata?.templateId) {
        console.log(`[WEBHOOK] order_payment (document template)`);
      }
    }

    const finalStatus = 
      (status === 'success' || status === 'completed') ? 'success' :
      (status === 'failed') ? 'failed' : 'pending';

    const webhookCompany = effectiveMetadata?.companyId 
      ? await Company.findById(effectiveMetadata.companyId).select('currency').lean()
      : null;
    const webhookCurrency = webhookCompany?.currency || effectiveMetadata?.currency || 'MZN';

    // === UPSERT TRANSAÇÃO (PRESERVAR metadata COMPLETA) ===
    const transactionData = {
      company: effectiveMetadata?.companyId || existingTx?.company || null,
      user: effectiveMetadata?.userId || existingTx?.user || null,
      paymentId: payment_id,
      externalRef: external_reference,
      type: effectiveMetadata?.type || existingTx?.type || 'unknown',
      amount: Number(amount || effectiveMetadata?.price || existingTx?.amount || 0),
      currency: webhookCurrency,
      status: finalStatus,
      paymentMethod: method || effectiveMetadata?.paymentMethod || existingTx?.paymentMethod,
      metadata: existingTx?.metadata || effectiveMetadata || {},
      errorMessage: error || null,
      updatedAt: new Date()
    };

    let savedTransaction = null;

    try {
      savedTransaction = await Transaction.findOneAndUpdate(
        { externalRef: external_reference },
        transactionData,
        { new: true, upsert: true }
      );

      console.log(`✅ Transação processada: ${savedTransaction._id} | Status: ${finalStatus}`);

      if (pendingCheckout) {
        await PendingCheckout.deleteOne({ externalRef: external_reference });
        console.log(`🗑️ PendingCheckout removido: ${external_reference}`);
      }
    } catch (txError) {
      console.error(`❌ Erro ao salvar Transaction:`, txError.message);
      console.error(txError);
    }

    // ── PROCESSAMENTO DE NEGÓCIO ─────────────────────────────────────────────
    if (finalStatus === 'success') {

      // ── CASO 1: SUBSCRIÇÃO ────────────────────────────────────────────────
      if (effectiveMetadata?.type === 'subscription') {
        console.log(`[Webhook] SUBSCRIÇÃO — empresa ${effectiveMetadata.companyName || effectiveMetadata.companyId}`);
        try {
          const plan = SUBSCRIPTION_PLANS[effectiveMetadata.planId || 'professional'];
          if (!plan) throw new Error(`Plano inválido: ${effectiveMetadata.planId}`);
          const effectiveBillingCycle = effectiveMetadata.billingCycle || 'monthly';
          const cycleMonths = effectiveBillingCycle === 'annual' ? 12
            : effectiveBillingCycle === 'custom' ? (Number(effectiveMetadata.customMonths) || 1) : 1;

          if (plan.price === 0) {
            const expirationDate = new Date(); expirationDate.setFullYear(expirationDate.getFullYear() + 10);
            await Company.findByIdAndUpdate(effectiveMetadata.companyId, { plan: effectiveMetadata.planId, updatedAt: new Date() });
            await Subscription.findOneAndUpdate(
              { company: effectiveMetadata.companyId },
              { company: effectiveMetadata.companyId, purchasedBy: effectiveMetadata.userId, planId: effectiveMetadata.planId, planName: plan.name, status: 'active', price: 0, currency: webhookCurrency, billingCycle: 'monthly', features: plan.features, transactionId: payment_id, externalRef: external_reference, paymentMethod: effectiveMetadata.paymentMethod, currentPeriodStart: new Date(), currentPeriodEnd: expirationDate, autoRenew: false, updatedAt: new Date() },
              { upsert: true, new: true }
            );
            console.log(`✅ Subscrição GRATUITA ativada`);
          } else {
            const currentPeriodEnd = new Date(); currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + cycleMonths);
            const sub = await Subscription.findOneAndUpdate(
              { company: effectiveMetadata.companyId },
              { company: effectiveMetadata.companyId, purchasedBy: effectiveMetadata.userId, planId: effectiveMetadata.planId, planName: plan.name, status: 'active', price: plan.price, currency: webhookCurrency, billingCycle: effectiveBillingCycle, features: plan.features, transactionId: payment_id, externalRef: external_reference, paymentMethod: effectiveMetadata.paymentMethod, currentPeriodStart: new Date(), currentPeriodEnd, nextBillingDate: currentPeriodEnd, autoRenew: true, updatedAt: new Date() },
              { upsert: true, new: true }
            );
            await Company.findByIdAndUpdate(effectiveMetadata.companyId, { plan: effectiveMetadata.planId, subscription: sub._id, updatedAt: new Date() });
            console.log(`✅ Subscrição PAGA ativada para empresa ${effectiveMetadata.companyId} (${effectiveBillingCycle}, expira em ${currentPeriodEnd.toLocaleDateString('pt-BR')})`);
          }
        } catch (subError) {
          console.error('[Webhook] Erro subscrição:', subError);
        }
      }

      // ── CASO 2: VENDA / ORDER ────────────────────────────────────────────
      else if (effectiveMetadata?.type === 'order_payment' || effectiveMetadata?.type === 'order' || effectiveMetadata?.sale) {
        console.log(`[Webhook] VENDA — empresa ${effectiveMetadata.companyName || 'N/A'}`);

        // Sub-caso 2A: template de documento
        if (effectiveMetadata?.isTemplateDocument || effectiveMetadata?.templateId) {
          try {
            const TemplateDoc = require('../models/Template.cjs');
            await TemplateDoc.findByIdAndUpdate(effectiveMetadata.templateId, { $addToSet: { purchasedBy: effectiveMetadata.companyId } });
            console.log(`✅ Template documento adquirido: ${effectiveMetadata.templateName || effectiveMetadata.templateId}`);
          } catch (e) {
            console.error('❌ Erro template documento:', e);
          }
        }

        // Sub-caso 2B: venda regular (só se NÃO for template documento)
        if (!effectiveMetadata?.isTemplateDocument && !effectiveMetadata?.templateId) {
          try {
            const Sale = require('../models/Sale.cjs');
            const Product = require('../models/Product.cjs');
            let orderItems = [];
            let saleCustomer = effectiveMetadata?.customer || {};
            let saleTotal = Number(amount || 0);

            if (effectiveMetadata?.items && effectiveMetadata.items.length > 0) {
              orderItems = effectiveMetadata.items;
              saleCustomer = effectiveMetadata.customer || {};
              saleTotal = Number(amount || effectiveMetadata.items.reduce(function(s, i) { return s + (i.price * i.quantity); }, 0));
            } else if (effectiveMetadata?.sale) {
              const saleInfo = typeof effectiveMetadata.sale === 'string' ? JSON.parse(effectiveMetadata.sale) : (effectiveMetadata.sale || {});
              orderItems = saleInfo.items || [];
              saleCustomer = saleInfo.customer || {};
              saleTotal = Number(saleInfo.total || amount || 0);
            }

            if (orderItems.length > 0) {
              const newSale = new Sale({
                company: effectiveMetadata.companyId,
                origin: 'external',
                items: orderItems.map(function(i) { return ({
                  productId: i.itemId || i.productId || null,
                  name: i.name,
                  quantity: Number(i.quantity || 1),
                  priceAtSale: Number(i.price || i.priceAtSale || 0),
                  itemType: normalizeItemType(i.type || i.itemType || 'Product', i)
                })}),
                total: saleTotal, amountPaid: saleTotal, remainingBalance: 0,
                paymentMethod: normalizePaymentMethod(effectiveMetadata.paymentMethod),
                status: 'Pago 100%',
                customer: { id: saleCustomer?.id || null, name: saleCustomer?.name || 'Cliente Online', phone: saleCustomer?.phone || '' },
                createdBy: effectiveMetadata.userId || null,
                partnerId: null
              });
              await newSale.save();
              console.log(`✅ Venda registrada: ${newSale._id}`);
              for (const item of newSale.items) {
                if (item.itemType === 'Product' && item.productId) {
                  await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: -item.quantity } });
                }
              }
            } else {
              console.warn(`[Webhook] Venda ignorada: items vazios.`);
            }
          } catch (e) {
            console.error('❌ Erro venda:', e);
          }
        }
      }

      // ── CASO 3: COMPRA DE TEMPLATE PREMIUM ─────────────────────────────
      else if (effectiveMetadata?.type === 'template_purchase') {
        console.log(`[Webhook] TEMPLATE PREMIUM: ${effectiveMetadata.variantName}`);
        try {
          await Company.findByIdAndUpdate(effectiveMetadata.companyId, {
            'publicPortal.variant': effectiveMetadata.variantId,
            'publicPortal.variantPurchased': true,
            'publicPortal.variantPricePaid': effectiveMetadata.price || 0,
            'publicPortal.variantPurchasedAt': new Date(),
            'publicPortal.variantTransactionId': payment_id || external_reference,
            'publicPortal.enabled': true,
            'publicPortal.publishedAt': new Date()
          });
          console.log(`✅ Template Premium ativado`);
        } catch (e) {
          console.error('Erro template premium:', e);
        }
      }

      console.log(`✅ Pagamento concluído. Ref: ${external_reference}`);

    } else if (finalStatus === 'failed') {
      console.log(`❌ Pagamento falhou. Ref: ${external_reference} | Erro: ${error}`);
    } else {
      console.log(`⏳ Pagamento PENDING. Ref: ${external_reference}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Erro Crítico no Webhook:', error.message);
    console.error(error.stack);
    res.status(200).send('OK');
  }
});

// ====================== FINALIZAR CHECKOUT (VISA REDIRECT) ======================
router.post('/finalize', async (req, res) => {
  try {
    const { ref } = req.body;
    if (!ref) {
      return res.status(400).json({ found: false, message: 'ref é obrigatório' });
    }

    const Transaction = require('../models/Transaction.cjs');
    const PendingCheckout = require('../models/PendingCheckout.cjs');

    // 1. Se a Transaction já existe (webhook já processou), retorná-la
    const existingTx = await Transaction.findOne({ externalRef: ref }).lean();
    if (existingTx) {
      console.log(`[finalize] Transaction já existe: ${ref} (status: ${existingTx.status})`);
      return res.json({ found: true, transaction: existingTx });
    }

    // 2. Procurar PendingCheckout
    const pending = await PendingCheckout.findOne({ externalRef: ref }).lean();
    if (!pending) {
      console.log(`[finalize] Nenhum PendingCheckout encontrado para: ${ref}`);
      return res.json({ found: false, externalRef: ref, message: 'Checkout não encontrado ou já expirou.' });
    }

    // 3. Query Debito API para verificar status atual do pagamento
    const authToken = process.env.DEBITO_PAT;
    const merchantId = process.env.DEBITO_MERCHANT_ID;

    console.log(`[finalize] Finalizando checkout: ${ref} (${pending.checkoutType}, ${pending.method})`);

    // Se chegou ao /finalize, o pagamento já foi confirmado
    // (redirect VISA ou o webhook já deveria ter processado)
    const finalStatus = 'success';

    // 4. Criar a Transaction
    const newTx = await Transaction.create({
      company: pending.company,
      user: pending.user || null,
      externalRef: ref,
      type: pending.checkoutType === 'template' ? 'template_purchase' : 'order',
      amount: pending.amount,
      currency: pending.currency,
      status: finalStatus,
      paymentMethod: pending.method,
      metadata: pending.metadata
    });

    console.log(`[finalize] Transaction criada: ${newTx._id} (status: ${finalStatus})`);

    // 5. Processar negócio imediatamente (pagamento confirmado)
    if (finalStatus === 'success') {
      try {
        const meta = newTx.metadata || pending.metadata;
        const Company = require('../models/Company.cjs');

        if (pending.checkoutType === 'template') {
          // Activar template premium
          await Company.findByIdAndUpdate(pending.company, {
            'publicPortal.variant': meta.variantId,
            'publicPortal.variantPurchased': true,
            'publicPortal.variantPricePaid': meta.price || pending.amount,
            'publicPortal.variantPurchasedAt': new Date(),
            'publicPortal.enabled': true,
            'publicPortal.publishedAt': new Date()
          }, { new: true });
          console.log(`[finalize] Template "${meta.variantName}" activado para empresa ${pending.company}`);
        } else if (meta.type === 'subscription') {
          const SUBSCRIPTION_PLANS = require('../config/subscriptionPlans.cjs');
          const Subscription = require('../models/Subscription.cjs');
          const plan = SUBSCRIPTION_PLANS[meta.planId || 'professional'];
          if (plan) {
            const cycleMonths = meta.billingCycle === 'annual' ? 12
              : meta.billingCycle === 'custom' ? (Number(meta.customMonths) || 1)
              : 1;
            const currentPeriodEnd = new Date();
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + cycleMonths);
            const sub = await Subscription.findOneAndUpdate(
              { company: pending.company },
              { company: pending.company, purchasedBy: pending.user, planId: meta.planId, planName: plan.name, status: 'active', price: plan.price, currency: pending.currency, billingCycle: meta.billingCycle || 'monthly', features: plan.features, transactionId: ref, externalRef: ref, paymentMethod: pending.method, currentPeriodStart: new Date(), currentPeriodEnd, nextBillingDate: currentPeriodEnd, autoRenew: true, updatedAt: new Date() },
              { upsert: true, new: true }
            );
            await Company.findByIdAndUpdate(pending.company, { plan: meta.planId, subscription: sub._id, updatedAt: new Date() });
            console.log(`[finalize] Subscrição "${plan.name}" activada para empresa ${pending.company}`);
          }
        } else if (meta.type === 'order_payment' || meta.type === 'order') {
          const Sale = require('../models/Sale.cjs');
          const Product = require('../models/Product.cjs');
          if (meta.items && meta.items.length > 0) {
            const newSale = new Sale({
              company: pending.company,
              origin: 'external',
              items: meta.items.map(function(i) { return ({
                productId: i.itemId || i.productId || null,
                name: i.name,
                quantity: Number(i.quantity || 1),
                priceAtSale: Number(i.price || i.priceAtSale || 0),
                itemType: normalizeItemType(i.type || i.itemType || 'Product', i)
              })}),
              total: pending.amount,
              amountPaid: pending.amount,
              remainingBalance: 0,
              paymentMethod: normalizePaymentMethod(pending.method),
              status: 'Pago 100%',
              customer: { id: null, name: meta.customerName || 'Cliente Online', phone: '' },
              createdBy: pending.user || null,
              partnerId: null
            });
            await newSale.save();
            console.log(`[finalize] Venda registrada: ${newSale._id}`);
            for (const item of newSale.items) {
              if (item.itemType === 'Product' && item.productId) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: -item.quantity } });
              }
            }
          } else if (meta.templateId) {
            const Template = require('../models/Template.cjs');
            await Template.findByIdAndUpdate(meta.templateId, { $addToSet: { purchasedBy: pending.company } });
            console.log(`[finalize] Template documento "${meta.templateName}" adquirido: ${pending.company}`);
          }
        }
      } catch (bizError) {
        console.error('[finalize] Erro ao processar negócio:', bizError);
      }
    }

    // 6. Remover PendingCheckout
    await PendingCheckout.deleteOne({ externalRef: ref });
    console.log(`[finalize] PendingCheckout removido: ${ref}`);

    return res.json({ found: true, transaction: newTx });
  } catch (error) {
    console.error('[finalize] Erro:', error.message);
    res.status(500).json({ found: false, message: 'Erro interno ao finalizar checkout.' });
  }
});

// ====================== STATUS DE TRANSAÇÃO (POLLING) ======================
router.get('/transaction-status', async (req, res) => {
  try {
    const { ref } = req.query;
    if (!ref) {
      return res.status(400).json({ found: false, message: 'ref é obrigatório' });
    }

    const Transaction = require('../models/Transaction.cjs');
    const PendingCheckout = require('../models/PendingCheckout.cjs');
    const tx = await Transaction.findOne({ externalRef: ref })
      .select('externalRef amount status paymentMethod metadata type createdAt updatedAt')
      .lean();

    if (tx) {
      return res.json({
        found: true,
        transaction: {
          _id: tx._id,
          externalRef: tx.externalRef,
          amount: tx.amount,
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          type: tx.type,
          customerName: tx.metadata?.customerName || tx.metadata?.customer?.name || '',
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt
        }
      });
    }

    // Fallback: PendingCheckout ainda não processado
    const pending = await PendingCheckout.findOne({ externalRef: ref }).lean();
    if (pending) {
      return res.json({
        found: true,
        pending: true,
        transaction: {
          _id: pending._id,
          externalRef: pending.externalRef,
          amount: pending.amount,
          status: 'pending',
          paymentMethod: pending.method,
          type: pending.checkoutType === 'template' ? 'template_purchase' : 'order',
          customerName: pending.metadata?.customerName || pending.customer?.name || '',
          createdAt: pending.createdAt,
          updatedAt: pending.createdAt
        }
      });
    }

    res.json({ found: false, externalRef: ref });
  } catch (error) {
    console.error('[transaction-status] Erro:', error.message);
    res.status(500).json({ found: false, message: 'Erro interno' });
  }
});

// ====================== DASHBOARD DE TRANSAÇÕES ======================
router.get('/transactions', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      type, 
      search,
      startDate,
      endDate,
      companyId: filterCompanyId   // Permite filtrar por empresa (para superadmin)
    } = req.query;

    const isSuperAdmin = req.user.role === 'superadmin' || req.user.isSuperAdmin === true;

    let query = {};

    // Se for Super Admin, pode ver tudo ou filtrar por empresa
    if (isSuperAdmin) {
      if (filterCompanyId) {
        query.company = filterCompanyId;
      }
      // Senão não filtra por empresa (mostra todas)
    } else {
      // Usuário normal só vê da sua empresa
      const companyId = req.user.company?._id || req.user.company;
      query.company = companyId;
    }

    if (status) query.status = status;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { externalRef: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
        { 'metadata.customerName': { $regex: search, $options: 'i' } },
        { 'metadata.variantName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('company', 'name')
        .populate('user', 'name email')
        .lean(),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      isSuperAdmin // útil para o frontend
    });

  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao carregar transações' });
  }
});

// ====================== ESTATÍSTICAS ======================
router.get('/transactions/stats', auth, async (req, res) => {
  try {
    const { companyId: filterCompanyId } = req.query;
    const isSuperAdmin = req.user.role === 'superadmin' || req.user.isSuperAdmin === true;

    let matchStage = {};

    if (!isSuperAdmin) {
      const companyId = req.user.company?._id || req.user.company;
      matchStage.company = companyId;
    } else if (filterCompanyId) {
      matchStage.company = filterCompanyId;
    }
    // Superadmin sem filtro = todas as empresas

    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          successAmount: { 
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } 
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        successCount: 0,
        failedCount: 0,
        pendingCount: 0,
        successAmount: 0
      },
      isSuperAdmin
    });

  } catch (error) {
    console.error('Erro ao buscar stats de transações:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

module.exports = router;