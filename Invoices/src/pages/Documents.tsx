import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  FileText,
  Edit, 
  Trash2, 
  Download,
  Share2,
  MoreVertical
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { documentsApi, pdfApi, Document } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [downloadingIds, setDownloadingIds] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
  });

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const response = await documentsApi.getAll(params);
      setDocuments(response.documents);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentsApi.delete(id);
      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

// updated download logic: request PDF blob from server rather than client-side conversion
const handleDownload = async (id: string, type: 'document' | 'sale' = 'document') => {
  if (!id) {
    toast.error('ID inválido');
    return;
  }

  if (downloadingIds.has(id)) {
    toast.success('Download já em andamento...');
    return;
  }

  const loadingToastId = `download-loading-${id}`;

  try {
    setDownloadingIds(prev => new Set([...prev, id]));
    toast.loading('A gerar PDF...', { id: loadingToastId });

    // ATUALIZAÇÃO: Como o backend agora unifica a lógica de geração 
    // na rota /pdf/generate/:id, chamamos o método unificado.
    const { blob, filename: serverFilename } = await pdfApi.generateAndDownload(id);

    // Validação reforçada do blob
    if (!blob || !(blob instanceof Blob) || blob.size < 1500) {
      throw new Error('PDF recebido está vazio, corrompido ou incompleto');
    }

    // Criar URL temporário
    const url = URL.createObjectURL(blob);

    // Nome do ficheiro: prioriza o que veio do backend, fallback estruturado
    const today = new Date().toISOString().split('T')[0];
    const shortId = id.slice(-6).toUpperCase();
    const prefix = type === 'sale' ? 'Fatura' : 'Documento';

    const finalFilename = serverFilename || `${prefix}_${shortId}_${today}.pdf`;

    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);

    toast.dismiss(loadingToastId);
    toast.success(`${prefix} descarregada com sucesso!`, {
      duration: 5000,
      position: 'top-right',
    });

  } catch (error: any) {
    console.error(`Erro ao descarregar ${type} ${id}:`, error);

    // Tratamento de erros mantém a robustez anterior
    let userMessage = 'Não foi possível descarregar o PDF. Tente novamente.';
    if (error.response?.status === 404) userMessage = 'Documento/venda não encontrado.';
    else if (error.message?.includes('timeout')) userMessage = 'O servidor demorou muito a responder.';
    else if (error.message?.includes('vazio')) userMessage = 'O PDF está incompleto ou corrompido.';

    toast.dismiss(loadingToastId);
    toast.error(userMessage, { duration: 7000, position: 'top-right' });

  } finally {
    setDownloadingIds(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  }
};

  const handleShare = async (id: string) => {
    try {
      const response = await documentsApi.generateShare(id);
      await navigator.clipboard.writeText(response.shareUrl);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error('Failed to generate share link');
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

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
  {/* Título e Subtítulo */}
  <div className="space-y-1">
    <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
      Documentos
    </h1>
    <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-md">
      Gerencie as suas faturas, cotações, folhas de trabalho e ordens de compra.
    </p>
  </div>

  {/* Botão de Ação: Estilo Link adaptado para mobile */}
  <Link
    to="/documents/new"
    className="w-full md:w-auto flex items-center justify-center px-6 py-3.5 md:py-2.5 bg-blue-600 text-white rounded-2xl md:rounded-xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-900/10"
  >
    <Plus className="h-5 w-5 mr-2 shrink-0" />
    Novo Documento
  </Link>
</div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-5 w-5 mr-2 text-gray-500" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="invoice">Invoice</option>
                <option value="quotation">Quotation</option>
                <option value="worksheet">Worksheet</option>
                <option value="purchase_order">Purchase Order</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client/Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((document) => (
                    <tr key={document._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {document.number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getDocumentTypeLabel(document.type)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {document.client?.name || document.supplier?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {document.client?.email || document.supplier?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        MT{document.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(document.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(document.issueDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-5 w-5" />
                          </Menu.Button>
                          <Transition
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <Link
                                      to={`/documents/${document._id}`}
                                      className={`flex items-center px-4 py-2 text-sm ${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      }`}
                                    >
                                      <Eye className="mr-3 h-4 w-4" />
                                      View
                                    </Link>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <Link
                                      to={`/documents/${document._id}/edit`}
                                      className={`flex items-center px-4 py-2 text-sm ${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      }`}
                                    >
                                      <Edit className="mr-3 h-4 w-4" />
                                      Edit
                                    </Link>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                  <button
                                    onClick={() => handleDownload(document._id)}
                                    disabled={downloadingIds.has(document._id)}  // NEW: Disable during download
                                    className={`flex items-center w-full px-4 py-2 text-sm ${
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                    } ${downloadingIds.has(document._id) ? 'opacity-50 cursor-not-allowed' : ''}`}  // NEW: Visual feedback
                                  >
                                    {downloadingIds.has(document._id) ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-3" />
                                        Downloading...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="mr-3 h-4 w-4" />
                                        Download PDF
                                      </>
                                    )}
                                  </button>
                                )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleShare(document._id)}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      }`}
                                    >
                                      <Share2 className="mr-3 h-4 w-4" />
                                      Share
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleDelete(document._id)}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        active ? 'bg-gray-100 text-red-900' : 'text-red-700'
                                      }`}
                                    >
                                      <Trash2 className="mr-3 h-4 w-4" />
                                      Delete
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.type || filters.status 
                    ? 'Try adjusting your search criteria.' 
                    : 'Get started by creating your first document.'}
                </p>
                <div className="mt-6">
                  <Link
                    to="/documents/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Document
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};