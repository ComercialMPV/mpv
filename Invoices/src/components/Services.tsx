import React, { useState, useEffect } from 'react';
import { Plus, Save,CreditCard, Trash2, Package, Info, Eye, Edit, X, Check } from 'lucide-react';
import { api, Service } from '../services/api';
import { ImageUploader } from './ImageUploader';
import toast from 'react-hot-toast';

export const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'unit' as 'unit' | 'box' | 'set' | 'monthly' | 'weekly' | 'daily' | 'yearly',
    basePrice: 0,
    targetAudience: '',
    allowedInstallments: 3,
    penaltyPercentagePerInstallment: 2,
    includedItems: [] as { description: string; quantity: number; note?: string }[],
    isActive: true
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.services.getAll();
      setServices(data);
    } catch (error) {
      toast.error('Falha ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await api.services.update(editingService._id, formData);
        toast.success('Serviço atualizado com sucesso');
      } else {
        await api.services.create(formData);
        toast.success('Serviço criado com sucesso');
      }
      resetForm();
      loadServices();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Falha ao salvar serviço';
      toast.error(message);
      console.error('Erro completo:', error);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      unit: service.unit,
      basePrice: service.basePrice,
      targetAudience: service.targetAudience || '',
      allowedInstallments: service.allowedInstallments,
      penaltyPercentagePerInstallment: service.penaltyPercentagePerInstallment,
      includedItems: service.includedItems || [],
      isActive: service.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este serviço? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await api.services.delete(id);
      toast.success('Serviço apagado com sucesso');
      loadServices();
    } catch (error) {
      toast.error('Falha ao apagar serviço');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'unit',
      basePrice: 0,
      targetAudience: '',
      allowedInstallments: 3,
      penaltyPercentagePerInstallment: 2,
      includedItems: [],
      isActive: true
    });
    setEditingService(null);
    setShowForm(false);
  };

  return (
    <div className="p-4">
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
  <div className="space-y-1">
    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">
      Catálogo de Serviços
    </h1>
    <p className="text-xs text-gray-500 font-medium">
      Gerencie as ofertas e preços base dos seus serviços.
    </p>
  </div>

  <button 
    onClick={() => { resetForm(); setShowForm(true); }}
    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-200"
  >
    <Plus className="w-5 h-5" />
    <span className="text-sm font-bold uppercase tracking-wider">Novo Serviço</span>
  </button>
</div>

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 mb-10">
          {/* Image Uploader */}
          {editingService && (
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Galeria de Imagens</h3>
              <ImageUploader
                itemId={editingService._id}
                itemType="service"
                existingImages={editingService.images}
                onImagesUpdated={(images) => {
                  setEditingService({ ...editingService, images });
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Base *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={e => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
              <select
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="unit">Unidade</option>
                <option value="box">Caixa</option>
                <option value="set">Conjunto</option>
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="daily">Diário</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 border-t border-gray-200 pt-6 mt-4">
  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Itens Incluídos no Serviço</h3>
  
  <div className="space-y-3 mb-4">
    {formData.includedItems.map((item, index) => (
      <div key={index} className="flex gap-3 bg-gray-50 p-3 rounded-lg items-center">
        <input 
          className="flex-1 border-gray-300 rounded-lg p-2 text-sm"
          placeholder="Descrição (ex: Suporte 24/7)"
          value={item.description}
          onChange={(e) => {
            const newItems = [...formData.includedItems];
            newItems[index].description = e.target.value;
            setFormData({ ...formData, includedItems: newItems });
          }}
        />
        <input 
          type="number"
          className="w-20 border-gray-300 rounded-lg p-2 text-sm"
          placeholder="Qtd"
          value={item.quantity}
          onChange={(e) => {
            const newItems = [...formData.includedItems];
            newItems[index].quantity = parseInt(e.target.value) || 1;
            setFormData({ ...formData, includedItems: newItems });
          }}
        />
        <button 
          type="button" 
          onClick={() => setFormData({ ...formData, includedItems: formData.includedItems.filter((_, i) => i !== index) })}
          className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
        >
          <Trash2 size={18} />
        </button>
      </div>
    ))}
  </div>

  <button
    type="button"
    onClick={() => setFormData({ ...formData, includedItems: [...formData.includedItems, { description: '', quantity: 1 }] })}
    className="text-blue-600 text-sm font-bold flex items-center gap-2 hover:underline"
  >
    <Plus size={16} /> Adicionar Benefício
  </button>
</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Público-Alvo</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Empresas, Particulares, PMEs..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas Gratuitas</label>
              <input
                type="number"
                min="1"
                value={formData.allowedInstallments}
                onChange={e => setFormData({ ...formData, allowedInstallments: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">% Penalização por Parcela Extra</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.penaltyPercentagePerInstallment}
                onChange={e => setFormData({ ...formData, penaltyPercentagePerInstallment: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Serviço Ativo</label>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4">
  {/* Botão Cancelar: Embaixo no mobile, à esquerda no desktop */}
  <button
    type="button"
    onClick={resetForm}
    className="w-full sm:w-auto px-8 py-4 sm:py-2.5 border border-gray-300 rounded-2xl sm:rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-all active:scale-95"
  >
    Cancelar
  </button>

  {/* Botão Salvar: No topo no mobile (prioridade), à direita no desktop */}
  <button
    type="submit"
    className="w-full sm:w-auto px-8 py-4 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl sm:rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 transition-all active:scale-95"
  >
    <Save className="w-5 h-5" />
    <span>
      {editingService ? 'Atualizar Serviço' : 'Criar Serviço'}
    </span>
  </button>
</div>
        </form>
      )}

      {/* Lista de Serviços */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  {loading ? (
    <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="font-medium">A carregar serviços...</p>
    </div>
  ) : services.length === 0 ? (
    <div className="p-12 text-center text-gray-500">
      <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <p className="text-lg font-medium text-gray-900">Nenhum serviço registado</p>
      <p className="text-sm">Comece por adicionar o seu primeiro serviço ao catálogo.</p>
    </div>
  ) : (
    <>
      {/* Desktop Table: Visível apenas em telas grandes (lg) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Serviço</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Preço Base</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unidade</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Parcelamento</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map(s => (
              <tr key={s._id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-xs group-hover:line-clamp-none transition-all">
                    {s.description || 'Sem descrição'}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-gray-900">
                  MT {s.basePrice.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-gray-100 text-gray-600">
                    {s.unit === 'unit' ? 'Unidade' : s.unit === 'box' ? 'Caixa' : s.unit === 'set' ? 'Conjunto' : s.unit}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-green-700 font-bold">{s.allowedInstallments}x Sem Juros</span>
                    {s.penaltyPercentagePerInstallment > 0 && (
                      <span className="text-[10px] text-orange-600 font-medium">
                        +{s.penaltyPercentagePerInstallment}% p/ parcela extra
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedService(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={18} /></button>
                    <button onClick={() => handleEdit(s)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(s._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards: Visível em telas pequenas e médias (abaixo de lg) */}
      <div className="lg:hidden divide-y divide-gray-100">
        {services.map(s => (
          <div key={s._id} className="space-y-4 active:bg-gray-50 px-4 transition-colors gap-4 py-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <h4 className="font-black text-gray-900 uppercase tracking-tight leading-tight">{s.name}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description || 'Sem descrição'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-blue-600 whitespace-nowrap">
                  {s.basePrice.toLocaleString()} <span className="text-[10px]">MT</span>
                </p>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  por {s.unit}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <div className="text-xs">
                <span className="font-bold text-blue-800">{s.allowedInstallments}x parcelas grátis</span>
                {s.penaltyPercentagePerInstallment > 0 && (
                  <p className="text-blue-600/70 font-medium">+{s.penaltyPercentagePerInstallment}% em cada parcela adicional</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button 
                onClick={() => setSelectedService(s)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                <Eye size={16} /> Ver
              </button>
              <button 
                onClick={() => handleEdit(s)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                <Edit size={16} /> Editar
              </button>
              <button 
                onClick={() => handleDelete(s._id)}
                className="p-3 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>

      {/* Modal de Visualização Detalhada */}
      {selectedService && (
  <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-0 md:p-6 transition-all">
    {/* Container do Modal: Mobile (Full Screen) | Desktop (Max Width + Rounded) */}
    <div className="bg-white w-full h-full md:h-auto md:max-w-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-screen md:max-h-[90vh] overflow-hidden">
      
      {/* Header Fixo */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 md:px-8 md:py-6 flex justify-between items-center shrink-0">
        <div className="flex-1 pr-4">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">
            {selectedService.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${selectedService.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${selectedService.isActive ? 'text-green-600' : 'text-red-600'}`}>
              {selectedService.isActive ? 'Serviço Ativo' : 'Serviço Inativo'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setSelectedService(null)}
          className="p-2.5 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-5 md:p-4 space-y-6 md:space-y-8">
        
        {/* Grid de Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          {/* Box: Informações Básicas */}
          <div className="bg-gray-50/50 border border-gray-100 p-5 md:p-6 rounded-2xl">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Geral
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Preço de Venda</p>
                <p className="text-2xl font-black text-gray-900 tracking-tighter">
                  {selectedService.basePrice.toLocaleString()} <span className="text-sm font-normal text-gray-500">MT</span>
                </p>
              </div>
              <div className="flex justify-between border-t border-gray-200/50 pt-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Unidade</p>
                  <p className="text-sm font-bold text-gray-700">
                    {selectedService.unit === 'unit' ? 'Unidade' : 
                     selectedService.unit === 'box' ? 'Caixa' : 
                     selectedService.unit === 'set' ? 'Conjunto' : selectedService.unit}
                  </p>
                </div>
                {selectedService.targetAudience && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Público-Alvo</p>
                    <p className="text-sm font-bold text-gray-700">{selectedService.targetAudience}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Box: Regras de Pagamento */}
          <div className="bg-zinc-900 p-5 md:p-6 rounded-2xl text-white shadow-xl">
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pagamento
            </h3>
            <div className="space-y-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Parcelas Sem Juros</p>
                <p className="text-xl font-black text-green-400">{selectedService.allowedInstallments}x GRÁTIS</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Taxa Extra</p>
                <p className="text-sm font-medium">
                  <span className="text-orange-400 font-bold">+{selectedService.penaltyPercentagePerInstallment}%</span> por parcela adicional
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Descrição */}
{selectedService.description && (
  <div className="space-y-3">
    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Descrição do Serviço</h3>
    <div className="bg-gray-50 p-5 md:p-6 rounded-2xl text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100">
      {selectedService.description}
    </div>
  </div>
)}

{/* Itens Incluídos (Novo Bloco) */}
{selectedService.includedItems && selectedService.includedItems.length > 0 && (
  <div className="space-y-3 mt-6">
    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">O que está incluído</h3>
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
      {selectedService.includedItems.map((item: any, i: number) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-1 bg-blue-50 p-1 rounded-full">
            <Check size={14} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {item.description} 
              {item.quantity && item.quantity > 1 && <span className="text-gray-500 font-normal"> (x{item.quantity})</span>}
            </p>
            {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
      </div>

      {/* Footer Fixo / Ação principal */}
      <div className="p-5 md:px-8 md:py-6 bg-gray-50 border-t border-gray-100 shrink-0">
        <button
          onClick={() => {
            setSelectedService(null);
            handleEdit(selectedService);
          }}
          className="w-full md:w-auto md:min-w-[200px] float-right px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Edit className="w-5 h-5" />
          Editar Serviço
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};