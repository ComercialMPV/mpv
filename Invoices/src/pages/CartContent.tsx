import React, { useEffect, useRef, useState } from 'react';
import {  CheckCircle2, ChevronDown, Clock, DollarSign, Minus, Phone, Plus, Search, UserCheck, UserPlus } from 'lucide-react';
import { api, API_BASE_URL } from '../services/api';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '../components/Receipt';
import toast from 'react-hot-toast';

// Coloque este componente ANTES do componente Sales (no mesmo arquivo ou em arquivo separado)

// =============================================
//          COMPONENTE CARTCONTENT
// =============================================
interface CartContentProps {
  hideHeader?: boolean;
  cart: any[];
  saleStatus: string;
  setSaleStatus: (value: string) => void;
  selectedClient: any | null;
  setSelectedClient: (client: any | null) => void;
  clientSearchTerm: string;
  setClientSearchTerm: (value: string) => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;
  clients: any[];
  setClients?: (clients: any[]) => void;
  showQuickClient: boolean;
  setShowQuickClient: (show: boolean) => void;
  quickClientName: string;
  setQuickClientName: (name: string) => void;
  quickClientPhone: string;
  setQuickClientPhone: (phone: string) => void;
  useWallet: boolean;
  setUseWallet: (use: boolean) => void;
  remainingAmountPaid?: number;
  setRemainingAmountPaid?: (value: number) => void;
  amountPaid: number;
  setAmountPaid: (value: number) => void;
  dueDate: string;
  setDueDate: (date: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  subtotal: number;
  total: number;
  handleCheckout: () => Promise<void>;
  decreaseQty: (id: string) => void;
  addToCart: (item: any) => void;
  quickClientNameRef: React.RefObject<HTMLInputElement>;
  quickClientPhoneRef: React.RefObject<HTMLInputElement>;
  clientSearchInputRef: React.RefObject<HTMLInputElement>;
  setCart?: (cart: any[]) => void;
  onOpenRooms?: () => void;
  openRoomCount?: number;
  showConfirmModal: boolean;
  setShowConfirmModal: (show: boolean) => void;
}

export const CartContent: React.FC<CartContentProps> = ({
  hideHeader = false,
  cart = [],
  saleStatus,
  setSaleStatus,
  selectedClient,
  setSelectedClient,
  clientSearchTerm,
  setClientSearchTerm,
  searchResults,
  setSearchResults,
  clients,
  setClients,
  showQuickClient,
  setShowQuickClient,
  quickClientName,
  setQuickClientName,
  quickClientPhone,
  setQuickClientPhone,
  useWallet,
  setUseWallet,
  remainingAmountPaid = 0,
  setRemainingAmountPaid = () => {},
  amountPaid,
  setAmountPaid,
  dueDate,
  setDueDate,
  customerPhone,
  setCustomerPhone,
  paymentMethod,
  setPaymentMethod,
  subtotal,
  total,
  handleCheckout,
  decreaseQty,
  addToCart,
  quickClientNameRef,
  quickClientPhoneRef,
  clientSearchInputRef,
  setCart,
  onOpenRooms,
  openRoomCount = 0,
  showConfirmModal,
  setShowConfirmModal,
}) => {
  // Calculate wallet values
  const walletBalance = selectedClient?.balance || 0;
  const walletCoversTotal = walletBalance >= total;
  const actualWalletDeduction = useWallet ? Math.min(walletBalance, total) : 0;
  const remainingAmount = useWallet ? Math.max(0, total - walletBalance) : 0;
const receiptRef = useRef<HTMLDivElement>(null);
const [justCompletedSale, setJustCompletedSale] = useState<any>(null); // store the saved sale
  // Auto-set due date to 5 days from now if not set and there's remaining amount
  useEffect(() => {
    if (remainingAmount > 0 && !dueDate) {
      const fifthDay = new Date();
      fifthDay.setDate(fifthDay.getDate() + 5);
      setDueDate(fifthDay.toISOString().split('T')[0]);
    }
  }, [remainingAmount, dueDate, setDueDate]);

  const transferToRoom = async () => {
    if (!cart || cart.length === 0) return toast.error('Carrinho vazio');

    const clientNameToUse = selectedClient?.name || quickClientName || 'Cliente';
    const clientPhoneToUse = selectedClient?.phone || quickClientPhone || '';
    let clientIdToUse: string | undefined = selectedClient?._id;

    // Generate email if needed
    const generateEmail = (name: string, phone: string) => {
      const sanitized = name.toLowerCase().replace(/\s+/g, '').substring(0, 20);
      const hash = phone ? phone.replace(/\D/g, '').slice(-4) : Math.random().toString(36).substring(7);
      return `${sanitized}${hash}@cliente.local`;
    };

    // ensure client is stored in our database if it's new
    try {
      if (!clientIdToUse) {
        const already = clients.find(
          c => c.name === clientNameToUse || (clientPhoneToUse && c.phone === clientPhoneToUse)
        );
        if (already) {
          clientIdToUse = already._id;
          setSelectedClient && setSelectedClient(already);
        } else {
          const newClient = await api.clients.create({ 
            name: clientNameToUse, 
            phone: clientPhoneToUse,
            email: generateEmail(clientNameToUse, clientPhoneToUse)
          });
          setClients && setClients([...clients, newClient]);
          setSelectedClient && setSelectedClient(newClient);
          clientIdToUse = newClient._id;
        }
      }
    } catch (err) {
      console.warn('could not save new client', err);
    }

    try {
      // look for an existing open room for this customer
      let room: any | null = null;
      try {
        const openRooms = await api.pendingRooms.getAll('open');
        room = openRooms.find(
          (r: any) =>
            (clientIdToUse && r.clientId === clientIdToUse) ||
            (r.clientName === clientNameToUse) ||
            (clientPhoneToUse && r.clientPhone === clientPhoneToUse)
        );
      } catch (e) {
        console.warn('failed to fetch open rooms', e);
      }

      if (!room) {
        room = await api.pendingRooms.create({
          clientName: clientNameToUse,
          clientPhone: clientPhoneToUse,
        });
        if (!room || !room._id) throw new Error('Falha ao criar room');
      }

      // add items sequentially
      for (const it of cart) {
        await api.pendingRooms.addItem(room._id, {
          itemId: it._id,
          name: it.name,
          price: it.basePrice || it.price || it.billingPricePerCycle || 0,
          qty: it.qty || 1,
          type: 'type' in it ? 'bundle' : !('stockQuantity' in it) ? 'service' : 'product',
        });
      }

      toast.success(`Itens transferidos para o room ${room.ticketCode}`);
      setCart && setCart([]);
    } catch (err: any) {
      console.error('create room error (api):', err);
      try {
        const token = localStorage.getItem('accessToken');
        const resp = await fetch(`${API_BASE_URL}/pending-rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ clientName: clientNameToUse, clientPhone: clientPhoneToUse }),
        });
        const text = await resp.text();
        console.error('Diagnostic response:', resp.status, text);
        toast.error(`Erro do servidor: ${resp.status} - ${text}`);
      } catch (e) {
        console.error('Diagnostic fetch failed', e);
        toast.error(err.message || 'Erro ao transferir para room');
      }
    }
  };
  return (
    <div className="bg-white rounded-md shadow-sm flex flex-col h-full border border-gray-100 overflow-hidden">
      {!hideHeader && (
        <div className="p-6 pb-4 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-black text-gray-900 uppercase">Carrinho</h3>
          <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
            {cart?.length ?? 0} ITENS
          </span>
          {onOpenRooms && (
            <button
              onClick={onOpenRooms}
              className="relative ml-3 p-1 hover:bg-gray-100 rounded-full"
              title="Ver rooms pendentes"
            >
              <Clock size={18} className="text-gray-600" />
              {openRoomCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {openRoomCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {/* Tipo de Transação */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block tracking-widest">
            Tipo de Transação
          </label>
          <div className="relative group">
            <select
              value={saleStatus}
              onChange={(e) => setSaleStatus(e.target.value)}
              className={`w-full appearance-none px-4 py-3.5 rounded-md text-xs font-black uppercase tracking-tight border-2 transition-all cursor-pointer outline-none ${
                saleStatus === 'Cancelada'
                  ? 'bg-red-50 border-red-100 text-red-600'
                  : saleStatus === 'Pago 100%'
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-white border-blue-100 text-blue-600 focus:border-blue-500 shadow-sm'
              }`}
            >
              <option value="Pago 100%">Pago 100%</option>
              <option value="Pago 50%">Pagamento Parcial (50%)</option>
              <option value="Reserva">Reserva de Stock</option>
              <option value="Pendente">Aguardando Pagamento</option>
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
              strokeWidth={3}
            />
          </div>
        </div>

    {/* ==================== SELEÇÃO DE CLIENTE ==================== */}
<div className="bg-blue-50/50 p-4 rounded-md border border-blue-100 transition-all">
  <div className="flex justify-between items-center mb-3">
    <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Cliente</label>
    {selectedClient && (
      <button
        onClick={() => {
          setSelectedClient(null);
          setClientSearchTerm('');
          setUseWallet(false);
        }}
        className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase"
      >
        Remover
      </button>
    )}
  </div>

  {showQuickClient ? (
    // ... (mantém o quick client igual)
    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
      <input
        ref={quickClientNameRef}
        placeholder="Nome Completo"
        className="w-full px-4 py-3 text-xs rounded-md border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm"
        value={quickClientName}
        onChange={(e) => setQuickClientName(e.target.value)}
      />
      <input
        ref={quickClientPhoneRef}
        type="tel"
        placeholder="Telefone/Telemóvel"
        className="w-full px-4 py-3 text-xs rounded-md border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm"
        value={quickClientPhone}
        onChange={(e) => setQuickClientPhone(e.target.value)}
      />
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setShowQuickClient(false)}
          className="flex-1 py-2 bg-gray-200 text-gray-600 text-[10px] font-black rounded-md uppercase"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            setSelectedClient({ name: quickClientName, phone: quickClientPhone });
            setShowQuickClient(false);
            setQuickClientName('');
            setQuickClientPhone('');
          }}
          className="flex-[2] py-2 bg-blue-600 text-white text-[10px] font-black rounded-md uppercase shadow-md shadow-blue-100"
        >
          Confirmar Cliente
        </button>
      </div>
    </div>
  ) : (
    <div className="relative">
      {!selectedClient ? (
        <>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            ref={clientSearchInputRef}
            placeholder="Pesquisar cliente por nome ou telefone..."
            className="w-full pl-11 pr-4 py-3 text-xs rounded-md border-white outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm bg-white"
            value={clientSearchTerm}
            onChange={(e) => {
              const term = e.target.value.trim();
              setClientSearchTerm(term);

              if (term.length > 0 && Array.isArray(clients)) {
                const filtered = clients.filter((c: any) => {
                  if (!c) return false;
                  const nameMatch = c.name 
                    ? c.name.toLowerCase().includes(term.toLowerCase()) 
                    : false;
                  const phoneMatch = c.phone 
                    ? c.phone.toString().includes(term) 
                    : false;
                  return nameMatch || phoneMatch;
                });
                setSearchResults(filtered);
              } else {
                setSearchResults([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setClientSearchTerm('');
                setSearchResults([]);
              }
            }}
            autoComplete="off"
          />

          {/* Dropdown de resultados */}
          {clientSearchTerm.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-xl border border-gray-100 z-50 max-h-60 overflow-y-auto p-2"
              onMouseDown={(e) => e.preventDefault()}
            >
              {searchResults.length > 0 ? (
                searchResults.map((client: any) => (
                  <button
                    key={client._id}
                    onClick={() => {
                      setSelectedClient({ ...client });
                      setClientSearchTerm('');
                      setUseWallet(false);
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-md transition-colors text-left"
                  >
                    <div>
                      <p className="text-[11px] font-black uppercase text-gray-800">{client.name}</p>
                      <p className="text-[9px] text-gray-500">{client.phone || 'Sem telefone'}</p>
                    </div>
                    <UserCheck size={14} className="text-blue-500" />
                  </button>
                ))
              ) : (
                <button
                  onClick={() => {
                    setQuickClientName(clientSearchTerm);
                    setShowQuickClient(true);
                    setSearchResults([]);
                  }}
                  className="w-full p-3 flex items-center gap-3 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserPlus size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase">Criar novo cliente "{clientSearchTerm}"</p>
                    <p className="text-[9px] opacity-70">Clique para registar</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        // Cliente selecionado (mantido igual)
        <div className="flex flex-col gap-2 bg-white p-3 rounded-md shadow-sm border border-blue-100 animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-sm">
              {selectedClient?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-gray-900 uppercase leading-none mb-1">
                {selectedClient?.name}
              </p>
              <div className="flex items-center gap-1 text-gray-500">
                <Phone size={10} />
                <span className="text-[10px] font-medium">{selectedClient?.phone || 'Sem telefone'}</span>
              </div>
            </div>
            <div className="p-1 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 size={16} />
            </div>
          </div>

          {typeof selectedClient?.balance === 'number' && (
            <div className="pt-2 border-t border-gray-50 mt-1">
              <div className="text-[11px] font-bold text-gray-700 mb-2">
                Saldo: {selectedClient.balance.toLocaleString()} {selectedClient.currency || 'MT'}
              </div>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  disabled={!(selectedClient.balance > 0)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                Debitar do saldo da carteira
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )}
</div>

        {/* Itens do Carrinho */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            Itens Selecionados
          </h4>
          {cart.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs italic">Carrinho vazio</p>
          ) : (
            cart.map((item: any) => (
              <div key={item._id} className="flex gap-4 items-center bg-gray-50/50 p-2 rounded-lg">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-gray-800 truncate">{item.name}</h5>
                  <p className="text-[10px] text-blue-600 font-black">
                    {(item.basePrice || item.price || item.billingPricePerCycle || 0).toLocaleString()} MT
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-md p-1 shadow-sm border border-gray-100">
                  <button
                    onClick={() => decreaseQty(item._id)}
                    className="p-1.5 hover:bg-gray-50 rounded-md transition"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-black w-6 text-center">{item.qty}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="p-1.5 hover:bg-gray-50 rounded-md transition"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer com totais e finalização */}
      <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
        {(paymentMethod === 'M-Pesa' || paymentMethod === 'E-Mola') && (
          <div className="space-y-2 animate-in slide-in-from-top-4">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">
              Telefone do Pagamento
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-blue-100 rounded-md text-sm font-bold outline-none focus:border-blue-500 shadow-sm"
                placeholder="84 / 85 / 82..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {!useWallet && (
          <div className="grid grid-cols-2 gap-2">
            {['Cash', 'M-Pesa'].map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-3 rounded-md text-[10px] font-black uppercase transition-all ${
                  paymentMethod === m
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-400 border border-gray-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {useWallet && !walletCoversTotal && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 animate-in slide-in-from-top-2">
            <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Saldo Insuficiente</p>
            <div className="space-y-2 text-[9px] text-amber-700">
              <div className="flex justify-between">
                <span>Total a Pagar:</span>
                <span className="font-bold">{Number(total || 0).toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between">
                <span>Saldo Disponível:</span>
                <span className="font-bold text-green-600">{walletBalance.toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-amber-200">
                <span>Valor em Falta:</span>
                <span className="font-bold text-red-600">{remainingAmount.toLocaleString()} MT</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase">Subtotal: {subtotal.toLocaleString()} MT</span>
            <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">Total a Pagar</span>
          </div>
          <div className="text-right">
            <span className="text-3xl md:text-4xl font-black text-blue-600 tracking-tighter">
              {Number(total || 0).toLocaleString()}
              <span className="text-xs font-bold text-gray-400 ml-1">MT</span>
            </span>
          </div>
        </div>

        {saleStatus !== 'Pago 100%' && (
          <div className="space-y-3 pt-2 border-t border-gray-200 mt-2 animate-in slide-in-from-top-2">
            {(saleStatus === 'Pago 50%' || saleStatus === 'Reserva') && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-blue-500 uppercase">Valor Recebido</label>
                  <span className="text-[10px] font-bold text-red-500 uppercase">
                    Falta: {Number((total || 0) - (useWallet ? actualWalletDeduction : amountPaid || 0) - (remainingAmountPaid || 0)).toLocaleString()} MT
                  </span>
                </div>
                {useWallet && !walletCoversTotal ? (
                  <div className="space-y-2">
                    <div className="relative bg-green-50 border-2 border-green-500 rounded-md p-3">
                      <p className="text-[10px] font-black text-green-600 mb-1">Valor da Carteira</p>
                      <p className="text-lg font-black text-green-700">{actualWalletDeduction.toLocaleString()} MT</p>
                    </div>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                      <input
                        type="number"
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-orange-300 rounded-md text-lg font-black outline-none shadow-lg shadow-orange-100"
                        placeholder="Valor em falta (opcional)"
                        value={remainingAmountPaid}
                        onChange={(e) => setRemainingAmountPaid(Number(e.target.value) || 0)}
                        max={remainingAmount}
                      />
                      <p className="text-[9px] text-orange-600 font-bold mt-1 px-1">Máximo: {remainingAmount.toLocaleString()} MT</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input
                      type="number"
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-blue-500 rounded-md text-lg font-black outline-none shadow-lg shadow-blue-100"
                      value={useWallet ? actualWalletDeduction : amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      disabled={useWallet}
                    />
                  </div>
                )}
              </div>
            )}

            {(saleStatus !== 'Pago 100%' && (remainingAmount > 0 || (saleStatus === 'Pago 50%' || saleStatus === 'Reserva'))) && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Data de Pagamento Final</label>
                  {useWallet && !walletCoversTotal && (
                    <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded">Obrigatório</span>
                  )}
                </div>
                <input
                  type="date"
                  className={`w-full px-4 py-3 bg-white rounded-md outline-none text-sm font-bold shadow-sm transition-all ${
                    useWallet && !walletCoversTotal
                      ? 'border-2 border-red-400 focus:border-red-600'
                      : 'border-2 border-blue-100 focus:border-blue-500'
                  }`}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required={useWallet && !walletCoversTotal}
                />
              </div>
            )}
          </div>
        )}

<button
  onClick={async () => {
    if (cart.length === 0) return;
    setShowConfirmModal(true);        // still show confirmation
  }}
  disabled={cart.length === 0}
  className="w-full py-4 bg-blue-600 text-white rounded-md font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition disabled:bg-gray-200 disabled:shadow-none uppercase mt-2"
>
  Finalizar {saleStatus === 'Pago 100%' ? 'Venda' : 'Registo'}
</button>
        <button
          onClick={transferToRoom}
          disabled={cart.length === 0}
          className="w-full py-4 bg-slate-900 text-white rounded-md font-black text-sm shadow-md hover:bg-blue-700 active:scale-95 transition disabled:bg-gray-200 disabled:shadow-none uppercase mt-2"
        >
          Abrir Room Pendência
        </button>
      </div>
    </div>
  );
};