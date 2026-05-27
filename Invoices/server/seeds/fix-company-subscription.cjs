// seeds/fix-company-subscription.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Company = require('../models/Company.cjs');
const Subscription = require('../models/Subscription.cjs');
const SubscriptionPlan = require('../models/SubscriptionPlan.cjs');

async function fixCompanySubscriptions() {
  try {
    console.log('🚀 Iniciando migração de subscrições para empresas antigas...');

    // Buscar todas as empresas que não têm subscription associada
    const companies = await Company.find({
      subscription: { $exists: false } // ou { $eq: null }
    }).lean();

    console.log(`Encontradas ${companies.length} empresas sem subscrição associada.`);

    let fixed = 0;

    for (const company of companies) {
      // Tentar encontrar uma subscrição existente para esta empresa
      let subscription = await Subscription.findOne({ company: company._id });

      if (!subscription) {
        // Buscar plano padrão (podes mudar para o que quiseres como default)
        const defaultPlan = await SubscriptionPlan.findOne({ id: company.plan || 'basic' }) 
                          || await SubscriptionPlan.findOne({ id: 'basic' });

        if (!defaultPlan) {
          console.warn(`⚠️ Plano não encontrado para empresa ${company.name}`);
          continue;
        }

        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 12); // 1 ano por defeito para empresas antigas

        subscription = new Subscription({
          company: company._id,
          plan: defaultPlan._id,
          planId: defaultPlan.id,
          planName: defaultPlan.name,
          price: defaultPlan.price || 0,
          currency: 'MT',
          status: 'active',
          billingCycle: 'annual',
          currentPeriodStart: start,
          currentPeriodEnd: end,
          nextBillingDate: end,
          autoRenew: true,
          purchasedBy: null, // ou um superadmin se quiseres
        });

        await subscription.save();
        console.log(`✅ Criada nova subscrição para: ${company.name}`);
      }

      // Ligar a subscrição à empresa
      await Company.findByIdAndUpdate(company._id, {
        subscription: subscription._id,
        plan: subscription.planId || company.plan
      });

      fixed++;
    }

    console.log(`\n🎉 Migração concluída! ${fixed} empresas foram atualizadas.`);

  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    mongoose.connection.close();
  }
}

// Executar
mongoose.connect(process.env.MONGODB_URI)
  .then(() => fixCompanySubscriptions())
  .catch(err => console.error('Erro de conexão:', err));