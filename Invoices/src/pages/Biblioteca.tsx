// src/pages/public/Biblioteca.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, X, Tag, Monitor, Sparkles } from 'lucide-react';
import { useOnboarding } from '../constants/onboarding';
import { api } from '../services/api';

const Biblioteca: React.FC = () => {
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'onboarding'>('all');

  const { onboardingData } = useOnboarding();

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const data = await api.library.getPublic();
        setLibraryItems(data);
      } catch (err) {
        console.error('Erro ao carregar biblioteca pública:', err);
      }
    };
    loadLibrary();
  }, []);

  const allTags = Array.from(new Set(libraryItems.flatMap(item => item.tags || [])));

  // Filtragem
  const filteredOnboarding = Object.values(onboardingData).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLibrary = libraryItems.filter(item => {
    const matchSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTag = !selectedTag || item.tags?.includes(selectedTag);
    return matchSearch && matchTag;
  });

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&modestbranding=1&rel=0` 
      : url;
  };

  const displayItems = activeTab === 'onboarding' ? filteredOnboarding : filteredLibrary;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header Compacto - estilo YouTube */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-600 rounded-xl">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Comercial na prática
                  </h1>
                  <p className="text-zinc-400 text-sm">Aprenda a crescer o seu negócio</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar vídeos, tutoriais ou onboarding..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-full pl-12 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tabs + Tags */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex bg-zinc-900 rounded-full p-1 text-sm">
              <button
                onClick={() => { setActiveTab('all'); setSelectedTag(null); }}
                className={`px-6 py-2 rounded-full transition-all ${activeTab === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                Todos os conteúdos
              </button>
              <button
                onClick={() => { setActiveTab('onboarding'); setSelectedTag(null); }}
                className={`px-6 py-2 rounded-full transition-all ${activeTab === 'onboarding' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                Telas da Plataforma
              </button>
            </div>

            {/* Tags (só aparece na aba "Todos") */}
            {activeTab === 'all' && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${!selectedTag ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  Todos
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedTag === tag ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <Tag size={14} />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
          <AnimatePresence>
            {displayItems.map((item, index) => (
              <motion.div
                key={item._id || item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                onClick={() => setSelectedVideo({
                  ...item,
                  title: item.title || item.name,
                  description: item.description || item.longDescription || item.shortDescription
                })}
                className="group cursor-pointer"
              >
                <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-xl">
                  {item.videoUrl ? (
                    <img
                      src={`https://img.youtube.com/vi/${getEmbedUrl(item.videoUrl).split('/embed/')[1]?.split('?')[0] || ''}/hqdefault.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <Play size={48} className="text-white/30" />
                    </div>
                  )}

                  {/* Overlay Play */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Play size={28} className="text-zinc-950 ml-0.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* Duração ou tag */}
                  {item.tags?.[0] && (
                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded font-medium">
                      {item.tags[0]}
                    </div>
                  )}
                </div>

                <div className="mt-4 px-1">
                  <h3 className="font-semibold text-base md:text-lg leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors">
                    {item.title || item.name}
                  </h3>
                  <p className="text-zinc-400 text-sm mt-2 line-clamp-2">
                    {item.description || item.shortDescription}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {displayItems.length === 0 && (
          <div className="text-center py-20">
            <Search size={64} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-xl text-zinc-400">Nenhum conteúdo encontrado</p>
          </div>
        )}
      </main>

      {/* Modal do Vídeo - estilo YouTube */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-zinc-900 w-full max-w-4xl rounded-3xl overflow-hidden relative z-10"
            >
              <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                <h3 className="font-semibold text-lg pr-8 line-clamp-1">{selectedVideo.title}</h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="aspect-video bg-black">
                <iframe
                  src={getEmbedUrl(selectedVideo.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>

              <div className="p-6 md:p-8">
                <p className="text-zinc-300 leading-relaxed text-[15px]">
                  {selectedVideo.description}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Biblioteca;