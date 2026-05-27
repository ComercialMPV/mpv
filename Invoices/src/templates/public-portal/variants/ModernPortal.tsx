// src/templates/public-portal/variants/ModernPortal.tsx
import React, { useState, useEffect } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText, Package, ChevronLeft, ChevronRight, Play,Plus, Trash2,
  CheckCircle, Info, CreditCard, ShoppingCart, X,
  Search, Calendar, Minus, Check, User2, Eye
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

interface ModerPortalProps {
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

const ModernPortal: React.FC<ModerPortalProps> = ({ company, slug, services: initialServices, products: initialProducts, bundles: initialBundles }) => {
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
{/* Header Estilo Agency */}
<header className="sticky top-0 z-50 bg-white border-b border-gray-100">
  <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
    <div className="flex items-center">
      {company.logo ? (
        <img src={API_BS_URL + company.logo} alt={company.name} className="h-5 w-auto" />
      ) : (
        <span className="font-black text-xl tracking-tighter uppercase italic">{company.name}</span>
      )}
    </div>

    

    <div className="flex items-center gap-6">
      <button className="text-gray-400 hover:text-black transition-colors">
        <Search className="w-5 h-5" />
      </button>
      <button
        onClick={() => setIsCartOpen(true)}
        className="relative group flex items-center justify-center bg-black text-white p-3 rounded-full transition-all active:scale-95"
      >
        <ShoppingCart className="w-5 h-5" />
        {cart.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-indigo-600 text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full ring-2 ring-white">
            {cart.length}
          </div>
        )}
      </button>
    </div>
  </div>
</header>

{/* Hero Section Digital Agency */}
<section className="bg-white pt-16 pb-24 overflow-hidden">
  <div className="max-w-7xl mx-auto px-6">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16">
      <h1 className="text-[6vw] lg:text-[5rem] font-black leading-[0.8] tracking-tighter uppercase text-gray-900">
        WEBSITES. APPLICAÇÕES. BRANDING.
      </h1>
      
      <div className="max-w-md space-y-8">
        <p className="text-gray-500 text-lg leading-relaxed font-medium">
          Combinando design disruptivo, tecnologia de ponta e estratégia de dados para redefinir a presença digital da sua marca no mercado global.
        </p>
        
        <div className="flex flex-wrap items-center gap-6">
          <button className="bg-zinc-900 text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-zinc-200">
            Iniciar Projeto
          </button>
          <button className="flex items-center gap-3 text-xs font-black uppercase tracking-widest group">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-gray-50 transition-all">
              <Play className="w-4 h-4 fill-black" />
            </div>
            Showreel 2026
          </button>
        </div>
      </div>
    </div>

    <div className="relative">
      <div className="aspect-[21/9] w-full overflow-hidden rounded-sm bg-gray-100">
        <img 
          src="https://i.pinimg.com/736x/52/6c/5e/526c5eb992e918f25933e5da9c9b3d43.jpg" 
          alt="Digital Experience" 
          className="w-full h-full object-cover grayscale-[100%] contrast-125 hover:grayscale-0 transition-all duration-700"
        />
      </div>

      <div className="absolute bottom-0 right-0 w-full lg:w-[45%] bg-zinc-900 p-10 text-white hidden md:block">
        <div className="flex justify-between items-start mb-10">
          <p className="text-sm text-zinc-400 max-w-[250px] leading-relaxed font-light">
            Colocamos a experiência do utilizador no centro de cada linha de código, garantindo conversão e escala para negócios digitais.
          </p>
          <span className="text-xs font-black tracking-widest text-zinc-600 italic">CREATIVE HUB</span>
        </div>
        
        <div className="flex items-center justify-between border-t border-zinc-800 pt-8">
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">User-Centric Design</span>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 transition-all">
              <ChevronLeft size={16} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
   
  </div>
</section>

      {/* Item Details Modal */}
    {selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden">
    {/* Overlay com Blur Progressivo */}
    <div 
      className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md transition-opacity" 
      onClick={() => setSelectedItem(null)} 
    />

    {/* Modal Container */}
    <div className="bg-white  shadow-2xl w-full max-w-5xl h-fit max-h-[90vh] overflow-hidden z-10 flex flex-col md:flex-row relative">
      
      {/* Botão Fechar Flutuante (Estilo Minimalista) */}
      <button 
        onClick={() => setSelectedItem(null)} 
        className="absolute top-6 right-6 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-black hover:text-white transition-all duration-300 border border-zinc-100 shadow-sm"
      >
        <X size={20} />
      </button>

      {/* Lado Esquerdo: Galeria Masterpiece */}
      <div className="w-full md:w-1/2 bg-zinc-50 flex flex-col">
        <div className="relative flex-1 min-h-[350px] md:min-h-0">
          {selectedItem.images && selectedItem.images.length > 0 ? (
            <>
              <img 
                src={getImageUrl(selectedItem.images[carouselIndex])} 
                className="absolute inset-0 w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700"
                alt={selectedItem.name}
              />
              
              {selectedItem.images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((carouselIndex - 1 + selectedItem.images.length) % selectedItem.images.length); }} 
                    className="text-white hover:scale-125 transition-transform"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    {carouselIndex + 1} / {selectedItem.images.length}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex((carouselIndex + 1) % selectedItem.images.length); }} 
                    className="text-white hover:scale-125 transition-transform"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-300">
              <Package size={48} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sem Imagem</span>
            </div>
          )}
        </div>

        {/* Thumbnails Estilo Tira de Filme */}
        {selectedItem.images && selectedItem.images.length > 1 && (
          <div className="p-4 flex gap-2 overflow-x-auto bg-white border-t border-zinc-100 scrollbar-hide">
            {selectedItem.images.map((img: string, idx: number) => (
              <button 
                key={img} 
                onClick={() => setCarouselIndex(idx)}
                className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ${
                  idx === carouselIndex ? 'ring-2 ring-black ring-offset-2' : 'opacity-40 hover:opacity-100'
                }`}
              >
                <img src={getImageUrl(img)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lado Direito: Conteúdo e Checkout */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-white">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-[1px] bg-zinc-300" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
              {activeCatalog === 'bundles' ? 'Combo Exclusivo' : 'Digital Service'}
            </span>
          </div>

          <h3 className="text-3xl md:text-4xl font-black text-zinc-900 uppercase tracking-tighter leading-none mb-6">
            {selectedItem.name}
          </h3>

          <p className="text-zinc-500 text-sm leading-relaxed mb-8 font-medium">
            {getItemDescription(selectedItem)}
          </p>

          {activeCatalog === 'bundles' && selectedItem.items && (
            <div className="mb-8 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Incluído no Pacote</h4>
              <div className="grid grid-cols-1 gap-2">
                {selectedItem.items.map((it: any) => (
                  <div key={it.productId?._id || it.productId} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-700">{it.productId?.name || it.productId}</span>
                    <span className="text-[10px] font-black text-zinc-400">× {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 mt-8">
          <div className="flex items-end justify-between border-t border-zinc-100 pt-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Investimento</span>
            <span className="text-3xl font-black text-zinc-900 tracking-tighter">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-sm ml-1 uppercase">{currency}</span>
            </span>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); addToCart(selectedItem, activeCatalog); }} 
            className="w-full bg-zinc-900 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-[0.98] shadow-2xl shadow-zinc-200"
          >
            Adicionar ao Projeto
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      <div className="max-w-7xl mx-auto px-6 pt-12 pb-24">
      
       {/* Tabs + Search: Estilo Creative Agency */}
<div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-center mb-16 px-4">
  {availableCatalogs.length > 0 ? (
    <div className="flex bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100 shadow-inner">
      {availableCatalogs.map(cat => (
        <button
          key={cat}
          onClick={() => { setActiveCatalog(cat); setSearchTerm(''); }}
          className={`
            px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500
            ${activeCatalog === cat
              ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/50'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50'}
          `}
        >
          {cat === 'services' && 'Expertise'}
          {cat === 'products' && 'Produtos'}
          {cat === 'bundles' && 'Subscrições'}
        </button>
      ))}
    </div>
  ) : null}

  {/* Search: Ultra Clean */}
  <div className="relative flex-1 group">
    <div className="absolute left-6 top-1/2 -translate-y-1/2 transition-transform duration-300 group-focus-within:scale-110">
      <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-zinc-900" strokeWidth={1.5} />
    </div>
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="PROCURAR NA CURADORIA..."
      className="
        w-full pl-16 pr-8 py-5 
        bg-white border-b-2 border-zinc-100 focus:border-zinc-900
        text-xs font-bold uppercase tracking-widest text-zinc-900 
        placeholder:text-zinc-300 transition-all outline-none
      "
    />
    
    {/* Indicador de foco sutil */}
    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-zinc-900 transition-all duration-700 group-focus-within:w-full" />
  </div>
</div>

{/* Creative Agency Product Grid */}
<div className="px-4">
  {availableCatalogs.length === 0 ? (
    <div className="py-32 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-[1px] bg-zinc-200 mb-6" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Nenhum item disponível na curadoria.</p>
    </div>
  ) : filteredItems.length === 0 ? (
    <div className="py-32 flex flex-col items-center justify-center text-center">
      <Search className="w-8 h-8 text-zinc-200 mb-4" strokeWidth={1} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Nenhum resultado para sua busca.</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
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
            {/* Image Container - Aspecto Cinema */}
            <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-sm bg-zinc-100 mb-6">
              {image ? (
                <img
                  src={image}
                  alt={item.name}
                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[1.2s] ease-in-out"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-zinc-200 font-light" strokeWidth={1} />
                </div>
              )}

              {/* Badges Flutuantes Minimalistas */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <div className="bg-black text-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest shadow-2xl">
                  {price.toLocaleString()} {currency}
                </div>
              </div>

              {/* Botão de Ver Detalhes (Aparece no Hover) */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                <button 
                  className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
                >
                  Explorar Expertise
                </button>
              </div>
            </div>

            {/* Meta Data */}
            <div className="flex flex-col flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em]">
                  {activeCatalog === 'bundles' ? 'Premium Package' : 'Creative Asset'}
                </span>
              </div>
              
              <h3 className="font-black text-lg md:text-xl uppercase tracking-tighter text-zinc-900 leading-[0.9] line-clamp-2">
                {item.name}
              </h3>
              
              <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 font-medium">
                {getItemDescription(item)}
              </p>

              {/* Action: Link de texto em vez de botão pesado */}
              <button
                onClick={(e) => { e.stopPropagation(); addToCart(item, type); }}
                className="pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 group-hover:text-blue-600 transition-colors"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Adicionar ao Projeto</span>
                <div className="h-[1px] flex-1 bg-zinc-100 group-hover:bg-blue-600/20 transition-colors" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
      </div>
     {/* CART DRAWER – Masterpiece Version */}
<div className={`fixed inset-0 z-[100] pointer-events-none ${isCartOpen ? 'pointer-events-auto' : ''}`}>
  <div
    className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsCartOpen(false)}
  />

  <div
    className={`absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-[[-20px_0_60px_-15px_rgba(0,0,0,0.1)]] flex flex-col transform transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
  >
    {/* Header Estilo Galeria */}
    <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-white">
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Briefing do Projeto</span>
        <h2 className="text-2xl font-black tracking-tighter uppercase text-zinc-900">Seu Carrinho</h2>
      </div>
      <button 
        onClick={() => setIsCartOpen(false)} 
        className="group p-4 hover:bg-zinc-900 rounded-full transition-all duration-300"
      >
        <X size={24} className="group-hover:text-white transition-colors" />
      </button>
    </div>

    {/* Conteúdo com Scroll Suave */}
    <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
      
      {/* Itens do Carrinho - Design Compacto */}
      <section>
        {cart.length > 0 ? (
          <div className="space-y-4">
            {cart.map(cartItem => (
              <div key={cartItem.itemId} className="group flex gap-6 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                {cartItem.image && (
                  <div className="relative w-24 h-24 overflow-hidden rounded-xl bg-zinc-100 shrink-0">
                    <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1 py-1">
                  <div className="flex justify-between items-start">
                    <p className="font-black text-sm uppercase tracking-tight text-zinc-900 line-clamp-1">{cartItem.name}</p>
                    <button onClick={() => removeFromCart(cartItem.itemId)} className="text-zinc-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-400">
                      {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] uppercase font-black">{currency}</span>
                    </p>

                    <div className="flex items-center bg-white border border-zinc-200 rounded-lg overflow-hidden h-8">
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="px-2 hover:bg-zinc-50 transition-colors"><Minus size={12} /></button>
                      <span className="px-3 text-[10px] font-black border-x border-zinc-100 min-w-[32px] text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="px-2 hover:bg-zinc-50 transition-colors"><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-30">
            <Package size={60} strokeWidth={1} className="mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Aguardando sua seleção</p>
          </div>
        )}
      </section>

      {/* Configurações do Pedido */}
      {cart.length > 0 && (
        <div className="space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-[1px] bg-zinc-900" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Configurações de Entrega</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-2">Parcelamento</label>
                <select
                  value={requestedInstallments}
                  onChange={(e) => setRequestedInstallments(Number(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-1 ring-zinc-900 transition-all appearance-none"
                >
                  {Array.from({ length: getMaxAllowedInstallments() }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}× {n === 1 ? 'À VISTA' : 'PARCELAS'}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-2">Data Desejada</label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 ring-zinc-900 transition-all uppercase"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-zinc-900 rounded-2xl text-white">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Intenção do Pedido</p>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="intent" checked={requestIntent === 'quotation'} onChange={() => setRequestIntent('quotation')} className="w-4 h-4 accent-white" />
                  <span className="text-[10px] font-bold uppercase tracking-widest group-hover:opacity-100 opacity-70 transition-opacity">Cotação</span>
                </label>
                <label className="flex-1 flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="intent" checked={requestIntent === 'invoice'} onChange={() => setRequestIntent('invoice')} className="w-4 h-4 accent-white" />
                  <span className="text-[10px] font-bold uppercase tracking-widest group-hover:opacity-100 opacity-70 transition-opacity">Fatura</span>
                </label>
              </div>
            </div>
          </section>

          {/* Dados do Cliente - Grid Clean */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-[1px] bg-zinc-900" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Identificação do Cliente</h3>
            </div>
            
            <div className="space-y-3">
              <input placeholder="NOME DA EMPRESA *" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-xl text-[10px] font-bold tracking-widest focus:border-zinc-900 outline-none transition-all" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="EMAIL *" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-xl text-[10px] font-bold tracking-widest focus:border-zinc-900 outline-none transition-all" />
                <input placeholder="TELEFONE" type="tel" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-xl text-[10px] font-bold tracking-widest focus:border-zinc-900 outline-none transition-all" />
              </div>
              <textarea placeholder="OBSERVAÇÕES ADICIONAIS DO PROJETO..." rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-xl text-[10px] font-bold tracking-widest focus:border-zinc-900 outline-none transition-all resize-none" />
            </div>
          </section>
        </div>
      )}
    </div>

    {/* Sticky Footer: Resumo Financeiro */}
    {cart.length > 0 && (
      <div className="border-t border-zinc-100 bg-white p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <span>Subtotal</span>
            <span>{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          {totals.penalty > 0 && (
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-amber-600">
              <span>Taxa de Parcelamento</span>
              <span>+{totals.penalty.toLocaleString()} {currency}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-4">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-900">Total do Projeto</span>
            <span className="text-3xl font-black tracking-tighter text-zinc-900">
              {totals.grandTotal.toLocaleString()} <span className="text-xs uppercase ml-1">{currency}</span>
            </span>
          </div>
        </div>

        {/* Pagamento Online - UI de Badges */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['mpesa', 'emola', 'visa'].map((m) => (
              <button
                key={m}
                onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                className={`px-6 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl' : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-900'}`}
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
              className="w-full border-2 border-zinc-100 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-600 transition-colors"
            />
            <p className="text-[10px] text-zinc-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}

          <div className="flex flex-col gap-3">
            {paymentMethod && paymentMethod !== 'none' && (
              <button
                onClick={handlePayment}
                disabled={submitting || !client.name || !client.email || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-indigo-200"
              >
                {submitting ? 'PROCESSANDO...' : `EFETUAR PAGAMENTO ${paymentMethod.toUpperCase()}`}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || !deliveryDate}
              className="w-full py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all hover:bg-zinc-800 disabled:bg-zinc-200"
            >
              {submitting ? 'ENVIANDO...' : 'REQUISITAR SOLUÇÃO'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

      {/* Success Modal */}
      {showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-12 md:p-16 text-center relative overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Elemento Decorativo de Fundo */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50" />
      
      <div className="relative">
        {/* Ícone Minimalista com Animação sutil */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-zinc-900 rounded-full mb-10 shadow-xl shadow-zinc-200">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>

        <div className="space-y-4 mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600">Confirmação de Briefing</span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-zinc-900 leading-none">
            REQUISIÇÃO <br /> RECEBIDA.
          </h2>
          <div className="w-12 h-[2px] bg-zinc-100 mx-auto my-6" />
          <p className="text-zinc-500 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
            Nossa equipe já foi notificada. Analisaremos os detalhes e entraremos em contato.
          </p>
        </div>

        {/* Action Button Style Agency */}
        <button
          onClick={closeSuccessModal}
          className="group relative w-full py-5 bg-zinc-900 overflow-hidden rounded-2xl transition-all hover:bg-black active:scale-[0.98]"
        >
          <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-white">
            Voltar para o Hub
          </span>
          <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>
        
        <p className="mt-8 text-[9px] font-black uppercase tracking-widest text-zinc-300">
          ID da Solicitação: {Math.random().toString(36).substr(2, 9).toUpperCase()}
        </p>
      </div>
    </div>
  </div>
)}
    
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

export default ModernPortal;