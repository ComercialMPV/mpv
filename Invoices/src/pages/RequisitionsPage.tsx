import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequisitionForm } from '../components/RequisitionForm';
import { api, Requisition } from '../services/api';
import { 
  Eye, Edit2, Trash2, X, FileText,
  Filter, Globe, Package, UserCog, ChevronRight,
  FileSignature, CreditCard, Clock, CheckCircle, XCircle, Ban,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

type OriginFilter = 'all' | 'internal' | 'external';

export const RequisitionsPage: React.FC = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [editingReq, setEditingReq] = useState<Requisition | null>(null);
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const navigate = useNavigate();

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await api.requisitions.getAll();
      const data = Array.isArray(response) ? response : (response as any).requisitions || [];
      setRequisitions(data);
    } catch (error) {
      toast.error('Erro ao carregar requisições');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequisitions(); }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await api.requisitions.updateStatus(id, newStatus);
      toast.success(`Estado alterado para: ${newStatus.replace(/_/g, ' ')}`);
      fetchRequisitions();
    } catch (error) {
      toast.error('Erro ao atualizar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja excluir esta requisição?')) return;
    try {
      await api.requisitions.delete(id);
      toast.success('Requisição removida');
      fetchRequisitions();
    } catch (error) {
      toast.error('Erro ao eliminar');
    }
  };

  const getRequestTypeLabel = (req: Requisition) => {
    // Ajuste o nome do campo conforme o que definiu no modelo/backend
    const intent = (req as any).requestIntent || (req as any).requestType || 'quotation';
    return intent === 'invoice' 
      ? { label: 'Fatura / Pagamento', color: 'bg-purple-100 text-purple-800', icon: CreditCard }
      : { label: 'Cotação / Orçamento', color: 'bg-amber-100 text-amber-800', icon: FileSignature };
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending:           { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      quotation_requested: { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: FileSignature },
      invoice_requested:   { bg: 'bg-purple-100',  text: 'text-purple-800',  icon: CreditCard },
      approved:          { bg: 'bg-green-100',  text: 'text-green-800',  icon: CheckCircle },
      rejected:          { bg: 'bg-red-100',    text: 'text-red-800',    icon: XCircle },
      converted_to_quotation: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FileText },
      converted_to_invoice:   { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: CreditCard },
    };

    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: Ban };
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    );
  };

  const filteredRequisitions = requisitions.filter(req => {
    const origin = (req as any).origin || 'internal';
    if (originFilter === 'all') return true;
    return origin === originFilter;
  });

  // Função auxiliar para calcular total quando finalTotal/baseTotal não estiverem preenchidos
const calculateTotalFromItems = (req: Requisition): number => {
  if (!req.items || !Array.isArray(req.items)) return 0;

  return req.items.reduce((sum: number, item: any) => {
    let price = 0;
    const itemDoc = item.item || {};

    if (item.itemType === 'Bundle' && itemDoc) {
      price = itemDoc.type === 'Subscription' 
        ? (itemDoc.billingPricePerCycle || itemDoc.price || 0)
        : (itemDoc.price || 0);
    } else {
      price = item.priceAtTime || itemDoc.basePrice || itemDoc.price || 0;
    }

    return sum + (price * (item.quantity || 1));
  }, 0);
};

  return (
    <div className="p-2 lg:p-6 md:p-4 sm:p-2 max-w-7xl mx-auto">
     <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
  {/* Title and Description */}
  <div className="w-full lg:w-auto">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
      Requisições
    </h1>
    <p className="text-sm md:text-base text-gray-500 mt-1">
      Gestão de pedidos internos e externos
    </p>
  </div>
  
  {/* Controls Area */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
    
    {/* Segmented Filter Control */}
    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
      {(['all', 'internal', 'external'] as const).map(f => (
        <button
          key={f}
          onClick={() => setOriginFilter(f)}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wide transition-all active:scale-95 ${
            originFilter === f 
              ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          {f === 'all' ? 'Todas' : f === 'internal' ? 'Internas' : 'Externas'}
        </button>
      ))}
    </div>

    {/* Primary Action Button */}
    <button
      onClick={() => { setShowForm(!showForm); setEditingReq(null); }}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm ${
        showForm 
          ? 'bg-gray-800 hover:bg-black text-white' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {showForm ? (
        <>
          <X className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Fechar formulário</span>
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Nova requisição</span>
        </>
      )}
    </button>
  </div>
</div>

      {showForm && (
        <div className="mb-10">
          <RequisitionForm 
            initialData={editingReq} 
            onSuccess={() => {
              setShowForm(false);
              setEditingReq(null);
              fetchRequisitions();
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  {/* Desktop View: Traditional Table (Hidden on Mobile) */}
  <div className="hidden lg:block overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Número</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Origem</th>
          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {loading ? (
          <tr>
            <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">A carregar requisições...</td>
          </tr>
        ) : filteredRequisitions.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Nenhuma requisição encontrada</td>
          </tr>
        ) : (
          filteredRequisitions.map(req => {
            const typeInfo = getRequestTypeLabel(req);
            const TypeIcon = typeInfo.icon;
            return (
              <tr key={req._id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{req.number || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(req.client as any)?.name || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                    <TypeIcon className="w-3.5 h-3.5" /> {typeInfo.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status || 'pending')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (req as any).origin === 'external' ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {(req as any).origin === 'external' ? <Globe className="w-3 h-3 mr-1" /> : <UserCog className="w-3 h-3 mr-1" />}
                    {(req as any).origin || 'internal'}
                  </span>
                </td>
               <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                {(req.finalTotal || req.baseTotal || calculateTotalFromItems(req)).toFixed(2)} {req.currency || 'MT'}
              </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedReq(req)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={18}/></button>
                    <button onClick={() => { setEditingReq(req); setShowForm(true); }} disabled={['converted_to_invoice', 'rejected'].includes(req.status || '')} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-30"><Edit2 size={18}/></button>
                    <button onClick={() => handleDelete(req._id!)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>

  {/* Mobile View: Data Cards (Visible on Mobile/Tablet) */}
  <div className="lg:hidden divide-y divide-gray-100">
    {loading ? (
      <div className="p-10 text-center text-gray-500 italic">A carregar...</div>
    ) : filteredRequisitions.length === 0 ? (
      <div className="p-10 text-center text-gray-500">Nenhuma requisição.</div>
    ) : (
      filteredRequisitions.map(req => {
        const typeInfo = getRequestTypeLabel(req);
        return (
          <div key={req._id} className="p-4 space-y-4 active:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-600 uppercase">{req.number || 'SEM NÚMERO'}</p>
                <p className="font-bold text-gray-900">{(req.client as any)?.name || 'Cliente Final'}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900">{(req.finalTotal || req.baseTotal || 0).toFixed(2)} {req.currency || 'MT'}</p>
                {getStatusBadge(req.status || 'pending')}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                {(req as any).origin || 'internal'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => setSelectedReq(req)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold active:scale-95 transition-transform">
                <Eye size={16} /> Detalhes
              </button>
              <button 
                onClick={() => { setEditingReq(req); setShowForm(true); }}
                disabled={['converted_to_invoice', 'rejected'].includes(req.status || '')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold active:scale-95 transition-transform disabled:opacity-40"
              >
                <Edit2 size={16} /> Editar
              </button>
              <button onClick={() => handleDelete(req._id!)} className="p-2.5 bg-red-50 text-red-600 rounded-lg active:scale-95 transition-transform">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
</div>
    

      {/* Modal de Tracking Visual */}
     {selectedReq && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      
      {/* Cabeçalho */}
      <div className="sticky top-0 bg-white z-10 border-b px-6 py-5 flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Requisição {selectedReq.number || selectedReq._id?.slice(-8).toUpperCase()}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
            <span>
              Criada em {new Date(selectedReq.createdAt || Date.now()).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span>•</span>
            <span className={`
              px-2.5 py-0.5 rounded-full text-xs font-medium
              ${(selectedReq as any).requestIntent === 'invoice' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-amber-100 text-amber-800'}
            `}>
              {(selectedReq as any).requestIntent === 'invoice' 
                ? 'Pretende Fatura' 
                : 'Pretende Cotação'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setSelectedReq(null)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="p-6 space-y-8">
        
        {/* Informações principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Cliente</div>
            <div className="font-medium">{(selectedReq.client as any)?.name || '—'}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Estado Atual</div>
            <div className="mt-1">{getStatusBadge(selectedReq.status || 'pending')}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Parcelas Pretendidas</div>
            <div className="font-medium text-lg">{selectedReq.requestedInstallments || 1}×</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Valor Total Estimado</div>
           <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Valor Total Estimado</div>
          <div className="font-bold text-xl text-blue-700">
            {(selectedReq.finalTotal || selectedReq.baseTotal || calculateTotalFromItems(selectedReq)).toFixed(2)} 
            {selectedReq.currency || 'MT'}
          </div>
        </div>
          </div>
        </div>

        {/* Serviços */}
    <div>
  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
    <Package className="w-5 h-5 text-blue-600" />
    Itens Solicitados
  </h3>

  {selectedReq.items?.length > 0 ? (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Qtd
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preço unitário
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
   {selectedReq.items?.map((item: any, index: number) => {
  const itemDoc = item.item || {};
  
  const itemName = itemDoc?.name || 
                   itemDoc?.title || 
                   (typeof item.item === 'string' ? `ID: ${item.item.slice(-8)}` : '—');

  // Lógica de preço inteligente para Bundle
  let unitPrice = item.priceAtTime || 0;

  if (item.itemType === 'Bundle' && itemDoc) {
    if (itemDoc.type === 'Subscription' || item.bundlePriceType === 'billingPricePerCycle') {
      unitPrice = itemDoc.billingPricePerCycle || itemDoc.price || unitPrice;
    } else {
      unitPrice = itemDoc.price || unitPrice;
    }
  } else if (!unitPrice) {
    // Fallback para outros tipos
    unitPrice = itemDoc.basePrice || itemDoc.price || 0;
  }

  const quantity = Number(item.quantity) || 1;
  const subtotal = unitPrice * quantity;

  const typeMap: any = {
    Service: { label: 'Serviço', class: 'bg-blue-100 text-blue-800' },
    Product: { label: 'Produto', class: 'bg-emerald-100 text-emerald-800' },
    Bundle:  { label: itemDoc.type === 'Subscription' ? 'Subscrição' : 'Combo', 
               class: itemDoc.type === 'Subscription' ? 'bg-purple-100 text-purple-800' : 'bg-violet-100 text-violet-800' }
  };

  const currentType = typeMap[item.itemType] || { label: 'Outro', class: 'bg-gray-100 text-gray-700' };
  return (
    <tr key={index} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${currentType.class}`}>
          {currentType.label}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        <div className="flex flex-col">
          <span>{itemName}</span>
          {/* Opcional: Mostrar categoria se for produto */}
          {itemDoc.category && (
            <span className="text-[10px] text-gray-400 font-normal uppercase">
              {itemDoc.category}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
        {quantity}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
        {unitPrice.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {selectedReq.currency || 'MT'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
        {subtotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {selectedReq.currency || 'MT'}
      </td>
    </tr>
  );
})}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <Package className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-3 text-base font-medium text-gray-600">
        Nenhum item nesta requisição
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Esta requisição não contém serviços, produtos ou combos associados.
      </p>
    </div>
  )}
</div>

        {/* Notas */}
        {selectedReq.notes && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Observações / Notas</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm text-gray-700">
              {selectedReq.notes}
            </div>
          </div>
        )}

        {/* Fluxo / Timeline (mantido mas melhorado visualmente) */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Fluxo da Requisição</h3>
          <div className="pl-8 space-y-6 relative">
            {[
              { id: 'pending', label: 'Requisição Recebida', desc: 'Aguardando revisão inicial' },
              { id: 'approved', label: 'Aprovada', desc: 'Aprovada internamente – pronta para conversão' },
              { id: 'converted_to_quotation', label: 'Cotação Gerada', desc: 'Orçamento enviado ao cliente' },
              { id: 'converted_to_invoice', label: 'Fatura Emitida', desc: 'Documento final gerado e enviado' },
            ].map((step, idx, arr) => {
              const isCurrentOrPast = 
                arr.findIndex(s => s.id === selectedReq.status) >= idx ||
                (selectedReq.status === 'quotation_requested' && step.id === 'approved') ||
                (selectedReq.status === 'invoice_requested' && step.id === 'approved');

              return (
                <div key={step.id} className="relative flex gap-4">
                  {idx < arr.length - 1 && (
                    <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 -ml-px ${isCurrentOrPast ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                    isCurrentOrPast 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCurrentOrPast ? <CheckCircle className="w-5 h-5" /> : <div className="w-3 h-3 bg-current rounded-full" />}
                  </div>
                  <div className="pt-1">
                    <p className={`font-semibold ${isCurrentOrPast ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-sm text-gray-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="sticky bottom-0 bg-white border-t px-6 py-5 flex flex-wrap gap-3 justify-end">
        {selectedReq.status === 'pending' && (
          <>
            <button
              onClick={() => {
                if (window.confirm('Tem certeza que deseja rejeitar esta requisição?')) {
                  handleStatusUpdate(selectedReq._id!, 'rejected');
                  setSelectedReq(null);
                }
              }}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg border border-red-200 transition flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Rejeitar
            </button>

            <button
              onClick={() => {
                handleStatusUpdate(selectedReq._id!, 'approved');
                setSelectedReq(null);
              }}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Aprovar
            </button>
          </>
        )}

        {(selectedReq.status === 'approved' || selectedReq.status === 'quotation_requested') && (
          <button
            onClick={() => navigate(`/documents/new?type=quotation&req=${selectedReq._id}`)}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow transition flex items-center gap-2"
          >
            <FileSignature className="w-5 h-5" />
            Converter para Cotação
          </button>
        )}

        {(selectedReq.status === 'approved' || selectedReq.status === 'invoice_requested') && (
          <button
            onClick={() => navigate(`/documents/new?type=invoice&req=${selectedReq._id}`)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition flex items-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Gerar Fatura
          </button>
        )}

        <button
          onClick={() => setSelectedReq(null)}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
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

