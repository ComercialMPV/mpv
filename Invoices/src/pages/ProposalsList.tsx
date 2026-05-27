// src/pages/ProposalsList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Loader2, Mail, Calendar, CheckCircle, XCircle, Eye, 
  Edit, Trash2, Send, AlertTriangle, RefreshCw, 
  Clock, Users, Link2, FileText 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const ProposalsList = () => {
  const { user } = useAuth(); // assume user.role.roleName e user._id
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // Confirmação de delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      setUpdating(true);

      const data = await api.request('/proposals', { method: 'GET' });
      setProposals(data.proposals || data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar propostas');
      setError('Não foi possível carregar as propostas enviadas.');
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  const formatDateRelative = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000 / 60 / 60 / 24);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return `${diff} dias atrás`;
  };
// ← ADICIONA ESTA LINHA AQUI (ou logo após os estados)
  const visibleProposals = proposals.filter(p => 
    user.role?.roleName === 'superadmin' || 
    user.role?.roleName === 'admin' || 
    p.createdBy?._id === user._id
  );
  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-blue-100 text-blue-800 border-blue-300',
      opened: 'bg-green-100 text-green-800 border-green-300',
      bounced: 'bg-red-100 text-red-800 border-red-300',
      partial_opened: 'bg-purple-100 text-purple-800 border-purple-300',
      draft: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    const labels = {
      sent: 'Enviada',
      opened: 'Aberta',
      bounced: 'Devolvida',
      partial_opened: 'Parcialmente aberta',
      draft: 'Rascunho'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleEditClick = (p) => {
    setEditingProposal(p);
    setEditSubject(p.subject || '');
    setEditMessage(p.message || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProposal) return;
    try {
      await api.request(`/proposals/${editingProposal._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          subject: editSubject.trim(),
          message: editMessage.trim()
        })
      });
      toast.success('Proposta atualizada');
      setEditModalOpen(false);
      fetchProposals(); // refresh
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.request(`/proposals/${id}`, { method: 'DELETE' });
      toast.success('Proposta eliminada');
      setProposals(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      toast.error('Erro ao eliminar');
    }
    setDeleteConfirm(null);
  };

  const handleResend = async (id) => {
    try {
      await api.request(`/proposals/${id}/resend`, { method: 'POST' });
      toast.success('Proposta re-enviada');
      fetchProposals();
    } catch (err) {
      toast.error('Erro ao re-enviar');
    }
  };

return (
  <div className="min-h-screen bg-gray-50/50 pb-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Propostas & Promoções
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            {visibleProposals.length} {visibleProposals.length === 1 ? 'proposta enviada' : 'propostas enviadas'}
          </p>
        </div>
        <button
          onClick={fetchProposals}
          disabled={updating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 text-gray-700 font-semibold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={18} className={updating ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-80 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-500 animate-pulse">Carregando dados...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-red-900 font-bold text-lg">Erro ao carregar</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      ) : visibleProposals.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Nenhuma proposta encontrada</h2>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            As propostas enviadas aparecerão aqui com estatísticas de visualização.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* DESKTOP TABLE VIEW (Visible on md and up) */}
          <div className="hidden md:block overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Documento / Assunto</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Cliques</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data / Expira</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleProposals.map((p) => {
                  const openedCount = p.recipients.filter(r => r.openedAt).length;
                  const totalRecipients = p.recipients.length;
                  const canEdit = user.role?.roleName === 'superadmin' || user.role?.roleName === 'admin' || p.createdBy?._id === user._id;

                  return (
                    <tr key={p._id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 line-clamp-1">{p.subject}</span>
                          <span className="text-xs text-gray-400 font-mono mt-0.5 uppercase tracking-tighter">
                            {p.document?.number || 'PROP-XXXXXX'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-semibold text-gray-700">{openedCount}/{totalRecipients}</span>
                          <div className="w-12 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${(openedCount / totalRecipients) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-medium">{formatDateRelative(p.sentAt)}</div>
                        <div className="text-xs text-gray-400">Expira: {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('pt-MZ') : '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <a href={`/share/${p.shareToken}`} target="_blank" rel="noopener noreferrer" 
                             className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver">
                            <Eye size={18} />
                          </a>
                          <button onClick={() => handleResend(p._id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Reenviar">
                            <Send size={18} />
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => handleEditClick(p)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => setDeleteConfirm(p._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW (Visible on small screens) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {visibleProposals.map((p) => {
              const openedCount = p.recipients.filter(r => r.openedAt).length;
              const canEdit = user.role?.roleName === 'superadmin' || user.role?.roleName === 'admin' || p.createdBy?._id === user._id;

              return (
                <div key={p._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm active:ring-2 active:ring-blue-100 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[70%]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.document?.number || 'PROP-XXXXXX'}</span>
                      <h3 className="font-bold text-gray-900 leading-tight mt-0.5">{p.subject}</h3>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 mb-5 py-3 border-y border-gray-50">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={14} className="text-gray-400" />
                      {formatDateRelative(p.sentAt)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Eye size={14} className="text-gray-400" />
                      {openedCount} de {p.recipients.length} lidos
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={`/share/${p.shareToken}`} target="_blank" rel="noopener noreferrer"
                       className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform">
                      <Eye size={16} /> Ver
                    </a>
                    <button onClick={() => handleResend(p._id)}
                       className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold active:scale-95 transition-transform">
                      <Send size={16} /> Reenviar
                    </button>
                    {canEdit && (
                       <button onClick={() => setDeleteConfirm(p._id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                         <Trash2 size={18} />
                       </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {/* (Preserving your logic for Edit and Delete Modals, just improving the UI/Rounded corners) */}
      {editModalOpen && editingProposal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-900">Editar Proposta</h2>
               <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assunto do Email</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  placeholder="Assunto da proposta..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mensagem Personalizada</label>
                <textarea
                  value={editMessage}
                  onChange={e => setEditMessage(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="Escreva aqui..."
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button onClick={() => setEditModalOpen(false)} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveEdit} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tem certeza?</h2>
            <p className="text-gray-500 mb-8">Esta ação removerá a proposta permanentemente e não pode ser desfeita.</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100">
                Sim, Eliminar Proposta
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
                Não, Manter Proposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};