// src/components/BundleForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Upload, Package, Layers } from 'lucide-react';
import { api, Product, Bundle, API_BASE_URL } from '../services/api'; // ajuste o caminho
import { ImageUploader } from './ImageUploader'; // assumindo que tens este componente
import toast from 'react-hot-toast';

interface BundleFormProps {
  initialBundle?: Bundle | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface BundleItem {
  productId: string;
  name: string;
  quantity: number;
  itemType: 'Product' | 'Service';
}

interface LimitItem {
  description: string;
  maxValue: number;
}

export default function BundleForm({ initialBundle, onSuccess, onCancel }: BundleFormProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const isEdit = !!initialBundle;

  const [form, setForm] = useState({
    name: '',
    type: 'Combo' as 'Combo' | 'Subscription',
    description: '',
    image: '',
    discountPercentage: 0,
    price: 0,
    originalPrice: 0,
    items: [] as BundleItem[],
    // Subscription fields
    billingCycle: 'Mensal' as 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual',
    billingPricePerCycle: 0,
    includedLimits: [] as LimitItem[],
  });

  // Carregar produtos e serviços disponíveis
  useEffect(() => {
    const loadData = async () => {
      try {
        const [pData, sData] = await Promise.all([
          api.products.getAll(),
          api.services.getAll(),
        ]);
        setAllProducts(pData);
        setAllServices(sData);
      } catch (err) {
        toast.error('Erro ao carregar produtos/serviços');
      }
    };
    loadData();
  }, []);

  // Preencher formulário se for edição
  useEffect(() => {
    if (initialBundle) {
      setForm({
        name: initialBundle.name || '',
        type: initialBundle.type || 'Combo',
        description: initialBundle.description || '',
        image: initialBundle.image || '',
        discountPercentage: initialBundle.discountPercentage || 0,
        price: initialBundle.price || 0,
        originalPrice: initialBundle.originalPrice || 0,
        items: (initialBundle.items || []).map((i: any) => ({
          productId: i.productId?._id || i.productId,
          name: i.productId?.name || i.name || 'Item',
          quantity: i.quantity || 1,
          itemType: i.itemType || 'Product',
        })),
        billingCycle: initialBundle.billingCycle || 'Mensal',
        billingPricePerCycle: initialBundle.billingPricePerCycle || initialBundle.price || 0,
        includedLimits: initialBundle.includedLimits || [],
      });
    }
  }, [initialBundle]);

  const isSubscription = form.type === 'Subscription';

  // Cálculo do preço original (baseado nos itens ou billingPricePerCycle)
 const calculateOriginalPrice = () => {
  return form.items.reduce((sum, item) => {
    let priceSource = 0;

    if (item.itemType === 'Product') {
      const product = allProducts.find(p => p._id === item.productId);
      priceSource = product?.basePrice || 0;
    } else if (item.itemType === 'Service') {
      const service = allServices.find(s => s._id === item.productId);
      priceSource = service?.basePrice || 0;
    }

    return sum + priceSource * item.quantity;
  }, 0);
};

  const originalPrice = calculateOriginalPrice();
  const finalPrice = Math.round(originalPrice * (1 - form.discountPercentage / 100));

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addItem = (item: any, itemType: 'Product' | 'Service') => {
  const existing = form.items.find(i => 
    i.productId === item._id && i.itemType === itemType
  );

  if (existing) {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.productId === item._id && i.itemType === itemType
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ),
    }));
  } else {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: item._id,
        name: item.name,
        quantity: 1,
        itemType,                    // ← Garante que o tipo fica correto
      }],
    }));
  }
  setSearchTerm('');
};

  const updateItemQuantity = (productId: string, itemType: 'Product' | 'Service', delta: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.productId === productId && i.itemType === itemType
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      ),
    }));
  };

  const removeItem = (productId: string, itemType: 'Product' | 'Service') => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(i => !(i.productId === productId && i.itemType === itemType)),
    }));
  };

  const addLimit = () => {
    setForm(prev => ({
      ...prev,
      includedLimits: [...prev.includedLimits, { description: '', maxValue: 0 }],
    }));
  };

  const updateLimit = (index: number, field: 'description' | 'maxValue', value: string | number) => {
    setForm(prev => {
      const newLimits = [...prev.includedLimits];
      newLimits[index] = { ...newLimits[index], [field]: value };
      return { ...prev, includedLimits: newLimits };
    });
  };

  const removeLimit = (index: number) => {
    setForm(prev => ({
      ...prev,
      includedLimits: prev.includedLimits.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('O nome do pacote é obrigatório');
      return;
    }

    if (form.items.length === 0 && !isSubscription) {
      toast.error('Adicione pelo menos um item ao combo');
      return;
    }

    if (isSubscription && form.billingPricePerCycle <= 0) {
      toast.error('Defina o preço por ciclo da subscrição');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        description: form.description,
        image: form.image,
        discountPercentage: form.discountPercentage,
        originalPrice,
        price: finalPrice,
        items: form.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          itemType: i.itemType,
        })),
      };

      if (isSubscription) {
        payload.billingCycle = form.billingCycle;
        payload.billingPricePerCycle = form.billingPricePerCycle;
        payload.includedLimits = form.includedLimits;
      }

      // guarda resultado quando criamos um novo pacote, para poder
      // fazer upload da imagem em seguida
      let createdBundle: Bundle | null = null;
      if (isEdit && initialBundle?._id) {
        await api.bundles.update(initialBundle._id, payload);
      } else {
        createdBundle = await api.bundles.create(payload);
      }

      if (selectedImageFile && !isEdit && createdBundle?._id) {
  const formData = new FormData();
  formData.append('image', selectedImageFile);

  try {
   
    const res = await fetch(`${API_BASE_URL}/bundles/${createdBundle._id}/image`, {
      method: 'POST',
      body: formData,    
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${res.status}: Upload falhou`);
    }

    const data = await res.json();

    if (data.image) {
      // Sucesso real: atualiza o estado/form com a URL final
      handleChange('image', data.image);
      toast.success('Imagem enviada com sucesso!');
    } else {
      toast.warning('Pacote criado, mas imagem não retornou URL');
    }
  } catch (err: any) {
    console.error('Falha no upload pós-criação:', err);
    toast.error(err.message || 'Imagem não foi enviada, mas o pacote foi criado');
  }
}

      toast.success(isEdit ? 'Pacote atualizado com sucesso' : 'Pacote criado com sucesso');
      onSuccess();
    } catch (err) {
      toast.error('Erro ao salvar pacote');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar' : 'Criar Novo'} {isSubscription ? 'Plano de Subscrição' : 'Combo'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Corpo do formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Nome + Tipo + Descrição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do pacote / plano <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: Combo Família 3P + Internet 100GB"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={form.type}
                onChange={e => handleChange('type', e.target.value as 'Combo' | 'Subscription')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="Combo">Combo (compra única)</option>
                <option value="Subscription">Subscrição / Plano recorrente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Detalhes do que inclui, vantagens, público-alvo..."
            />
          </div>

          {/* Imagem */}
         {isEdit ? (
  // Modo edição: mantém o uploader atual
  <div>
    <label>Imagem de capa</label>
    <ImageUploader
      itemId={initialBundle!._id}           // agora é seguro (tem _id real)
      itemType="bundle"
      existingImages={form.image ? [form.image] : []}
      onImagesUpdated={(urls) => handleChange('image', urls[0] || '')}
      maxFiles={1}
    />
  </div>
) : (
  // Modo criação: input de ficheiro simples
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Imagem de capa (opcional)
    </label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        if (e.target.files?.[0]) {
          setSelectedImageFile(e.target.files[0]);
          // Opcional: preview local
          const url = URL.createObjectURL(e.target.files[0]);
          handleChange('image', url); // preview temporário
        }
      }}
      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
    />
    {form.image && typeof form.image === 'string' && form.image.startsWith('blob:') && (
      <img src={form.image} alt="Preview" className="mt-4 max-h-48 rounded" />
    )}
    <p className="text-xs text-gray-500 mt-1">
      A imagem será enviada após criar o pacote.
    </p>
  </div>
)}

          {/* Desconto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                % de Desconto
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discountPercentage}
                onChange={e => handleChange('discountPercentage', Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço Original
              </label>
              <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-700 font-medium">
                {originalPrice.toLocaleString('pt-MZ')} MZN
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço Final (com desconto)
              </label>
              <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 font-bold text-xl">
                {finalPrice.toLocaleString('pt-MZ')} MZN
              </div>
            </div>
          </div>

          {/* Campos específicos de Subscription */}
          {isSubscription && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={20} /> Configuração da Subscrição
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço por Ciclo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.billingPricePerCycle}
                    onChange={e => handleChange('billingPricePerCycle', Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: 2500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciclo de Cobrança
                  </label>
                  <select
                    value={form.billingCycle}
                    onChange={e => handleChange('billingCycle', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              </div>

              {/* Limites / Benefícios Incluídos */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">O que inclui este plano?</h4>
                  <button
                    type="button"
                    onClick={addLimit}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar limite/benefício
                  </button>
                </div>

                <div className="space-y-3">
                  {form.includedLimits.map((limit, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <input
                        type="text"
                        value={limit.description}
                        onChange={e => updateLimit(idx, 'description', e.target.value)}
                        placeholder="Ex: Até 5 utilizadores simultâneos"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        min="0"
                        value={limit.maxValue}
                        onChange={e => updateLimit(idx, 'maxValue', Number(e.target.value))}
                        placeholder="5"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeLimit(idx)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  {form.includedLimits.length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm italic">
                      Nenhum benefício/limite adicionado ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Itens do Combo */}
          {!isSubscription && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} /> Itens incluídos no Combo
              </h3>

              {/* Busca de itens */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Procurar produto ou serviço para adicionar..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pl-10"
                />
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>

              {searchTerm && (
              <div className="border rounded-lg max-h-60 overflow-y-auto mb-4 bg-white shadow-sm">
                {[...allProducts.map(p => ({...p, itemType: 'Product' as const})),
                  ...allServices.map(s => ({...s, itemType: 'Service' as const}))]
                  .filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(item => (
                    <div
                      key={`${item.itemType}-${item._id}`}
                      className="px-4 py-3 hover:bg-purple-50 cursor-pointer flex justify-between items-center border-b last:border-b-0"
                      onClick={() => addItem(item, item.itemType)}
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.itemType === 'Product' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.itemType === 'Product' ? 'Produto' : 'Serviço'}
                          </span>
                          • {Number(item.basePrice || 0).toLocaleString('pt-MZ')} MT
                        </div>
                      </div>
                      <Plus size={18} className="text-purple-600" />
                    </div>
                  ))}

                {![...allProducts, ...allServices].some(item =>
                  item.name?.toLowerCase().includes(searchTerm.toLowerCase())
                ) && (
                  <div className="p-6 text-center text-gray-500">
                    Nenhum produto ou serviço encontrado
                  </div>
                )}
              </div>
            )}

              {/* Lista de itens adicionados */}
              <div className="space-y-3">
                {form.items.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                    <Package className="mx-auto h-10 w-10 mb-3 text-gray-400" />
                    <p>Nenhum item adicionado ainda</p>
                    <p className="text-sm">Pesquise e selecione produtos ou serviços acima</p>
                  </div>
                ) : (
                  form.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.itemType} • {item.quantity}x
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white border rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.itemType, -1)}
                            className="px-3 py-2 hover:bg-gray-100"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-4 font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.itemType, 1)}
                            className="px-3 py-2 hover:bg-gray-100"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.itemType)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="sticky bottom-0 bg-white border-t pt-4 pb-6 px-6 -mx-6 -mb-6 flex gap-4 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'A guardar...' : isEdit ? 'Atualizar Pacote' : 'Criar Pacote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}