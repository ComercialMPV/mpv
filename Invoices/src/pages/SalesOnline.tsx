import React, { useState, useEffect } from 'react';
import { api, OnlineAnalytics } from '../services/api';
import toast from 'react-hot-toast';

export const SalesOnline: React.FC = () => {
  const [subTab, setSubTab] = useState<'history' | 'online'>('history');

  /* histórico / filtros */
  const [historySales, setHistorySales] = useState<any[]>([]);
  const [historyRequisitions, setHistoryRequisitions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(20);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');

  /* estatísticas online */
  const [onlineStats, setOnlineStats] = useState<OnlineAnalytics | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(false);

   useEffect(() => {
    if (subTab !== 'history') return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const filters: any = { page: historyPage, limit: historyLimit };
        if (dateFromFilter) filters.dateFrom = dateFromFilter;
        if (dateToFilter) filters.dateTo = dateToFilter;
        if (statusFilter) filters.status = statusFilter;
        if (paymentMethodFilter) filters.paymentMethod = paymentMethodFilter;
        if (customerNameFilter) filters.customerName = customerNameFilter;

        // vendas
        const res = await api.sales.getAll(filters);
        const sales = res.sales || [];
        const totalSales = res.pagination?.total || 0;

        // requisições externas
       
       
        
       const resReq = await api.requisitions.getAll();        
      let reqs = Array.isArray(resReq ) ? resReq  : (resReq  as any).requisitions || [];
      reqs = reqs.filter((r: any) => r.origin === 'external' || r.number?.startsWith('EXT-'));

      const totalReq = reqs.length;
      if (customerNameFilter) {
  const term = customerNameFilter.toLowerCase();
  reqs = reqs.filter((r: any) => 
    r.client?.name?.toLowerCase().includes(term) || 
    r.clientName?.toLowerCase().includes(term)
  );
}
        setHistorySales(sales);
        setHistoryRequisitions(reqs);
        setHistoryTotal(totalSales + totalReq);
      } catch (err: any) {
        console.error(err);
        toast.error('Erro ao carregar histórico de vendas / requisições');
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [
    subTab,
    historyPage,
    dateFromFilter,
    dateToFilter,
    statusFilter,
    paymentMethodFilter,
    customerNameFilter,
  ]);

  useEffect(() => {
    if (subTab !== 'online') return;
    const loadStats = async () => {
      setLoadingOnline(true);
      try {
        const data = await api.sales.getOnlineAnalytics();
        setOnlineStats(data);
      } catch (e: any) {
        toast.error('Falha ao carregar estatísticas online');
      } finally {
        setLoadingOnline(false);
      }
    };
    loadStats();
  }, [subTab]);
    const mergedHistory = [
    ...historySales.map(s => ({ ...s, __type: 'sale' })),
    ...historyRequisitions.map(r => ({ ...r, __type: 'requisition' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col h-full">
      {/* subtabs internas */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSubTab('history')}
          className={`px-6 py-3 rounded-full text-sm font-black transition-all whitespace-nowrap ${
            subTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Histórico & Filtros
        </button>
        <button
          onClick={() => setSubTab('online')}
          className={`px-6 py-3 rounded-full text-sm font-black transition-all whitespace-nowrap ${
            subTab === 'online' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Vendas Online
        </button>
      </div>
       {subTab === 'history' && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* filtros */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-black text-gray-900 uppercase">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Data Inicial</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={e => { setDateFromFilter(e.target.value); setHistoryPage(1); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Data Final</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={e => { setDateToFilter(e.target.value); setHistoryPage(1); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setHistoryPage(1); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="Pago 100%">Pago 100%</option>
                  <option value="Pago 50%">Pago 50%</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Reserva">Reserva</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Método de Pagamento</label>
                <select
                  value={paymentMethodFilter}
                  onChange={e => { setPaymentMethodFilter(e.target.value); setHistoryPage(1); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="Cash">Dinheiro</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="E-Mola">E-Mola</option>
                  <option value="Wallet">Carteira</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Cliente</label>
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={customerNameFilter}
                  onChange={e => { setCustomerNameFilter(e.target.value); setHistoryPage(1); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            {(dateFromFilter || dateToFilter || statusFilter || paymentMethodFilter || customerNameFilter) && (
              <button
                onClick={() => {
                  setDateFromFilter('');
                  setDateToFilter('');
                  setStatusFilter('');
                  setPaymentMethodFilter('');
                  setCustomerNameFilter('');
                  setHistoryPage(1);
                }}
                className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 px-4 py-2 rounded-md"
              >
                Limpar Filtros
              </button>
            )}
          </div>

            <div className="flex-1 overflow-hidden bg-white rounded-lg shadow-sm border border-gray-100">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Carregando...</p>
              </div>
            ) : mergedHistory.length > 0 ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-black text-gray-700 text-xs uppercase">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left font-black text-gray-700 text-xs uppercase">
                          Cliente / Tipo
                        </th>
                        <th className="px-4 py-3 text-left font-black text-gray-700 text-xs uppercase">
                          Itens
                        </th>
                        <th className="px-4 py-3 text-right font-black text-gray-700 text-xs uppercase">
                          Total
                        </th>
                        <th className="px-4 py-3 text-center font-black text-gray-700 text-xs uppercase">
                          Status / Origem
                        </th>
                        <th className="px-4 py-3 text-center font-black text-gray-700 text-xs uppercase">
                          Pago
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mergedHistory.map(entry => {
                        const isReq = entry.__type === 'requisition';
                        return (
                          <tr
                            key={isReq ? `req-${entry._id}` : entry._id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-800 font-medium">
                              {new Date(entry.createdAt).toLocaleDateString('pt-MZ', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-bold text-gray-800">
                                  {isReq
                                    ? entry.client?.name || entry.clientName || 'Portal'
                                    : entry.customer?.name || 'Consumidor Final'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isReq
                                    ? entry.client?.phone || '-'
                                    : entry.customer?.phone || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {entry.items?.length || 0} item(s)
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-900">
                               {(entry.finalTotal || entry.baseTotal || 0).toFixed(2)} {entry.currency || 'MT'} MT
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isReq ? (
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-50 text-purple-700">
                                  Requisição
                                </span>
                              ) : (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                                    entry.status === 'Pago 100%'
                                      ? 'bg-green-50 text-green-700'
                                      : entry.status === 'Pago 50%'
                                      ? 'bg-yellow-50 text-yellow-700'
                                      : entry.status === 'Pendente'
                                      ? 'bg-orange-50 text-orange-700'
                                      : 'bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  {entry.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isReq ? (
                                '—'
                              ) : (
                                <span className="font-bold text-gray-800">
                                  {entry.amountPaid?.toLocaleString() || 0} MT
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* paginação deixei apenas sobre vendas; as requisições não paginam */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-between items-center">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs font-black text-gray-600 uppercase">
                    Página {historyPage} de {Math.ceil(historyTotal / historyLimit) || 1} (
                    {historyTotal} registros )
                  </span>
                  <button
                    disabled={historyPage >= Math.ceil(historyTotal / historyLimit)}
                    onClick={() => setHistoryPage(p => p + 1)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-black text-gray-700 uppercase mb-2">
                    Nenhum registro encontrado
                  </p>
                  <p className="text-sm">
                    Ajuste os filtros ou comece a registar novas vendas/requisições
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {subTab === 'online' && (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loadingOnline ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Carregando dados online...
            </div>
          ) : onlineStats ? (
            <div className="space-y-8 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Vendas Online &amp; Pesquisas</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top searches */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 Termos Mais Buscados</h3>
                  {onlineStats.topSearches.length > 0 ? (
                    <div className="space-y-3">
                      {onlineStats.topSearches.slice(0, 10).map((s, idx) => (
                        <div key={s.term} className="flex items-center gap-4 pb-3 border-b border-gray-200 last:border-0">
                          <span className="font-black text-lg text-blue-600 w-8">{idx + 1}</span>
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{s.term}</p>
                            <p className="text-xs text-gray-500">{s.count} pesquisa(s)</p>
                          </div>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600" style={{ width: `${(s.count / (onlineStats.topSearches[0]?.count || 1)) * 100}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhuma pesquisa registrada ainda.</p>
                  )}
                </div>

                {/* Top items */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🛒 Itens Mais Comprados</h3>
                  {onlineStats.topItems.length > 0 ? (
                    <div className="space-y-3">
                      {onlineStats.topItems.slice(0, 10).map((i, idx) => (
                        <div key={`${i.itemId}-${i.name}`} className="flex items-center gap-4 pb-3 border-b border-gray-200 last:border-0">
                          <span className="font-black text-lg text-green-600 w-8">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 truncate">{i.name}</p>
                            <p className="text-xs text-gray-500">{i.itemType} • {i.count} unidade(s)</p>
                          </div>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-600" style={{ width: `${(i.count / (onlineStats.topItems[0]?.count || 1)) * 100}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhuma venda online registrada ainda.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 p-6">Sem dados disponíveis.</p>
          )}
        </div>
      )}
    </div>
  );
};
 