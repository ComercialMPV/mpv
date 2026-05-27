// seeds/publicPortalTemplates.seed.cjs
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // safer path

const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');

// ────────────────────────────────────────────────
// Load large template from external file (strongly recommended)
async function loadDefaultHtml() {
  try {
    const templatePath = path.join(__dirname, 'defaults/public-portal-default.html');
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    console.error('Failed to load default HTML template:', err);
    process.exit(1);
  }
}

// Load invoice template from external file
async function loadInvoiceHtml() {
  try {
    const templatePath = path.join(__dirname, 'defaults/invoice-default.html');
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    console.error('Failed to load invoice HTML template:', err);
    process.exit(1);
  }
}

// You can also load cssContent from file if it grows
const DEFAULT_TEMPLATE = {
  name: 'Default Public Requisition Portal',
  description: 'Modern dark-sidebar layout matching the original React component',
  htmlContent: '', // will be filled asynchronously
  cssContent: `
    /* Custom overrides / additional styles */
    .rounded-custom { border-radius: 2rem; }
    input, select, textarea {
      transition: all 0.2s ease;
    }
    /* ... more default styles if needed ... */
  `,
  logoOverride: null,
  primaryColor: '#3b82f6',
  accentColor: '#1e40af',
  checkoutBackground: '#0f172a',     // slate-900
  checkoutTextColor: '#f8fafc',
  isDefault: true,
  isBuiltIn: true,
  // company: null,           // left out → null by default
  // createdBy: null,
};

const INVOICE_TEMPLATE = {
  name: 'Default Invoice Template',
  description: 'Professional invoice layout with company branding and payment details',
  htmlContent: '', // will be filled asynchronously
  cssContent: `
    /* Invoice specific styles */
    body { line-height: 1.6; }
  `,
  logoOverride: null,
  primaryColor: '#3b82f6',
  accentColor: '#1e40af',
  checkoutBackground: '#0f172a',
  checkoutTextColor: '#f8fafc',
  isDefault: false,
  isBuiltIn: true,
  // company: null,
  // createdBy: null,
};

async function seed() {
  let connection;

  try {
    // Connect (reuse existing if already connected)
    if (mongoose.connection.readyState === 0) {
      connection = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('Connected to MongoDB');
    } else {
      console.log('Using existing MongoDB connection');
    }

    // Load the large HTML content for both templates
    DEFAULT_TEMPLATE.htmlContent = await loadDefaultHtml();
    INVOICE_TEMPLATE.htmlContent = await loadInvoiceHtml();

    // Seed Requisition Portal Template
    const existingRequisition = await PublicPortalTemplate.findOne({
      name: DEFAULT_TEMPLATE.name,
      isBuiltIn: true,
    }).lean();

    if (!existingRequisition) {
      const template = new PublicPortalTemplate(DEFAULT_TEMPLATE);
      await template.save();
      console.log(`✓ Seeded built-in template: ${template.name} (${template._id})`);
    } else {
      console.log(`✓ Built-in Requisition template already exists → skipping`);
    }

    // Seed Invoice Template
    const existingInvoice = await PublicPortalTemplate.findOne({
      name: INVOICE_TEMPLATE.name,
      isBuiltIn: true,
    }).lean();

    if (!existingInvoice) {
      const invoiceTemplate = new PublicPortalTemplate(INVOICE_TEMPLATE);
      await invoiceTemplate.save();
      console.log(`✓ Seeded built-in invoice template: ${invoiceTemplate.name} (${invoiceTemplate._id})`);
    } else {
      console.log(`✓ Built-in Invoice template already exists → skipping`);
    }

  } catch (error) {
    console.error('Seeding failed:', error.message);
    if (error.stack) console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    process.exitCode = 1;
  } finally {
    // Only disconnect if we created the connection
    if (connection) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the seed
seed();