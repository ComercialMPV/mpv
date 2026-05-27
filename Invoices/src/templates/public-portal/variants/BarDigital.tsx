// src/templates/public-portal/variants/BarPortal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText, Package, UtensilsCrossed, Utensils, Clock, GlassWater, ChevronLeft, ChevronRight, Play,Plus, Trash2,
  CheckCircle, Info, CreditCard, ShoppingCart, X, Loader2,
  Search, Calendar, Minus, Check, User2, Eye, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

const SERVER_BASE_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';

// Helper function to convert relative paths to absolute URLs
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath; // Already absolute
  return `${SERVER_BASE_URL}${imagePath}`; // Convert relative to absolute
};

interface BarProps {
  company: Company;
  slug: string;
  services: Service[];
}

type CatalogType = 'services' | 'products' | 'bundles';

type CartItem = {
  itemId: string;
  type: CatalogType;
  quantity: number;
  name: string;
  price: number;
  image?: string;
};

interface ClientInfo {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxId: string;
  vatNumber?: string;
  billingAddress: {
    street: string;
    city: string;
    country: string;
  };
}

const BarPortal: React.FC<BarProps> = ({ company, slug, services: initialServices, products: initialProducts, bundles: initialBundles }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<CatalogType>('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>(initialServices || []);
const safeCompany = {
  ...company,
  address: company.address || { street: '', city: 'Maputo', state: 'Maputo', zip: '' }
};
  // will calculate available catalogs once services/products/bundles are defined later

  // track searches performed by visitors (debounced so we don't spam the API)
  useEffect(() => {
    if (!searchTerm || !slug) return;
    const handler = setTimeout(() => {
      api.public.logSearch(slug, { term: searchTerm, catalog: activeCatalog });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, activeCatalog, slug]);
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [bundles, setBundles] = useState<Bundle[]>(initialBundles || []);

  // compute which catalogs currently have items
  const availableCatalogs: CatalogType[] = React.useMemo(() => {
    const list: CatalogType[] = [];
    if (services && services.length > 0) list.push('services');
    if (products && products.length > 0) list.push('products');
    if (bundles && bundles.length > 0) list.push('bundles');
    return list;
  }, [services, products, bundles]);

  // ensure activeCatalog is always one of the available ones when data changes
  useEffect(() => {
    if (availableCatalogs.length === 0) return;
    if (!availableCatalogs.includes(activeCatalog)) {
      setActiveCatalog(availableCatalogs[0]);
    }
  }, [availableCatalogs, activeCatalog]);

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [client, setClient] = useState<ClientInfo>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    taxId: '',
    vatNumber: '',
    billingAddress: { street: '', city: '', country: 'Moçambique' }
  });

  const [requestedInstallments, setRequestedInstallments] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [requestIntent, setRequestIntent] = useState<'quotation' | 'invoice'>('quotation');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa'|'emola'|'visa'|'none'>('none');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [showAwaitingConfirmation, setShowAwaitingConfirmation] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState<string>('');
  const [pollStatus, setPollStatus] = useState<'waiting'|'confirmed'|'failed'>('waiting');
  const [pollAttempts, setPollAttempts] = useState(0);

  const currency = company.currency || 'MT';

  // Only load if initial data is not provided (public portal provides all data)
  useEffect(() => {
    // If we have all initial data from public portal, don't make API calls
    if (initialServices?.length && initialProducts?.length && initialBundles?.length) {
      return;
    }
    
    const loadCatalog = async () => {
      try {
        const promises = [];
        if (!initialServices?.length) promises.push(api.services.getAll());
        if (!initialProducts?.length) promises.push(api.products.getAll());
        if (!initialBundles?.length) promises.push(api.bundles.getAll());
        
        if (promises.length === 0) return;
        
        const results = await Promise.all(promises);
        
        if (!initialServices?.length && results[0]) setServices(results[0]);
        if (!initialProducts?.length && results[1]) setProducts(results[1]);
        if (!initialBundles?.length && results[2]) setBundles(results[2]);
      } catch (err) {
        console.warn('Failed to load catalog', err);
      }
    };
    loadCatalog();
  }, []);

  // Reset carousel index whenever a new item is selected
  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedItem]);

  // Current catalog items
  const getCurrentItems = (): (Service | Product | Bundle)[] => {
    if (activeCatalog === 'services') return services;
    if (activeCatalog === 'products') return products;
    return bundles;
  };

  const filteredItems = getCurrentItems().filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ('description' in item && (item as any).description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ('shortDescription' in item && (item as any).shortDescription?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Image helper (products & bundles have real images, services use placeholder – add image field to Service later)
  const getItemImage = (item: any, type: CatalogType): string | undefined => {
    // Products and bundles keep previous logic. For services, prefer real images from DB if available.
    if (type === 'products' && item.images?.length > 0) return getImageUrl(item.images[0]);
    if (type === 'bundles' && item.image) return getImageUrl(item.image);
    if (type === 'services' && item.images?.length > 0) return getImageUrl(item.images[0]);
    return undefined;
  };

  const getItemPrice = (item: any): number => {
    return 'basePrice' in item ? (item as any).basePrice : ('price' in item ? (item as any).price : 0);
  };

  const getItemDescription = (item: any): string => {
    return 'shortDescription' in item ? (item as any).shortDescription || '' : 
           ('description' in item ? (item as any).description || '' : '');
  };

  // Cart actions
  const addToCart = (item: any, type: CatalogType) => {
    const existingIndex = cart.findIndex(c => c.itemId === item._id);
    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        itemId: item._id,
        type,
        quantity: 1,
        name: item.name,
        price: getItemPrice(item),
        image: getItemImage(item, type)
      }]);
    }
    toast.success(`${item.name} adicionado ao carrinho`, { position: 'top-center' });
  };

  const updateCartQuantity = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(cart.map(item => item.itemId === itemId ? { ...item, quantity: newQty } : item));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.itemId !== itemId));
  };

  // Totals (exactly your original logic)
  const calculateTotals = () => {
    let subtotal = 0;
    let minAllowed = 99;
    let maxPenaltyPct = 0;

    cart.forEach(cartItem => {
      subtotal += cartItem.price * cartItem.quantity;
      const svc = services.find(s => s._id === cartItem.itemId);
      if (svc) {
        minAllowed = Math.min(minAllowed, svc.allowedInstallments || 3);
        maxPenaltyPct = Math.max(maxPenaltyPct, svc.penaltyPercentagePerInstallment || 0);
      }
    });

    let penalty = 0;
    if (requestedInstallments > minAllowed) {
      const extra = requestedInstallments - minAllowed;
      penalty = subtotal * (extra * (maxPenaltyPct / 100));
    }

    return { subtotal, penalty, grandTotal: subtotal + penalty };
  };

  const totals = calculateTotals();

  // Dynamic max installments (your original logic)
  const getMaxAllowedInstallments = (): number => {
    let minAllowed = Infinity;
    let hasService = false;
    cart.forEach(cartItem => {
      const svc = services.find(s => s._id === cartItem.itemId);
      if (svc) {
        hasService = true;
        minAllowed = Math.min(minAllowed, svc.allowedInstallments || 3);
      }
    });
    return hasService ? Math.max(1, minAllowed) : 12;
  };

  const hasValidItems = cart.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidItems) {
      toast.error('Adicione pelo menos um item ao carrinho');
      return;
    }
    if (!client.name || !client.email) {
      toast.error('Nome da empresa e email são obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
     // Dentro de handleSubmit, substitui o payload por:
      const payload = {
        companyId: company._id,
        clientData: { ...client, origin: 'external' },
        requisitionData: {
          items: cart.map(cartItem => ({
            itemType: cartItem.type === 'services' ? 'service' : 
                      cartItem.type === 'products' ? 'product' : 'bundle',
            item: cartItem.itemId,
            quantity: cartItem.quantity
          })),
          requestedInstallments,
          deliveryDate,
          requestIntent,
          notes
        }
      };

      await api.requisitions.submitPublic(payload);

      setShowSuccessModal(true);
      toast.success('Requisição enviada com sucesso!');

      // Reset everything
      setCart([]);
      setClient({
        name: '', contactPerson: '', email: '', phone: '', taxId: '', vatNumber: '',
        billingAddress: { street: '', city: '', country: 'Moçambique' }
      });
      setRequestedInstallments(1);
      setDeliveryDate('');
      setRequestIntent('quotation');
      setNotes('');
      setIsCartOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Poll transaction status when awaiting confirmation ──
  useEffect(() => {
    if (!showAwaitingConfirmation || !awaitingRef) return;
    let cancelled = false;
    setPollStatus('waiting');
    setPollAttempts(0);

    const interval = setInterval(async () => {
      try {
        const res = await api.checkout.transactionStatus(awaitingRef);
        if (cancelled) return;
        if (res?.found && res.transaction) {
          if (res.transaction.status === 'success') {
            setPollStatus('confirmed');
            clearInterval(interval);
            setTimeout(() => {
              setShowAwaitingConfirmation(false);
              setShowSuccessModal(true);
            }, 1500);
            return;
          } else if (res.transaction.status === 'failed') {
            setPollStatus('failed');
            clearInterval(interval);
            setTimeout(() => setShowAwaitingConfirmation(false), 3000);
            return;
          }
        }
        setPollAttempts(p => p + 1);
      } catch {}
    }, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [showAwaitingConfirmation, awaitingRef]);

  const handlePayment = async () => {
    if (!paymentMethod || paymentMethod === 'none') {
      toast.error('Selecione um método de pagamento');
      return;
    }
  if (!hasValidItems) {
      toast.error('Adicione pelo menos um item ao carrinho');
      return;
    }
    if (!client.name || !client.email) {
      toast.error('Preencha o nome e email para processar o pagamento');
      return;
    }

    if (paymentMethod === 'mpesa' || paymentMethod === 'emola') {
      if (!mobileMoneyPhone) {
        toast.error('Insira o número de telemóvel para pagamento');
        return;
      }
      const cleaned = mobileMoneyPhone.replace(/\D/g, '');
      const isMpesa = paymentMethod === 'mpesa';
      const isEmola = paymentMethod === 'emola';
      if (isMpesa && !(cleaned.startsWith('84') || cleaned.startsWith('85'))) {
        toast.error('Número M-Pesa deve começar com 84 ou 85');
        return;
      }
      if (isEmola && !(cleaned.startsWith('86') || cleaned.startsWith('87'))) {
        toast.error('Número E-Mola deve começar com 86 ou 87');
        return;
      }
    }

    setSubmitting(true);
    try {
      const effectivePhone = (paymentMethod === 'mpesa' || paymentMethod === 'emola')
        ? mobileMoneyPhone : client.phone;

      const payload = {
        totalAmount: totals.grandTotal,
        method: paymentMethod,
        customer: {
          name: client.name,
          phone: effectivePhone,
          email: client.email,
        },
        companyId: company._id,
        items: cart.map(ci => ({
          itemId: ci.itemId,
          name: ci.name,
          quantity: ci.quantity,
          price: ci.price,
          type: ci.type
        }))
      };

      const resp = await api.checkout.process(payload, true); // public

      console.log('✅ Resposta do checkout:', resp); // ← Debug importante

      if (resp?.success) {
        if (resp.awaiting_confirmation || (resp.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
          setShowAwaitingConfirmation(true);
          setAwaitingRef(resp.externalRef || resp.reference || '');
        } else if (resp.url) {
          // Redireciona para a página de pagamento (Visa)
          window.location.href = resp.url;
        } else {
          // Caso onde o pagamento foi concluído imediatamente (status: success)
          toast.success(resp.message || 'Pagamento processado com sucesso!');
          setTimeout(() => {
            window.location.href = `/order-success?ref=${resp.externalRef}`;
          }, 1500);
        }
      } else {
        toast.error(resp?.message || 'Não foi possível iniciar o pagamento');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      
      // Tratamento específico para timeout 504 do Débito
      if (err.message?.includes('504') || err.response?.status === 504) {
        toast.error('O serviço de pagamento está demorando muito. Tente novamente.');
      } else {
        toast.error(err.message || 'Erro ao processar pagamento');
      }
    } finally {
      setSubmitting(false);
    }
};

  const closeSuccessModal = () => setShowSuccessModal(false);

  return (
    <div className="min-h-screen bg-zinc-950 ">
      {/* Modern Navbar */}
{/* Header Estilo Agency */}
<header className="sticky top-0 z-50 bg-zinc-950 border-b border-white/5 backdrop-blur-md">
  <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
    <div className="flex items-center">
      {company.logo ? (
        <img src={API_BS_URL + company.logo} alt={company.name} className="h-11 w-auto brightness-200" />
      ) : (
        <span className="font-serif italic text-2xl tracking-widest uppercase text-white">
          {company.name}<span className="text-amber-500">.</span>
        </span>
      )}
    </div>

    <div className="flex items-center gap-8">
      <button className="text-zinc-400 hover:text-amber-500 transition-colors">
        <Search className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => setIsCartOpen(true)}
        className="relative group flex items-center justify-center bg-white text-black p-3 rounded-full transition-all active:scale-95 hover:bg-amber-500"
      >
        <ShoppingCart className="w-5 h-5" />
        {cart.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-amber-600 text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full ring-2 ring-zinc-950 text-white">
            {cart.length}
          </div>
        )}
      </button>
    </div>
  </div>
</header>

{/* Hero Section Gastronomia - Grid Assimétrica */}
<section className="bg-zinc-950 pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden relative">
  {/* Luz ambiente focal */}
  <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 blur-[120px] rounded-full pointer-events-none" />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    {/* Grid Principal */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
      
      {/* Coluna da Esquerda: Texto e Call to Action (5 Colunas) */}
      <div className="lg:col-span-5 space-y-12 pt-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-[1px] bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500">Since 2026</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-serif italic leading-[0.9] text-white">
            A Arte do <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-600">Paladar.</span>
          </h1>
          
          <p className="text-zinc-400 text-lg leading-relaxed font-light max-w-sm">
            Uma experiência imersiva onde a mixologia de vanguarda encontra a tradição culinária sob uma nova luz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <button className="bg-white text-black px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-500 transition-all shadow-2xl shadow-white/5 active:scale-95">
            Reservar Experiência
          </button>
          
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Aberto hoje até às</span>
            <span className="text-white font-serif italic text-lg">02:00 AM</span>
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Composição de Imagens (7 Colunas) */}
      <div className="lg:col-span-7 relative">
        <div className="grid grid-cols-6 gap-4">
          
          {/* Imagem Principal (Grande) */}
          <div className="col-span-4 relative group">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-white/5">
              <img 
                src="https://i.pinimg.com/736x/51/d0/ed/51d0edf302ebd98973ee2d0947ee0d7a.jpg" 
                alt="Dining Room" 
                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[1.5s]"
              />
            </div>
            {/* Overlay de texto na imagem */}
            <div className="absolute top-8 right-8 text-right hidden md:block">
              <span className="text-[40px] font-serif italic text-white/20 block leading-none">01</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Main Hall</span>
            </div>
          </div>

          {/* Imagens de Apoio (Pequenas / Desalinhadas) */}
          <div className="col-span-2 space-y-4 pt-20">
            <div className="aspect-square overflow-hidden rounded-2xl border border-white/5 group">
              <img 
                src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700"
                alt="Cocktail"
              />
            </div>
            <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 group">
              <img 
                src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700"
                alt="Chef detail"
              />
            </div>
          </div>
        </div>

        {/* Badge de Prémio Flutuante */}
        <div className="absolute -bottom-10 left-10 bg-zinc-900 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-3xl hidden xl:block">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-amber-500 font-serif text-3xl italic leading-none">3</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-1">Stars</span>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-relaxed">
              Voted Best Lounge <br /> Experience 2026
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

{/* Item Details Modal - Gastronomia Noir Version */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden">
    {/* Overlay com Blur Cinematográfico */}
    <div 
      className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl transition-opacity" 
      onClick={() => setSelectedItem(null)} 
    />

    {/* Modal Container */}
    <div className="bg-zinc-900 border border-white/10 shadow-full w-full max-w-6xl h-fit max-h-[90vh] overflow-hidden z-10 flex flex-col md:flex-row relative rounded-3xl">
      
      {/* Botão Fechar Estilo Minimalista */}
      <button 
        onClick={() => setSelectedItem(null)} 
        className="absolute top-8 right-8 z-20 p-3 bg-white/5 hover:bg-amber-500 text-white hover:text-black rounded-full transition-all duration-300 border border-white/10 backdrop-blur-md"
      >
        <X size={20} />
      </button>

      {/* Lado Esquerdo: Galeria Masterpiece */}
      <div className="w-full md:w-[55%] bg-black flex flex-col relative">
        <div className="relative flex-1 min-h-[400px] md:min-h-0">
          {selectedItem.images && selectedItem.images.length > 0 ? (
            <>
              <img 
                src={getImageUrl(selectedItem.images[carouselIndex])} 
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000"
                alt={selectedItem.name}
              />
              
              {/* Gradiente Interno para a Imagem */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

              {selectedItem.images.length > 1 && (
                <div className="absolute bottom-10 left-10 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((carouselIndex - 1 + selectedItem.images.length) % selectedItem.images.length); }} 
                    className="text-white hover:text-amber-500 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                    {carouselIndex + 1} <span className="text-zinc-500 mx-2">/</span> {selectedItem.images.length}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((carouselIndex + 1) % selectedItem.images.length); }} 
                    className="text-white hover:text-amber-500 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-800">
              <Utensils size={64} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Imagem Indisponível</span>
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito: Conteúdo e Checkout */}
      <div className="w-full md:w-[45%] p-10 md:p-16 flex flex-col justify-between bg-zinc-900 text-white">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-[1px] bg-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">
              {activeCatalog === 'bundles' ? 'Menu Degustação' : 'Sugestão do Chef'}
            </span>
          </div>

          <h3 className="text-4xl md:text-5xl font-serif italic text-white leading-none mb-8">
            {selectedItem.name}
          </h3>

          <div className="space-y-6 mb-12">
            <p className="text-zinc-400 text-base leading-relaxed font-light italic">
              "{getItemDescription(selectedItem)}"
            </p>
            
            {/* Detalhes Extra de Bare */}
            <div className="flex gap-6 pt-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Clock size={14} className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">15-20 min</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <GlassWater size={14} className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Harmonização Incluída</span>
              </div>
            </div>
          </div>

          {activeCatalog === 'bundles' && selectedItem.items && (
            <div className="mb-12 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Composição do Menu</h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedItem.items.map((it: any) => (
                  <div key={it.productId?._id || it.productId} className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-sm font-medium text-zinc-300">{it.productId?.name || it.productId}</span>
                    <span className="text-[10px] font-serif italic text-amber-500">Qtd: {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex items-end justify-between border-t border-white/10 pt-8">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Preço</span>
            <div className="text-right">
              <span className="text-4xl font-serif italic text-white tracking-tighter">
                {getItemPrice(selectedItem).toLocaleString()} 
              </span>
              <span className="text-sm ml-2 text-amber-500 uppercase font-black">{currency}</span>
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); addToCart(selectedItem, activeCatalog); }} 
            className="w-full bg-white text-black py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-amber-500 transition-all active:scale-[0.98] shadow-2xl shadow-white/5"
          >
            Adicionar à Experiência
          </button>
        </div>
      </div>
    </div>
  </div>
)}

 <div className="max-w-7xl mx-auto px-6 pt-12 pb-24 bg-zinc-950">
  
  {/* O bloco de Tabs + Search que já definimos anteriormente entra aqui */}
<div className="flex flex-col lg:flex-row gap-12 items-stretch lg:items-end mb-24 px-6">
  
  {/* Selector de Categorias: Estilo "Menu de Mesa" */}
  {availableCatalogs.length > 0 ? (
    <div className="flex flex-wrap gap-8 items-center border-b border-white/5 pb-4">
      {availableCatalogs.map(cat => (
        <button
          key={cat}
          onClick={() => { setActiveCatalog(cat); setSearchTerm(''); }}
          className="relative group pb-2"
        >
          {/* Label do Catálogo */}
          <span className={`
            text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500
            ${activeCatalog === cat ? 'text-amber-500' : 'text-zinc-600 group-hover:text-zinc-300'}
          `}>
            {cat === 'services' && 'Serviços Exclusivos'}
            {cat === 'products' && 'Menu e bebidas'}
            {cat === 'bundles' && 'Rodizio e Assinatura'}
          </span>

          {/* Indicador de Seleção Ativa (Linha Minimalista) */}
          <div className={`
            absolute -bottom-[1px] left-0 h-[2px] bg-amber-500 transition-all duration-700 ease-in-out
            ${activeCatalog === cat ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-1/2 group-hover:opacity-50'}
          `} />
        </button>
      ))}
    </div>
  ) : null}

  {/* Search: Estilo "Busca Invisível" */}
  <div className="relative flex-1 group">
    <div className="absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-500 group-focus-within:-translate-y-[180%] group-focus-within:scale-75 origin-left">
      <Search className="h-4 w-4 text-zinc-700 group-focus-within:text-amber-500" strokeWidth={1.5} />
    </div>
    
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="PROCURAR NO MENU..."
      className="
        w-full pl-8 pr-4 py-3 
        bg-transparent border-b border-zinc-800 focus:border-white/20
        text-[11px] font-medium uppercase tracking-[0.3em] text-white 
        placeholder:text-zinc-800 transition-all outline-none
      "
    />
    
    {/* Underline de Foco Animado */}
    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-zinc-800" />
    <div className="absolute bottom-0 left-0 h-[1px] bg-amber-500 transition-all duration-1000 w-0 group-focus-within:w-full" />
    
    {/* Contador de Resultados ou Label Lateral */}
    <div className="absolute right-0 bottom-2">
      <span className="text-[8px] font-black text-zinc-800 tracking-[0.3em] uppercase opacity-0 group-focus-within:opacity-100 transition-opacity duration-700">
        Taste Discovery
      </span>
    </div>
  </div>
</div>
  {/* Noir Gastronomy Product Grid */}
  <div className="px-4">
    {availableCatalogs.length === 0 ? (
      <div className="py-32 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-[1px] bg-zinc-800 mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">Menu em preparação...</p>
      </div>
    ) : filteredItems.length === 0 ? (
      <div className="py-32 flex flex-col items-center justify-center text-center border border-white/5 rounded-3xl">
        <Search className="w-8 h-8 text-zinc-800 mb-4" strokeWidth={1} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">Nenhuma iguaria encontrada.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-10 md:gap-y-16">
        {filteredItems.map((item: any) => {
          const type = activeCatalog;
          const price = getItemPrice(item);
          const image = getItemImage(item, type);

          return (
            <div
              key={item._id}
              onClick={() => setSelectedItem(item)}
              className="group relative flex flex-col cursor-pointer"
            >
              {/* Image Container - Aspecto Retrato de Luxo */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 mb-8 shadow-2xl group-hover:border-amber-500/30 transition-all duration-700">
                {image ? (
                  <img
                    src={image}
                    alt={item.name}
                    className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[1.5s] ease-in-out opacity-80 group-hover:opacity-100"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="h-10 w-10 text-zinc-800 font-light" strokeWidth={1} />
                  </div>
                )}

                {/* Badge de Preço - Estilo Selo de Cera */}
                <div className="absolute top-6 left-6">
                  <div className="bg-zinc-950/80 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-[11px] font-serif italic tracking-widest">
                    {price.toLocaleString()} <span className="text-amber-500 text-[9px] ml-1">{currency}</span>
                  </div>
                </div>

                {/* Overlay de Hover - Estilo Reserva */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-end justify-center pb-12">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white border-b border-amber-500 pb-2">
                    Ver Detalhes
                  </span>
                </div>
              </div>

              {/* Meta Data - Estilo Carta de Vinhos */}
              <div className="flex flex-col flex-1 space-y-4 px-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-[0.3em]">
                    {activeCatalog === 'bundles' ? 'Degustação Completa' : 'Destaque do Menu'}
                  </span>
                  <div className="w-12 h-[1px] bg-zinc-800" />
                </div>
                
                <h3 className="font-serif italic text-2xl text-white group-hover:text-amber-500 transition-colors leading-tight">
                  {item.name}
                </h3>
                
                <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 font-light italic">
                  {getItemDescription(item)}
                </p>

                {/* Action - Botão Minimalista Inferior */}
                <button
                  onClick={(e) => { e.stopPropagation(); addToCart(item, type); }}
                  className="pt-6 mt-auto flex items-center justify-between group/btn"
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover/btn:text-white transition-colors">
                    Adicionar ao Pedido
                  </span>
                  <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-black transition-all">
                    <Plus size={14} />
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>
{/* CART DRAWER – Gastronomy Noir Version */}
<div className={`fixed inset-0 z-[100] pointer-events-none ${isCartOpen ? 'pointer-events-auto' : ''}`}>
  <div
    className={`absolute inset-0 bg-zinc-950/80 backdrop-blur-md transition-opacity duration-700 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsCartOpen(false)}
  />

  <div
    className={`absolute right-0 top-0 bottom-0 w-full max-w-xl bg-zinc-900 shadow-2xl flex flex-col transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-white/5`}
  >
    {/* Header Estilo Concierge */}
    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-20">
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-500/60 mb-1">Resumo da Experiência</span>
        <h2 className="text-2xl font-serif italic text-white uppercase tracking-tighter">O Seu Pedido</h2>
      </div>
      <button 
        onClick={() => setIsCartOpen(false)} 
        className="group p-3 bg-white/5 hover:bg-amber-500 rounded-full transition-all duration-500 border border-white/10"
      >
        <X size={20} className="text-white group-hover:text-black transition-colors" />
      </button>
    </div>

    {/* Conteúdo com Scroll Suave e Estilo Dark */}
    <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-zinc-900">
      
      {/* Itens do Carrinho */}
      <section>
        {cart.length > 0 ? (
          <div className="space-y-6">
            {cart.map(cartItem => (
              <div key={cartItem.itemId} className="group flex gap-6 p-4 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/5">
                {cartItem.image && (
                  <div className="relative w-20 h-24 overflow-hidden rounded-xl bg-zinc-800 shrink-0">
                    <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700" />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1 py-1">
                  <div className="flex justify-between items-start">
                    <p className="font-serif italic text-lg text-white leading-tight">{cartItem.name}</p>
                    <button onClick={() => removeFromCart(cartItem.itemId)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm font-light text-amber-500/80">
                      {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] uppercase font-black text-zinc-500">{currency}</span>
                    </p>

                    <div className="flex items-center bg-black/40 border border-white/10 rounded-full overflow-hidden h-9 px-1">
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-2 text-zinc-400 hover:text-white transition-colors"><Minus size={10} /></button>
                      <span className="px-3 text-[11px] font-black text-white min-w-[30px] text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-2 text-zinc-400 hover:text-white transition-colors"><Plus size={10} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <Utensils size={48} strokeWidth={1} className="mx-auto mb-6 text-zinc-800" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">A sua mesa ainda está vazia</p>
          </div>
        )}
      </section>

      {/* Configurações do Pedido */}
      {cart.length > 0 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-[1px] bg-amber-500/30" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Logística do Pedido</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Pretensão de Pagamento</label>
                <select
                  value={requestedInstallments}
                  onChange={(e) => setRequestedInstallments(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-4 text-xs font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                >
                  {Array.from({ length: getMaxAllowedInstallments() }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n} className="bg-zinc-900">{n}× {n === 1 ? 'À VISTA' : 'MENSALIDADES'}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Data de Reserva</label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-amber-500 transition-all uppercase"
                  required
                />
              </div>
            </div>

            <div className="p-1 bg-white/5 rounded-full border border-white/5">
              <div className="flex p-1 gap-1">
                {['quotation', 'invoice'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setRequestIntent(intent as any)}
                    className={`flex-1 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${requestIntent === intent ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {intent === 'quotation' ? 'Solicitar Cotação' : 'Emitir Fatura'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Dados do Cliente */}
          <section className="space-y-8 pb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-[1px] bg-amber-500/30" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Detalhes de Identificação</h3>
            </div>
            
            <div className="space-y-4">
              <input 
                placeholder="NOME COMPLETO OU EMPRESA *" 
                value={client.name} 
                onChange={e => setClient({ ...client, name: e.target.value })} 
                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-white tracking-widest focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700" 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  placeholder="EMAIL PARA CONTACTO *" 
                  type="email" 
                  value={client.email} 
                  onChange={e => setClient({ ...client, email: e.target.value })} 
                  className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-white tracking-widest focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700" 
                />
                <input 
                  placeholder="TELEFONE" 
                  type="tel" 
                  value={client.phone} 
                  onChange={e => setClient({ ...client, phone: e.target.value })} 
                  className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-white tracking-widest focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700" 
                />
              </div>
              <textarea 
                placeholder="NOTAS ESPECIAIS (RESCRIÇÕES OU PREFERÊNCIAS)..." 
                rows={3} 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-white tracking-widest focus:border-amber-500 outline-none transition-all resize-none placeholder:text-zinc-700" 
              />
            </div>
          </section>
        </div>
      )}
    </div>

    {/* Sticky Footer: Resumo e Finalização */}
    {cart.length > 0 && (
      <div className="border-t border-white/10 bg-zinc-950 p-6 md:p-10 space-y-6 md:space-y-8 relative">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <span>Subtotal de Seleção</span>
            <span className="text-zinc-300">{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          {totals.penalty > 0 && (
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
              <span>Taxa de Conveniência</span>
              <span>+{totals.penalty.toLocaleString()} {currency}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Investimento Total</span>
            <div className="text-right">
              <span className="text-4xl font-serif italic text-white tracking-tighter">
                {totals.grandTotal.toLocaleString()}
              </span>
              <span className="text-[10px] font-black text-amber-500 ml-2 uppercase tracking-widest">{currency}</span>
            </div>
          </div>
        </div>

        {/* Métodos de Pagamento Estilo Badge */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5">
            {['mpesa', 'emola', 'visa'].map((m) => (
              <button
                key={m}
                onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                className={`px-8 py-3 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] transition-all flex-shrink-0 ${paymentMethod === m ? 'bg-white text-black border-white shadow-xl shadow-white/5' : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-500'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Número de Telemóvel para M-Pesa / E-Mola */}
          {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
            <div className="space-y-2 transition-all duration-300">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-500" />
                {paymentMethod === 'mpesa' ? 'Número M-Pesa' : 'Número E-Mola'}
              </label>
              <input
                type="tel"
                value={mobileMoneyPhone}
                onChange={e => setMobileMoneyPhone(e.target.value)}
                placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-amber-500 transition-all placeholder:text-zinc-700"
              />
              <p className="text-[9px] text-zinc-600 font-medium tracking-wider">
                {paymentMethod === 'mpesa'
                  ? 'Deve começar com 84 ou 85'
                  : 'Deve começar com 86 ou 87'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {paymentMethod && paymentMethod !== 'none' && (
              <button
                onClick={handlePayment}
                disabled={submitting || !client.name || !client.email}
                className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl shadow-amber-500/20 active:scale-95"
              >
                {submitting ? 'A PROCESSAR...' : `PAGAR VIA ${paymentMethod.toUpperCase()}`}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || !deliveryDate}
              className="w-full py-6 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 active:scale-95"
            >
              {submitting ? 'A ENVIAR...' : 'REQUISITAR EXPERIÊNCIA'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

      {/* Modal de Aguardando Confirmação (Mobile Money) */}
{showAwaitingConfirmation && (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-zinc-950/80 backdrop-blur-md" onClick={() => {}}>
    <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-8 md:p-10 text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {pollStatus === 'waiting' && (
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <h3 className="text-xl font-serif italic text-white mb-3">A aguardar confirmação</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            Um pedido de pagamento foi enviado para o seu telemóvel.<br />
            <strong className="text-white">Introduza o seu PIN no telefone</strong> para autorizar o pagamento.
          </p>
          {awaitingRef && (
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Referência</p>
              <p className="font-mono text-sm text-amber-400">{awaitingRef}</p>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 mb-6">A verificar pagamento... (tentativa {pollAttempts})</p>
          <button
            onClick={() => setShowAwaitingConfirmation(false)}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest transition-all"
          >
            Fechar
          </button>
        </div>
      )}
      {pollStatus === 'confirmed' && (
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-serif italic text-white mb-3">Pagamento Confirmado!</h3>
          <p className="text-zinc-400 text-sm mb-6">Redirecionando...</p>
        </div>
      )}
      {pollStatus === 'failed' && (
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-serif italic text-white mb-3">Pagamento não confirmado</h3>
          <p className="text-zinc-400 text-sm mb-6">O pagamento não foi autorizado. Tente novamente.</p>
          <button
            onClick={() => setShowAwaitingConfirmation(false)}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest transition-all"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  </div>
)}

{/* Success Modal – Gastronomy Invite Version */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-6" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-zinc-900 border border-white/10 rounded-[3rem] shadow-full max-w-lg w-full p-12 md:p-20 text-center relative overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Elemento Decorativo: Brilho de Champagne */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-900/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative">
        {/* Ícone: Selo de Excelência */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-transparent border border-amber-500/30 rounded-full mb-10 group">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Check className="h-8 w-8 text-black" strokeWidth={3} />
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500/60">Confirmação de Reserva</span>
          <h2 className="text-4xl md:text-5xl font-serif italic text-white leading-[0.9] tracking-tighter">
            Pedido <br /> 
            <span className="text-zinc-500 text-3xl md:text-4xl">Confirmado.</span>
          </h2>
          
          <div className="w-12 h-[1px] bg-zinc-800 mx-auto my-8" />
          
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto font-light italic">
            O seu pedido foi enviado ao nosso Concierge. Iremos preparar cada detalhe da sua experiência e entraremos em contacto em breve.
          </p>
        </div>

        {/* Action Button: Noir Elegance */}
        <button
          onClick={closeSuccessModal}
          className="group relative w-full py-6 bg-white overflow-hidden rounded-2xl transition-all active:scale-[0.98]"
        >
          <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] text-black transition-colors group-hover:text-white">
            Explorar mais Iguarias
          </span>
          {/* Overlay Animado em Preto */}
          <div className="absolute inset-0 bg-zinc-800 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
        </button>
        
        <div className="mt-10 flex flex-col gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">
            Reference ID
          </p>
          <p className="text-[11px] font-mono text-amber-500/40 uppercase">
            #{Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
<footer className="bg-zinc-950 border-t border-white/5 pt-24 pb-12 overflow-hidden relative">
  {/* Detalhe de luz sutil no canto */}
  <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-amber-900/5 blur-[100px] rounded-full pointer-events-none" />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
      
      {/* Coluna 1: Branding e Manifesto (5 Colunas) */}
      <div className="lg:col-span-5 space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/60">{company.name}</h4>
        <h2 className="text-4xl font-serif italic text-white tracking-tighter">
          Sabor. <span className="text-zinc-600">Requinte.</span> <br />
          Memórias.
        </h2>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm font-light">
          Elevamos a gastronomia a uma forma de arte. Junte-se a nós para uma jornada sensorial onde cada detalhe é curado para a perfeição.
        </p>
        <div className="flex gap-6">
          {['Instagram', 'Facebook', 'LinkedIn'].map((social) => (
            <a 
              key={social} 
              href="#" 
              className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-amber-500 transition-colors"
            >
              {social}
            </a>
          ))}
        </div>
      </div>

      {/* Coluna 2: Contactos (3 Colunas) */}
      <div className="lg:col-span-3 space-y-6">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/60">Reservas</h4>
        <ul className="space-y-4">
          <li className="flex flex-col">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Telefone</span>
            <a href={`tel:${company.phone}`} className="text-white font-serif italic text-lg hover:text-amber-500 transition-colors">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Email</span>
            <a href={`mailto:${company.email}`} className="text-white font-serif italic text-lg hover:text-amber-500 transition-colors">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 3: Endereço (4 Colunas) */}
     {/* Coluna 3: Endereço (4 Colunas) */}
<div className="lg:col-span-4 space-y-6">
  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/60">Localização</h4>
  <div className="space-y-4">
    <p className="text-white font-serif italic text-lg leading-snug">
      {company.address?.street || 'Rua Exemplo, 123'}, 
      {company.address?.city || 'Maputo'}, 
      {company.address?.state || 'Maputo'} 
    
    </p>
    <div className="pt-4">
      <button className="text-[10px] font-black uppercase tracking-[0.3em] text-white border-b border-amber-500 pb-2 hover:border-white transition-all">
        Ver no Mapa
      </button>
    </div>
  </div>
</div>
    </div>

    {/* Bottom Bar: Copyright e Info Legal */}
    <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700">
        © 2026 {company.name}. ALL RIGHTS RESERVED.
      </p>
      
      <div className="flex gap-8">
        <a href="#" className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-zinc-400 transition-colors">Privacy Policy</a>
        <a href="#" className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-zinc-400 transition-colors">Terms of Service</a>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700">Kitchen Status: Online</span>
      </div>
    </div>
  </div>
</footer>
    </div>
  );
};

export default BarPortal;