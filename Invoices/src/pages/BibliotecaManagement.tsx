// src/pages/admin/BibliotecaManagement.tsx
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Play, Edit2, Info } from 'lucide-react';
import { api } from '../services/api';
import { motion } from 'framer-motion';

interface LibraryItem {
  _id?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  relatedScreens: string[];
  isActive: boolean;
}

const availableScreens = [
  'Dashboard', 'Empresa', 'Definições', 'Configurações de Pagamento',
  'Vendas', 'Clientes', 'Metas', 'Gestão de cargos', 'Documentos',
  'Propostas', 'Leads', 'Serviços'
];

const BibliotecaManagement: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<LibraryItem>({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    tags: [],
    relatedScreens: [],
    isActive: true
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.library.getAll();
      setItems(data);
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item?: LibraryItem) => {
    if (item) {
      setForm({ ...item });
    } else {
      setForm({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        tags: [],
        relatedScreens: [],
        isActive: true
      });
    }
    setEditingItem(item || null);
    setIsModalOpen(true);
    setNewTag('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

const handleSave = async () => {
  if (!form.title?.trim() || !form.description?.trim() || !form.videoUrl?.trim()) {
    alert('Título, descrição e URL do vídeo são obrigatórios');
    return;
  }

  setSaving(true);

  try {
    if (editingItem?._id) {
      // Atualizar conteúdo existente
      await api.library.update(editingItem._id, form);
    } else {
      // Criar novo conteúdo
      await api.library.create(form);
    }

    closeModal();
    await loadItems();        // Recarrega a lista
  } catch (err: any) {
    console.error('Erro ao guardar:', err);
    alert(err.response?.data?.message || 'Erro ao guardar o conteúdo. Tente novamente.');
  } finally {
    setSaving(false);
  }
};

const handleDelete = async (id: string) => {
  if (!id) return;
  
  if (!confirm('Tem certeza que deseja eliminar este conteúdo?')) return;

  try {
    await api.library.delete(id);
    await loadItems();        // Recarrega após eliminar
  } catch (err: any) {
    console.error(err);
    alert('Erro ao eliminar o conteúdo');
  }
};

const addTag = () => {
  const trimmed = newTag.trim();
  if (trimmed && !form.tags.includes(trimmed)) {
    setForm(prev => ({
      ...prev,
      tags: [...prev.tags, trimmed]
    }));
    setNewTag('');
  }
};

const removeTag = (tagToRemove: string) => {
  setForm(prev => ({
    ...prev,
    tags: prev.tags.filter(tag => tag !== tagToRemove)
  }));
};

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-3xl">
            <Play className="h-9 w-9 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Biblioteca do Empreendedor</h1>
            <p className="text-slate-600">Gerencie conteúdos educativos e tutoriais</p>
          </div>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-medium transition-all"
        >
          <Plus size={22} />
          Novo Conteúdo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {items.map((item) => {
    // Extrai o ID do vídeo do YouTube (suporta vários formatos)
    const getYoutubeEmbedUrl = (url: string) => {
      if (!url) return '';
      
      // Se já for um embed URL
      if (url.includes('embed')) return url;
      
      // Extrai ID do YouTube (suporta youtube.com/watch, youtu.be, etc.)
      const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      
      return match && match[2].length === 11 
        ? `https://www.youtube.com/embed/${match[2]}` 
        : url; // fallback se não for YouTube
    };

    const embedUrl = getYoutubeEmbedUrl(item.videoUrl);

    return (
      <motion.div
        key={item._id}
        whileHover={{ y: -6 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group"
      >
        {/* Video Embed Area */}
        <div className="relative aspect-video bg-black overflow-hidden">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={item.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              <Play className="h-16 w-16 text-white/60" />
            </div>
          )}
          
       
        </div>

        {/* Card Content */}
        <div className="p-6">
          <h3 className="font-semibold text-xl leading-tight mb-3 line-clamp-2 text-slate-900">
            {item.title}
          </h3>
          
          <p className="text-slate-600 text-sm line-clamp-3 mb-6">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {item.tags.map((tag: string) => (
                <span 
                  key={tag} 
                  className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Telas Relacionadas */}
          {item.relatedScreens && item.relatedScreens.length > 0 && (
            <div className="text-xs text-slate-500 mb-6">
              Relacionado a:{" "}
              <span className="font-medium text-slate-600">
                {item.relatedScreens.join(' • ')}
              </span>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => openModal(item)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <Edit2 size={18} />
              Editar
            </button>
            
            <button
              onClick={() => handleDelete(item._id!)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-red-200 text-red-600 rounded-2xl hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <Trash2 size={18} />
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    );
  })}
</div>
      )}

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-8">
                {editingItem ? 'Editar Conteúdo' : 'Novo Conteúdo da Biblioteca'}
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl px-5 py-4"
                    placeholder="Como estruturar a identidade da sua empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={5}
                    className="w-full border border-slate-200 rounded-2xl px-5 py-4"
                    placeholder="Descreva o conteúdo deste vídeo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL do Vídeo (YouTube Embed)</label>
                  <input
                    type="text"
                    value={form.videoUrl}
                    onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl px-5 py-4"
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-2xl px-5 py-3"
                      placeholder="Ex: identidade, marketing, primeiros-passos"
                      onKeyPress={e => e.key === 'Enter' && addTag()}
                    />
                    <button
                      onClick={addTag}
                      className="px-6 bg-slate-800 text-white rounded-2xl"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <div key={tag} className="bg-slate-100 px-4 py-1 rounded-full flex items-center gap-2">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Telas Relacionadas</label>
                  <div className="flex flex-wrap gap-2">
                    {availableScreens.map(screen => (
                      <button
                        key={screen}
                        onClick={() => {
                          const current = form.relatedScreens || [];
                          if (current.includes(screen)) {
                            setForm({ ...form, relatedScreens: current.filter(s => s !== screen) });
                          } else {
                            setForm({ ...form, relatedScreens: [...current, screen] });
                          }
                        }}
                        className={`px-4 py-2 rounded-2xl text-sm transition-all ${
                          form.relatedScreens.includes(screen)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {screen}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={closeModal}
                  className="flex-1 py-4 border border-slate-200 rounded-2xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {saving ? 'A guardar...' : 'Guardar Conteúdo'}
                  <Save size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BibliotecaManagement;