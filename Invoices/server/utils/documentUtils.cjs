// utils/documentUtils.cjs
const Company = require('../models/Company.cjs');

async function generateDocumentNumber(type, company) {
  let prefix = '';
  let nextNumberField = '';

  switch (type) {
    case 'invoice':
      prefix = company.invoiceNumberPrefix || 'INV-';
      nextNumberField = 'nextInvoiceNumber';
      break;
    case 'quotation':
      prefix = company.quotationNumberPrefix || 'QUO-';
      nextNumberField = 'nextQuotationNumber';
      break;
    case 'worksheet':
      prefix = company.worksheetNumberPrefix || 'WS-';
      nextNumberField = 'nextWorksheetNumber';
      break;
    case 'purchase_order':
      prefix = company.purchaseOrderNumberPrefix || 'PO-';
      nextNumberField = 'nextPurchaseOrderNumber';
      break;
    default:
      throw new Error(`Tipo de documento não suportado: ${type}`);
  }

  let nextNumber = company[nextNumberField] ?? 1;

  if (typeof nextNumber !== 'number' || isNaN(nextNumber) || nextNumber < 1) {
    nextNumber = 1;
    await Company.updateOne(
      { _id: company._id },
      { $set: { [nextNumberField]: 1 } }
    );
  }

  const number = `${prefix}${nextNumber}`;

  // Incrementa atomicamente
  await Company.updateOne(
    { _id: company._id },
    { $inc: { [nextNumberField]: 1 } }
  );

  return number;
}

module.exports = { generateDocumentNumber };