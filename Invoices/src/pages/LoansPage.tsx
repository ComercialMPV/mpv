// src/pages/LoansPage.tsx
import React, { useState } from 'react';
import { Plus, AlertCircle, Clock, CheckCircle2, Ban, Search, Filter } from 'lucide-react';
import { useLoans } from '../hooks/useLoans';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // ou usa o teu sistema de navegação

export const LoansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'Todos' | 'Pendente' | 'Aprovado' | 'Atrasado' | 'Quitado'
  >('Todos');

  const filters = {
    status: activeTab === 'Todos' ? undefined : activeTab,
    overdue: activeTab === 'Atrasado' ? true : undefined,
    limit: 20,
  };

  const { data: loans = [], isLoading, error } = useLoans(filters);

  const getStatusBadge = (status: string, daysOverdue: number = 0) => {
    if (daysOverdue > 0) {
      const color =
        daysOverdue <= 7
          ? 'bg-amber-100 text-amber-800'
          : daysOverdue <= 30
          ? 'bg-orange-100 text-orange-800'
          : 'bg-red-100 text-red-800';
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
          Atraso {daysOverdue}d
        </span>
      );
    }

    const colors = {
      Pendente: 'bg-yellow-100 text-yellow-800',
      Aprovado: 'bg-green-100 text-green-800',
      Rejeitado: 'bg-red-100 text-red-800',
      Cancelado: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        Erro ao carregar os microcréditos. Tente novamente.
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            <DollarSign className="text-blue-600" size={28} />
            Microcréditos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestão de pedidos, aprovações, desembolsos e cobranças
          </p>
        </div>

        <Link
          to="/loans/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg transition-all"
        >
          <Plus size={20} />
          Novo Pedido
        </Link>
      </div>

      {/* Abas de filtro */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-2 pb-2 min-w-max">
          {['Todos', 'Pendente', 'Aprovado', 'Atrasado', 'Quitado'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab}
              {tab === 'Atrasado' && loans.some(l => l.daysOverdue > 0) && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {loans.filter(l => l.daysOverdue > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de cards */}
      {loans.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhum microcrédito encontrado
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'Todos'
              ? 'Ainda não existem pedidos registados.'
              : `Não existem microcréditos com estado "${activeTab}".`}
          </p>
          <Link
            to="/loans/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Novo Pedido
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map((loan) => (
            <Link
              key={loan._id}
              to={`/loans/${loan._id}`}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden group"
            >
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{loan.client?.name || 'Cliente'}</h3>
                    <p className="text-sm text-gray-500">{loan.client?.phone || '—'}</p>
                  </div>
                  {getStatusBadge(loan.approvalStatus, loan.daysOverdue)}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valor Aprovado</span>
                  <span className="font-bold text-xl text-blue-700">
                    {loan.loanAmountApproved?.toLocaleString() || loan.loanAmountRequested.toLocaleString()} MT
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Prazo</p>
                    <p className="font-medium">{loan.termMonths} meses</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Prestação aprox.</p>
                    <p className="font-medium">
                      {(loan.loanAmountApproved || loan.loanAmountRequested / loan.termMonths).toLocaleString()} MT
                    </p>
                  </div>
                </div>

                <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
                  <span className="text-gray-600">Saldo devedor</span>
                  <span className={`font-bold ${loan.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {loan.outstandingBalance.toLocaleString()} MT
                  </span>
                </div>
              </div>

              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-blue-600 font-medium flex items-center gap-1">
                  Ver detalhes <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};