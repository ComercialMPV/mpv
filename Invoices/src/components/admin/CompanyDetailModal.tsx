import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { X, Trash2, Users, UserCheck, DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

interface CompanyDetailModalProps {
  company: any;
  onClose: () => void;
  onDelete: (id: string, name: string) => void;
}

const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({ company, onClose, onDelete }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);

        // Buscar utilizadores da empresa
        const usersRes = await api.request<any>(`/admin/companies/${company._id}/users`);
        setUsers(usersRes.users || []);

        // Buscar clientes
        const clientsRes = await api.request<any>(`/admin/companies/${company._id}/clients`);
        setClients(clientsRes.clients || []);

        // Filtrar parceiros dos utilizadores
        setPartners(usersRes.users?.filter((u: User) => u.role === 'partner') || []);
      } catch (err) {
        toast.error('Erro ao carregar detalhes da empresa');
        console.error(err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [company._id]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <p className="text-gray-600">{company.email}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => onDelete(company._id, company.name)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 size={18} />
              Eliminar Empresa
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {loadingDetails ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Utilizadores */}
              <div className="bg-gray-50 p-5 rounded-xl border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users size={20} /> Utilizadores ({users.length})
                </h3>
                {users.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">Nenhum utilizador registado</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.map(u => (
                      <div key={u._id} className="bg-white p-3 rounded-lg border">
                        <div className="font-medium">{u.firstName} {u.lastName}</div>
                        <div className="text-sm text-gray-600">{u.email}</div>
                        <div className="text-xs mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'partner' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role}
                          </span>
                          {u.isActive ? ' • Ativo' : ' • Inativo'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clientes */}
              <div className="bg-gray-50 p-5 rounded-xl border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UserCheck size={20} /> Clientes ({clients.length})
                </h3>
                {clients.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">Nenhum cliente registado</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {clients.map(c => (
                      <div key={c._id} className="bg-white p-3 rounded-lg border">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-gray-600">{c.email || 'Sem email'}</div>
                        {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                        <div className="text-xs text-gray-500 mt-1">
                          Registado em {format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: pt })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parceiros */}
              <div className="bg-gray-50 p-5 rounded-xl border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign size={20} /> Parceiros ({partners.length})
                </h3>
                {partners.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">Nenhum parceiro registado</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {partners.map(p => (
                      <div key={p._id} className="bg-white p-3 rounded-lg border">
                        <div className="font-medium">{p.firstName} {p.lastName}</div>
                        <div className="text-sm text-gray-600">{p.email}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Desde {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: pt })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailModal;