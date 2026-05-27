// src/pages/RoleManagement.tsx
import React, { useState, useEffect } from 'react';
import { rolesApi } from '../services/api';
import { structuredMenu } from '../components/Layout';
import toast from 'react-hot-toast';
import { 
  Plus, Edit, Trash2, Save, X, Loader2, Shield, 
  ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomRole {
  roleName: string;
  allowedMenuItems: string[];
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const { user, refreshUser } = useAuth();
  const [sortAsc, setSortAsc] = useState(true);
  const [openSectionsInEdit, setOpenSectionsInEdit] = useState<Record<string, boolean>>({});

  const menuSections = structuredMenu;

  // Todos os itens de menu (para contador)
  const allMenuItems = structuredMenu.flatMap(section => 
    section.items.map(item => ({ name: item.name, icon: item.icon }))
  );

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const res = await rolesApi.getAll();
        const validRoles = (res.roles || []).filter((r: any) => r?.roleName).map((r: any) => ({
          ...r,
          allowedMenuItems: Array.isArray(r.allowedMenuItems) ? r.allowedMenuItems : [],
        }));
        setRoles(validRoles);
      } catch (err: any) {
        toast.error('Erro ao carregar cargos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Nome do cargo é obrigatório');
      return;
    }

    setActionLoading('create');
    try {
      const res = await rolesApi.create({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        allowedMenuItems: ['Dashboard'],
      });
      setRoles([...roles, res.role]);
      toast.success('Cargo criado com sucesso!');
      setNewRoleName('');
      setNewRoleDesc('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar cargo');
    } finally {
      setActionLoading(null);
    }
  };

  const startEditing = (role: CustomRole) => {
    setEditingRoleName(role.roleName);
    const initialOpen: Record<string, boolean> = {};
    menuSections.forEach(section => initialOpen[section.id] = true);
    setOpenSectionsInEdit(initialOpen);
  };

  const cancelEditing = () => {
    setEditingRoleName(null);
  };

  const toggleMenuItem = (roleName: string, itemName: string) => {
    setRoles(prev =>
      prev.map(role =>
        role.roleName === roleName
          ? {
              ...role,
              allowedMenuItems: role.allowedMenuItems.includes(itemName)
                ? role.allowedMenuItems.filter(i => i !== itemName)
                : [...role.allowedMenuItems, itemName],
            }
          : role
      )
    );
  };

  const toggleSectionInEdit = (sectionId: string) => {
    setOpenSectionsInEdit(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const saveRolePermissions = async (role: CustomRole) => {
    setActionLoading(role.roleName);
    try {
      const res = await rolesApi.update(role.roleName, {
        allowedMenuItems: role.allowedMenuItems,
        description: role.description,
        isActive: role.isActive,
      });

      setRoles(prev => prev.map(r => r.roleName === role.roleName ? res.role : r));
      toast.success('Permissões salvas com sucesso');

      if (user?.role?.roleName === role.roleName) {
        refreshUser?.();
        window.dispatchEvent(new Event('userPermissionsUpdated'));
      }

      setEditingRoleName(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (role: CustomRole) => {
    const newActive = !role.isActive;
    setActionLoading(role.roleName);
    try {
      const res = await rolesApi.update(role.roleName, { isActive: newActive });
      setRoles(prev => prev.map(r => r.roleName === role.roleName ? res.role : r));
      toast.success(`Cargo ${newActive ? 'ativado' : 'desativado'}`);
    } catch (err) {
      toast.error('Erro ao alterar status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRole = async (roleName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o cargo "${roleName}"?`)) return;
    setActionLoading(roleName);
    try {
      await rolesApi.delete(roleName);
      setRoles(prev => prev.filter(r => r.roleName !== roleName));
      toast.success('Cargo removido');
    } catch (err) {
      toast.error('Erro ao remover cargo');
    } finally {
      setActionLoading(null);
    }
  };

  const sortedRoles = [...roles].sort((a, b) => {
    const nameA = (a.roleName || '').trim().toLowerCase();
    const nameB = (b.roleName || '').trim().toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  if (loading) {
    return (
      <div className="p-10 flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="text-indigo-600" size={32} />
              Gestão de Cargos
            </h1>
            <p className="text-gray-600 mt-1">Defina permissões de acesso por departamento</p>
          </div>
        </div>

        {/* Criar Novo Cargo */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-10">
          <h2 className="text-xl font-semibold mb-5">Criar Novo Cargo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cargo <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="ex: Vendedor Júnior"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={newRoleDesc}
                onChange={e => setNewRoleDesc(e.target.value)}
                placeholder="Responsabilidades do cargo..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateRole}
                disabled={actionLoading === 'create' || !newRoleName.trim()}
                className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {actionLoading === 'create' ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                Criar Cargo
              </button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Cargos Cadastrados</h2>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Ordenar {sortAsc ? 'A-Z' : 'Z-A'} 
              {sortAsc ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Permissões</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedRoles.map(role => {
                  const isEditing = editingRoleName === role.roleName;
                  const isLoading = actionLoading === role.roleName;

                  return (
                    <React.Fragment key={role.roleName}>
                      <tr className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-5 font-semibold text-gray-900">{role.roleName}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">{role.description || '—'}</td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                            <span className="font-semibold">
                              {(role.allowedMenuItems || []).length}
                            </span>
                            <span className="text-indigo-400 mx-1">/</span>
                            <span>{allMenuItems.length}</span>
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={role.isActive}
                              onChange={() => toggleActive(role)}
                              disabled={isLoading}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isEditing ? (
                              <>
                                <button
                                  onClick={() => startEditing(role)}
                                  disabled={isLoading}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                  title="Editar"
                                >
                                  <Edit size={20} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRole(role.roleName)}
                                  disabled={isLoading}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => saveRolePermissions(role)}
                                  disabled={isLoading}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                  title="Salvar"
                                >
                                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={isLoading}
                                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                  title="Cancelar"
                                >
                                  <X size={20} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Editor de Permissões */}
                      {isEditing && (
                        <tr>
                          <td colSpan={5} className="p-8 bg-slate-50 border-t">
                            <div className="mb-6">
                              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                                Configurar Permissões — {role.roleName}
                              </h3>
                              <p className="text-gray-600">Selecione os módulos e telas que este cargo pode acessar</p>
                            </div>

                            <div className="space-y-6">
                              {menuSections.map((section) => {
                                const isOpen = openSectionsInEdit[section.id] ?? true;
                                const sectionItems = section.items;
                                const selectedInSection = sectionItems.filter(item =>
                                  role.allowedMenuItems.includes(item.name)
                                ).length;

                                return (
                                  <div key={section.id} className="bg-white border rounded-2xl overflow-hidden">
                                    <button
                                      onClick={() => toggleSectionInEdit(section.id)}
                                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-4">
                                        <section.icon className="text-indigo-600" size={24} />
                                        <div>
                                          <p className="font-semibold text-lg">{section.title}</p>
                                          <p className="text-sm text-gray-500">
                                            {selectedInSection} de {sectionItems.length} selecionados
                                          </p>
                                        </div>
                                      </div>
                                      {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                                    </button>

                                    <AnimatePresence>
                                      {isOpen && (
                                        <motion.div
                                          initial={{ height: 0 }}
                                          animate={{ height: 'auto' }}
                                          exit={{ height: 0 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6 pt-2 border-t">
                                                         {sectionItems.map((item) => {
                                              const ItemIcon = item.icon || FileText;
                                              
                                              return (
                                              <label
                                                key={item.name}
                                                className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={role.allowedMenuItems.includes(item.name)}
                                                  onChange={() => toggleMenuItem(role.roleName, item.name)}
                                                  className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                                                />
                                                <div className="flex items-center gap-3">
                                                  <ItemIcon className="text-gray-500" size={20} />
                                                  <span className="font-medium text-gray-700">{item.name}</span>
                                                </div>
                                              </label>
                                            );
                                            })}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;