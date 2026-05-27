// migrate-roles.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User.cjs');
const RolePermission = require('./models/RolePermission.cjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-app';

async function migrateRoles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado ao MongoDB');

const users = await User.find({ role: { $type: 'string' } });
console.log(`Encontrados ${users.length} usuários para migrar...`);

for (const user of users) {
  const roleName = user.role;
  
  // Ignora se for nulo ou vazio
  if (!roleName) continue;

  // Busca usando Regex para ignorar diferença entre maiúsculas/minúsculas
  // 'i' flag significa case-insensitive
  const roleDoc = await RolePermission.findOne({ 
    roleName: new RegExp(`^${roleName}$`, 'i') 
  });

  if (roleDoc) {
    user.role = roleDoc._id;
    await user.save();
    console.log(`Migrado: ${user.email} (${roleName} → ${roleDoc._id})`);
  } else {
    console.warn(`Role "${roleName}" não encontrado na base para ${user.email}.`);
  }
}

    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    mongoose.connection.close();
  }
}

migrateRoles();