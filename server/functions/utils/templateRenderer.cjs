// utils/templateRenderer.cjs
const Handlebars = require('handlebars');

// Register custom helpers
Handlebars.registerHelper('json', (data) => {
  return JSON.stringify(data);
});

Handlebars.registerHelper('currency', (value) => {
  return Number(value || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
});

Handlebars.registerHelper('date', (date, format) => {
  if (!date) return '';
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('pt-MZ');
  }
  return d.toLocaleDateString('pt-MZ', { year: 'numeric', month: 'long', day: 'numeric' });
});

Handlebars.registerHelper('if_equal', function(a, b, opts) {
  return a === b ? opts.fn(this) : opts.inverse(this);
});

Handlebars.registerHelper('multiply', (a, b) => {
  return (a || 0) * (b || 0);
});

/**
 * Render a template string with data using Handlebars
 * @param {string} templateString - The template HTML/text with {{placeholders}}
 * @param {object} data - Data object to interpolate
 * @returns {string} Rendered output
 */
function renderTemplate(templateString, data) {
  try {
    const template = Handlebars.compile(templateString);
    return template(data);
  } catch (err) {
    console.error('Template render error:', err.message);
    throw err;
  }
}

/**
 * Render an invoice HTML from sale data and template
 * @param {object} sale - Sale document
 * @param {object} company - Company document
 * @param {string} templateHtml - Template HTML string
 * @returns {string} Rendered invoice HTML
 */
function renderInvoice(sale, company, templateHtml) {
  const data = {
    company: {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      logo: company.logo,
      taxId: company.taxId,
    },
    sale: {
      _id: sale._id.toString(),
      shortId: sale._id.toString().slice(-6),
      total: sale.total || 0,
      amountPaid: sale.amountPaid || 0,
      remaining: (sale.total || 0) - (sale.amountPaid || 0),
      status: sale.status,
      customer: sale.customer || { name: 'Consumidor Final' },
      items: (sale.items || []).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.priceAtSale,
        total: item.quantity * item.priceAtSale,
      })),
      paymentMethod: sale.paymentMethod,
      dueDate: sale.dueDate,
      createdAt: sale.createdAt,
      discount: sale.discount || 0,
    },
  };

  return renderTemplate(templateHtml, data);
}

/**
 * Render invoice HTML from sale, company, and a full template
 * Includes all styling and branding
 */
function renderInvoiceWithTemplate(sale, company, template) {
  // If template has colors, add CSS variables
  let htmlWithStyles = template.htmlContent || template;
  
  if (template.primaryColor || template.accentColor) {
    const styleTag = `
      <style>
        :root {
          --primary: ${template.primaryColor || '#3b82f6'};
          --accent: ${template.accentColor || '#1e40af'};
          --checkout-bg: ${template.checkoutBackground || '#0f172a'};
          --checkout-text: ${template.checkoutTextColor || '#f8fafc'};
        }
        ${template.cssContent || ''}
      </style>
    `;
    htmlWithStyles = htmlWithStyles.replace('</head>', `${styleTag}</head>`);
  }

  return renderTemplate(htmlWithStyles, {
    company: {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      logo: company.logo,
      taxId: company.taxId,
    },
    sale: {
      _id: sale._id.toString(),
      shortId: sale._id.toString().slice(-6),
      total: sale.total || 0,
      amountPaid: sale.amountPaid || 0,
      remaining: (sale.total || 0) - (sale.amountPaid || 0),
      status: sale.status,
      customer: sale.customer || { name: 'Consumidor Final' },
      items: (sale.items || []).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.priceAtSale,
        total: item.quantity * item.priceAtSale,
      })),
      paymentMethod: sale.paymentMethod,
      dueDate: sale.dueDate,
      createdAt: sale.createdAt,
      discount: sale.discount || 0,
    },
    logoOverride: template.logoOverride,
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    checkoutBackground: template.checkoutBackground,
    checkoutTextColor: template.checkoutTextColor,
    cssContent: template.cssContent,
  });
}

module.exports = {
  renderTemplate,
  renderInvoice,
  renderInvoiceWithTemplate,
};
