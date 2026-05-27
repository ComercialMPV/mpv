const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const https = require ('https');
require('dotenv').config();

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
const ordersDisplayRoutes = require('./routes/orders-display.cjs');
const subscriptionPlansRoutes = require('./routes/admin/subscription-plans.cjs');

const proposalsRouter = require('./routes/proposals.cjs');
const leadsRoutes = require('./routes/leads.cjs'); // Certifique-se do caminho correto
const app = express();

// when running behind a proxy (e.g. shared host, nginx, heroku) we need to trust
// the `X-Forwarded-*` headers so that rate-limit and other middleware can identify
// the real client IP. set via env or default to trusting first hop (common case).
app.set('trust proxy', process.env.TRUST_PROXY || 1);
https.globalAgent.options.minVersion = 'TLSv1.2';
// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP temporarily to rule out blockages
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting
// Allow higher limits for authenticated clients to avoid throttling legitimate API traffic
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // default for unauthenticated
  // skip rate limiting when Authorization header present (authenticated users)
  skip: (req) => !!req.header('authorization')
});
app.use('/api/', limiter);

// Process-level handlers to log unexpected errors and avoid silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

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

// previous code managed a global Puppeteer instance which is no longer used
// since we switched to Playwright and open/close browsers per request.  Remove
// the exit handler to avoid referencing nonexistent globals.

// CORS
app.use(cors({
  origin: function (origin, cb) {
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5000',
      'tauri://localhost',
      'https://tauri.localhost',
      'https://meupontodevenda.com'
    ].filter(Boolean);
    if (!origin || allowed.includes(origin) || origin.startsWith('tauri://') || origin.startsWith('capacitor://')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  credentials: true
}));

// Body parsing - bump limits to handle larger payloads (e.g. embedded images or huge objects)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.use('/static', express.static(path.join(__dirname, 'public/static')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./routes/admin.cjs'));
app.use('/api/roles', roleRoutes);
app.use('/api/users', usersRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/company', companyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/products', productRoutes);
app.use('/api/requisitions', requisitionRoutes);
app.use('/public', publicPortal);
app.use('/api/users', usersRoutes);
app.use('/api/cash-closures', cashClosuresRoutes);
app.use('/api/cash-closures', cashClosureExpensesRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/subscriptions', subscriptionsRouter); 
app.use('/api/pending-rooms', pendingRoomsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/orders', ordersDisplayRoutes);
app.use('/api/public-portal-templates', require('./routes/public-portal-templates.cjs'));
app.use('/api/company', require('./routes/dashboard.cjs'));
app.use('/api/dashboard', require('./routes/dashboard.cjs')); // rota para dashboard analytics e limites de uso
app.use('/api/company', require('./routes/company-portal.cjs'));
app.use('/api/admin/builtin-variants', require('./routes/admin-builtin-variants.cjs'));
app.use('/api/social', require('./routes/social.cjs'));
app.use('/api/commissions', require('./routes/commissions.cjs'));
app.use('/api/referrals', require('./routes/referrals.cjs'));
app.use('/api/onboarding', require('./routes/onboarding.cjs'));
app.use('/api/library', require('./routes/library.cjs'));
app.use('/api/expenses', require('./routes/expenses.cjs'));
app.use('/api/admin/subscription-plans', subscriptionPlansRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-app')
  .then(async () => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // schedule daily reminders for all companies
    const salesRoutes = require('./routes/sales.cjs');
    const Company = require('./models/Company.cjs');
    
    console.log('salesRoutes keys on startup', Object.keys(salesRoutes));

    const runRemindersForAll = async () => {
      try {
        const companies = await Company.find({});
        for (const comp of companies) {
          if (typeof salesRoutes.sendDueNotifications !== 'function') {
            console.error('sendDueNotifications missing!', salesRoutes.sendDueNotifications);
            continue;
          }
          await salesRoutes.sendDueNotifications(comp._id);
        }
        console.log('Reminders job executed');
      } catch (err) {
        console.error('Error running reminder job:', err);
      }
    };

    // run immediately then every 24h
    runRemindersForAll();
    setInterval(runRemindersForAll, 24 * 60 * 60 * 1000);
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

module.exports = app;