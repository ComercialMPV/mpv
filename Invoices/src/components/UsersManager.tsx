import React, { useEffect, useState } from 'react';
import { usersApi, rolesApi, User } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserPlus, 
  Trash2, 
  Mail, 
  ShieldCheck, 
  Percent, 
  Loader2,
  X,
  Search,
  Briefcase,
  Edit,
  UserX,
  UserCheck,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NewUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  commissionRate?: number;
  phone?: string;
  isVerified?: boolean;
}

interface RoleOption {
  _id: string;
  roleName: string;
  description?: string;
  isActive: boolean;
}

interface EditUserForm extends NewUser {
  _id: string;
  isActive: boolean;
}

export const UsersManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    commissionRate: 10,
  });

  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserForm | null>(null);

  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRolesLoading(true);

        const [usersRes, rolesRes] = await Promise.all([
          usersApi.getAll(),
          rolesApi.getAll(),
        ]);

        setUsers(usersRes.users || []);

        const activeRoles = (rolesRes.roles || [])
          .filter((r: any) => r.isActive !== false)
          .map((r: any) => ({
            _id: r._id,
            roleName: r.roleName,
            description: r.description,
            isActive: r.isActive,
          }));

        setAvailableRoles(activeRoles);

        if (activeRoles.length > 0) {
          setNewUser(prev => ({ ...prev, role: activeRoles[0]._id }));
        }
      } catch (err: any) {
        toast.error('Erro ao carregar dados');
        console.error(err);
      } finally {
        setLoading(false);
        setRolesLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.role?.roleName || u.role}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.firstName || !newUser.lastName || !newUser.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const payload = {
        ...newUser,
        commissionRate: newUser.role === 'partner' ? newUser.commissionRate : undefined,
      };

      const res = await usersApi.create(payload);
      setUsers([...users, res.user]);
      toast.success('Usuário criado com sucesso');
      setShowNewUserForm(false);
      resetNewUserForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar usuário');
    }
  };

  const resetNewUserForm = () => {
    setNewUser({
      email: '',
      firstName: '',
      lastName: '',
      role: availableRoles[0]?._id || '',
      commissionRate: 10,
    });
  };

  // Abrir modal de edição
  const handleEditClick = (user: User) => {
    setEditingUser({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?._id || user.role || '',
      commissionRate: user.commissionRate || 10,
      phone: user.phone || '',
      isVerified: user.isVerified ?? true,
      isActive: user.isActive ?? true,
    });
    setShowEditModal(true);
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const payload = {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        commissionRate: editingUser.role === 'partner' ? editingUser.commissionRate : undefined,
        isActive: editingUser.isActive,
        isVerified: editingUser.isVerified,
      };

      const updated = await usersApi.update(editingUser._id, payload);

      // Atualiza lista local
      setUsers(prev =>
        prev.map(u => (u._id === editingUser._id ? updated.user : u))
      );

      toast.success('Usuário atualizado com sucesso');
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar usuário');
    }
  };

  // Toggle ativo/inativo
  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const action = currentActive ? 'desativar' : 'ativar';
    if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

    try {
      const updated = await usersApi.update(userId, { isActive: !currentActive });
      setUsers(prev =>
        prev.map(u => (u._id === userId ? updated.user : u))
      );
      toast.success(`Usuário ${currentActive ? 'desativado' : 'ativado'} com sucesso`);
    } catch (err: any) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário permanentemente?')) return;

    try {
      await usersApi.delete(id);
      setUsers(users.filter(u => u._id !== id));
      toast.success('Usuário removido com sucesso');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover usuário');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
  {/* Text Content */}
  <div className="text-center md:text-left">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
      Gestão de Utilizadores
    </h1>
    <p className="text-gray-600 mt-1 text-sm md:text-base">
      Crie, edite e gerencie os utilizadores da sua empresa.
    </p>
  </div>

  {/* Action Button */}
  {currentUser?.role !== 'partner' && (
    <button
      onClick={() => setShowNewUserForm(true)}
      className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 md:py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition-all w-full md:w-auto font-medium"
    >
      <UserPlus size={18} /> 
      <span>Novo Utilizador</span>
    </button>
  )}
</div>

        {/* Formulário de novo utilizador */}
        {showNewUserForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Criar Novo Utilizador</h2>
              <button onClick={() => setShowNewUserForm(false)}>
                <X size={24} className="text-gray-500 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                  placeholder="Primeiro nome"
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apelido</label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                  placeholder="Apelido"
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={newUser.phone || ''}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+258 84 000 0000"
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                {rolesLoading ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="animate-spin" size={16} /> A carregar roles...
                  </div>
                ) : (
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione um role</option>
                    {availableRoles.map(role => (
                      <option key={role.roleName} value={role._id}>
                        {role.roleName} {role.description && `- ${role.description}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {newUser.role && availableRoles.find(r => r._id === newUser.role)?.roleName === 'partner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={newUser.commissionRate || 10}
                    onChange={e => setNewUser({ ...newUser, commissionRate: Number(e.target.value) })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowNewUserForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <UserPlus size={18} /> Criar Utilizador
              </button>
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-semibold">Editar Utilizador</h3>
                <button onClick={() => setShowEditModal(false)}>
                  <X size={24} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={editingUser.firstName}
                      onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apelido
                    </label>
                    <input
                      type="text"
                      value={editingUser.lastName}
                      onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone (opcional)
                  </label>
                  <input
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo / Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableRoles.map(role => (
                      <option key={role._id} value={role._id}>
                        {role.roleName}
                      </option>
                    ))}
                  </select>
                </div>

                {editingUser.role === 'partner' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comissão (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editingUser.commissionRate || 0}
                      onChange={e => setEditingUser({ ...editingUser, commissionRate: Number(e.target.value) })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editingUser.isActive}
                    onChange={e => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    className="h-5 w-5 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Utilizador ativo
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editingUser.isVerified}
                    onChange={e => setEditingUser({ ...editingUser, isVerified: e.target.checked })}
                    className="h-5 w-5 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Email verificado
                  </label>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Guardar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de busca */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

    {/* Tabela de utilizadores */}
<div className="bg-white rounded-xl shadow-sm border overflow-hidden">
  <div className="p-4 md:p-6 border-b">
    <h2 className="text-lg md:text-xl font-semibold text-gray-900">Utilizadores da Empresa</h2>
  </div>

  <div className="divide-y divide-gray-200">
    {filteredUsers.map(u => (
      <div
        key={u._id}
        className="p-4 md:p-6 hover:bg-gray-50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        {/* Lado Esquerdo: Avatar e Infos */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm ${
            u.isActive ? 'bg-indigo-600' : 'bg-gray-400'
          }`}>
            {u.firstName?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
              {u.firstName} {u.lastName}
              {!u.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase">
                  Inativo
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500 truncate">{u.email}</p>
          </div>
        </div>

        {/* Lado Direito: Badges e Ações */}
        <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-6">
          {/* Badges de Status/Cargo */}
          <div className="flex flex-wrap gap-2">
            {u.role?.roleName === 'partner' && (
              <span className="whitespace-nowrap text-[10px] md:text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold border border-blue-100">
                {u.commissionRate || 0}% Comissão
              </span>
            )}

            <span className={`whitespace-nowrap text-[10px] md:text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider ${
              u.isActive 
                ? 'bg-green-50 text-green-700 border border-green-100' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {u.role?.roleName || u.role || '—'}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEditClick(u)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Editar utilizador"
            >
              <Edit size={18} />
            </button>

            <button
              onClick={() => handleToggleActive(u._id, u.isActive ?? true)}
              className={`p-2 rounded-lg transition-colors ${
                u.isActive 
                  ? 'text-amber-600 hover:bg-amber-50' 
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={u.isActive ? 'Desativar utilizador' : 'Ativar utilizador'}
            >
              {u.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
            </button>

            {currentUser?._id !== u._id && (
              <button
                onClick={() => handleDelete(u._id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remover utilizador"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* Estado Vazio */}
  {filteredUsers.length === 0 && (
    <div className="p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
        <Users className="w-8 h-8 text-gray-300" />
      </div>
      <p className="text-gray-500 font-medium">
        {searchTerm ? 'Nenhum utilizador encontrado para esta pesquisa' : 'Nenhum utilizador registado ainda'}
      </p>
    </div>
  )}
</div>
      </div>
    </div>
  );
};

export default UsersManager;