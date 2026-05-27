const PDFDocument = require('pdfkit');

async function generateSalePDF(sale, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margins: 40, size: 'A4' });
      let pdfData = Buffer.alloc(0);

      doc.on('data', chunk => {
        pdfData = Buffer.concat([pdfData, chunk]);
      });

      doc.on('end', () => {
        resolve(pdfData);
      });

      doc.on('error', (err) => {
        console.error('PDFDocument error:', err);
        reject(err);
      });

      // Header - Skip logo for now (avoid image loading issues)
      doc.fontSize(20).font('Helvetica-Bold').text((company?.name || 'INVOICE').toString(), { align: 'left' });
      doc.fontSize(10).font('Helvetica').text((company?.address || '').toString(), { align: 'left' });
      doc.text((company?.phone || '').toString(), { align: 'left' }).moveDown();

      // Invoice title & metadata
      doc.fontSize(14).font('Helvetica-Bold').text('FATURA', { align: 'center' }).moveDown();
      doc.fontSize(10).font('Helvetica');
      const invoiceNum = (sale._id?.toString?.() || String(sale._id)).slice(-6);
      doc.text(`Fatura #: ${invoiceNum}`, { align: 'left' });
      doc.text(`Data: ${new Date(sale.createdAt).toLocaleDateString('pt-PT')}`, { align: 'left' });
      if (sale.dueDate) {
        doc.text(`Vencimento: ${new Date(sale.dueDate).toLocaleDateString('pt-PT')}`, { align: 'left' });
      }
      doc.moveDown();

      // Customer info
      doc.fontSize(11).font('Helvetica-Bold').text('CLIENTE', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text((sale.customer?.name || 'Consumidor Final').toString());
      if (sale.customer?.email) doc.text(`Email: ${sale.customer.email.toString()}`);
      if (sale.customer?.phone) doc.text(`Telefone: ${sale.customer.phone.toString()}`);
      doc.moveDown();

      // Items table - simplified
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 280;
      const col3 = 340;
      const col4 = 430;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', col1, tableTop);
      doc.text('Qtd', col2, tableTop);
      doc.text('Preço Unit.', col3, tableTop);
      doc.text('Total', col4, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown(0.7);

      doc.font('Helvetica').fontSize(9);
      let yPosition = doc.y;

      // Render line items
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const itemName = (item.name || item.product?.name || 'Item').toString();
          const qty = item.quantity || 0;
          const unitPrice = item.price || 0;
          const itemTotal = qty * unitPrice;

          doc.text(itemName.slice(0, 25), col1, yPosition);
          doc.text(qty.toString(), col2, yPosition);
          doc.text(`${unitPrice.toFixed(2)} MT`, col3, yPosition);
          doc.text(`${itemTotal.toFixed(2)} MT`, col4, yPosition, { align: 'right' });
          
          yPosition = doc.y + 5;
        });
      }

      doc.moveTo(50, yPosition - 5).lineTo(550, yPosition - 5).stroke();
      yPosition = doc.y + 10;

      // Totals
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`SUBTOTAL:`, col3, yPosition);
      const subtotal = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
      doc.text(`${subtotal.toFixed(2)} MT`, col4, yPosition, { align: 'right' });
      yPosition += 25;

      if (sale.discount && sale.discount > 0) {
        doc.text(`DESCONTO:`, col3, yPosition);
        doc.text(`-${sale.discount.toFixed(2)} MT`, col4, yPosition, { align: 'right' });
        yPosition += 25;
      }

      doc.fontSize(12).text(`TOTAL:`, col3, yPosition);
      const total = (sale.total || 0);
      doc.text(`${total.toFixed(2)} MT`, col4, yPosition, { align: 'right' });
      yPosition += 30;

      // Payment info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Valor Pago: ${(sale.amountPaid || 0).toFixed(2)} MT`);
      doc.text(`Em Falta: ${(total - (sale.amountPaid || 0)).toFixed(2)} MT`);
      doc.text(`Status: ${sale.status || 'Pendente'}`);
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).font('Helvetica').text('Obrigado pela compra!', { align: 'center' });
      doc.text('---', { align: 'center' });
      doc.text(new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Outer error:', error);
      reject(error);
    }
  });
}

// Test data
const testSale = {
  _id: '507f1f77bcf86cd799439011',
  customer: {
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+258821234567'
  },
  items: [
    { name: 'Produto A', quantity: 2, price: 100 },
    { name: 'Produto B', quantity: 1, price: 50 }
  ],
  total: 250,
  amountPaid: 100,
  discount: 0,
  status: 'Parcial',
  createdAt: new Date(),
  dueDate: new Date(Date.now() + 7*24*60*60*1000)
};

const testCompany = {
  name: 'Minha Empresa Ltda',
  address: 'Rua Principal, 123',
  phone: '+258212345678'
};

generateSalePDF(testSale, testCompany)
  .then(pdf => {
    console.log('✓ PDF generated successfully:', pdf.length, 'bytes');
  })
  .catch(err => {
    console.error('✗ PDF generation failed:', err.message);
    console.error('Stack:', err.stack);
  });
