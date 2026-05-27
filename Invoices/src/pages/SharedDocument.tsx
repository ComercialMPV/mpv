import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Calendar, DollarSign, Building2 } from 'lucide-react';
import { shareApi, pdfApi, Document } from '../services/api';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const SharedDocument: React.FC = () => {
  const { token } = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedDocument();
    }
  }, [token]);

  const loadSharedDocument = async () => {
    try {
      const doc = await shareApi.getDocument(token!);
      setDocument(doc);
    } catch (error: any) {
      console.error('Error loading shared document:', error);
      setError(error.message || 'Document not found or expired');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    
    try {
      // use preview/share endpoint to get HTML then generate PDF
      const tokenParam = token;
      if (!tokenParam) throw new Error('Missing share token');

      const previewUrl = pdfApi.sharePreview(tokenParam);
      const response = await fetch(previewUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch shared preview: ${response.status}`);
      }
      const htmlContent = await response.text();
      if (!htmlContent) throw new Error('Empty shared document HTML');

      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '-10000px';
      container.style.width = '210mm';
      container.style.height = '297mm';
      document.body.appendChild(container);

      const filename = `shared_doc_${tokenParam.slice(-6)}_${Date.now()}.pdf`;
      await html2pdf().set({
        margin: 5,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(container).save();

      document.body.removeChild(container);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      invoice: 'Invoice',
      quotation: 'Quotation',
      worksheet: 'Worksheet',
      purchase_order: 'Purchase Order',
    };
    return typeLabels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Document Not Found</h2>
          <p className="mt-1 text-sm text-gray-500">
            {error || 'The document you\'re looking for doesn\'t exist or has expired.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Shared Document</span>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Document Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900">{document.number}</h1>
                  {getStatusBadge(document.status)}
                </div>
                <p className="text-gray-600 mt-1">
                  {getDocumentTypeLabel(document.type)} • Issued {format(new Date(document.issueDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">${document.total.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{document.currency}</p>
              </div>
            </div>

            {/* Company Info */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center mb-2">
                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">From: {document.company.name}</h3>
              </div>
              <div className="text-sm text-gray-600">
                <p>{document.company.email}</p>
                {document.company.phone && <p>{document.company.phone}</p>}
                {document.company.address && (
                  <p>
                    {[
                      document.company.address.street,
                      document.company.address.city,
                      document.company.address.state,
                      document.company.address.zipCode
                    ].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{getDocumentTypeLabel(document.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Issue Date</p>
                      <p className="font-medium">{format(new Date(document.issueDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  {document.dueDate && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Due Date</p>
                        <p className="font-medium">{format(new Date(document.dueDate), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  )}
                  {document.validUntil && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Valid Until</p>
                        <p className="font-medium">{format(new Date(document.validUntil), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Payment Terms</p>
                      <p className="font-medium">{document.paymentTerms}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tax %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {document.lineItems.map((item, index) => {
                        const lineTotal = item.quantity * item.unitPrice;
                        const lineDiscount = (lineTotal * item.discount) / 100;
                        const lineSubtotal = lineTotal - lineDiscount;
                        const lineTax = (lineSubtotal * item.taxRate) / 100;
                        const finalAmount = lineSubtotal + lineTax;

                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.taxRate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              ${finalAmount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${document.subtotal.toFixed(2)}</span>
                    </div>
                    {document.discountAmount > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-${document.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">${document.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-200 pt-2">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-gray-900">${document.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              {(document.notes || document.terms) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {document.notes && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                      <p className="text-gray-600 whitespace-pre-wrap">{document.notes}</p>
                    </div>
                  )}
                  {document.terms && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
                      <p className="text-gray-600 whitespace-pre-wrap">{document.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Client/Supplier Info */}
              {(document.client || document.supplier) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {document.type === 'purchase_order' ? 'Supplier' : 'Client'}
                  </h2>
                  
                  {document.client && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-900">{document.client.name}</p>
                        <p className="text-sm text-gray-600">{document.client.email}</p>
                        {document.client.phone && (
                          <p className="text-sm text-gray-600">{document.client.phone}</p>
                        )}
                      </div>
                      {document.client.billingAddress && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Billing Address</p>
                          <div className="text-sm text-gray-600">
                            {document.client.billingAddress.street && <p>{document.client.billingAddress.street}</p>}
                            <p>
                              {[
                                document.client.billingAddress.city,
                                document.client.billingAddress.state,
                                document.client.billingAddress.zipCode
                              ].filter(Boolean).join(', ')}
                            </p>
                            {document.client.billingAddress.country && <p>{document.client.billingAddress.country}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {document.supplier && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-900">{document.supplier.name}</p>
                        <p className="text-sm text-gray-600">{document.supplier.email}</p>
                        {document.supplier.phone && (
                          <p className="text-sm text-gray-600">{document.supplier.phone}</p>
                        )}
                      </div>
                      {document.supplier.address && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Address</p>
                          <div className="text-sm text-gray-600">
                            {document.supplier.address.street && <p>{document.supplier.address.street}</p>}
                            <p>
                              {[
                                document.supplier.address.city,
                                document.supplier.address.state,
                                document.supplier.address.zipCode
                              ].filter(Boolean).join(', ')}
                            </p>
                            {document.supplier.address.country && <p>{document.supplier.address.country}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};