import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Users,
  DollarSign,
  Link as LinkIcon,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Target,
  X,
  Check,
  Eye,
  MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Partner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  referralCount: number;
  clientCount: number;
  saleCount: number;
  totalSalesValue: number;
  totalCommissionGenerated: number;
  openLeads: number;
  monthlySalesGoal?: number;
  monthlyLeadsGoal?: number;
}

const ITEMS_PER_PAGE = 10;

export const PartnerManagement: React.FC = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(partners.length / ITEMS_PER_PAGE);
  const paginatedPartners = partners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Modal de criação/edição
  const [partnerModal, setPartnerModal] = useState<{
    open: boolean;
    isEdit: boolean;
    partner?: Partner;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    commissionRate: number;
    isActive: boolean;
  }>({
    open: false,
    isEdit: false,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    commissionRate: 10,
    isActive: true,
  });

  // Modal de metas
  const [goalModal, setGoalModal] = useState<{
    open: boolean;
    partnerId: string;
    partnerName: string;
    monthlySalesGoal: number;
    monthlyLeadsGoal: number;
    saving: boolean;
  }>({
    open: false,
    partnerId: '',
    partnerName: '',
    monthlySalesGoal: 0,
    monthlyLeadsGoal: 0,
    saving: false,
  });

  // Modal de visualização detalhada
  const [viewModal, setViewModal] = useState<{
    open: boolean;
    partner: Partner | null;
  }>({
    open: false,
    partner: null,
  });

  // Controle do menu dropdown por parceiro
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await api.request<any>('/admin/partners/overview');
      console.log('Dados brutos de parceiros:', res.partners?.map(p => ({
      name: `${p.firstName} ${p.lastName}`,
      totalCommissionGenerated: p.totalCommissionGenerated
    })));
      setPartners(res.partners || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar parceiros');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const payload = {
        firstName: partnerModal.firstName,
        lastName: partnerModal.lastName,
        email: partnerModal.email,
        phone: partnerModal.phone || undefined,
        commissionRate: partnerModal.commissionRate,
        isActive: partnerModal.isActive,
        company: user?.company?._id,
      };

      if (partnerModal.isEdit && partnerModal.partner) {
        await api.request(`/admin/partners/${partnerModal.partner._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Parceiro atualizado com sucesso');
      } else {
        await api.request('/admin/partners', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Parceiro criado com sucesso');
      }

      setPartnerModal({ open: false, isEdit: false, firstName: '', lastName: '', email: '', phone: '', commissionRate: 10, isActive: true });
      fetchPartners();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar parceiro');
    }
  };

  const handleDelete = async (partnerId: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o parceiro ${name}?`)) return;
    if (!window.confirm(`Confirmação final: Digite "REMOVER" para continuar.`)) return;

    try {
      await api.request(`/admin/partners/${partnerId}`, { method: 'DELETE' });
      toast.success('Parceiro removido');
      fetchPartners();
    } catch (err: any) {
      toast.error('Erro ao remover parceiro');
    }
  };

  const openGoalModal = (partner: Partner) => {
    setGoalModal({
      open: true,
      partnerId: partner._id,
      partnerName: `${partner.firstName} ${partner.lastName}`,
      monthlySalesGoal: partner.monthlySalesGoal || 0,
      monthlyLeadsGoal: partner.monthlyLeadsGoal || 0,
      saving: false,
    });
    setActiveMenu(null);
  };

  const saveGoals = async () => {
    setGoalModal(prev => ({ ...prev, saving: true }));
    try {
      const response = await api.request(`/admin/partners/${goalModal.partnerId}/goals`, {
        method: 'PATCH',
        body: JSON.stringify({
          monthlySalesGoal: goalModal.monthlySalesGoal,
          monthlyLeadsGoal: goalModal.monthlyLeadsGoal,
        }),
      });

      // Verifica se a resposta foi bem-sucedida
      if (response && !response.error) {
        toast.success('Metas atualizadas com sucesso');
        fetchPartners();
        setGoalModal(prev => ({ ...prev, open: false }));
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err: any) {
      console.error('Erro ao salvar metas:', err);
      toast.error(err?.response?.data?.message || 'Falha ao salvar metas. Verifique os valores.');
    } finally {
      setGoalModal(prev => ({ ...prev, saving: false }));
    }
  };

  const copyReferralLink = (partnerId: string) => {
    const link = `${window.location.origin}/register?ref=${partnerId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
    setActiveMenu(null);
  };

  const openViewModal = (partner: Partner) => {
    setViewModal({ open: true, partner });
    setActiveMenu(null);
  };

  const openEditModal = (partner: Partner) => {
    setPartnerModal({
      open: true,
      isEdit: true,
      partner,
      firstName: partner.firstName,
      lastName: partner.lastName,
      email: partner.email,
      phone: partner.phone || '',
      commissionRate: partner.commissionRate,
      isActive: partner.isActive,
    });
    setActiveMenu(null);
  };

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
  {/* Textos: Alinhamento central no mobile, à esquerda no desktop */}
  <div className="space-y-1">
    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
      Gestão de Parceiros
    </h1>
    <p className="text-sm md:text-base text-gray-500 font-medium">
      Controle total dos parceiros da sua empresa
    </p>
  </div>

  {/* Botão: Largura total no mobile, automático no desktop */}
  <button
    onClick={() => setPartnerModal({
      open: true,
      isEdit: false,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      commissionRate: 10,
      isActive: true,
    })}
    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 font-semibold text-sm md:text-base w-full sm:w-auto"
  >
    <Plus size={20} />
    <span>Novo Parceiro</span>
  </button>
</div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Total Parceiros</p>
          <p className="text-3xl font-bold">{partners.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Empresas via Link</p>
          <p className="text-3xl font-bold">{partners.reduce((s, p) => s + (p.referralCount || 0), 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Clientes Criados</p>
          <p className="text-3xl font-bold">{partners.reduce((s, p) => s + (p.clientCount || 0), 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Vendas Fechadas</p>
          <p className="text-3xl font-bold">{partners.reduce((s, p) => s + (p.saleCount || 0), 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Leads em Aberto</p>
          <p className="text-3xl font-bold">{partners.reduce((s, p) => s + (p.openLeads || 0), 0)}</p>
        </div>
      </div>

      {/* Tabela */}
     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
  {/* Container de Scroll para Desktop */}
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50/50">
        <tr>
          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Parceiro</th>
          {/* Ocultamos colunas menos importantes em telas pequenas/médias para manter a limpeza */}
          <th className="hidden lg:table-cell px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Registo</th>
          <th className="hidden sm:table-cell px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Link/Empresas</th>
          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Vendas/Comissão</th>
          <th className="hidden xl:table-cell px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Leads</th>
          <th className="hidden md:table-cell px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Metas</th>
          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {paginatedPartners.map(p => (
          <tr key={p._id} className="hover:bg-blue-50/30 transition-colors group">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{p.firstName} {p.lastName}</span>
                <span className="text-xs text-gray-500">{p.email}</span>
              </div>
            </td>
            
            <td className="hidden lg:table-cell px-6 py-4 text-center text-sm text-gray-600 font-medium">
              {format(new Date(p.createdAt), 'dd/MM/yy')}
            </td>

            <td className="hidden sm:table-cell px-6 py-4 text-center">
              <div className="inline-flex flex-col items-center">
                <span className="text-sm font-bold text-gray-800">{p.referralCount || 0}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Empresas</span>
              </div>
            </td>

            <td className="px-6 py-4 text-center">
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-green-600">
                   {p.totalCommissionGenerated?.toLocaleString('pt-MZ') || 0} MT
                </span>
                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 rounded font-bold uppercase">
                  {p.saleCount || 0} Vendas
                </span>
              </div>
            </td>

            <td className="hidden xl:table-cell px-6 py-4 text-center text-sm font-bold text-gray-700">
              {p.openLeads || 0}
            </td>

            <td className="hidden md:table-cell px-6 py-4 text-center">
              <div className="text-xs font-bold text-gray-700">
                {p.monthlySalesGoal ? `${p.monthlySalesGoal.toLocaleString('pt-MZ')} MT` : '—'}
                {p.monthlyLeadsGoal && (
                  <div className="text-[10px] text-blue-500 font-medium tracking-tight">
                    Meta: {p.monthlyLeadsGoal} leads
                  </div>
                )}
              </div>
            </td>

            <td className="px-6 py-4 text-right relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === p._id ? null : p._id);
                }}
                className={`p-2 rounded-xl transition-all ${activeMenu === p._id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-400'}`}
              >
                <MoreVertical size={20} />
              </button>

              {activeMenu === p._id && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveMenu(null)} />
                  {/* Menu ajustado para não fugir da tela no mobile */}
                  <div className="absolute right-6 mt-2 z-50 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in duration-150 origin-top-right">
                    <button onClick={() => { openViewModal(p); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Eye size={16} className="text-blue-500" /> Ver Detalhes
                    </button>
                    <button onClick={() => { copyReferralLink(p._id); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <LinkIcon size={16} className="text-indigo-500" /> Link de Ref.
                    </button>
                    <button onClick={() => { openGoalModal(p); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Target size={16} className="text-amber-500" /> Metas
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-4" />
                    <button onClick={() => { openEditModal(p); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-3 transition-colors">
                      <Edit size={16} /> Editar
                    </button>
                    <button onClick={() => { handleDelete(p._id, `${p.firstName} ${p.lastName}`); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                      <Trash2 size={16} /> Remover
                    </button>
                  </div>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Paginação Responsiva */}
  <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-gray-50/50">
    <span className="text-sm font-medium text-gray-500 order-2 sm:order-1">
      Página <span className="text-gray-900">{currentPage}</span> de {totalPages || 1}
    </span>
    
    <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 bg-white rounded-xl disabled:opacity-40 flex items-center justify-center gap-1 hover:bg-gray-50 transition-all font-semibold text-sm"
      >
        <ChevronLeft size={16} /> Anterior
      </button>
      <button
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 bg-white rounded-xl disabled:opacity-40 flex items-center justify-center gap-1 hover:bg-gray-100 transition-all font-semibold text-sm"
      >
        Próxima <ChevronRight size={16} />
      </button>
    </div>
  </div>
</div>

      {/* Modal Criar/Editar Parceiro */}
      {partnerModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{partnerModal.isEdit ? 'Editar Parceiro' : 'Novo Parceiro'}</h2>
              <button onClick={() => setPartnerModal(prev => ({ ...prev, open: false }))}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  value={partnerModal.firstName}
                  onChange={e => setPartnerModal(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Primeiro nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apelido</label>
                <input
                  value={partnerModal.lastName}
                  onChange={e => setPartnerModal(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Apelido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={partnerModal.email}
                  onChange={e => setPartnerModal(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone (opcional)</label>
                <input
                  value={partnerModal.phone}
                  onChange={e => setPartnerModal(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="+258 84 000 0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comissão (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={partnerModal.commissionRate}
                  onChange={e => setPartnerModal(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={partnerModal.isActive}
                  onChange={e => setPartnerModal(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <label>Parceiro Ativo</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setPartnerModal(prev => ({ ...prev, open: false }))} className="px-5 py-2 border rounded-lg">
                  Cancelar
                </button>
                <button onClick={handleCreateOrUpdate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                  {partnerModal.isEdit ? 'Atualizar' : 'Criar Parceiro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Metas */}
      {goalModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Definir Metas – {goalModal.partnerName}</h2>
              <button onClick={() => setGoalModal(prev => ({ ...prev, open: false }))}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Meta de Vendas Mensal (MT)</label>
                <input
                  type="number"
                  value={goalModal.monthlySalesGoal}
                  onChange={e => setGoalModal(prev => ({ ...prev, monthlySalesGoal: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meta de Leads Mensal</label>
                <input
                  type="number"
                  value={goalModal.monthlyLeadsGoal}
                  onChange={e => setGoalModal(prev => ({ ...prev, monthlyLeadsGoal: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setGoalModal(prev => ({ ...prev, open: false }))} className="px-5 py-2 border rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={saveGoals}
                  disabled={goalModal.saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {goalModal.saving && <Loader2 className="animate-spin" size={16} />}
                  Salvar Metas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização Detalhada */}
      {viewModal.open && viewModal.partner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {viewModal.partner.firstName} {viewModal.partner.lastName}
              </h2>
              <button
                onClick={() => setViewModal({ open: false, partner: null })}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={28} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Informações pessoais */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-5 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Informações Pessoais</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500 block">Email</span>
                      <p className="font-medium text-gray-900">{viewModal.partner.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Telefone</span>
                      <p className="font-medium text-gray-900">{viewModal.partner.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Comissão</span>
                      <p className="font-medium text-indigo-700">{viewModal.partner.commissionRate}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Status</span>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        viewModal.partner.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {viewModal.partner.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Data de Registo</span>
                      <p className="font-medium text-gray-900">
                        {format(new Date(viewModal.partner.createdAt), 'dd MMMM yyyy', { locale: pt })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desempenho */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-5 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Desempenho</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 block">Empresas via Link</span>
                      <p className="text-xl font-bold">{viewModal.partner.referralCount}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Clientes Criados</span>
                      <p className="text-xl font-bold">{viewModal.partner.clientCount}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Vendas Fechadas</span>
                      <p className="text-xl font-bold">{viewModal.partner.saleCount}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Comissão Gerada</span>
                      <p className="text-xl font-bold text-green-700">
                        {viewModal.partner.totalCommissionGenerated?.toLocaleString('pt-MZ')} MT
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Leads em Aberto</span>
                      <p className="text-xl font-bold">{viewModal.partner.openLeads}</p>
                    </div>
                  </div>
                </div>

                {/* Metas atuais */}
                <div className="bg-gray-50 p-5 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Metas Atuais</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Meta Vendas Mensal</span>
                      <p className="font-bold text-lg">
                        {viewModal.partner.monthlySalesGoal ? `${viewModal.partner.monthlySalesGoal.toLocaleString('pt-MZ')} MT` : 'Sem meta definida'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Meta Leads Mensal</span>
                      <p className="font-bold text-lg">
                        {viewModal.partner.monthlyLeadsGoal || 'Sem meta definida'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={() => setViewModal({ open: false, partner: null })}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerManagement;