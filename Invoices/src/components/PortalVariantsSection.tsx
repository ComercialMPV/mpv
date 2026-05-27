// src/components/settings/PortalVariantsSection.tsx
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminBuiltInVariantsApi } from '@/services/api'; // ajuste o caminho

// Importa o teu uploader universal
import { ImageUploader } from '@/components/ImageUploader'; // ajuste o caminho correto

interface PortalVariant {
  _id?: string;
  variantId: string;
  name: string;
  description?: string;
  previewImageUrl?: string;
  category?: string;
  tags?: string[];
  tier: 'freemium' | 'premium';
  isActive: boolean;
  isPublic: boolean;
  isPaid: boolean;
  price: number;
  order?: number;
}

const PROTECTED_IDS = ['default']; // expanda conforme necessário

export const PortalVariantsSection: React.FC = () => {
  const [variants, setVariants] = useState<PortalVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PortalVariant>>({
    variantId: '',
    name: '',
    description: '',
    previewImageUrl: '',
    category: '',
    tags: [],
    tier: 'freemium',
    isActive: true,
    isPublic: true,
    isPaid: false,
    price: 0,
    order: 999,
  });

  useEffect(() => {
    loadVariants();
  }, []);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await adminBuiltInVariantsApi.getAll();
      setVariants(data);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar as variantes');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (v: PortalVariant) => {
    setEditingId(v.variantId);
    setFormData({
      variantId: v.variantId,
      name: v.name,
      description: v.description || '',
      previewImageUrl: v.previewImageUrl || '',
      category: v.category || '',
      tags: v.tags || [],
      tier: v.tier || 'freemium',
      isActive: v.isActive ?? true,
      isPublic: v.isPublic ?? true,
      isPaid: v.isPaid ?? false,
      price: v.price ?? 0,
      order: v.order ?? 999,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      variantId: '',
      name: '',
      description: '',
      previewImageUrl: '',
      category: '',
      tags: [],
      tier: 'freemium',
      isActive: true,
      isPublic: true,
      isPaid: false,
      price: 0,
      order: 999,
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return toast.error('Nome é obrigatório');
    if (!formData.variantId?.trim()) return toast.error('ID é obrigatório');

    try {
      const payload = {
        ...formData,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        tier: formData.tier || 'freemium',
      };

      if (editingId) {
        // update (não altera variantId)
        await adminBuiltInVariantsApi.update(editingId, payload);
        toast.success('Variante atualizada');
      } else {
        // create
        await adminBuiltInVariantsApi.create(payload);
        toast.success('Variante criada');
      }

      cancelEdit();
      loadVariants();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar variante');
    }
  };

  const handleDelete = async (variantId: string) => {
    if (PROTECTED_IDS.includes(variantId)) {
      return toast.error('Esta variante é protegida e não pode ser removida');
    }
    if (!confirm('Tem a certeza que deseja eliminar esta variante?')) return;

    try {
      await adminBuiltInVariantsApi.delete(variantId);
      toast.success('Variante eliminada');
      loadVariants();
    } catch (err) {
      toast.error('Erro ao eliminar variante');
    }
  };

  // Exemplo dentro do componente que tem o ImageUploader

const handleImageUpload = async (file: File) => {
  try {
    const response = await adminBuiltInVariantsApi.uploadPreviewImage(
      editingId || 'new-variant',  // usa o variantId atual ou placeholder
      file
    );
    // Atualiza o formData com a URL retornada
    setFormData(prev => ({
      ...prev,
      previewImageUrl: response.url,
    }));
    toast.success('Imagem de preview enviada com sucesso');
  } catch (err) {
    console.error('Falha no upload de preview:', err);
    toast.error('Não foi possível enviar a imagem');
  }
};


  // Callback para quando o ImageUploader atualiza as imagens
  const handleImageUpdate = (newImages: string[]) => {
    // Como é apenas 1 imagem de preview, pegamos a primeira
    setFormData((prev) => ({
      ...prev,
      previewImageUrl: newImages[0] || '',
    }));
  };

  if (loading) {
    return <div className="p-8 text-center">A carregar variantes...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-gray-50 bg-gradient-to-r from-white to-blue-50/30">
        <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tighter">
          Gestão de Variantes de Layout Built-in
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Adicione, edite ou desative variantes disponíveis no portal público
        </p>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Formulário de criação / edição – ENRIQUECIDO */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">
            {editingId ? 'Editar Variante' : 'Adicionar Nova Variante'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* variantId */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                ID único {editingId ? '(não editável)' : '*'}
              </label>
              <input
                type="text"
                value={formData.variantId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    variantId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
                disabled={!!editingId}
                placeholder="ex: clinica-v2"
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* name */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Nome visível *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Clínica Moderna"
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
{/* tier - NOVO SELECT */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Tier / Licença *
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tier: e.target.value as 'freemium' | 'premium' 
                })}
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="freemium">Freemium (pode ser usado por múltiplas empresas)</option>
                <option value="premium">Premium (exclusivo - uso único)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.tier === 'premium' ? 
                  '🔒 Apenas uma empresa poderá usar este template' : 
                  '🌐 Várias empresas podem usar este template'}
              </p>
            </div>

            {/* category */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Categoria
              </label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="ex: health, food, ecommerce"
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* order */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Ordem (menor = aparece primeiro)
              </label>
              <input
                type="number"
                value={formData.order ?? 999}
                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                min={0}
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* description */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Layout otimizado para clínicas médicas com agendamento online"
              rows={3}
              className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* previewImageUrl – usando ImageUploader */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              Imagem de Pré-visualização
            </label>
            <ImageUploader
              itemId={editingId || 'temp-new-variant'} // ou um placeholder se novo
              itemType="variant"
              maxFiles={1}
              accept="image/*"
              existingImages={formData.previewImageUrl ? [formData.previewImageUrl] : []}
              onImagesUpdated={(urls) => {
                setFormData(prev => ({ ...prev, previewImageUrl: urls[0] || '' }));
              }}
            />
            {formData.previewImageUrl && (
              <p className="mt-2 text-xs text-gray-500">
                URL atual: {formData.previewImageUrl}
              </p>
            )}
          </div>

          {/* tags */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={(formData.tags || []).join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                })
              }
              placeholder="clinica, saude, moderno, consulta"
              className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Switches e preço */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <label className="text-base font-medium text-gray-900">Ativo</label>
                <p className="text-sm text-gray-500">Aparece na lista</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <label className="text-base font-medium text-gray-900">Público</label>
                <p className="text-sm text-gray-500">Visível para todos</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isPublic ?? true}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <label className="text-base font-medium text-gray-900">Pago</label>
                <p className="text-sm text-gray-500">Requer pagamento</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isPaid ?? false}
                onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>
          </div>

          {formData.isPaid && (
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Preço (MT)
              </label>
              <input
                type="number"
                value={formData.price ?? 0}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                min={0}
                step={1}
                className="w-full md:w-1/3 border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {editingId ? 'Atualizar' : 'Criar'}
            </button>

            {editingId && (
              <button
                onClick={cancelEdit}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <X size={16} />
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Lista de variantes (mantida igual) */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
            Variantes Existentes ({variants.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map((v) => (
              <div
                key={v.variantId}
                className={`p-5 border rounded-xl transition-all ${
                  PROTECTED_IDS.includes(v.variantId)
                    ? 'bg-gray-50 border-gray-300 opacity-90'
                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{v.name}</h4>
                    {v.tier === 'premium' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          <Sparkles size={12} /> PREMIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          FREEMIUM
                        </span>
                      )}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{v.description || '—'}</p>
                    {v.previewImageUrl && (
                      <img
                        src={v.previewImageUrl}
                        alt={v.name}
                        className="mt-2 w-full h-32 object-cover rounded-lg"
                      />
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!PROTECTED_IDS.includes(v.variantId) && (
                      <>
                        <button
                          onClick={() => startEdit(v)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.variantId)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-xs font-mono text-gray-500 mt-2">
                  ID: {v.variantId} {PROTECTED_IDS.includes(v.variantId) && '• Protegida'}
                  {v.category && ` • ${v.category}`}
                  {v.isPaid && ' • Pago'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};