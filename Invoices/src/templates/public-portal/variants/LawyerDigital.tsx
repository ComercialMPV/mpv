// src/templates/public-portal/variants/LawyerPortal.tsx
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

interface LawyerProps {
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

const LawyerPortal: React.FC<LawyerProps> = ({ 
  company, 
  slug, 
  services: initialServices,
  products: initialProducts,
  bundles: initialBundles,
  portalContent = {
    hero: {
      headline: "Tailored Legal Solutions",
      subheadline: "We provide high-end legal advisory for complex corporate and personal matters.",
      backgroundImage: "https://i1-c.pinimg.com/736x/5d/77/6c/5d776c6907ffaee5c7292b6d3ae892ff.jpg"
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

  return (
    <div className="min-h-screen bg-white/5 text-slate-900 font-sans">
      {/* Modern Navbar */}
  
{/* Header Estilo Premium Salon */}
<div className="font-sans text-white bg-black selection:bg-white/30 min-h-screen">
            {/* 1. HEADER REFEITO COM PESQUISA INTEGRADA E CARRINHO */}
<header className="sticky top-0 left-0 right-0 mx-auto px-6 max-w-[1280px] w-full z-[60]  py-8 flex justify-between items-start pointer-events-none">
  
  <div className="flex items-center gap-2 bg-[#1a1a1a]/80 backdrop-blur-md px-2 py-2 rounded-2xl border border-white/5 pointer-events-auto transition-all duration-500 ease-in-out">
    
    {/* Logo */}
    <div className="bg-white p-2 rounded-xl shrink-0">
       {company.logo ? (
          <img src={company.logo} alt={company.name} className="h-5 w-5 invert" />
        ) : (
          <div className="w-5 h-5 bg-black rounded-full" /> 
        )}
    </div>

    {/* Container Dinâmico: Nav ou Input de Busca */}
    <div className="overflow-hidden flex items-center h-9">
      {!isSearchOpen ? (
        <nav className="flex items-center gap-6 px-4 whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">
          {['About', 'Services', 'Blog', 'Contacts'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors">
              {item}
            </a>
          ))}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="text-gray-400 hover:text-white p-1 transition-transform hover:scale-110"
          >
            <Search size={16} />
          </button>
        </nav>
      ) : (
        <div className="flex items-center gap-3 px-4 animate-in fade-in zoom-in-95 duration-300 w-[300px] lg:w-[450px]">
          <Search size={14} className="text-blue-500" />
          <input 
            autoFocus
            type="text"
            placeholder="Search legal services..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-600 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => setIsSearchOpen(false)} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  </div>

  {/* Seção Direita: Idioma e Shopping Cart / Wallet */}
  <div className="flex gap-3 pointer-events-auto">
    {/* Seletor de Idioma */}
    <div className="hidden sm:flex bg-[#1a1a1a]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 text-[13px] text-white cursor-pointer items-center gap-2 hover:bg-white/10 transition-colors">
      Eng <span className="text-[10px] opacity-50">▼</span>
    </div>

    {/* SHOPPING CART / WALLET BUTTON */}
    <button 
      onClick={() => setIsCartOpen(true)}
      className="relative bg-[#1a1a1a]/80 backdrop-blur-md p-3 rounded-2xl border border-white/5 flex items-center justify-center group hover:bg-blue-600 transition-all duration-500 shadow-xl"
    >
      <div className="relative">
        <Briefcase size={20} className="text-white group-hover:scale-110 transition-transform" />
        
        {/* Badge do Contador de Itens */}
        {cart.length > 0 && (
          <span className="absolute -top-3 -right-3 w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#1a1a1a] animate-in zoom-in duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            {cart.length}
          </span>
        )}
      </div>
      
      
    </button>
  </div>
</header>


    {/* 2. HERO SECTION (Mantido conforme o layout Stas) */}
    <section className="relative h-screen flex items-end pb-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={getImageUrl(portalContent?.hero?.backgroundImage) || "https://i1-c.pinimg.com/736x/84/0e/38/840e3846c3e075d88fb501656af968d5.jpg"} 
          alt="Background" 
          className="w-full h-full object-cover object-right" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-10 w-full grid grid-cols-12 items-end">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          <div className="flex items-center gap-4 bg-[#1a1a1a]/60 backdrop-blur-lg p-3 rounded-3xl border border-white/10 w-fit mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden ring-2 ring-white/10">
              <img src="https://i1-c.pinimg.com/1200x/6d/94/12/6d9412bdb8a8adedc23932bd82e2ba9b.jpg" alt="Lawyer" className="w-full h-full object-cover" />
            </div>
            <div>
               <p className="text-[12px] font-bold leading-none uppercase tracking-tight">Legal Intelligence</p>
               <p className="text-[10px] text-blue-500 mt-1">Available for Consultation</p>
            </div>
          </div>

          <h1 className="text-6xl md:text-6xl lg:text-[6rem] font-extrabold leading-[0.9] tracking-tighter uppercase max-w-4xl">
            {portalContent?.hero?.headline || "Tailored Legal Solutions"}
          </h1>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-10 mt-10">
            <p className="max-w-[320px] text-gray-400 text-sm leading-relaxed border-l-2 border-blue-600 pl-6">
              {portalContent?.hero?.subheadline || "We provide high-end legal advisory for complex corporate and personal matters."}
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* OVERLAY DE PESQUISA (Opcional - Sugestões Rápidas de Advocacia) */}
    {isSearchOpen && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] pointer-events-none transition-opacity" />
    )}

{/* === SEÇÕES DINÂMICAS DO PORTAL CONTENT === */}

{/* About Section – Estilo Premium Trust */}
{portalContent?.about?.enabled && (
  <section id="about" className="py-24 bg-white text-slate-900">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Lado Esquerdo: Imagem com Cantos Arredondados Customizados */}
        <div className="relative group">
          {portalContent.about.image ? (
            <img 
              src={getImageUrl(portalContent.about.image)} 
              alt="Professional Team" 
              className="rounded-[2.5rem] w-full h-[500px] object-cover shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]" 
            />
          ) : (
            <div className="bg-slate-200 rounded-[2.5rem] w-full h-[500px] flex items-center justify-center text-slate-400">
              [Image Placeholder]
            </div>
          )}
          
          {/* Detalhe Decorativo (opcional, como o da imagem) */}
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        </div>

        {/* Lado Direito: Conteúdo e Stats */}
        <div className="space-y-10">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-black">
              {portalContent.about.title || "Helping you to correctly set-up, build, and protect your brand"}
            </h2>
            
            <div 
              className="text-lg leading-relaxed text-gray-500 max-w-xl" 
              dangerouslySetInnerHTML={{ __html: portalContent.about.body || '' }} 
            />
          </div>

          {/* Grid de Estatísticas (Stats Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            
            {/* Card 1 */}
            <div className="bg-[#f8f5f2] p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px] hover:bg-[#f2eee9] transition-colors">
              <span className="text-4xl font-bold text-black tracking-tighter">5th</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-4">Field expertise</p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#f1ebe5] p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px] hover:bg-[#e9e2db] transition-colors">
              <span className="text-4xl font-bold text-black tracking-tighter">95%</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-4">Client Satisfaction</p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#f8f5f2] p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px] hover:bg-[#f2eee9] transition-colors">
              <span className="text-4xl font-bold text-black tracking-tighter">120+</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-4">Clients freed</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  </section>
)}







 {/* agora três secções sequenciais com colapso */}
  <div className="">
{/* Section: Practice Areas & Services — Editorial Aesthetic */}
{filteredServices.length > 0 && (
  <section id="services" className="py-32 bg-white">
    <div className="max-w-7xl mx-auto px-8 md:px-12">
      
      {/* Cabeçalho Editorial */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
        <div className="max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600 mb-4 block">
            Expertise & Solutions
          </span>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tighter text-black uppercase leading-[0.9]">
            Our Practice <br />
            <span className="text-gray-300">& Services</span>
          </h2>
        </div>
        <div className="max-w-xs">
          <p className="text-gray-400 text-xs md:text-sm leading-relaxed border-l-2 border-gray-100 pl-6">
            Providing high-level strategic guidance and meticulous legal support tailored for complex modern environments.
          </p>
        </div>
      </div>

      {/* Grid de Serviços — Minimalist Image Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredServices.slice(0, visibleServices).map((item, index) => (
          <div
            key={item._id}
            onClick={() => openItem(item, 'services')}
            className="group relative flex flex-col h-[500px] rounded-[3rem] overflow-hidden bg-[#fbfbfb] cursor-pointer transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)]"
          >
            {/* Background Image Container */}
            <div className="absolute inset-0 z-0">
              {item.images?.length > 0 ? (
                <img 
                  src={getImageUrl(item.images[0])} 
                  alt={item.name}
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110 opacity-40 group-hover:opacity-100"
                />
              ) : (
                <div className="w-full h-full bg-[#f1ebe5]" />
              )}
              {/* Overlay Gradiente para legibilidade */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-10 group-hover:from-black/60 group-hover:via-black/20 group-hover:to-transparent transition-all duration-700" />
            </div>

            {/* Conteúdo do Card */}
            <div className="relative z-20 flex flex-col h-full p-10 justify-end">
              <div className="mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full group-hover:bg-white group-hover:text-black transition-colors">
                  {item.category || "Legal Practice"}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight leading-tight group-hover:text-white transition-colors duration-500">
                {item.name}
              </h3>
              
              <div className="max-h-0 overflow-hidden group-hover:max-h-32 transition-all duration-700 ease-in-out">
                <p className="text-white/80 text-xs leading-relaxed mb-6 line-clamp-3">
                  {item.description || "Sophisticated legal strategies designed to protect assets and ensure compliance in dynamic markets."}
                </p>
              </div>

              {/* Action Trigger */}
              <div className="pt-6 border-t border-black/5 group-hover:border-white/20 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black group-hover:text-white transition-colors">
                  Explore Advisory
                </span>
                <div className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center group-hover:bg-white group-hover:border-transparent transition-all duration-500">
                  <ArrowRight size={16} className="text-black group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More — Minimalist Divider Style */}
      {visibleServices < filteredServices.length && (
        <div className="mt-24 flex flex-col items-center">
          <div className="w-[1px] h-20 bg-gradient-to-b from-gray-100 to-blue-600 mb-8" />
          <button 
            onClick={() => setVisibleServices(prev => prev + 3)}
            className="group flex items-center gap-4 text-black text-[10px] font-black uppercase tracking-[0.4em] hover:text-blue-600 transition-colors"
          >
            Expand Expertise
            <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-blue-600 transition-all">
              <Plus size={14} />
            </div>
          </button>
        </div>
      )}
    </div>
  </section>
)}
{/* Missão, Visão e Valores – Estilo Dark Cinematic */}
{portalContent?.missionVision?.enabled && (
  <section className="py-24 bg-black text-white overflow-hidden relative">
    
    {/* Elemento Decorativo de Fundo (Sutil) */}
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />

    <div className="max-w-7xl mx-auto px-10">
      
      {/* Título de Suporte */}
      <div className="mb-20">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 block mb-4">
          Core Principles
        </span>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none">
          Our Purpose & <br /> Commitment
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Missão Card */}
        <div className="group p-10 rounded-[2.5rem] bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all duration-500">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all">
            <span className="text-xs font-bold italic">01</span>
          </div>
          <h3 className="text-xl font-bold uppercase tracking-tight mb-6">
            {portalContent?.missionVision?.mission?.title || "Mission"}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            {portalContent?.missionVision?.mission?.content || "To provide strategic legal intelligence that empowers businesses to navigate complex regulatory environments with absolute confidence."}
          </p>
        </div>

        {/* Visão Card */}
        <div className="group p-10 rounded-[2.5rem] bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all duration-500">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all">
            <span className="text-xs font-bold italic">02</span>
          </div>
          <h3 className="text-xl font-bold uppercase tracking-tight mb-6">
            {portalContent?.missionVision?.vision?.title || "Vision"}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            {portalContent?.missionVision?.vision?.content || "To be recognized globally as the standard of excellence in legal advisory, bridging the gap between innovation and law."}
          </p>
        </div>

        {/* Valores Card - Diferenciado */}
        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-[#111] to-black border border-white/10 relative overflow-hidden">
          <h3 className="text-xl font-bold uppercase tracking-tight mb-8">
            {portalContent?.missionVision?.values?.title || "Values"}
          </h3>
          <ul className="space-y-4">
            {(portalContent?.missionVision?.values?.items?.length > 0 
              ? portalContent.missionVision.values.items 
              : ["Integrity", "Innovation", "Precision", "Client Success"]
            ).map((v, i) => (
              <li key={i} className="flex items-center gap-4 text-sm font-medium group cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-150 transition-transform" />
                <span className="text-gray-300 group-hover:text-white transition-colors">{v}</span>
              </li>
            ))}
          </ul>
          
          {/* Marca d'água sutil no card de valores */}
          <div className="absolute -bottom-4 -right-4 text-white/[0.02] text-8xl font-black italic select-none">
            CORE
          </div>
        </div>

      </div>
    </div>
  </section>
)}
{/* — Seção de Produtos/Soluções Estilo Boutique Legal — */}
{filteredProducts.length > 0  && (
  <section className="py-24 bg-[#f8f5f2] text-black relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Header Refinado (Alinhado ao Estilo Stas) */}
      <div className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 block mb-4">
            Curated Resources
          </span>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-[0.9] text-black uppercase">
            Featured <br /> <span className="text-gray-400">Legal Assets</span>
          </h2>
        </div>
        <div className="lg:col-span-5">
          <p className="text-gray-500 text-sm md:text-base leading-relaxed font-medium border-l border-gray-200 pl-8">
            Access our specialized toolkits, digital frameworks, and premium legal products designed for modern entrepreneurs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 3)).map((item, index) => {
          
          const firstImage = Array.isArray(item.images) && item.images.length > 0 
            ? item.images[0] 
            : item.image;
            
          const imageUrl = getImageUrl(firstImage || '');

          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className="group relative bg-white p-4 flex flex-col transition-all duration-700 cursor-pointer rounded-[3rem] hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] h-full min-h-[580px] border border-transparent hover:border-gray-100"
            >
              {/* Área da Imagem (Fundo Estilo Moldura de Galeria) */}
              <div className="relative h-80 w-full overflow-hidden bg-[#fbfbfb] rounded-[2.5rem] flex items-center justify-center p-6">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover rounded-[2rem] transition-transform duration-1000 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 rounded-[2rem] flex items-center justify-center">
                     <Package className="text-gray-300" size={48} strokeWidth={1} />
                  </div>
                )}
                
                {/* Badge de Preço (Minimalista White) */}
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md text-black px-5 py-2 rounded-full text-xs font-bold shadow-sm">
                   {getItemPrice(item).toLocaleString()} <span className="text-[10px] opacity-40 ml-1">{currency}</span>
                </div>
              </div>

              {/* Conteúdo do Produto */}
              <div className="px-6 py-8 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
                    {item.category || 'Premium Resource'}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                    <ArrowUpRight size={14} />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4 leading-tight tracking-tight text-black">
                  {item.name}
                </h3>
                
                <p className="text-sm leading-relaxed text-gray-400 font-medium line-clamp-2">
                  {item.description || "Sophisticated legal infrastructure designed for elite business operations."}
                </p>

                {/* Botão de Ação no Card */}
                <div className="mt-auto pt-6">
                   <div className="w-full py-4 rounded-2xl bg-gray-50 group-hover:bg-black group-hover:text-white transition-all duration-500 text-center text-[10px] font-black uppercase tracking-widest">
                      Purchase Access
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão Carregar Mais (Estilo Minimalista Border) */}
      {filteredProducts.length > 3 && (
        <div className=" py-24 mt-20 flex justify-center">
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="flex items-center gap-4 px-12 py-5 bg-transparent border border-gray-200 text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-black hover:text-white transition-all duration-500"
          >
            {showAllProducts ? 'View Less' : 'Explore All Solutions'}
            <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${showAllProducts ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </div>
  </section>
)}



{/* ── Seção: Legal Bundles (Estilo Premium Integration) ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-24 bg-white relative overflow-hidden border-t border-gray-50">
    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Cabeçalho Alinhado ao Estilo Stas */}
      <div className="mb-20">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-4 block">
          Strategic Alliances
        </span>
        <h2 className="text-5xl md:text-6xl font-bold text-black tracking-tighter uppercase leading-none">
          Service <span className="text-gray-300">Bundles</span>
        </h2>
      </div>

      {/* Horizontal Scroll com Snap e Design Refinado */}
      <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide snap-x">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map((item, index) => {
            const image = getImageUrl(item.image || '');
            
            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className="group relative bg-[#fbfbfb] rounded-[3rem] p-2 min-w-[350px] md:min-w-[750px] snap-center transition-all duration-700 hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] cursor-pointer overflow-hidden border border-transparent hover:border-gray-100"
              >
                <div className="bg-white rounded-[2.8rem] p-6 md:p-10 flex flex-col md:flex-row gap-10 h-full items-center">
                  
                  {/* Imagem com Overlay Suave */}
                  <div className="w-full md:w-2/5 aspect-[4/5] rounded-[2rem] overflow-hidden bg-[#f8f5f2] shrink-0">
                    <img 
                      src={image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1" 
                    />
                  </div>

                  {/* Conteúdo Editorial */}
                  <div className="flex-1 flex flex-col justify-between h-full py-2">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest">
                          Solution {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>
                        <div className="text-gray-200 group-hover:text-black transition-colors">
                          <Layers size={20} />
                        </div>
                      </div>
                      
                      <h3 className="text-3xl font-bold text-black mb-6 tracking-tight leading-tight">
                        {item.name}
                      </h3>
                      
                      <p className="text-gray-400 text-sm leading-relaxed font-medium mb-4">
                        {item.description || "A cohesive selection of legal frameworks designed to scale your business with full protection."}
                      </p>
                    </div>
                    
                    {/* Footer com Preço e Ação */}
                    <div className="mt-8 pt-8 border-t border-gray-50 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Retainer Value</span>
                        <span className="text-2xl font-bold text-black tracking-tighter">
                          {getItemPrice(item).toLocaleString()} <span className="text-xs text-gray-400 font-medium">{currency}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[10px] font-black text-black uppercase tracking-[0.3em] pb-1 border-b-2 border-black/5 group-hover:border-blue-600 transition-all">
                        Explore Bundle <ArrowUpRight size={16} className="text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge Flutuante "Exclusive" */}
                <div className="absolute top-8 right-10 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                   <div className="bg-black text-white text-[9px] font-black py-2 px-4 rounded-full tracking-widest shadow-xl">
                     PREMIUM SELECTION
                   </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Custom Progress Bar (Substituindo os Dots simples) */}
      <div className="max-w-[200px] mx-auto mt-8 h-[2px] bg-gray-100 rounded-full relative">
        <div className="absolute inset-y-0 left-0 bg-black w-1/3 rounded-full transition-all duration-500 group-hover:translate-x-full" />
      </div>
    </div>
  </section>
)}

{/* ── Seção: Legal Subscriptions (Estilo Boutique Law Tech) ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-24 bg-[#f8f5f2]/50 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      <div className="flex flex-col items-center text-center mb-20">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-4 block">Retainers & Plans</span>
        <h2 className="text-5xl md:text-6xl font-bold text-black tracking-tighter uppercase mb-10 leading-none">
          Legal <span className="text-gray-300">Subscriptions</span>
        </h2>
        
        {/* Toggle UI - Estilo Minimalista Arredondado */}
        <div className="inline-flex items-center p-1.5 bg-white border border-gray-100 rounded-full shadow-sm">
          <button className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-all">Monthly</button>
          <button className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-black text-white rounded-full shadow-lg">Annual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis') || plan.name.toLowerCase().includes('gold');

          return (
            <div 
              key={plan._id} 
              className={`relative p-12 rounded-[3.5rem] transition-all duration-700 flex flex-col group
                ${isPopular 
                  ? 'bg-black text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] scale-105 z-10 border-none' 
                  : 'bg-white border border-gray-100 text-black hover:shadow-2xl'}`}
            >
              {isPopular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2.5 rounded-full text-white shadow-xl whitespace-nowrap">
                  Most Trusted Tier
                </div>
              )}

              <div className="mb-10 text-center md:text-left">
                <h3 className={`text-2xl font-bold uppercase tracking-tight mb-4 ${isPopular ? 'text-white' : 'text-black'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm font-medium leading-relaxed h-12 line-clamp-2 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.description || "Comprehensive legal coverage tailored for your specific scale."}
                </p>
              </div>
              
              <div className="mb-12 pt-10 border-t border-gray-100/10 text-center md:text-left">
                <div className="flex items-baseline justify-center md:justify-start gap-2">
                  <span className="text-5xl font-bold tracking-tighter">
                    {getItemPrice(plan) === 0 ? 'FREE' : `${getItemPrice(plan).toLocaleString()}`}
                  </span>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isPopular ? 'text-blue-500' : 'text-gray-400'}`}>
                       {currency}
                    </span>
                    <span className={`text-[10px] font-medium uppercase ${isPopular ? 'text-gray-500' : 'text-gray-400'}`}>
                       / {plan.billingCycle === 'Mensal' ? 'month' : plan.billingCycle === 'Anual' ? 'year' : plan.billingCycle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Recursos - Clean & Elegant */}
              <ul className="space-y-5 mb-14 flex-1">
                {plan.includedLimits?.map((limit: any, i: number) => (
                  <li key={i} className="flex items-start gap-4 text-[12px] font-medium">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isPopular ? 'bg-white text-black' : 'bg-black text-white'}`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <span className={isPopular ? 'text-gray-300' : 'text-gray-600'}>
                      {limit.description}: <span className={`font-bold ${isPopular ? 'text-white' : 'text-black'}`}>{limit.maxValue} {limit.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-sm active:scale-95
                    ${isPopular 
                      ? 'bg-blue-600 text-white hover:bg-white hover:text-black' 
                      : 'bg-black text-white hover:bg-blue-600'}`}
                >
                  {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className={`w-full py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all
                    ${isPopular ? 'text-gray-500 hover:text-white' : 'text-gray-300 hover:text-black'}`}
                >
                  View full terms
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
)}
  </div>
  {/* Clientes / Parceiros */}
{portalContent?.clients?.enabled && portalContent.clients.items?.length > 0 && (
  <section className="py-20 bg-gray-50">
    <div className="max-w-7xl mx-auto px-6">
      <h3 className="text-center text-[10px] font-black uppercase tracking-[0.4em] mb-10">Trusted by Industry Leaders</h3>
      <div className="flex flex-wrap justify-center gap-12 grayscale opacity-70">
        {portalContent.clients.items.map((client: any, i: number) => (
          <img key={i} src={getImageUrl(client.logo)} alt={client.name} className="h-10" />
        ))}
      </div>
    </div>
  </section>
)}

{/* — Testemunhos: Estilo Editorial & Prestige — */}
{portalContent?.testimonials?.enabled && portalContent.testimonials.items?.length > 0 && (
  <section id="testimonials" className="py-24 bg-white relative overflow-hidden">
    
    {/* Aspas Decorativas Gigantes de Fundo */}
    <div className="absolute top-10 left-10 text-[20rem] font-serif text-gray-50 leading-none select-none -z-0">
      “
    </div>

    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Header Centralizado Minimalista */}
      <div className="text-center mb-20 space-y-4">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 block">
          Client Endorsements
        </span>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-black uppercase">
          Trusted by <span className="text-gray-300">Industry Leaders</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {portalContent.testimonials.items.map((t, i) => (
          <div 
            key={i} 
            className={`p-10 rounded-[3rem] flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:-translate-y-2
              ${i % 2 === 0 ? 'bg-[#f8f5f2] border-transparent' : 'bg-white border border-gray-100'}`}
          >
            {/* Rating & Quote Icon */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating || 5 }).map((_, k) => (
                  <svg key={k} className="w-3 h-3 text-blue-600 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-4xl font-serif text-blue-600/20 leading-none">”</span>
            </div>

            {/* Texto do Testemunho */}
            <blockquote className="flex-1">
              <p className="text-lg font-medium leading-relaxed text-black tracking-tight mb-8">
                "{t.text}"
              </p>
            </blockquote>

            {/* Assinatura do Cliente */}
            <div className="flex items-center gap-4 pt-6 border-t border-black/5">
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 grayscale hover:grayscale-0 transition-all">
                {t.avatar ? (
                  <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black text-white text-[10px] font-bold uppercase">
                    {t.name?.substring(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-black leading-none mb-1">{t.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {t.role} <span className="text-blue-500 mx-1">•</span> {t.company}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Marca d'água de autoridade no final da seção */}
      <div className="mt-20 flex justify-center opacity-30">
        <div className="h-[1px] w-20 bg-gray-300 self-center"></div>
        <span className="mx-6 text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Verifed Success Stories</span>
        <div className="h-[1px] w-20 bg-gray-300 self-center"></div>
      </div>
    </div>
  </section>
)}



{/* Item Details Modal - Luxury Boutique Style */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
    {/* Overlay com Blur Elegante */}
    <div 
      className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-500" 
      onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
    />

    <div className="relative w-full max-w-5xl bg-white rounded-[3rem] overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.3)] flex flex-col md:flex-row max-h-[92vh] border border-white/20">
      
      {/* Botão Fechar - Flutuante e Minimalista */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-8 right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md border border-gray-100 text-black hover:bg-black hover:text-white transition-all duration-500 shadow-sm"
      >
        <X size={20} />
      </button>

      {/* COLUNA ESQUERDA: Visual Showcase (Estilo Galeria) */}
      <div className="relative w-full md:w-[48%] bg-[#fbfbfb] overflow-hidden group">
        {(() => {
          const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
            ? selectedItem.images 
            : selectedItem.image ? [selectedItem.image] : [];

          if (itemImages.length > 0) {
            return (
              <div className="h-full flex flex-col items-center justify-center p-12">
                <div className="relative w-full h-full">
                  <img 
                    src={getImageUrl(itemImages[currentImgIndex])} 
                    className="w-full h-full object-cover rounded-[2rem] shadow-2xl transition-all duration-1000 group-hover:scale-105" 
                    alt={selectedItem.name} 
                  />
                  {/* Badge de Status Soft */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-black">Active Solution</span>
                    </div>
                  </div>
                </div>
                
                {/* Indicadores de Imagem Minimalistas */}
                {itemImages.length > 1 && (
                  <div className="absolute bottom-10 flex gap-3">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`h-1 rounded-full transition-all duration-500 ${idx === currentImgIndex ? 'w-10 bg-black' : 'w-4 bg-gray-200 hover:bg-gray-400'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div className="w-full h-full bg-[#f8f5f2] flex items-center justify-center">
              <Package size={64} strokeWidth={1} className="text-gray-300" />
            </div>
          );
        })()}
      </div>

      {/* COLUNA DIREITA: Conteúdo Editorial */}
      <div className="flex-1 flex flex-col min-h-0 bg-white p-10 md:p-16">
        <div className="flex-1 overflow-y-auto pr-6 scrollbar-hide">
          
          <div className="mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 mb-6">
              {selectedItem.category || selectedItem.type || activeCatalog}
            </span>
            <h3 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight tracking-tighter uppercase">
              {selectedItem.name}
            </h3>
            <p className="text-gray-500 text-base leading-relaxed font-medium">
              {selectedItem.description || "Our specialized advisory provides a robust framework for high-level operations and legal compliance."}
            </p>
          </div>

          {/* Grid de Especificações - Estilo Boutique */}
          <div className="space-y-12">
            <section>
              <h4 className="text-black text-[11px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <div className="w-6 h-[1px] bg-blue-600" /> Key Provisions
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {(selectedItem.includedItems || selectedItem.items || []).map((it, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-[#fbfbfb] hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100 group">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-bold text-gray-800 tracking-tight">
                      {it.productId?.name || it.description || "Feature Item"}
                    </span>
                    {it.quantity > 1 && (
                      <span className="ml-auto text-[10px] font-black text-gray-300 uppercase">Units: {it.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Métricas de Assinatura/Serviço */}
            {selectedItem.includedLimits?.length > 0 && (
              <div className="grid grid-cols-2 gap-6 pt-4">
                {selectedItem.includedLimits.map((l, i) => (
                  <div key={i} className="p-6 rounded-[2rem] bg-black text-white border border-white/5">
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">{l.description}</p>
                    <p className="text-2xl font-bold tracking-tighter">
                      {l.maxValue} <span className="text-xs font-medium text-gray-400">{l.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Ação com Valor */}
        <div className="pt-10 mt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col text-center md:text-left">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">Estimated Investment</span>
            <div className="text-4xl font-bold text-black tracking-tighter">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">{currency}</span>
            </div>
          </div>
          
          <button 
            onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); setCurrentImgIndex(0); }} 
            className="w-full md:w-auto px-12 py-5 bg-black text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-full hover:bg-blue-600 transition-all duration-500 shadow-2xl active:scale-95"
          >
            Request Engagement
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* CART MODAL – Luxury Legal & Advisory Edition */}
<div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 ${isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-all duration-500`}>
  
  {/* Overlay Sophistication */}
  <div
    className="absolute inset-0 bg-black/40 backdrop-blur-md"
    onClick={() => setIsCartOpen(false)}
  />

  {/* Modal Container */}
  <div
    className={`relative w-full max-w-7xl max-h-[92vh] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] rounded-[3rem] overflow-hidden flex flex-col transform transition-all duration-700 ${isCartOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-20'}`}
  >
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      
      {/* COLUNA ESQUERDA: Carrinho de Serviços */}
      <div className="flex-[1.4] flex flex-col min-h-0 bg-white">
        <div className="p-10 border-b border-gray-50 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-2 block">Service Selection</span>
            <h2 className="text-4xl font-bold text-black tracking-tighter uppercase leading-none">
              Your <span className="text-gray-300">Portfolio</span>
            </h2>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cart.length} Items Selected</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
          {cart.length > 0 ? (
            <div className="min-w-full">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr>
                    <th className="text-[9px] font-black uppercase tracking-widest text-gray-300 px-4">Description</th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-gray-300 text-center">Quantity</th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-gray-300 text-right">Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(cartItem => {
                    return (
                      <tr key={cartItem.itemId} className="group bg-[#fbfbfb] hover:bg-gray-50 transition-colors">
                        <td className="py-5 px-4 rounded-l-[1.5rem]">
                          <div className="flex gap-5 items-center">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center p-2 shrink-0">
                              <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-black tracking-tight uppercase">{cartItem.name}</p>
                              <button 
                                onClick={() => removeFromCart(cartItem.itemId)} 
                                className="flex items-center gap-1.5 text-[9px] text-red-400 hover:text-red-600 transition-colors mt-2 uppercase font-black tracking-widest"
                              >
                                <X size={10} /> Remove Selection
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="inline-flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-1.5 text-gray-400 hover:text-black"><Minus size={12} /></button>
                            <span className="px-3 text-xs font-bold text-black min-w-[30px]">{cartItem.quantity}</span>
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-1.5 text-gray-400 hover:text-black"><Plus size={12} /></button>
                          </div>
                        </td>
                        <td className="text-right px-4 rounded-r-[1.5rem]">
                          <p className="text-sm font-bold text-black tracking-tight">
                            {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] text-gray-400 font-medium">{currency}</span>
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
               <Briefcase size={48} strokeWidth={1} className="text-black mb-4" />
               <p className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Portfolio Empty</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-50 bg-gray-50/30">
          <button 
            onClick={() => setIsCartOpen(false)}
            className="flex items-center gap-3 text-black text-[10px] font-black uppercase tracking-[0.3em] group transition-all"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-2 transition-transform" /> Continue Browsing
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA: Engagement Details */}
      <div className="flex-1 bg-[#fbfbfb] border-l border-gray-50 p-8 md:p-10 flex flex-col overflow-y-auto scrollbar-hide">
        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-10">Client Information</h3>
        
        <div className="flex-1 space-y-10">
          {/* Formulário de Identificação */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Full Name / Corporate Entity" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-black placeholder:text-gray-300 focus:border-blue-600 outline-none transition-all shadow-sm" />
              <input placeholder="Professional E-mail" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-black placeholder:text-gray-300 focus:border-blue-600 outline-none transition-all shadow-sm" />
              <input type='number' placeholder="Contact Number" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-black placeholder:text-gray-300 focus:border-blue-600 outline-none transition-all shadow-sm" />
              
              {/* CAMPO DE DESCRIÇÃO DETALHADA OPCIONAL */}
              <textarea 
                placeholder="Specific Requirements or Case Notes (Optional)" 
                rows={3}
                value={client.notes || ""} 
                onChange={e => setClient({ ...client, notes: e.target.value })} 
                className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-black placeholder:text-gray-300 focus:border-blue-600 outline-none transition-all shadow-sm resize-none"
              />

              <div className="relative">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-black outline-none focus:border-blue-600 [color-scheme:light] shadow-sm" />
              </div>
            </div>

            {/* MADE TO ORDER - Elegante */}
            {cart.some(item => item.madeToOrder) && (
              <div className="pt-2">
                <div className="p-5 bg-blue-50/30 border border-blue-100 rounded-[1.5rem]">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="relative flex items-center pt-1">
                      <input 
                        type="checkbox" 
                        checked={cart.every(item => item.madeToOrder ? item.wantsOrder : true)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCart(prev => prev.map(i => i.madeToOrder ? { ...i, wantsOrder: checked } : i));
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border border-blue-200 checked:bg-blue-600 transition-all" 
                      />
                      <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" strokeWidth={4} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Request Custom Advisory</span>
                      <p className="text-[9px] text-blue-700/60 font-medium leading-tight mt-1">
                        Enable tailor-made legal structure for non-standard assets.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Settlement Selection */}
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Payment Protocol</label>
            <div className="grid grid-cols-2 gap-2">
              {['mpesa', 'visa', 'cash', 'transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                  className={`py-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${paymentMethod === m ? 'border-black bg-black text-white shadow-xl scale-[1.02]' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'}`}
                >
                  {m === 'transfer' ? 'Wire Transfer' : m}
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
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-600 transition-colors"
            />
            <p className="text-[10px] text-gray-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
          </div>

          {/* Dados Bancários Dinâmicos */}
          {paymentMethod === 'transfer' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-6 bg-white border border-gray-100 rounded-[2rem] space-y-4 shadow-sm">
                <h4 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-600" /> Banking Details
                </h4>
                {company.bankAccounts?.map((bank, idx) => (
                  <div key={idx} className="pb-4 last:pb-0 border-b last:border-0 border-gray-50">
                    <p className="text-[11px] font-bold text-black uppercase mb-2">{bank.bankName}</p>
                    <div className="space-y-1 bg-gray-50 p-3 rounded-xl">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400 font-bold uppercase">Account:</span>
                        <span className="font-mono font-bold">{bank.accountNumber}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400 font-bold uppercase">NIB:</span>
                        <span className="font-mono font-bold">{bank.nibOrIban}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Totais e Finalização */}
        <div className="mt-10 pt-10 border-t border-gray-100 space-y-8">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Total Investment</span>
              <span className="text-5xl font-bold text-black tracking-tighter leading-none">
                {totals.grandTotal.toLocaleString()}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-400 mb-1 tracking-widest">{currency}</span>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handlePayment}
              disabled={!paymentMethod || ['none', 'transfer', 'cash'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
              className="w-full py-5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-full hover:bg-blue-700 transition-all shadow-xl disabled:opacity-10 active:scale-95"
            >              
              {hasOrderWithPrice ? `Pay Retainer Fee (${total.grandTotal.toLocaleString()} ${currency})` : 'Authorize Online Payment'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || hasOrderWithPrice}
              className="w-full py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-full transition-all hover:bg-gray-800 disabled:opacity-20 active:scale-95 shadow-lg"
            >
              {paymentMethod === 'transfer' ? 'Confirm Wire Transfer' : 'Finalize Request'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Close Button X */}
    <button 
      onClick={() => setIsCartOpen(false)} 
      className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"
    >
      <X size={24} />
    </button>
  </div>
</div>

{/* Success Modal - Estilo Axion Logistics (Clean & Corporate) */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-white rounded-xl shadow-[0_40px_100px_rgba(0,0,0,0.25)] max-w-md w-full p-10 text-center relative overflow-hidden border border-gray-100"
      onClick={e => e.stopPropagation()}
    >
      {/* Detalhe Estético: Linha de "Status" no topo */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500" />
      
      <div className="relative z-10">
        {/* Ícone de Sucesso Sólido (Estilo Industrial) */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-50 border border-gray-100 rounded-full mb-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white shadow-xl">
            <Check size={32} strokeWidth={3} />
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <div className="flex justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-600 bg-green-50 px-4 py-1.5 rounded-sm border border-green-100">
              Despacho Confirmado
            </span>
          </div>
          
          <h2 className="text-4xl font-bold text-black leading-none tracking-tightest uppercase">
            Order <br /> <span className="text-gray-300">Successfully</span> <br /> Processed
          </h2>
          
          <p className="text-gray-500 text-sm leading-relaxed max-w-[300px] mx-auto font-medium">
            Sua solicitação foi registrada no nosso sistema de logística. Um e-mail com o manifesto e os próximos passos já foi enviado.
          </p>
        </div>

        {/* Botão de Ação Sólido */}
        <button
          onClick={closeSuccessModal}
          className="w-full py-5 bg-black text-white rounded-full transition-all hover:bg-gray-800 active:scale-95 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg mb-6"
        >
          Return to Dashboard
        </button>
        
        {/* Order ID Estilizado como 'Shipping Label' */}
        <div className="pt-8 border-t border-dashed border-gray-200 flex flex-col items-center gap-3">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
               Tracking ID / Reference
             </p>
           </div>
           <span className="font-mono text-lg font-bold text-black tracking-widest bg-gray-50 px-6 py-2 border border-gray-100 rounded-lg">
             AX-{Math.random().toString(36).substr(2, 6).toUpperCase()}
           </span>
           <p className="text-[9px] text-gray-300 font-medium">
             Conserve este código para consultas de suporte.
           </p>
        </div>
      </div>
    </div>
  </div>
)}
<footer className="bg-white pt-24 pb-12 overflow-hidden relative border-t border-gray-100">
  {/* Detalhe de Grid Técnico ao fundo (Opcional) */}
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', size: '30px 30px' }} />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
      
      {/* Coluna 1: Branding e Newsletter Industrial */}
      <div className="lg:col-span-4 space-y-10">
        <div className="flex items-center">
           {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-8 w-auto" />
      ) : (
        <span className="font-bold text-xl tracking-tighter text-black uppercase">/{company.name}</span>
      )}
        </div>
        
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs font-medium">
          Líder global em inteligência logística e infraestrutura tecnológica. Movendo o futuro com precisão absoluta.
        </p>
        
        {/* Newsletter Estilo Axion */}
        <div className="space-y-4 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Logistics Updates</p>
          <div className="flex p-1 bg-gray-50 border border-gray-100 rounded-full focus-within:border-black focus-within:bg-white transition-all shadow-sm">
            <input 
              type="email" 
              placeholder="Enter corporate email" 
              className="flex-1 px-6 bg-transparent text-black text-xs outline-none placeholder:text-gray-400 font-bold" 
            />
            <button className="px-8 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Links Rápidos */}
      <div className="lg:col-span-2 space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Operations</h4>
        <ul className="space-y-4">
          {['Global Fleet', 'Tracking', 'Warehouse', 'Solutions'].map(link => (
            <li key={link}>
              <a href="#" className="text-xs text-gray-600 hover:text-black transition-colors font-bold uppercase tracking-widest">{link}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Ajuda e Contato Direto */}
      <div className="lg:col-span-3 space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Direct Support</h4>
        <ul className="space-y-8">
          <li className="flex flex-col gap-1 border-l-2 border-gray-100 pl-4">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Hotline 24/7</span>
            <a href={`tel:${company.phone}`} className="text-black font-black text-xl hover:text-blue-600 transition-colors tracking-tighter">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col gap-1 border-l-2 border-gray-100 pl-4">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Compliance & Info</span>
            <a href={`mailto:${company.email}`} className="text-black font-black text-sm hover:text-blue-600 transition-colors tracking-tight break-all">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Social & Security */}
      <div className="lg:col-span-3 space-y-12">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-6">Connect</h4>
          <div className="flex gap-3">
            {[Instagram, Facebook, Linkedin].map((Icon, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-black hover:border-black transition-all duration-300 shadow-sm"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Accepted Protocols</p>
           <div className="flex flex-wrap gap-2">
              {['M-PESA', 'VISA', 'MASTERCARD'].map(p => (
                <div key={p} className="px-3 py-1 border border-gray-100 rounded text-[9px] font-black text-gray-400 grayscale hover:grayscale-0 transition-all">
                  {p}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Certificações e Legal */}
    <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="space-y-2 text-center md:text-left">
        <p className="text-[10px] font-black text-black uppercase tracking-[0.3em]">
          © 2026 {company.name} <span className="text-gray-300 font-medium">/ Infrastructure & Logistics</span>
        </p>
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
          High Performance Standards Guaranteed.
        </p>
      </div>
      
      <div className="flex gap-8">
        <a href="#" className="text-[9px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">Privacy Policy</a>
        <a href="#" className="text-[9px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">Service Terms</a>
      </div>

      {/* Status de Sistema (Agora integrado ao visual limpo) */}
      <div className="flex items-center gap-3 px-6 py-2 bg-gray-50 rounded-full border border-gray-100">
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
         <span className="text-[9px] font-black text-black uppercase tracking-[0.2em]">Operational Status: Online</span>
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

export default LawyerPortal;