import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LeadCard } from './LeadCard';
import { Lead, LeadStage } from '../services/api';
import { AlertCircle, Package, Loader2, CheckSquare, Square } from 'lucide-react';
import React from 'react';

interface ColumnProps {
  stage: { id: string; label: string };
  leads: Lead[];
  isLoading: boolean;
  isMobile: boolean;
  onEdit: (lead: Lead) => void;
  onConvert: (leadId: string) => Promise<void>;
  onDeleteSuccess?: () => void;
  // Seleção múltipla
  selectedLeadIds: Set<string>;
  onToggleSelect: (leadId: string) => void;
  // Nova prop para mudança de estágio via select no card
  onStageChange?: (leadId: string, newStage: LeadStage) => void;
}

export const Column: React.FC<ColumnProps> = ({
  stage,
  leads,
  isLoading,
  isMobile,
  onEdit,
  onConvert,
  onDeleteSuccess,
  selectedLeadIds,
  onToggleSelect,
  onStageChange,
}) => {
  const { setNodeRef } = useDroppable({ id: stage.id });

  // Verifica se TODOS os leads desta coluna estão selecionados
  const allSelectedInColumn =
    leads.length > 0 && leads.every((lead) => lead._id && selectedLeadIds.has(lead._id));

  // Alterna a seleção de todos os leads desta coluna
  const handleSelectAllInColumn = () => {
    if (allSelectedInColumn) {
      // Desmarcar todos desta coluna
      leads.forEach((lead) => {
        if (lead._id) onToggleSelect(lead._id);
      });
    } else {
      // Marcar todos desta coluna (sem duplicar)
      leads.forEach((lead) => {
        if (lead._id && !selectedLeadIds.has(lead._id)) {
          onToggleSelect(lead._id);
        }
      });
    }
  };

  return (
    <div
      ref={setNodeRef}
      aria-label={`Coluna ${stage.label}`}
      className={`
        bg-gray-50/70 backdrop-blur-sm 
        p-4 sm:p-5 
        rounded-2xl 
        w-full sm:w-80 lg:w-96 
        flex-shrink-0 
        flex flex-col 
        gap-4 
        border border-gray-200/80 
        min-h-[400px] sm:min-h-[500px]
        shadow-sm hover:shadow-md transition-shadow
      `}
    >
      {/* Header fixo */}
      <div
        className="
          flex items-center justify-between 
          sticky top-0 
          bg-gray-50/90 backdrop-blur-sm 
          py-3 px-1 
          z-10 
          border-b border-gray-200/50
        "
      >
        <div className="flex items-center gap-2">
          {/* Checkbox de "seleccionar tudo" da coluna */}
          {leads.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={handleSelectAllInColumn}
              className="p-1 -ml-1 rounded hover:bg-gray-200/70 transition"
              title={allSelectedInColumn ? 'Desmarcar todos' : 'Seleccionar todos'}
            >
              {allSelectedInColumn ? (
                <CheckSquare size={20} className="text-blue-600" />
              ) : (
                <Square size={20} className="text-gray-400" />
              )}
            </button>
          )}

          <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider">
            {stage.label}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="
              bg-blue-100 text-blue-800 
              text-xs font-semibold 
              px-2.5 py-1 
              rounded-full 
              min-w-[2rem] text-center
            "
          >
            {leads.length}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm">A carregar leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
          <Package size={40} className="mb-3 opacity-50" />
          <p className="text-sm font-medium">Sem leads nesta etapa</p>
          <p className="text-xs mt-1 opacity-70">Arraste ou crie novos leads aqui</p>
        </div>
      ) : (
        <SortableContext
          items={leads.map((l) => l._id!)}
          strategy={verticalListSortingStrategy}
          disabled={isMobile} // Desativa drag no mobile (select no card é o método principal)
        >
          <div className="flex flex-col gap-3 min-h-[200px]">
            {leads.map((lead) => (
              <LeadCard
                key={lead._id || `fallback-${Math.random()}`}
                lead={lead}
                isMobile={isMobile}
                onEdit={onEdit}
                onConvert={onConvert}
                onDeleteSuccess={onDeleteSuccess}
                // Seleção múltipla
                isSelected={!!lead._id && selectedLeadIds.has(lead._id)}
                onToggleSelect={() => {
                  if (lead._id) onToggleSelect(lead._id);
                }}
                // Mudança de estágio via select
                onStageChange={onStageChange}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
};