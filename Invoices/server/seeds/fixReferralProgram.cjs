// scripts/fixReferralProgram.js
const mongoose = require('mongoose');
const Company = require('../models/Company.cjs');
require('dotenv').config();   // se estiveres a usar dotenv

async function fixReferralProgram() {
  try {
    console.log('🔧 Iniciando correção do campo referralProgramEnabled...');

    const result = await Company.updateMany(
      { 
        referralProgramEnabled: { $exists: false }   // empresas que ainda não têm o campo
      },
      { 
        $set: { referralProgramEnabled: false } 
      }
    );

    console.log(`✅ Concluído!`);
    console.log(`   - Empresas encontradas: ${result.matchedCount}`);
    console.log(`   - Empresas atualizadas: ${result.modifiedCount}`);

  } catch (err) {
    console.error('❌ Erro ao corrigir referralProgramEnabled:', err.message);
  } finally {
    mongoose.connection.close();
  }
}

// Executar se o ficheiro for chamado diretamente
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/seu-banco')
    .then(() => {
      console.log('📡 Conectado ao MongoDB');
      fixReferralProgram();
    })
    .catch(err => console.error('Erro de conexão:', err));
}

module.exports = fixReferralProgram;