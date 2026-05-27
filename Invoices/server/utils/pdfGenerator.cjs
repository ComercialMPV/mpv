// utils/pdfGenerator.cjs
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;

/**
 * Gera PDF para uma venda/fatura usando Playwright (método principal)
 * com fallback automático para um template HTML simples caso o template personalizado falhe.
 *
 * @param {Object} sale - Documento da venda (mongoose model)
 * @param {Object} company - Documento da empresa
 * @param {string} templateHtml - Conteúdo HTML do template (Handlebars)
 * @param {string} [templateCss=''] - Conteúdo CSS associado ao template
 * @returns {Promise<Buffer>} Buffer do PDF gerado (A4)
 */
async function generateSalePDFFromTemplate(sale, company, templateHtml, templateCss = '') {
  // Preparação dos dados para o Handlebars
  const items = (sale.items || []).map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.priceAtSale,
    total: (item.quantity || 0) * (item.priceAtSale || 0)
  }));

  const templateData = {
    sale: sale.toObject ? sale.toObject() : sale,
    company: company.toObject ? company.toObject() : company,
    items,
    total: sale.total || 0,
    amountPaid: sale.amountPaid || 0,
    remaining: (sale.total || 0) - (sale.amountPaid || 0),
    saleDate: new Date(sale.createdAt).toLocaleDateString('pt-PT'),
    dueDate: sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('pt-PT') : 'N/A',
    invoiceNumber: (sale._id?.toString() || sale._id).slice(-6),
    status: sale.status || 'Pendente',
    customerName: sale.customer?.name || 'Consumidor Final',
    customerPhone: sale.customer?.phone || '',
    customerEmail: sale.customer?.email || ''
  };

  let pdfBuffer = null;

  // Tentativa 1: Gerar com o template personalizado
  try {
    const compiled = handlebars.compile(templateHtml);
    const renderedHtml = compiled(templateData);

    // HTML completo com CSS inline
    const fullHtml = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Fatura ${templateData.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 10mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: white;
      color: #000;
    }
    #pdf-content {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 0;
    }
    ${templateCss}
  </style>
</head>
<body>
  <div id="pdf-content">
    ${renderedHtml}
  </div>
</body>
</html>`;

    pdfBuffer = await generatePdfWithPlaywright(fullHtml);

    if (pdfBuffer && pdfBuffer.length > 1000) {
      return pdfBuffer; // Sucesso → retorna logo
    }
  } catch (err) {
    console.error('[pdfGenerator] Erro ao renderizar template personalizado:', {
      error: err.message,
      stack: err.stack?.slice(0, 300)
    });
  }

  // Tentativa 2: Fallback para template simples
  console.warn('[pdfGenerator] Usando fallback HTML simples para fatura', templateData.invoiceNumber);

  const fallbackHtmlContent = generateFallbackHTML(templateData);

  const fallbackFullHtml = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Fatura ${templateData.invoiceNumber} - Fallback</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: #000;
    }
    .container {
      width: 190mm;
      margin: 0 auto;
      padding: 10mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    th {
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="container">
    ${fallbackHtmlContent}
  </div>
</body>
</html>`;

  try {
    pdfBuffer = await generatePdfWithPlaywright(fallbackFullHtml);
    return pdfBuffer;
  } catch (fallbackErr) {
    console.error('[pdfGenerator] FALHA TOTAL no fallback:', fallbackErr.message);
    throw new Error('Não foi possível gerar o PDF (nem template nem fallback funcionaram)');
  }
}

/**
 * Função auxiliar: Gera PDF real usando Playwright
 * @param {string} html - HTML completo
 * @returns {Promise<Buffer>}
 */
async function generatePdfWithPlaywright(html) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none' // ajuda em alguns servidores
      ]
    });

    const page = await browser.newPage();

    await page.setViewportSize({ width: 794, height: 1123 }); // A4 @ ~96dpi

    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: 45000
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
      preferCSSPageSize: true,
      scale: 1.0
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Gera HTML simples de fallback (sem Handlebars, puro HTML + inline styles)
 * @param {Object} data - Dados da venda/empresa
 * @returns {string}
 */
function generateFallbackHTML(data) {
  const itemsHtml = (data.items || []).map(item => `
    <tr>
      <td>${item.name || 'Item'}</td>
      <td style="text-align: center;">${item.quantity || 1}</td>
      <td style="text-align: right;">${(item.price || 0).toFixed(2)} MT</td>
      <td style="text-align: right;">${(item.total || 0).toFixed(2)} MT</td>
    </tr>
  `).join('');

  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1>FATURA</h1>
    </div>

    <div style="margin-bottom: 30px;">
      <h2>${data.company.name || 'Empresa'}</h2>
      <p>${data.company.address || ''}</p>
      <p>${data.company.phone || ''}</p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <h3>CLIENTE</h3>
        <p><strong>${data.customerName}</strong></p>
        <p>${data.customerPhone}</p>
        <p>${data.customerEmail}</p>
      </div>
      <div style="text-align: right;">
        <p><strong>Fatura Nº:</strong> ${data.invoiceNumber}</p>
        <p><strong>Data:</strong> ${data.saleDate}</p>
        <p><strong>Vencimento:</strong> ${data.dueDate}</p>
      </div>
    </div>

    <table style="width: 100%; margin-bottom: 30px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 10px; text-align: left;">Descrição</th>
          <th style="padding: 10px; text-align: center;">Qtd</th>
          <th style="padding: 10px; text-align: right;">Preço Unit.</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="text-align: right; margin-bottom: 30px;">
      <p><strong>Subtotal:</strong> ${data.total?.toFixed(2) || '0.00'} MT</p>
      <p style="font-size: 18px; font-weight: bold;">Total: ${data.total?.toFixed(2) || '0.00'} MT</p>
      <p><strong>Pago:</strong> ${data.amountPaid?.toFixed(2) || '0.00'} MT</p>
      <p><strong>Em Falta:</strong> ${data.remaining?.toFixed(2) || '0.00'} MT</p>
      <p><strong>Status:</strong> ${data.status}</p>
    </div>

    <div style="text-align: center; margin-top: 50px; color: #666; font-size: 12px;">
      <p>Obrigado pela sua compra!</p>
      <p>Gerado em ${new Date().toLocaleDateString('pt-PT')}</p>
    </div>
  `;
}

module.exports = {
  generateSalePDFFromTemplate,
  generateFallbackHTML // opcional, se quiseres usar em outro lugar
};