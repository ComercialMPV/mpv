const express = require('express');
const Document = require('../models/Document.cjs');

const router = express.Router();

// Get shared document by token
router.get('/:token', async (req, res) => {
  try {
    const document = await Document.findOne({
      shareToken: req.params.token,
      shareExpiresAt: { $gt: new Date() }
    })
      .populate('client')
      .populate('supplier')
      .populate('company')
      .populate('template');

    if (!document) {
      return res.status(404).json({ message: 'Document not found or expired' });
    }

    // Remove sensitive information
    const publicDocument = {
      _id: document._id,
      type: document.type,
      number: document.number,
      client: document.client,
      supplier: document.supplier,
      company: {
        name: document.company.name,
        email: document.company.email,
        phone: document.company.phone,
        address: document.company.address,
        logo: document.company.logo
      },
      status: document.status,
      issueDate: document.issueDate,
      dueDate: document.dueDate,
      validUntil: document.validUntil,
      currency: document.currency,
      paymentTerms: document.paymentTerms,
      lineItems: document.lineItems,
      subtotal: document.subtotal,
      taxAmount: document.taxAmount,
      discountAmount: document.discountAmount,
      total: document.total,
      notes: document.notes,
      terms: document.terms,
      template: document.template
    };

    res.json(publicDocument);
  } catch (error) {
    console.error('Get shared document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;