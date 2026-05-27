import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  Search, Download,
  Calendar, DollarSign, Clock, CheckCircle,
  User, Wallet, AlertCircle, Share2,
  X, Save, Menu,
  Printer
} from 'lucide-react';
import { api, pdfApi, SaleFilters } from '../services/api';
import CashClosureManager from '../components/CashClosureManager';
import ExpenseManager from '../components/ExpenseManager';
import toast from 'react-hot-toast';
import { Receipt } from '../components/Receipt';
import { useReactToPrint } from 'react-to-print';

export const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true); // state only used to trigger re-renders when performing async ops
  const [_userRole, setUserRole] = useState<string>('user');
  const [sellers, setSellers] = useState<any[]>([]);           // Lista de vendedores com vendas
const [sellerFilter, setSellerFilter] = useState<string>('all');
  
const [saleToPrint, setSaleToPrint] = useState<any | null>(null);
const [companyData, setCompanyData] = useState<any>(null);
const receiptRef = useRef<HTMLDivElement>(null);
  // share-modal state
  const [saleToShare, setSaleToShare] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareCc, setShareCc] = useState('');
  const [shareLoading, setShareLoading] = useState(false); // loading while sending email
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Drawer states
  const [closuresDrawerOpen, setClosuresDrawerOpen] = useState(false);
  const [expensesDrawerOpen, setExpensesDrawerOpen] = useState(false);

  const handleShareInvoice = (sale: any) => {
    // open confirmation modal rather than sending immediately
    openShareModal(sale);
  };

  // reminder modal state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderSale, setReminderSale] = useState<any | null>(null);

  const handleSendReminder = async (sale: any) => {
    // open confirmation modal rather than sending immediately
    setReminderSale(sale);
    setIsReminderModalOpen(true);
  };

  const confirmSendReminder = async () => {
    if (!reminderSale) return;
    try {
      setLoading(true);
      const id = reminderSale._id?.toString ? reminderSale._id.toString() : reminderSale._id;
      await api.sales.remind(id);
      toast.success('Lembrete enviado');
      setIsReminderModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar lembrete');
    } finally {
      setLoading(false);
    }
  };
const loadSellers = useCallback(async () => {
  try {
    // Rota dedicada que retorna vendedores com vendas + todos os admins/owners (para filtro completo)
    const sellersRes = await api.sales.getSellers();

    // Proteção robusta contra diferentes estruturas de resposta
    let sellerList: any[] = [];

    if (Array.isArray(sellersRes)) {
      sellerList = sellersRes;
    } else if (sellersRes?.sellers && Array.isArray(sellersRes.sellers)) {
      sellerList = sellersRes.sellers;
    } else if (sellersRes?.users && Array.isArray(sellersRes.users)) {
      sellerList = sellersRes.users;
    }

    // Garantir que temos firstName e lastName
    const formattedSellers = sellerList
      .filter(s => s && (s.firstName || s.lastName))
      .map(s => ({
        _id: s._id,
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        email: s.email || ''
      }));

    setSellers(formattedSellers);
  } catch (err: any) {
    console.error('Erro ao carregar vendedores:', err);
    toast.error('Não foi possível carregar a lista de vendedores');
    setSellers([]);
  }
}, []);
  

const handleDownloadInvoice = async (sale: any) => {
  if (!sale) {
    toast.error('Nenhuma venda selecionada');
    return;
  }

  const id = sale._id?.toString() || sale._id;
  if (!id) {
    toast.error('ID da venda inválido');
    return;
  }

  if (downloadingIds.has(id)) {
    toast.success('Download já em andamento...');
    return;
  }

  try {
    setDownloadingIds(prev => new Set([...prev, id]));
    toast.loading('A gerar fatura em PDF...', { id: `loading-${id}` });

    // ATUALIZAÇÃO: Chamada para o novo método do serviço que aponta para /pdf/generate/:id
    const { blob, filename: serverFilename } = await pdfApi.generateAndDownload(id);

    // Validação
    if (!blob || !(blob instanceof Blob) || blob.size < 1500) {
      throw new Error('PDF retornado pelo servidor está vazio, corrompido ou incompleto');
    }

    // Criar URL para o blob
    const blobUrl = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    const shortId = id.slice(-6).toUpperCase();

    // Limpeza do nome do cliente para o ficheiro
    let customerPart = '';
    if (sale.customer?.name) {
      const cleanName = sale.customer.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 20);

      if (cleanName) customerPart = `_${cleanName}`;
    }

    const finalFilename = `Fatura_${shortId}${customerPart}_${today}.pdf`;

    // Trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    toast.dismiss(`loading-${id}`);
    toast.success(`Fatura ${shortId} descarregada!`, { duration: 5000 });

    // Abrir modal de partilha conforme fluxo original
    setSaleToShare(sale);
    setShareEmail(sale.customer?.email || '');
    setIsShareModalOpen(true);

  } catch (error: any) {
    console.error('Erro ao descarregar fatura:', error);
    
    // Tratamento de erro mantido e robusto
    let userMessage = 'Não foi possível gerar a fatura. Tente novamente.';
    if (error.response?.status === 404) userMessage = 'Venda não encontrada.';
    else if (error.message?.includes('timeout')) userMessage = 'O servidor demorou muito a responder.';
    
    toast.dismiss(`loading-${id}`);
    toast.error(userMessage);
  } finally {
    setDownloadingIds(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  }
};
  const openShareModal = async (sale: any) => {
    setSaleToShare(sale);
    setIsShareModalOpen(true);
    // try to preload email from client record if available
    if (sale.customer?.id) {
      try {
        const client = await api.clients.getById(sale.customer.id);
        if (client?.email) setShareEmail(client.email);
      } catch (e) {
        console.warn('Unable to load client email', e);
      }
    }
    setShareCc('');
  };

  const handleConfirmShare = async () => {
    if (!saleToShare) return;
    try {
      setShareLoading(true);
      const id = saleToShare._id?.toString ? saleToShare._id.toString() : saleToShare._id;
      await api.sales.share(id, { to: shareEmail, cc: shareCc });
      toast.success('Fatura partilhada com o cliente');
      setIsShareModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao partilhar');
    } finally {
      setShareLoading(false);
    }
  };

  // pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // adjust as needed

  
  // Estados para Modal de Finalização de Pagamento Remanescente
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountReceivedNow, setAmountReceivedNow] = useState<number>(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateScope, setDateScope] = useState<'all' | 'today'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [mineOnly, setMineOnly] = useState(false);

  // open cash register modal state
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [openCashFloat, setOpenCashFloat] = useState('');
  const [openCashNotes, setOpenCashNotes] = useState('');
const [lastSale, setLastSale] = useState<any>(null);
useEffect(() => {
  api.company.getProfile().then(setCompanyData).catch(console.error);
  api.auth.getProfile().then(profile => setUserRole(profile.role)).catch(() => setUserRole('user')); // fallback to 'user' if error
}, []);
const loadData = useCallback(async () => {
  try {
    setLoading(true);

    const filters: SaleFilters = {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm?.trim() || undefined,
      sellerId: sellerFilter !== 'all' && sellerFilter ? sellerFilter : undefined,
    };

    // Date filters
    if (dateScope === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filters.startDate = today;
      filters.endDate = today;
    } else {
      if (dateRange.start?.trim()) filters.startDate = dateRange.start;
      if (dateRange.end?.trim()) filters.endDate = dateRange.end;
    }

    if (mineOnly) {
      (filters as any).mine = true;
    }

    console.log('🔍 Filtros enviados para /sales:', filters); // ← útil para debug

    const response = await api.sales.getAll(filters);
    
    if (response && typeof response === 'object') {
      const salesData = Array.isArray(response.sales) ? response.sales : 
                       Array.isArray(response) ? response : [];
      setSales(salesData);
    } else {
      setSales([]);
    }
    
  } catch (error: any) {
    console.error("Erro ao carregar histórico:", error);
    toast.error("Erro ao carregar histórico de vendas");
    setSales([]); 
  } finally {
    setLoading(false);
  }
}, [statusFilter, searchTerm, sellerFilter, dateRange, dateScope, mineOnly]);

  // reset page whenever sales list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sales]);

  useEffect(() => {
    loadData();
    loadSellers();
  }, [loadData, loadSellers]);

  // --- Lógica de Finalização de Pagamento ---
  const openFinalizeModal = (sale: any) => {
    setSelectedSale(sale);
    const missingValue = (sale.total || 0) - (sale.amountPaid || 0);
    setAmountReceivedNow(missingValue);
    setIsModalOpen(true);
  };

  const handleConfirmFinalPayment = async () => {
    try {
      setLoading(true);
      // Aqui enviamos a atualização para o backend
      // O backend só precisa saber que o pagamento final foi feito
      await api.sales.payRemaining(selectedSale._id);
      toast.success(`Pagamento da Venda #${selectedSale._id.slice(-6)} liquidado!`);
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Falha ao registar liquidação");
    } finally {
      setLoading(false);
    }
  };
const handlePrint = useReactToPrint({
  content: () => receiptRef.current,
  
  pageStyle: `
    @media print {
      body { font-family: 'Courier New', Courier, monospace !important; }
      .receipt-content { 
        width: 80mm !important; 
        padding: 10px !important; 
        display: block !important;
      }
      /* Forçar o Tailwind a imprimir cores */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `,
  copyStyles: false,
  onAfterPrint: () => setLastSale(null),
  removeAfterPrint: true, // Crucial para evitar o erro de TrustedScript em impressões seguidas
});
useEffect(() => {
  if (saleToPrint && receiptRef.current) {
    handlePrint();
  }
}, [saleToPrint]);
  // --- CÁLCULOS DOS CARDS DE RESUMO (KPIs) ---
const stats = useMemo(() => {
  // Proteção principal: se sales não for array, tratamos como vazio
  const safeSales = Array.isArray(sales) ? sales : [];

  // Filtramos vendas não canceladas de forma segura
  const nonCancelled = safeSales.filter((s) => s?.status !== 'Cancelada');

  // Cálculos com valores default 0 para evitar NaN
  const totalExpected = nonCancelled.reduce((acc, s) => acc + (Number(s?.total) || 0), 0);
  const totalReceived = nonCancelled.reduce((acc, s) => acc + (Number(s?.amountPaid) || 0), 0);
  const totalRemaining = totalExpected - totalReceived;
  const pendentesCount = nonCancelled.filter((s) => s?.status !== 'Pago 100%').length;

  return {
    totalExpected,
    totalReceived,
    totalRemaining,
    pendentesCount,
  };
}, [sales]);

const paginatedSales = useMemo(() => {
  // Proteção: se sales não for array → retorna vazio
  if (!Array.isArray(sales)) {
    console.warn('sales não é array durante paginação:', sales);
    return [];
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  return sales.slice(startIndex, endIndex);
}, [sales, currentPage, itemsPerPage]);

// Total de páginas (seguro)
const totalPages = Math.max(1, Math.ceil((Array.isArray(sales) ? sales.length : 0) / itemsPerPage));

  return (
    <div className="p-2 sm:p-2 md:p-4 lg:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* KPI CARDS ATUALIZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Previsto</p>
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-black text-gray-900">{stats.totalExpected.toLocaleString()} MT</h3>
            <div className="p-2 bg-gray-50 text-gray-400 rounded-md"><DollarSign size={16}/></div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm ring-2 ring-green-50">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Total Recebido</p>
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-black text-green-600">{stats.totalReceived.toLocaleString()} MT</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-md"><Wallet size={16}/></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm ring-2 ring-amber-50">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Em Falta (Dívida)</p>
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-black text-amber-600">{stats.totalRemaining.toLocaleString()} MT</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-md"><Clock size={16}/></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Vendas Pendentes</p>
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-black text-blue-600">{stats.pendentesCount}</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><AlertCircle size={16}/></div>
          </div>
        </div>
      </div>
 {/* Open cash register button */}
    
      {/* Fecho de Caixa & Gestão de Despesas - Now as drawer buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setClosuresDrawerOpen(true)}
          className="bg-white rounded-xl shadow border p-6 hover:shadow-md hover:border-blue-300 transition text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Fecho de Caixa</h3>
              <p className="text-sm text-gray-500 mt-1">Gerir fechos do seu turno diário</p>
            </div>
            <Menu size={24} className="text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => setExpensesDrawerOpen(true)}
          className="bg-white rounded-xl shadow border p-6 hover:shadow-md hover:border-amber-300 transition text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Gestão de Despesas</h3>
              <p className="text-sm text-gray-500 mt-1">Registar e gerir despesas</p>
            </div>
            <Menu size={24} className="text-amber-600" />
          </div>
        </button>
      </div>
    <button
          onClick={() => setIsOpenCashModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition"
        >
          Abrir Caixa
        </button>
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            placeholder="Pesquisar cliente ou telefone..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
       
        
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-md">
          <Calendar size={14} className="text-gray-400" />
          <input 
            type="date" 
            className="bg-transparent py-2 text-xs font-bold border-none outline-none"
            value={dateRange.start}
            onChange={(e) => {
              setDateScope('all');
              setDateRange(prev => ({ ...prev, start: e.target.value }));
            }}
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-md">
          <Calendar size={14} className="text-gray-400" />
          <input 
            type="date" 
            className="bg-transparent py-2 text-xs font-bold border-none outline-none"
            value={dateRange.end}
            onChange={(e) => {
              setDateScope('all');
              setDateRange(prev => ({ ...prev, end: e.target.value }));
            }}
          />
        </div>
        <select
          className="bg-gray-50 px-4 py-3 rounded-md text-xs font-black uppercase border-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          value={dateScope}
          onChange={e => {
            const val = e.target.value as 'all' | 'today';
            setDateScope(val);
            if (val === 'today') {
              // When selecting 'today', set dates to today (last 24 hours)
              const today = new Date().toISOString().split('T')[0];
              setDateRange({ start: today, end: today });
            } else {
              // When selecting 'all', clear dates to show all records
              setDateRange({ start: '', end: '' });
            }
          }}
        >
          <option value="all">Globais</option>
          <option value="today">Hoje</option>
        </select>
        <label className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-md cursor-pointer">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={e => setMineOnly(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="text-xs font-medium">Só minhas</span>
        </label>
{/* Filtro por Vendedor - Só visível para Admin/Owner/Superadmin */}
      <select
      value={sellerFilter}
      onChange={(e) => setSellerFilter(e.target.value)}
      className="bg-gray-50 px-4 py-3 rounded-lg text-sm font-medium border border-gray-200 focus:ring-2 focus:ring-blue-500 min-w-[180px]"
    >
      <option value="all">Todos os Vendedores</option>
      {sellers.map((seller) => (
        <option key={seller._id} value={seller._id}>
          {seller.firstName} {seller.lastName}
        </option>
      ))}
    </select>
        <select 
          className="bg-gray-50 px-4 py-3 rounded-md text-xs font-black uppercase border-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os Status</option>
          <option value="Pago 100%">Pago 100%</option>
          <option value="Pago 50%">Parcial (50%)</option>
          <option value="Reserva">Reservas</option>
          <option value="Cancelada">Canceladas</option>
        </select>

        <button className="p-3 bg-gray-900 text-white rounded-md hover:bg-black transition shadow-lg shadow-gray-200">
          <Download size={20} />
        </button>
      </div>

      {/* TABELA COM CÁLCULOS DE VALOR PAGO E RESTANTE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data & ID</th>
                {/* NOVA COLUNA: VENDEDOR */}
          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Vendedor</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-green-600 uppercase tracking-widest text-right">Pago</th>
                <th className="px-6 py-5 text-[10px] font-black text-amber-600 uppercase tracking-widest text-right">Em Falta</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-900 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-900 uppercase tracking-widest text-center">Vencimento</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedSales.map((sale) => {
          const remaining = (Number(sale?.total) || 0) - (Number(sale?.amountPaid) || 0);
          const due = sale?.dueDate ? new Date(sale.dueDate) : null;
          const now = new Date();
          const nearDue = due && (due.getTime() - now.getTime()) <= 2 * 24 * 60 * 60 * 1000;
                return (
                 <tr
              key={sale?._id}
              className={`hover:bg-blue-50/20 transition-colors group ${nearDue ? 'bg-red-50' : ''}`}
            > 
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-gray-900 font-mono">#{sale._id.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400">{new Date(sale.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                {sale.createdBy?.firstName 
                  ? `${sale.createdBy.firstName} ${sale.createdBy.lastName || ''}`.trim()
                  : sale.createdBy?.name || '—'}
              </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center text-blue-500"><User size={12}/></div>
                        <span className="text-xs font-bold text-gray-700 uppercase">{sale.customer?.name || "Consumidor Final"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                        sale.status === 'Pago 100%' ? 'bg-green-100 text-green-700 border-green-200' :
                        sale.status === 'Cancelada' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600 text-xs">
                      {sale.amountPaid?.toLocaleString()} MT
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600 text-xs">
                      {remaining > 0 ? `${remaining.toLocaleString()} MT` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-sm text-gray-900">
                      {sale.total?.toLocaleString()} MT
                    </td>
                    <td className={`px-6 py-4 text-center text-sm font-bold ${nearDue ? 'text-red-600' : 'text-gray-900'}`}>
                      {due ? new Date(due).toLocaleDateString() : '-'}
                      {sale.notifiedBefore && <span title="Lembrete enviado" className="ml-1 text-green-600">📩</span>}
                      {sale.notifiedAfter && <span title="Aviso de atraso enviado" className="ml-1 text-red-600">⚠️</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                   
                        <button
                          onClick={() => handleShareInvoice(sale)}
                          className="p-2 bg-blue-200 text-blue-800 rounded-xl hover:bg-blue-300 transition"
                          title="Partilhar fatura"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSendReminder(sale)}
                          className="p-2 bg-amber-200 text-amber-800 rounded-xl hover:bg-amber-300 transition"
                          title="Enviar lembrete/aviso agora"
                        >
                          <AlertCircle size={16} />
                        </button>
                        {remaining > 0 && sale.status !== 'Cancelada' && (
                          <button 
                            onClick={() => openFinalizeModal(sale)}
                            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-100"
                            title="Liquidar Dívida"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                             {/* Botão de Impressão de Recibo */}
                  <button
                    onClick={() => setSaleToPrint(sale)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Imprimir Recibo"
                  >
                    <Printer size={18} /> {/* Importe 'Printer' do lucide-react */}
                  </button>
                        <button 
                          onClick={() => handleDownloadInvoice(sale)}
                          disabled={downloadingIds.has(sale._id?.toString ? sale._id.toString() : sale._id)}
                          className="p-2 bg-green-200 text-green-800 rounded-xl hover:bg-green-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Descarregar Fatura (PDF)"
                        >
                          {downloadingIds.has(sale._id?.toString ? sale._id.toString() : sale._id) ? (
                            <div className="w-4 h-4 border-2 border-green-300 border-t-green-800 rounded-full animate-spin" />
                          ) : (
                            <Download size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
{/* Controles de paginação – agora seguros */}
  <div className="flex justify-between items-center p-4 bg-white border-t border-gray-100">
    <button
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Anterior
    </button>

    <span className="text-sm text-gray-600">
      Página {currentPage} de {totalPages}
    </span>

    <button
      disabled={currentPage >= totalPages}
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Prósxima
    </button>
</div>
      {/* MODAL DE LIQUIDAÇÃO DE VALOR REMANESCENTE */}
      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Liquidar Venda</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
              </div>

              <div className="bg-blue-50 rounded-3xl p-5 space-y-2 border border-blue-100">
                 <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase">
                    <span>Total da Venda</span>
                    <span>Já Pago</span>
                 </div>
                 <div className="flex justify-between font-black text-gray-900">
                    <span>{(selectedSale.total || 0).toLocaleString()} MT</span>
                    <span className="text-green-600">{(selectedSale.amountPaid || 0).toLocaleString()} MT</span>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase px-1">Valor a Receber (Em Falta)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600" size={20} />
                  <input 
                    type="number"
                    value={amountReceivedNow}
                    onChange={(e) => setAmountReceivedNow(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 bg-amber-50 rounded-2xl border-2 border-amber-100 outline-none focus:border-amber-500 text-xl font-black text-amber-700 transition"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-bold text-center">A venda será marcada como "Pago 100%" após esta confirmação.</p>
              </div>

              <button 
                onClick={handleConfirmFinalPayment}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Save size={16} /> Confirmar Recebimento Final
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SHARE CONFIRMATION MODAL */}
      {isShareModalOpen && saleToShare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Partilhar Fatura</h2>
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
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Share2 size={16} /> Enviar Fatura</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPEN CASH REGISTER MODAL */}
      {isOpenCashModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Abrir Caixa</h2>
                <button onClick={() => { setIsOpenCashModalOpen(false); setOpenCashFloat(''); setOpenCashNotes(''); }} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase px-1">Fundo Inicial (MT)</label>
                  <input
                    type="number"
                    value={openCashFloat}
                    onChange={e => setOpenCashFloat(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase px-1">Notas (opcional)</label>
                  <textarea
                    value={openCashNotes}
                    onChange={e => setOpenCashNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                    placeholder="Ex: Caixa aberto para turno da manhã"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await api.cashClosures.openRequest(Number(openCashFloat) || 0, openCashNotes);
                    toast.success('Solicitação de abertura enviada');
                    setIsOpenCashModalOpen(false);
                    setOpenCashFloat('');
                    setOpenCashNotes('');
                  } catch (err: any) {
                    toast.error(err.message || 'Falha ao enviar solicitação');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-green-200 hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                Solicitar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMINDER CONFIRMATION MODAL */}
      {isReminderModalOpen && reminderSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Enviar Lembrete</h2>
                <button onClick={() => setIsReminderModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
              </div>

              <p className="text-gray-700">
                Tem certeza que pretende enviar um lembrete para o sr. <strong>{reminderSale.customer?.name || 'Cliente'}</strong>?
              </p>
              <p className="text-gray-700">
                Faltam <strong>{((reminderSale.total || 0) - (reminderSale.amountPaid || 0)).toLocaleString()} MT</strong> e{' '}
                {reminderSale.dueDate ? (
                  (() => {
                    const due = new Date(reminderSale.dueDate);
                    const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000*60*60*24));
                    return diffDays >= 0 ? `${diffDays} dias` : `${-diffDays} dias de atraso`;
                  })()
                ) : 'sem data de vencimento'}.
              </p>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setIsReminderModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >Cancelar</button>
                <button
                  onClick={confirmSendReminder}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                >Enviar Lembrete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLOSURES DRAWER */}
      {closuresDrawerOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="fixed inset-0 bg-black/40" onClick={() => setClosuresDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Seus Fechos Recentes</h2>
              <button
                onClick={() => setClosuresDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <CashClosureManager onClose={() => setClosuresDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES DRAWER */}
      {expensesDrawerOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="fixed inset-0 bg-black/40" onClick={() => setExpensesDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Gestão de Despesas</h2>
              <button
                onClick={() => setExpensesDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <ExpenseManager onClose={() => setExpensesDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}
      {/* Container de Impressão Oculto */}
<div style={{ display: 'none' }}>
  <div ref={receiptRef}>
    {saleToPrint && (
      <Receipt
        sale={saleToPrint}
        company={{
          name: companyData?.name || "Empresa",
          address: companyData?.address
            ? `${companyData.address.street || ''}, ${companyData.address.city || ''}`
            : "",
          phone: companyData?.phone || "",
          taxId: companyData?.taxId || companyData?.vatNumber || "",
          slogan: companyData?.slogan || ""
        }}
        items={saleToPrint.items || []}
        subtotal={saleToPrint.subtotal || saleToPrint.total || 0}
        discount={saleToPrint.discount || 0}
        total={saleToPrint.total || 0}
        taxRate={saleToPrint.taxRate || 16}
        amountPaid={saleToPrint.amountPaid || 0}
        paymentMethod={saleToPrint.paymentMethod || "N/A"}
        saleStatus={saleToPrint.status || "N/A"}
        dueDate={saleToPrint.dueDate}
        customerName={saleToPrint.customer?.name || saleToPrint.customerName || "Consumidor Final"}
        customerPhone={saleToPrint.customer?.phone || ""}
        notes={saleToPrint.notes || ""}
        createdBy={saleToPrint.createdBy} // se já tiver o nome resolvido
      />
    )}
  </div>
</div>
    </div>
  );
};