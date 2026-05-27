
const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;
const Document = require('../models/Document.cjs');
const Template = require('../models/Template.cjs');
const Sale = require('../models/Sale.cjs');
const PublicPortalTemplate = require('../models/PublicPortalTemplate.cjs');
const { renderInvoiceWithTemplate } = require('../utils/templateRenderer.cjs');
const { auth } = require('../middleware/auth.cjs');

const router = express.Router();

// Helper to convert image (URL or local path) to base64 data URL
async function getBase64Logo(logoValue) {
  if (!logoValue) return null;

  try {
    let buffer;

    // Case 1: Local file path (e.g. /uploads/logo.png or full path)
    if (logoValue.startsWith('/') || logoValue.startsWith('C:\\') || path.isAbsolute(logoValue)) {
      const fullPath = logoValue.startsWith('/') 
        ? path.join(process.cwd(), logoValue) 
        : logoValue;
      buffer = await fs.readFile(fullPath);
    } 
    // Case 2: Remote URL (http/https)
    else if (logoValue.startsWith('http')) {
      const response = await fetch(logoValue);
      if (!response.ok) throw new Error(`Failed to fetch logo: ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    } 
    // Case 3: Already base64 (rare, but handle)
    else if (logoValue.startsWith('data:image')) {
      return logoValue; // already good
    } else {
      return null;
    }

    const mimeType = buffer[0] === 0xFF && buffer[1] === 0xD8 ? 'image/jpeg'
                   : buffer.toString('utf8', 0, 4).startsWith('PNG') ? 'image/png'
                   : 'image/png'; // fallback

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('Failed to load/convert logo to base64:', err.message);
    return null; // graceful fallback - no logo
  }
}
// Register handlebars helpers
handlebars.registerHelper('formatDate', (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// - Updated version
handlebars.registerHelper('formatCurrency', (amount, currency = 'MZN') => {
  if (amount === null || amount === undefined) return '';
  
  // Map "MT" to the valid ISO code "MZN" if necessary
  const validCurrency = currency === 'MT' ? 'MZN' : currency;

  try {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: validCurrency
    }).format(amount);
  } catch (error) {
    // Fallback if an invalid currency is still passed
    return `${amount} ${currency}`;
  }
});

handlebars.registerHelper('multiply', (a, b) => {
  return (a || 0) * (b || 0);
});

handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('ne', (a, b) => a !== b);

// Generate PDF - VERSÃO CORRIGIDA COM SUPORTE A TEMPLATES PÚBLICOS SEM CONFLITO
router.get('/generate/:documentId', auth, async (req, res) => {
  let browser;
  let page;

  try {
    const id = req.params.documentId;
    const currentCompanyId = req.user.company._id;

    // 1. Buscar Document ou Sale
    let document = await Document.findOne({
      _id: id,
      company: currentCompanyId
    })
      .populate('client')
      .populate('supplier')
      .populate('company')
      .populate('template');

    let entity;
    let isDocument = false;

    if (document) {
      entity = document;
      isDocument = true;
    } else {
      const sale = await Sale.findOne({
        _id: id,
        company: currentCompanyId
      })
        .populate('customer')
        .populate('company');

      if (!sale) {
        return res.status(404).json({ message: 'Document or Sale not found' });
      }

      entity = sale;
      isDocument = false;
    }

    // ==================== 2. OBTER TEMPLATE ====================
    let template;

    if (isDocument && document.template) {
      template = document.template;
    } else {
      // Prioridade 1: Template padrão da empresa
      template = await Template.findOne({
        company: currentCompanyId,
        documentTypes: isDocument ? document.type : 'invoice',
        isDefault: true
      });

      // Prioridade 2: Template público gratuito
      if (!template) {
        template = await Template.findOne({
          isPublic: true,
          isPaid: false,
          documentTypes: isDocument ? document.type : 'invoice'
        }).sort({ createdAt: -1 });
      }

      // Prioridade 3: Built-in da empresa
      if (!template) {
        template = await Template.findOne({
          company: currentCompanyId,
          isBuiltIn: true,
          documentTypes: isDocument ? document.type : 'invoice'
        });
      }

      // Prioridade 4: Qualquer built-in
      if (!template) {
        template = await Template.findOne({
          isBuiltIn: true,
          documentTypes: 'invoice'
        });
      }
    }

    // ==================== 3. Fallback para arquivo ====================
    if (!template || !template.htmlContent) {
      try {
        const templatePath = path.join(__dirname, '../seeds/defaults/invoice-default.html');
        const htmlContent = await fs.readFile(templatePath, 'utf-8');
        template = { htmlContent, cssContent: '' };
        console.log('Usando fallback de arquivo invoice-default.html');
      } catch (fileErr) {
        console.error('Fallback template file not found:', fileErr);
        return res.status(400).json({ message: 'No template found' });
      }
    }

    // ==================== 4. Preparar templateData ====================
    let templateData;

    if (isDocument) {
      templateData = {
        ...document.toJSON(),
        documentType: document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' '),
        company: document.company?.toJSON ? document.company.toJSON() : document.company,
        logo: await getBase64Logo(document.company?.logo),
        currency: document.currency || 'MZN'
      };
    } else {
      const sale = entity;

      const lineItems = (sale.items || []).map(item => ({
        description: item.description || item.name || 'Item sem descrição',
        unitPrice: item.priceAtSale || item.price || 0,
        quantity: item.quantity || item.qty || 1,
        subtotal: (item.priceAtSale || item.price || 0) * (item.quantity || item.qty || 1)
      }));

      templateData = {
        ...sale.toJSON(),
        documentType: 'Fatura',
        type: 'invoice',
        number: sale.invoiceNumber || `FAT-${sale._id.toString().slice(-8)}`,

        client: sale.customer,
        customer: sale.customer,

        company: sale.company?.toJSON ? sale.company.toJSON() : (sale.company || req.user.company),
        logo: await getBase64Logo(sale.company?.logo || req.user.company?.logo),

        lineItems: lineItems,
        createdAt: sale.createdAt || sale.date || new Date(),

        subtotal: sale.subtotal || sale.total || 0,
        total: sale.total || 0,
        taxAmount: sale.tax || 0,
        taxPercent: sale.taxRate || 16,
        discountAmount: sale.discount || 0,
        currency: sale.currency || 'MZN',

        terms: sale.terms || 'Pagamento à vista ou conforme acordo.',
        paymentMethod: sale.paymentMethod || 'Cash'
      };
    }

    // ==================== 5. Compilar e renderizar ====================
    const compiledTemplate = handlebars.compile(template.htmlContent, {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true
    });

    const html = compiledTemplate(templateData);

    const filename = isDocument 
      ? `${document.type}_${document.number.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
      : `Fatura_${(entity.invoiceNumber || entity._id.toString().slice(-6)).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

    // ==================== 6. GERAR PDF COM @sparticuz/chromium ====================
    const chromium = require('@sparticuz/chromium');

    const launchOptions = {
      headless: true,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      ignoreHTTPSErrors: true,
      // Otimizações para Cloud Run / Firebase
      timeout: 30000,
    };

    browser = await puppeteer.launch(launchOptions);

    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.setContent(html, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }

    // Salvar PDF no disco (opcional)
    const pdfDir = path.join(__dirname, '../pdfs');
    await fs.mkdir(pdfDir, { recursive: true });
    const filepath = path.join(pdfDir, filename);
    await fs.writeFile(filepath, pdfBuffer);

    // Atualizar documento
    if (isDocument && document) {
      document.pdfPath = filename;
      document.auditTrail.push({
        action: 'pdf_generated',
        user: req.user._id,
        details: 'PDF generated successfully'
      });
      await document.save();
    }

    // Enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.removeHeader('Content-Encoding');
    res.end(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error generating PDF', 
        detail: error.message 
      });
    }
  } finally {
    // Fechar browser e página
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch (e) {
      console.warn('Error closing browser:', e.message);
    }
  }
});

// Download existing PDF
router.get('/download/:documentId', auth, async (req, res) => {
  try {
    const id = req.params.documentId;
    const currentCompanyId = req.user.company._id;

    // Buscar tanto em Document quanto em Sale
    let pdfPath = null;
    let filename = null;

    // 1. Tentar encontrar como Document
    const document = await Document.findOne({
      _id: id,
      company: currentCompanyId
    });

    if (document && document.pdfPath) {
      pdfPath = document.pdfPath;
      filename = document.pdfPath;
    } 
    // 2. Se não encontrar, tentar como Sale
    else {
      const sale = await Sale.findOne({
        _id: id,
        company: currentCompanyId
      });

      if (sale && sale.pdfPath) {           // caso futuramente adicione pdfPath no Sale
        pdfPath = sale.pdfPath;
        filename = sale.pdfPath;
      }
    }

    if (!pdfPath) {
      return res.status(404).json({ 
        message: 'PDF not found for this document or sale' 
      });
    }

    const filepath = path.join(__dirname, '../pdfs', pdfPath);

    // Verificar se o arquivo realmente existe
    try {
      await fs.access(filepath);
      
      // Headers de segurança e download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', (await fs.stat(filepath)).size);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      
      res.download(filepath, filename);
      
    } catch (fileError) {
      console.error('PDF file not found on disk:', fileError);
      return res.status(404).json({ 
        message: 'PDF file not found on disk. It may have been deleted or not generated yet.' 
      });
    }

  } catch (error) {
    console.error('PDF download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error downloading PDF', 
        detail: error.message 
      });
    }
  }
});

// Preview document as HTML
router.get('/preview/:documentId', auth, async (req, res) => {
  try {
    const base64Logo = await getBase64Logo(document.company?.logo);
    const document = await Document.findOne({
      _id: req.params.documentId,
      company: req.user.company._id
    })
      .populate('client')
      .populate('supplier')
      .populate('company')
      .populate('template');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    let template = document.template;
    
    if (!template) {
      template = await Template.findOne({
        company: req.user.company._id,
        documentTypes: document.type,
        isDefault: true
      });
    }

    if (!template) {
      return res.status(400).json({ message: 'No template found' });
    }

    const templateData = {
      ...document.toObject(),
      documentType: document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' '),
      company: document.company,
      logo: base64Logo,
    };

    const compiledTemplate = handlebars.compile(template.htmlContent);
    const html = compiledTemplate(templateData);

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ message: 'Error generating preview' });
  }
});

module.exports = router;