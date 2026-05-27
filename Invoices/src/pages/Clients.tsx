import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, DollarSign, Edit, Trash2, Mail, 
  CreditCard, Phone, UserCheck, Filter, MoreVertical, Wallet,
  Send,
  Square,
  CheckSquare,
  X
} from 'lucide-react';
import { clientsApi, Client, salesApi } from '../services/api';
import { ShareProposalModal } from '../components/ShareProposalModal';
import toast from 'react-hot-toast';

// ID do usuário logado (substituir pela lógica real do seu AuthContext/JWT)
const LOGGED_USER_ID = "69ad5bec5ecbc09bc1596e3f"; 

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [originFilter, setOriginFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
  });
// ── NOVO ── Seleção múltipla de clientes
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showProposalModal, setShowProposalModal] = useState(false);

  const selectedClientsForProposal = clients.filter(c => selectedClientIds.has(c._id));

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedClientIds(new Set());
  };
  const loadData = async (page: number) => {
    try {
      setLoading(true);
      const [clientsRes, salesRes] = await Promise.all([
        clientsApi.getAll({ 
          page, 
          limit: 12, 
          search, 
          origin: originFilter,
          onlyMine: showOnlyMine 
        }),
        salesApi.getAll({ limit: 1000 })
      ]);
      
      setClients(clientsRes.clients);
      setPagination(clientsRes.pagination);
      setSales(salesRes.sales || []);

      // Limpa seleção ao mudar de página/filtro (opcional – pode remover se preferir manter)
      setSelectedClientIds(new Set());
    } catch (error) {
      toast.error('Erro ao carregar os dados dos clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData(1);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, originFilter, showOnlyMine]);

  const calculateTotalSpent = (clientId: string) => {
    return sales
      .filter(sale => (sale.customer?._id === clientId || sale.customerId === clientId))
      .reduce((acc, sale) => acc + (sale.total || 0), 0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este registro?')) return;
    try {
      await clientsApi.delete(id);
      toast.success('Cliente removido com sucesso');
      loadData(pagination.current);
      setOpenMenu(null);
    } catch (error) {
      toast.error('Erro ao eliminar cliente');
    }
  };

  const handleTopUp = async (client: Client) => {
    const input = prompt(`Adicionar saldo para ${client.name}:`);
    const amt = Number(input);
    if (!amt || amt <= 0) return;
    try {
      await clientsApi.topUp(client._id, amt);
      toast.success('Carteira carregada com sucesso');
      loadData(pagination.current);
      setOpenMenu(null);
    } catch (err) {
      toast.error('Erro ao processar recarga');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Estilo Brendkit */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Base de Clientes</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Gestão de saldos, histórico e fidelização</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/clients/new"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Link>

          <button
            disabled={selectedClientIds.size === 0}
            onClick={() => setShowProposalModal(true)}
            className={`
              inline-flex items-center px-5 py-2.5 
              ${selectedClientIds.size === 0 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'} 
              text-white rounded-md text-xs font-black uppercase tracking-widest 
              transition-all shadow-lg active:scale-95
            `}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Proposta {selectedClientIds.size > 0 && `(${selectedClientIds.size})`}
          </button>

          {selectedClientIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <X size={16} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros Avançada */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou NUIT..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            className="bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
          >
            <option value="all">Todas as Origens</option>
            <option value="internal">Equipa Interna</option>
            <option value="external">Portal Externo</option>
          </select>

          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl border-none text-[10px] font-black uppercase tracking-widest transition-all ${
              showOnlyMine 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={14} />
            {showOnlyMine ? 'Meus Registos' : 'Todos'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-slate-50 h-64 rounded-2xl border border-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => {
            const totalSpent = calculateTotalSpent(client._id);
            const isOwner = client.createdBy?.$oid === LOGGED_USER_ID || client.createdBy === LOGGED_USER_ID;
            const isSelected = selectedClientIds.has(client._id);

            return (
              <div key={client._id} className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:shadow-2xl hover:shadow-slate-100 transition-all group relative flex flex-col justify-between">
                {/* Checkbox de seleção */}
                <div className="absolute top-6 right-12 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleClientSelection(client._id);
                    }}
                    className="p-1 rounded hover:bg-slate-100 transition"
                  >
                    {isSelected ? (
                      <CheckSquare size={22} className="text-green-600" />
                    ) : (
                      <Square size={22} className="text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </div>
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-md shadow-inner">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 truncate max-w-[140px] group-hover:text-blue-600 transition tracking-tight">
                          {client.name}
                        </h3>
                        {isOwner && (
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                            Gestor Direto
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenu(openMenu === client._id ? null : client._id)}
                        className="p-2 hover:bg-slate-50 rounded-xl transition"
                      >
                        <MoreVertical size={20} className="text-slate-400" />
                      </button>
                      {openMenu === client._id && (
                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 z-30 overflow-hidden py-1">
                          <button onClick={() => handleTopUp(client)} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                            <Wallet className="w-4 h-4 text-emerald-500" /> Carregar Carteira
                          </button>
                          <Link to={`/clients/${client._id}/edit`} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                            <Edit className="w-4 h-4 text-blue-500" /> Editar Perfil
                          </Link>
                          <div className="h-px bg-slate-50 my-1" />
                          <button onClick={() => handleDelete(client._id)} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition">
                            <Trash2 className="w-4 h-4" /> Eliminar Registo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 truncate">
                      <Mail size={14} className="text-slate-300" /> {client.email}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                      <Phone size={14} className="text-slate-300" /> {client.phone || 'Sem contacto'}
                    </div>
                    
                    {/* INFO DE SALDO (WALLET) */}
                    <div className="mt-5 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Saldo Wallet:</span>
                      </div>
                      <span className="font-black text-emerald-700 text-sm">
                        {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(client.balance || 0)}
                      </span>
                    </div>

                    {/* INFO DE FATURAÇÃO TOTAL */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gasto Total:</span>
                      </div>
                      <span className="font-black text-slate-900 text-sm">
                        {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(totalSpent)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${client.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {client.isActive ? 'Conta Ativa' : 'Inativo'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono font-bold">
                    NUUIT: {client.taxId || 'N/A'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação Estilo Brendkit */}
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-8 gap-4">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Total Base: <span className="text-slate-900">{pagination.total}</span> Registos
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.current === 1}
            onClick={() => loadData(pagination.current - 1)}
            className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
          >
            Anterior
          </button>
          <div className="px-5 py-2.5 text-[10px] font-black text-blue-600 bg-blue-50 rounded-xl border border-blue-100 uppercase tracking-widest">
            {pagination.current} / {pagination.pages}
          </div>
          <button
            disabled={pagination.current === pagination.pages}
            onClick={() => loadData(pagination.current + 1)}
            className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
          >
            Próximo
          </button>
        </div>
      </div>
      {showProposalModal && (
        <ShareProposalModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          initialSelected={selectedClientsForProposal}
          mode="clients"
          title="Enviar Proposta a Clientes"
        />
      )}
    </div>
  );
};