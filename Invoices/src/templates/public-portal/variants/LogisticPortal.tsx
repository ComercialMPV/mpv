// src/templates/public-portal/variants/LogisticPortal.tsx
import React, { useState, useEffect } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText,  Package, Menu, Utensils, Briefcase, PhoneCall, Heart, ChevronDown, ShoppingBag, ChevronLeft, ChevronRight, Play,Plus, Trash2,
  CheckCircle, Info, CreditCard, UtensilsCrossed, ShoppingCart, X,
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

interface LogisticProps {
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

const LogisticPortal: React.FC<LogisticProps> = ({ company, slug, services: initialServices, products: initialProducts, bundles: initialBundles }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<CatalogType>('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>(initialServices || []);

  // will calculate available catalogs once services/products/bundles are defined later

  // track searches performed by visitors (debounced so we don't spam the API)
   // logging de pesquisa já não depende de activeCatalog
  useEffect(() => {
    if (!searchTerm || !slug) return;
    const handler = setTimeout(() => {
      api.public.logSearch(slug, { term: searchTerm, catalog: 'all' });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, slug]);

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

    // ------------ alterações -------------
  // controla o “ver mais” de cada secção
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllBundles, setShowAllBundles] = useState(false);

  // guarda o tipo do item que está aberto no modal (usado mais abaixo)
  const [selectedItemType, setSelectedItemType] = useState<CatalogType | null>(null);

  const openItem = (item: any, type: CatalogType) => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setCarouselIndex(0);
  };

    // listas filtradas individualmente
  const filteredProducts = products.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const filteredServices = services.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const filteredBundles = bundles.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

{/* Header Estilo Premium Logistic */}
<div className="font-sans text-slate-900">
      {/* 1. TOP UTILITY BAR */}
      <div className="bg-white border-b border-gray-100 py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 flex justify-between text-[11px] text-gray-500 font-medium">
          <div className="flex gap-4">
            <a href="#" className="hover:text-blue-600">Find a Store</a>
            <a href="#" className="hover:text-blue-600">Order Tracking</a>
          </div>
          <div className="flex gap-4">
            <span>Free shipping worldwide. Orders over $200</span>
            <select className="bg-transparent outline-none cursor-pointer"><option>USD</option></select>
            <select className="bg-transparent outline-none cursor-pointer"><option>English</option></select>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Logo & Search) */}
      <header className="bg-white py-5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-8">
          {/* Logo */}
         <div className="flex items-center">
               {company.logo ? (
                 <img src={API_BS_URL + company.logo} alt={company.name} className="h-5 w-auto" />
               ) : (
                 <span className="font-black text-xl tracking-tighter uppercase italic">{company.name}</span>
               )}
             </div>

       

          {/* Icons */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 border-r pr-6 border-gray-200">
               <div className="text-blue-600 bg-blue-50 p-2 rounded-full"><PhoneCall className="w-5 h-5" /></div>
               <div className="flex flex-col text-xs">
                 <span className="text-gray-400">24/7 Support</span>
                 <span className="font-bold">{company.phone}</span>
               </div>
            </div>
            <div className="flex gap-4 text-gray-700">
              <Heart className="w-6 h-6 hover:text-blue-600 cursor-pointer" />
              <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative group flex items-center justify-center transition-all active:scale-95"
                  >
                <ShoppingCart className="w-6 h-6 hover:text-blue-600" />
                  {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>
                  )}
              </button>
            </div>
              
          </div>
        </div>
      </header>

      {/* 3. NAVIGATION BAR */}
   

      {/* 4. HERO SECTION */}
      <section className="bg-[#1a56db] relative overflow-hidden min-h-[500px] flex items-center">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500 rounded-full translate-x-1/3 -translate-y-1/4 opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-blue-400 rounded-full opacity-30" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="text-white space-y-6">
            <p className="uppercase tracking-[0.3em] text-sm font-semibold opacity-80">
              Dualsense Wireless Controller
            </p>
            <h1 className="text-6xl md:text-7xl font-bold leading-tight">
              Bring Gaming <br /> Worlds To Life
            </h1>
            <div className="space-y-1">
              <p className="text-sm opacity-80 italic">Starting at</p>
              <p className="text-3xl font-bold text-yellow-400">$449.99</p>
            </div>
            <button className="bg-white text-blue-700 px-8 py-3 rounded font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all">
              Shop Now &nbsp;→
            </button>
          </div>

          <div className="relative">
             {/* Product Images (Controllers) */}
             <div className="relative w-full h-[450px]">
                <img 
                  src="https://i.pinimg.com/736x/8c/db/e1/8cdbe123010c380e20f264a8fdd57938.jpg" 
                  alt="Black Controller"
                  className="absolute top-0 right-0 w-2/3 object-contain drop-shadow-2xl z-10 -rotate-12"
                />
                <img 
                  src="https://i.pinimg.com/1200x/c0/46/2f/c0462f74f40fe132486d3d9fe75d543f.jpg" 
                  alt="White Controller"
                  className="absolute bottom-0 left-0 w-3/4 object-contain drop-shadow-2xl z-20"
                />
             </div>
          </div>
        </div>
      </section>
 </div>
 <div className="relative flex-1 group w-full mb-12 max-w-2xl mx-auto">

     {/* Search Bar (Replicating the wide search in image) */}
          <div className="hidden md:flex mt-10 flex-1 max-w-2xl rounded-full items-center overflow-hidden">
            <select className="bg-transparent px-5 py-2 text-sm border-r border-gray-300 outline-none font-medium text-gray-600">
              <option>All Categories</option>
            </select>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for Products..." 
              className="bg-transparent flex-1 px-4 py-3 text-sm outline-none"
            />
            <button className="bg-black text-white p-3 px-6 hover:bg-blue-600 transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
</div>
{/* Item Details Modal - Luxury Boutique Style */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
    {/* Overlay mais suave */}
    <div 
      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
      onClick={() => setSelectedItem(null)} 
    />

    {/* Modal Container - White & Clean */}
    <div className="bg-white shadow-2xl w-full max-w-5xl h-fit max-h-[95vh] overflow-hidden z-10 flex flex-col md:flex-row relative rounded-2xl">
      
      {/* Botão Fechar - Minimalista */}
      <button 
        onClick={() => setSelectedItem(null)} 
        className="absolute top-4 right-4 z-20 p-2 bg-white/80 text-slate-500 hover:text-red-500 rounded-full shadow-sm border border-gray-100 transition-all"
      >
        <X size={20} />
      </button>

      {/* Lado Esquerdo: Galeria de Imagens */}
      <div className="w-full md:w-1/2 bg-gray-50 flex flex-col relative border-r border-gray-100">
        <div className="relative flex-1 min-h-[350px] md:min-h-[500px] flex items-center justify-center p-8">
          {selectedItem.images && selectedItem.images.length > 0 ? (
            <>
              <img 
                src={getImageUrl(selectedItem.images[carouselIndex])} 
                className="max-w-full max-h-full object-contain drop-shadow-xl transition-transform duration-500 hover:scale-105"
                alt={selectedItem.name}
              />
              
              {selectedItem.images.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                  {selectedItem.images.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 w-8 rounded-full transition-all ${idx === carouselIndex ? 'bg-blue-600' : 'bg-gray-300'}`} 
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-gray-300">
              <Utensils size={64} />
              <span className="text-xs mt-2 uppercase font-bold tracking-widest">Imagem indisponível</span>
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito: Info & Checkout */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col bg-white">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-50 text-[10px] font-bold text-blue-600 uppercase rounded tracking-wider">
              {activeCatalog === 'bundles' ? 'Combo Especial' : 'Produto Premium'}
            </span>
            <div className="flex text-yellow-400">
                {[1,2,3,4,5].map(s => <span key={s} className="text-sm">★</span>)}
            </div>
          </div>

          <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            {selectedItem.name}
          </h3>

          <p className="text-slate-500 text-base leading-relaxed mb-8">
            {getItemDescription(selectedItem)}
          </p>

          {/* Especificações/Componentes */}
          <div className="mb-8 p-4 bg-slate-50 rounded-xl">
             <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">O que está incluído:</h4>
             <div className="space-y-3">
                {selectedItem.items?.map((it) => (
                  <div key={it.productId?._id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 font-medium">{it.productId?.name}</span>
                    <span className="font-bold text-blue-600">x{it.quantity}</span>
                  </div>
                )) || <p className="text-xs text-slate-400">Garantia de qualidade e frescor original.</p>}
             </div>
          </div>
        </div>

        {/* Preço e Ação */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Preço Total</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">
                  {getItemPrice(selectedItem).toLocaleString()}
                </span>
                <span className="text-blue-600 font-bold">{currency}</span>
              </div>
            </div>
            
            {/* Seletor de Qtd (Estilo E-commerce) */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-10">
                <button className="px-3 hover:bg-gray-100">-</button>
                <span className="px-3 font-bold text-sm">1</span>
                <button className="px-3 hover:bg-gray-100">+</button>
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); addToCart(selectedItem, activeCatalog); }} 
            className="w-full bg-blue-600 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-3"
          >
            <ShoppingCart size={18} />
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  </div>
)}

 {/* agora três secções sequenciais com colapso */}
  <div className="space-y-36">
  {/* — Seção de Produtos Estilo Marketplace — */}
{filteredProducts.length > 0 && (
  <section className="py-12 bg-white">
    <div className="flex items-center justify-between mb-10 border-b border-gray-100 pb-4">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
        Produtos em Destaque
      </h2>
      <div className="flex gap-2">
        <span className="h-1 w-12 bg-blue-600 rounded-full" />
        <span className="h-1 w-4 bg-gray-200 rounded-full" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 8)).map(item => {
        const image = getImageUrl(item.images?.[0] || '', 'products');
        return (
          <div
            key={item._id}
            onClick={() => openItem(item, 'products')}
            className="group bg-white border border-gray-100 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 cursor-pointer flex flex-col"
          >
            {/* Container da Imagem */}
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50 mb-4 flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt={item.name}
                  className="w-4/5 h-4/5 object-contain transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-200" strokeWidth={1} />
                </div>
              )}
              
              {/* Badge de Categoria (Estilo Digitaz) */}
              <div className="absolute top-2 left-2 bg-blue-600 text-[10px] font-bold text-white px-2 py-1 rounded shadow-sm">
                NOVO
              </div>

              {/* Botão de Hover Rápido */}
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                <div className="bg-white text-blue-600 p-3 rounded-full shadow-lg hover:bg-blue-600 hover:text-white transition-colors">
                  <ShoppingCart size={20} />
                </div>
                <div className="bg-white text-gray-600 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors">
                  <Eye size={20} />
                </div>
              </div>
            </div>

            {/* Informações do Produto */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {item.category || 'Eletrônicos'}
              </span>
              
              <h3 className="font-bold text-base text-slate-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
                {item.name}
              </h3>

              {/* Estrelas */}
              <div className="flex text-yellow-400 text-[10px] mb-2">
                ★★★★★ <span className="text-gray-300 ml-1">(5.0)</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex flex-col">
                  <span className="text-blue-600 font-black text-lg">
                    {getItemPrice(item).toLocaleString()} {currency}
                  </span>
                  {/* Preço riscado opcional para parecer promo */}
                  <span className="text-[10px] text-gray-400 line-through">
                    {(getItemPrice(item) * 1.2).toLocaleString()} {currency}
                  </span>
                </div>
                
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <Plus size={18} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Botão Ver Mais Estilizado */}
    {filteredProducts.length > 8 && (
      <div className="mt-16 flex justify-center">
        <button
          onClick={() => setShowAllProducts(p => !p)}
          className="px-10 py-3 border-2 border-gray-100 text-slate-800 font-bold uppercase text-[11px] tracking-widest rounded-full hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all shadow-sm"
        >
          {showAllProducts ? 'Mostrar Menos' : 'Carregar Mais Produtos'}
        </button>
      </div>
    )}
  </section>
)}

 {/* — Seção de Serviços Estilo Banner E-commerce — */}
{filteredServices.length > 0 && (
  <section className="py-16 bg-gray-50/50">
    <div className="flex items-center gap-4 mb-10">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
        Nossos Serviços
      </h2>
      <div className="h-[2px] flex-1 bg-gray-200" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {(showAllServices ? filteredServices : filteredServices.slice(0, 8)).map(item => {
        const image = getImageUrl(item.images?.[0] || '', 'services');
        return (
          <div
            key={item._id}
            onClick={() => openItem(item, 'services')}
            className="group relative flex flex-col cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/10"
          >
            {/* Imagem do Serviço com Overlay Gradiente */}
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-200">
              {image ? (
                <img
                  src={image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Briefcase className="h-12 w-12 text-slate-400" strokeWidth={1} />
                </div>
              )}
              
              {/* Overlay de Gradiente para legibilidade (estilo banners do Digitaz) */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              
              {/* Badge de Preço Flutuante */}
              <div className="absolute bottom-4 left-4">
                <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg">
                  {getItemPrice(item).toLocaleString()} {currency}
                </span>
              </div>
            </div>

            {/* Conteúdo Inferior */}
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                  Service Expert
                </span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                </div>
              </div>

              <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                {item.name}
              </h3>
              
              <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                {item.description || "Soluções personalizadas com garantia de qualidade e suporte especializado."}
              </p>

              <div className="pt-4 flex items-center text-blue-600 text-[11px] font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
                Saber Mais 
                <span className="ml-2">→</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Botão de Expansão Estilo Minimal */}
    {filteredServices.length > 8 && (
      <div className="mt-12 text-center">
        <button
          onClick={() => setShowAllServices(p => !p)}
          className="group inline-flex flex-col items-center gap-2"
        >
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] group-hover:text-blue-600 transition-colors">
            {showAllServices ? 'Recolher' : 'Explorar Todos'}
          </span>
          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full bg-blue-600 transition-all duration-500 ${showAllServices ? 'w-full' : 'w-1/3 group-hover:w-full'}`} />
          </div>
        </button>
      </div>
    )}
  </section>
)}

 {/* — Seção de Pacotes Especiais Estilo Ofertas Digitaz — */}
{filteredBundles.length > 0 && (
  <section className="py-16 bg-white">
    <div className="flex items-center justify-between mb-12">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
          Pacotes Especiais
        </h2>
        <p className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mt-1">
          Combos exclusivos com descontos aplicados
        </p>
      </div>
      <div className="hidden md:block h-[1px] flex-1 mx-10 bg-gray-100" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {(showAllBundles ? filteredBundles : filteredBundles.slice(0, 8)).map(item => {
        const image = getImageUrl(item.image || '', 'bundles');
        const price = getItemPrice(item);
        
        return (
          <div
            key={item._id}
            onClick={() => openItem(item, 'bundles')}
            className="group relative bg-white border-2 border-gray-50 rounded-3xl p-5 transition-all duration-500 hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer"
          >
            {/* Badge de Economia Estilo Digitaz */}
            <div className="absolute top-6 right-6 z-10 bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg animate-bounce">
              SAVE 20%
            </div>

            {/* Container da Imagem com Círculo de Fundo */}
            <div className="relative aspect-square mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 ease-out" />
              
              {image ? (
                <img
                  src={image}
                  alt={item.name}
                  className="relative z-10 w-4/5 h-4/5 object-contain transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3"
                />
              ) : (
                <div className="relative z-10 w-full h-full flex items-center justify-center text-gray-200">
                  <Package className="h-16 w-16" strokeWidth={1} />
                </div>
              )}
            </div>

            {/* Info do Bundle */}
            <div className="space-y-3 text-center">
              <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Combo Sugerido
              </span>
              
              <h3 className="font-extrabold text-xl text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                {item.name}
              </h3>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-blue-600">
                    {price.toLocaleString()} {currency}
                  </span>
                </div>
                {/* Preço de Comparação */}
                <span className="text-xs text-slate-400 line-through font-medium">
                  De {(price * 1.25).toLocaleString()} {currency}
                </span>
              </div>

              {/* Lista de itens no bundle (Pequena) */}
              <div className="pt-4 flex justify-center gap-2">
                {item.items?.slice(0, 3).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-200 group-hover:bg-blue-600 transition-colors" />
                ))}
              </div>
            </div>

            {/* Botão de Ação que aparece no Hover */}
            <div className="mt-6 overflow-hidden h-0 group-hover:h-12 transition-all duration-300">
              <button className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors">
                Ver Detalhes do Combo
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {/* Ver Mais Estilo Digitaz */}
    {filteredBundles.length > 8 && (
      <div className="mt-16 text-center">
        <button
          onClick={() => setShowAllBundles(p => !p)}
          className="relative px-8 py-3 bg-white border border-gray-200 rounded-full text-slate-800 text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
        >
          {showAllBundles ? 'Mostrar Menos' : 'Ver Todos os Pacotes'}
        </button>
      </div>
    )}
  </section>
)}
  </div>
{/* CART DRAWER – Digitaz E-commerce Version */}
<div className={`fixed inset-0 z-[100] pointer-events-none ${isCartOpen ? 'pointer-events-auto' : ''}`}>
  {/* Overlay Suave */}
  <div
    className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsCartOpen(false)}
  />

  <div
    className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-500 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
  >
    {/* Header: Título e Contador */}
    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Seu Carrinho</h2>
        <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{cart.length} Itens selecionados</span>
      </div>
      <button 
        onClick={() => setIsCartOpen(false)} 
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
      >
        <X size={24} />
      </button>
    </div>

    {/* Conteúdo scrollable */}
    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide bg-gray-50/30">
      
      {/* Listagem de Itens */}
      <section>
        {cart.length > 0 ? (
          <div className="space-y-4">
            {cart.map(cartItem => (
              <div key={cartItem.itemId} className="group flex gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-blue-200 transition-all">
                {cartItem.image && (
                  <div className="relative w-20 h-20 overflow-hidden rounded-xl bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center">
                    <img src={getImageUrl(cartItem.image)} alt="" className="w-4/5 h-4/5 object-contain group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">{cartItem.name}</p>
                    <button onClick={() => removeFromCart(cartItem.itemId)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-base font-black text-blue-600">
                      {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] font-bold opacity-70">{currency}</span>
                    </p>

                    {/* Seletor de Qtd Estilo Digitaz */}
                    <div className="flex items-center bg-gray-100 rounded-lg px-1 h-8">
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-1.5 text-slate-500 hover:text-blue-600"><Minus size={12} strokeWidth={3} /></button>
                      <span className="px-2 text-xs font-bold text-slate-700 min-w-[24px] text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-1.5 text-slate-500 hover:text-blue-600"><Plus size={12} strokeWidth={3} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart size={32} className="text-blue-200" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Seu carrinho está <br /> vazio no momento.</p>
            <button onClick={() => setIsCartOpen(false)} className="mt-6 text-blue-600 font-bold text-xs underline uppercase tracking-widest">Voltar às compras</button>
          </div>
        )}
      </section>

      {/* Checkout Form Estilo Moderno */}
      {cart.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados da Entrega</h3>
            <div className="grid grid-cols-1 gap-4">
              <input placeholder="Seu Nome Completo" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all" />
              <input placeholder="E-mail para confirmação" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all" />
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-700 focus:border-blue-500 outline-none transition-all" />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>

    {/* Footer com Resumo de Pagamento */}
    {cart.length > 0 && (
      <div className="bg-white border-t border-gray-100 p-8 space-y-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-medium text-slate-500">
            <span>Subtotal</span>
            <span>{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium text-green-600">
            <span>Desconto</span>
            <span>- 0.00 {currency}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
            <span className="text-base font-bold text-slate-800">Total a Pagar</span>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">
              {totals.grandTotal.toLocaleString()} <span className="text-xs text-blue-600 font-bold">{currency}</span>
            </span>
          </div>
        </div>

        {/* Métodos de Pagamento Estilo E-commerce */}
        <div className="flex gap-2">
            {['mpesa', 'visa', 'cash'].map((m) => (
              <button
                key={m}
                onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                className={`flex-1 py-3 rounded-lg border-2 text-[10px] font-bold uppercase tracking-wider transition-all ${paymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
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
              className="w-full border-2 border-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-600 transition-colors"
            />
            <p className="text-[10px] text-gray-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handlePayment}
            disabled={!paymentMethod || paymentMethod === 'none' || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
            className="w-full py-4 bg-blue-600 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
          >
            Finalizar Compra Agora
          </button>
           <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email}
              className="w-full py-6 bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl transition-all hover:bg-zinc-700 disabled:opacity-30 disabled:grayscale"
            >
              Confirmar Reserva
            </button>
          
          <p className="text-[10px] text-center text-gray-400 font-medium px-4">
            Ao finalizar, você concorda com nossos termos de serviço e políticas de entrega.
          </p>
        </div>
      </div>
    )}
  </div>
</div>

{/* Success Modal - Estilo E-commerce Clean (Digitaz) */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 md:p-14 text-center relative overflow-hidden border border-white"
      onClick={e => e.stopPropagation()}
    >
      {/* Elemento Decorativo Sutil: Círculo de fundo */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-50 rounded-full" />
      
      <div className="relative">
        {/* Ícone de Sucesso Moderno */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-600 rounded-full mb-8 shadow-xl shadow-blue-200">
          <Check className="h-10 w-10 text-white" strokeWidth={4} />
        </div>

        <div className="space-y-4 mb-10">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
            Pedido Realizado
          </span>
          
          <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight uppercase">
            MUITO <br /> <span className="text-blue-600">OBRIGADO!</span>
          </h2>
          
          <div className="w-12 h-1 bg-gray-100 mx-auto my-6 rounded-full" />
          
          <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
            Seu pedido foi processado com sucesso. Você receberá um e-mail de confirmação com todos os detalhes em instantes.
          </p>
        </div>

        {/* Botão de Ação - Estilo Botão Principal Digitaz */}
        <button
          onClick={closeSuccessModal}
          className="group relative w-full py-5 bg-slate-900 overflow-hidden rounded-2xl transition-all hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 active:scale-95 shadow-lg shadow-slate-200"
        >
          <span className="relative z-10 text-xs font-bold uppercase tracking-widest text-white">
            Continuar Comprando
          </span>
        </button>
        
        {/* Order ID Estilizado */}
        <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col items-center gap-2">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
             Código do Pedido
           </p>
           <span className="px-3 py-1 bg-gray-50 rounded font-mono text-sm font-bold text-slate-600">
             #{Math.random().toString(36).substr(2, 6).toUpperCase()}
           </span>
        </div>
      </div>
    </div>
  </div>
)}
<footer className="bg-white border-t border-gray-100 pt-24 pb-12 overflow-hidden relative">
  {/* Elemento Decorativo Sutil: Malha de pontos ou gradiente azul muito leve */}
  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent opacity-10" />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
      
      {/* Coluna 1: Branding e Newsletter */}
      <div className="lg:col-span-4 space-y-8">
        <div className="flex items-center gap-2">
             {/* Logo */}
         <div className="flex items-center">
               {company.logo ? (
                 <img src={API_BS_URL + company.logo} alt={company.name} className="h-5 w-auto" />
               ) : (
                 <span className="font-black text-xl tracking-tighter uppercase italic">{company.name}</span>
               )}
             </div>
        </div>
        
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-medium">
          Sua plataforma líder em soluções tecnológicas e produtos premium. Qualidade garantida com suporte especializado 24/7.
        </p>
        
        {/* Newsletter Compacta */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fique por dentro das ofertas</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Seu e-mail" 
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-all" 
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all">
              Ok
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Links Rápidos */}
      <div className="lg:col-span-2 space-y-6">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-blue-600 w-fit pb-1">Empresa</h4>
        <ul className="space-y-4">
          {['Sobre Nós', 'Carreiras', 'Blog', 'Parceiros'].map(link => (
            <li key={link}>
              <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium">{link}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Ajuda e Suporte */}
      <div className="lg:col-span-3 space-y-6">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-blue-600 w-fit pb-1">Atendimento</h4>
        <ul className="space-y-4">
          <li className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Suporte Técnico</span>
            <a href={`tel:${company.phone}`} className="text-slate-700 font-bold text-base hover:text-blue-600 transition-colors tracking-tight">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Envie um Ticket</span>
            <a href={`mailto:${company.email}`} className="text-slate-700 font-bold text-base hover:text-blue-600 transition-colors tracking-tight break-all">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Social e Pagamentos */}
      <div className="lg:col-span-3 space-y-8">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-blue-600 w-fit pb-1">Social</h4>
        <div className="flex gap-4">
          {['Instagram', 'Facebook', 'LinkedIn'].map((social) => (
            <a 
              key={social} 
              href="#" 
              className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all"
            >
              <span className="sr-only">{social}</span>
              {/* Aqui você pode trocar pelo ícone real do Lucide se preferir */}
              <div className="w-4 h-4 bg-current rounded-sm opacity-60" />
            </a>
          ))}
        </div>
        
        <div className="space-y-4 pt-4">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pagamento Seguro</p>
           <div className="flex flex-wrap gap-2 opacity-60 hover:opacity-100 transition-opacity">
              {['mpesa', 'visa', 'mastercard', 'emola'].map(p => (
                <div key={p} className="h-6 w-10 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-[8px] font-black text-gray-500 uppercase">{p}</div>
              ))}
           </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Clean & Minimal */}
    <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-slate-400">
          © 2026 {company.name}. Todos os direitos reservados.
        </p>
        <p className="text-[9px] text-slate-300 font-medium">
          Criado com foco em performance e experiência do usuário.
        </p>
      </div>
      
      <div className="flex gap-8">
        <a href="#" className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors">Termos de Uso</a>
        <a href="#" className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors">Privacidade</a>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 bg-green-50 rounded-full border border-green-100">
         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
         <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Sistemas Operacionais</span>
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

export default LogisticPortal;