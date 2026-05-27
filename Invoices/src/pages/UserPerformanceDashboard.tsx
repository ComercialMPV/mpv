import React, { useState, useEffect } from 'react';
import { usersApi, rolesApi } from '../services/api';
import { Users, TrendingUp, Target, Award, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface UserPerformance {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;           // ← Agora vem corretamente populado
  roleId?: string;
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  goalAnnual: number;
  goalAchieved: number;
  goalProgress: number;
  healthStatus: 'critical' | 'at-risk' | 'on-track';
}

export default function UserPerformanceDashboard() {
  const [users, setUsers] = useState<UserPerformance[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'progress' | 'commission'>('revenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const userRole = localStorage.getItem('userRole') || '';
  const isAdminView = ['admin', 'owner', 'superadmin'].includes(userRole);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadPerformanceData();
  }, [activeTab, dateFrom, dateTo, selectedRole, sortBy, sortOrder]);

  const loadRoles = async () => {
    try {
      const data = await rolesApi.getAll();
      setAllRoles(Array.isArray(data) ? data : data.roles || []);
    } catch (err) {
      console.error('Erro ao carregar roles:', err);
    }
  };

const loadPerformanceData = async () => {
  try {
    setLoading(true);
    setError('');

    const params: any = {
      sortBy,
      sortOrder,
    };

    // ✅ CORREÇÃO: Enviar roleId apenas se for selecionado
    if (selectedRole && selectedRole !== 'all' && selectedRole !== '') {
      params.roleId = selectedRole;        // nome do parâmetro que o backend espera
    }

    if (dateFrom) params.startDate = dateFrom.toISOString().split('T')[0];
    if (dateTo) params.endDate = dateTo.toISOString().split('T')[0];

    console.log('[Frontend] Enviando params:', params);   // ← para debug

    let data: UserPerformance[] = [];

    if (activeTab === 'my') {
      const myData = await usersApi.getMyPerformance();
      data = [myData];
    } else {
      data = await usersApi.getAllPerformance(params);
    }

    const processed = data.map(user => ({
      ...user,
      roleName: user.roleName || 'Sem cargo definido'
    }));

    const sorted = [...processed].sort((a, b) => {
      let valA = sortBy === 'revenue' ? a.totalRevenue :
                 sortBy === 'progress' ? a.goalProgress : a.totalCommission;
      let valB = sortBy === 'revenue' ? b.totalRevenue :
                 sortBy === 'progress' ? b.goalProgress : b.totalCommission;

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    setUsers(sorted);
  } catch (err: any) {
    console.error(err);
    setError('Não foi possível carregar os dados.');
    toast.error('Erro ao carregar performance');
  } finally {
    setLoading(false);
  }
};

  const getHealthConfig = (status: string) => {
    switch (status) {
      case 'critical': return { color: 'text-red-700 bg-red-100', icon: <AlertTriangle className="w-5 h-5" />, label: 'Crítico' };
      case 'at-risk':  return { color: 'text-orange-700 bg-orange-100', icon: <Target className="w-5 h-5" />, label: 'Em Risco' };
      default:         return { color: 'text-green-700 bg-green-100', icon: <Award className="w-5 h-5" />, label: 'No Caminho' };
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">A carregar dados de performance...</div>;
  }

return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-8 space-y-8">
    {/* Header & Filtros */}
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          Performance & Metas
        </h1>
        <p className="text-gray-500 text-sm md:text-base">
          {activeTab === 'all' ? 'Visão geral de toda a equipa' : 'O seu desempenho individual'}
        </p>
      </div>

      {/* Toolbar de Filtros */}
      <div className="flex flex-col gap-4 w-full xl:w-auto">
        {/* Toggle Admin */}
        {isAdminView && (
          <div className="flex bg-gray-200/50 p-1 rounded-2xl w-full sm:w-fit">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Equipa
            </button>
            <button 
              onClick={() => setActiveTab('my')} 
              className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'my' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Apenas Eu
            </button>
          </div>
        )}

        {/* Inputs de Filtro */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3">
          {/* Calendário Responsivo */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all overflow-hidden">
            <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex items-center text-sm">
              <DatePicker
                selected={dateFrom}
                onChange={(date) => setDateFrom(date)}
                selectsStart
                startDate={dateFrom}
                endDate={dateTo}
                placeholderText="Início"
                className="bg-transparent outline-none w-20 md:w-24"
              />
              <span className="text-gray-300 mx-1">→</span>
              <DatePicker
                selected={dateTo}
                onChange={(date) => setDateTo(date)}
                selectsEnd
                startDate={dateFrom}
                endDate={dateTo}
                minDate={dateFrom}
                placeholderText="Fim"
                className="bg-transparent outline-none w-20 md:w-24"
              />
            </div>
          </div>

          <select 
            value={selectedRole} 
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-[42px] px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
          >
            <option value="all">Todos os Cargos</option>
            {allRoles.map(role => (
              <option key={role._id} value={role._id}>{role.roleName}</option>
            ))}
          </select>

          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)} 
              className="flex-1 sm:flex-none h-[42px] px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none shadow-sm"
            >
              <option value="revenue">Receita</option>
              <option value="progress">Progresso</option>
              <option value="commission">Comissão</option>
            </select>
            <button 
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')} 
              className="h-[42px] px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Grid de Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {users.length > 0 ? (
        users.map((user) => {
          const progress = user.goalAnnual > 0 
            ? Math.min(100, Math.round((user.goalAchieved / user.goalAnnual) * 100)) 
            : 0;
          const health = getHealthConfig(user.healthStatus);

          return (
            <div key={user._id} className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              {/* Card Header */}
              <div className="p-6 pb-4 flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-inner">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-[10px] ${health.color.split(' ')[0]}`}>
                    {health.icon}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-lg text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider truncate">
                    {user.roleName || 'Sem cargo'}
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 pb-6 space-y-5">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">Receita Total</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-900">MT</span>
                    <span className="text-2xl font-black text-gray-900 leading-none">
                      {user.totalRevenue.toLocaleString('pt-MZ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    {user.totalSales} vendas realizadas
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Comissão</p>
                    <p className="text-lg font-bold text-emerald-600">
                      MT{user.totalCommission.toLocaleString('pt-MZ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Meta Anual</p>
                    <p className="text-sm font-bold text-gray-700">
                      MT{user.goalAnnual.toLocaleString('pt-MZ')}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-gray-500">Progresso</span>
                    <span className={`text-sm font-black ${progress >= 85 ? 'text-green-600' : progress >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        progress >= 85 ? 'bg-green-500' : progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-300">
          <div className="p-6 bg-gray-50 rounded-full mb-4">
            <Target className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Nenhum dado encontrado para os filtros aplicados.</p>
        </div>
      )}
    </div>
  </div>
);
}