import React, { useState, useEffect, Suspense } from 'react';
import { Search, X, ChevronDown, Check, Sparkles, Maximize2, Minimize2, Monitor, Tablet, Smartphone, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { adminBuiltInVariantsApi } from '../services/api';

// ← ADICIONAR: Tipos
type Viewport = 'mobile' | 'tablet' | 'desktop';

interface VariantInfo {
  _id: string;
  variantId: string;
  name: string;
  description: string;
  tier: 'freemium' | 'premium';
  isBuiltIn?: boolean;
  isPaid: boolean;
  price: number;
  previewImageUrl?: string;
  category?: string;  
  tags?: string[];
  isActive?: boolean;
  isPublic?: boolean;
  isTaken?: boolean;
  component?: React.ComponentType<any>;
}

// ← ADICIONAR: Mock data para preview
const mockCompany = {
  _id: 'preview-company',
  name: 'Empresa Demo',
  slug: 'preview-demo',
  description: 'Esta é uma visualização de demonstração',
  logo: '',
  website: '',
  phone: '+55 11 98765-4321',
  email: 'contato@empresademo.com',
  address: 'São Paulo, SP - Brasil',
};

const mockServices = [
  { _id: '1', image: 'https://i.pinimg.com/736x/ff/e6/37/ffe637232891eefebed99ef52d8a6583.jpg', name: 'Serviço 1', description: 'Descrição do serviço 1', price: 100 },
  { _id: '2', image: 'https://i1-c.pinimg.com/1200x/6d/94/12/6d9412bdb8a8adedc23932bd82e2ba9b.jpg', name: 'Serviço 2', description: 'Descrição do serviço 2', price: 200 },
  { _id: '3', image: 'https://i1-c.pinimg.com/1200x/6d/94/12/6d9412bdb8a8adedc23932bd82e2ba9b.jpg', name: 'Serviço 3', description: 'Descrição do serviço 3', price: 300 },
];

const mockProducts = [
  { _id: '1', image: 'https://i1-c.pinimg.com/1200x/6d/94/12/6d9412bdb8a8adedc23932bd82e2ba9b.jpg', name: 'Produto 1', description: 'Descrição do produto 1', price: 100 },
  { _id: '2', image: 'https://i.pinimg.com/736x/98/97/f6/9897f6737ffca2fd39e8185adb1b4b6e.jpg', name: 'Produto 2', description: 'Descrição do produto 2', price: 200 },
  { _id: '3', image: 'https://i1-c.pinimg.com/736x/85/0e/89/850e8969446a1494593a7445f5c6e4c0.jpg', name: 'Produto 3', description: 'Descrição do produto 3', price: 300 },
];
const mockBundles = [
  {
    _id: 'bundle-1',
    name: 'Premium Combo',
    type: 'Combo',
    description: 'Pacote completo de serviços',
    price: 5000,
    image: 'https://i1-c.pinimg.com/1200x/6d/94/12/6d9412bdb8a8adedc23932bd82e2ba9b.jpg',
    items: []
  },
  {
    _id: 'sub-1',
    name: 'Professional Plan',
    type: 'Subscription',
    description: 'Assinatura mensal profissional',
    price: 1500,
    billingCycle: 'Mensal',
    image: 'https://i1-c.pinimg.com/1200x/6d/94/12/6d9412bdb8a8adedc23932bd82e2ba9b.jpg',
    includedLimits: [
      { description: 'Requisições', maxValue: 50, unit: '/mês' }
    ]
  }
];


export const PublicPortalGallery: React.FC = () => {
  const navigate = useNavigate();
  
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<VariantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewVariant, setPreviewVariant] = useState<VariantInfo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentViewport, setCurrentViewport] = useState<Viewport>('desktop');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
const [showTagsDropdown, setShowTagsDropdown] = useState(false);
const [selectedTier, setSelectedTier] = useState<'all' | 'freemium' | 'premium'>('all');

// Constantes
const CATEGORIES_LIMIT = 5;
const TAGS_LIMIT = 5;

  // ← Carregar variantes no mount
  useEffect(() => {
    loadVariants();
  }, []);

  // ← Aplicar filtros quando dados mudam
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, selectedTags, selectedTier, variants]);

// ← ADICIONAR NO TOPO DO ARQUIVO
const variantModules = import.meta.glob<{ default: React.ComponentType<any> }>(
  '../templates/public-portal/variants/*.tsx',
  { eager: true }
);

console.log('📦 Componentes disponíveis no build:', Object.keys(variantModules));

// Criar mapa de variantId → componente
const getComponentForVariant = (variantId: string): React.ComponentType<any> | undefined => {
  // Gerar possíveis nomes de arquivo
  const pascalCase = variantId
    .split(/[-_]/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const possibleFileNames = [
    `../templates/public-portal/variants/${pascalCase}Portal.tsx`,
    `../templates/public-portal/variants/${pascalCase}Digital.tsx`,
    `../templates/public-portal/variants/${pascalCase}.tsx`,
  ];

  for (const fileName of possibleFileNames) {
    if (variantModules[fileName]) {
      return variantModules[fileName].default;
    }
  }

  return undefined;
};

// ← DEPOIS, ALTERAR loadVariants
const loadVariants = async () => {
  try {
    console.log("🔄 Carregando templates...");
    setLoading(true);
    setError(null);

    const builtInData = await adminBuiltInVariantsApi.getAll();
    console.log("📦 Built-in variants (com dados):", builtInData);

    // ← SIMPLIFICADO: Usar getComponentForVariant
    const combined = builtInData.map((builtIn: any) => {
      let component = undefined;

      if (builtIn.isActive && builtIn.variantId) {
        component = getComponentForVariant(builtIn.variantId);
        
        if (component) {
          console.log(`✅ Componente encontrado: ${builtIn.variantId}`);
        } else {
          console.warn(`⚠️ Componente não encontrado: ${builtIn.variantId}`);
        }
      }

      return {
        _id: builtIn._id?.$oid || builtIn._id,
        variantId: builtIn.variantId,
        id: builtIn.variantId,
        name: builtIn.name,
        description: builtIn.description,
        tier: builtIn.tier || 'freemium',
        previewImageUrl: builtIn.previewImageUrl,
        category: builtIn.category,
        tags: Array.isArray(builtIn.tags) ? builtIn.tags : [],
        isActive: builtIn.isActive ?? true,
        isPublic: builtIn.isPublic ?? true,
        isPaid: builtIn.isPaid ?? false,
        price: builtIn.price ?? 0,
        isTaken: builtIn.isTaken ?? false,
        component: component,
      } as VariantInfo;
    });

    console.log("✅ Variantes combinadas:", combined);
    console.log("📊 Com component:", combined.filter(v => v.component).length, "de", combined.length);
    
    const withoutComponent = combined
      .filter(v => !v.component)
      .map(v => v.variantId);
    
    if (withoutComponent.length > 0) {
      console.warn("⚠️ SEM COMPONENTE:", withoutComponent);
    }

    setVariants(combined);
    setFilteredVariants(combined);
  } catch (err) {
    console.error("Erro ao carregar templates:", err);
    const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar templates';
    setError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setLoading(false);
  }
};

  const applyFilters = () => {
    let result = [...variants];

    // Filtro por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(v => 
        v.name.toLowerCase().includes(term) || 
        (v.description && v.description.toLowerCase().includes(term))
      );
    }

    // Filtro por tier
  if (selectedTier !== 'all') {
    result = result.filter(v => v.tier === selectedTier);
  }

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      result = result.filter(v => 
        v.category === selectedCategory
      );
    }

    // Filtro por tags
    if (selectedTags.length > 0) {
      result = result.filter(v => 
        selectedTags.some(tag => v.tags?.includes(tag))
      );
    }
    // ← FILTRAR TEMPLATES PREMIUM JÁ COMPRADOS
    result = result.filter(v => {
      if (v.tier === 'premium' && v.isTaken) {
        return false; // Esconde da galeria
      }
      return true;
    });

    setFilteredVariants(result);
  };

  // ← Calcular categorias do banco
  const categories = ['Todos', ...new Set(
    variants
      .map(v => v.category)
      .filter((c): c is string => Boolean(c))
  )];

  // ← Extrair tags do banco
  const getAllTags = (): string[] => {
    const tags = new Set<string>();
    variants.forEach(v => {
      if (Array.isArray(v.tags)) {
        v.tags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            tags.add(tag);
          }
        });
      }
    });
    return Array.from(tags).sort();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const openPreview = (variant: VariantInfo) => {
    if (!variant.component) {
      toast.error('Componente de preview não disponível para este template');
      return;
    }
    console.log("👀 Abrindo preview:", variant.name);
    setPreviewVariant(variant);
    setCurrentViewport('desktop');
    setIsFullscreen(false);
  };

  const closePreview = () => {
    setPreviewVariant(null);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

const handleSelectTemplate = (variant: VariantInfo) => {
    if (variant.tier === 'premium' && variant.isTaken) {
      toast.error('Este template Premium já foi adquirido por outra empresa.');
      return;
    }

    localStorage.setItem('selectedPortalVariant', variant.variantId);

    // LÓGICA CORRETA: Redireciona para checkout apenas se tiver preço > 0
    if (variant.price > 0) {
      navigate(`/register?template=${variant.variantId}&paid=true`);
    } else {
      navigate(`/register?template=${variant.variantId}`);
    }
  };

  // Calcular categorias visíveis
const visibleCategories = categories.slice(0, CATEGORIES_LIMIT);
const hiddenCategoriesCount = Math.max(0, categories.length - CATEGORIES_LIMIT);
const allCategories = categories;

// Calcular tags visíveis
const allTags = getAllTags();
const visibleTags = allTags.slice(0, TAGS_LIMIT);
const hiddenTagsCount = Math.max(0, allTags.length - TAGS_LIMIT);


  if (loading) {
    return (
      <div className="min-h-screen bg-[#020210] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p>Carregando templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020210] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={loadVariants}
            className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020210] text-white pb-20">
      {/* Hero Section... resto do código igual */}
      <div className="relative pt-40 pb-28 px-6 text-center overflow-hidden">
  <div className="absolute inset-0 z-0">
    {/* Media Container */}
    <div className="absolute inset-0 animate-slow-zoom">
      {/* 
        OPÇÃO A: VÍDEO 
        Para usar vídeo, descomente o código abaixo e comente a DIV da Imagem 
      */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        poster="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070"
      >
        <source src="https://cdn.dribbble.com/userupload/47456917/file/large-acc42d4be7466b150c428e2809b861e7.mp4" type="video/mp4" />
      </video>

      {/* 
        OPÇÃO B: IMAGEM (Atual)
        Para voltar para imagem, basta comentar o <video> acima 
      */}
      {/* 
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop")',
        }}
      /> 
      */}
    </div>

    {/* Overlays de Gradiente para garantir contraste e blending */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#020210] via-[#020210]/60 to-[#020210]" />
    <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay" />
  </div>

  <div className="relative z-10 max-w-5xl mx-auto">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
      <Sparkles size={14} className="animate-pulse" /> Soluções All-in-One
    </div>
    
    <h1 className="text-5xl md:text-[90px] leading-[0.95] font-black tracking-tighter mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
      Seu negócio online,<br /> pronto para faturar
    </h1>
    
    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed mb-10">
      Sites modernos com sistema de <span className="text-white font-medium">vendas, faturação e rentabilidade</span> já incorporados.
    </p>
  </div>
</div>

    {/* Filtros */}
<div className="sticky top-0 z-50 bg-[#020210]/80 backdrop-blur-md border-b border-white/5">
  <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 space-y-4">
    
    {/* Linha 1: Categorias + Search */}
    {/* Ajuste: Mudança para flex-col em mobile e flex-row em desktop */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
      
      {/* Categorias - Ajuste: scroll horizontal em mobile se necessário */}
      <div className="flex gap-3 items-center overflow-x-auto no-scrollbar pb-1 md:pb-0">
        <div className="flex gap-3 items-center">
          {visibleCategories.map(cat => {
            const categoryKey = cat === 'Todos' ? 'all' : cat.toLowerCase().trim();
            const isActive = selectedCategory === categoryKey;
            
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(categoryKey)}
                className={`text-sm font-bold whitespace-nowrap transition-all relative py-2 px-3 rounded-lg ${
                  isActive 
                    ? 'text-white bg-indigo-500/20 border border-indigo-500/50' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}

          {/* Dropdown de categorias extras */}
          {hiddenCategoriesCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all whitespace-nowrap"
              >
                +{hiddenCategoriesCount} <span className="hidden sm:inline">mais</span>
                <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[200px] md:min-w-[250px]">
                  <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto">
                    {allCategories.slice(CATEGORIES_LIMIT).map(cat => {
                      const categoryKey = cat === 'Todos' ? 'all' : cat.toLowerCase().trim();
                      const isActive = selectedCategory === categoryKey;

                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(categoryKey);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-indigo-500/20 text-white border border-indigo-500/50'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {/* Search - Ajuste: largura total em mobile */}
      <div className="w-full md:max-w-xs">
        <div className="relative group w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Pesquisar design..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all outline-none text-white placeholder-gray-600"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
      {/* Filtro Tier (Premium / Freemium) */}
<div className="flex items-center gap-3">
  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 whitespace-nowrap">Tipo:</span>
  
  <div className="flex gap-2">
    <button
      onClick={() => setSelectedTier('all')}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
        selectedTier === 'all'
          ? 'bg-white text-black'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
      }`}
    >
      Todos
    </button>

    <button
      onClick={() => setSelectedTier('freemium')}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
        selectedTier === 'freemium'
          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
      }`}
    >
      <span>Freemium</span>
    </button>

    <button
      onClick={() => setSelectedTier('premium')}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
        selectedTier === 'premium'
          ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
      }`}
    >
      <Sparkles size={14} />
      <span>Premium</span>
    </button>
  </div>
</div>
    {/* Linha 2: Tags */}
    {allTags.length > 0 && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-white/5 pt-3">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 whitespace-nowrap">Tags:</span>
          
          <div className="flex gap-2 items-center">
            {visibleTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border whitespace-nowrap ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'
                }`}
              >
                #{tag}
              </button>
            ))}

            {/* Dropdown de tags extras */}
            {hiddenTagsCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium text-gray-500 border border-white/10 hover:border-white/30 transition-all whitespace-nowrap"
                >
                  +{hiddenTagsCount}
                  <ChevronDown size={12} className={`transition-transform ${showTagsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showTagsDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[200px]">
                    <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto">
                      {allTags.slice(TAGS_LIMIT).map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                            selectedTags.includes(tag)
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[10px]">#{tag}</span>
                          {selectedTags.includes(tag) && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contador de filtros ativos - Ajuste: Esconder em telas muito pequenas ou ajustar margem */}
        {(selectedTags.length > 0 || selectedCategory !== 'all') && (
          <div className="sm:ml-auto text-[10px] text-gray-500 font-medium">
            {selectedTags.length + (selectedCategory !== 'all' ? 1 : 0)} filtro(s) ativo(s)
          </div>
        )}
      </div>
    )}
  </div>

  {/* Overlay para fechar dropdowns */}
  {(showCategoryDropdown || showTagsDropdown) && (
    <div className="fixed inset-0 z-40" onClick={() => { setShowCategoryDropdown(false); setShowTagsDropdown(false); }} />
  )}
</div>

    {/* Grid de Variantes */}
<div className="max-w-[1400px] mx-auto px-6 py-12">
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10">
    {filteredVariants.map((variant) => {
      const isPremiumTaken = variant.tier === 'premium' && variant.isTaken;

      return (
        <div
          key={variant._id}
          onClick={() => isPremiumTaken ? null : openPreview(variant)}
          className={`group relative cursor-pointer ${!variant.component || isPremiumTaken ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#111] border border-white/5 relative">
            {variant.previewImageUrl ? (
              <img 
                src={variant.previewImageUrl} 
                alt={variant.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/20 to-transparent">
                <span className="text-4xl font-black text-white/10 uppercase">{variant.name[0]}</span>
              </div>
            )}

            {/* Overlay de Preview */}
            {variant.component && !isPremiumTaken && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  Visualizar Live Demo
                </button>
              </div>
            )}

            {/* Overlay de Template Já Adquirido */}
            {isPremiumTaken && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="text-amber-400 mb-2 text-3xl">🔒</div>
                  <p className="text-white font-bold text-sm">JÁ ADQUIRIDO</p>
                  <p className="text-xs text-gray-400 mt-1">Template Premium exclusivo</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-white group-hover:text-indigo-400 transition-colors">
                {variant.name}
              </h3>
              <p className="text-xs text-gray-500 font-medium">{variant.category || 'Web Design'}</p>
              
              <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${
                variant.tier === 'premium' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {variant.tier === 'premium' ? 'PREMIUM' : 'FREEMIUM'}
              </span>
            </div>

            <div className="text-right">
              {variant.price > 0 ? (
                <span className="text-[13px] font-bold text-white">
                  {variant.price} MT
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">Grátis</span>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>

      {/* Modal de Preview */}
      {previewVariant && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <div className={`bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden transition-all duration-300 ${
              isFullscreen ? 'w-full h-full max-w-none rounded-none' : 'max-w-7xl w-full max-h-[95vh]'
            }`}>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 gap-4 border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-10 w-full">
  
  {/* Info Section: Título e Descrição */}
  <div className="min-w-0 flex-1">
    <h2 className="text-xl md:text-2xl font-bold truncate">
      {previewVariant.name}
    </h2>
    <p className="text-gray-400 text-xs md:text-sm line-clamp-1">
      {previewVariant.description}
    </p>
  </div>

  {/* Actions Section: Viewports e Controlos */}
  <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-4 w-full sm:w-auto">
    
    {/* Viewport Switcher & CTA */}
    <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1 overflow-x-auto overflow-y-hidden no-scrollbar">
      <button
        onClick={() => handleSelectTemplate(previewVariant)}
        className="whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 rounded-full text-[10px] md:text-xs lg:text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
      >
        USAR TEMPLATE
      </button>

      {/* Viewport Buttons (Escondidos em mobile muito pequeno se necessário, ou mantidos com padding menor) */}
      <div className="flex items-center">
        <button 
          onClick={() => setCurrentViewport('desktop')} 
          className={`p-2 md:p-3 rounded-xl transition ${currentViewport === 'desktop' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
          title="Desktop"
        >
          <Monitor size={18} className="md:w-5 md:h-5" />
        </button>
        <button 
          onClick={() => setCurrentViewport('tablet')} 
          className={`p-2 md:p-3 rounded-xl transition ${currentViewport === 'tablet' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
          title="Tablet"
        >
          <Tablet size={18} className="md:w-5 md:h-5" />
        </button>
        <button 
          onClick={() => setCurrentViewport('mobile')} 
          className={`p-2 md:p-3 rounded-xl transition ${currentViewport === 'mobile' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
          title="Mobile"
        >
          <Smartphone size={18} className="md:w-5 md:h-5" />
        </button>
      </div>
    </div>

    {/* Botões de Fechar/Fullscreen */}
    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
      <button 
        onClick={toggleFullscreen} 
        className="p-2 md:p-3 text-gray-400 hover:bg-white/10 rounded-xl transition"
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      <button 
        onClick={closePreview} 
        className="p-2 md:p-3 text-gray-400 hover:bg-white/10 rounded-xl transition"
      >
        <X size={24} />
      </button>
    </div>
  </div>
</div>

            <div 
              className="overflow-auto flex justify-center bg-[#111]" 
              style={{ 
                height: isFullscreen ? '100vh' : 'calc(100vh - 200px)',
                width: '100%'
              }}
            >
              <div 
                className="transition-all duration-300 border border-white/20 shadow-2xl overflow-hidden"
                style={{
                  width: currentViewport === 'mobile' ? '380px' : 
                         currentViewport === 'tablet' ? '768px' : 
                         '100%',
                  maxWidth: 'calc(100% - 40px)',
                  minHeight: '100%'
                }}
              >
                <div className="w-full h-full overflow-y-auto">
                  <Suspense fallback={
                    <div className="h-full flex items-center justify-center text-xl text-gray-400 py-20">
                      Carregando preview...
                    </div>
                  }>
                    {previewVariant.component ? (
                      <previewVariant.component 
                        company={mockCompany} 
                        slug="preview-demo" 
                        services={mockServices}
                         products={mockProducts}
                          bundles={mockBundles}                        
                        viewport={currentViewport}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xl text-gray-400 py-20">
                        Preview não disponível para este template
                      </div>
                    )}
                  </Suspense>
                </div>
              </div>
            </div>

           
          </div>
        </div>
      )}
      {/* Footer */}
              <footer className="py-20 border-t border-white/5">
                <div className="container mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center gap-3 mb-6">
                        {/* Logo Icon / Symbol - Visible only on Mobile (below 'sm' breakpoint) */}
                        <img 
                          src="https://meupontodevenda.com/cdn/logo-white.svg" 
                          alt="MPVD Icon" 
                          className="block sm:hidden w-38 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                        />
      
                        {/* Full Logo - Visible on Tablets and Desktops ('sm' and up) */}
                        <img 
                          src="https://meupontodevenda.com/cdn/logo-white.svg" 
                          alt="Meu Ponto de Venda" 
                          className="hidden sm:block w-44 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                        />          
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                        Transforme a presença online da sua empresa ou negócio numa máquina de vendas
                      </p>
                    </div>
      
                    <div>
                      <h6 className="text-white text-sm font-bold mb-6 uppercase tracking-widest">Produto</h6>
                      <ul className="space-y-4 text-sm text-gray-500">
                        <li><Link to="#" className="hover:text-white transition">Metas Estratégicas</Link></li>
                        <li><Link to="/planos" className="hover:text-white transition">website de Vendas</Link></li>
                        <li><Link to="#" className="hover:text-white transition">Unit Economics</Link></li>
                      </ul>
                    </div>
      
                    <div>
                      <h6 className="text-white text-sm font-bold mb-6 uppercase tracking-widest">Legal</h6>
                      <ul className="space-y-4 text-sm text-gray-500">
                        <li><Link to="/terms" className="hover:text-white transition">Termos de Uso</Link></li>
                        <li><Link to="/privacy" className="hover:text-white transition">Privacidade</Link></li>
                        <li className="text-xs pt-4 font-bold text-gray-600 uppercase">Maputo, Moçambique</li>
                      </ul>
                    </div>
                  </div>
      
                  <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-600 text-[10px] uppercase tracking-[0.3em]">
                      © {new Date().getFullYear()} MEU PONTO DE VENDA. TODOS OS DIREITOS RESERVADOS.
                    </p>
                    <div className="flex gap-6">
                      <Globe className="w-4 h-4 text-gray-600 hover:text-indigo-400 cursor-pointer transition" />
                    </div>
                  </div>
                </div>
              </footer>
    </div>
  );
};