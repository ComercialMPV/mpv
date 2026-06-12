import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Copy, Check, X, LogIn, Send, Trash2,
  ChevronRight, Building2, Mail, Phone, DollarSign,
  FileText, Target, ShoppingCart, Eye, BarChart3,
  RefreshCw, Link2, ExternalLink
} from 'lucide-react';
import { groupsApi, Group, GroupCompanyDashboard } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const GroupManagement: React.FC = () => {
  const { user } = useAuth();
  const { activeWorkspaceCompanyId, activeWorkspaceCompanyName, switchWorkspace, clearWorkspace } = useWorkspace();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<Record<string, GroupCompanyDashboard>>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupsApi.list();
      setGroups(data);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }
    try {
      await groupsApi.create({ name: newGroupName.trim(), description: newGroupDesc.trim() });
      toast.success('Grupo criado com sucesso');
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await loadGroups();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar grupo');
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      toast.error('Código de convite é obrigatório');
      return;
    }
    try {
      await groupsApi.join(inviteCode.trim());
      toast.success('Entrou no grupo com sucesso');
      setShowJoinModal(false);
      setInviteCode('');
      loadGroups();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao entrar no grupo');
    }
  };

  const handleInvite = async () => {
    if (!selectedGroup || !inviteEmail.trim()) return;
    try {
      await groupsApi.invite(selectedGroup._id, inviteEmail.trim());
      toast.success('Convite enviado com sucesso');
      setShowInviteModal(false);
      setInviteEmail('');
      loadGroupDetail(selectedGroup._id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar convite');
    }
  };

  const handleAcceptInvite = async (groupId: string) => {
    try {
      await groupsApi.acceptInvite(groupId);
      toast.success('Convite aceite');
      loadGroups();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aceitar convite');
    }
  };

  const handleDeclineInvite = async (groupId: string) => {
    try {
      await groupsApi.declineInvite(groupId);
      toast.success('Convite recusado');
      loadGroups();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao recusar convite');
    }
  };

  const handleRemoveMember = async (groupId: string, companyId: string) => {
    if (!window.confirm('Tem a certeza que deseja remover esta empresa do grupo?')) return;
    try {
      await groupsApi.removeMember(groupId, companyId);
      toast.success('Membro removido');
      loadGroupDetail(groupId);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover membro');
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast.success('Código copiado');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Tem a certeza? Esta ação não pode ser desfeita.')) return;
    try {
      await groupsApi.delete(groupId);
      toast.success('Grupo excluído');
      setSelectedGroup(null);
      setExpandedGroup(null);
      loadGroups();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir grupo');
    }
  };

  const loadGroupDetail = async (groupId: string) => {
    try {
      const group = await groupsApi.get(groupId);
      setSelectedGroup(group);
      setExpandedGroup(groupId);
      setGroups(prev => prev.map(g => g._id === groupId ? { ...group, members: group.members } : g));
    } catch (error: any) {
      // Keep expanded view using list data even if detail fetch fails
      setExpandedGroup(groupId);
    }
  };

  const loadDashboardForCompany = async (groupId: string, companyId: string) => {
    try {
      const data = await groupsApi.getCompanyDashboard(groupId, companyId);
      setDashboardData(prev => ({ ...prev, [companyId]: data }));
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar dashboard');
    }
  };

  const getUserRole = (): string | undefined => {
    if (!user?.role) return undefined;
    if (typeof user.role === 'string') return user.role;
    return (user.role as any).roleName;
  };

  const isOwner = (group: Group, companyId: string | undefined): boolean => {
    if (!companyId) return false;
    const ownerId = typeof group.ownerCompany === 'object'
      ? ((group.ownerCompany as any)._id?.toString?.() || (group.ownerCompany as any).toString?.())
      : group.ownerCompany?.toString?.();
    return ownerId === companyId;
  };

  const canManageGroup = (group: Group): boolean => {
    const owned = isOwner(group, myCompanyId);
    if (owned) return true;
    const role = getUserRole();
    return role === 'admin' || role === 'superadmin' || role === 'manager' || role === 'supervisor';
  };

  const myCompanyId = React.useMemo(() => {
    if (!user?.company) return undefined;
    if (typeof user.company === 'string') return user.company;
    const c = user.company as any;
    return c._id?.toString?.() || c.toString?.();
  }, [user?.company]);

  const memberStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ativo' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' },
      declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Recusado' },
      removed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Removido' },
    };
    const c = config[status] || config.pending;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const pendingInvites = groups.filter(g =>
    g.members?.some(m => {
      if (m.status !== 'pending') return false;
      const memberCompanyId = typeof m.company === 'object' ? (m.company as any)._id?.toString?.() : (m.company as any)?.toString?.();
      return memberCompanyId === myCompanyId;
    })
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Active Workspace Banner */}
      {activeWorkspaceCompanyId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Eye className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                A visualizar: <strong>{activeWorkspaceCompanyName}</strong>
              </p>
              <p className="text-xs text-indigo-600">
                Os dados nos ecrãs de Dashboard, Metas, Leads, Rentabilidade mostram dados desta empresa
              </p>
            </div>
          </div>
          <button onClick={clearWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm hover:bg-indigo-50">
            <X className="h-4 w-4" /> Voltar à minha empresa
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Grupos Empresariais
          </h1>
          <p className="text-gray-500 mt-1">Agrupe empresas para visualizar dados consolidados</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <LogIn className="h-4 w-4" /> Entrar num Grupo
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="h-4 w-4" /> Criar Grupo
          </button>
        </div>
      </div>

      {/* Pending Invites Banner */}
      {pendingInvites.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Convites Pendentes</h3>
          <div className="space-y-2">
            {pendingInvites.map(group => (
              <div key={group._id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-100">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-sm">{group.name}</p>
                    <p className="text-xs text-gray-500">
                      {typeof group.ownerCompany === 'object' ? group.ownerCompany.name : 'Grupo'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAcceptInvite(group._id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                    Aceitar
                  </button>
                  <button onClick={() => handleDeclineInvite(group._id)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Nenhum grupo encontrado</h3>
          <p className="text-gray-400 mt-1">Crie um grupo ou entre num existente com um código de convite</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const activeMembers = group.members?.filter(m => m.status === 'active') || [];

            return (
              <div key={group._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => expandedGroup === group._id ? setExpandedGroup(null) : loadGroupDetail(group._id)}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">
                        {activeMembers.length} membro{activeMembers.length !== 1 ? 's' : ''} • Criado por{' '}
                        {typeof group.ownerCompany === 'object' ? group.ownerCompany.name : '—'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedGroup === group._id ? 'rotate-90' : ''}`} />
                </div>

                {expandedGroup === group._id && (
                  <div className="border-t border-gray-100 p-5 space-y-6">
                    {/* Group Info + Invite Code */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {group.description && (
                          <p className="text-sm text-gray-600">{group.description}</p>
                        )}
                        {canManageGroup(group) && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">Código de Convite:</span>
                            <span className="font-mono text-sm font-bold tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                              {group.inviteCode}
                            </span>
                            <button onClick={() => handleCopyCode(group.inviteCode, group._id)}
                              className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-500"
                              title="Copiar código">
                              {copiedIndex === group._id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </div>
                      {canManageGroup(group) && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => { setSelectedGroup(group); setShowInviteModal(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100">
                            <Send className="h-4 w-4" /> Convidar
                          </button>
                          <button onClick={() => handleDeleteGroup(group._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                            <Trash2 className="h-4 w-4" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Members */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Membros</h4>
                      <div className="space-y-2">
                        {/* Owner */}
                        {typeof group.ownerCompany === 'object' && (
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                                {group.ownerCompany.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {group.ownerCompany.name}
                                  <span className="ml-2 text-xs text-blue-600 font-medium">(Criador)</span>
                                </p>
                                <p className="text-xs text-gray-500">{group.ownerCompany.email}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Members */}
                        {group.members?.filter(m => m.status === 'active').map((member, i) => {
                          const companyData = typeof member.company === 'object' ? member.company : null;
                          if (!companyData) return null;
                          const memberId = companyData._id?.toString?.();
                          const ownerId = (group.ownerCompany as any)?._id?.toString?.();
                          if (memberId === ownerId) return null;
                          const isMyCompany = memberId === myCompanyId;

                          return (
                            <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                  {companyData.name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {companyData.name}
                                    {isMyCompany && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                                  </p>
                                  {companyData.email && (
                                    <p className="text-xs text-gray-500 truncate">{companyData.email}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => loadDashboardForCompany(group._id, companyData._id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Ver dados da empresa">
                                  <BarChart3 className="h-4 w-4" />
                                </button>
                                {memberId !== myCompanyId && (
                                  <button onClick={() => switchWorkspace(memberId, companyData.name)}
                                    className={`p-1.5 rounded-lg ${
                                      activeWorkspaceCompanyId === memberId
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                                    }`}
                                    title={activeWorkspaceCompanyId === memberId ? 'Workspace ativo' : 'Alternar para esta empresa'}>
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                {canManageGroup(group) && !isMyCompany && (
                                  <button onClick={() => handleRemoveMember(group._id, memberId)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Remover do grupo">
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Pending invites */}
                        {group.members?.filter(m => m.status === 'pending').map((member, i) => {
                          const companyData = typeof member.company === 'object' ? member.company : null;
                          if (!companyData) return null;
                          return (
                            <div key={`pending-${i}`} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-600">
                                  {companyData.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{companyData.name}</p>
                                  <p className="text-xs text-yellow-600">Convite pendente</p>
                                </div>
                              </div>
                              {canManageGroup(group) && (
                                <button onClick={() => handleRemoveMember(group._id, companyData._id?.toString?.())}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg">
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Company Dashboards */}
                    {Object.keys(dashboardData).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Dados das Empresas</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(dashboardData).map(([cid, data]) => (
                            <div key={cid} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                  {data.company.name?.charAt(0) || '?'}
                                </div>
                                <p className="text-sm font-medium text-gray-900 truncate">{data.company.name}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white rounded-lg p-2">
                                  <span className="text-gray-500">Vendas</span>
                                  <p className="font-semibold text-gray-900">{data.stats.totalSales}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2">
                                  <span className="text-gray-500">Hoje</span>
                                  <p className="font-semibold text-gray-900">{data.stats.todaySales}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2">
                                  <span className="text-gray-500">Receita</span>
                                  <p className="font-semibold text-gray-900">{data.stats.totalRevenue.toLocaleString()} MT</p>
                                </div>
                                <div className="bg-white rounded-lg p-2">
                                  <span className="text-gray-500">Doc.</span>
                                  <p className="font-semibold text-gray-900">{data.stats.totalDocuments}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2">
                                  <span className="text-gray-500">Clientes</span>
                                  <p className="font-semibold text-gray-900">{data.stats.totalClients}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2">
                                  <span className="text-gray-500">Metas</span>
                                  <p className="font-semibold text-gray-900">{data.stats.totalGoals}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Criar Novo Grupo</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Grupo</label>
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Ex: Rede de Lojas Centro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="Ex: Grupo para partilha de dados entre as lojas do centro da cidade"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <button onClick={handleCreateGroup}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowJoinModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Entrar num Grupo</h2>
              <button onClick={() => setShowJoinModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Convite</label>
                <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A3F8B2C1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono tracking-widest text-center" />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Peça o código ao criador do grupo
              </p>
              <button onClick={handleJoinGroup}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Entrar no Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Convidar Empresa</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Convide uma empresa para o grupo <strong>{selectedGroup.name}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email da Empresa</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="empresa@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <p className="text-xs text-gray-500">
                A empresa deve estar registada na plataforma com este email
              </p>
              <button onClick={handleInvite}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Enviar Convite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
