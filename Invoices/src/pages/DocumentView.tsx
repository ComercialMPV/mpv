import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Share2, 
  Eye,
  Calendar,
  DollarSign,
  FileText,
  User,
  Building2,
  Clock,
  X,
  Send
} from 'lucide-react';
import { documentsApi, pdfApi, Document, API_BASE_URL } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const DocumentView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  // share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareCc, setShareCc] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    try {
      const doc = await documentsApi.getById(id!);
      setDocument(doc);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  // updated download logic: fetch PDF blob from server
 const handleDownload = async (docId: string) => {
  if (downloadingIds.has(docId)) {
    console.log('Download already in progress for', docId);
    return;
  }

  try {
    setDownloadingIds(prev => new Set([...prev, docId]));
    
    // ATUALIZAÇÃO: Usamos generateAndDownload para garantir que o PDF 
    // é gerado pelo Puppeteer caso ainda não exista no disco [cite: 8, 22]
    const { blob, filename: serverFilename } = await pdfApi.generateAndDownload(docId);
    
    const blobUrl = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = blobUrl;
    
    // Utiliza o nome retornado pelo servidor ou gera um fallback estruturado
    const fallbackName = document?.number
      ? `Documento_${document.number.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `document_${docId.slice(-6)}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    link.download = serverFilename || fallbackName;
    
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    
    // Pequeno delay para garantir que o download inicie antes de revogar a URL 
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    toast.success('PDF descarregado com sucesso');
  } catch (error: any) {
    console.error('Erro ao descarregar PDF:', error);
    
    // Tratamento de erros alinhado com as respostas do backend [cite: 35, 39]
    const msg = error.message?.includes('404')
      ? 'PDF não encontrado ou não gerado.'
      : error.message?.includes('401')
        ? 'Sessão expirada – faça login novamente.'
        : 'Erro ao descarregar ou gerar o PDF.';
    
    toast.error(msg);
  } finally {
    setDownloadingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(docId);
      return newSet;
    });
  }
};

  // NEW: Preview handler (opens HTML preview in new tab)
  const handlePreview = () => {
    if (!document) return;
    
    try {
      const previewUrl = pdfApi.preview(document._id);
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      toast.success('Preview opened in new tab');
    } catch (error) {
      console.error('Error opening preview:', error);
      toast.error('Failed to open preview');
    }
  };

  const handleShare = () => {
    if (!document) return;
    // open modal to confirm email/cc
    setShareEmail((document.client as any)?.email || (document.supplier as any)?.email || '');
    setShareCc('');
    setIsShareModalOpen(true);
  };

  const handleConfirmShare = async () => {
    if (!document) return;
    try {
      setShareLoading(true);
      const res = await documentsApi.share(document._id, { to: shareEmail, cc: shareCc });
      if (res.shareUrl) {
        await navigator.clipboard.writeText(res.shareUrl);
      }
      toast.success('Link generated' + (shareEmail ? ' and email sent' : ''));
      setIsShareModalOpen(false);
    } catch (error: any) {
      console.error('Error sharing document:', error);
      toast.error(error.message || 'Failed to share document');
    } finally {
      setShareLoading(false);
    }
  };

const handleStatusUpdate = async (newStatus: string) => {
  if (!document) return;

  // Caso normal: atualizar status (exceto quando vai para 'paid')
  if (newStatus !== 'paid') {
    try {
      await documentsApi.updateStatus(document._id, newStatus);
      setDocument({ ...document, status: newStatus });
      toast.success('Estado atualizado com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao atualizar o estado');
    }
    return;
  }

  // ────────────────────────────────────────────────────────────────
  // Fluxo especial: Marcar como PAGO → Converter em Venda
  // ────────────────────────────────────────────────────────────────
  const wantsToProceed = window.confirm(
    'Ao marcar como PAGO este documento será convertido numa venda.\n\n' +
    'Deseja continuar?'
  );

  if (!wantsToProceed) return;

  try {
    toast.loading('A converter documento em venda...', { id: 'convert-toast' });

    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');

    // Determinar a origin correta para herdar
    const originToSend = document.origin || 
                        (document.requisition?.origin) || 
                        'internal';

    const response = await fetch(`${API_BASE_URL}/documents/${document._id}/convert-to-sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        origin: originToSend   // ← Agora envia a origin real!
      }),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.dismiss('convert-toast');

      if (response.status === 409) {
        toast.info('Este documento já foi convertido em venda anteriormente.', { duration: 4000 });
      } else if (response.status === 400 && responseData.message?.includes('Apenas invoices')) {
        toast.error('Este documento não é uma fatura (invoice). Apenas invoices podem ser convertidas em venda.');
      } else {
        throw new Error(responseData.message || 'Erro ao converter documento');
      }
      return;
    }

    // Sucesso na conversão
    await documentsApi.updateStatus(document._id, 'paid');

    setDocument(prev => prev ? { ...prev, status: 'paid' } : null);

    toast.dismiss('convert-toast');
    toast.success('Documento convertido em venda e marcado como PAGO com sucesso!');

    loadDocument(); // recarrega para atualizar audit trail

  } catch (error: any) {
    toast.dismiss('convert-toast');
    console.error('Erro durante conversão para venda:', error);
    toast.error(error.message || 'Ocorreu um erro ao converter o documento em venda.');
  }
};

const handleConvert = async (target: 'to-invoice') => {
  if (!confirm(`Converter ${document.type} em ${target === 'to-invoice' ? 'Fatura' : '...'}?`)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/documents/${document._id}/convert-to-invoice`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
    });
    if (!res.ok) throw new Error(await res.text());

    const { newInvoice } = await res.json();
    toast.success(`Documento convertido! Nova fatura: ${newInvoice.number}`);
    navigate(`/documents/${newInvoice._id}`);
  } catch (err) {
    toast.error('Erro na conversão');
  }
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

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Document not found</h3>
          <Link
            to="/documents"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/documents')}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {document.type.replace('_', ' ').toUpperCase()} #{document.number}
              </h1>
              <p className="text-gray-600">
                {format(new Date(document.issueDate), 'MMMM dd, yyyy')} • {getStatusBadge(document.status)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {/* FIXED: Preview button (wires up handlePreview) */}
            <button
              onClick={handlePreview}
              className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </button>
            {/* FIXED: Download button with loading state (matches Documents.tsx logic) */}
            <button
              onClick={() => handleDownload(document._id)}
              disabled={downloadingIds.has(document._id)}
              className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingIds.has(document._id) ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
            <Link
              to={`/documents/${id}/edit`}
              className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </div>
        </div>

        {/* share modal */}
        {isShareModalOpen && document && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Partilhar Documento</h2>
                  <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase px-1">Destinatário</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)}
                      disabled={shareLoading}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase px-1">CC (opcional)</label>
                    <input
                      type="text"
                      value={shareCc}
                      onChange={e => setShareCc(e.target.value)}
                      disabled={shareLoading}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="email2@exemplo.com"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConfirmShare}
                  disabled={shareLoading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  {shareLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Enviar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{document.type.replace('_', ' ').toUpperCase()}</h2>
                  <p className="text-gray-600">Document #{document.number}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <p className="text-3xl font-bold text-gray-900">{document.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{document.currency}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Issue Date</p>
                  <p className="text-sm text-gray-900">{format(new Date(document.issueDate), 'MMMM dd, yyyy')}</p>
                </div>
                {document.dueDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Due Date</p>
                    <p className="text-sm text-gray-900">{format(new Date(document.dueDate), 'MMMM dd, yyyy')}</p>
                  </div>
                )}
                {document.validUntil && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Valid Until</p>
                    <p className="text-sm text-gray-900">{format(new Date(document.validUntil), 'MMMM dd, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Line Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{document.currency}{item.unitPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.taxRate}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.discount}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {document.currency} {finalAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Subtotal:
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {document.currency} {document.subtotal.toFixed(2)}
                      </td>
                    </tr>
                    {document.discountAmount > 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-500">
                          Discount:
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          -{document.currency} {document.discountAmount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {document.currency}Tax:
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {document.currency} {document.taxAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td colSpan={5} className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                        {document.currency}Total:
                      </td>
                      <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                        {document.currency} {document.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes & Terms */}
            {(document.notes || document.terms) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {document.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{document.notes}</p>
                  </div>
                )}
                {document.terms && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{document.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              { document.type === 'quotation' && document.status === 'approved' && (
                  <button
                    onClick={() => handleConvert('to-invoice')}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Converter em Fatura
                  </button>
                )}

                { document.type === 'invoice' && document.status !== 'paid' && (
                  <button onClick={() => handleStatusUpdate('paid')}>
                    Marcar como Pago (gera venda)
                  </button>
                )}
             <select
                value={document.status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={document.status === 'paid'} // opcional: bloquear depois de pago
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
                {document.type !== 'purchase_order' && (
                  <>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </>
                )}
              </select>
            </div>

            {/* Client/Supplier Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {document.type === 'purchase_order' ? 'Supplier' : 'Client'} Information
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Name</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(document.type === 'purchase_order' ? document.supplier : document.client)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
                  <p className="text-sm text-gray-600">
                    {(document.type === 'purchase_order' ? document.supplier : document.client)?.email}
                  </p>
                </div>
                {document.type === 'purchase_order' ? (
                  document.supplier && (
                    <>
                      {document.supplier.phone && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Phone</p>
                          <p className="text-sm text-gray-600">{document.supplier.phone}</p>
                        </div>
                      )}
                      {document.supplier.address && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Address</p>
                          <div className="text-sm text-gray-600 space-y-1">
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
                    </>
                  )
                ) : (
                  document.client && (
                    <>
                      {document.client.phone && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Phone</p>
                          <p className="text-sm text-gray-600">{document.client.phone}</p>
                        </div>
                      )}
                      {document.client.billingAddress && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Billing Address</p>
                          <div className="text-sm text-gray-600 space-y-1">
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
                    </>
                  )
                )}
              </div>
            </div>

            {/* Created By */}
            {document.createdBy && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Created By</h3>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {document.createdBy.firstName} {document.createdBy.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{document.createdBy.email}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {format(new Date(document.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            )}

            {/* Audit Trail */}
            {document.auditTrail && document.auditTrail.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
                <div className="space-y-4">
                  {document.auditTrail.slice(-5).reverse().map((entry, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-400 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System'}
                          </span>{' '}
                          {entry.action.replace('_', ' ')}
                        </p>
                        {entry.details && (
                          <p className="text-sm text-gray-500">{entry.details}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};