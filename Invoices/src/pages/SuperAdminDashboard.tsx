// src/pages/admin/SuperAdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Building2,
  Users,
  UserCheck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Edit,
  Loader2,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyDetailModal from '../components/admin/CompanyDetailModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { CompanyRegisterModal } from '../components/CompanyRegisterModal';
import { SubscriptionPlansManager } from './admin/SubscriptionPlansManager';

interface CompanyOverview {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  slug?: string;
  subscription: {
    plan: string;
    status: string;
    endsAt: string;
    planId?: string;
  };
  usersCount: number;
  clientsCount: number;
  partnersCount: number;
  avgMonthlyProduction: number;
}

const ITEMS_PER_PAGE = 10;

export const SuperAdminDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [plans, setPlans] = useState<any[]>([]);           // Planos dinâmicos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [showPlansManager, setShowPlansManager] = useState(false); // Controla exibição do gestor de planos

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(companies.length / ITEMS_PER_PAGE);
  const paginatedCompanies = companies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const [selectedCompany, setSelectedCompany] = useState<CompanyOverview | null>(null);

  const [editModal, setEditModal] = useState({
    open: false,
    companyId: null as string | null,
    companyName: '',
    currentPlanId: '',
    newPlanId: '',
    months: 1,
    customMonths: 1,
    updating: false,
  });

  // Buscar empresas + planos dinâmicos
  const fetchData = async () => {
    try {
      setLoading(true);
      const [companiesRes, plansRes] = await Promise.all([
        api.request<any>('/admin/companies/overview'),
        api.request<any>('/admin/subscription-plans')
      ]);

      setCompanies(companiesRes.companies || []);
      setSummary(companiesRes.summary || {});
      setPlans(plansRes.plans || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar dados');
      toast.error('Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isExpiringSoon = (date: string) => {
    const end = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const openEditModal = (company: CompanyOverview) => {
    setEditModal({
      open: true,
      companyId: company._id,
      companyName: company.name,
      currentPlanId: company.subscription.planId || '',
      newPlanId: company.subscription.planId || '',
      months: 1,
      customMonths: 1,
      updating: false,
    });
  };

  const handleUpdatePlan = async () => {
    if (!editModal.companyId || !editModal.newPlanId) return;

    const monthsToSend = editModal.months === 0 ? editModal.customMonths : editModal.months;

    if (monthsToSend < 1 || monthsToSend > 36) {
      toast.error('O período deve estar entre 1 e 36 meses');
      return;
    }

    setEditModal(prev => ({ ...prev, updating: true }));

    try {
      await api.request(`/admin/companies/${editModal.companyId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          planId: editModal.newPlanId,
          months: monthsToSend,
          manualActivation: true,
        }),
      });

      toast.success(`Plano atualizado com sucesso para ${editModal.companyName}`);
      fetchData(); // Recarrega dados
      setEditModal(prev => ({ ...prev, open: false }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao atualizar o plano');
    } finally {
      setEditModal(prev => ({ ...prev, updating: false }));
    }
  };

  const [deleteStep, setDeleteStep] = useState<{
    open: boolean;
    companyId: string | null;
    companyName: string;
    step: 'warning' | 'confirm';
  }>({
    open: false,
    companyId: null,
    companyName: '',
    step: 'warning',
  });

  const handleDeleteCompany = (companyId: string, companyName: string) => {
    setDeleteStep({
      open: true,
      companyId,
      companyName,
      step: 'warning',
    });
  };

  if (loading) return <div className="p-8 text-center">A carregar dados...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
  {/* Títulos: Centralizados no mobile para economizar espaço horizontal e focar a atenção */}
  <div className="space-y-1">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
      Super Admin Dashboard
    </h1>
    <p className="text-gray-600 text-sm md:text-base">
      Gestão completa da plataforma
    </p>
  </div>

  {/* Container de Botões: Grid no mobile para manter alinhamento perfeito */}
  <div className="grid grid-cols-1 xs:grid-cols-2 lg:flex gap-3 md:gap-4">
    <button
      onClick={() => setShowPlansManager(!showPlansManager)}
      className="flex items-center justify-center gap-2 px-4 py-3 md:px-6 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all active:scale-95 text-sm md:text-base shadow-sm"
    >
      <Settings size={20} className="shrink-0" />
      <span className="truncate">Gerir Planos</span>
    </button>

    <button
      onClick={() => setIsRegisterModalOpen(true)}
      className="flex items-center justify-center gap-2 px-4 py-3 md:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all active:scale-95 text-sm md:text-base shadow-sm"
    >
      <Building2 size={20} className="shrink-0" />
      <span className="truncate">Nova Empresa</span>
    </button>
  </div>
</header>

      {/* Alternar entre Dashboard e Gestor de Planos */}
      {showPlansManager ? (
        <SubscriptionPlansManager />
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Empresas</p>
                  <p className="text-2xl font-bold">{companies.length}</p>
                </div>
                <Building2 className="text-blue-600" size={32} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Utilizadores totais</p>
                  <p className="text-2xl font-bold">{summary.totalUsers || 0}</p>
                </div>
                <Users className="text-indigo-600" size={32} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Clientes registados</p>
                  <p className="text-2xl font-bold">{summary.totalClients || 0}</p>
                </div>
                <UserCheck className="text-green-600" size={32} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Parceiros activos</p>
                  <p className="text-2xl font-bold">{summary.totalPartners || 0}</p>
                </div>
                <DollarSign className="text-amber-600" size={32} />
              </div>
            </div>
          </div>

          {/* Tabela de Empresas */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Empresas Registadas</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscrição</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Utilizadores</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Clientes</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Parceiros</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Média Mensal (MT)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Criada</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCompanies.map((comp) => (
                    <tr
                      key={comp._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCompany(comp)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{comp.name}</div>
                        <div className="text-sm text-gray-500">{comp.email}</div>
                        {comp.slug && <div className="text-xs text-blue-600 mt-1">/{comp.slug}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            comp.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {comp.subscription.plan}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Até {format(new Date(comp.subscription.endsAt), 'dd MMM yyyy', { locale: pt })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">{comp.usersCount}</td>
                      <td className="px-6 py-4 text-center">{comp.clientsCount}</td>
                      <td className="px-6 py-4 text-center">{comp.partnersCount}</td>
                      <td className="px-6 py-4 text-right font-medium">
                        {comp.avgMonthlyProduction.toLocaleString('pt-MZ')} MT
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        {format(new Date(comp.createdAt), 'dd/MM/yy')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(comp);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Editar plano"
                        >
                          <Edit size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="px-6 py-4 flex items-center justify-between border-t bg-gray-50">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-md disabled:opacity-50 flex items-center gap-1"
              >
                <ChevronLeft size={18} /> Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-md disabled:opacity-50 flex items-center gap-1"
              >
                Próxima <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

    {/* Modal de edição de plano */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 text-white">
              <h3 className="text-lg font-semibold">
                Alterar Plano – {editModal.companyName}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plano</label>
                <select
                  value={editModal.newPlanId}
                  onChange={(e) => setEditModal(prev => ({ ...prev, newPlanId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione um plano</option>
                  {plans.map((plan: any) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {plan.price.toLocaleString('pt-MZ')} MT
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período de compromisso</label>
                <select
                  value={editModal.months}
                  onChange={(e) => setEditModal(prev => ({ ...prev, months: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 Mês</option>
                  <option value={3}>3 Meses</option>
                  <option value={6}>6 Meses</option>
                  <option value={12}>12 Meses (Anual)</option>
                  <option value={0}>Personalizado</option>
                </select>
              </div>

              {editModal.months === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantos meses?</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={editModal.customMonths}
                    onChange={(e) => setEditModal(prev => ({ ...prev, customMonths: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setEditModal(prev => ({ ...prev, open: false }))}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdatePlan}
                  disabled={editModal.updating}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {editModal.updating && <Loader2 size={16} className="animate-spin" />}
                  Confirmar Alteração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onDelete={handleDeleteCompany}   // ← aqui está a correção principal
        />
      )}
          {/* Debug temporário */}
{isRegisterModalOpen && (
        <CompanyRegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={() => {
            fetchData();
            toast.success('Empresa criada com sucesso!');
          }}
        />
      )}
      {deleteStep.open && (
  <>
    {/* Primeiro modal: Aviso geral */}
    {deleteStep.step === 'warning' && (
      <ConfirmDeleteModal
        isOpen={true}
        title="Atenção: Eliminação Permanente"
        message={`Tem a certeza que deseja ELIMINAR permanentemente a empresa "${deleteStep.companyName}"?\n\nEsta ação:\n• Apaga todos os utilizadores, clientes e parceiros associados\n• Remove todas as vendas, leads e dados relacionados\n• Não pode ser desfeita`}
        confirmText="CONTINUAR"
        onConfirm={() =>
          setDeleteStep(prev => ({ ...prev, step: 'confirm' }))
        }
        onCancel={() => setDeleteStep(prev => ({ ...prev, open: false }))}
      />
    )}

    {/* Segundo modal: Confirmação com digitação */}
    {deleteStep.step === 'confirm' && (
      <ConfirmDeleteModal
        isOpen={true}
        title="Confirmação Final"
        message={`Para eliminar "${deleteStep.companyName}", digite "ELIMINAR" no campo abaixo.`}
        confirmText="ELIMINAR"
        onConfirm={async () => {
          try {
            await api.request(`/admin/companies/${deleteStep.companyId}`, {
              method: 'DELETE',
            });
            toast.success('Empresa eliminada com sucesso');

            const res = await api.request<any>('/admin/companies/overview');
            setCompanies(res.companies || []);
            setSummary(res.summary || {});

            setSelectedCompany(null);
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao eliminar empresa');
            console.error(err);
          } finally {
            setDeleteStep({ open: false, companyId: null, companyName: '', step: 'warning' });
          }
        }}
        onCancel={() => setDeleteStep(prev => ({ ...prev, open: false }))}
      />
    )}

  
  </>
  
  )}
    </div>
  );
};

export default SuperAdminDashboard;