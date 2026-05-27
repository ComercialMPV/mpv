// src/templates/public-portal/variants/CuidadorPortal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText,  Package, Menu, Lock, ArrowRight, ArrowLeft, ArrowUpRight, Layers, Settings, Utensils, Briefcase, PhoneCall, Heart, ChevronDown, ShoppingBag, ChevronLeft, ChevronRight, Play,Plus, Trash2,
  CheckCircle, Info, CreditCard, UtensilsCrossed, ShoppingCart, X,
  Search, Calendar, Minus, Check, User2, Eye,
  Zap,
  Linkedin,
  Instagram,
  Facebook,
  Leaf,
  Target,
  ShieldCheck,
  Star,
  Quote
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

interface CuidadorProps {
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
  madeToOrder?: boolean;
  orderPrice?: number;
  deliveryDays?: number;
  wantsOrder?: boolean;
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

const CuidadorPortal: React.FC<CuidadorProps> = ({ 
  company, 
  slug, 
  services: initialServices,
  products: initialProducts,
  bundles: initialBundles,
  portalContent = {
    hero: {
      headline: "Home Care Serviços",
      subheadline: "Serviços de Recrutamento, Treinamento e Intermediação de Profissionais Domésticos",
      backgroundImage: "https://i.pinimg.com/736x/65/9a/a2/659aa2282572a132c9fa145f166f07da.jpg"
    },
    about: {
      enabled: true,
      title: "Ajudando famílias a encontrar os melhores cuidadores de lar",
      body: "<p>Treinamento e intermediação de profissionais domésticos.</p>",
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [paymentMethod, setPaymentMethod] = useState<'mpesa'|'emola'|'visa'|'transfer'|'none'>('none');
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
    <div className="min-h-screen bg-[#f8f7f2] text-[#1a1a1a] font-sans overflow-x-hidden">
      <style>{`
        :root {
          --primary: #0E7D83;
          --primary-dark: #0a5e63;
          --primary-light: #2daab0;
          --primary-subtle: #e0f2f2;
          --accent: #E5E65D;
          --accent-dark: #c4c53d;
          --bg: #f8f7f2;
          --surface: #ffffff;
          --fg: #1a1a1a;
          --muted: #6b7280;
          --border: #e5e7eb;
          --border-light: #f3f4f6;
          --decor: #0a5e63;
        }
        @media (max-width: 768px) {
          .mobile-clip-none {
            clip-path: none !important;
            border-radius: 1.5rem !important;
          }
          .mobile-stack {
            flex-direction: column !important;
          }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 w-full z-[60] bg-[#f8f7f2] py-3 md:py-4">
        <div className="w-full bg-[#0E7D83] py-2 text-center text-[9px] md:text-[10px] text-white/80 uppercase tracking-widest mb-3 md:mb-4">
          Subscribe to our Newsletter for latest collections ↗
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between relative">
          {/* Left: Hamburger (mobile) + Nav (desktop) */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center bg-white rounded-full border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Menu"
            >
              <Menu size={16} />
            </button>

            <nav className={`hidden lg:flex items-center gap-2 transition-opacity duration-300 ${isSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              {['Home', 'Contribution', 'Our Mission'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="px-5 py-2 bg-white rounded-full text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-all border border-gray-100 whitespace-nowrap">
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Center: Logo */}
          <div className={`bg-white px-4 md:px-6 py-2 rounded-full border border-gray-100 shadow-sm transition-opacity ${isSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="h-5 md:h-6 w-auto" />
            ) : (
              <span className="font-bold text-base md:text-lg text-[#0E7D83]">Homecare</span>
            )}
          </div>

          {/* Right: Search, Cart, Desktop extras */}
          <div className="flex items-center gap-1 md:gap-2 z-10">
            <div className="flex items-center">
              {!isSearchOpen ? (
                <button 
                  onClick={() => setIsSearchOpen(true)} 
                  className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-[#E5E65D] rounded-full text-black hover:scale-105 transition-transform"
                >
                  <Search size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-2 md:gap-3 bg-white border border-gray-200 px-3 md:px-4 py-2 rounded-full animate-in fade-in zoom-in-95 duration-300 w-[180px] sm:w-[250px] md:w-[320px] lg:w-[400px] shadow-sm">
                  <Search size={16} className="text-[#0E7D83] shrink-0" />
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Search services..."
                    className="bg-transparent border-none outline-none text-sm w-full min-w-0 placeholder:text-gray-400 text-gray-800"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {!isSearchOpen && (
              <>
                <div className="hidden lg:flex items-center gap-2">
                  {['Solutions', 'Projects'].map((item) => (
                    <a key={item} href={`#${item.toLowerCase()}`} className="px-5 py-2 bg-white rounded-full text-[13px] font-medium text-gray-700 border border-gray-100 whitespace-nowrap">
                      {item}
                    </a>
                  ))}
                </div>

                <button className="hidden sm:block px-4 md:px-6 py-2 bg-[#E5E65D] rounded-full text-[12px] md:text-[13px] font-bold text-black hover:brightness-95 transition-all whitespace-nowrap">
                  Get Started
                </button>
              </>
            )}

            <button 
              onClick={() => setIsCartOpen(true)} 
              className={`relative p-2 text-[#0E7D83] transition-opacity ${isSearchOpen ? 'hidden lg:block' : 'block'}`}
            >
              <Briefcase size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 mt-3 pt-3 px-4 md:px-6 pb-4 bg-[#f8f7f2]">
            <div className="flex flex-col gap-2">
              {['Home', 'Contribution', 'Our Mission', 'Solutions', 'Projects'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-5 py-3 bg-white rounded-full text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-all border border-gray-100"
                >
                  {item}
                </a>
              ))}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-5 py-3 bg-[#E5E65D] rounded-full text-[13px] font-bold text-black hover:brightness-95 transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="bg-[#f8f7f2] px-4 md:px-6 pb-8 md:pb-10">
        <div className="max-w-7xl mx-auto bg-[#0E7D83] rounded-[32px] md:rounded-[60px] relative overflow-hidden md:min-h-[700px] px-0 lg:px-0">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

          <div className="flex flex-col lg:grid lg:grid-cols-12 w-full relative z-10 lg:min-h-[700px]">
            <div className="w-full lg:col-span-6 flex items-center px-6 lg:px-12 xl:px-16 py-8 lg:py-16">
              <div className="space-y-6 md:space-y-8 w-full">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs md:text-sm">Meet With</span>
                  <div className="w-12 h-[1px] bg-white/40" />
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                  {portalContent?.hero?.headline || "We provide top-notch residential and commercial cleaning services tailored to your needs. Trusted, trained, and always on time."}
                </h1>

                <p className="text-white/60 max-w-md text-sm md:text-lg leading-relaxed">
                  {portalContent?.hero?.subheadline || "We provide top-notch residential and commercial cleaning services tailored to your needs. Trusted, trained, and always on time."}
                </p>

                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <button className="px-6 md:px-8 py-3 md:py-4 bg-[#E5E65D] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-lg text-sm md:text-base">
                    See Our Services
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full lg:col-span-6 lg:min-h-[700px] flex mt-6 lg:mt-0">
              <div className="relative w-full h-full">
                <img 
                  src={getImageUrl(portalContent?.hero?.backgroundImage) || "URL_DA_PROFISSIONAL_LIMPEZA"} 
                  alt="Cleaning Professional" 
                  className="w-full h-full object-cover min-h-[300px] sm:min-h-[400px] md:min-h-[550px] lg:min-h-[700px]" 
                />
                <div className="absolute bottom-4 md:bottom-10 left-4 md:left-auto right-4 md:right-20 bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl flex items-center gap-3 md:gap-4">
                  <div>
                    <div className="text-xl md:text-2xl font-black text-[#0E7D83]">5.1K</div>
                    <div className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold">All Over World</div>
                  </div>
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OVERLAY DE PESQUISA */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] pointer-events-none transition-opacity" />
      )}

      {/* ABOUT SECTION */}
      {portalContent?.about?.enabled && (
        <section id="about" className="py-16 md:py-24 bg-[#f8f7f2] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="w-full space-y-6 md:space-y-8 order-2 lg:order-1">
                <div className="space-y-4 md:space-y-6">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#0E7D83]">
                    {portalContent.about.title ? (
                      <>
                        {portalContent.about.title.split(' ')[0]}{' '}
                        <span className="relative inline-block">
                          <span className="relative z-10 bg-[#E5E65D] px-1 md:px-2 rounded-lg">
                            {portalContent.about.title.split(' ')[1]}
                          </span>
                        </span>
                        {' '}{portalContent.about.title.split(' ').slice(2).join(' ')}
                      </>
                    ) : (
                      <>
                        Cleaning <span className="bg-[#E5E65D] px-2 rounded-lg">With Care</span>, Backed By Trust
                      </>
                    )}
                  </h2>

                  <div 
                    className="text-base md:text-lg leading-relaxed text-gray-600 max-w-xl" 
                    dangerouslySetInnerHTML={{ __html: portalContent.about.body || 'We understand your home is personal. That’s why we bring respect, consistency, and genuine care.' }} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    'Respect for Team', 
                    'Consistent Quality', 
                    'Unique Needs', 
                    'Secure Key Handling'
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#E5E65D] flex items-center justify-center shrink-0">
                        <Check size={10} className="text-[#0E7D83] stroke-[4px]" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-[#0E7D83]">{item}</span>
                    </div>
                  ))}
                </div>

                <button className="px-8 md:px-10 py-3 md:py-4 bg-[#0E7D83] text-white font-bold rounded-full hover:bg-[#0a5e63] transition-all shadow-lg text-sm md:text-base">
                  Learn More
                </button>
              </div>

              <div className="relative w-full order-1 lg:order-2 flex justify-center">
                <div className="relative w-full max-w-[320px] sm:max-w-[400px] md:max-w-[500px] aspect-square">
                  <div className="absolute inset-0 z-0">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-[#0a5e63] opacity-10">
                      <path d="M40,-62.7C53.3,-54.1,66.5,-45.4,74.2,-33.1C81.9,-20.8,84.1,-4.9,80.1,9.8C76.1,24.5,65.9,38,54,48.5C42.1,59,28.5,66.5,13.8,70.1C-0.9,73.7,-16.7,73.4,-31.1,67.8C-45.5,62.2,-58.5,51.3,-67.2,38.1C-75.9,24.9,-80.3,9.4,-77.8,-4.9C-75.3,-19.2,-65.9,-32.3,-54.7,-41.8C-43.5,-51.3,-30.5,-57.2,-17.7,-65.5C-4.9,-73.8,7.8,-84.5,22.2,-82.1C36.6,-79.7,52.6,-64.1,40,-62.7Z" transform="translate(100 100)" />
                    </svg>
                  </div>

                  <div className="relative z-10 w-full h-full rounded-full border-[8px] md:border-[12px] border-white shadow-2xl overflow-hidden flex items-center justify-center">
                    {portalContent.about.image ? (
                      <img 
                        src={getImageUrl(portalContent.about.image)} 
                        alt="About Us" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img 
                        src="https://images.unsplash.com/photo-1581578731548-c64695cc6954?auto=format&fit=crop&q=80" 
                        alt="Placeholder"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="absolute -top-3 md:-top-4 -left-3 md:-left-4 w-14 h-14 md:w-20 md:h-20 bg-[#0a5e63] rounded-full flex items-center justify-center shadow-lg border-4 border-white rotate-[-15deg] z-20">
                    <Leaf className="text-white" size={20} />
                  </div>
                  <div className="absolute -bottom-3 md:-bottom-4 -right-3 md:-right-4 w-12 h-12 md:w-16 md:h-16 bg-[#0a5e63] rounded-full flex items-center justify-center shadow-lg border-4 border-white rotate-[165deg] z-20">
                    <Leaf className="text-white" size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SERVICES SECTION */}
      {filteredServices.length > 0 && (
        <section id="services" className="py-16 md:py-24 bg-[#f8f7f2]">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-6 md:gap-8 mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0E7D83] leading-tight">
                How Our {company.name || "Cleaning"} <br /> Service Works
              </h2>
              <p className="text-gray-500 text-xs md:text-sm md:border-l border-gray-200 md:pl-8">
                Getting your space professionally cleaned is easier than ever — just follow these simple steps or explore our specialized areas.
              </p>
              <div className="flex justify-start md:justify-end">
                <button className="flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 border border-[#0E7D83] rounded-full text-[#0E7D83] font-bold hover:bg-[#0E7D83] hover:text-white transition-all duration-300 text-sm">
                  Read More <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4">
              {filteredServices.slice(0, visibleServices).map((item, index) => {
                const gridSpans = [
                  "sm:col-span-1 lg:col-span-4 min-h-[280px] md:h-[350px]",
                  "sm:col-span-1 lg:col-span-5 min-h-[280px] md:h-[350px]",
                  "sm:col-span-1 lg:col-span-3 min-h-[280px] md:h-[350px]",
                  "sm:col-span-2 lg:col-span-7 min-h-[320px] md:h-[450px]",
                  "sm:col-span-1 lg:col-span-5 min-h-[320px] md:h-[450px]",
                ];
                const currentSpan = gridSpans[index % gridSpans.length];

                return (
                  <div
                    key={item._id}
                    onClick={() => openItem(item, 'services')}
                    className={`group relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden cursor-pointer bg-white transition-all duration-500 shadow-sm hover:shadow-xl ${currentSpan}`}
                  >
                    <div className="absolute inset-0 z-0">
                      {item.images?.length > 0 ? (
                        <img 
                          src={getImageUrl(item.images[0])} 
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#f1ebe5]" />
                      )}
                    </div>

                    <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-[#E5E65D] rounded-full flex items-center justify-center text-[#0E7D83] shadow-lg group-hover:rotate-45 transition-transform duration-500">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>

                    <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 z-20">
                      <div className="bg-white/60 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/40">
                        <h3 className="text-base md:text-lg font-bold text-[#0E7D83] mb-1">
                          {item.name}
                        </h3>
                        <p className="text-[#0E7D83]/80 text-[10px] md:text-[11px] line-clamp-2 leading-relaxed">
                          {item.description || "Top-notch cleaning services tailored to your specific household or commercial needs."}
                        </p>
                      </div>
                    </div>

                    {index === 3 && (
                      <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-30">
                        <span className="bg-[#0E7D83] text-white text-[9px] md:text-[10px] px-3 md:px-4 py-1.5 md:py-2 rounded-full font-bold whitespace-nowrap shadow-xl">
                          Being Popular
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {visibleServices < filteredServices.length && (
              <div className="mt-12 md:mt-16 flex justify-center">
                <button 
                  onClick={() => setVisibleServices(prev => prev + 3)}
                  className="group flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-[#0E7D83] text-white rounded-full font-bold hover:scale-105 transition-all shadow-lg text-sm"
                >
                  Expand Services
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MISSION, VISION, VALUES */}
      {portalContent?.missionVision?.enabled && (
        <section className="py-16 md:py-24 bg-[#f8f7f2] px-4 md:px-6">
          <div className="max-w-7xl mx-auto bg-[#0E7D83] rounded-[32px] md:rounded-[60px] pt-16 md:pt-20 pb-24 md:pb-28 px-6 md:px-10 relative overflow-hidden text-center">
            <div className="absolute top-8 md:top-10 left-6 md:left-10 opacity-20 rotate-12">
              <Leaf size={36} className="text-white/30" />
            </div>
            <div className="absolute top-8 md:top-10 right-10 md:right-20 opacity-20 -rotate-12">
              <Leaf size={24} className="text-white/30" />
            </div>

            <div className="relative z-10 mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                What Makes Us the <br />
                <span className="text-[#E5E65D]">Right Choice</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
              <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-left transition-transform hover:scale-[1.02] md:hover:scale-105 duration-300 sm:-rotate-1 lg:-rotate-2 origin-bottom-right shadow-xl">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#E5E65D] rounded-xl flex items-center justify-center mb-4 md:mb-6 shadow-sm">
                  <Target size={20} className="text-[#0E7D83]" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#0E7D83] mb-3 md:mb-4">
                  {portalContent?.missionVision?.mission?.title || "Mission"}
                </h3>
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-4 md:mb-6">
                  {portalContent?.missionVision?.mission?.content || "To provide strategic intelligence that empowers our clients to navigate complex environments with absolute confidence."}
                </p>
                <button className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#0E7D83] border-b-2 border-[#E5E65D]">
                  Learn More
                </button>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-left transition-transform hover:scale-[1.02] md:hover:scale-105 duration-300 sm:rotate-1 lg:rotate-2 origin-bottom-left shadow-xl">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#E5E65D] rounded-xl flex items-center justify-center mb-4 md:mb-6 shadow-sm">
                  <Eye size={20} className="text-[#0E7D83]" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#0E7D83] mb-3 md:mb-4">
                  {portalContent?.missionVision?.vision?.title || "Vision"}
                </h3>
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-4 md:mb-6">
                  {portalContent?.missionVision?.vision?.content || "To be recognized globally as the standard of excellence, bridging the gap between innovation and traditional values."}
                </p>
                <button className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#0E7D83] border-b-2 border-[#E5E65D]">
                  Learn More
                </button>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-left transition-transform hover:scale-[1.02] md:hover:scale-105 duration-300 shadow-xl md:col-span-2 lg:col-span-1">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#E5E65D] rounded-xl flex items-center justify-center mb-4 md:mb-6 shadow-sm">
                  <ShieldCheck size={20} className="text-[#0E7D83]" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#0E7D83] mb-3 md:mb-4">
                  {portalContent?.missionVision?.values?.title || "Core Values"}
                </h3>
                <ul className="grid grid-cols-2 gap-y-2 md:gap-y-3">
                  {(portalContent?.missionVision?.values?.items?.length > 0 
                    ? portalContent.missionVision.values.items 
                    : ["Integrity", "Innovation", "Precision", "Success"]
                  ).map((v, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] md:text-xs font-bold text-gray-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0a5e63] shrink-0" />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20">
              <button className="bg-[#E5E65D] text-[#0E7D83] px-8 md:px-12 py-4 md:py-5 rounded-full font-black uppercase tracking-widest text-[11px] md:text-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:scale-110 transition-transform">
                Get Started
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PRODUCTS SECTION */}
      {filteredProducts.length > 0 && (
        <section className="py-16 md:py-24 bg-[#f8f7f2] text-[#0E7D83] relative overflow-hidden">
          <div className="absolute top-8 md:top-10 left-6 md:left-10 opacity-10 rotate-12">
            <Leaf size={48} className="text-[#0a5e63]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="mb-12 md:mb-16 flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 items-end">
              <div>
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="w-8 md:w-12 h-[1px] bg-[#0E7D83]" />
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60">
                    Curated Resources
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                  Expert Solutions for <br /> Premium Operations
                </h2>
              </div>
              <div className="flex flex-col lg:items-end gap-4 md:gap-6">
                <p className="text-gray-500 text-xs md:text-sm max-w-md lg:text-right">
                  Explore our full range of professional toolkits and assets designed to keep every aspect of your business comfortable and inviting.
                </p>
                <div className="flex gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-white hover:text-[#0E7D83] transition-all cursor-pointer">
                    <ChevronLeft size={16} />
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#0E7D83] flex items-center justify-center text-white shadow-lg cursor-pointer">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 4)).map((item, index) => {
                const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.image;
                const imageUrl = getImageUrl(firstImage || '');
                const isFirst = index === 0;

                return (
                  <div
                    key={item._id}
                    onClick={() => openItem(item, 'products')}
                    className={`group relative flex flex-col transition-all duration-500 cursor-pointer rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl ${
                      isFirst ? 'bg-[#0E7D83] text-white' : 'bg-white text-[#0E7D83]'
                    }`}
                  >
                    <div className="p-5 md:p-8 pb-3 md:pb-4">
                      <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className={`px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[10px] font-bold border ${
                          isFirst ? 'border-white/20 text-white' : 'border-gray-100 text-gray-500'
                        }`}>
                          {item.category || 'Premium'}
                        </div>
                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
                          isFirst ? 'bg-[#E5E65D] text-[#0E7D83]' : 'bg-[#0E7D83] text-white'
                        }`}>
                          <ArrowUpRight size={14} />
                        </div>
                      </div>

                      <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 leading-tight">
                        {item.name}
                      </h3>
                      <p className={`text-[11px] md:text-xs leading-relaxed line-clamp-3 mb-3 md:mb-4 ${
                        isFirst ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {item.description || "Sophisticated infrastructure designed for elite business operations."}
                      </p>
                      <span className="text-xs md:text-sm font-black opacity-80">
                        {getItemPrice(item).toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="mt-auto px-4 md:px-4 pb-4 md:pb-4">
                      <div className="h-40 md:h-60 w-full overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Package className="text-gray-300" size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 md:mt-20 flex justify-center">
              <button 
                onClick={() => setShowAllProducts(prev => !prev)}
                className="group flex items-center gap-3 px-8 md:px-10 py-3 md:py-4 bg-[#0E7D83] text-white text-[11px] md:text-xs font-bold uppercase tracking-widest rounded-full shadow-xl hover:bg-[#0a5e63] transition-all"
              >
                {showAllProducts ? 'Show Less' : 'Join Our Program'}
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#E5E65D] flex items-center justify-center text-[#0E7D83]">
                  <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* BUNDLES - COMBO */}
      {filteredBundles.some(b => b.type === 'Combo') && (
        <section className="py-16 md:py-24 bg-[#f8f7f2] relative overflow-hidden">
          <div className="absolute -bottom-20 -left-20 opacity-5 pointer-events-none">
            <Leaf size={200} className="text-[#0E7D83]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-xl">
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="w-8 md:w-12 h-[1px] bg-[#0E7D83]" />
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[#0E7D83] opacity-60">
                    Strategic Alliances
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0E7D83] tracking-tight leading-tight">
                  Comprehensive <span className="text-[#0a5e63]">Service Bundles</span>
                </h2>
              </div>
              <p className="text-gray-500 text-xs md:text-sm max-w-xs md:text-right">
                Integrated solutions designed to provide full protection and scalability for your business operations.
              </p>
            </div>

            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-8 md:pb-12 pt-4 scrollbar-hide snap-x">
              {filteredBundles
                .filter(item => item.type === 'Combo')
                .map((item, index) => {
                  const image = getImageUrl(item.image || '');
                  return (
                    <div
                      key={item._id}
                      onClick={() => openItem(item, 'bundles')}
                      className="group relative min-w-[85vw] sm:min-w-[400px] md:min-w-[500px] lg:min-w-[750px] snap-center transition-all duration-500 cursor-pointer"
                    >
                      <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 h-full border border-gray-100 shadow-sm hover:shadow-2xl transition-all">
                        <div className="w-full md:w-[300px] lg:w-[350px] h-[220px] md:h-[350px] lg:h-[400px] rounded-[1.8rem] md:rounded-[2.8rem] overflow-hidden relative shrink-0">
                          <img 
                            src={image} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                          />
                          <div className="absolute top-4 md:top-6 left-4 md:left-6 bg-[#E5E65D] text-[#0E7D83] text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full uppercase tracking-tighter shadow-lg">
                            Best Value Pack
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-2 md:py-4 pr-0 md:pr-4">
                          <div>
                            <div className="flex justify-between items-start mb-4 md:mb-6">
                              <span className="text-[10px] md:text-[11px] font-black text-[#0a5e63] uppercase tracking-widest">
                                Bundle Solution {index + 1 < 10 ? `0${index + 1}` : index + 1}
                              </span>
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#f8f7f2] flex items-center justify-center text-[#0E7D83] group-hover:bg-[#E5E65D] transition-colors duration-500">
                                <ArrowUpRight size={18} />
                              </div>
                            </div>

                            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#0E7D83] mb-4 md:mb-6 tracking-tight leading-none">
                              {item.name}
                            </h3>

                            <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-6 md:mb-8 line-clamp-3">
                              {item.description || "A cohesive selection of professional frameworks designed to scale your business with maximum efficiency."}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-t border-gray-50 pt-6 md:pt-8 gap-4 sm:gap-0">
                            <div className="space-y-1">
                              <span className="text-[9px] md:text-[10px] font-bold text-gray-300 uppercase tracking-widest block">Retainer Investment</span>
                              <div className="text-2xl md:text-3xl font-black text-[#0E7D83]">
                                {getItemPrice(item).toLocaleString()} <span className="text-[10px] opacity-40 font-medium">{currency}</span>
                              </div>
                            </div>

                            <button className="bg-[#0E7D83] text-white px-6 md:px-8 py-3 md:py-4 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-[#0a5e63] transition-all w-full sm:w-auto justify-center">
                              Get Bundle <Layers size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex flex-col items-center mt-8 md:mt-12 gap-3 md:gap-4">
              <div className="w-32 md:w-48 h-[3px] bg-gray-200 rounded-full overflow-hidden">
                <div className="bg-[#0E7D83] h-full w-1/3 rounded-full" />
              </div>
              <span className="text-[9px] md:text-[10px] font-black text-[#0E7D83] uppercase tracking-[0.4em]">
                Scroll to explore
              </span>
            </div>
          </div>
        </section>
      )}

      {/* SUBSCRIPTIONS */}
      {filteredBundles.some(b => b.type === 'Subscription') && (
        <section className="py-16 md:py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-10">
            <div className="flex flex-col items-center text-center mb-12 md:mb-16">
              <span className="bg-[#E5E65D] text-[#0E7D83] text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-1 rounded-full mb-3 md:mb-4">
                Plans
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0E7D83] mb-2 md:mb-4">
                Pricing Plans
              </h2>
              <p className="text-gray-400 text-xs md:text-sm mb-6 md:mb-10">
                Check our easy and simple plans
              </p>

              <div className="flex items-center gap-4">
                <span className="text-[11px] md:text-xs font-bold text-gray-400">Yearly</span>
                <div className="w-12 md:w-14 h-6 md:h-7 bg-[#f8f7f2] rounded-full p-1 flex items-center relative cursor-pointer border border-gray-100">
                  <div className="w-[18px] md:w-5 h-[18px] md:h-5 bg-[#E5E65D] rounded-full shadow-sm" />
                </div>
                <span className="text-[11px] md:text-xs font-bold text-gray-400">Monthly</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-stretch">
              {filteredBundles.filter(item => item.type === 'Subscription').map((plan, index) => {
                const isDark = index % 2 === 0;

                return (
                  <div 
                    key={plan._id} 
                    className={`relative p-8 md:p-12 flex flex-col group transition-all duration-500 mobile-clip-none
                      ${isDark ? 'bg-[#0E7D83] text-white' : 'bg-[#f8f7f2] text-[#0E7D83]'}
                    `}
                    style={{
                      clipPath: 'polygon(0 0, 65% 0, 100% 15%, 100% 100%, 0 100%)',
                      borderRadius: '2rem'
                    }}
                  >
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">
                        {plan.name}
                      </h3>
                      <p className={`text-[11px] md:text-xs opacity-70 mb-4 md:mb-6`}>
                        {plan.description || "Our individual law-tech solutions."}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-bold">
                          ${getItemPrice(plan).toLocaleString()}
                        </span>
                        <span className="text-xs md:text-sm opacity-60">/mo</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 md:mb-6 opacity-80">Includes</p>
                      <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                        {plan.includedLimits?.map((limit: any, i: number) => (
                          <li key={i} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                            <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#0E7D83]/10'}`}>
                              <Check size={10} className={isDark ? 'text-[#E5E65D]' : 'text-[#0E7D83]'} strokeWidth={3} />
                            </div>
                            <span className="opacity-90">{limit.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button 
                      onClick={() => { addToCart(plan, 'bundles'); }} 
                      className={`w-full py-3 md:py-4 rounded-full font-bold text-[11px] md:text-sm transition-all active:scale-95
                        ${isDark 
                          ? 'bg-[#E5E65D] text-[#0E7D83] hover:bg-white' 
                          : 'bg-[#0E7D83] text-white hover:bg-[#0E7D83]/90'}`}
                    >
                      Get This Plan
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CLIENTS / PARTNERS */}
      {portalContent?.clients?.enabled && portalContent.clients.items?.length > 0 && (
        <section className="py-16 md:py-24 bg-[#f8f7f2] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#0E7D83]/10 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center mb-12 md:mb-16">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-6 md:w-8 h-[1px] bg-[#0E7D83] opacity-20" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-[#0E7D83] opacity-60">
                  Trusted by Industry Leaders
                </span>
                <div className="w-6 md:w-8 h-[1px] bg-[#0E7D83] opacity-20" />
              </div>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-x-12 md:gap-x-16 gap-y-8 md:gap-y-12">
              {portalContent.clients.items.map((client: any, i: number) => (
                <div 
                  key={i} 
                  className="group relative flex items-center justify-center transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-white blur-2xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
                  <img 
                    src={getImageUrl(client.logo)} 
                    alt={client.name} 
                    className="h-6 md:h-10 w-auto object-contain grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 relative z-10" 
                  />
                </div>
              ))}
            </div>

            <div className="mt-12 md:mt-16 flex justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-[#E5E65D]" />
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {portalContent?.testimonials?.enabled && portalContent.testimonials.items?.length > 0 && (
        <section id="testimonials" className="py-16 md:py-24 bg-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 opacity-[0.03] rotate-12 pointer-events-none">
            <Quote size={300} className="text-[#0E7D83]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center mb-16 md:mb-20">
              <span className="bg-[#E5E65D] text-[#0E7D83] text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] px-4 md:px-5 py-1.5 rounded-full mb-4 md:mb-6">
                Testimonials
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0E7D83] tracking-tight leading-none">
                Trusted by <span className="text-[#0a5e63]">Industry Leaders</span>
              </h2>
              <div className="mt-4 md:mt-6 w-10 md:w-12 h-1 bg-[#0E7D83] rounded-full opacity-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {portalContent.testimonials.items.map((t, i) => {
                const isFeatured = i === 1;

                return (
                  <div 
                    key={i} 
                    className={`p-8 md:p-10 flex flex-col justify-between transition-all duration-500 hover:shadow-xl mobile-clip-none
                      ${isFeatured 
                        ? 'bg-[#0E7D83] text-white' 
                        : 'bg-[#f8f7f2] text-[#0E7D83]'
                      }`}
                    style={{
                      clipPath: 'polygon(0 0, 85% 0, 100% 10%, 100% 100%, 0 100%)',
                      borderRadius: '2rem'
                    }}
                  >
                    <div>
                      <div className="flex gap-1 mb-6 md:mb-8">
                        {Array.from({ length: t.rating || 5 }).map((_, k) => (
                          <Star key={k} size={12} className="fill-[#E5E65D] text-[#E5E65D]" />
                        ))}
                      </div>

                      <blockquote className="relative">
                        <p className={`text-base md:text-lg font-bold leading-snug tracking-tight mb-8 md:mb-10 ${isFeatured ? 'text-white' : 'text-[#0E7D83]'}`}>
                          "{t.text}"
                        </p>
                      </blockquote>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 pt-6 md:pt-8 border-t border-current opacity-20">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition-all border border-current opacity-40">
                        {t.avatar ? (
                          <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-bold text-[10px] uppercase ${isFeatured ? 'bg-white text-[#0E7D83]' : 'bg-[#0E7D83] text-white'}`}>
                            {t.name?.substring(0, 2)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-[11px] md:text-sm uppercase tracking-tighter leading-none mb-1">{t.name}</p>
                        <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-60`}>
                          {t.role} <span className="mx-1">/</span> {t.company}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 md:mt-20 flex flex-col items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#E5E65D]" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-[#0E7D83] opacity-30">
                  Verified Success Stories
                </span>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#E5E65D]" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ITEM DETAILS MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-[#0E7D83]/40 backdrop-blur-xl transition-opacity duration-700" 
            onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
          />

          <div className="relative w-full max-w-full lg:max-w-6xl bg-[#f8f7f2] shadow-[-20px_0_80px_rgba(0,0,0,0.2)] h-full overflow-y-auto animate-in slide-in-from-right duration-500">
            <button 
              onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
              className="fixed top-4 right-4 md:top-8 md:right-8 z-[110] w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-[#E5E65D] text-[#0E7D83] hover:bg-[#0E7D83] hover:text-white transition-all duration-500 shadow-xl"
            >
              <X size={20} strokeWidth={3} />
            </button>

            <div className="flex flex-col lg:flex-row lg:min-h-screen">
              <div className="relative w-full lg:w-[60%] lg:h-screen bg-[#0E7D83] p-6 md:p-8 lg:p-12 flex flex-col">
                <div className="flex items-center gap-4 mb-6 md:mb-12">
                  <div className="w-8 md:w-10 h-[1px] bg-[#E5E65D]" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-[#E5E65D]">
                    Product Deep Dive
                  </span>
                </div>

                <div className="flex-1 relative group">
                  {(() => {
                    const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
                      ? selectedItem.images 
                      : selectedItem.image ? [selectedItem.image] : [];
                    const imageUrl = getImageUrl(itemImages[currentImgIndex] || '');
                    return (
                      <div className="w-full h-full">
                        <div 
                          className="w-full h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-1000"
                          style={{ clipPath: 'polygon(0 0, 90% 0, 100% 10%, 100% 100%, 0 100%)' }}
                        >
                          {imageUrl ? (
                            <img src={imageUrl} className="w-full h-full object-cover" alt={selectedItem.name} />
                          ) : (
                            <div className="w-full h-full bg-[#0a5e63] flex items-center justify-center">
                              <Package size={60} className="text-[#0E7D83]" />
                            </div>
                          )}
                        </div>

                        {itemImages.length > 1 && (
                          <div className="absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 flex gap-3 md:gap-4 bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-full border border-white/10">
                            {itemImages.map((_, idx) => (
                              <button 
                                key={idx}
                                onClick={() => setCurrentImgIndex(idx)}
                                className={`h-2 rounded-full transition-all duration-500 ${idx === currentImgIndex ? 'w-8 md:w-12 bg-[#E5E65D]' : 'w-2 bg-white/30'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex-1 p-6 md:p-8 lg:p-20 flex flex-col lg:justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6 md:mb-10">
                    <span className="text-[9px] md:text-[10px] font-black text-[#0a5e63] uppercase tracking-widest px-3 md:px-4 py-1.5 md:py-2 bg-[#0E7D83]/5 rounded-full">
                      {selectedItem.category || 'Premium Service'}
                    </span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => <Star key={s} size={10} className="fill-[#E5E65D] text-[#E5E65D]" />)}
                    </div>
                  </div>

                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0E7D83] mb-6 md:mb-8 tracking-tighter leading-[0.9]">
                    {selectedItem.name}
                  </h3>

                  <p className="text-gray-500 text-sm md:text-base lg:text-lg leading-relaxed mb-8 md:mb-12 font-medium">
                    {selectedItem.description || "Sophisticated framework designed for modern operations with emphasis on efficiency and long-term scalability."}
                  </p>

                  <div className="space-y-3 md:space-y-4 mb-8 md:mb-12">
                    <h4 className="text-[#0E7D83] text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-4 md:mb-6">Core Provisions</h4>
                    {(selectedItem.includedItems || selectedItem.items || []).slice(0, 5).map((it, i) => (
                      <div key={i} className="flex items-center gap-3 md:gap-4 py-3 md:py-4 border-b border-gray-100 group">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#0E7D83] flex items-center justify-center text-[#E5E65D] group-hover:scale-110 transition-transform">
                          <Check size={10} strokeWidth={4} />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-[#0E7D83]">{it.productId?.name || it.description || "Strategic Asset"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 md:pt-12 border-t border-gray-200">
                  <div className="flex flex-col gap-6 md:gap-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Service Investment</span>
                        <div className="text-3xl md:text-4xl lg:text-5xl font-black text-[#0E7D83] tracking-tighter">
                          {getItemPrice(selectedItem).toLocaleString()} <span className="text-base md:text-lg opacity-40">{currency}</span>
                        </div>
                      </div>
                      {selectedItem.billingCycle && (
                        <span className="text-[11px] md:text-xs font-bold text-[#0a5e63] uppercase mb-2">Billed {selectedItem.billingCycle}</span>
                      )}
                    </div>

                    <button 
                      onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); }}
                      className="w-full py-4 md:py-6 bg-[#0E7D83] text-[#E5E65D] font-black text-[10px] md:text-xs uppercase tracking-[0.5em] rounded-full shadow-2xl hover:bg-[#0a5e63] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 md:gap-4"
                    >
                      Apply for Access <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART MODAL */}
      <div className={`fixed inset-0 z-[100] flex justify-end ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-[#0E7D83]/60 backdrop-blur-xl transition-opacity duration-700 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsCartOpen(false)}
        />

        <div
          className={`relative w-full max-w-full lg:max-w-6xl bg-[#f8f7f2] shadow-[-20px_0_80px_rgba(0,0,0,0.3)] h-full transform transition-all duration-700 ease-out flex flex-col overflow-y-auto lg:overflow-hidden ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <button 
            onClick={() => setIsCartOpen(false)} 
            className="absolute top-4 right-4 md:top-8 md:right-8 z-[110] w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-[#E5E65D] text-[#0E7D83] hover:bg-[#0E7D83] hover:text-white transition-all duration-500 shadow-xl"
          >
            <X size={20} strokeWidth={3} />
          </button>

          <div className="flex flex-col lg:flex-row lg:h-full lg:overflow-hidden">
            <div className="lg:flex-[1.4] lg:flex lg:flex-col bg-white lg:rounded-r-[4rem] shadow-xl z-10">
              <div className="p-6 md:p-10 lg:p-16 border-b border-gray-50">
                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className="w-8 md:w-10 h-[1px] bg-[#0E7D83]" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-[#0E7D83]">Service Portfolio</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0E7D83] tracking-tighter uppercase leading-none">
                  Selected <span className="opacity-20 italic font-serif lowercase">Assets</span>
                </h2>
              </div>

              <div className="lg:flex-1 lg:overflow-y-auto p-6 md:p-8 lg:p-16 scrollbar-hide">
                {cart.length > 0 ? (
                  <div className="space-y-4 md:space-y-6">
                    {cart.map(cartItem => (
                      <div key={cartItem.itemId} className="group relative flex items-center gap-4 md:gap-6 p-4 md:p-6 bg-[#f8f7f2] transition-all duration-500 rounded-2xl md:rounded-none" style={{ clipPath: 'polygon(0 0, 95% 0, 100% 20%, 100% 100%, 0 100%)' }}>
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-white flex items-center justify-center p-2 md:p-3 shadow-sm shrink-0 overflow-hidden">
                          <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-700" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] md:text-[10px] font-black text-[#0a5e63] uppercase tracking-widest mb-1">{cartItem.category || 'Strategic Asset'}</p>
                          <h4 className="text-base md:text-xl font-bold text-[#0E7D83] uppercase tracking-tighter truncate">{cartItem.name}</h4>
                          <button 
                            onClick={() => removeFromCart(cartItem.itemId)} 
                            className="text-[8px] md:text-[9px] text-red-400 hover:text-red-600 transition-colors mt-2 uppercase font-black tracking-widest flex items-center gap-1"
                          >
                            <X size={8} /> Remove
                          </button>
                        </div>

                        <div className="flex flex-col items-end gap-3 md:gap-4 shrink-0">
                          <div className="flex items-center bg-white rounded-full p-1 border border-gray-100 shadow-sm">
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-1.5 md:p-2 text-[#0E7D83] hover:bg-gray-50 rounded-full"><Minus size={10} /></button>
                            <span className="px-2 md:px-4 text-xs md:text-sm font-black text-[#0E7D83]">{cartItem.quantity}</span>
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-1.5 md:p-2 text-[#0E7D83] hover:bg-gray-50 rounded-full"><Plus size={10} /></button>
                          </div>
                          <p className="text-sm md:text-lg font-bold text-[#0E7D83] tracking-tighter">
                            {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[8px] md:text-[10px] opacity-40">{currency}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 opacity-10 text-[#0E7D83]">
                    <Briefcase size={60} strokeWidth={1} className="mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Portfolio Empty</p>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-10 bg-white">
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="flex items-center gap-3 md:gap-4 text-[#0E7D83] text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] group"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-2 transition-transform" /> Keep exploring services
                </button>
              </div>
            </div>

            <div className="lg:flex-1 bg-[#f8f7f2] p-6 md:p-10 lg:p-16 lg:flex lg:flex-col lg:overflow-y-auto scrollbar-hide">
              <h3 className="text-[9px] md:text-[10px] font-black text-[#0E7D83] opacity-30 uppercase tracking-[0.5em] mb-8 md:mb-12">Client Engagement Protocol</h3>

              <div className="flex-1 space-y-8 md:space-y-12">
                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  <div className="group">
                    <label className="text-[8px] md:text-[9px] font-black uppercase text-[#0E7D83] ml-3 md:ml-4 mb-2 block tracking-widest opacity-50">Entity / Full Name</label>
                    <input placeholder="Ex: Global Solutions LDA" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-6 md:px-8 py-4 md:py-5 bg-white border-none rounded-[1.5rem] text-xs md:text-sm font-bold text-[#0E7D83] focus:ring-2 ring-[#E5E65D] outline-none transition-all shadow-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <input placeholder="Email" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-6 md:px-8 py-4 md:py-5 bg-white border-none rounded-[1.5rem] text-xs md:text-sm font-bold text-[#0E7D83] focus:ring-2 ring-[#E5E65D] outline-none shadow-sm" />
                    <input type='number' placeholder="Phone" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-6 md:px-8 py-4 md:py-5 bg-white border-none rounded-[1.5rem] text-xs md:text-sm font-bold text-[#0E7D83] focus:ring-2 ring-[#E5E65D] outline-none shadow-sm" />
                  </div>
                  <textarea placeholder="Specific case notes..." rows={3} value={client.notes || ""} onChange={e => setClient({ ...client, notes: e.target.value })} className="w-full px-6 md:px-8 py-4 md:py-5 bg-white border-none rounded-[1.5rem] md:rounded-[2rem] text-xs md:text-sm font-bold text-[#0E7D83] focus:ring-2 ring-[#E5E65D] outline-none shadow-sm resize-none" />
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#0a5e63]" />
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[#0E7D83]">Settlement Method</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {['mpesa', 'visa', 'emola', 'transfer'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                        className={`py-4 md:py-5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center justify-center gap-2 ${paymentMethod === m ? 'bg-[#0E7D83] text-[#E5E65D] shadow-2xl scale-[1.05]' : 'bg-white text-[#0E7D83] opacity-60 hover:opacity-100 shadow-sm'}`}
                      >
                        {m === 'emola' ? 'e-Mola' : m === 'transfer' ? 'Bank Transfer' : m}
                        {paymentMethod === m && <Check size={10} strokeWidth={4} />}
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
              className="w-full px-6 md:px-8 py-4 md:py-5 bg-white border-none rounded-[1.5rem] text-xs md:text-sm font-bold text-[#0E7D83] focus:ring-2 ring-[#E5E65D] outline-none shadow-sm"
            />
            <p className="text-[9px] md:text-[10px] text-[#0E7D83]/50 font-medium ml-2">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
                </div>

                {paymentMethod === 'transfer' && (
                  <div className="animate-in fade-in zoom-in-95 duration-500 p-6 md:p-8 bg-[#0E7D83] text-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl">
                    <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-3 text-[#E5E65D]">
                      <CreditCard size={14} /> Settlement Accounts
                    </h4>
                    <div className="space-y-4 md:space-y-6">
                      {company.bankAccounts?.map((bank, idx) => (
                        <div key={idx} className="border-b border-white/10 pb-3 md:pb-4 last:border-0">
                          <p className="text-[10px] md:text-xs font-black uppercase mb-2 md:mb-3 text-[#0a5e63]">{bank.bankName}</p>
                          <div className="grid grid-cols-2 gap-3 md:gap-4 text-[9px] md:text-[10px] font-mono opacity-80">
                            <div><p className="opacity-40 uppercase mb-1">Account</p><p className="font-bold">{bank.accountNumber}</p></div>
                            <div><p className="opacity-40 uppercase mb-1">NIB/IBAN</p><p className="font-bold">{bank.nibOrIban}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-[#0E7D83]/10">
                <div className="flex justify-between items-center mb-8 md:mb-10">
                  <div>
                    <span className="text-[9px] md:text-[10px] font-black text-[#0a5e63] uppercase tracking-widest block mb-2">Grand Total</span>
                    <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0E7D83] tracking-tighter">
                      {totals.grandTotal.toLocaleString()} <span className="text-base md:text-xl opacity-30 font-medium">{currency}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  <button
                    onClick={handlePayment}
                    disabled={!paymentMethod || !['mpesa', 'visa', 'emola'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
                    className="w-full py-5 md:py-6 bg-[#0E7D83] text-[#E5E65D] text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] rounded-full hover:bg-black transition-all shadow-2xl disabled:opacity-5 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Lock size={12} /> 
                    {hasOrderWithPrice ? `Secure Payment (${totals.grandTotal.toLocaleString()})` : 'Initialize Gateway'}
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !client.name || !client.email || (hasOrderWithPrice && ['mpesa', 'visa', 'emola'].includes(paymentMethod))}
                    className="w-full py-5 md:py-6 bg-white text-[#0E7D83] text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] rounded-full transition-all hover:bg-[#E5E65D] disabled:opacity-30 active:scale-95 shadow-md border border-[#0E7D83]/5"
                  >
                    {paymentMethod === 'transfer' ? 'Confirm Transfer Receipt' : 'Finalize Engagement Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-[#0E7D83]/60 backdrop-blur-md animate-in fade-in duration-500" 
          onClick={closeSuccessModal}
        >
          <div
            className="bg-white shadow-[0_40px_100px_rgba(0,0,0,0.4)] max-w-sm md:max-w-md w-full relative overflow-hidden transition-all transform scale-100 mobile-clip-none"
            style={{ 
              borderRadius: '2rem',
              clipPath: 'polygon(0 0, 90% 0, 100% 10%, 100% 100%, 0 100%)' 
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-[#0a5e63]" />

            <div className="p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-[#f8f7f2] rounded-2xl mb-6 rotate-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0E7D83] rounded-xl flex items-center justify-center text-[#E5E65D] shadow-lg">
                  <Check size={20} strokeWidth={4} />
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-[#0a5e63] block">
                  Confirmed Engagement
                </span>

                <h2 className="text-2xl md:text-3xl font-bold text-[#0E7D83] leading-tight tracking-tightest uppercase">
                  Order <span className="text-[#0E7D83]/30 italic font-serif lowercase">Successfully</span> Processed
                </h2>

                <p className="text-gray-400 text-[10px] md:text-[11px] leading-relaxed max-w-[280px] mx-auto font-bold uppercase tracking-tight">
                  Sua solicitação foi registrada. Um e-mail de confirmação foi enviado para o seu endereço profissional.
                </p>
              </div>

              <button
                onClick={closeSuccessModal}
                className="w-full py-4 md:py-5 bg-[#0E7D83] text-[#E5E65D] rounded-full transition-all hover:bg-black active:scale-95 font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] shadow-xl mb-6 md:mb-8"
              >
                Return to Dashboard
              </button>

              <div className="pt-4 md:pt-6 border-t border-dashed border-gray-100 flex flex-col items-center gap-2">
                <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-gray-300">
                  Reference Protocol
                </p>
                <span className="font-mono text-[11px] md:text-sm font-bold text-[#0E7D83] tracking-[0.2em] bg-[#f8f7f2] px-3 md:px-4 py-1 rounded-lg border border-[#0E7D83]/5">
                  #AX-{Math.random().toString(36).substr(2, 5).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#0E7D83] pt-20 md:pt-32 pb-8 md:pb-12 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 md:gap-16 mb-20 md:mb-32">
            <div className="sm:col-span-2 lg:col-span-4 space-y-8 md:space-y-12">
              <div className="flex items-center">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-8 md:h-10 w-auto brightness-0 invert" />
                ) : (
                  <span className="font-bold text-xl md:text-2xl tracking-tighter text-white uppercase italic">
                    /{company.name}<span className="text-white/50">.</span>
                  </span>
                )}
              </div>

              <p className="text-white/50 text-xs md:text-sm leading-relaxed max-w-xs font-medium">
                Líder global em inteligência estratégica e infraestrutura de alta performance. 
                Desenhando sistemas complexos com simplicidade absoluta.
              </p>

              <div className="space-y-3 md:space-y-4 pt-4 md:pt-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#E5E65D]" />
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white">Strategic Intelligence</p>
                </div>
                <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl focus-within:border-[#E5E65D] transition-all backdrop-blur-sm">
                  <input 
                    type="email" 
                    placeholder="Corporate email access" 
                    className="flex-1 px-4 md:px-6 bg-transparent text-white text-[11px] md:text-xs outline-none placeholder:text-white/20 font-bold min-w-0" 
                  />
                  <button className="px-6 md:px-8 py-3 bg-[#E5E65D] text-[#0E7D83] rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl whitespace-nowrap">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8 md:space-y-10">
              <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Operations</h4>
              <ul className="space-y-4 md:space-y-5">
                {['Global Fleet', 'Tracking', 'Warehouse', 'Solutions'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-[10px] md:text-[11px] text-white/40 hover:text-[#E5E65D] transition-all font-bold uppercase tracking-widest flex items-center gap-2 group">
                      <span className="w-0 group-hover:w-4 h-[1px] bg-[#E5E65D] transition-all" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-8 md:space-y-10">
              <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Direct Access</h4>
              <ul className="space-y-6 md:space-y-10">
                <li className="flex flex-col gap-1 md:gap-2">
                  <span className="text-[8px] md:text-[9px] text-white/30 font-black uppercase tracking-[0.3em]">Hotline 24/7</span>
                  <a href={`tel:${company.phone}`} className="text-white font-bold text-xl md:text-2xl hover:text-[#E5E65D] transition-colors tracking-tighter">
                    {company.phone}
                  </a>
                </li>
                <li className="flex flex-col gap-1 md:gap-2">
                  <span className="text-[8px] md:text-[9px] text-white/30 font-black uppercase tracking-[0.3em]">Official Liaison</span>
                  <a href={`mailto:${company.email}`} className="text-white/70 font-bold text-xs md:text-sm hover:text-[#E5E65D] transition-colors tracking-tight break-all">
                    {company.email}
                  </a>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-8 md:space-y-12">
              <div>
                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-6 md:mb-8">Connect</h4>
                <div className="flex gap-3 md:gap-4">
                  {[Instagram, Facebook, Linkedin].map((Icon, idx) => (
                    <a 
                      key={idx} 
                      href="#" 
                      className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-white/40 hover:text-[#0E7D83] hover:bg-[#E5E65D] hover:border-[#E5E65D] transition-all duration-500"
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Cleared Protocols</p>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {['M-PESA', 'VISA', 'E-MOLA'].map(p => (
                    <div key={p} className="px-3 md:px-4 py-1.5 md:py-2 border border-white/5 bg-white/[0.02] rounded-lg text-[8px] md:text-[9px] font-black text-white/40 hover:text-white hover:border-white/20 transition-all">
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 md:pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-12">
            <div className="space-y-2 md:space-y-3 text-center md:text-left">
              <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.4em]">
                © 2026 {company.name} <span className="text-white/20 font-medium">/ High-Stakes Infrastructure</span>
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 text-[8px] md:text-[9px] text-white/30 font-bold uppercase tracking-widest">
                <span>ISO 9001 CERTIFIED</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>GDPR COMPLIANT</span>
              </div>
            </div>

            <div className="flex gap-6 md:gap-10">
              <a href="#" className="text-[8px] md:text-[9px] font-black text-white/40 hover:text-[#E5E65D] transition-colors uppercase tracking-[0.3em]">Privacy</a>
              <a href="#" className="text-[8px] md:text-[9px] font-black text-white/40 hover:text-[#E5E65D] transition-colors uppercase tracking-[0.3em]">Terms</a>
            </div>

            <div className="flex items-center gap-3 md:gap-4 px-6 md:px-8 py-2.5 md:py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="relative flex h-1.5 md:h-2 w-1.5 md:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 md:h-2 w-1.5 md:w-2 bg-white"></span>
              </div>
              <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.2em]">System Status: Operational</span>
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

export default CuidadorPortal;
