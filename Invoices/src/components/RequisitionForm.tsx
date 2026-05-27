// src/components/RequisitionForm.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, X, FileText, Minus, Send, User, Package, Plus, Trash2, Info } from 'lucide-react';
import { api, Service, Product, Bundle, Client, Requisition } from '../services/api';
import toast from 'react-hot-toast';

interface RequisitionFormProps {
  initialData?: Requisition | null;
  onSuccess?: () => void;
}

type ItemType = 'service' | 'product' | 'bundle';

interface FormItem {
  itemType: ItemType;
  itemId: string;
  quantity: number;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ initialData, onSuccess }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    items: [{ itemType: 'service' as ItemType, itemId: '', quantity: 1 }] as FormItem[],
    requestedInstallments: 1,
    deliveryDate: '',
    notes: '',
    requestIntent: 'quotation' as 'quotation' | 'invoice',
  });

  const [totals, setTotals] = useState({ subtotal: 0, penalty: 0, grandTotal: 0 });

  // Load all catalogs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cData, sData, pData, bData] = await Promise.all([
          api.clients.getAll(),
          api.services.getAll(),
          api.products.getAll(),
          api.bundles.getAll(),
        ]);

        setClients(cData?.clients || cData || []);
        setServices(sData || []);
        setProducts(pData || []);
        setBundles(bData || []);
      } catch (error) {
        toast.error('Erro ao carregar dados iniciais');
      }
    };
    fetchData();
  }, []);

  // Populate form when editing
useEffect(() => {
  if (initialData) {
    const mappedItems: FormItem[] = initialData.items?.map((item: any) => {
      let itemType = (item.itemType || 'service').toLowerCase() as ItemType;
      
      // Normaliza caso venha como 'Service', 'service', etc.
      if (itemType === 'service' || itemType === 'Service') itemType = 'service';
      if (itemType === 'product' || itemType === 'Product') itemType = 'product';
      if (itemType === 'bundle' || itemType === 'Bundle') itemType = 'bundle';

      return {
        itemType,
        itemId: item.item?._id || item.item || '',
        quantity: item.quantity || 1,
      };
    }) || [{ itemType: 'service', itemId: '', quantity: 1 }];

    setFormData({
      client: typeof initialData.client === 'string' ? initialData.client : (initialData.client as any)?._id || '',
      items: mappedItems,
      requestedInstallments: initialData.requestedInstallments || 1,
      deliveryDate: initialData.deliveryDate 
        ? new Date(initialData.deliveryDate).toISOString().split('T')[0] 
        : '',
      notes: initialData.notes || '',
      requestIntent: (initialData as any).requestIntent || 'quotation',
    });
  }
}, [initialData]);

  // Calculate totals (supports Service + Product + Bundle)
  useEffect(() => {
    let subtotal = 0;
    let minAllowedInstallments = 99;
    let maxPenaltyRate = 0;

    formData.items.forEach(item => {
      let entry: any = null;
      let price = 0;

      if (item.itemType === 'service') {
        entry = services.find(s => s._id === item.itemId);
        price = entry?.basePrice || 0;

        if (entry) {
          minAllowedInstallments = Math.min(minAllowedInstallments, entry.allowedInstallments || 3);
          maxPenaltyRate = Math.max(maxPenaltyRate, entry.penaltyPercentagePerInstallment || 0);
        }
      } 
      else if (item.itemType === 'product') {
        entry = products.find(p => p._id === item.itemId);
        price = entry?.basePrice || entry?.price || 0;
      } 
      else if (item.itemType === 'bundle') {
        entry = bundles.find(b => b._id === item.itemId);
        
        if (entry) {
          // LÓGICA CORRETA PARA BUNDLES
          if (entry.type === 'Subscription') {
            price = entry.billingPricePerCycle || entry.price || 0;
          } else {
            // Combo normal
            price = entry.price || 0;
          }
        }
      }

      if (entry) {
        subtotal += price * item.quantity;
      }
    });

    let penalty = 0;
    if (formData.requestedInstallments > minAllowedInstallments) {
      const extra = formData.requestedInstallments - minAllowedInstallments;
      penalty = subtotal * (extra * (maxPenaltyRate / 100));
    }

    setTotals({ subtotal, penalty, grandTotal: subtotal + penalty });
  }, [formData, services, products, bundles]);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { itemType: 'service', itemId: '', quantity: 1 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: 'itemType' | 'itemId' | 'quantity', value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Reset itemId when changing type
    if (field === 'itemType') {
      newItems[index].itemId = '';
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client) return toast.error('Selecione um cliente');
    if (formData.items.some(i => !i.itemId)) return toast.error('Selecione um item para cada linha');

    setLoading(true);
    try {
      const payload = {
        client: formData.client,
        items: formData.items.map(item => ({
          itemType: item.itemType,
          item: item.itemId,
          quantity: item.quantity
        })),
        requestedInstallments: formData.requestedInstallments,
        deliveryDate: formData.deliveryDate,
        notes: formData.notes,
        requestIntent: formData.requestIntent,
      };

      if (initialData?._id) {
        await api.requisitions.update(initialData._id, payload);
        toast.success('Requisição atualizada com sucesso');
      } else {
        await api.requisitions.create(payload);
        toast.success('Requisição criada com sucesso');
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Falha na operação');
    } finally {
      setLoading(false);
    }
  };

  // Helper para obter catálogo correto
  // Substitua o getCatalog atual por este:
const getCatalog = (type: ItemType) => {
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'service') return services;
  if (normalizedType === 'product') return products;
  return bundles;
};
  // Helper para mostrar preço no select
  const getItemPriceLabel = (type: ItemType, id: string) => {
    if (type === 'service') {
      const s = services.find(item => item._id === id);
      return s?.basePrice ? `${s.basePrice} MT` : '';
    }
    if (type === 'product') {
      const p = products.find(item => item._id === id);
      return p?.basePrice ? `${p.basePrice} MT` : '';
    }
    if (type === 'bundle') {
      const b = bundles.find(item => item._id === id);
      if (!b) return '';
      
      const price = b.type === 'Subscription' 
        ? b.billingPricePerCycle || b.price 
        : b.price;
      
      return price ? `${price} MT` : '';
    }
    return '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FileText className="h-6 w-6" /> 
          {initialData ? `Editar Requisição ${initialData.number}` : 'Nova Requisição Interna'}
        </h2>
        <p className="text-blue-100 mt-1">Suporta Serviços, Produtos e Combos</p>
      </div>

     <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
  {/* Client + Date + Intent */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-500 uppercase">Cliente *</label>
      <select 
        required 
        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
        value={formData.client}
        onChange={e => setFormData({ ...formData, client: e.target.value })}
      >
        <option value="">Selecione um cliente...</option>
        {clients.map(c => (
          <option key={c._id} value={c._id}>
            {c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}
          </option>
        ))}
      </select>
    </div>

    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-500 uppercase">Data de Entrega *</label>
      <input 
        type="date" 
        required 
        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
        value={formData.deliveryDate}
        onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
      />
    </div>

    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
      <label className="block text-xs font-bold text-gray-500 uppercase">Tipo de Pedido</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, requestIntent: 'quotation' })}
          className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 border-2 ${
            formData.requestIntent === 'quotation' 
              ? 'bg-amber-50 text-amber-700 border-amber-500 shadow-sm' 
              : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
          }`}
        >
          COTAÇÃO
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, requestIntent: 'invoice' })}
          className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 border-2 ${
            formData.requestIntent === 'invoice' 
              ? 'bg-purple-50 text-purple-700 border-purple-500 shadow-sm' 
              : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
          }`}
        >
          FATURA
        </button>
      </div>
    </div>
  </div>

  {/* Items Section */}
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-3">
      <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
        <Package className="w-5 h-5 text-blue-600 shrink-0" /> 
        <span>Itens do Pedido</span>
      </h3>
      <button 
        type="button" 
        onClick={addItem} 
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg"
      >
        <Plus className="w-4 h-4" /> Adicionar Item
      </button>
    </div>

    <div className="space-y-4">
      {formData.items.map((item, index) => {
        const currentCatalog = getCatalog(item.itemType);
        return (
          <div key={index} className="relative bg-white border border-gray-200 p-4 md:p-6 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
            {/* Delete button positioned for mobile accessibility */}
            <button 
              type="button" 
              onClick={() => removeItem(index)}
              disabled={formData.items.length === 1}
              className="absolute -top-2 -right-2 p-2 bg-white border border-gray-200 text-red-500 hover:bg-red-50 rounded-full shadow-sm disabled:hidden transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Type */}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo</label>
                <select 
                  value={item.itemType}
                  onChange={e => updateItem(index, 'itemType', e.target.value as ItemType)}
                  className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 focus:bg-white text-sm"
                >
                  <option value="service">Serviço</option>
                  <option value="product">Produto</option>
                  <option value="bundle">Combo</option>
                </select>
              </div>

              {/* Item Select com Preço visível */}
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Item</label>
                      <select 
                        required
                        value={item.itemId}
                        onChange={e => updateItem(index, 'itemId', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 focus:bg-white text-sm"
                      >
                        <option value="">Selecione...</option>
                        {currentCatalog.map((entry: any) => {
                          let priceLabel = '';
                          if (item.itemType === 'bundle') {
                            priceLabel = entry.type === 'Subscription' 
                              ? `${entry.billingPricePerCycle || entry.price} MT (Subscrição)` 
                              : `${entry.price} MT`;
                          } else {
                            priceLabel = `${entry.basePrice || entry.price} MT`;
                          }

                          return (
                            <option key={entry._id} value={entry._id}>
                              {entry.name} — {priceLabel}
                            </option>
                          );
                        })}
                      </select>
                    </div>

              {/* Quantity */}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Qtd.</label>
                <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                   <button 
                    type="button"
                    onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                    className="p-3 hover:bg-gray-200 text-gray-600"
                   >
                     <Minus size={14} />
                   </button>
                   <input 
                    type="number" 
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-sm font-bold focus:outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                    className="p-3 hover:bg-gray-200 text-gray-600"
                   >
                     <Plus size={14} />
                   </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>

  {/* Footer: Installments + Notes + Totals */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 pt-8 border-t border-gray-100">
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Financiamento</label>
        <div className="relative">
          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="number" 
            min="1"
            className="w-full border border-gray-300 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            placeholder="Nº de parcelas"
            value={formData.requestedInstallments}
            onChange={e => setFormData({ ...formData, requestedInstallments: parseInt(e.target.value) || 1 })}
          />
        </div>
        <p className="mt-2 text-[10px] text-gray-400 italic">O número de parcelas pode influenciar o acréscimo final.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-500 uppercase">Observações Internas</label>
        <textarea 
          className="w-full border border-gray-300 rounded-2xl p-4 h-32 focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Instruções especiais, endereço de entrega, referências..."
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </div>

    {/* Summary Box */}
    <div className="bg-zinc-900 p-6 md:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex justify-between text-zinc-400 text-sm">
          <span>Subtotal do Pedido</span>
          <span className="font-mono">{totals.subtotal.toLocaleString()} MT</span>
        </div>
        
        {totals.penalty > 0 && (
          <div className="flex justify-between text-orange-400 text-sm">
            <span className="flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Juros/Acréscimo</span>
            <span className="font-mono">+{totals.penalty.toLocaleString()} MT</span>
          </div>
        )}
        
        <div className="pt-6 mt-2 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2">
            <span className="text-zinc-400 font-medium">TOTAL FINAL</span>
            <span className="text-4xl md:text-5xl font-black text-blue-400 tracking-tighter">
              {totals.grandTotal.toLocaleString()} <span className="text-xl font-normal">MT</span>
            </span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="mt-8 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-black py-5 rounded-2xl text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-6 h-6" />
              {initialData ? 'ATUALIZAR' : 'FINALIZAR REQUISIÇÃO'}
            </>
          )}
        </button>
      </div>
    </div>
  </div>
</form>
    </div>
  );
};