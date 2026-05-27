// src/pages/KitchenConfirmation.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface KitchenOrder {
  _id: string;
  number: string;
  client: any;
  items: any[];
  status: string;
  displayStatus: string;
  total: number;
  createdAt: string;
}

export const KitchenConfirmation: React.FC = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      const res = await api.orders.getKitchen();
      const newOrders = res.kitchenOrders || [];

      setOrders(prev => {
        // Compara apenas IDs + status para evitar flicker
        const prevKey = prev.map(o => `${o._id}-${o.status}`).sort().join('|');
        const newKey = newOrders.map(o => `${o._id}-${o.status}`).sort().join('|');

        return prevKey === newKey ? prev : newOrders;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 4500); // 4.5s na cozinha
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  const markAsReady = async (order: KitchenOrder) => {
    try {
      await api.orders.markAsReady('sale', order._id);
      toast.success('Pedido marcado como pronto!');
      fetchKitchenOrders();
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
return (
  <div className="min-h-screen bg-[#0A0A0A] text-white p-6 overflow-hidden">
    {/* HEADER ESTRATÉGICO */}
    <div className="max-w-[1800px] mx-auto flex justify-between items-end mb-10 border-b-2 border-orange-500/20 pb-8">
      <div className="flex items-center gap-6">
        <div className="bg-orange-500 p-4 rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.3)]">
          <ChefHat className="w-12 h-12 text-black" />
        </div>
        <div>
          <h1 className="text-6xl font-black tracking-tighter uppercase">Cozinha</h1>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-orange-400 text-xl font-bold tracking-widest uppercase italic">Apenas Pedidos Pagos</p>
          </div>
        </div>
      </div>

      <div className="flex gap-10 items-center">
        <div className="text-right">
          <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Fila de Espera</p>
          <p className="text-5xl font-mono font-black text-white">{orders.length}</p>
        </div>
        <div className="h-16 w-px bg-zinc-800" />
        <div className="text-right">
          <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Hora Atual</p>
          <p className="text-5xl font-mono font-black text-orange-500">
            {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>

    {/* GRID DE TICKETS (Estilo Comanda Real) */}
    {orders.length === 0 ? (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="opacity-10 mb-8"><ChefHat size={200} /></div>
        <p className="text-4xl text-zinc-700 font-black uppercase italic">Cozinha Limpa. Bom trabalho!</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {orders.map((order) => {
          // Lógica de Alerta de Tempo (ex: mais de 15 min fica vermelho)
          const minutesElapsed = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
          const isUrgent = minutesElapsed > 15;

          return (
            <div
              key={order._id}
              className={`flex flex-col bg-zinc-900 rounded-[2rem] border-2 transition-all duration-300 relative overflow-hidden ${
                isUrgent ? 'border-red-600 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-zinc-800'
              }`}
            >
              {/* Header do Ticket */}
              <div className={`p-5 flex justify-between items-center ${isUrgent ? 'bg-red-600' : 'bg-zinc-800'}`}>
                <span className="text-2xl font-black">#{order.number}</span>
                <div className="flex items-center gap-2">
                  <Clock size={18} />
                  <span className="font-mono font-bold text-xl">{minutesElapsed}'m</span>
                </div>
              </div>

              {/* Conteúdo do Pedido */}
              <div className="p-6 flex-1">
                <div className="mb-6">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Cliente</p>
                  <h3 className="text-xl font-bold truncate">{order.client?.name || 'BALCÃO'}</h3>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest border-b border-zinc-800 pb-2">Itens do Pedido</p>
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex gap-4 items-start group">
                      <div className="bg-orange-500 text-black font-black text-xl px-2.5 py-0.5 rounded-lg shrink-0">
                        {item.quantity}
                      </div>
                      <span className="text-lg font-bold text-zinc-100 leading-tight uppercase">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Ação Gigante (Touch-Friendly) */}
              <div className="p-4 bg-zinc-900/50">
                <button
                  onClick={() => markAsReady(order)}
                  className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                    isUrgent ? 'bg-white text-black' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <CheckCircle2 size={32} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Concluir Pedido</span>
                </button>
              </div>

              {/* "Rasgo" de comanda no fundo sutil */}
              <div className="absolute bottom-0 left-0 w-full h-1 flex gap-1 px-2">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-full h-full bg-zinc-950 rounded-t-full" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
};