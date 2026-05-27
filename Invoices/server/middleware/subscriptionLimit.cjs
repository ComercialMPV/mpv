// middleware/subscriptionLimit.cjs
const Subscription = require('../models/Subscription.cjs');
const SubscriptionPlan = require('../models/SubscriptionPlan.cjs');
const Company = require('../models/Company.cjs');

const entityToModelMap = {
  users:        require('../models/User.cjs'),
  products:     require('../models/Product.cjs'),
  services:     require('../models/Service.cjs'),
  bundles:      require('../models/Bundle.cjs'),
  requisitions: require('../models/Requisition.cjs'),
  leads:        require('../models/Lead.cjs'),
  clients:      require('../models/Client.cjs'),
  suppliers:    require('../models/Supplier.cjs'),
  documents:    require('../models/Document.cjs'),
  sales:        require('../models/Sale.cjs'),
  proposals:    require('../models/Proposal.cjs'),
};

const checkSubscriptionLimit = (entityName) => async (req, res, next) => {
  if (!req.user?.company) {
    return res.status(401).json({ message: 'Empresa não identificada' });
  }

  try {
    const companyId = req.user.company._id || req.user.company;

    // 1. Buscar subscrição ativa com o plano populado
    const subscription = await Subscription.findOne({ company: companyId })
      .populate('plan', 'name maxLimits features id')
      .lean();

    if (!subscription) {
      return res.status(403).json({ 
        message: 'Nenhuma subscrição ativa encontrada. Contacte o suporte.' 
      });
    }

    // 2. Verificar estado da subscrição
    const now = new Date();

    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return res.status(403).json({ 
        message: `Sua subscrição está ${subscription.status}. Por favor, renove para continuar.` 
      });
    }

    if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
      return res.status(403).json({ 
        message: 'Sua subscrição expirou. Por favor, renove para continuar usando o sistema.' 
      });
    }

    // 3. Enterprise → sem limites
    if (subscription.plan?.id === 'enterprise') {
      return next();
    }

    const plan = subscription.plan;
    if (!plan || !plan.maxLimits) {
      return res.status(403).json({ 
        message: 'Plano inválido ou sem limites definidos.' 
      });
    }

    const Model = entityToModelMap[entityName];
    if (!Model) {
      console.warn(`[Subscription Limit] Modelo não mapeado para: ${entityName}`);
      return next(); // fail open (melhor que bloquear tudo)
    }

    // Contagem atual de registros ativos
    const currentCount = await Model.countDocuments({
      company: companyId,
      isActive: { $ne: false }
    });

    const maxAllowed = plan.maxLimits[entityName];

    // Se não existir limite definido para este recurso → permitir
    if (maxAllowed === undefined || maxAllowed === null) {
      return next();
    }

    // Para requisições POST (criação) → verificar se vai exceder
    const isCreation = req.method === 'POST';

    if (isCreation && currentCount >= maxAllowed) {
      return res.status(403).json({
        success: false,
        message: `Limite atingido para ${entityName}.`,
        current: currentCount,
        limit: maxAllowed,
        planName: plan.name,
        upgradeNeeded: true
      });
    }

    // ====================== NOTIFICAÇÃO DE AVISO ======================
    // Aviso quando está próximo do limite (80% ou mais)
    if (currentCount >= Math.floor(maxAllowed * 0.8)) {
      setImmediate(async () => {
        try {
          const emailService = require('../utils/emailService.cjs');
          await emailService.sendLimitWarningEmail(
            req.user.email,
            entityName,
            currentCount,
            maxAllowed,
            plan.name
          );
        } catch (e) {
          console.error('Erro ao enviar email de aviso de limite:', e);
        }
      });
    }

    next();

  } catch (err) {
    console.error('Erro no middleware de limite de subscrição:', err);
    // Em caso de erro interno, não bloquear o request (fail open)
    next();
  }
};

module.exports = { checkSubscriptionLimit };