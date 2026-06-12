import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { leadsApi, Lead, LeadStage } from '../services/api';
import { Column } from './Column';
import { LeadFormModal } from './LeadFormModal';
import { ShareProposalModal } from './ShareProposalModal';
import { Plus, RefreshCw, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STAGES: { id: LeadStage; label: string }[] = [
  { id: 'new', label: 'Prospecção' },
  { id: 'prospecting', label: 'Prospecção Avançada' },
  { id: 'contacted', label: 'Contactados' },
  { id: 'negotiation', label: 'Em Negociação' },
  { id: 'proposal', label: 'Proposta Enviada' },
  { id: 'pending', label: 'Aguardando' },
  { id: 'won', label: 'Fechado Ganho' },
  { id: 'lost', label: 'Fechado Perdido' },
];

export const LeadsBoard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Seleção múltipla de leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const [showProposalModal, setShowProposalModal] = useState(false);

  const selectedLeadsForProposal = leads.filter((lead) =>
    selectedLeadIds.has(lead._id!)
  );

  const isMobile =
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ────────────────────────────────────────────────
  // Carregar leads
  // ────────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getAll({});
      const activeLeads = data.filter((lead: Lead) => !lead.convertedTo);
      setLeads(activeLeads);
    } catch (err: any) {
      console.error('Erro ao carregar leads:', err);
      setError('Não foi possível carregar o pipeline. Tente novamente.');
      toast.error('Falha ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    const handler = () => loadLeads();
    window.addEventListener('workspaceChanged', handler);
    return () => window.removeEventListener('workspaceChanged', handler);
  }, [loadLeads]);

  // ────────────────────────────────────────────────
  // Handlers de drag & drop
  // ────────────────────────────────────────────────
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const leadId = active.id as string;
    const newStage = over.id as LeadStage;

    // Atualização otimista
    setLeads((prev) =>
      prev.map((lead) =>
        lead._id === leadId ? { ...lead, stage: newStage } : lead
      )
    );

    try {
      if (newStage === 'won') {
        await leadsApi.convert(leadId);
      } else {
        await leadsApi.update(leadId, { stage: newStage }); // ou updateStage se tiver rota específica
      }
      toast.success(`Lead movido para "${STAGES.find(s => s.id === newStage)?.label}"`);
    } catch (err: any) {
      console.error('Falha ao mover lead:', err);
      toast.error('Não foi possível mover o lead');
      loadLeads(); // reverte em caso de erro
    }
  };

  // ────────────────────────────────────────────────
  // Handler para mudança de estágio via select no card
  // ────────────────────────────────────────────────
const handleStageChange = async (leadId: string, newStage: LeadStage) => {
  try {
    // Atualização otimista (sempre)
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead._id === leadId ? { ...lead, stage: newStage } : lead
      )
    );

    if (newStage === 'won') {
      // Usa a mesma função de conversão que já tens
      await convertLead(leadId);
      // Nota: convertLead já remove o lead da lista local
      toast.success('Lead convertido em cliente com sucesso!');
    } else {
      // Apenas atualiza o estágio (estágios normais)
      await leadsApi.update(leadId, { stage: newStage });
      toast.success(`Estágio alterado para "${STAGES.find(s => s.id === newStage)?.label}"`);
    }
  } catch (err: any) {
    console.error('Erro ao atualizar estágio/conversão:', err);
    toast.error('Não foi possível alterar o estágio ou converter o lead');
    loadLeads(); // rollback em caso de erro
  }
};

  // ────────────────────────────────────────────────
  // Handlers de edição, criação e conversão
  // ────────────────────────────────────────────────
  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingLead(null);
    setIsModalOpen(true);
  };
  const convertLead = async (leadId: string) => {
  try {
    // Opcional: estado de loading por lead (se quiseres mostrar spinner no card)
    // setConvertingLeads(prev => new Set([...prev, leadId]));

    await leadsApi.convert(leadId);
    toast.success('Lead convertido em cliente com sucesso!');

    // Remoção local (mais rápido e fluido)
    setLeads(prev => prev.filter(l => l._id !== leadId));

    // Alternativa: se quiseres manter na coluna won com estilo diferente
    // setLeads(prev =>
    //   prev.map(l => l._id === leadId ? { ...l, stage: 'won', isConverted: true } : l)
    // );

  } catch (err: any) {
    console.error('Erro na conversão:', err);
    toast.error('Não foi possível converter o lead');
    // Reverte otimista se necessário
    loadLeads();
  }
  // finally { setConvertingLeads(prev => { const n = new Set(prev); n.delete(leadId); return n; }) }
};
  const handleConvert = async (leadId: string) => {
    try {
      await convertLead(leadId);
      await leadsApi.convert(leadId);
      toast.success('Lead convertido em cliente com sucesso!');
      await loadLeads();
    } catch (err) {
      console.error('Erro ao converter:', err);
      toast.error('Não foi possível converter o lead');
    }
  };



  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleDeleteSuccess = () => {
    loadLeads();
  };

  // ────────────────────────────────────────────────
  // Seleção múltipla
  // ────────────────────────────────────────────────
  const handleToggleSelect = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  // ────────────────────────────────────────────────
  // Colunas derivadas
  // ────────────────────────────────────────────────
  const columns = STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.stage === stage.id),
  }));

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
     <div className="space-y-6 mb-6">
  {/* Header Section */}
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center lg:text-left">
      Pipeline de Vendas
    </h1>

    {/* Actions Group */}
    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
      {/* Secondary Actions: Grid on mobile, flex on desktop */}
      <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
        <button
          onClick={loadLeads}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>

        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition text-sm font-medium shadow-sm"
        >
          <Plus size={18} />
          <span>Novo Lead</span>
        </button>
      </div>

      {/* Primary Action: Full width on mobile, auto on tablet+ */}
      <button
        disabled={selectedLeadIds.size === 0}
        onClick={() => {
          if (selectedLeadIds.size === 0) {
            toast.error('Selecione pelo menos um lead');
            return;
          }
          setShowProposalModal(true);
        }}
        className="bg-green-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto"
      >
        <Mail size={18} />
        <span>
          Enviar Proposta {selectedLeadIds.size > 0 && `(${selectedLeadIds.size})`}
        </span>
      </button>

      {/* Clear Selection: Centered link-style button */}
      {selectedLeadIds.size > 0 && (
        <button
          onClick={clearSelection}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1 py-2 sm:py-0 transition-colors w-full sm:w-auto"
        >
          <X size={16} />
          <span>Limpar seleção</span>
        </button>
      )}
    </div>
  </div>

  {/* Error Message: Spans full width below the header */}
  {error && (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
      {error}
    </div>
  )}
</div>

  

      {/* Loading ou conteúdo */}
      {loading && leads.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          A carregar pipeline...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 min-h-[60vh] sm:min-h-[75vh]">
            {columns.map((column) => (
              <Column
                key={column.id}
                stage={column}
                leads={column.leads}
                isLoading={loading}
                isMobile={isMobile}
                onEdit={handleEdit}
                onConvert={handleConvert}
                onDeleteSuccess={handleDeleteSuccess}
                onStageChange={handleStageChange}          
                selectedLeadIds={selectedLeadIds}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Modal de criação/edição de lead */}
      <LeadFormModal
        isOpen={isModalOpen}
        initialData={editingLead ?? undefined}
        onClose={handleCloseModal}
        onSuccess={() => {
          loadLeads();
        }}
      />

      {/* Modal de envio de proposta */}
      {showProposalModal && (
        <ShareProposalModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          initialSelected={selectedLeadsForProposal}
          mode="leads"
        />
      )}
    </div>
  );
};