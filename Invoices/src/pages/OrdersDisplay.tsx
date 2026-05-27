// src/pages/OrdersDisplay.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Bell, User, CheckCircle, Clock } from 'lucide-react';

interface Order {
  _id: string;
  number: string;
  type: 'requisition' | 'sale';
  client: any;
  items: any[];
  status: string;
  displayStatus: string;
  total: number;
  createdAt: string;
  isPaid: boolean;
  isDelivered: boolean;
}

interface Counters {
  pendingRequisitions: number;
  kitchenOrders: number;
  totalOrders: number;
}

export const OrdersDisplay: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [counters, setCounters] = useState<Counters>({
    pendingRequisitions: 0,
    kitchenOrders: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const API_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/orders/display/public`);

      if (!response.ok) throw new Error('Falha ao carregar');

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        setCounters(data.counters || { pendingRequisitions: 0, kitchenOrders: 0, totalOrders: 0 });
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos públicos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6500);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

 return (
  <div className="min-h-screen bg-[#050505] text-white p-6 font-sans selection:bg-amber-500">
    {/* HEADER COMPACTO PARA MAXIMIZAR ESPAÇO DE GRID */}
    <header className="flex justify-between items-center mb-6 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
      <div className="flex items-center gap-4">
        <div className="bg-amber-500 p-3 rounded-2xl">
          <ChefHat className="w-10 h-10 text-black" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Expedição</h1>
          <p className="text-amber-500/60 font-bold tracking-[0.2em] text-xs">MONITOR DE PRODUÇÃO</p>
        </div>
      </div>

      {/* CONTADORES EM ESTILO DASHBOARD MILITAR (MAIS COMPACTOS) */}
      <div className="flex gap-8 border-x border-zinc-800 px-10">
        {[
          { label: 'Pendentes', value: counters.pendingRequisitions, color: 'text-amber-500' },
          { label: 'Cozinha', value: counters.kitchenOrders, color: 'text-orange-500' },
          { label: 'Total', value: counters.totalOrders, color: 'text-emerald-500' }
        ].map((c, i) => (
          <div key={i} className="text-center">
            <div className={`text-4xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="text-right">
        <div className="text-4xl font-mono text-white font-black tracking-widest">
          {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center justify-end gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Sistema Ativo</p>
        </div>
      </div>
    </header>

    {/* GRID OTIMIZADO PARA 20 PEDIDOS (4 ou 5 colunas em TVs) */}
    {orders.length === 0 ? (
      <div className="h-[70vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-900 rounded-[3rem]">
        <Bell className="w-20 h-20 text-zinc-800 mb-6" />
        <p className="text-2xl text-zinc-600 font-bold uppercase tracking-widest">Aguardando novos pedidos...</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {orders.map((order) => (
          <div
            key={order._id}
            className={`relative group bg-zinc-900/40 rounded-2xl border-t-4 p-4 flex flex-col h-[380px] transition-all duration-300 ${
              order.isDelivered ? 'border-emerald-600 opacity-40' : 
              order.type === 'requisition' ? 'border-amber-500 bg-amber-500/5' : 'border-emerald-500'
            }`}
          >
            {/* CABEÇALHO DO CARD */}
            <div className="flex justify-between items-start mb-3">
              <div className="bg-zinc-800 px-3 py-1 rounded-lg">
                <span className="text-xs font-black tracking-widest text-zinc-400">#{order.number}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 font-bold">{formatTime(order.createdAt)}</span>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-black truncate uppercase text-zinc-100">
                {order.client?.name || 'Cliente Balcão'}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-sm ${
                  order.type === 'requisition' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                }`}>
                  {order.type === 'requisition' ? 'REQUISIÇÃO' : 'VENDA'}
                </span>
              </div>
            </div>

            {/* LISTA DE ITENS SCROLLABLE (FOCADA NO QUE IMPORTA) */}
            <div className="flex-1 overflow-hidden space-y-2 border-y border-zinc-800/50 py-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="bg-zinc-800 text-amber-500 font-black text-sm px-2 rounded-md">
                    {item.quantity}
                  </span>
                  <span className="text-sm font-bold text-zinc-300 leading-tight uppercase tracking-tight line-clamp-2">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>

            {/* FOOTER DO CARD */}
            <div className="mt-4 flex justify-between items-center">
              <div>
                <p className="text-[9px] text-zinc-500 font-black tracking-widest uppercase">Total</p>
                <p className="text-xl font-black text-white italic">{order.total.toFixed(0)}<span className="text-[10px] ml-1">MT</span></p>
              </div>
              
              <div className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-tighter transition-colors ${
                order.isDelivered ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white text-black animate-pulse'
              }`}>
                {order.displayStatus.toUpperCase()}
              </div>
            </div>

            {/* OVERLAY DE ENTREGUE */}
            {order.isDelivered && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                 <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);
};