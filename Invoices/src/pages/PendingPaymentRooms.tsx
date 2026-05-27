import React, { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Clock, Check, AlertCircle, Copy, QrCode,
  ChevronDown, Phone, Users, ShoppingCart, DollarSign, Calendar
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface RoomItem {
  _id?: string;
  itemId: string;
  name: string;
  price: number;
  qty: number;
  type: 'product' | 'service' | 'bundle';
}

interface PendingRoom {
  _id?: string;
  ticketCode: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  items: RoomItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  status: 'open' | 'paid-full' | 'paid-50' | 'reserved' | 'closed';
  notes?: string;
}

interface PendingPaymentRoomsProps {
  onRoomUpdated?: (room: PendingRoom) => void;
  onRoomClosed?: (room: PendingRoom) => void;
  onCountChange?: (count: number) => void;
  showDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export const PendingPaymentRooms: React.FC<PendingPaymentRoomsProps> = ({
  onRoomUpdated,
  onRoomClosed,
  onCountChange,
  showDrawer = true,
  onCloseDrawer,
}) => {
  const [rooms, setRooms] = useState<PendingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<PendingRoom | null>(null);
  const [editingRoom, setEditingRoom] = useState<PendingRoom | null>(null);

  // Confirmation modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ roomId: string; itemId: string; itemName: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [closeConfirm, setCloseConfirm] = useState<{ roomId: string; status: 'paid-full' | 'paid-50' | 'reserved' } | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [tempAmountPaid, setTempAmountPaid] = useState<number>(0); // ← NEW: valor recebido agora

  // Carregar rooms ao montar
  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    onCountChange?.(rooms.length);
  }, [rooms, onCountChange]);

  const loadRooms = async () => {
    try {
      const response = await api.pendingRooms.getAll('open');
      setRooms(response || []);
    } catch (error) {
      console.error('Erro ao carregar rooms', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (clientName: string, clientPhone: string): Promise<PendingRoom | null> => {
    try {
      await api.clients.create({ name: clientName, phone: clientPhone }).catch(() => {});
    } catch (err) {
      console.warn('could not save client while creating room', err);
    }

    try {
      const response = await api.pendingRooms.create({ clientName, clientPhone });
      setRooms(prev => [...prev, response]);
      toast.success(`Room criado: ${response.ticketCode}`);
      return response;
    } catch (error) {
      toast.error('Erro ao criar room');
      return null;
    }
  };

  const addItemToRoom = async (roomId: string, item: any) => {
    try {
      const response = await api.pendingRooms.addItem(roomId, {
        itemId: item._id,
        name: item.name,
        price: item.basePrice || item.price,
        qty: 1,
        type: 'type' in item ? 'bundle' : !('stockQuantity' in item) ? 'service' : 'product',
      });

      const updatedRoom = response;
      setRooms(rooms.map(r => r._id === roomId ? updatedRoom : r));
      setSelectedRoom(updatedRoom);
      if (editingRoom?._id === roomId) setEditingRoom(updatedRoom);
      onRoomUpdated?.(updatedRoom);
      toast.success('Item adicionado ao room');
    } catch (error) {
      toast.error('Erro ao adicionar item');
    }
  };

  const removeItemFromRoom = async (roomId: string, itemId: string, reason?: string) => {
    try {
      const response = await api.pendingRooms.removeItem(roomId, itemId, reason);

      if (response.roomDeleted) {
        setRooms(rooms.filter(r => r._id !== roomId));
        setSelectedRoom(null);
        setEditingRoom(null);
        toast.success(`Room ${response.ticketCode} removido automaticamente (sem itens)`);
      } else {
        const updatedRoom = response;
        setRooms(rooms.map(r => r._id === roomId ? updatedRoom : r));
        setSelectedRoom(updatedRoom);
        if (editingRoom?._id === roomId) setEditingRoom(updatedRoom);
        toast.success('Item removido com sucesso');
      }

      setDeleteConfirm(null);
      setDeleteReason('');
    } catch (error: any) {
      console.error('removeItemFromRoom error:', error);
      toast.error('Erro ao remover item: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const closeRoom = async (
    roomId: string,
    finalStatus: 'paid-full' | 'paid-50' | 'reserved',
    reason?: string,
    amountPaidNow?: number
  ) => {
    try {
      const payload: any = {};

      // Enviar valor recebido apenas quando relevante
      if ((finalStatus === 'paid-50' || finalStatus === 'reserved') && amountPaidNow !== undefined && amountPaidNow > 0) {
        payload.amountPaidNow = amountPaidNow;
      }

      const response = await api.pendingRooms.closeRoom(roomId, finalStatus, reason, payload);
     
      console.log('Room closed → sale created?', response.sale?._id);

      const closedRoom = response.room || response;
       const createdSale = response.sale || response;
      setRooms(rooms.filter(r => r._id !== roomId));
      setSelectedRoom(null);
      setEditingRoom(null);
      setCloseConfirm(null);
      setCloseReason('');
      setTempAmountPaid(0); // resetar valor

      onRoomClosed?.(closedRoom);
      onRoomClosed?.(closedRoom, createdSale);
      toast.success(`Room ${closedRoom.ticketCode} fechado com sucesso`);

      if (createdSale?._id) {
        toast('Nova venda registada no histórico!', { icon: '📊' });
      }
    } catch (error: any) {
      console.error('Erro ao fechar room:', error);
      toast.error('Erro ao fechar room: ' + (error.message || 'Tente novamente'));
    }
  };

  const copyTicketToClipboard = (ticketCode: string) => {
    navigator.clipboard.writeText(ticketCode);
    toast.success('Ticket copiado!');
  };

  if (!showDrawer) return null;

  return (
    <div className="fixed bottom-0 right-0 z-40 bg-white shadow-2xl rounded-t-md max-h-[90vh] w-full sm:w-[500px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Clock size={24} className="text-white" />
          <div>
            <h3 className="text-white font-black uppercase tracking-tight">Aguardando Pagamento</h3>
            <p className="text-sm text-orange-100">{rooms.length} room(s) aberto(s)</p>
          </div>
        </div>
        <button
          onClick={onCloseDrawer}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
        >
          <X className="text-white" size={20} />
        </button>
      </div>

      {/* Lista de Rooms */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 text-center text-gray-400">Carregando...</div>
        ) : rooms.length === 0 ? (
          <div className="p-6 text-center">
            <AlertCircle size={40} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-bold">Nenhum room aberto</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {rooms.map(room => (
              <div
                key={room._id}
                className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                  selectedRoom?._id === room._id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => {
                  setSelectedRoom(room);
                  setExpandedRoomId(prev => (prev === room._id ? null : room._id));
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        {room.ticketCode}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          copyTicketToClipboard(room.ticketCode);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition"
                        title="Copiar ticket"
                      >
                        <Copy size={14} className="text-gray-500" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{room.clientName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={12} /> {room.clientPhone}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {room.items.length} item(ns) • {room.total.toLocaleString()} MT
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`transition ${expandedRoomId === room._id ? 'rotate-180' : ''}`}
                  />
                </div>

                {expandedRoomId === room._id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {room.items.map(item => (
                      <div key={item._id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                        <div>
                          <p className="font-bold text-gray-700">{item.name}</p>
                          <p className="text-gray-500">qty: {item.qty}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{(item.price * item.qty).toLocaleString()} MT</p>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirm({ roomId: room._id!, itemId: item._id!, itemName: item.name });
                              setDeleteReason('');
                            }}
                            className="text-red-500 hover:text-red-700 mt-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Painel de Ações */}
      {selectedRoom && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-600 uppercase font-bold">Subtotal</p>
              <p className="font-black text-lg">{selectedRoom.subtotal.toLocaleString()} MT</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase font-bold">TOTAL</p>
              <p className="font-black text-lg text-orange-600">{selectedRoom.total.toLocaleString()} MT</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-gray-600 uppercase">Fechar Room Como:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setCloseConfirm({ roomId: selectedRoom._id!, status: 'paid-full' });
                  setCloseReason('');
                  setTempAmountPaid(0);
                }}
                className="py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-md transition uppercase"
              >
                ✅ Pago 100%
              </button>
              <button
                onClick={() => {
                  setCloseConfirm({ roomId: selectedRoom._id!, status: 'paid-50' });
                  setCloseReason('');
                  setTempAmountPaid(0);
                }}
                className="py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-md transition uppercase"
              >
                ⏳ Pagar 50%
              </button>
              <button
                onClick={() => {
                  setCloseConfirm({ roomId: selectedRoom._id!, status: 'reserved' });
                  setCloseReason('');
                  setTempAmountPaid(0);
                }}
                className="py-2 bg-red-500 hover:bg-red-700 text-white text-xs font-black rounded-md transition uppercase"
              >
                📦 Reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Remover Item */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-red-600" />
              <h3 className="font-black text-gray-900 uppercase">Confirmar Remoção</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Tem a certeza que deseja remover <span className="font-bold">{deleteConfirm.itemName}</span> do room?
            </p>
            <div className="mb-4">
              <label className="text-xs font-black text-gray-600 uppercase block mb-2">Motivo da Remoção</label>
              <input
                type="text"
                placeholder="Ex: Cliente mudou de ideia, produto fora de stock..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-md transition uppercase text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => removeItemFromRoom(deleteConfirm.roomId, deleteConfirm.itemId, deleteReason)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-md transition uppercase text-xs"
              >
                Remover Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Room – com input para valor parcial */}
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Check size={24} className="text-orange-600" />
              <h3 className="font-black text-gray-900 uppercase">Confirmar Fechamento</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Deseja fechar este room como{' '}
              <span className="font-bold">
                {closeConfirm.status === 'paid-full'
                  ? '✅ Pago 100%'
                  : closeConfirm.status === 'paid-50'
                  ? '⏳ Pago 50%'
                  : '📦 Reserva'}
              </span>
              ?
            </p>

            {/* Input de valor recebido – só aparece para paid-50 e reserved */}
            {(closeConfirm.status === 'paid-50' || closeConfirm.status === 'reserved') && (
              <div className="mb-6">
                <label className="text-xs font-black text-gray-700 uppercase block mb-2">
                  Valor recebido agora (MT)
                </label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={tempAmountPaid || ''}
                    onChange={e => setTempAmountPaid(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-base font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Faltam: {(selectedRoom?.total - tempAmountPaid || 0).toLocaleString()} MT
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-black text-gray-600 uppercase block mb-2">Notas (Opcional)</label>
              <textarea
                placeholder="Ex: O cliente voltará amanhã para pagar o resto..."
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCloseConfirm(null);
                  setTempAmountPaid(0);
                }}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition uppercase text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  closeRoom(
                    closeConfirm.roomId,
                    closeConfirm.status,
                    closeReason,
                    tempAmountPaid
                  );
                }}
                className={`flex-1 py-3 text-white font-black rounded-lg transition uppercase text-sm ${
                  closeConfirm.status === 'paid-full'
                    ? 'bg-green-600 hover:bg-green-700'
                    : closeConfirm.status === 'paid-50'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};