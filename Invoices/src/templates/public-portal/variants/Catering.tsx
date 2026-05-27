// src/templates/public-portal/variants/CateringPortal.tsx
import React, { useState, useEffect } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  Utensils, ShoppingBag, ChevronLeft, ChevronRight, Plus, Trash2,
  UtensilsCrossed, X,
  Search, Minus, Check
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

interface CateringProps {
  company: Company;
  slug: string;
  services: Service[];
  products: Product[];      // ← ADICIONAR
  bundles: Bundle[];        // ← ADICIONAR
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

const Catering: React.FC<CateringProps> = ({ company, slug, services: initialServices, products: initialProducts, bundles: initialBundles }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<CatalogType>('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>(initialServices || []);

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
        const promises: Promise<any>[] = [];
        let serviceIndex = -1, productIndex = -1, bundleIndex = -1;
        
        if (!initialServices?.length) {
          serviceIndex = promises.length;
          promises.push(api.services.getAll());
        }
        if (!initialProducts?.length) {
          productIndex = promises.length;
          promises.push(api.products.getAll());
        }
        if (!initialBundles?.length) {
          bundleIndex = promises.length;
          promises.push(api.bundles.getAll());
        }
        
        if (promises.length === 0) return;
        
        const results = await Promise.all(promises);
        
        if (serviceIndex !== -1 && results[serviceIndex]) setServices(results[serviceIndex] as Service[]);
        if (productIndex !== -1 && results[productIndex]) setProducts(results[productIndex] as Product[]);
        if (bundleIndex !== -1 && results[bundleIndex]) setBundles(results[bundleIndex] as Bundle[]);
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

  // Mobile money prefix validation
  if (paymentMethod === 'mpesa' || paymentMethod === 'emola') {
    if (!mobileMoneyPhone) {
      toast.error(`Número de ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'E-Mola'} é obrigatório`);
      return;
    }
    const cleaned = mobileMoneyPhone.replace(/\D/g, '');
    const isMpesa = paymentMethod === 'mpesa';
    const isEmola = paymentMethod === 'emola';
    const validMpesa = cleaned.startsWith('84') || cleaned.startsWith('85');
    const validEmola = cleaned.startsWith('86') || cleaned.startsWith('87');
    if (isMpesa && !validMpesa) {
      toast.error('Número M-Pesa deve começar com 84 ou 85');
      return;
    }
    if (isEmola && !validEmola) {
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
      currency: currency,
      items: cart.map(ci => ({
        itemId: ci.itemId,
        name: ci.name,
        quantity: ci.quantity,
        price: ci.price,
        type: ci.type
      }))
    };
    const resp = await api.checkout.process(payload, true);
    console.log('✅ Resposta do checkout:', resp);
    if (resp?.success) {
      if (resp.awaiting_confirmation || (resp.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
        setAwaitingRef(resp.externalRef);
        setPollStatus('waiting');
        setPollAttempts(0);
        setShowAwaitingConfirmation(true);
        return;
      }
      if (resp.url) {
        window.location.href = resp.url;
      } else {
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
    if (err.message?.includes('504') || err.response?.status === 504) {
      toast.error('O serviço de pagamento está demorando muito. Tente novamente.');
    } else {
      toast.error(err.message || 'Erro ao processar pagamento');
    }
  } finally {
    setSubmitting(false);
  }
};

    // Poll awaiting confirmation
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
        } else if (res?.status === 'success' || res?.status === 'completed') {
          setPollStatus('confirmed');
          clearInterval(interval);
          setTimeout(() => {
            window.location.href = `/order-success?ref=${awaitingRef}`;
          }, 2000);
          return;
        } else if (res?.status === 'failed' || res?.status === 'cancelled') {
          setPollStatus('failed');
          clearInterval(interval);
          return;
        }
        setPollAttempts(p => p + 1);
      } catch {}
    }, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [showAwaitingConfirmation, awaitingRef]);

  const closeSuccessModal = () => setShowSuccessModal(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Modern Navbar */}
{/* Header Estilo Premium Salon */}

{/* Header Estilo Premium Catering */}
<header className="sticky top-0 z-50 bg-[#121418]/95 backdrop-blur-md border-b border-white/5">
  <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
    
    {/* Logo à Esquerda (Estilo Restaurant Ref) */}
    <div className="flex items-center gap-3">
      {company.logo ? (
        <img src={API_BS_URL + company.logo} alt={company.name} className="h-10 w-auto" />
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center rotate-3">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tighter uppercase text-white">
            {company.name || "anida dedelay"}
          </span>
        </div>
      )}
    </div>

    {/* Menu Central - Nav Clean */}
    <nav className="hidden lg:flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-400">
      <a href="#" className="text-white border-b border-orange-600 pb-1">Home</a>
      <a href="#" className="hover:text-orange-600 transition-colors">Menu</a>
      <a href="#" className="hover:text-orange-600 transition-colors">Pages</a>
      <a href="#" className="hover:text-orange-600 transition-colors">Blog</a>
      <a href="#" className="hover:text-orange-600 transition-colors">Contact</a>
    </nav>

    {/* Ações à Direita */}
    <div className="flex items-center gap-4">
      <button className="hidden sm:block bg-orange-600 text-white px-6 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-900/20">
        Sign In
      </button>
      <button
        onClick={() => setIsCartOpen(true)}
        className="relative p-2.5 bg-zinc-800 rounded-md text-white hover:bg-zinc-700 transition-all"
      >
        <ShoppingBag className="w-5 h-5" />
        {cart.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-orange-600 text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
            {cart.length}
          </div>
        )}
      </button>
    </div>
  </div>
</header>

{/* Hero Section: Fine Dining Experience */}
<section className="bg-[#121418] pt-16 pb-24 relative overflow-hidden">
  {/* Elementos Orgânicos de Fundo (Simulando a ref) */}
  <div className="absolute top-20 left-10 w-4 h-4 bg-orange-600/20 rounded-full blur-xl" />
  <div className="absolute bottom-20 right-10 w-64 h-64 bg-orange-600/5 rounded-full blur-[120px]" />

  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
    
    {/* Texto de Impacto */}
    <div className="space-y-8 z-10">
      <div className="space-y-2">
        <span className="text-orange-600 text-xs font-bold uppercase tracking-[0.4em]">
          Premium Catering Service
        </span>
        <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.95] tracking-tighter">
          Sabor <br /> 
          <span className="text-zinc-700">Inesquecível.</span>
        </h1>
      </div>
      
      <p className="text-zinc-400 text-lg leading-relaxed max-w-md font-medium">
        Os melhores ingredientes selecionados para o seu evento. Experiência gastronômica de elite com curadoria exclusiva.
      </p>

      <div className="flex flex-wrap gap-4">
        <button className="bg-orange-600 text-white px-10 py-5 rounded-md text-xs font-black uppercase tracking-[0.2em] hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/40">
          Explorar Menu
        </button>
        <button className="bg-transparent border-2 border-zinc-800 text-white px-10 py-5 rounded-md text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all">
          Nosso Serviço
        </button>
      </div>
    </div>

    {/* Prato de Destaque (Estilo Referência) */}
    <div className="relative flex justify-center lg:justify-end">
      <div className="relative w-full max-w-[500px] aspect-square group">
        {/* Glow de fundo para o prato */}
        <div className="absolute inset-0 bg-orange-600/10 rounded-full blur-[80px] animate-pulse" />
        
        <img 
          src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop" 
          alt="Featured Dish" 
          className="w-full h-full object-cover rounded-full border-[12px] border-zinc-900 shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-transform duration-[3000ms] group-hover:rotate-12"
        />

        {/* Floating Badges */}
        <div className="absolute top-10 -left-6 bg-white p-4 rounded-xl shadow-2xl rotate-[-10deg]">
           <p className="text-[10px] font-black text-zinc-900 uppercase">100% Orgânico</p>
        </div>
      </div>
    </div>

  </div>
</section>

{/* Item Details Modal - Luxury Boutique Style */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden">
    {/* Overlay Dark com Blur Intenso */}
    <div 
      className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md transition-opacity" 
      onClick={() => setSelectedItem(null)} 
    />

    {/* Modal Container - Dark & Sharp */}
    <div className="bg-[#121418] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-6xl h-fit max-h-[90vh] overflow-hidden z-10 flex flex-col md:flex-row relative rounded-3xl border border-white/5">
      
      {/* Botão Fechar - Estilo Floating */}
      <button 
        onClick={() => setSelectedItem(null)} 
        className="absolute top-6 right-6 z-20 p-3 bg-zinc-800/80 text-white backdrop-blur-md rounded-xl hover:bg-orange-600 transition-all duration-300 border border-white/10"
      >
        <X size={20} />
      </button>

      {/* Lado Esquerdo: Fotografia Gastronômica */}
      <div className="w-full md:w-1/2 bg-zinc-900 flex flex-col relative">
        <div className="relative flex-1 min-h-[400px] md:min-h-0 overflow-hidden">
          {selectedItem.images && selectedItem.images.length > 0 ? (
            <>
              <img 
                src={getImageUrl(selectedItem.images[carouselIndex])} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[5000ms] hover:scale-110"
                alt={selectedItem.name}
              />
              {/* Vinheta de sombra para destacar o prato */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
              
              {selectedItem.images.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-zinc-900/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((carouselIndex - 1 + selectedItem.images.length) % selectedItem.images.length); }} 
                    className="text-white hover:text-orange-500 transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <span className="text-xs font-black text-white uppercase tracking-[0.4em]">
                    {carouselIndex + 1} <span className="text-orange-600">/</span> {selectedItem.images.length}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((carouselIndex + 1) % selectedItem.images.length); }} 
                    className="text-white hover:text-orange-500 transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-700">
              <Utensils size={48} strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-widest font-black">Sem Imagem do Prato</span>
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito: Menu & Detalhes */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-[#121418]">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-[2px] bg-orange-600" />
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.5em]">
              {activeCatalog === 'bundles' ? 'Menu Degustação' : 'À La Carte'}
            </span>
          </div>

          <h3 className="text-5xl md:text-6xl font-black text-white leading-none mb-8 tracking-tighter uppercase">
            {selectedItem.name}
          </h3>

          <p className="text-zinc-400 text-lg leading-relaxed mb-10 font-medium italic">
            "{getItemDescription(selectedItem)}"
          </p>

          {/* Ingredientes / Detalhes do Combo */}
          <div className="mb-10 space-y-4">
             <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Componentes do Prato:</h4>
             <div className="grid grid-cols-1 gap-3">
                {selectedItem.items?.map((it: any) => (
                  <div key={it.productId?._id} className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-sm font-bold text-zinc-300">{it.productId?.name}</span>
                    <span className="text-[10px] font-black text-orange-600 bg-orange-600/10 px-2 py-1 rounded">x{it.quantity}</span>
                  </div>
                )) || (
                  <p className="text-xs text-zinc-600 italic">Preparado com ingredientes sazonais e frescos.</p>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-end justify-between border-t border-white/5 pt-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Preço por pessoa</span>
              <span className="text-4xl font-black text-white tracking-tighter">
                {getItemPrice(selectedItem).toLocaleString()} <span className="text-sm text-orange-600 ml-1">{currency}</span>
              </span>
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); addToCart(selectedItem, activeCatalog); }} 
            className="w-full bg-orange-600 text-white py-6 rounded-xl text-xs font-black uppercase tracking-[0.3em] hover:bg-orange-700 transition-all active:scale-[0.98] shadow-2xl shadow-orange-900/20"
          >
            Adicionar ao Pedido
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Tabs + Grid: Estilo Fine Dining Dark */}
<div className="bg-[#0f1115] min-h-screen">
  <div className="max-w-7xl mx-auto px-6 py-20">
    
    {/* Tabs & Search: Dark Contrast */}
    <div className="flex flex-col lg:flex-row gap-12 items-center mb-24">
      {availableCatalogs.length > 0 && (
        <div className="flex flex-wrap gap-10 items-center justify-center border-b border-white/5 pb-4">
          {availableCatalogs.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCatalog(cat); setSearchTerm(''); }}
              className={`relative py-3 text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-500
                ${activeCatalog === cat ? 'text-orange-600' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {cat === 'services' && 'Eventos & Buffet'}
              {cat === 'products' && 'Menu de Pratos'}
              {cat === 'bundles' && 'Pacotes Especiais'}
              
              {activeCatalog === cat && (
                <div className="absolute -bottom-[1px] left-0 w-full h-[2px] bg-orange-600 shadow-[0_0_10px_#ea580c]" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 group w-full">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" strokeWidth={3} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="O QUE VOCÊ DESEJA DEGUSTAR?"
          className="w-full pl-10 pr-4 py-4 bg-transparent border-b border-zinc-800 focus:border-orange-600 text-[10px] font-black tracking-[0.2em] text-white placeholder:text-zinc-700 transition-all outline-none uppercase"
        />
      </div>
    </div>

    {/* Product Grid: Industrial Chic */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
      {filteredItems.map((item: any) => {
        const image = getItemImage(item, activeCatalog);
        return (
          <div
            key={item._id}
            onClick={() => setSelectedItem(item)}
            className="group relative flex flex-col cursor-pointer"
          >
            {/* Image Container - Redondo ou Quadrado Sharp */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 mb-6 border border-white/5 transition-all duration-500 group-hover:border-orange-600/50">
              {image ? (
                <img
                  src={image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:rotate-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils className="h-12 w-12 text-zinc-800" strokeWidth={1} />
                </div>
              )}

              {/* Botão Hover Laranja */}
              <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                 <div className="bg-orange-600 text-white p-4 rounded-full scale-50 group-hover:scale-100 transition-transform duration-500">
                    <Plus size={24} strokeWidth={3} />
                 </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-black text-xl text-white uppercase tracking-tighter leading-tight group-hover:text-orange-500 transition-colors">
                  {item.name}
                </h3>
              </div>
              
              <div className="flex items-center gap-4">
                 <span className="text-orange-600 font-black text-sm">
                   {getItemPrice(item).toLocaleString()} {currency}
                 </span>
                 <div className="h-[1px] flex-1 bg-zinc-800" />
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                   {activeCatalog === 'services' ? 'Service' : 'Menu'}
                 </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</div>
     {/* CART DRAWER – Masterpiece Version */}
<div className={`fixed inset-0 z-[100] pointer-events-none ${isCartOpen ? 'pointer-events-auto' : ''}`}>
  {/* Overlay Dark com Blur Intenso */}
  <div
    className={`absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-700 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsCartOpen(false)}
  />

  <div
    className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-[#0F1115] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col transform transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-l border-white/5 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
  >
    {/* Header: Resumo do Pedido */}
    <div className="p-10 border-b border-white/5 flex items-center justify-between bg-[#0F1115]">
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-600 mb-1">Seu Pedido</span>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Carrinho de <br /> <span className="text-zinc-700">Gastronomia</span></h2>
      </div>
      <button 
        onClick={() => setIsCartOpen(false)} 
        className="p-4 bg-zinc-900 text-white hover:bg-orange-600 rounded-2xl transition-all duration-300 border border-white/10 group"
      >
        <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
      </button>
    </div>

    {/* Conteúdo scrollable */}
    <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
      
      {/* Listagem de Pratos/Serviços */}
      <section>
        {cart.length > 0 ? (
          <div className="space-y-8">
            {cart.map(cartItem => (
              <div key={cartItem.itemId} className="group flex gap-6 p-4 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-orange-600/30 transition-all">
                {cartItem.image && (
                  <div className="relative w-20 h-20 overflow-hidden rounded-2xl bg-zinc-800 shrink-0 border border-white/10">
                    <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1 py-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm text-white uppercase tracking-tight leading-tight mb-1">{cartItem.name}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Preço Unitário: <span className="text-zinc-300">{cartItem.price.toLocaleString()} {currency}</span></p>
                    </div>
                    <button onClick={() => removeFromCart(cartItem.itemId)} className="text-zinc-700 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-lg font-black text-orange-600">
                      {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] text-zinc-500">{currency}</span>
                    </p>

                    <div className="flex items-center bg-zinc-950 border border-white/10 rounded-xl px-2 h-10 shadow-inner">
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Minus size={12} strokeWidth={3} /></button>
                      <span className="px-3 text-xs font-black text-white min-w-[30px] text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Plus size={12} strokeWidth={3} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
                <Utensils size={32} strokeWidth={1.5} className="text-zinc-700" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">Sua seleção gastronômica <br /> está vazia.</p>
          </div>
        )}
      </section>

      {/* Checkout Form Estilo Dark Business */}
      {cart.length > 0 && (
        <div className="space-y-12">
          {/* Preferências de Evento */}
          <section className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 border-l-2 border-orange-600 pl-4">Logística do Evento</h3>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Modalidade de Pagamento</label>
                <select
                  value={requestedInstallments}
                  onChange={(e) => setRequestedInstallments(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-5 text-xs font-bold text-white outline-none focus:border-orange-600 transition-all appearance-none shadow-xl"
                >
                  {Array.from({ length: getMaxAllowedInstallments() }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n} className="bg-zinc-900">{n}× {n === 1 ? 'PAGAMENTO ÚNICO' : 'PARCELAS MENSAIS'}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Data Preferencial</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-5 text-xs font-bold text-white outline-none focus:border-orange-600 transition-all shadow-xl invert-[0.05]"
                  required
                />
              </div>
            </div>
          </section>

          {/* Dados do Cliente */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 border-l-2 border-orange-600 pl-4">Dados de Contato</h3>
            <div className="space-y-4">
              <input placeholder="NOME DO RESPONSÁVEL *" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-6 py-5 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-bold text-white tracking-widest focus:border-orange-600 outline-none transition-all" />
              <input placeholder="E-MAIL CORPORATIVO OU PESSOAL *" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-6 py-5 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-bold text-white tracking-widest focus:border-orange-600 outline-none transition-all" />
              <textarea placeholder="OBSERVAÇÕES (ALERGIAS, REQUISITOS ESPECIAIS...)" rows={4} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-6 py-5 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-bold text-white tracking-widest focus:border-orange-600 outline-none transition-all resize-none" />
            </div>
          </section>
        </div>
      )}
    </div>

    {/* Footer com Resumo Financeiro */}
    {cart.length > 0 && (
      <div className="border-t border-white/5 bg-[#0A0C0E] p-10 space-y-10 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
            <span>Subtotal da Comanda</span>
            <span>{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white">Investimento Total</span>
            <div className="flex flex-col items-end">
                <span className="text-4xl font-black text-white tracking-tighter">
                  {totals.grandTotal.toLocaleString()} <span className="text-sm text-orange-600 uppercase font-black">{currency}</span>
                </span>
            </div>
          </div>
        </div>

        {/* Pagamento & Botões de Ação */}
        <div className="space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {['mpesa', 'emola', 'visa'].map((m) => (
              <button
                key={m}
                onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                className={`px-8 py-3 rounded-xl border text-[9px] font-black uppercase tracking-[0.3em] transition-all flex-1 text-center ${paymentMethod === m ? 'bg-orange-600 text-white border-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-zinc-700'}`}
              >
                {m}
              </button>
            ))}
          </div>

        {/* Número de Telemóvel para M-Pesa / E-Mola */}
        {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
          <div className="flex flex-col gap-2">
            <input
              type="tel"
              value={mobileMoneyPhone}
              onChange={e => setMobileMoneyPhone(e.target.value)}
              placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-600"
            />
            <p className="text-[10px] text-zinc-500 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}

          <div className="flex flex-col gap-4">
            {paymentMethod && paymentMethod !== 'none' && (
              <button
                onClick={handlePayment}
                disabled={submitting || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
                className="w-full py-6 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl transition-all hover:bg-orange-700 shadow-2xl shadow-orange-900/30 active:scale-[0.98]"
              >
                Processar com {paymentMethod.toUpperCase()}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email}
              className="w-full py-6 bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl transition-all hover:bg-zinc-700 disabled:opacity-30 disabled:grayscale"
            >
              Confirmar Reserva de Evento
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

{/* Success Modal - Estilo Gastronomia de Elite */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-[#121418] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] max-w-lg w-full p-12 md:p-16 text-center relative overflow-hidden border border-white/5"
      onClick={e => e.stopPropagation()}
    >
      {/* Elemento Decorativo: Brilho de "Luz de Cozinha/Calor" */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px]" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-600/5 rounded-full blur-[80px]" />
      
      <div className="relative">
        {/* Ícone de Sucesso Industrial Chic */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-2xl mb-10 shadow-[0_0_30px_rgba(234,88,12,0.4)] rotate-3">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>

        <div className="space-y-6 mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-600">
            Reserva Confirmada
          </span>
          
          <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter uppercase">
            PEDIDO <br /> <span className="text-zinc-700">PROCESSADO.</span>
          </h2>
          
          <div className="w-12 h-[2px] bg-zinc-800 mx-auto my-8" />
          
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto font-medium italic">
            Sua experiência gastronômica está garantida. Nossa equipe de catering entrará em contato em breve para os detalhes finais.
          </p>
        </div>

        {/* Action Button - Estilo App de Luxo */}
        <button
          onClick={closeSuccessModal}
          className="group relative w-full py-6 bg-orange-600 overflow-hidden rounded-xl transition-all hover:bg-orange-700 active:scale-[0.98] shadow-2xl shadow-orange-900/40"
        >
          <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.3em] text-white">
            Voltar ao Menu
          </span>
        </button>
        
        <div className="mt-10 flex items-center justify-center gap-4 opacity-20">
           <div className="h-[1px] w-8 bg-zinc-700" />
           <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
             ORDER ID: {Math.random().toString(36).substring(2, 8).toUpperCase()}
           </p>
           <div className="h-[1px] w-8 bg-zinc-700" />
        </div>
      </div>
    </div>
  </div>
)}
<footer className="bg-[#0A0C0E] border-t border-white/5 pt-28 pb-12 overflow-hidden relative">
  {/* Gradiente sutil de "Calor da Cozinha" */}
  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/5 blur-[150px] rounded-full pointer-events-none" />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-28">
      
      {/* Coluna 1: Branding e Manifesto Gastronômico */}
      <div className="lg:col-span-5 space-y-12">
        <div className="flex flex-col">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-[2px] bg-orange-600" />
              <span className="font-black text-2xl text-white tracking-tighter uppercase">
                {company.name || "anida dedelay"}
              </span>
           </div>
        </div>
        
        <h2 className="text-5xl font-black text-white leading-[0.9] uppercase tracking-tighter">
          A arte de <br />
          <span className="text-zinc-800 italic">servir bem.</span>
        </h2>
        
        <p className="text-zinc-500 text-base leading-relaxed max-w-sm font-medium">
          Curadoria gastronômica para eventos de elite. Transformamos ingredientes sazonais em experiências sensoriais inesquecíveis.
        </p>
        
        <div className="flex gap-10">
          {['Instagram', 'Facebook', 'LinkedIn', 'WhatsApp'].map((social) => (
            <a 
              key={social} 
              href="#" 
              className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-orange-600 transition-all"
            >
              {social}
            </a>
          ))}
        </div>
      </div>

      {/* Coluna 2: Contato e Reservas */}
      <div className="lg:col-span-3 space-y-10">
        <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-orange-600">Contato</h4>
        <ul className="space-y-8">
          <li className="flex flex-col">
            <span className="text-[9px] text-zinc-700 uppercase tracking-[0.2em] mb-2 font-black">Reservas e Eventos</span>
            <a href={`tel:${company.phone}`} className="text-white font-black text-xl hover:text-orange-600 transition-colors tracking-tight">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col">
            <span className="text-[9px] text-zinc-700 uppercase tracking-[0.2em] mb-2 font-black">E-mail Comercial</span>
            <a href={`mailto:${company.email}`} className="text-white font-black text-xl hover:text-orange-600 transition-colors tracking-tight">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 3: Localização e CTA */}
      <div className="lg:col-span-4 space-y-10">
        <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-orange-600">Localização</h4>
        <div className="space-y-8">
          <p className="text-white font-bold text-lg leading-tight uppercase tracking-tighter">
            {company.address?.street || 'Distrito Industrial, 402'}, <br />
            {company.address?.city || 'Maputo'} — Moçambique
          </p>
          <div className="pt-4">
            <button className="bg-orange-600 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all shadow-xl shadow-orange-900/10">
              Solicitar Orçamento
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Clean & Tech */}
    <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700">
        © 2026 {company.name}. HIGH-END CATERING SOLUTIONS.
      </p>
      
      <div className="flex gap-12">
        <a href="#" className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 hover:text-white transition-colors">Termos</a>
        <a href="#" className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 hover:text-white transition-colors">Privacidade</a>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Service Status: Online</span>
        </div>
      </div>
    </div>
  </div>
</footer>
    
      {/* Awaiting Confirmation Modal */}
      {showAwaitingConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            {pollStatus === 'waiting' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-2">A aguardar confirmação</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Um pedido de pagamento foi enviado para o seu telemóvel.<br />
                  Introduza o seu PIN no telefone para autorizar o pagamento.
                </p>
                {awaitingRef && (
                  <p className="font-mono text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 inline-block px-3 py-1 rounded-full">
                    Ref: {awaitingRef}
                  </p>
                )}
              </>
            )}
            {pollStatus === 'confirmed' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">Pagamento Confirmado!</h3>
                <p className="text-sm text-zinc-500">Redirecionando...</p>
              </>
            )}
            {pollStatus === 'failed' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Pagamento não confirmado</h3>
                <p className="text-sm text-zinc-500 mb-4">O pagamento foi recusado ou expirou.</p>
                <button
                  onClick={() => setShowAwaitingConfirmation(false)}
                  className="px-6 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </>
            )}
          </div>
        </div>
      )}
</div>
  );
};

export default Catering;