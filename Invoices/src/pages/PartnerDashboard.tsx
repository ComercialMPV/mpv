import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi, leadsApi, api } from '../services/api';
import { PartnerStatsCards } from '../components/PartnerStatsCards';
import { PartnerSalesTable } from '../components/PartnerSalesTable';
import { PartnerLeadsTracker } from '../components/PartnerLeadsTracker';
import { Plus, Link as LinkIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
interface PartnerGoalsProgress {
  monthlySalesGoal: number;
  currentMonthSales: number;
  monthlyLeadsGoal: number;
  currentMonthLeads: number;
}
export const PartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Paginação da tabela de vendas
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [data, setData] = useState<{
    stats: any;
    sales: any[];
    leads: any[];
  }>({ stats: null, sales: [], leads: [] });
  // Novo estado para metas e progresso (só o necessário para o card)
  const [goalsProgress, setGoalsProgress] = useState<{
    monthlySalesGoal: number;
    currentMonthSales: number;
    monthlyLeadsGoal: number;
    currentMonthLeads: number;
  } | null>(null);

 useEffect(() => {
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statsRes, leadsRes, salesRes, goalsRes] = await Promise.all([
        salesApi.getPartnerStats(),
        leadsApi.getAll({}),
        salesApi.getAll({}),
        // ← este é o quarto
        salesApi.getPartenerTargets(),  // ← este é o quinto
      ])as [
        any, // stats
        any[], // leads
        any[], // sales
        PartnerGoalsProgress // ← tipo explícito aqui!
      ];

      const rawSales = Array.isArray(salesRes) ? salesRes : salesRes?.sales || [];

      const partnerRate = user?.commissionRate || 0;

      const enrichedSales = rawSales.map((sale: any) => {
        const rate = sale.commissionRate || partnerRate;
        const value = sale.commissionValue || (sale.total * (rate / 100));
        return {
          ...sale,
          commissionRate: rate,
          commissionValue: value,
        };
      });

      setData({
        stats: statsRes,
        sales: enrichedSales,
        leads: (Array.isArray(leadsRes) ? leadsRes : []).filter((l: any) =>
          l.stage && ['new', 'contacted', 'negotiation', 'pending'].includes(l.stage)
        ),
      });

      // Define metas e progresso
      setGoalsProgress({
        monthlySalesGoal: goalsRes.monthlySalesGoal || 0,
        currentMonthSales: goalsRes.currentMonthSales || 0,
        monthlyLeadsGoal: goalsRes.monthlyLeadsGoal || 0,
        currentMonthLeads: goalsRes.currentMonthLeads || 0,
      });

    } catch (error) {
      console.error('Erro ao carregar dados do parceiro', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  loadDashboardData();
}, [user]);

  const handleCopyReferralLink = async () => {
    if (!user?._id) {
      toast.error('Usuário não identificado.');
      return;
    }
    const referralLink = `${window.location.origin}/register?ref=${user._id}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Link de referência copiado!');
    } catch (err) {
      toast.error('Falha ao copiar link.');
    }
  };

  const handleAddNewLead = () => {
    navigate('/leads', { state: { openModal: true } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const statsForCards = {
    totalSales: data.stats?.totalSales || 0,
    totalCommission: data.stats?.totalCommission || 0,
    activeClients: data.stats?.totalSalesCount || 0,
    commissionRate: data.stats?.commissionRate || user?.commissionRate || 0,
  };
// Cálculo de progresso das metas (para o novo card)
  const salesProgress = goalsProgress?.monthlySalesGoal
    ? Math.min(100, Math.round((goalsProgress.currentMonthSales / goalsProgress.monthlySalesGoal) * 100))
    : 0;

  const leadsProgress = goalsProgress?.monthlyLeadsGoal
    ? Math.min(100, Math.round((goalsProgress.currentMonthLeads / goalsProgress.monthlyLeadsGoal) * 100))
    : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  // Paginação simples
  const totalPages = Math.ceil(data.sales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = data.sales.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-2 sm:p-2 lg:p-2 bg-slate-50 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Painel do Parceiro</h1>
          <p className="text-slate-500 text-sm sm:text-base">
            Acompanhe as suas vendas e comissões em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopyReferralLink}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
          >
            <LinkIcon size={18} /> Copiar Link
          </button>
          <button
            onClick={handleAddNewLead}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={18} /> Novo Lead
          </button>
        </div>
      </header>

      {/* Cards de estatísticas – ficam sempre em cima */}
      <div className="mb-6 lg:mb-8">
        <PartnerStatsCards 
  stats={{ 
    ...statsForCards, 
    monthlySalesGoal: goalsProgress?.monthlySalesGoal,
    currentMonthSales: goalsProgress?.currentMonthSales,
    monthlyLeadsGoal: goalsProgress?.monthlyLeadsGoal,
    currentMonthLeads: goalsProgress?.currentMonthLeads,
  }} 
/>
      </div>

      {/* Conteúdo principal – stack vertical no mobile, grid no desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Coluna principal: Vendas (maior espaço) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Minhas Vendas & Comissões</h2>
            </div>

            <PartnerSalesTable sales={paginatedSales} />

            {/* Paginação */}
            {data.sales.length > 0 && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                <span className="text-sm text-slate-600">
                  Página {currentPage} de {totalPages || 1}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral: Leads + dica */}
        <div className="space-y-6">
          {/* Leads com altura limitada no desktop */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Meus Leads em Negociação</h2>
            </div>

            {/* Aqui entra o scroll condicional */}
            <div
              className={`
                ${data.leads.length > 6 ? 'max-h-[420px] lg:max-h-[520px] overflow-y-auto' : ''}
                scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100
              `}
            >
              <PartnerLeadsTracker leads={data.leads} />
            </div>

            {data.leads.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Nenhum lead em progresso no momento.
              </div>
            )}
          </div>

          {/* Card de dica */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 sm:p-6 rounded-xl text-white shadow-xl">
            <h4 className="font-bold text-base sm:text-lg mb-2">Dica de Vendas</h4>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Leads em "Negociação" há mais de 3 dias têm 40% menos chance de fechar. Tente um contacto hoje!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};