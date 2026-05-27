// src/templates/public-portal/variants/CosmeticsPortal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

const SERVER_BASE_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';

// Helper function to convert relative paths to absolute URLs
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath; // Already absolute
  return `${SERVER_BASE_URL}${imagePath}`; // Convert relative to absolute
};
gsap.registerPlugin(ScrollTrigger);
interface CosmeticsProps {
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

const CosmeticsPortal: React.FC<CosmeticsProps> = ({ 
  company, 
  slug, 
  services: initialServices,
  products: initialProducts,
  bundles: initialBundles,
  portalContent = {
    hero: {
      headline: "Meet our",
      subheadline: "Products lineup",
      backgroundImage: "https://i.pinimg.com/736x/ca/ea/dd/caeadd8b611e5abf9fcd51a18f14ab32.jpg"
    },
    about: {
      enabled: true,
      title: "Ajudando famílias a encontrar os melhores Cosmeticses de lar",
      body: "<p>Treinamento e intermediação de profissionais domésticos.</p>",
      image: "https://i.pinimg.com/736x/dd/16/b9/dd16b923d438b95475e98f835888c098.jpg"
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
const heroRef = useRef(null);
  const imageRef = useRef(null);
  const cardRef = useRef(null);
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
  useEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      // Reveal inicial suave
      gsap.from(".reveal-item", {
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: "power4.out"
      });

      // Efeito de Parallax na imagem central
      gsap.to(imageRef.current, {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);
  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 font-sans">
      {/* Modern Navbar */}
   {/* HEADER EDITORIAL DINÂMICO */}
      <header className="sticky top-0 w-full z-[100] bg-[#fcfcfc] text-slate-900 px-10 py-8 flex justify-between items-center mix-blend-difference transition-all duration-500">
        
        {/* Logo / Nome da Marca */}
        <div className={`reveal-item transition-opacity duration-300 ${isSearchOpen ? 'opacity-0' : 'opacity-100'}`}>
          <span className="text-2xl font-bold tracking-tighter uppercase leading-none">
            {company.name || "true.Kind."}
          </span>
        </div>

        {/* Navegação Central - Mapeada dinamicamente ou estática */}
        <nav className={`hidden lg:flex items-center gap-10 reveal-item transition-all duration-500 ${isSearchOpen ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
          {['Home', 'Shop', 'Philosophy', 'Journal'].map((item, idx) => (
            <a 
              key={item} 
              href={item === 'Home' ? '/' : `#${item.toLowerCase()}`} 
              className={`text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-50 transition-opacity ${idx === 1 ? 'border-b border-white pb-1' : ''}`}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Ações: Pesquisa e Carrinho */}
        <div className="flex items-center gap-4 reveal-item">
          
          {/* Lógica de Busca Integrada ao Estilo Dark do Header */}
          <div className="flex items-center transition-all duration-500">
            {isSearchOpen ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full animate-in fade-in slide-in-from-right-4 duration-500 w-[250px] lg:w-[350px]">
                <Search size={16} className="text-white/60" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search assets..."
                  className="bg-transparent border-none outline-none text-xs w-full placeholder:text-white/30 text-white font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={() => setIsSearchOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-[#2a2a2a] text-white px-5 py-2.5 rounded-full gap-4 shadow-2xl">
                {/* Botão de Pesquisa (Substituindo User Icon) */}
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="hover:text-[#ffe100] transition-colors"
                  title="Search"
                >
                  <Search size={18} strokeWidth={2} />
                </button>
                
                <div className="w-[1px] h-4 bg-white/20" />
                
                {/* Botão do Carrinho (Briefcase/ShoppingBag) */}
                <button 
                  onClick={() => setIsCartOpen(true)} 
                  className="relative group"
                  title="Portfolio"
                >
                  <ShoppingBag size={18} strokeWidth={2} className="group-hover:text-[#ffe100] transition-colors" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#94d600] text-[#0b3b2c] text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
{/* Header Estilo Premium Salon */}
<div ref={heroRef} className="bg-[#fcfcfc] min-h-screen font-sans text-[#1a1a1a] overflow-hidden">
            {/* 1. HEADER REFEITO COM PESQUISA INTEGRADA E CARRINHO */}
{/* HEADER EDITORIAL */}
    


    {/* 2. HERO SECTION (Mantido conforme o layout Stas) */}
{/* HERO SECTION - Inspirada na imagem image_1c4d56.jpg */}
    {/* HERO SECTION - Rigorous Editorial Layout (Ref: image_e9f244.jpg) */}
<section className="relative min-h-screen w-full bg-[#fcfcfc] flex items-center justify-center overflow-hidden pt-20 px-6 lg:px-20">
  
  {/* GRID CONTAINER - Define as margens de segurança para os elementos absolutos */}
  <div className="relative w-full max-w-[1440px] h-[80vh] flex items-center justify-center">
    
    {/* 1. HEADLINE (Topo Esquerdo) */}
    <div className="absolute top-0 left-0 z-20 reveal-item max-w-fit">
      <h1 className="text-[12vw] lg:text-[140px] font-bold leading-[0.85] tracking-tighter uppercase text-[#1a1a1a]">
        {portalContent?.hero?.headline?.split(' ')[0] || "Meet"} <br />
        <span className="text-[#2a2a2a]">{portalContent?.hero?.headline?.split(' ')[1] || "Our"}</span>
      </h1>
    </div>

    {/* 2. CARD INFORMATIVO (Alinhado abaixo do Headline) */}
    <div 
      ref={cardRef}
      className="absolute left-0 top-[45%] lg:top-[40%] z-30 bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.04)] w-[280px] lg:w-[360px] reveal-item border border-gray-100/50"
    >
      <h3 className="text-2xl lg:text-3xl font-medium leading-[1.1] mb-4 text-[#1a1a1a]">
        Understand <br /> 
        <span className="font-serif italic text-[#4a4a4a]">Your Routine</span>
      </h3>
      <p className="text-gray-400 text-[11px] lg:text-[13px] leading-relaxed mb-8 font-normal max-w-[90%]">
        {portalContent?.hero?.description || "Skincare is not just about the products you use, but how you use them effectively."}
      </p>
      <button 
        onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
        className="w-full py-4 bg-[#2a2a2a] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95"
      >
        Read More
      </button>
    </div>

    {/* 3. IMAGEM CENTRAL (O Produto/Elemento Humano) */}
    <div className="relative z-10 w-full max-w-lg lg:max-w-2xl reveal-item pointer-events-none">
      {/* Elemento de Arco Decorativo da Imagem */}
      <svg 
        className="absolute -top-10 -right-20 lg:-right-40 w-[300px] lg:w-[600px] opacity-20 hidden md:block" 
        viewBox="0 0 500 500" 
        fill="none"
      >
        <path d="M10,250 Q250,10 490,250" stroke="black" strokeWidth="0.5" />
        <circle cx="490" cy="250" r="2" fill="black" />
      </svg>
      
      <div ref={imageRef} className="relative aspect-[4/5] lg:aspect-[1/1] flex items-center justify-center">
        <img 
          src={getImageUrl(portalContent?.hero?.backgroundImage)} 
          alt="Principal" 
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>
    </div>

    {/* 4. SUBHEADLINE (Canto Inferior Direito) */}
    <div className="absolute bottom-0 right-0 z-20 text-right reveal-item">
      <h2 className="text-[10vw] lg:text-[120px] font-serif italic leading-[0.8] tracking-tight text-[#1a1a1a] lowercase">
        complete <br /> lineup
      </h2>
    </div>

  </div>

  {/* ELEMENTO DE BACKGROUND SUTIL (Opcional para dar profundidade) */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,1)_0%,_rgba(245,245,245,0.5)_100%)] pointer-events-none" />
</section>

    {/* OVERLAY DE PESQUISA (Opcional - Sugestões Rápidas de Advocacia) */}
    {isSearchOpen && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] pointer-events-none transition-opacity" />
    )}

{/* === SEÇÕES DINÂMICAS DO PORTAL CONTENT === */}

{/* About Section – Estilo Premium Trust */}
{/* About Section – Editorial Minimalist (Ref: image_e9d41b.jpg) */}
{portalContent?.about?.enabled && (
  <section id="about" className="min-h-screen bg-white flex items-center overflow-hidden">
    <div className="w-full grid lg:grid-cols-2 h-full min-h-screen">
      
      {/* LADO ESQUERDO: Conteúdo Editorial */}
      <div className="flex flex-col justify-center items-center px-10 lg:px-24 py-20 bg-[#fcfcfc]">
        <div className="max-w-md w-full space-y-16 text-center">
          
          {/* Título com Serif Italic (Visual image_e9d41b.jpg) */}
          <div className="reveal-item">
            <h2 className="text-4xl md:text-5xl font-light leading-[1.1] text-[#1a1a1a] tracking-tight">
              {portalContent.about.title?.split(' ').slice(0, -2).join(' ') || "Honest products"} <br />
              <span className="font-serif italic text-[#3a3a3a]">
                {portalContent.about.title?.split(' ').slice(-2).join(' ') || "no exceptions!"}
              </span>
            </h2>
          </div>

          {/* Imagem Secundária (O produto em destaque no centro do texto) */}
          <div className="relative w-48 aspect-[3/4] mx-auto reveal-item shadow-[20px_20px_60px_rgba(0,0,0,0.05)]">
             <img 
                src={getImageUrl(portalContent.about.secondaryImage) || "https://i.pinimg.com/736x/cb/39/d4/cb39d4d73a49e29996ddb619845cd5d9.jpg"} 
                className="w-full h-full object-cover rounded-sm"
                alt="Product Detail"
             />
          </div>

          {/* Texto de Corpo Minimalista */}
          <div className="reveal-item">
            <p className="text-gray-400 text-xs lg:text-sm leading-relaxed tracking-wide font-light uppercase">
              {portalContent.about.body?.replace(/<[^>]*>/g, '') || 
              "Drawing from our rich legacy and embracing science, we aim to create transparent experiences that are incredibly effective."}
            </p>
          </div>

          {/* CTA Discreto */}
          <div className="pt-4 reveal-item">
            <button className="text-[10px] font-black uppercase tracking-[0.3em] border-b border-black pb-2 hover:opacity-50 transition-all">
              Our Philosophy
            </button>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Imagem de Impacto (Full Bleed) */}
      <div className="relative h-[60vh] lg:h-auto overflow-hidden">
        <img 
          src={getImageUrl(portalContent.about.image)} 
          alt="Skin Detail" 
          className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-[2s] ease-out" 
        />
        {/* Overlay sutil para textura de luz como na imagem e9d41b.jpg */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/5 pointer-events-none" />
      </div>

    </div>
  </section>
)}







 {/* agora três secções sequenciais com colapso */}
  <div className="">
{/* Section: Services Showcase — Editorial Minimalist (Ref: image_e9671d.jpg) */}
{filteredServices.length > 0 && (
  <section id="services" className="py-24 bg-white min-h-screen">
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row gap-16">
      
      {/* 1. BARRA LATERAL DE FILTROS (Ref: image_e9671d.jpg) */}
      <aside className="w-full lg:w-64 shrink-0 reveal-item">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 pb-4 border-b border-gray-100">
          Filters
        </h4>
        <div className="space-y-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest block mb-6 flex justify-between items-center group cursor-pointer">
              Range <ChevronDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
            </span>
            <ul className="space-y-4">
              {['Pure Brilliance', 'Varnaya Blends', 'Daily Dew', 'Clear Difference'].map((filter) => (
                <li key={filter} className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1a1a1a]/40 hover:text-black cursor-pointer transition-colors">
                  {filter}
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-8 border-t border-gray-100">
             <span className="text-[11px] font-bold uppercase tracking-widest block mb-4 flex justify-between items-center opacity-30">
               Type <Plus size={14} />
             </span>
          </div>
        </div>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <div className="flex-1">
        
        {/* Cabeçalho da Seção */}
        <div className="flex justify-between items-end mb-16 reveal-item">
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-[0.4em] block mb-4">
              For Glowing & Healthy {company.name || "Spaces"}
            </span>
            <h2 className="text-4xl lg:text-5xl font-serif italic tracking-tight text-[#1a1a1a]">
              Pure Brilliance
            </h2>
          </div>
          
          {/* Navegação Estilo image_e9671d.jpg */}
          <div className="hidden md:flex gap-3">
            <button className="w-12 h-12 rounded-full bg-[#fcfcfc] border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
            <button className="w-12 h-12 rounded-full bg-[#f8e1e1]/30 border border-[#f8e1e1] flex items-center justify-center hover:bg-[#f8e1e1]/50 transition-colors">
              <ChevronRight size={20} className="text-[#d48c8c]" />
            </button>
          </div>
        </div>

        {/* Grid de Produtos/Serviços */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.slice(0, visibleServices).map((item, index) => (
            <div
              key={item._id}
              onClick={() => openItem(item, 'services')}
              className="group cursor-pointer flex flex-col reveal-item"
            >
              {/* Container da Imagem com fundo rosado pálido */}
              <div className="relative aspect-[4/5] rounded-[2rem] bg-[#fdf2f2] overflow-hidden flex items-center justify-center p-12 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-rose-100">
                
                {/* Badge Superior */}
                <div className="absolute top-6 left-8 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Pure Brilliance
                </div>

                {/* Ícone de Adicionar (Canto) */}
                <div className="absolute top-6 right-8">
                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 opacity-60 group-hover:opacity-100 transition-all">
                      <ShoppingBag size={14} />
                   </div>
                </div>
                
                {/* Imagem do Produto/Serviço com sombra flutuante */}
                {item.images?.length > 0 ? (
                  <img 
                    src={getImageUrl(item.images[0])} 
                    alt={item.name}
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                   <div className="text-[10px] uppercase tracking-widest text-rose-300">Service Asset</div>
                )}
              </div>

              {/* Info do Serviço */}
              <div className="mt-8 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-[#1a1a1a] group-hover:text-rose-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                    {item.type || "Specialized Treatment"}
                  </p>
                </div>
                <div className="text-[12px] font-black tracking-tighter text-[#1a1a1a]">
                   {item.price ? `₹${item.price}` : "POA"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botão de Expansão */}
        {visibleServices < filteredServices.length && (
          <div className="mt-20 flex justify-center reveal-item">
            <button 
              onClick={() => setVisibleServices(prev => prev + 3)}
              className="px-12 py-5 bg-[#1a1a1a] text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-400 transition-all shadow-xl shadow-rose-100"
            >
              Discover More
            </button>
          </div>
        )}
      </div>
    </div>
  </section>
)}

{/* Section: Product Collection — Editorial Gallery (Ref: image_e9671d.jpg) */}
{filteredProducts.length > 0 && (
  <section className="py-32 bg-white relative overflow-hidden">
    
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
      
      {/* HEADER EDITORIAL */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-8 reveal-item">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">
              The Collection
            </span>
            <div className="w-12 h-[1px] bg-rose-200" />
          </div>
          <h2 className="text-5xl lg:text-7xl font-serif italic tracking-tighter text-[#1a1a1a] leading-[0.9]">
            Pure <br /> 
            <span className="not-italic font-sans font-light text-gray-300 ml-12 lg:ml-20">Essentials</span>
          </h2>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-8">
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] max-w-xs lg:text-right leading-relaxed">
            Curated solutions designed for those who seek uncompromising quality and visible results.
          </p>
          {/* Navegação Minimalista Ref: image_e9671d.jpg */}
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all group">
              <ChevronLeft size={18} className="text-gray-300 group-hover:text-black" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#fdf2f2] flex items-center justify-center hover:bg-rose-100 transition-all group">
              <ChevronRight size={18} className="text-rose-400" />
            </button>
          </div>
        </div>
      </div>

      {/* GRID DE PRODUTOS ESTILO VITRINE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-20">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 4)).map((item, index) => {
          const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.image;
          
          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className="group cursor-pointer flex flex-col reveal-item"
            >
              {/* Moldura da Imagem (Fundo Pálido Ref: image_e9671d.jpg) */}
              <div className="relative aspect-[3/4] mb-8 bg-[#f9f9f9] rounded-[2.5rem] overflow-hidden flex items-center justify-center p-10 transition-all duration-700 group-hover:bg-[#fdf2f2]">
                
                {/* Badge Discreta */}
                <div className="absolute top-6 left-8">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-300 group-hover:text-rose-300 transition-colors">
                    {item.category || 'Premium'}
                  </span>
                </div>

                {/* Imagem com Mix Blend para parecer impressa no fundo */}
                {firstImage ? (
                  <img 
                    src={getImageUrl(firstImage)} 
                    alt={item.name} 
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : (
                  <Package size={40} className="text-gray-200" />
                )}

                {/* Quick Add Icon */}
                <div className="absolute bottom-6 right-8 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center text-rose-400">
                    <Plus size={18} />
                  </div>
                </div>
              </div>

              {/* Informações (Tipografia image_e9671d.jpg) */}
              <div className="px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1a1a1a] mb-2 leading-tight group-hover:text-rose-500 transition-colors">
                  {item.name}
                </h3>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                    Collection 01
                  </span>
                  <span className="text-xs font-black text-[#1a1a1a]">
                    {getItemPrice(item).toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA FINAL EDITORIAL */}
      <div className="mt-32 flex flex-col items-center reveal-item">
        <button 
          onClick={() => setShowAllProducts(prev => !prev)}
          className="group relative px-12 py-5 overflow-hidden rounded-full transition-all"
        >
          <div className="absolute inset-0 bg-[#1a1a1a] group-hover:bg-rose-400 transition-colors" />
          <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.4em] text-white flex items-center gap-4">
            {showAllProducts ? 'View Less' : 'Explore All Solutions'}
            <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
          </span>
        </button>
        
        {/* Decorative Line */}
        <div className="w-px h-24 bg-gradient-to-b from-rose-100 to-transparent mt-12" />
      </div>
    </div>
  </section>
)}

{/* Missão, Visão e Valores – Minimalist Editorial (Ref: image_e95c1f.png) */}
{portalContent?.missionVision?.enabled && (
  <section className="py-32 bg-white px-6 lg:px-12 border-t border-gray-50">
    <div className="max-w-[1440px] mx-auto">
      
      {/* 1. HEADER (Estilo Radical Transparency) */}
      <div className="mb-40 reveal-item">
        <h2 className="text-5xl lg:text-8xl font-light tracking-tight leading-[0.9] text-[#1a1a1a]">
          {portalContent?.missionVision?.title?.split(' ').slice(0, 2).join(' ') || "Guided by"} <br />
          <span className="font-serif italic text-[#3a3a3a]">
            {portalContent?.missionVision?.title?.split(' ').slice(2).join(' ') || "Radical Values."}
          </span>
        </h2>
      </div>

      {/* 2. GRID DE CONTEÚDO (Colunas na base como na image_e95c1f.png) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
        
        {/* Ícone Minimalista (Canto Inferior Esquerdo) */}
        <div className="md:col-span-4 reveal-item">
          <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center text-white">
            <Leaf size={24} weight="fill" />
          </div>
        </div>

        {/* Missão */}
        <div className="md:col-span-4 reveal-item">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-6 pb-2 border-b border-gray-50">
            {portalContent?.missionVision?.mission?.title || "Our Mission"}
          </h3>
          <p className="text-sm lg:text-base text-gray-500 leading-relaxed font-light">
            {portalContent?.missionVision?.mission?.content || 
            "We formulate to the highest standards of efficacy and safety – using only proven, verified ingredients."}
          </p>
        </div>

        {/* Visão / Valores */}
        <div className="md:col-span-4 reveal-item">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-6 pb-2 border-b border-gray-50">
            {portalContent?.missionVision?.vision?.title || "Our Vision"}
          </h3>
          <p className="text-sm lg:text-base text-gray-500 leading-relaxed font-light">
            {portalContent?.missionVision?.vision?.content || 
            "With no black boxes and nothing to hide, we strive for radical formulation transparency in everything we do."}
          </p>
          
          {/* Valores como lista minimalista inline */}
          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
            {(portalContent?.missionVision?.values?.items?.length > 0 
              ? portalContent.missionVision.values.items 
              : ["Integrity", "Innovation", "Efficacy"]
            ).map((v, i) => (
              <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-[#1a1a1a]">
                • {v}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* 3. CALL TO ACTION DISCRETO */}
      <div className="mt-24 pt-12 border-t border-gray-50 flex justify-end reveal-item">
        <button className="text-[10px] font-black uppercase tracking-[0.4em] text-[#1a1a1a] hover:opacity-50 transition-opacity flex items-center gap-4">
          The Full Story <div className="w-8 h-[1px] bg-black" />
        </button>
      </div>

    </div>
  </section>
)}

{/* Section: Legal Bundles — Asymmetric Editorial Gallery (Ref: image_e90582.jpg) */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-32 bg-white relative overflow-hidden">
    
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
      
      {/* HEADER: EQUILÍBRIO E ESPAÇO (Estilo image_e90582.jpg) */}
      <div className="mb-24 flex flex-col md:flex-row items-baseline justify-between border-b border-gray-50 pb-12 reveal-item">
        <div className="max-w-2xl">
          <h2 className="text-5xl lg:text-7xl font-serif italic tracking-tighter text-[#1a1a1a] leading-none mb-4">
            Curated <span className="not-italic font-sans font-light text-gray-400">Alliances</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">
            Integrated Strategic Systems
          </p>
        </div>
        <p className="text-gray-400 text-xs md:text-sm max-w-xs leading-relaxed mt-8 md:mt-0 font-light">
          Redefining operational excellence through meticulously integrated solution packages.
        </p>
      </div>

      {/* GRID ASSIMÉTRICO (Inspirado na disposição de image_e90582.jpg) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-24 md:gap-x-12">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map((item, index) => {
            const image = getImageUrl(item.image || '');
            // Alternância de largura de colunas para criar o ritmo visual da referência
            const colSpan = index % 2 === 0 ? 'md:col-span-7' : 'md:col-span-5';
            const isAlt = index % 2 !== 0;

            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className={`group cursor-pointer flex flex-col ${colSpan} reveal-item ${isAlt ? 'md:mt-32' : ''}`}
              >
                {/* Imagem Editorial - Proporções inspiradas na image_e90582.jpg */}
                <div className={`relative overflow-hidden mb-10 transition-all duration-700 ${
                  isAlt ? 'aspect-square' : 'aspect-[16/10]'
                }`}>
                  <img 
                    src={image} 
                    alt={item.name} 
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" 
                  />
                  
                  {/* Overlay de Preço Minimalista */}
                  <div className="absolute bottom-0 left-0 bg-white/90 backdrop-blur-md px-8 py-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]">
                       {getItemPrice(item).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                {/* Conteúdo Tipográfico */}
                <div className="max-w-md">
                  <span className="text-[9px] font-bold text-rose-300 uppercase tracking-[0.3em] block mb-4">
                    Bundle Collection — 0{index + 1}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-light text-[#1a1a1a] mb-6 leading-tight group-hover:text-rose-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-light mb-8 opacity-80">
                    {item.description || "An elevated framework for complex operations."}
                  </p>
                  
                  {/* Link Estilo Editorial */}
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#1a1a1a]">
                    <span>View Details</span>
                    <div className="w-12 h-[1px] bg-[#1a1a1a] group-hover:w-20 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* FOOTER DA SEÇÃO (Clean Line) */}
      <div className="mt-40 border-t border-gray-100 pt-16 flex justify-center reveal-item">
         <div className="text-center group cursor-pointer">
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.5em] mb-4">
              Explore the full ecosystem
            </p>
            <div className="w-1 h-16 bg-gradient-to-b from-rose-200 to-transparent mx-auto group-hover:h-24 transition-all" />
         </div>
      </div>

    </div>
  </section>
)}

{/* ── Seção: Strategic Subscriptions (Editorial Luxury Style) ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-32 bg-[#fcfcfc] relative overflow-hidden">
    {/* Background Detail: Minimalist Vertical Lines */}
    <div className="absolute inset-0 flex justify-around opacity-[0.03] pointer-events-none">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-[1px] h-full bg-[#1a1a1a]" />
      ))}
    </div>

    <div className="max-w-7xl mx-auto px-10 relative z-10">
      
      {/* Header: Centered & Minimalist */}
      <div className="flex flex-col items-center text-center mb-24">
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-rose-400 mb-6 block">
          Investment Tiers
        </span>
        <h2 className="text-5xl md:text-7xl font-serif italic text-[#1a1a1a] tracking-tighter leading-none mb-8">
          Strategic <span className="not-italic font-sans font-light text-gray-300">Retainers.</span>
        </h2>
        <div className="w-12 h-[1px] bg-rose-200 mb-10" />
        
        {/* Toggle UI - Luxury Minimalist */}
        <div className="flex items-center gap-8 p-2 bg-white border border-gray-100 rounded-full shadow-sm">
          <button className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]">Monthly</button>
          <div className="w-[1px] h-4 bg-gray-100" />
          <button className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-rose-400 transition-colors">Annual</button>
        </div>
      </div>

      {/* Grid de Planos: Clean & High-Contrast */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-100 rounded-[3rem] overflow-hidden bg-white shadow-xl">
        {filteredBundles.filter(item => item.type === 'Subscription').map((plan, index) => {
          // Diferenciação sutil entre os cards
          const isFeatured = index === 1; // O plano do meio ganha destaque sutil

          return (
            <div 
              key={plan._id} 
              className={`relative p-16 flex flex-col transition-all duration-700 border-r border-gray-50 last:border-r-0
                ${isFeatured ? 'bg-[#fcfcfc] z-10 scale-[1.02] shadow-[0_0_60px_rgba(0,0,0,0.03)]' : 'bg-white'}
              `}
            >
              {isFeatured && (
                <div className="absolute top-8 right-8">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-rose-400 bg-rose-50 px-3 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              <div className="mb-12">
                <h3 className="text-3xl font-light text-[#1a1a1a] tracking-tighter mb-4">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-serif italic text-[#1a1a1a]">
                    {getItemPrice(plan).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    {currency} / mo
                  </span>
                </div>
              </div>
              
              <div className="flex-1 space-y-10">
                <div className="h-[1px] w-full bg-gray-50" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 mb-8">Capabilities</p>
                  <ul className="space-y-6">
                    {plan.includedLimits?.map((limit: any, i: number) => (
                      <li key={i} className="flex items-start gap-4 group">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-200 shrink-0 group-hover:bg-rose-400 transition-colors" />
                        <span className="text-xs text-gray-500 leading-relaxed font-medium uppercase tracking-tight">
                          {limit.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Botão Estilo Boutique */}
              <div className="mt-16">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-6 rounded-full font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-500
                    ${isFeatured 
                      ? 'bg-[#1a1a1a] text-white hover:bg-rose-500 shadow-lg' 
                      : 'bg-transparent border border-gray-100 text-gray-400 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'}`}
                >
                  Initiate Protocol
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer da Section */}
      <div className="mt-16 text-center">
        <p className="text-[10px] font-medium text-gray-300 uppercase tracking-[0.2em]">
          All plans include dedicated account management and 24/7 priority support.
        </p>
      </div>
    </div>
  </section>
)}
  </div>
  {/* Clientes / Parceiros */}
{portalContent?.clients?.enabled && portalContent.clients.items?.length > 0 && (
  <section className="py-24 bg-[#f8f7f2] relative overflow-hidden">
    {/* Elemento decorativo sutil para continuidade visual */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#0E7D83]/10 to-transparent" />

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Label de confiança no estilo da marca */}
      <div className="flex flex-col items-center mb-16">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-8 h-[1px] bg-[#0E7D83] opacity-20" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#0E7D83] opacity-60">
            Trusted by Industry Leaders
          </span>
          <div className="w-8 h-[1px] bg-[#0E7D83] opacity-20" />
        </div>
      </div>

      {/* Grid de Logotipos com Glassmorphism sutil */}
      <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-12">
        {portalContent.clients.items.map((client: any, i: number) => (
          <div 
            key={i} 
            className="group relative flex items-center justify-center transition-all duration-500"
          >
            {/* Efeito de brilho ao passar o mouse */}
            <div className="absolute inset-0 bg-white blur-2xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
            
            <img 
              src={getImageUrl(client.logo)} 
              alt={client.name} 
              className="h-8 md:h-10 w-auto object-contain grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 relative z-10" 
            />
          </div>
        ))}
      </div>

      {/* Frase de rodapé sutil para fechar a seção */}
      <div className="mt-16 flex justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-[#E5E65D]" />
      </div>
    </div>
  </section>
)}

{/* Section: Testimonials — Editorial Prestige (Ref: image_e95c1f.png & image_e90582.jpg) */}
{portalContent?.testimonials?.enabled && portalContent.testimonials.items?.length > 0 && (
  <section id="testimonials" className="py-32 bg-white relative overflow-hidden border-t border-gray-50">
    
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
      
      {/* HEADER: MINIMALIST & BOLD */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-32 gap-8 reveal-item">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">
              Voices of Trust
            </span>
          </div>
          <h2 className="text-5xl lg:text-8xl font-serif italic tracking-tighter text-[#1a1a1a] leading-[0.85]">
            Client <br />
            <span className="not-italic font-sans font-light text-gray-200 ml-12 lg:ml-24">Reflections.</span>
          </h2>
        </div>
        <p className="text-gray-400 text-[10px] uppercase tracking-[0.3em] font-bold max-w-[200px] lg:text-right leading-relaxed">
          Honest perspectives from those who demand excellence.
        </p>
      </div>

      {/* TESTIMONIALS GRID: ASYMMETRIC & CLEAN */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-24 md:gap-x-16 items-start">
        {portalContent.testimonials.items.map((t, i) => {
          // Lógica de layout assimétrico (Ref: image_e90582.jpg)
          const isWide = i === 1; // O segundo item ganha mais destaque horizontal
          const colSpan = isWide ? 'md:col-span-7' : 'md:col-span-5';
          const marginTop = i === 2 ? 'md:mt-40' : 'mt-0';

          return (
            <div 
              key={i} 
              className={`${colSpan} ${marginTop} flex flex-col reveal-item group`}
            >
              {/* Star Rating Minimalista */}
              <div className="flex gap-1 mb-8 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                {Array.from({ length: t.rating || 5 }).map((_, k) => (
                  <div key={k} className="w-1 h-1 rounded-full bg-rose-400" />
                ))}
              </div>

              {/* Quote Editorial */}
              <blockquote className="mb-12">
                <p className={`text-2xl lg:text-4xl font-light leading-[1.2] tracking-tight text-[#1a1a1a] group-hover:text-rose-500 transition-colors duration-500`}>
                  <span className="font-serif italic mr-2 text-rose-200">“</span>
                  {t.text}
                  <span className="font-serif italic ml-1 text-rose-200">”</span>
                </p>
              </blockquote>

              {/* Author Info (Ref: Estilo de legendas image_e90582.jpg) */}
              <div className="flex items-center gap-6 pt-8 border-t border-gray-50">
                {t.avatar && (
                  <div className="w-12 h-12 rounded-full overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 border border-gray-100">
                    <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1a1a1a] mb-1">
                    {t.name}
                  </h4>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-300">
                    {t.role} <span className="mx-2 text-rose-200">/</span> {t.company}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DECORATIVE LINE FOOTER */}
      <div className="mt-40 flex justify-center reveal-item">
        <div className="flex items-center gap-8">
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-gray-100" />
          <span className="text-[8px] font-black uppercase tracking-[0.6em] text-gray-200">
            Endorsed Quality
          </span>
          <div className="w-24 h-[1px] bg-gradient-to-l from-transparent to-gray-100" />
        </div>
      </div>

    </div>
  </section>
)}



{/* Item Details Modal - Immersive Cinematic Experience (Ref: image_e90582.jpg) */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-6">
    {/* Overlay: Minimalist Neutral Blur */}
    <div 
      className="absolute inset-0 bg-white/80 backdrop-blur-2xl transition-opacity duration-1000" 
      onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
    />

    {/* Main Container: The "Gallery" Sheet */}
    <div className="relative w-full max-w-[1600px] bg-white h-full lg:h-[90vh] shadow-[0_100px_120px_-40px_rgba(0,0,0,0.1)] overflow-hidden lg:rounded-[4rem] animate-in fade-in zoom-in-95 duration-700 flex flex-col lg:flex-row">
      
      {/* 1. CLOSE BUTTON: Minimal & Integrated */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-10 right-10 z-[120] group flex items-center gap-4 text-[#1a1a1a]"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-all">Close</span>
        <div className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-100 bg-white group-hover:rotate-90 transition-transform duration-500">
          <X size={20} strokeWidth={1.5} />
        </div>
      </button>

      {/* 2. LEFT SIDE: The Visual Asset (Ref: image_e90582.jpg Staging) */}
      <div className="relative w-full lg:w-[55%] h-[50vh] lg:h-full bg-[#f9f9f9] overflow-hidden group">
        {(() => {
          const itemImages = selectedItem.images?.length > 0 ? selectedItem.images : [selectedItem.image];
          const imageUrl = getImageUrl(itemImages[currentImgIndex] || '');

          return (
            <div className="w-full h-full p-12 lg:p-24 flex items-center justify-center">
              <div className="relative w-full h-full reveal-item">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    className="w-full h-full object-cover rounded-[2rem] shadow-2xl grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000" 
                    alt={selectedItem.name} 
                  />
                ) : (
                  <div className="w-full h-full bg-white rounded-[2rem] flex items-center justify-center border border-gray-50">
                    <Package size={60} weight="thin" className="text-gray-200" />
                  </div>
                )}

                {/* Progress Indicators (Ref: High-End Gallery) */}
                {itemImages.length > 1 && (
                  <div className="absolute bottom-10 left-10 flex gap-3">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`h-[2px] transition-all duration-700 ${idx === currentImgIndex ? 'w-12 bg-[#1a1a1a]' : 'w-4 bg-gray-200'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. RIGHT SIDE: Editorial Content (Ref: image_e95c1f.png Hierarchy) */}
      <div className="flex-1 p-10 lg:p-24 flex flex-col justify-between overflow-y-auto scrollbar-hide">
        <div className="reveal-item">
          {/* Tag & Rating */}
          <div className="flex items-center gap-6 mb-16">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em]">
              {selectedItem.category || 'Portfolio Item'}
            </span>
            <div className="h-[1px] flex-1 bg-gray-50" />
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => <div key={s} className="w-1 h-1 rounded-full bg-rose-200" />)}
            </div>
          </div>

          {/* Headline: The Mix of Serif & Sans */}
          <h3 className="text-5xl lg:text-7xl font-serif italic text-[#1a1a1a] mb-10 leading-[0.9] tracking-tighter">
            {selectedItem.name.split(' ')[0]} <br />
            <span className="not-italic font-sans font-light text-gray-300">
              {selectedItem.name.split(' ').slice(1).join(' ')}
            </span>
          </h3>

          <p className="text-gray-400 text-sm lg:text-base leading-relaxed mb-16 font-light max-w-lg">
            {selectedItem.description || "An elevated strategic framework curated for those who demand radical transparency and operational excellence."}
          </p>

          {/* Provisions: Minimalist Checklist */}
          <div className="space-y-0 mb-16 border-t border-gray-50">
            <h4 className="text-[#1a1a1a] text-[9px] font-black uppercase tracking-[0.5em] py-8">Included Provisions</h4>
            {(selectedItem.includedItems || selectedItem.items || []).slice(0, 4).map((it, i) => (
              <div key={i} className="flex items-center justify-between py-5 border-b border-gray-50 group hover:px-2 transition-all">
                <span className="text-xs font-light text-gray-500 uppercase tracking-widest">{it.productId?.name || it.description || "Strategic Asset"}</span>
                <div className="w-1 h-1 rounded-full bg-rose-300 group-hover:scale-[3] transition-transform" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-12 reveal-item">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div>
              <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.4em] block mb-4">Investment Allocation</span>
              <div className="text-5xl font-light text-[#1a1a1a] tracking-tighter">
                {getItemPrice(selectedItem).toLocaleString()} <span className="text-xs font-bold text-gray-200 uppercase tracking-widest ml-2">{currency}</span>
              </div>
            </div>

            <button 
              onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); }}
              className="px-12 py-6 bg-[#1a1a1a] text-white font-black text-[10px] uppercase tracking-[0.5em] rounded-full hover:bg-rose-500 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-6 group"
            >
              Secure Access 
              <div className="w-8 h-[1px] bg-white/30 group-hover:w-12 transition-all" />
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
)}

{/* CART MODAL – Luxury "Athelier" Edition (Ref: image_e95c1f.png) */}
<div className={`fixed inset-0 z-[100] flex justify-end ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
  
  {/* Overlay: Minimalist Soft Blur */}
  <div
    className={`absolute inset-0 bg-white/60 backdrop-blur-2xl transition-opacity duration-1000 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsCartOpen(false)}
  />

  {/* Modal Container: Full Height Split Layout */}
  <div
    className={`relative w-full max-w-[1440px] bg-white shadow-[-40px_0_100px_rgba(0,0,0,0.05)] h-full transform transition-all duration-1000 ease-out flex flex-col lg:flex-row ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
  >
    
    {/* 1. PORTFOLIO VIEW (LEFT COLUMN) */}
    <div className="flex-[1.2] flex flex-col min-h-0 bg-white border-r border-gray-50">
      
      {/* Editorial Header */}
      <div className="p-10 lg:p-20 flex justify-between items-end border-b border-gray-50">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-400 block mb-6">Manifest</span>
          <h2 className="text-5xl lg:text-7xl font-serif italic tracking-tighter text-[#1a1a1a] leading-none">
            Selected <br />
            <span className="not-italic font-sans font-light text-gray-200">Solutions.</span>
          </h2>
        </div>
        <button onClick={() => setIsCartOpen(false)} className="group flex items-center gap-4 text-[#1a1a1a] pb-2">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Dismiss</span>
            <X size={20} strokeWidth={1} />
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-10 lg:p-20 scrollbar-hide">
        {cart.length > 0 ? (
          <div className="space-y-16">
            {cart.map(cartItem => (
              <div key={cartItem.itemId} className="group relative flex items-start gap-10">
                {/* Visual Thumbnail */}
                <div className="w-32 h-40 bg-[#f9f9f9] rounded-2xl overflow-hidden shrink-0 transition-transform duration-700 group-hover:scale-105">
                  <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" />
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-2">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[9px] font-black text-rose-300 uppercase tracking-widest mb-2">{cartItem.category || 'Strategic Asset'}</p>
                      <h4 className="text-2xl font-light text-[#1a1a1a] tracking-tight">{cartItem.name}</h4>
                    </div>
                    <p className="text-xl font-light text-[#1a1a1a]">
                      {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] text-gray-300 font-bold uppercase ml-1">{currency}</span>
                    </p>
                  </div>

                  {/* Item Controls */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-6">
                        <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="text-gray-300 hover:text-[#1a1a1a] transition-colors"><Minus size={14} /></button>
                        <span className="text-xs font-bold text-[#1a1a1a] w-4 text-center">{cartItem.quantity}</span>
                        <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="text-gray-300 hover:text-[#1a1a1a] transition-colors"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(cartItem.itemId)} className="text-[9px] text-gray-300 hover:text-rose-400 transition-colors uppercase font-black tracking-widest border-b border-transparent hover:border-rose-400">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <div className="w-[1px] h-20 bg-[#1a1a1a] mb-8" />
             <p className="text-[10px] font-black uppercase tracking-[0.8em]">Empty Portfolio</p>
          </div>
        )}
      </div>
    </div>

    {/* 2. CHECKOUT PROTOCOL (RIGHT COLUMN) */}
    <div className="flex-1 bg-[#fcfcfc] p-10 lg:p-20 flex flex-col overflow-y-auto scrollbar-hide">
      <div className="mb-20">
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] block mb-12">Engagement Protocol</span>
        
        {/* Contact Form */}
        <div className="space-y-12">
          <div className="relative">
            <input placeholder="Entity / Full Name" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full bg-transparent border-b border-gray-200 py-4 text-lg font-light focus:border-rose-400 outline-none transition-all placeholder:text-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-10">
            <input placeholder="Email" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full bg-transparent border-b border-gray-200 py-4 text-lg font-light focus:border-rose-400 outline-none transition-all placeholder:text-gray-200" />
            <input placeholder="Phone" type="number" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full bg-transparent border-b border-gray-200 py-4 text-lg font-light focus:border-rose-400 outline-none transition-all placeholder:text-gray-200" />
          </div>
        </div>
      </div>

      {/* Settlement Method Selection */}
      <div className="mb-20">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] block mb-8">Settlement Method</span>
        <div className="grid grid-cols-2 gap-4">
          {['mpesa', 'visa', 'emola', 'transfer'].map((m) => (
            <button
              key={m}
              onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
              className={`py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border
                ${paymentMethod === m ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-400 border-gray-100 hover:border-rose-200 hover:text-rose-400'}`}
            >
              {m === 'transfer' ? 'Bank Transfer' : m}
            </button>
          ))}
        </div>

        {/* Número de Telemóvel para M-Pesa / E-Mola */}
        {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
          <div className="flex flex-col gap-2 mb-20">
            <input
              type="tel"
              value={mobileMoneyPhone}
              onChange={e => setMobileMoneyPhone(e.target.value)}
              placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
              className="w-full border-b border-gray-200 py-4 text-lg font-light outline-none focus:border-rose-400 transition-colors placeholder:text-gray-200"
            />
            <p className="text-[10px] text-gray-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
      </div>

      {/* Summary & Final Actions */}
      <div className="mt-auto pt-10 border-t border-gray-100">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-[9px] font-black text-rose-300 uppercase tracking-[0.4em] block mb-4">Total Allocation</span>
            <div className="text-6xl font-light text-[#1a1a1a] tracking-tighter">
              {totals.grandTotal.toLocaleString()} <span className="text-xs font-bold text-gray-200 uppercase tracking-widest ml-2">{currency}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handlePayment}
            disabled={!paymentMethod || !['mpesa', 'visa', 'emola'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
            className="w-full py-7 bg-[#1a1a1a] text-white text-[10px] font-black uppercase tracking-[0.5em] hover:bg-rose-500 transition-all shadow-xl disabled:opacity-10 flex items-center justify-center gap-6 group"
          >
            Confirm & Pay 
            <div className="w-10 h-[1px] bg-white/30 group-hover:w-16 transition-all" />
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || !client.name || !client.email || (hasOrderWithPrice && ['mpesa', 'visa', 'emola'].includes(paymentMethod))}
            className="w-full py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] hover:text-[#1a1a1a] transition-all"
          >
            Finalize Request without direct payment
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

{/* Success Modal - Luxury "Editorial Confirmation" Edition */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-white/80 backdrop-blur-2xl animate-in fade-in duration-700" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-white shadow-[0_100px_120px_-40px_rgba(0,0,0,0.1)] max-w-lg w-full relative overflow-hidden transition-all transform animate-in zoom-in-95 duration-500 border border-gray-50"
      style={{ borderRadius: '4rem' }}
      onClick={e => e.stopPropagation()}
    >
      
      <div className="p-12 md:p-20 text-center">
        {/* Animated Minimalist Icon (Ref: image_e90582.jpg Aesthetic) */}
        <div className="relative inline-flex items-center justify-center mb-16">
          <div className="absolute inset-0 bg-rose-100 rounded-full blur-2xl opacity-30 animate-pulse" />
          <div className="relative w-24 h-24 border border-rose-200 rounded-full flex items-center justify-center bg-white shadow-sm">
            <Check size={32} strokeWidth={1} className="text-rose-400" />
          </div>
        </div>

        <div className="space-y-6 mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-rose-300 block">
            Protocol Finalized
          </span>
          
          <h2 className="text-4xl lg:text-5xl font-serif italic text-[#1a1a1a] leading-none tracking-tighter">
            Order <br />
            <span className="not-italic font-sans font-light text-gray-300">Confirmed.</span>
          </h2>
          
          <p className="text-gray-400 text-xs leading-relaxed max-w-[280px] mx-auto font-light uppercase tracking-widest">
            Your strategic engagement has been registered. A formal confirmation was dispatched to your address.
          </p>
        </div>

        {/* Action Button: Luxury Standard */}
        <button
          onClick={closeSuccessModal}
          className="w-full py-6 bg-[#1a1a1a] text-white rounded-full transition-all hover:bg-rose-500 active:scale-95 font-black text-[10px] uppercase tracking-[0.5em] shadow-2xl mb-12 group flex items-center justify-center gap-4"
        >
          Return to Atelier
          <div className="w-8 h-[1px] bg-white/20 group-hover:w-12 transition-all" />
        </button>
        
        {/* ID de Referência Estilo Etiqueta de Roupa */}
        <div className="pt-8 border-t border-gray-50 flex flex-col items-center gap-3">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-200">
            Reference Protocol
          </p>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-200" />
            <span className="font-sans text-xs font-bold text-[#1a1a1a] tracking-[0.3em]">
              AX-{Math.random().toString(36).substr(2, 5).toUpperCase()}
            </span>
            <div className="w-2 h-2 rounded-full bg-rose-200" />
          </div>
        </div>
      </div>

      {/* Decorative Corner Element */}
      <div className="absolute top-0 right-0 p-8">
        <div className="w-12 h-[1px] bg-gray-50 rotate-45 transform origin-right" />
      </div>
    </div>
  </div>
)}
{/* FOOTER – Luxury Editorial Edition (Ref: image_e894c5.jpg) */}
<footer className="bg-white pt-24 pb-12 overflow-visible relative border-t border-gray-100">
  <div className="max-w-7xl mx-auto px-6 relative">
    
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
      
      {/* 1. NAVEGAÇÃO EDITORIAL (Lado Esquerdo - Ref: image_e894c5.jpg) */}
      <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
        {/* Explore */}
        <div className="space-y-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Explore</h4>
          <ul className="space-y-4">
            {['Shop', 'Philosophy', 'Gallery', 'Journal', 'Sign Up/Login'].map(link => (
              <li key={link}>
                <a href="#" className="text-[13px] text-[#1a1a1a] hover:text-rose-400 transition-colors font-medium tracking-tight">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Follow Us */}
        <div className="space-y-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Follow Us</h4>
          <ul className="space-y-4">
            {['Instagram', 'Facebook', 'LinkedIn'].map(link => (
              <li key={link}>
                <a href="#" className="text-[13px] text-[#1a1a1a] hover:text-rose-400 transition-colors font-medium tracking-tight">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Us */}
        <div className="space-y-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Contact Us</h4>
          <ul className="space-y-4">
            <li>
              <a href={`mailto:${company.email}`} className="text-[13px] text-[#1a1a1a] font-medium tracking-tight hover:text-rose-400 transition-colors">
                {company.email}
              </a>
            </li>
            <li className="text-[13px] text-[#1a1a1a] font-medium tracking-tight">
              {company.phone}
            </li>
          </ul>
        </div>
      </div>

      {/* 2. NEWSLETTER BOX (Lado Direito - O Bloco de Destaque da image_e894c5.jpg) */}
      <div className="lg:col-span-5 relative">
        <div className="bg-[#1a1a1a] p-12 lg:p-16 flex flex-col items-center text-center -mt-40 shadow-2xl rounded-sm">
          <h3 className="text-white text-4xl lg:text-5xl font-sans font-bold tracking-tighter leading-tight mb-4">
            HEAR MORE <br /> FROM US
          </h3>
          <p className="text-white/40 text-xs font-light tracking-wide mb-12 max-w-[240px]">
            Get the latest news about strategic assets and new project releases.
          </p>

          <div className="w-full space-y-8">
            <div className="relative">
              <input 
                type="email" 
                placeholder="ENTER YOUR EMAIL" 
                className="w-full bg-transparent border border-white/20 rounded-full py-4 px-8 text-[10px] text-white tracking-widest outline-none focus:border-white transition-colors placeholder:text-white/20"
              />
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <button className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group hover:bg-white transition-all duration-500">
                <ArrowUpRight size={20} className="text-white group-hover:text-[#1a1a1a] transition-colors" />
              </button>
              <button className="text-[10px] font-black text-white uppercase tracking-[0.3em] border-b border-white/20 pb-1 hover:border-white transition-all">
                Subscribe
              </button>
            </div>
          </div>

          <div className="mt-16 w-full h-[1px] bg-white/10" />
          <p className="mt-8 text-[8px] text-white/20 uppercase tracking-[0.2em] leading-relaxed">
            No Spam, only quality updates to keep <br /> your operations resilient.
          </p>
        </div>
      </div>

    </div>

    {/* 3. BOTTOM BAR */}
    <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 text-[#1a1a1a]">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Logo minimalista no rodapé */}
        <span className="font-bold text-lg tracking-tighter uppercase italic">
          /{company.name}<span className="text-rose-400">.</span>
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
          © 2026 / {company.name}
        </p>
      </div>

      <div className="flex gap-12">
        <a href="#" className="text-[9px] font-black text-gray-300 hover:text-[#1a1a1a] transition-colors uppercase tracking-[0.3em]">Privacy</a>
        <a href="#" className="text-[9px] font-black text-gray-300 hover:text-[#1a1a1a] transition-colors uppercase tracking-[0.3em]">Terms</a>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">System: Optimal</span>
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

export default CosmeticsPortal;