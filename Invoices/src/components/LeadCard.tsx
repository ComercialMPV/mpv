import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead, leadsApi, LeadStage } from '../services/api';
import { useState, useRef } from 'react';
import { Edit, Trash2, CheckCircle, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

// Importa STAGES (podes importar do LeadsBoard ou definir aqui)
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

interface LeadCardProps {
  lead: Lead;
  isMobile: boolean;
  onEdit: (lead: Lead) => void;
  onConvert?: (leadId: string) => void;
  onDeleteSuccess?: () => void;
  isSelected: boolean;
  convertedTo?: string; // ID do cliente para o qual foi convertido, se aplicável
  onToggleSelect: () => void;
  onStageChange?: (leadId: string, newStage: LeadStage) => void; // ← função para mudar estágio
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isMobile,
  onEdit,
  onConvert,
  onDeleteSuccess,
  isSelected,
  convertedTo,
  onToggleSelect,
  onStageChange,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lead._id!,
    disabled: isMobile ? !isPressed : false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Long press para ativar drag no mobile
  const handleTouchStart = () => {
    if (!isMobile) return;
    pressTimer.current = setTimeout(() => {
      setIsPressed(true);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setIsPressed(false);
  };

  // Clique no card → editar (exceto se for no checkbox ou botões)
  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;

    // Ignora se clicou no checkbox, select ou botões de ação
    if (
      target.closest('button') ||
      target.closest('select') ||
      target.closest('input[type="checkbox"]')
    ) {
      return;
    }

    if (isMobile && isPressed) return;

    onEdit(lead);
  };

  // Handler local para mudança de estágio
  const handleStageChangeLocal = (newStage: LeadStage) => {
    if (onStageChange && lead._id) {
      onStageChange(lead._id, newStage);
    }
  };

  // Deletar lead
  const handleDelete = async () => {
    try {
      await leadsApi.delete(lead._id!);
      toast.success('Lead removido com sucesso');
      setShowDeleteConfirm(false);
      onDeleteSuccess?.();
    } catch (err: any) {
      console.error('Erro ao deletar lead:', err);
      toast.error('Não foi possível remover o lead');
    }
  };

  const handleConvertAction = () => {
    if (onConvert) {
      onConvert(lead._id!);
      setShowConvertConfirm(false);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...(isMobile ? {} : { ...attributes, ...listeners })}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleCardClick}
        className={`
          relative bg-white p-4 rounded-xl shadow-sm border 
          transition-all duration-200 select-none group
          ${isSelected 
            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-300/70' 
            : 'hover:shadow-md hover:border-blue-200 active:scale-[0.98]'}
          ${isPressed ? 'scale-105 shadow-2xl ring-2 ring-blue-400 z-10' : ''}
          ${lead.convertedTo ? 'opacity-60 bg-gray-100 border-dashed' : ''}
        `}
      >
        {/* Checkbox de seleção – canto superior esquerdo */}
        <div className="absolute top-3 left-3 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={`
              p-1 rounded-full transition-colors
              ${isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
            `}
          >
            {isSelected ? (
              <CheckSquare size={22} className="drop-shadow-sm" />
            ) : (
              <Square size={22} />
            )}
          </button>
        </div>

        <div className="flex justify-between items-start gap-3 pl-10">
          {/* Informações principais */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{lead.name}</p>
            <p className="text-sm text-gray-600 truncate">{lead.email || '—'}</p>
            {lead.phone && <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>}
            {lead.notes && (
              <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                {lead.notes}
              </p>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(lead);
              }}
              className="p-2 hover:bg-blue-50 rounded-full transition-colors"
              title="Editar lead"
            >
              <Edit size={18} className="text-blue-600" />
            </button>

            {lead.stage !== 'won' && onConvert && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConvertConfirm(true);
                }}
                className="p-2 hover:bg-green-50 rounded-full transition-colors"
                title="Converter em cliente"
              >
                <CheckCircle size={18} className="text-green-600" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
              title="Eliminar lead"
            >
              <Trash2 size={18} className="text-red-600" />
            </button>
          </div>
        </div>

        {/* Footer com select de estágio */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Alterar estágio
          </label>
          <select
            value={lead.stage || ''}
            onChange={(e) => handleStageChangeLocal(e.target.value as LeadStage)}
            className="
              w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              bg-white shadow-sm hover:border-gray-400 transition-colors
              cursor-pointer
            "
          >
            {STAGES.map((stageOption) => (
              <option key={stageOption.id} value={stageOption.id}>
                {stageOption.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal de Confirmação de CONVERSÃO */}
      {showConvertConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              Converter Lead?
            </h3>
            <p className="text-gray-600 mb-6 text-sm text-center">
              Deseja converter <strong>{lead.name}</strong> em cliente?<br />
              Isso moverá o registro para o estágio final de vendas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertConfirm(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
              >
                Agora não
              </button>
              <button
                onClick={handleConvertAction}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-lg shadow-blue-200"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Eliminar Lead?</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja remover <strong>{lead.name}</strong>?<br />
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};