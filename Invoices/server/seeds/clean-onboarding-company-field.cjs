// seeds/clean-onboarding-company-field.js
const mongoose = require('mongoose');
const OnboardingContent = require('../models/OnboardingContent.cjs'); // ajusta o caminho

const cleanOnboardingCompanyField = async () => {
  try {
    console.log('🔄 Iniciando limpeza do campo "company" em OnboardingContent...');

    const result = await OnboardingContent.updateMany(
      {}, 
      { $unset: { company: 1 } }   // remove o campo company de TODOS os documentos
    );

    console.log('✅ Limpeza concluída com sucesso!');
    console.log(`   Documentos afetados: ${result.modifiedCount}`);
    console.log(`   Documentos encontrados: ${result.matchedCount}`);

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB fechada.');
  }
};

// ====================== EXECUÇÃO ======================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/seu_banco', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('🟢 Conectado ao MongoDB');
  cleanOnboardingCompanyField();
})
.catch(err => {
  console.error('Erro de conexão:', err);
});