const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();
// Fix: Use the correct global-agent import


// Route Imports
const authRoutes = require('./routes/auth.cjs');
const companyRoutes = require('./routes/company.cjs');
const clientRoutes = require('./routes/clients.cjs');
const supplierRoutes = require('./routes/suppliers.cjs');
const documentRoutes = require('./routes/documents.cjs');
const templateRoutes = require('./routes/templates.cjs');
const pdfRoutes = require('./routes/pdf.cjs');
const shareRoutes = require('./routes/share.cjs');
const serviceRoutes = require('./routes/services.cjs');
const salesRoutes = require('./routes/sales.cjs');
const couponRoutes = require('./routes/coupons.cjs');
const bundleRoutes = require('./routes/bundles.cjs');
const requisitionRoutes = require('./routes/requisitions.cjs');
const publicPortal = require('./routes/public.cjs');
const productRoutes = require('./routes/products.cjs');
const usersRoutes = require('./routes/users.cjs');
const cashClosuresRoutes = require('./routes/cash-closures.cjs');
const cashClosureExpensesRoutes = require('./routes/cash-closure-expenses.cjs');
const goalsRoutes = require('./routes/goals.cjs');
const customersRoutes = require('./routes/customers.cjs');
const checkoutRoutes = require('./routes/checkout.cjs');
const usersRouter = require('./routes/users.cjs');
const pendingRoomsRoutes = require('./routes/pending-rooms.cjs');
const subscriptionsRouter = require('./routes/subscriptions.cjs');
const roleRoutes = require('./routes/roles.cjs');
const proposalsRouter = require('./routes/proposals.cjs');
const uploadRoutes = require('./routes/upload.cjs');
const leadsRoutes = require('./routes/leads.cjs'); // Certifique-se do caminho correto
const ordersDisplayRoutes = require('./routes/orders-display.cjs');
const subscriptionPlansRoutes = require('./routes/admin/subscription-plans.cjs');
const app = express();

app.set('trust proxy', 1);

// 1. Middlewares de Segurança e Otimização (Não mexem no Body)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: function (origin, cb) {
    if (origin) {
      console.log(`[CORS] Incoming origin: "${origin}"`);
    }
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5000',
      'tauri://localhost',
      'https://tauri.localhost',
      'https://meupontodevenda.com'
    ].filter(Boolean);
    // Also match any origin ending with .run.app (Cloud Run) or starting with tauri:// or capacitor://
    const isAllowed = !origin 
      || allowed.includes(origin) 
      || origin.startsWith('tauri://') 
      || origin.startsWith('capacitor://')
      || origin.endsWith('.run.app');
    if (!isAllowed) {
      console.warn(`[CORS] BLOCKED origin: "${origin}"`);
    }
    cb(null, isAllowed);
  },
  credentials: true
}));

// 3. Rotas de UPLOAD PRIMEIRO (Sem limiter e sem express.json antes delas)
// Isso garante que o Multer pegue o fluxo de dados puro
app.use('/api/services', serviceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/company', companyRoutes);

// 4. Agora sim, aplique o Limiter para as demais rotas
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => !!req.header('authorization')
});

app.use('/api/', limiter);
cron.schedule('5 1 1 * *', async () => {
  console.log('[CRON] Iniciando fechamento mensal de comissões pendentes...');

  try {
    const now = new Date();
    // Período do mês ANTERIOR
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const result = await CommissionTransaction.updateMany(
      {
        period: 'monthly',
        periodStart: { $gte: prevMonthStart },
        periodEnd: { $lte: prevMonthEnd },
        status: 'pending'
      },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          // approvedBy: null  // ou um ID de sistema/admin automático se quiser rastrear
        }
      }
    );

    console.log(
      `[CRON] Fechamento concluído: ${result.modifiedCount} comissões aprovadas automaticamente`
    );

    // Opcional: enviar email/resumo para admins
    // await sendMonthlyCommissionSummaryEmail();

  } catch (err) {
    console.error('[CRON comissão mensal] Erro:', err);
  }
}, {
  timezone: 'Africa/Maputo'   // importante para Moçambique
});

// 5. Agora os Parsers de JSON (Abaixo dos uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 2. Estatísticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.use('/static', express.static(path.join(__dirname, 'public/static')));

// --- O PULO DO GATO ---


app.use('/public', publicPortal);
// 6. Restante das Rotas que NÃO são de upload de arquivo
app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./routes/admin.cjs'));
app.use('/api/roles', roleRoutes);
app.use('/api/dashboard', require('./routes/dashboard.cjs')); 
app.use('/api/users', usersRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/orders', ordersDisplayRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/requisitions', requisitionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cash-closures', cashClosuresRoutes);
app.use('/api/cash-closures', cashClosureExpensesRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/subscriptions', subscriptionsRouter); 
app.use('/api/admin/subscription-plans', subscriptionPlansRoutes);
app.use('/api/pending-rooms', pendingRoomsRoutes);
app.use('/api/public-portal-templates', require('./routes/public-portal-templates.cjs'));
app.use('/api/company', require('./routes/dashboard.cjs'));
app.use('/api/company', require('./routes/company-portal.cjs'));
app.use('/api/admin/builtin-variants', require('./routes/admin-builtin-variants.cjs'));
app.use('/api/social', require('./routes/social.cjs'));
app.use('/api/commissions', require('./routes/commissions.cjs'));
app.use('/api/referrals', require('./routes/referrals.cjs'));
app.use('/api/onboarding', require('./routes/onboarding.cjs'));
app.use('/api/library', require('./routes/library.cjs'));
app.use('/api/expenses', require('./routes/expenses.cjs'));
app.use('/api', uploadRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 7. Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;