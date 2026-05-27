// src/templates/public-portal/variants/HairStylePortal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText,  Package, Menu, ArrowRight, ArrowLeft, ArrowUpRight, Layers, Settings, Utensils, Briefcase, PhoneCall, Heart, ChevronDown, ShoppingBag, ChevronLeft, ChevronRight, Play,Plus, Trash2,
  CheckCircle, Info, CreditCard, UtensilsCrossed, ShoppingCart, X,
  Search, Calendar, Minus, Check, User2, Eye,
  Zap,
  Linkedin,
  Instagram,
  Facebook
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

interface HairStyleProps {
  company: Company;
  slug: string;
  services: Service[];
  products?: Product[];
  bundles?: Bundle[];
  portalContent?: any;
}

type CatalogType = 'services' | 'products' | 'bundles';

type CartItem = {
  itemId: string;
  type: CatalogType;
  quantity: number;
  name: string;
  price: number;
  image?: string;
  madeToOrder?: boolean;     // ← deve existir
  orderPrice?: number;       // ← deve existir
  deliveryDays?: number;     // ← deve existir
  wantsOrder?: boolean;      // ← já tens
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

const HairStylePortal: React.FC<HairStyleProps> = ({ 
  company, 
  slug, 
  services: initialServices,
  products: initialProducts,
  bundles: initialBundles,
  portalContent = {
    hero: {
      headline: "Tailored Legal Solutions",
      subheadline: "We provide high-end legal advisory for complex corporate and personal matters.",
      backgroundImage: "https://i.pinimg.com/736x/37/d3/ba/37d3ba5ecddf186e08aa89ec0eb596e8.jpg"
    },
    about: {
      enabled: true,
      title: "Helping you to correctly set-up, build, and protect your brand",
      body: "<p>Expert legal services tailored to your needs.</p>",
      image: "https://i1-c.pinimg.com/736x/3d/bb/21/3dbb21d2806caf3f93b04aa6457af482.jpg"
    },
    missionVision: {
      enabled: true,
      mission: { title: "Our Mission", content: "Deliver excellence in legal services" },
      vision: { title: "Our Vision", content: "Lead the legal industry with innovation" },
      values: { title: "Our Values", items: ["Integrity", "Excellence", "Client Focus"] }
    },
    clients: { enabled: true, items: [] },
    testimonials: { enabled: true, items: [] }
  },
}) => {
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
   const handler = setTimeout(async () => {
  try {
    await api.public.logSearch(slug, { term: searchTerm, catalog: 'all' });
    console.log(`✅ Pesquisa registrada: "${searchTerm}"`);
  } catch (err) {
    console.error('❌ Falha ao registrar busca:', err);
  }
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

 useEffect(() => {
  console.log("Company data received:", {
    hasBankAccounts: !!company?.bankAccounts?.length,
    hasMobileWallets: !!company?.mobileWallets,
    bankAccounts: company?.bankAccounts,
    mobileWallets: company?.mobileWallets
  });
}, [company]);

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);


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
  const [paymentMethod, setPaymentMethod] = useState<'mpesa'|'emola'|'visa'|'transfer'|'cash'|'none'>('none');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [showAwaitingConfirmation, setShowAwaitingConfirmation] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState<string>('');
  const [pollStatus, setPollStatus] = useState<'waiting'|'confirmed'|'failed'>('waiting');
  const [pollAttempts, setPollAttempts] = useState(0);
const [visibleServices, setVisibleServices] = useState(3);
const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const currency = company.currency || 'MT';

    // ------------ alterações -------------
  // controla o “ver mais” de cada secção
  const [showAllProducts, setShowAllProducts] = useState(false);


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
      console.log("Produtos vindos da API:", results[1]);
      // LOGS DE DEPURAÇÃO
      console.log("--- Resposta Bruta da API ---");
      console.log("Serviços:", results[0]);
      console.log("Produtos:", results[1]);
      console.log("Bundles (Combos/Subs):", results[2]);
      
      // Verifica se os campos esperados existem dentro do primeiro bundle (se houver)
      if (results[2] && results[2].length > 0) {
        console.log("Estrutura do primeiro Bundle:", results[2][0]);
        console.log("Itens populados?", results[2][0].items);
      }

      if (!initialServices?.length && results[0]) setServices(results[0]);
      if (!initialProducts?.length && results[1]) setProducts(results[1]);
      if (!initialBundles?.length && results[2]) setBundles(results[2]);
      
    } catch (err) {
      console.error('Erro detalhado ao carregar catálogo:', err);
    }
  };
  loadCatalog();
}, []);
  // Reset carousel index whenever a new item is selected
  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedItem]);

 const total = useMemo(() => {
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculamos quanto custa apenas as taxas de encomenda (se houver)
  const orderFeesTotal = cart.reduce((acc, item) => {
    if (item.wantsOrder && item.orderPrice) {
      return acc + (Number(item.orderPrice) * item.quantity);
    }
    return acc;
  }, 0);

  // Se houver qualquer item com taxa de encomenda ativa, o Grand Total vira apenas o valor das taxas
  // Caso contrário, é o subtotal normal.
  const isPayingFees = cart.some(item => item.wantsOrder && Number(item.orderPrice) > 0);
  const grandTotal = isPayingFees ? orderFeesTotal : subtotal;

  return { subtotal, orderFeesTotal, grandTotal, isPayingFees };
}, [cart]);



  // Image helper (products & bundles have real images, services use placeholder – add image field to Service later)
  const getItemImage = (item: any, type: CatalogType): string | undefined => {
    // Products and bundles keep previous logic. For services, prefer real images from DB if available.
    if (type === 'products' && item.images?.length > 0) return getImageUrl(item.images[0]);
    if (type === 'bundles' && item.image) return getImageUrl(item.image);
    if (type === 'services' && item.images?.length > 0) return getImageUrl(item.images[0]);
    return undefined;
  };

  const getItemPrice = (item: any): number => {
  if (!item) return 0;

  const price = 
    item.billingPricePerCycle ?? 
    item.basePrice ?? 
    item.price ?? 
    0;

  // Debug opcional (remove depois de testar)
  // console.log(`getItemPrice for "${item.name}" (type: ${item.type || 'unknown'}):`, price);

  return Number(price);
};

  function getItemDescription(item: any): string {
    return 'shortDescription' in item ? (item as any).shortDescription || '' :
      ('description' in item ? (item as any).description || '' : '');
  }

  // Cart actions
const addToCart = (item: any, type: CatalogType) => {
  // Proteção contra stock zero (exceto madeToOrder)
  if (item.stockQuantity <= 0 && !item.madeToOrder) {
    toast.error(`Produto ${item.name} sem stock disponível`);
    return;
  }

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
      image: getItemImage(item, type),

      // === CAMPOS CRUCIAIS PARA MADE TO ORDER ===
      madeToOrder: item.madeToOrder, 
    orderPrice: item.orderPrice,
    deliveryDays: item.deliveryDays,
      wantsOrder: false,                          // começa desmarcado
    }]);
  }

  toast.success(`${item.name} adicionado ao carrinho`, { position: 'top-center' });
};

   const hasOrderWithPrice = cart.some(item => 
  item.wantsOrder === true && Number(item.orderPrice || 0) > 0
);

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
            isMadeToOrder: cartItem.wantsOrder,
            priceAtOrder: cartItem.price,
            feePaid: cartItem.wantsOrder ? cartItem.orderPrice : 0,
            quantity: cartItem.quantity
          })),
          paymentMethod,
          totalAmount: total.subtotal,
          amountPaid: total.isPayingFees ? total.orderFeesTotal : 0,
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
useEffect(() => {
  if (selectedItem?.items) {
    console.log("ESTRUTURA FINAL NO FRONTEND:", JSON.stringify(selectedItem.items, null, 2));
  }
}, [selectedItem]);
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
const latestProducts = [...(products || [])].reverse().slice(0, 2);
  return (
    <div className="min-h-screen bg-white/5 text-slate-900 font-sans">
      {/* Modern Navbar */}
  
{/* Header Estilo Premium Salon */}
<div className="font-sans text-[#2C2C2C] bg-[#FDFBF9] selection:bg-white/30 min-h-screen">
            {/* 1. HEADER REFEITO COM PESQUISA INTEGRADA E CARRINHO */}
{/* Estética Hairstyle Saloon Premium — Inspirada em Editorial de Beleza */}


  {/* 1. TOP BANNER MINIMALISTA */}
  <div className="bg-[#1a1a1a] text-white py-2.5 text-center">
    <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
      Book your exclusive transformation — Maputo & Vilanculos
    </p>
  </div>

  {/* 2. MAIN HEADER — Luxo Minimalista */}
<header className="bg-white/80 backdrop-blur-md py-6 sticky top-0 z-50 border-b border-[#F1EBE5]">
  <div className="max-w-7xl mx-auto px-8 grid grid-cols-3 items-center relative">
    
    {/* Logo: Brendkit Style */}
    <div className={`flex items-center transition-opacity duration-500 ${isSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-7 w-auto" />
      ) : (
        <span className="font-serif text-2xl tracking-tighter text-black uppercase font-black">
          {company.name || "Éclat"} <span className="text-stone-300">Studio</span>
        </span>
      )}
    </div>

    {/* Navegação Central: Visível apenas quando search está fechado */}
    <nav className={`hidden md:flex items-center justify-center gap-8 transition-all duration-500 ${isSearchOpen ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
      {['Cabelo', 'Rosto', 'Noivas', 'Serviços'].map((item) => (
        <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600 hover:text-black transition-colors relative group">
          {item}
          <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full" />
        </a>
      ))}
    </nav>

    {/* INPUT DE BUSCA EXPANSÍVEL — Estilo Boutique */}
    <div className={`absolute inset-x-8 flex items-center justify-center transition-all duration-700 ease-in-out ${isSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="w-full max-w-2xl relative flex items-center">
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="O que você deseja encontrar hoje?..."
          className="w-full bg-transparent border-b border-stone-200 py-2 px-4 text-sm font-serif italic text-stone-900 focus:border-stone-900 outline-none transition-colors placeholder:text-stone-200"
          autoFocus={isSearchOpen}
        />
        <button 
          onClick={() => {setIsSearchOpen(false); setSearchTerm("");}}
          className="absolute right-0 p-2 text-stone-400 hover:text-black transition-colors"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>

    {/* Ações Direita */}
    <div className="flex items-center justify-end gap-6">
      <button 
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className={`text-stone-800 transition-all duration-500 ${isSearchOpen ? 'rotate-90 text-orange-400' : 'hover:scale-110'}`}
      >
        {isSearchOpen ? <X size={19} strokeWidth={1.2} /> : <Search size={19} strokeWidth={1.2} />}
      </button>
      
      {/* Wallet/Cart Modal Access */}
      <button 
        onClick={() => setIsCartOpen(true)} 
        className={`relative text-stone-800 group transition-all ${isSearchOpen ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
      >
        <ShoppingBag size={19} strokeWidth={1.2} />
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-black text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-in zoom-in">
            {cart.length}
          </span>
        )}
      </button>

      <button className={`hidden sm:block px-6 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-stone-800 transition-all ${isSearchOpen ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        Book Now
      </button>
    </div>
  </div>
</header>

{/* 3. HERO SECTION — Viewport Fit Aesthetic */}
<section className="bg-[#FDFBF9] h-[calc(100vh-80px)] min-h-[600px] flex items-center overflow-hidden relative py-4">
  <div className="max-w-[1400px] mx-auto px-6 w-full h-full flex flex-col justify-between">
    
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 items-center flex-grow">
      
      {/* 1. Imagem Lateral Esquerda (Ajustada para VH) */}
      <div className="hidden lg:block lg:col-span-3 self-end mb-8">
        <div className="relative group">
          <div className="h-[35vh] aspect-[3/4] rounded-t-full overflow-hidden border border-stone-100 shadow-sm mx-auto">
            <img 
              src={latestProducts[1]?.image ? getImageUrl(latestProducts[1].image) : "https://i.pinimg.com/736x/98/97/f6/9897f6737ffca2fd39e8185adb1b4b6e.jpg"} 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
              alt="Secondary Preview" 
            />
          </div>
          <div className="absolute top-4 left-[-10px] text-[40px] font-serif text-stone-200/50 select-none">01</div>
        </div>
      </div>

      {/* 2. HERO MAIN IMAGE (Centralizada no Viewport) */}
      <div className="lg:col-span-6 flex flex-col items-center relative h-full justify-center">
        {/* Título com Z-Index e Fit de Texto */}
        <div className="text-center mb-6 z-10 lg:absolute lg:top-[2%] lg:left-[-40%] lg:text-left lg:max-w-xl">
          <span className="text-[9px] uppercase tracking-[0.5em] text-orange-400 font-black block mb-4">
          {portalContent?.hero?.tagline || "Exclusive Artistry"}
        </span>
           <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[0.9] text-stone-900 tracking-tighter">
            {portalContent?.hero?.headline ? (
              // Se houver título no DB, renderizamos
              <span dangerouslySetInnerHTML={{ __html: portalContent?.hero?.headline }} />
            ) : (
              // Fallback Estruturado (O design original)
              <>
                Enhancing your <br />
                <span className="italic font-light text-stone-400">beauty to let</span> <br />
                you shine
              </>
            )}
          </h1>
        </div>

        {/* Arco Central (Escalado por VH) */}
        <div className="h-[55vh] aspect-[3/4.2] rounded-t-full overflow-hidden shadow-2xl relative z-0 border-[10px] border-white">
          <img 
            src={getImageUrl(portalContent?.hero?.backgroundImage) || "https://i1-c.pinimg.com/1200x/db/1b/2b/db1b2bac8f83349733108cc34a4b407c.jpg"} 
            className="w-full h-full object-cover" 
            alt="Main Hair Transformation" 
          />
        </div>

        {/* Badge Circular Reduzida */}
        <div className="absolute bottom-[-20px] z-20 hidden lg:block">
           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-stone-100 animate-spin-slow">
              <div className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter text-center p-2 leading-none">
                Beauty Salon <br/> • Studio •
              </div>
              <div className="absolute text-stone-300 bottom-2">↓</div>
           </div>
        </div>
      </div>

      {/* 3. Imagem Lateral Direita + Story */}
      <div className="lg:col-span-3 flex flex-col gap-6 self-start pt-10">
        <div className="h-[30vh] aspect-[3/4] rounded-t-full overflow-hidden border border-stone-100 shadow-sm relative mx-auto">
           <img 
             src={latestProducts[0]?.image ? getImageUrl(latestProducts[0].image) : "https://i1-c.pinimg.com/736x/85/0e/89/850e8969446a1494593a7445f5c6e4c0.jpg"} 
             className="w-full h-full object-cover" 
             alt="Newest Arrival" 
           />
           <div className="absolute top-3 right-3 text-orange-200 animate-pulse text-xs">✦</div>
        </div>

        <div className="space-y-2 px-4 max-w-[220px] mx-auto lg:mx-0">
          <h3 className="font-serif text-xl text-stone-900 italic">Our Story</h3>
          <p className="text-stone-400 text-[10px] leading-relaxed">
            {portalContent?.hero?.subheadline || "Bringing out the best version of you with personalized hair artistry."}
            
          </p>
          <button className="group flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-black">
            
            Read More <span className="group-hover:translate-x-1 transition-transform">↗</span>
          </button>
        </div>
      </div>
    </div>

    {/* 4. Barra de Estatísticas Compacta (Fit na Base) */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-t border-stone-100 bg-white/40 backdrop-blur-sm rounded-[2.5rem] px-8 mb-2">
      {[
        { val: "15+", lab: "Happy Clients" },
        { val: "10+", lab: "Premium Products" },
        { val: "15+", lab: "Beauty Experts" },
        { val: "10+", lab: "Years Experience" }
      ].map((stat, i) => (
        <div key={i} className="text-center lg:text-left flex items-center gap-3 justify-center lg:justify-start">
          <div className="text-2xl font-serif text-stone-900 leading-none">{stat.val}</div>
          <div className="text-[8px] uppercase tracking-widest text-stone-400 font-bold leading-tight max-w-[60px]">{stat.lab}</div>
        </div>
      ))}
    </div>
  </div>
</section>


{/* === SEÇÕES DINÂMICAS DO PORTAL CONTENT === */}

{/* About Section – Estética Editorial & Organic Arches */}
{portalContent?.about?.enabled && (
  <section id="about" className="py-32 bg-[#FDFBF9] overflow-hidden">
    <div className="max-w-7xl mx-auto px-8">
      
      {/* Composição de Título Centralizada com Arcos Laterais */}
      <div className="relative mb-24">
       <div className="text-center max-w-4xl mx-auto relative z-10">
  {/* Tag Dinâmica (Pode ser uma categoria ou título curto) */}
  <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-6 block">
    {portalContent.about.tagline || "Our Philosophy"}
  </span>

        {/* Título Principal Dinâmico */}
        {/* Nota: Para manter o efeito 'art of' em itálico, o usuário pode enviar via HTML no campo title */}
        <h2 
          className="font-serif text-5xl md:text-7xl leading-[1] text-stone-900 tracking-tighter mb-10"
          dangerouslySetInnerHTML={{ 
            __html: portalContent.about.title || 'Crafting the <span class="italic font-light text-stone-400">art of</span> personal transformation' 
          }} 
        />

        {/* Corpo de Texto Dinâmico */}
        <div 
          className="text-stone-500 text-sm md:text-base leading-relaxed max-w-2xl mx-auto font-light" 
          dangerouslySetInnerHTML={{ 
            __html: portalContent.about.body || 'At our studio, we blend traditional techniques with modern artistry to reveal your most radiant self.' 
          }} 
        />
      </div>

        {/* Elementos Decorativos Flutuantes */}
        <div className="absolute top-0 left-0 text-orange-200/40 text-6xl animate-pulse hidden lg:block select-none">✦</div>
        <div className="absolute bottom-0 right-10 text-orange-200/40 text-4xl hidden lg:block select-none">✦</div>
      </div>

      {/* Grid Artístico de Imagens (Substituindo os Contadores Rígidos) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Bloco 1: O "Story" com imagem em Arco */}
        <div className="md:col-span-4 self-end">
          <div className="aspect-[3/4] rounded-t-full overflow-hidden border-[8px] border-white shadow-xl relative group">
            <img 
              src={getImageUrl(portalContent.about.image) || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80"} 
              alt="Artistic Detail" 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors" />
          </div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">
            Meticulous Detail
          </p>
        </div>

        {/* Bloco 2: Imagem Principal Central (Destaque) */}
        <div className="md:col-span-5 px-4">
          <div className="relative">
            <div className="aspect-[4/5] rounded-t-full overflow-hidden shadow-2xl border-[12px] border-white z-10 relative">
              <img 
                src="https://i1-c.pinimg.com/1200x/27/5f/29/275f296f030f34ab1b08e1dea89379c4.jpg" 
                alt="Main Transformation" 
                className="w-full h-full object-cover" 
              />
            </div>
            {/* Badge Flutuante (Estilo Selo de Qualidade) */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border border-stone-50 z-20 animate-spin-slow p-4">
              <div className="text-[7px] font-black uppercase tracking-tighter text-center leading-tight">
                Premium Selection <br/> • High Standards • <br/> Est. 2026
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Info Cards Minimalistas (Stats Revisitados) */}
        <div className="md:col-span-3 space-y-6">
          {[
            { label: "Expertise", value: "Premium", desc: "Top-tier professionals in Maputo" },
            { label: "Experience", value: "10+ Yrs", desc: "Dedicated to local urban markets" },
            { label: "Satisfaction", value: "98%", desc: "Consistently exceeding client expectations" }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-stone-100 hover:border-orange-100 transition-all group">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-400 block mb-2">{stat.label}</span>
              <div className="text-2xl font-serif text-stone-900 mb-2">{stat.value}</div>
              <p className="text-[10px] text-stone-400 leading-relaxed font-light">{stat.desc}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Botão de Ação Minimalista Final */}
      <div className="mt-20 flex justify-center">
        <button className="group flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center group-hover:bg-black group-hover:border-black transition-all duration-500">
            <span className="text-black group-hover:text-white transition-colors">↗</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-900">
            Discover Our Story
          </span>
        </button>
      </div>

    </div>
  </section>
)}


 {/* agora três secções sequenciais com colapso */}
  <div className="">
{/* Section: Practice Areas & Services — Editorial Gallery Aesthetic */}
{filteredServices.length > 0 && (
  <section id="services" className="py-32 bg-[#FDFBF9]">
    <div className="max-w-7xl mx-auto px-8 md:px-12">
      
      {/* Cabeçalho Editorial — Dinâmico & Luxo */}
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-24 gap-12">
        <div className="max-w-3xl">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-6 block">
            {portalContent.services?.tagline || "Expertise & Curation"}
          </span>
          <h2 
            className="font-serif text-5xl md:text-7xl tracking-tighter text-stone-900 leading-[0.9]"
            dangerouslySetInnerHTML={{ 
              __html: portalContent.services?.title || 'Our Practice <br /> <span class="italic font-light text-stone-300">& Services</span>' 
            }}
          />
        </div>
        <div className="max-w-xs md:text-right">
          <p className="text-stone-400 text-[11px] leading-relaxed font-light italic">
            {portalContent.services?.description || "Providing high-level artistry and meticulous care tailored for the sophisticated urban market."}
          </p>
        </div>
      </div>

      {/* Grid de Serviços — Organic Arch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-20">
  {filteredServices.slice(0, visibleServices).map((item, index) => {
    // Debug: verificar estrutura do item
    const imageUrl = item.images?.length > 0 
      ? getImageUrl(item.images[0]) 
      : item.image 
        ? getImageUrl(item.image)
        : null;
    
    console.log(`Service "${item.name}":`, { images: item.images, image: item.image, imageUrl });
    
    return (
      <div
        key={item._id}
        onClick={() => openItem(item, 'services')}
        className={`group cursor-pointer transition-all duration-1000 ${
          index % 2 !== 0 ? 'lg:translate-y-16' : ''
        }`}
      >
        {/* Máscara de Arco Orgânica */}
        <div className="relative aspect-[3/4.5] rounded-t-full overflow-hidden mb-8 border-[8px] border-white shadow-sm group-hover:shadow-2xl group-hover:border-stone-50 transition-all duration-700">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={item.name}
              className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-[#f1ebe5] flex items-center justify-center">
              <span className="text-[10px] text-stone-300 font-light italic">Sem imagem</span>
            </div>
          )}
          
          {/* Overlay de Brilho Suave */}
          <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-all" />
          
          {/* Star Decor */}
          <div className="absolute top-6 right-6 text-orange-200/60 opacity-0 group-hover:opacity-100 transition-opacity">✦</div>
        </div>

        {/* Conteúdo Editorial sob a imagem */}
        <div className="px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-[1px] w-4 bg-stone-200" />
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-orange-400">
              {item.category || "Hair Artistry"}
            </span>
            <span className="h-[1px] w-4 bg-stone-200" />
          </div>
          
          <h3 className="font-serif text-2xl text-stone-900 mb-3 group-hover:italic transition-all">
            {item.name}
          </h3>
          
          <p className="text-stone-400 text-[10px] leading-relaxed line-clamp-2 font-light italic mb-6">
            {item.description}
          </p>

          <div className="inline-flex items-center gap-3 group-hover:gap-5 transition-all text-[9px] font-black uppercase tracking-[0.4em] text-stone-900">
            Explore Service
            <div className="w-8 h-8 rounded-full border border-stone-100 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all">
              <ArrowRight size={12} strokeWidth={1} />
            </div>
          </div>
        </div>
      </div>
    );
  })}
</div>

      {/* Load More — Editorial Stylized */}
      {visibleServices < filteredServices.length && (
        <div className="mt-40 flex flex-col items-center">
          <div className="text-[10px] text-stone-300 uppercase tracking-[1em] mb-10 ml-[1em]">
            More Elegance
          </div>
          <button 
            onClick={() => setVisibleServices(prev => prev + 3)}
            className="group relative flex items-center justify-center"
          >
            <div className="w-24 h-24 rounded-full border border-stone-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Plus size={20} strokeWidth={1} className="text-stone-300" />
            </div>
            {/* Spinning Text Effect (Opcional, inspirado no selo central) */}
            <div className="absolute inset-0 animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity">
               <svg viewBox="0 0 100 100" className="w-full h-full">
                 <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
                 <text className="text-[8px] uppercase tracking-widest font-bold fill-stone-900">
                   <textPath href="#circlePath">Discover More Expertise Discover More •</textPath>
                 </text>
               </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  </section>
)}
{/* Missão, Visão e Valores – Alinhamento Editorial Premium */}
{portalContent?.missionVision?.enabled && (
  <section className="py-32 bg-[#FDFBF9] text-stone-900 overflow-hidden relative">
    
    <div className="max-w-[1400px] mx-auto px-6">
      
      {/* Título de Suporte com Estética de Revista */}
      <div className="flex flex-col items-center text-center mb-24">
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-6 block">
          {portalContent?.missionVision?.tagline || "Core Principles"}
        </span>
        <h2 className="font-serif text-5xl md:text-7xl leading-[0.9] tracking-tighter text-stone-900">
          Our Purpose <span className="italic font-light text-stone-300">& Commitment</span>
        </h2>
      </div>

      {/* Grid Assimétrico: Imagem em Arco + Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Lado Esquerdo: Imagem Editorial com Máscara de Arco */}
        <div className="lg:col-span-5 relative order-2 lg:order-1">
          <div className="aspect-[3/4.5] rounded-t-full overflow-hidden border-[12px] border-white shadow-2xl relative z-10">
            <img 
              src="https://i.pinimg.com/736x/51/e5/47/51e5477eeb6473a0ad9b73f1eb19c603.jpg" 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
              alt="Atmosphere" 
            />
          </div>
          {/* Detalhe Decorativo Flutuante */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-50 rounded-full -z-0 blur-3xl opacity-50" />
          <div className="absolute top-10 left-[-20px] text-orange-200 text-6xl animate-pulse">✦</div>
        </div>

        {/* Lado Direito: Info Stack Dinâmico */}
        <div className="lg:col-span-7 space-y-16 order-1 lg:order-2">
          
          {/* Missão & Visão (Lado a Lado ou Empilhados) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="group">
              <div className="flex items-center gap-4 mb-6">
                <span className="font-serif italic text-2xl text-stone-300 group-hover:text-orange-400 transition-colors">01.</span>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-900">
                  {portalContent?.missionVision?.mission?.title || "Mission"}
                </h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed font-light italic pl-10 border-l border-stone-100">
                {portalContent?.missionVision?.mission?.content}
              </p>
            </div>

            <div className="group">
              <div className="flex items-center gap-4 mb-6">
                <span className="font-serif italic text-2xl text-stone-300 group-hover:text-orange-400 transition-colors">02.</span>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-900">
                  {portalContent?.missionVision?.vision?.title || "Vision"}
                </h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed font-light italic pl-10 border-l border-stone-100">
                {portalContent?.missionVision?.vision?.content}
              </p>
            </div>
          </div>

          {/* Valores - Card Elegante e Dinâmico */}
          <div className="bg-white p-12 rounded-[3.5rem] border border-stone-100 shadow-sm relative overflow-hidden group">
            <h3 className="font-serif text-3xl text-stone-900 italic mb-10">
              {portalContent?.missionVision?.values?.title || "Our Values"}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {(portalContent?.missionVision?.values?.items?.length > 0 
                ? portalContent.missionVision.values.items 
                : ["Integrity", "Innovation", "Precision", "Success"]
              ).map((v, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest opacity-50">#{i + 1}</span>
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-tighter">{v}</span>
                </div>
              ))}
            </div>

            {/* Marca d'água elegante */}
            <div className="absolute bottom-[-20px] right-4 text-stone-50 text-8xl font-serif italic select-none -z-0 group-hover:text-orange-50 transition-colors">
              Core
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>
)}
{/* — Seção de Produtos/Soluções: Boutique Showcase — */}
{filteredProducts.length > 0 && (
  <section className="py-32 bg-white text-stone-900 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Header Estilo Editorial */}
      <div className="mb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-baseline">
        <div className="lg:col-span-8">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 block mb-6">
            {portalContent.products?.tagline || "Curated Selection"}
          </span>
          <h2 className="font-serif text-5xl md:text-7xl tracking-tighter leading-[0.9] text-stone-900">
            {portalContent.products?.title || "Featured"} <br /> 
            <span className="italic font-light text-stone-300">Beauty Essentials</span>
          </h2>
        </div>
        <div className="lg:col-span-4">
          <p className="text-stone-400 text-[11px] leading-relaxed font-light italic border-l-2 border-stone-50 pl-8">
            {portalContent.products?.description || "High-performance products curated for your personal transformation ritual."}
          </p>
        </div>
      </div>

      {/* Grid de Produtos com Arcos Assimétricos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 3)).map((item, index) => {
          const imageUrl = getImageUrl(Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.image);

          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className="group flex flex-col cursor-pointer"
            >
              {/* Moldura de Produto em Arco */}
              <div className="relative aspect-[3/4] rounded-t-full overflow-hidden bg-[#FDFBF9] mb-8 transition-all duration-700 group-hover:shadow-2xl">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <Package size={48} strokeWidth={1} />
                  </div>
                )}
                
                {/* Preço Flutuante Minimalista */}
                <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
                   <span className="text-xs font-bold tracking-tighter text-stone-900">
                     {getItemPrice(item).toLocaleString()} <span className="text-[9px] text-stone-400 ml-0.5">{currency}</span>
                   </span>
                </div>

                {/* Badge de Categoria */}
                <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] bg-stone-900 text-white px-3 py-1.5 rounded-full">
                    {item.category || 'Essential'}
                  </span>
                </div>
              </div>

              {/* Detalhes do Produto - Centralizados Style Boutique */}
              <div className="text-center px-4">
                <h3 className="font-serif text-2xl text-stone-900 mb-3 group-hover:text-orange-400 transition-colors duration-500">
                  {item.name}
                </h3>
                
                <p className="text-[10px] text-stone-400 leading-relaxed font-light italic mb-6 line-clamp-2">
                  {item.description}
                </p>

                {/* Action CTA */}
                <div className="inline-flex items-center gap-4 py-2 border-b border-stone-100 group-hover:border-stone-900 transition-all duration-500">
                   <span className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-900">
                     View Details
                   </span>
                   <ArrowUpRight size={12} className="text-stone-300 group-hover:text-stone-900 transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão de Expansão Estilo Boutique */}
      {filteredProducts.length > 3 && (
        <div className="mt-40 flex justify-center">
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="group flex flex-col items-center gap-6"
          >
            <div className="w-14 h-14 rounded-full border border-stone-100 flex items-center justify-center group-hover:bg-stone-900 transition-all duration-500">
              <ChevronDown className={`w-5 h-5 text-stone-300 group-hover:text-white transition-all duration-500 ${showAllProducts ? 'rotate-180' : ''}`} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-stone-900">
              {showAllProducts ? 'See Less' : 'View Full Collection'}
            </span>
          </button>
        </div>
      )}
    </div>
  </section>
)}



{/* ── Seção: Beauty Bundles (Editorial Suite) ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-32 bg-[#FDFBF9] relative overflow-hidden border-t border-stone-50">
    <div className="max-w-[1400px] mx-auto px-8 relative z-10">
      
      {/* Cabeçalho Editorial Estilizado */}
      <div className="mb-24 flex flex-col md:flex-row justify-between items-end gap-10">
        <div className="max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-6 block">
            Exclusive Rituals
          </span>
          <h2 className="font-serif text-5xl md:text-7xl text-stone-900 tracking-tighter leading-[0.9]">
            The <span className="italic font-light text-stone-300">Complete</span> <br /> 
            Experience
          </h2>
        </div>
        <div className="text-stone-400 text-[11px] leading-relaxed font-light italic max-w-[240px] md:text-right border-r-2 md:border-r-0 md:border-l-2 border-orange-100 pr-6 md:pr-0 md:pl-6">
          Curated combinations of our finest services, designed for those who seek the pinnacle of personal care.
        </div>
      </div>

      {/* Horizontal Scroll com Snap Artístico */}
      <div className="flex gap-10 overflow-x-auto pb-20 scrollbar-hide snap-x px-4">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map((item, index) => {
            const image = getImageUrl(item.image || '');
            
            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className="group relative min-w-[320px] md:min-w-[850px] snap-center cursor-pointer"
              >
                {/* Container Principal Estilo "Open Magazine" */}
                <div className="bg-white rounded-[4rem] p-4 md:p-12 flex flex-col md:flex-row gap-12 items-center transition-all duration-700 hover:shadow-[0_60px_100px_-30px_rgba(0,0,0,0.05)] border border-stone-50">
                  
                  {/* Lado Esquerdo: Imagem com Arco Orgânico */}
                  <div className="w-full md:w-[45%] aspect-[4/5] rounded-t-full overflow-hidden border-[10px] border-[#FDFBF9] shrink-0 relative">
                    <img 
                      src={image} 
                      alt={item.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" 
                    />
                    <div className="absolute top-6 left-6 text-white text-3xl opacity-40 group-hover:opacity-100 transition-opacity">✦</div>
                  </div>

                  {/* Lado Direito: Conteúdo Narrativo */}
                  <div className="flex-1 flex flex-col justify-between py-4">
                    <div>
                      <div className="flex justify-between items-start mb-8">
                        <span className="font-serif italic text-3xl text-stone-200">
                          Bundle {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>
                        <div className="w-12 h-12 rounded-full border border-stone-50 flex items-center justify-center text-stone-200 group-hover:bg-stone-900 group-hover:text-white transition-all">
                          <Layers size={18} strokeWidth={1} />
                        </div>
                      </div>
                      
                      <h3 className="font-serif text-3xl md:text-5xl text-stone-900 mb-6 tracking-tighter">
                        {item.name}
                      </h3>
                      
                      <p className="text-stone-400 text-sm leading-relaxed font-light italic mb-8 line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                    
                    {/* Footer: Valor e Ação */}
                    <div className="pt-10 border-t border-stone-50 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-[0.3em] mb-2">Investment</span>
                        <span className="text-3xl font-serif text-stone-900 tracking-tighter">
                          {getItemPrice(item).toLocaleString()} <span className="text-xs text-stone-300 font-light italic">{currency}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] font-black text-stone-900 uppercase tracking-[0.4em] pb-2 border-b border-stone-200 group-hover:border-stone-900 transition-all">
                        Reserve Ritual <ArrowUpRight size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge Flutuante Rotativa (Estilo Selo de Qualidade) */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-400 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-700 rotate-12 group-hover:rotate-0">
                   <div className="text-[8px] font-black text-white text-center leading-tight uppercase tracking-tighter">
                     Limited<br/>Selection<br/>✦
                   </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Progress Line Minimalista */}
      <div className="max-w-[240px] mx-auto h-[1px] bg-stone-100 relative">
        <div className="absolute inset-y-0 left-0 bg-stone-900 w-1/3 rounded-full transition-all duration-700" />
      </div>
    </div>
  </section>
)}

{/* ── Seção: Beauty Subscriptions (Membership Levels) ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-32 bg-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Cabeçalho Editorial Centrado */}
      <div className="flex flex-col items-center text-center mb-24">
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-6 block">
          Membership & Rituals
        </span>
        <h2 className="font-serif text-5xl md:text-7xl text-stone-900 tracking-tighter leading-none mb-12">
          Exclusive <span className="italic font-light text-stone-300">Retainers</span>
        </h2>
        
        {/* Toggle UI - Estilo Pílula Minimalista */}
        <div className="inline-flex items-center p-1.5 bg-[#FDFBF9] border border-stone-100 rounded-full">
          <button className="px-10 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-all">Monthly</button>
          <button className="px-10 py-3 text-[9px] font-black uppercase tracking-[0.2em] bg-stone-900 text-white rounded-full shadow-lg">Annual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-stretch">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis') || plan.name.toLowerCase().includes('gold') || plan.name.toLowerCase().includes('premium');

          return (
            <div 
              key={plan._id} 
              className={`relative p-14 rounded-[4rem] transition-all duration-1000 flex flex-col group
                ${isPopular 
                  ? 'bg-stone-900 text-white shadow-2xl scale-105 z-10' 
                  : 'bg-[#FDFBF9] border border-stone-50 text-stone-900 hover:shadow-xl'}`}
            >
              {isPopular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-400 text-[8px] font-black uppercase tracking-[0.4em] px-8 py-3 rounded-full text-white shadow-xl whitespace-nowrap">
                  Recommended Choice ✦
                </div>
              )}

              <div className="mb-12 text-center">
                <h3 className={`font-serif text-3xl italic mb-4 ${isPopular ? 'text-white' : 'text-stone-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-[11px] leading-relaxed font-light italic h-12 line-clamp-2 ${isPopular ? 'text-stone-400' : 'text-stone-500'}`}>
                  {plan.description || "A dedicated path for consistent beauty and wellness maintenance."}
                </p>
              </div>
              
              <div className="mb-14 pt-10 border-t border-stone-200/10 text-center">
                <div className="flex flex-col items-center">
                  <span className="font-serif text-6xl tracking-tighter mb-2">
                    {getItemPrice(plan) === 0 ? 'Comp' : `${getItemPrice(plan).toLocaleString()}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isPopular ? 'text-orange-400' : 'text-stone-300'}`}>
                       {currency}
                    </span>
                    <span className="text-[10px] font-light italic opacity-50">
                       / {plan.billingCycle === 'Mensal' ? 'month' : 'period'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Benefícios - Tipografia de Luxo */}
              <ul className="space-y-6 mb-16 flex-1">
                {plan.includedLimits?.map((limit: any, i: number) => (
                  <li key={i} className="flex items-center gap-4 text-[11px] font-light">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPopular ? 'bg-orange-400' : 'bg-stone-200'}`} />
                    <span className={isPopular ? 'text-stone-300' : 'text-stone-600'}>
                      {limit.description}: <span className={`font-bold italic ${isPopular ? 'text-white' : 'text-stone-900'}`}>{limit.maxValue} {limit.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-6">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-6 rounded-full font-black text-[9px] uppercase tracking-[0.5em] transition-all active:scale-95
                    ${isPopular 
                      ? 'bg-orange-400 text-white hover:bg-white hover:text-stone-900' 
                      : 'bg-stone-900 text-white hover:bg-orange-400'}`}
                >
                  {plan.price === 0 ? 'Inquire Now' : 'Join Membership'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className={`w-full text-[8px] font-bold uppercase tracking-[0.3em] transition-all
                    ${isPopular ? 'text-stone-500 hover:text-white' : 'text-stone-300 hover:text-stone-900'}`}
                >
                  Membership Details & Policy
                </button>
              </div>

              {/* Estrela decorativa de fundo no card popular */}
              {isPopular && (
                <div className="absolute bottom-10 right-10 text-white/[0.03] text-9xl font-serif italic pointer-events-none">
                  ✦
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </section>
)}
  </div>
{/* ── Seção: Clientes & Parceiros (Editorial Credits) ── */}
{portalContent?.clients?.enabled && portalContent.clients.items?.length > 0 && (
  <section className="py-24 bg-[#FDFBF9] relative border-t border-stone-50">
    
    {/* Divisor Decorativo Sutil */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-stone-200 to-transparent" />

    <div className="max-w-7xl mx-auto px-6">
      
      {/* Título com Espaçamento de Luxo */}
      <div className="flex flex-col items-center mb-16 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.6em] text-stone-300">
          {portalContent.clients.title || "The Circle of Trust"}
        </span>
      </div>

      {/* Grid de Logotipos com Efeito de Fusão */}
      <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-12">
        {portalContent.clients.items.map((client: any, i: number) => {
          const logoUrl = getImageUrl(client.logo);
          
          return (
            <div 
              key={i} 
              className="group relative flex items-center justify-center"
            >
              <img 
                src={logoUrl} 
                alt={client.name} 
                className="h-8 md:h-10 w-auto object-contain transition-all duration-700 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105" 
              />
              
              {/* Tooltip Elegante no Hover */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap">
                <span className="text-[8px] font-black uppercase tracking-widest text-orange-400">
                  {client.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selo de Garantia / Assinatura Final */}
      <div className="mt-20 flex justify-center">
        <div className="flex items-center gap-4 px-8 py-3 rounded-full bg-white border border-stone-100 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.3em]">
            Certified Excellence 2026
          </span>
        </div>
      </div>
    </div>
  </section>
)}

{/* — Testemunhos: Estilo Editorial & Prestige — */}
{portalContent?.testimonials?.enabled && portalContent.testimonials.items?.length > 0 && (
  <section id="testimonials" className="py-32 bg-[#FDFBF9] relative overflow-hidden">
    
    {/* Elemento Decorativo Sutil: Arco de Fundo */}
    <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-stone-100 -z-0" />

    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Header Editorial Minimalista */}
      <div className="flex flex-col items-center text-center mb-24">
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-6 block">
          {portalContent.testimonials.tagline || "Voice of Excellence"}
        </span>
        <h2 className="font-serif text-5xl md:text-7xl tracking-tighter text-stone-900 leading-none">
          Trusted <span className="italic font-light text-stone-300">By many</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {portalContent.testimonials.items.map((t, i) => (
          <div 
            key={i} 
            className={`relative p-12 rounded-[4rem] flex flex-col transition-all duration-1000 group
              ${i % 2 === 0 ? 'bg-white shadow-sm hover:shadow-2xl' : 'bg-transparent border border-stone-100 hover:bg-white'}`}
          >
            {/* Ícone de Citação Estilizado */}
            <div className="mb-10">
              <span className="font-serif text-6xl text-orange-200 leading-none select-none italic">“</span>
            </div>

            {/* Corpo do Testemunho */}
            <blockquote className="flex-1 mb-12">
              <p className="font-serif text-xl leading-relaxed text-stone-800 italic font-light tracking-tight">
                {t.text}
              </p>
            </blockquote>

            {/* Perfil do Cliente Estilo Boutique */}
            <div className="flex items-center gap-5 pt-8 border-t border-stone-50">
              <div className="relative w-14 h-14 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 ring-2 ring-stone-50 ring-offset-2">
                  {t.avatar ? (
                    <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900 text-white text-[10px] font-bold">
                      {t.name?.substring(0, 2)}
                    </div>
                  )}
                </div>
                {/* Badge de Verificação */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-[8px] text-white">✦</span>
                </div>
              </div>

              <div className="flex flex-col">
                <p className="font-serif text-lg text-stone-900 leading-none mb-2">{t.name}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
                  {t.role} <span className="text-orange-300 mx-1">/</span> {t.company}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer da Seção: Assinatura de Autenticidade */}
      <div className="mt-32 flex flex-col items-center gap-6">
        <div className="w-px h-16 bg-gradient-to-b from-stone-200 to-transparent" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-stone-300">
          Verified Success Stories 2026
        </p>
      </div>
    </div>
  </section>
)}



{/* Item Details Modal - Boutique Experience */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
    {/* Overlay com Blur Cinematográfico */}
    <div 
      className="absolute inset-0 bg-stone-900/40 backdrop-blur-xl transition-opacity duration-700" 
      onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
    />

    <div className="relative w-full max-w-6xl bg-[#FDFBF9] rounded-[4rem] overflow-hidden shadow-[0_80px_150px_-30px_rgba(0,0,0,0.4)] flex flex-col md:flex-row max-h-[94vh] border border-white/40">
      
      {/* Botão Fechar - Estilo Minimalista */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-10 right-10 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-700 border border-white/50"
      >
        <X size={18} strokeWidth={1.5} />
      </button>

      {/* COLUNA ESQUERDA: Visual Gallery (Com Máscara de Arco) */}
      <div className="relative w-full md:w-[45%] bg-[#F7F4F1] overflow-hidden">
        {(() => {
          const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
            ? selectedItem.images 
            : selectedItem.image ? [selectedItem.image] : [];

          if (itemImages.length > 0) {
            return (
              <div className="h-full flex flex-col items-center justify-center p-8 md:p-14">
                <div className="relative w-full h-full aspect-[4/5] md:aspect-auto">
                  <img 
                    src={getImageUrl(itemImages[currentImgIndex])} 
                    className="w-full h-full object-cover rounded-t-full border-[12px] border-white shadow-2xl transition-all duration-1000 group-hover:scale-105 grayscale hover:grayscale-0" 
                    alt={selectedItem.name} 
                  />
                  {/* Badge de Prestígio */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg border border-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-900 whitespace-nowrap">Exclusive Ritual</span>
                    </div>
                  </div>
                </div>
                
                {/* Navegação de Galeria Fine-Art */}
                {itemImages.length > 1 && (
                  <div className="absolute bottom-10 flex gap-4">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`h-[2px] transition-all duration-700 ${idx === currentImgIndex ? 'w-12 bg-stone-900' : 'w-4 bg-stone-200 hover:bg-stone-400'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <span className="font-serif italic text-4xl">Brendkit</span>
            </div>
          );
        })()}
      </div>

      {/* COLUNA DIREITA: Conteúdo Narrativo */}
      <div className="flex-1 flex flex-col min-h-0 bg-white p-12 md:p-20">
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide">
          
          <div className="mb-14">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400">
                {selectedItem.category || "Curation"}
              </span>
              <div className="h-px flex-1 bg-stone-50" />
            </div>
            
            <h3 className="font-serif text-4xl md:text-6xl text-stone-900 mb-8 leading-[0.9] tracking-tighter italic">
              {selectedItem.name}
            </h3>
            
            <p className="text-stone-400 text-base leading-relaxed font-light italic">
              {selectedItem.description || "A bespoke experience tailored for those who appreciate the finer details of luxury and personal care."}
            </p>
          </div>

          {/* Especificações - Estilo Menu de Spa */}
          <div className="space-y-16">
            <section>
              <h4 className="text-stone-900 text-[10px] font-black uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                The Details <span className="text-orange-400 text-xl leading-none">✦</span>
              </h4>
              <div className="grid grid-cols-1 gap-6">
                {(selectedItem.includedItems || selectedItem.items || []).map((it, i) => (
                  <div key={i} className="flex items-center justify-between pb-4 border-b border-stone-50 group">
                    <div className="flex items-center gap-4">
                      <span className="font-serif text-stone-200 text-xl italic group-hover:text-orange-400 transition-colors">0{i+1}.</span>
                      <span className="text-sm font-bold text-stone-700 uppercase tracking-tighter">
                        {it.productId?.name || it.description || "Premium Feature"}
                      </span>
                    </div>
                    {it.quantity > 1 && (
                      <span className="text-[9px] font-black text-stone-300 uppercase italic">x{it.quantity} Sessions</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Benefícios Dinâmicos (Cards de Nível) */}
            {selectedItem.includedLimits?.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {selectedItem.includedLimits.map((l, i) => (
                  <div key={i} className="p-8 rounded-[2.5rem] bg-[#FDFBF9] border border-stone-50 group hover:bg-stone-900 transition-all duration-700">
                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-[0.4em] mb-4 group-hover:text-white/50">{l.description}</p>
                    <p className="font-serif text-3xl text-stone-900 group-hover:text-white tracking-tighter">
                      {l.maxValue} <span className="text-xs font-light italic opacity-40 group-hover:opacity-100">{l.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Valor e Reserva Personalizada */}
        <div className="pt-12 mt-10 border-t border-stone-50 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col text-center md:text-left">
            <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.4em] mb-2">Estimated Investment</span>
            <div className="font-serif text-5xl text-stone-900 tracking-tighter">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-xs text-stone-300 font-light italic">{currency}</span>
            </div>
          </div>
          
          <button 
            onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); setCurrentImgIndex(0); }} 
            className="group relative overflow-hidden w-full md:w-auto px-16 py-6 bg-stone-900 text-white font-black text-[9px] uppercase tracking-[0.5em] rounded-full hover:bg-orange-400 transition-all duration-700 shadow-2xl"
          >
            <span className="relative z-10">Inquire Experience</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* CART MODAL – Boutique Concierge Edition */}
<div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 ${isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-all duration-700`}>
  
  {/* Overlay com Blur Editorial */}
  <div
    className="absolute inset-0 bg-stone-900/40 backdrop-blur-xl"
    onClick={() => setIsCartOpen(false)}
  />

  {/* Modal Container */}
  <div
    className={`relative w-full max-w-7xl max-h-[94vh] bg-[#FDFBF9] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.5)] rounded-[4rem] overflow-hidden flex flex-col transform transition-all duration-1000 ease-out ${isCartOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-20'}`}
  >
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      
      {/* COLUNA ESQUERDA: Portfólio de Seleção */}
      <div className="flex-[1.3] flex flex-col min-h-0 bg-white">
        <div className="p-12 border-b border-stone-50 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400 mb-4 block">Selected Experiences</span>
            <h2 className="font-serif text-4xl text-stone-900 tracking-tighter leading-none">
              Your <span className="italic text-stone-300 font-light">Curation</span>
            </h2>
          </div>
          <div className="hidden sm:block">
            <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest">{cart.length} Items</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-hide">
          {cart.length > 0 ? (
            <div className="min-w-full">
              <table className="w-full text-left border-separate border-spacing-y-6">
                <thead>
                  <tr>
                    <th className="text-[8px] font-black uppercase tracking-[0.3em] text-stone-300 px-6">Description</th>
                    <th className="text-[8px] font-black uppercase tracking-[0.3em] text-stone-300 text-center">Qty</th>
                    <th className="text-[8px] font-black uppercase tracking-[0.3em] text-stone-300 text-right px-6">Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(cartItem => (
                    <tr key={cartItem.itemId} className="group">
                      <td className="py-6 px-6 bg-[#FDFBF9] rounded-l-[2.5rem]">
                        <div className="flex gap-6 items-center">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-stone-50 p-1 shrink-0 group-hover:scale-105 transition-transform duration-500">
                            <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-cover rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700" />
                          </div>
                          <div>
                            <p className="font-serif text-lg text-stone-900 leading-tight italic">{cartItem.name}</p>
                            <button 
                              onClick={() => removeFromCart(cartItem.itemId)} 
                              className="text-[8px] text-orange-400/60 hover:text-orange-400 transition-colors mt-3 uppercase font-black tracking-[0.2em] flex items-center gap-2"
                            >
                              <X size={8} strokeWidth={3} /> Remove Selection
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="bg-[#FDFBF9] text-center">
                        <div className="inline-flex items-center bg-white rounded-full p-1 border border-stone-100">
                          <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-2 text-stone-300 hover:text-stone-900 transition-colors"><Minus size={10} /></button>
                          <span className="px-4 font-serif italic text-stone-900 min-w-[30px]">{cartItem.quantity}</span>
                          <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-2 text-stone-300 hover:text-stone-900 transition-colors"><Plus size={10} /></button>
                        </div>
                      </td>
                      <td className="py-6 px-6 bg-[#FDFBF9] rounded-r-[2.5rem] text-right">
                        <p className="font-serif text-xl text-stone-900 tracking-tighter">
                          {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[9px] text-stone-300 font-sans font-black uppercase tracking-widest ml-1">{currency}</span>
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
               <span className="font-serif italic text-6xl text-stone-200 mb-6">✦</span>
               <p className="text-[9px] font-black text-stone-900 uppercase tracking-[0.6em]">Portfolio is currently empty</p>
            </div>
          )}
        </div>

        <div className="p-12 border-t border-stone-50 bg-[#FDFBF9]/50">
          <button 
            onClick={() => setIsCartOpen(false)}
            className="flex items-center gap-4 text-stone-900 text-[9px] font-black uppercase tracking-[0.4em] group transition-all"
          >
            <ArrowLeft size={12} className="group-hover:-translate-x-2 transition-transform" /> Back to Collection
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA: Engagement & Information */}
      <div className="flex-1 bg-[#F7F4F1] p-10 md:p-14 flex flex-col overflow-y-auto scrollbar-hide">
        <h3 className="text-[9px] font-black text-stone-300 uppercase tracking-[0.6em] mb-12">Engagement Details</h3>
        
        <div className="flex-1 space-y-12">
          {/* Formulário Estilo "Guest Check-in" */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <input placeholder="Full Name / Brand" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-8 py-5 bg-white rounded-3xl text-[11px] font-bold text-stone-900 placeholder:text-stone-200 outline-none focus:ring-1 focus:ring-orange-100 transition-all" />
              <input placeholder="Email Address" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-8 py-5 bg-white rounded-3xl text-[11px] font-bold text-stone-900 placeholder:text-stone-200 outline-none focus:ring-1 focus:ring-orange-100 transition-all" />
              <input type='number' placeholder="Phone Number" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-8 py-5 bg-white rounded-3xl text-[11px] font-bold text-stone-900 placeholder:text-stone-200 outline-none focus:ring-1 focus:ring-orange-100 transition-all" />
              
              <textarea 
                placeholder="Specific Requirements or Aesthetic Preferences" 
                rows={3}
                value={client.notes || ""} 
                onChange={e => setClient({ ...client, notes: e.target.value })} 
                className="w-full px-8 py-5 bg-white rounded-3xl text-[11px] font-bold text-stone-900 placeholder:text-stone-200 outline-none focus:ring-1 focus:ring-orange-100 transition-all resize-none"
              />

              <div className="relative">
                <Calendar className="absolute left-8 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-200" />
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white rounded-3xl text-[11px] font-bold text-stone-900 outline-none [color-scheme:light]" />
              </div>
            </div>

            {/* Made to Order Toggle Boutique */}
            {cart.some(item => item.madeToOrder) && (
              <div className="p-6 bg-white rounded-[2rem] border border-stone-50">
                <label className="flex items-center gap-5 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={cart.every(item => item.madeToOrder ? item.wantsOrder : true)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCart(prev => prev.map(i => i.madeToOrder ? { ...i, wantsOrder: checked } : i));
                      }}
                      className="peer h-6 w-6 cursor-pointer appearance-none rounded-full border border-stone-100 checked:bg-orange-400 transition-all" 
                    />
                    <Check className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 left-1.5 pointer-events-none" strokeWidth={4} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-900">Custom Consultation</span>
                    <p className="text-[8px] text-stone-400 font-medium leading-tight mt-1 italic">Tailor-made adjustments for your specific silhouette.</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Payment Protocol - Estilo Boutique */}
          <div className="space-y-6">
            <label className="text-[8px] font-black uppercase tracking-[0.4em] text-stone-300 ml-2">Protocol Of Settlement</label>
            <div className="grid grid-cols-2 gap-3">
              {['mpesa', 'visa', 'cash', 'transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                  className={`py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${paymentMethod === m ? 'bg-stone-900 text-white shadow-2xl scale-105' : 'bg-white text-stone-300 border border-stone-50 hover:border-stone-200'}`}
                >
                  {m === 'transfer' ? 'Wire' : m}
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
              className="w-full border-2 border-stone-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-stone-900 transition-colors"
            />
            <p className="text-[10px] text-stone-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
          </div>

          {/* Dados Bancários Animados */}
          {paymentMethod === 'transfer' && (
            <div className="animate-in fade-in zoom-in duration-700">
              <div className="p-8 bg-stone-900 rounded-[3rem] text-white space-y-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                   <h4 className="text-[9px] font-black uppercase tracking-widest">Banking Credentials</h4>
                </div>
                {company.bankAccounts?.map((bank, idx) => (
                  <div key={idx} className="pb-4 last:pb-0 border-b last:border-0 border-white/5">
                    <p className="font-serif italic text-lg mb-4 text-orange-200">{bank.bankName}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/30 font-black uppercase tracking-widest text-[8px]">Account</span>
                        <span className="font-mono text-white/90">{bank.accountNumber}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/30 font-black uppercase tracking-widest text-[8px]">NIB</span>
                        <span className="font-mono text-white/90">{bank.nibOrIban}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Totais e Finalização */}
        <div className="mt-16 pt-12 border-t border-stone-100 flex flex-col gap-10">
          <div className="flex justify-between items-baseline px-2">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-orange-400 uppercase tracking-[0.5em] mb-4">Final Investment</span>
              <span className="font-serif text-6xl text-stone-900 tracking-tighter leading-none">
                {totals.grandTotal.toLocaleString()}
              </span>
            </div>
            <span className="font-serif italic text-stone-300 text-xl">{currency}</span>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handlePayment}
              disabled={!paymentMethod || ['none', 'transfer', 'cash'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
              className="group relative overflow-hidden py-7 bg-orange-400 text-white text-[9px] font-black uppercase tracking-[0.5em] rounded-full hover:bg-stone-900 transition-all duration-700 shadow-2xl disabled:opacity-5"
            >              
              {hasOrderWithPrice ? `Process Retainer (${totals.grandTotal.toLocaleString()} ${currency})` : 'Authorize Secure Payment'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || hasOrderWithPrice}
              className="py-6 text-stone-900 text-[8px] font-black uppercase tracking-[0.4em] hover:text-orange-400 transition-all disabled:opacity-20"
            >
              {paymentMethod === 'transfer' ? 'Confirm Transaction' : 'Confirm & Finalize Appointment'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Close X Estilizado */}
    <button 
      onClick={() => setIsCartOpen(false)} 
      className="absolute top-12 right-12 text-stone-200 hover:text-stone-900 transition-colors"
    >
      <X size={20} strokeWidth={1} />
    </button>
  </div>
</div>

{/* Success Modal - Boutique Prestige Edition */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-xl transition-all duration-700" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-[#FDFBF9] rounded-[4rem] shadow-[0_100px_150px_-30px_rgba(0,0,0,0.5)] max-w-lg w-full p-12 md:p-16 text-center relative overflow-hidden border border-white/40 transform transition-all animate-in zoom-in duration-500"
      onClick={e => e.stopPropagation()}
    >
      {/* Detalhe Estético: Gradiente de Luxo no topo */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200" />
      
      <div className="relative z-10">
        {/* Ícone de Sucesso: O Selo de Arco */}
        <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-t-full border-[8px] border-stone-50 shadow-2xl mb-10 relative">
          <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center text-white shadow-xl">
            <Check size={28} strokeWidth={1.5} />
          </div>
          {/* Brilho Decorativo */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center border-4 border-[#FDFBF9]">
            <span className="text-[8px] text-white italic">✦</span>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <div className="flex justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-400">
              Request Received
            </span>
          </div>
          
          <h2 className="font-serif text-5xl md:text-6xl text-stone-900 leading-[0.85] tracking-tighter italic">
            Thank <span className="text-stone-300 font-light">You.</span>
          </h2>
          
          <p className="text-stone-400 text-base leading-relaxed max-w-[320px] mx-auto font-light italic">
            Sua solicitação foi recebida com exclusividade. Nossa equipe iniciou o protocolo de curadoria e entrará em contacto em breve.
          </p>
        </div>

        {/* Botão de Ação: Estilo Concierge */}
        <button
          onClick={closeSuccessModal}
          className="w-full py-6 bg-stone-900 text-white rounded-full transition-all duration-700 hover:bg-orange-400 active:scale-95 font-black text-[9px] uppercase tracking-[0.5em] shadow-2xl mb-10"
        >
          Return to Collection
        </button>
        
        {/* Reference ID - Estilo 'Certificate' */}
        <div className="pt-10 border-t border-stone-100 flex flex-col items-center gap-4">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-300">
             Booking Reference
           </p>
           <div className="relative group">
             <span className="font-serif italic text-2xl text-stone-900 tracking-widest px-8 py-3 bg-white rounded-2xl border border-stone-50 block">
               BK-{Math.random().toString(36).substr(2, 5).toUpperCase()}
             </span>
           </div>
           <p className="text-[10px] text-stone-300 font-medium italic">
             Um resumo da sua experiência foi enviado para o seu e-mail.
           </p>
        </div>
      </div>

      {/* Marca d'água de fundo sutil */}
      <div className="absolute -bottom-10 -left-10 font-serif text-[12rem] text-stone-50 leading-none select-none -z-0 opacity-40">
        B
      </div>
    </div>
  </div>
)}
<footer className="bg-[#FDFBF9] pt-32 pb-16 overflow-hidden relative border-t border-stone-100">
  {/* Branding Monumental de Fundo (Sutil) */}
  <div className="absolute -bottom-20 -right-20 font-serif text-[25rem] text-stone-200/20 leading-none select-none pointer-events-none italic">
    {company.name.charAt(0)}
  </div>

  <div className="max-w-7xl mx-auto px-8 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-20 mb-32">
      
      {/* Coluna 1: Editorial Branding & Newsletter */}
      <div className="lg:col-span-5 space-y-12">
        <div className="flex items-center">
          {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-10 w-auto grayscale" />
          ) : (
            <span className="font-serif italic text-3xl tracking-tighter text-stone-900">{company.name}</span>
          )}
        </div>
        
        <p className="text-stone-400 text-base leading-relaxed max-w-sm font-light italic">
          Curadoria de excelência em serviços premium e gestão de estilo de vida. Redefinindo o padrão de exclusividade em Moçambique.
        </p>
        
        {/* Newsletter Estilo Boutique */}
        <div className="space-y-6 pt-6 max-w-md">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-stone-900">Join the Circle</p>
          <div className="flex p-1.5 bg-white border border-stone-100 rounded-full focus-within:border-stone-900 transition-all duration-700 shadow-sm">
            <input 
              type="email" 
              placeholder="Email for exclusive updates" 
              className="flex-1 px-8 bg-transparent text-stone-900 text-xs outline-none placeholder:text-stone-200 font-medium italic" 
            />
            <button className="px-10 py-4 bg-stone-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] hover:bg-orange-400 transition-all duration-500">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Curation (Links) */}
      <div className="lg:col-span-2 space-y-10">
        <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-300">Curation</h4>
        <ul className="space-y-5">
          {['Our Rituals', 'Experiences', 'The Studio', 'Bespoke'].map(link => (
            <li key={link}>
              <a href="#" className="text-[11px] text-stone-500 hover:text-orange-400 transition-colors font-bold uppercase tracking-[0.2em]">{link}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Private Concierge */}
      <div className="lg:col-span-3 space-y-10">
        <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-300">Concierge</h4>
        <ul className="space-y-10">
          <li className="flex flex-col gap-2">
            <span className="text-[8px] text-orange-400 font-black uppercase tracking-[0.3em]">Direct Line</span>
            <a href={`tel:${company.phone}`} className="font-serif italic text-2xl text-stone-900 hover:text-orange-400 transition-colors tracking-tighter">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col gap-2">
            <span className="text-[8px] text-orange-400 font-black uppercase tracking-[0.3em]">Inquiries</span>
            <a href={`mailto:${company.email}`} className="text-stone-900 font-bold text-xs hover:text-orange-400 transition-colors tracking-widest break-all uppercase">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Social Presence */}
      <div className="lg:col-span-2 space-y-12 text-right md:text-left">
        <div>
          <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-300 mb-8 italic">Follow the Aura</h4>
          <div className="flex gap-4 justify-end md:justify-start">
            {[Instagram, Facebook, Linkedin].map((Icon, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="w-12 h-12 bg-white border border-stone-50 rounded-full flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-900 transition-all duration-700 shadow-sm"
              >
                <Icon size={16} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Legal & Philosophy */}
    <div className="pt-16 border-t border-stone-100 flex flex-col md:flex-row justify-between items-end gap-12">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-black text-stone-900 uppercase tracking-[0.5em]">
            © 2026 {company.name}
          </span>
          <div className="h-px w-8 bg-orange-200" />
          <span className="text-[9px] text-stone-300 font-light italic tracking-widest uppercase">
            Bespoke Creative Identity
          </span>
        </div>
        <p className="text-[8px] text-stone-200 font-medium uppercase tracking-[0.4em]">
          Elegance is the only beauty that never fades.
        </p>
      </div>
      
      <div className="flex gap-12 items-center">
        <a href="#" className="text-[8px] font-black text-stone-300 hover:text-stone-900 transition-colors uppercase tracking-[0.3em]">Privacy</a>
        <a href="#" className="text-[8px] font-black text-stone-300 hover:text-stone-900 transition-colors uppercase tracking-[0.3em]">Terms</a>
        
        {/* Status Estilizado: Ponto de Luz */}
        <div className="flex items-center gap-4 pl-12 border-l border-stone-100">
           <div className="relative">
             <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
             <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping opacity-40" />
           </div>
           <span className="text-[8px] font-black text-stone-900 uppercase tracking-[0.4em]">Operational</span>
        </div>
      </div>
    </div>
  </div>
</footer>
    </div>
      
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

export default HairStylePortal;