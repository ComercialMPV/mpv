// src/templates/public-portal/variants/ConsultingPortal.tsx
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

interface ConsultingProps {
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

const ConsultingPortal: React.FC<ConsultingProps> = ({ 
  company, 
  slug, 
  services: initialServices,
  products: initialProducts,
  bundles: initialBundles,
  portalContent,
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
  const [paymentMethod, setPaymentMethod] = useState<'mpesa'|'emola'|'visa'|'transfer'|'emola'|'none'>('none');
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

{/* Header Estilo Premium Consulting */}
<div className="font-sans text-slate-900">
  

      {/* 2. MAIN HEADER (Logo & Search) */}
{/* 2. MAIN HEADER (Estilo Minimalista Dark) */}
{/* MAIN HEADER – Estilo Axion Minimalista */}
<header className="bg-white py-6 sticky top-0 z-50 border-b border-gray-100">
  <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
    
    {/* Logo (Lado Esquerdo) */}
    <div className="flex items-center">
      {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-8 w-auto" />
      ) : (
        <span className="font-bold text-xl tracking-tighter text-black uppercase">{company.name}</span>
      )}
    </div>

    {/* Navegação Centralizada (Hidden on Mobile) */}
    <nav className="hidden md:flex items-center gap-8">
      {['About us', 'Services', 'Our Approach', 'Technology'].map((item) => (
        <a key={item} href={`#${item.toLowerCase()}`} className="text-[13px] font-medium text-gray-500 hover:text-black transition-colors">
          {item}
        </a>
      ))}
    </nav>

    {/* Ações (Lado Direito) */}
    <div className="flex items-center gap-4">
      {/* Carrinho Preservado */}
      <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-400 hover:text-black transition-all">
        <ShoppingCart size={20} />
        {cart.length > 0 && (
          <span className="absolute top-0 right-0 bg-black text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
            {cart.length}
          </span>
        )}
      </button>
      
      <button className="hidden sm:block px-5 py-2.5 bg-black text-white text-xs font-bold rounded-full hover:bg-gray-800 transition-all">
        Contact Us
      </button>
      
    </div>
  </div>
</header>

{/* HERO SECTION – Estilo Axion Split-Layout */}
<section className="bg-white pt-16 pb-0 overflow-hidden">
  <div className="max-w-7xl mx-auto px-6">
    
    {/* Grid de Texto Superior */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
      
      {/* Título de Impacto (Col 1-8) */}
      <div className="lg:col-span-8">
        <h1 className="text-6xl md:text-[5.5rem] font-bold leading-[0.95] text-black tracking-tightest">
          {portalContent?.hero?.headline || "Let's Move Your Business Forward"}
        </h1>
      </div>

      {/* Descrição e CTA (Col 9-12) */}
      <div className="lg:col-span-4 lg:pt-4 space-y-8">
        <p className="text-gray-500 text-sm md:text-base leading-relaxed font-medium">
         
        {portalContent?.hero?.subheadline || " We provide reliable digital shipping wherever you need it. With us, you get precision, speed, and confidence at every step of your digital journey."}
        </p>
        
        <div className="flex items-center gap-4">
          <button className="bg-black text-white px-8 py-3.5 rounded-full text-xs font-bold hover:scale-105 transition-transform">
            Learn More
          </button>
        </div>
      </div>
    </div>

    {/* Imagem de Impacto (Os Containers da Imagem) */}   
      {/* Imagem ou Vídeo de Fundo (prioridade ao vídeo se existir) */}
    <div className="relative w-full aspect-[21/9] rounded-t-[3rem] overflow-hidden shadow-2xl">
      {portalContent?.hero?.backgroundVideo ? (
        <video 
          src={getImageUrl(portalContent.hero.backgroundVideo)} 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover"
        />
      ) : portalContent?.hero?.backgroundImage ? (
        <img 
          src={getImageUrl(portalContent.hero.backgroundImage)} 
          alt="Hero" 
          className="w-full h-full object-cover" 
        />
      ) : (
        <img 
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80" 
          alt="Logistics" 
          className="w-full h-full object-cover grayscale-[0.2]" 
        />
      )}
      {/* Overlay de Logo no Container (Opcional, igual à imagem) */}
      <div className="absolute bottom-12 right-12 opacity-40">
        <span className="text-white text-6xl font-black tracking-tighter uppercase italic">/{company.name}</span>
      </div>
    </div>

  </div>
</section>
 </div>
{/* SEARCH BAR – Estilo Axion Minimalista (White & Bold) */}
<div className="relative flex-1 group w-full mb-12 max-w-2xl mx-auto z-20 -mt-8">
  
  {/* Search Bar Container */}
  <div className="hidden md:flex flex-1 max-w-2xl bg-white border border-gray-100 rounded-full items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
    
    {/* Categoria (Estilo Select Minimalista) */}
    <div className="relative">
      <select 
        className="appearance-none bg-transparent pl-8 pr-10 py-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 outline-none cursor-pointer hover:text-black transition-colors border-r border-gray-100"
      >
        <option>All Services</option>
        <option>Digital</option>
        <option>Automation</option>
      </select>
      {/* Ícone de seta customizado para o select */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
        <ChevronDown size={12} />
      </div>
    </div>

    {/* Input de busca */}
    <input 
      type="text" 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search for solutions, services or tech..." 
      className="bg-transparent flex-1 px-6 py-2 text-sm text-black placeholder-gray-300 outline-none font-medium"
    />
    
    {/* Botão de busca (Estilo Axion: Preto e Sólido) */}
    <button className="bg-black text-white p-4 rounded-full hover:bg-gray-800 transition-all duration-300 shadow-lg active:scale-95">
      <Search className="w-4 h-4" />
    </button>
  </div>

  {/* Tags Rápidas (Opcional, mantém o estilo do layout de referência) */}
  <div className="hidden md:flex justify-center gap-6 mt-4 opacity-40 group-hover:opacity-100 transition-opacity">
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Popular: <span className="text-black ml-2 cursor-pointer hover:underline">Website 24h</span></span>
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer hover:underline">E-commerce</span>
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer hover:underline">Automations</span>
  </div>
</div>
{/* === SEÇÕES DINÂMICAS DO PORTAL CONTENT === */}

{/* About / Quem Somos */}
{portalContent?.about?.enabled && (
  <section id="about" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-5xl font-bold tracking-tightest mb-8">{portalContent.about.title}</h2>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="text-lg leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: portalContent.about.body || '' }} />
        {portalContent.about.image && (
          <img src={getImageUrl(portalContent.about.image)} alt="About" className="rounded-2xl shadow-xl" />
        )}
      </div>
    </div>
  </section>
)}

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

{/* Testemunhos */}
{portalContent?.testimonials?.enabled && portalContent.testimonials.items?.length > 0 && (
  <section className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-4xl font-bold text-center mb-16">What Our Clients Say</h2>
      <div className="grid md:grid-cols-3 gap-8">
        {portalContent.testimonials.items.map((t: any, i: number) => (
          <div key={i} className="bg-gray-50 p-8 rounded-2xl">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.rating || 5 }).map((_, k) => (
                <span key={k} className="text-amber-400">★</span>
              ))}
            </div>
            <p className="italic text-gray-600 mb-6">"{t.text}"</p>
            <div>
              <p className="font-bold">{t.name}</p>
              <p className="text-xs text-gray-400">{t.role} • {t.company}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)}

{/* Missão, Visão e Valores */}
{portalContent?.missionVision?.enabled && (
  <section className="py-24 bg-black text-white">
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
      <div>
        <h3 className="text-xl font-black uppercase tracking-widest mb-4">{portalContent.missionVision.mission.title}</h3>
        <p className="text-gray-300">{portalContent.missionVision.mission.content}</p>
      </div>
      <div>
        <h3 className="text-xl font-black uppercase tracking-widest mb-4">{portalContent.missionVision.vision.title}</h3>
        <p className="text-gray-300">{portalContent.missionVision.vision.content}</p>
      </div>
      <div>
        <h3 className="text-xl font-black uppercase tracking-widest mb-4">{portalContent.missionVision.values.title}</h3>
        <ul className="space-y-3">
          {portalContent.missionVision.values.items?.map((v: string, i: number) => (
            <li key={i} className="flex items-center gap-3 text-sm">→ {v}</li>
          ))}
        </ul>
      </div>
    </div>
  </section>
)}
{/* Item Details Modal - Luxury Boutique Style */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay Clean */}
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} />

    <div className="relative w-full max-w-4xl bg-white rounded-[1.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.2)] flex flex-col md:flex-row max-h-[90vh]">
      
      {/* Botão Fechar Minimalista */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 text-black hover:bg-gray-50 transition-all shadow-sm"
      >
        <X size={18} />
      </button>

      {/* COLUNA ESQUERDA: Visual/Imagens (Estilo Industrial) */}
      <div className="relative w-full md:w-[45%] bg-gray-50 overflow-hidden group border-r border-gray-100">
        {(() => {
          const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
            ? selectedItem.images 
            : selectedItem.image ? [selectedItem.image] : [];

          if (itemImages.length > 0) {
            return (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <img 
                  src={getImageUrl(itemImages[currentImgIndex])} 
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105" 
                  alt={selectedItem.name} 
                />
                
                {itemImages.length > 1 && (
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`h-1.5 transition-all ${idx === currentImgIndex ? 'w-8 bg-black' : 'w-2 bg-gray-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Package size={48} className="text-gray-300" /></div>;
        })()}
      </div>

      {/* COLUNA DIREITA: Conteúdo Técnico (Logística) */}
      <div className="flex-1 flex flex-col min-h-0 bg-white p-8 md:p-12">
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 rounded">
              {selectedItem.type || activeCatalog}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available for Dispatch</span>
          </div>
          
          <h3 className="text-4xl font-bold text-black mb-4 leading-[1.1] tracking-tightest">
            {selectedItem.name}
          </h3>
          
          <p className="text-gray-500 text-sm leading-relaxed mb-10 font-medium">
            {selectedItem.description}
          </p>

          {/* Especificações Técnicas / Included Items */}
          <div className="space-y-8">
            <section>
              <h4 className="text-black text-[11px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Settings size={14} /> Service Specifications
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {(selectedItem.includedItems || selectedItem.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-5 h-5 rounded bg-black flex items-center justify-center text-white shrink-0">
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {it.productId?.name || it.description || "Feature Item"}
                    </span>
                    {it.quantity > 1 && <span className="ml-auto bg-gray-200 px-2 py-1 rounded text-[10px] font-bold">QTY: {it.quantity}</span>}
                  </div>
                ))}
              </div>
            </section>

            {/* Logistics Metrics (Se for Subscription ou tiver limites) */}
            {selectedItem.includedLimits?.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {selectedItem.includedLimits.map((l: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{l.description}</p>
                    <p className="text-xl font-bold text-black">{l.maxValue} <span className="text-[10px]">{l.unit}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Preço e Ação Direta */}
        <div className="pt-8 mt-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rate / Service</span>
            <div className="text-3xl font-bold text-black tracking-tighter">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-sm font-medium text-gray-400">{currency}</span>
            </div>
          </div>
          
          <button 
            onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); setCurrentImgIndex(0); }} 
            className="px-8 py-4 bg-black text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-full hover:bg-gray-800 transition-all shadow-xl active:scale-95"
          >
            Book Shipment
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
  <section className="py-24 bg-white text-black relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Header da Seção Estilo Axion */}
      <div className="mb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tightest leading-[0.95] text-black uppercase">
            Featured <br /> <span className="text-gray-300">Solutions</span>
          </h2>
        </div>
        <div className="lg:col-span-5">
          <p className="text-gray-500 text-sm md:text-base leading-relaxed font-medium">
            Optimize your supply chain with our high-end equipment and digital monitoring systems. Precision in every move.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 3)).map((item, index) => {
          
          const firstImage = Array.isArray(item.images) && item.images.length > 0 
            ? item.images[0] 
            : item.image;
            
          const imageUrl = getImageUrl(firstImage || '');

          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className="group relative bg-white border border-gray-100 p-8 flex flex-col transition-all duration-500 cursor-pointer hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] hover:border-black/5 rounded-xl min-h-[520px]"
            >
              {/* Categoria Técnica */}
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 bg-gray-100 text-gray-500 rounded">
                  {item.category || 'Standard Equipment'}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight size={20} className="text-black" />
                </div>
              </div>

              {/* Título e Descrição */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3 leading-tight tracking-tight text-black group-hover:text-blue-600 transition-colors">
                  {item.name}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400 font-medium line-clamp-3">
                  {item.description || "High-performance logistics infrastructure for global operations."}
                </p>
              </div>

              {/* Área da Imagem (Fundo Cinza Industrial) */}
              <div className="relative mt-8 h-64 w-full overflow-hidden bg-gray-50 flex items-center justify-center p-8 rounded-lg">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="max-w-full max-h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : (
                  <Package className="text-gray-200" size={64} strokeWidth={1} />
                )}
                
                {/* Preço Flutuante Estilo Tag de Carga */}
                <div className="absolute bottom-4 left-4 bg-black text-white px-4 py-2 rounded text-sm font-bold shadow-xl">
                   {getItemPrice(item).toLocaleString()} <span className="text-[9px] opacity-60 ml-1">{currency}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão Carregar Mais (Estilo Axion: Black Pill) */}
      {filteredProducts.length > 3 && (
        <div className="mt-20 flex justify-center">
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="flex items-center gap-3 px-10 py-4 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-gray-800 transition-all shadow-lg active:scale-95"
          >
            {showAllProducts ? 'Show Less' : 'Explore All Solutions'}
            <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${showAllProducts ? 'rotate-180' : 'animate-bounce'}`} />
          </button>
        </div>
      )}
    </div>
  </section>
)}

 {/* — Seção de Serviços Estilo Banner E-commerce — */}
{filteredServices.length > 0 && (
  <section className="py-24 bg-gray-50/50 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Cabeçalho Split-Style (Axion) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-20">
        <div className="lg:col-span-8">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tightest leading-[0.95] text-black uppercase">
            Specialized <br /> <span className="text-gray-300">Logistics Services</span>
          </h2>
        </div>
        <div className="lg:col-span-4">
          <p className="text-gray-500 text-sm md:text-base leading-relaxed font-medium border-l-2 border-black pl-6">
            Oferecemos precisão, velocidade e confiança em cada etapa da sua cadeia de suprimentos digital e física.
          </p>
        </div>
      </div>

      {/* Grid de Serviços Estilo Editorial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.slice(0, visibleServices).map((item, index) => (
          <div
            key={item._id}
            onClick={() => openItem(item, 'services')}
            className={`group relative overflow-hidden transition-all duration-700 cursor-pointer rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-2xl
              ${index === 0 ? 'md:col-span-2 aspect-[21/9]' : 'aspect-square md:aspect-video'}`}
          >
            {/* Background Image com Overlay Corporativo */}
            <div className="absolute inset-0 z-0 bg-black">
              {item.images?.length > 0 ? (
                <img 
                  src={getImageUrl(item.images[0])} 
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60 group-hover:opacity-40"
                />
              ) : (
                <div className="w-full h-full bg-gray-900" />
              )}
              {/* Gradiente de Profundidade */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            </div>

            {/* Conteúdo do Card */}
            <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-end">
              <div className="max-w-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4 block">
                  Service / {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
                
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tighter leading-none">
                  {item.name}
                </h3>
                
                <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 line-clamp-2 font-medium">
                  {item.description || "Soluções estratégicas desenhadas para mover sua operação para o futuro com segurança."}
                </p>
                
                <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-white pt-6 border-t border-white/10 w-fit">
                  Learn More <ArrowUpRight className="ml-3 w-4 h-4 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Overlay de Canto (Número do Serviço) */}
            <div className="absolute top-8 right-8 text-white/10 text-6xl font-black italic tracking-tighter group-hover:text-blue-500/20 transition-colors">
              /{index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Botão Carregar Mais (Estilo Axion) */}
      {visibleServices < filteredServices.length && (
        <div className="mt-16 flex justify-center">
          <button 
            onClick={() => setVisibleServices(prev => prev + 3)}
            className="group flex items-center gap-4 px-12 py-5 bg-black text-white rounded-full transition-all hover:bg-gray-800 active:scale-95 shadow-xl"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Ver Catálogo Completo</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              <Plus size={14} />
            </div>
          </button>
        </div>
      )}
    </div>
  </section>
)}

{/* ── Seção: Logistics Bundles (Estilo Industrial Clean) ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-24 bg-white relative overflow-hidden border-t border-gray-100">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Título Estilo Axion */}
      <div className="mb-16">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2 block">Integrated Solutions</span>
        <h2 className="text-5xl md:text-6xl font-bold text-black tracking-tightest uppercase leading-none">
          Service <span className="text-gray-300">Bundles</span>
        </h2>
      </div>

      {/* Horizontal Scroll com Snap */}
      <div className="flex gap-6 overflow-x-auto pb-12 scrollbar-hide snap-x">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map((item, index) => {
            const image = getImageUrl(item.image || '');
            
            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className="group relative bg-gray-50 border border-gray-100 rounded-xl p-1 min-w-[320px] md:min-w-[600px] snap-center transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] cursor-pointer overflow-hidden"
              >
                <div className="bg-white rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-8 h-full">
                  
                  {/* Imagem Técnica */}
                  <div className="w-full md:w-2/5 aspect-video md:aspect-square rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    <img 
                      src={image} 
                      alt={item.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" 
                    />
                  </div>

                  {/* Conteúdo Informativo */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[9px] font-black text-white bg-black px-2 py-1 uppercase tracking-widest">
                          Bundle /{index + 1}
                        </span>
                        <div className="text-blue-600">
                          <Layers size={18} />
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-black mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </h3>
                      
                      <p className="text-gray-400 text-sm leading-relaxed font-medium line-clamp-3">
                        {item.description || "Complete logistics integration designed for high-scale operations."}
                      </p>
                    </div>
                    
                    {/* Footer do Card */}
                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-300 uppercase">Package Rate</span>
                        <span className="text-xl font-bold text-black">
                          {getItemPrice(item).toLocaleString()} <span className="text-xs text-gray-400">{currency}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] font-black text-black uppercase tracking-widest">
                        View Details <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge de "Economia/Destaque" Opcional */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="bg-blue-600 text-white text-[8px] font-black py-1 px-3 rounded-full">
                     OPTIMIZED PRICE
                   </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Navegação Visual (Dots) */}
      <div className="flex justify-center gap-2 mt-4">
        {filteredBundles.filter(item => item.type === 'Combo').map((_, i) => (
          <div key={i} className="h-1 w-8 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-black w-0 group-hover:w-full transition-all duration-500" />
          </div>
        ))}
      </div>
    </div>
  </section>
)}

{/* ── Seção: Logistics Plans (SaaS Industrial Style) ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-24 bg-gray-50 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      <div className="flex flex-col items-center text-center mb-16">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-4 block">Pricing & Tiers</span>
        <h2 className="text-5xl md:text-6xl font-bold text-black tracking-tightest uppercase mb-8">
          Fleet <span className="text-gray-300">Subscriptions</span>
        </h2>
        
        {/* Toggle UI - Estilo Axion Minimalista */}
        <div className="inline-flex items-center p-1 bg-white border border-gray-200 rounded-full shadow-sm">
          <button className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Monthly</button>
          <button className="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-black text-white rounded-full shadow-lg">Annual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis');

          return (
            <div 
              key={plan._id} 
              className={`relative p-10 rounded-xl transition-all duration-500 flex flex-col group
                ${isPopular 
                  ? 'bg-black text-white shadow-2xl scale-105 z-10' 
                  : 'bg-white border border-gray-100 text-black hover:border-gray-300'}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-10 bg-blue-600 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded text-white shadow-xl">
                  Recommended Tier
                </div>
              )}

              <div className="mb-8">
                <h3 className={`text-2xl font-bold uppercase tracking-tighter mb-2 ${isPopular ? 'text-white' : 'text-black'}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs font-medium leading-relaxed h-10 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
              </div>
              
              <div className="mb-10 pt-8 border-t border-gray-100/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tightest">
                    {getItemPrice(plan) === 0 ? 'FREE' : `${getItemPrice(plan).toLocaleString()}`}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isPopular ? 'text-gray-500' : 'text-gray-400'}`}>
                     {currency} / {plan.billingCycle === 'Mensal' ? 'mês' : plan.billingCycle === 'Anual' ? 'ano' : plan.billingCycle}
                  </span>
                </div>
              </div>

              {/* Lista de Recursos Estilo Manifest */}
              <ul className="space-y-4 mb-12 flex-1">
                {plan.includedLimits?.map((limit: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[11px] font-bold uppercase tracking-tight">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'}`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <span className={isPopular ? 'text-gray-300' : 'text-gray-600'}>
                      {limit.description}: <span className={isPopular ? 'text-white' : 'text-black'}>{limit.maxValue} {limit.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95
                    ${isPopular 
                      ? 'bg-blue-600 text-white hover:bg-blue-500' 
                      : 'bg-black text-white hover:bg-gray-800'}`}
                >
                  {plan.price === 0 ? 'Get Started' : 'Activate Plan'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className={`w-full py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all
                    ${isPopular ? 'text-gray-500 hover:text-white' : 'text-gray-300 hover:text-black'}`}
                >
                  Full Specifications
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
{/* CART MODAL – Axion Logistics Edition */}
<div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 ${isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-all duration-300`}>
  
  {/* Overlay Industrial */}
  <div
    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
    onClick={() => setIsCartOpen(false)}
  />

  {/* Modal Container */}
  <div
    className={`relative w-full max-w-6xl max-h-[90vh] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden flex flex-col lg:row transform transition-all duration-500 ${isCartOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}
  >
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      
      {/* COLUNA ESQUERDA: Carrinho (Scrollable) */}
      <div className="flex-[1.4] flex flex-col min-h-0 bg-white">
        <div className="p-8 border-b border-gray-100 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-1 block">Logistics Queue</span>
            <h2 className="text-4xl font-bold text-black tracking-tightest uppercase">
              Shopping <span className="text-gray-300">Cart</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{cart.length} Units Allocated</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {cart.length > 0 ? (
            <div className="min-w-[500px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-[10px] font-black uppercase tracking-widest text-gray-400 pb-4">Manifest Details</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-gray-400 pb-4 text-center">Qty</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-gray-400 pb-4 text-center">Unit Price</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-gray-400 pb-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cart.map(cartItem => {
    // 1. O console log vai aqui para você ver o que tem no item
    console.log("Conteúdo do Item no Carrinho:", cartItem);

    // 2. Agora você precisa usar o 'return' explicitamente
    return (
        <tr key={cartItem.itemId} className="group">
            <td className="py-6">
                <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center p-3 relative overflow-hidden group-hover:border-blue-600/30 transition-colors">
                        <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-black uppercase tracking-tight">{cartItem.name}</p>
                        <button 
                            onClick={() => removeFromCart(cartItem.itemId)} 
                            className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-red-600 transition-colors mt-2 uppercase font-black tracking-widest"
                        >
                            <X size={10} /> De-allocate Item
                        </button>
                    </div>
                </div>
            </td>
            <td className="text-center">
                <div className="inline-flex items-center bg-gray-50 border border-gray-100 rounded-lg p-1">
                    <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-1.5 text-gray-400 hover:text-black"><Minus size={12} strokeWidth={3} /></button>
                    <span className="px-3 text-xs font-black text-black min-w-[30px]">{cartItem.quantity}</span>
                    <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-1.5 text-gray-400 hover:text-black"><Plus size={12} strokeWidth={3} /></button>
                </div>
            </td>
            <td className="text-center text-xs font-bold text-gray-400">
                {cartItem.price.toLocaleString()} {currency}
            </td>
            <td className="text-right text-sm font-black text-black">
                {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] text-gray-300">{currency}</span>
            </td>
        </tr>
    ); // fim do return
})}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 grayscale">
               <Package size={60} strokeWidth={1} className="text-black mb-4" />
               <p className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Empty Queue</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={() => setIsCartOpen(false)}
            className="flex items-center gap-2 text-black text-[10px] font-black uppercase tracking-[0.3em] hover:gap-4 transition-all"
          >
            <ArrowLeft size={14} strokeWidth={3} /> Return to Operations
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA: Resumo e Pagamento (Fixa) */}
      <div className="flex-1 bg-gray-50 border-l border-gray-100 p-8 flex flex-col overflow-y-auto scrollbar-hide">
        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-8">Service Summary</h3>
        
        <div className="flex-1 space-y-8">
          {/* Dados de Entrega */}
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Destination & Consignee</label>
            <div className="space-y-2">
              <input placeholder="Consignee Name" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-lg text-xs font-bold text-black placeholder:text-gray-300 focus:border-black outline-none transition-all shadow-sm" />
              <input placeholder="Corporate E-mail" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-lg text-xs font-bold text-black placeholder:text-gray-300 focus:border-black outline-none transition-all shadow-sm" />
             <input type='number' placeholder="Consignee Phone" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-lg text-xs font-bold text-black placeholder:text-gray-300 focus:border-black outline-none transition-all shadow-sm" />
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-white border border-gray-200 rounded-lg text-xs font-bold text-black outline-none focus:border-black [color-scheme:light] shadow-sm" />
              </div>
            </div>

            {/* CHECKBOX MADE TO ORDER (Reposicionado conforme solicitado) */}
            {cart.some(item => item.madeToOrder) && (
              <div className="pt-2">
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center pt-0.5">
                      <input 
                        type="checkbox" 
                        checked={cart.every(item => item.madeToOrder ? item.wantsOrder : true)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCart(prev => prev.map(i => i.madeToOrder ? { ...i, wantsOrder: checked } : i));
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:bg-black transition-all" 
                      />
                      <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" strokeWidth={4} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-black">Request Special Order</span>
                      <p className="text-[9px] text-gray-400 font-medium leading-tight mt-1">
                        Ativar produção sob demanda para itens fora de estoque. Taxas e prazos de importação serão aplicados.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Métodos de Pagamento */}
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Settlement Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['mpesa', 'visa', 'emola', 'transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                  className={`py-4 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'border-black bg-black text-white shadow-xl translate-y-[-2px]' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400'}`}
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
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-black transition-colors"
            />
            <p className="text-[10px] text-gray-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
          </div>
{paymentMethod === 'transfer' && (
  <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
      <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
        <Briefcase size={12} /> Dados para Transferência Bancária
      </h4>
      
      {/* Contas Bancárias */}
      {company.bankAccounts && Array.isArray(company.bankAccounts) && company.bankAccounts.length > 0 ? (
        <>
          {company.bankAccounts.map((bank, idx) => (
            <div key={idx} className="pb-3 last:pb-0 border-b last:border-0 border-blue-100">
              <p className="text-[11px] font-black text-black uppercase">{bank.bankName}</p>
              <div className="grid grid-cols-1 gap-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-[9px] text-blue-700 uppercase font-bold tracking-tighter">Titular:</span>
                  <span className="text-[10px] font-medium text-black">{bank.accountHolder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-blue-700 uppercase font-bold tracking-tighter">Conta:</span>
                  <span className="text-[10px] font-mono font-bold text-black">{bank.accountNumber}</span>
                </div>
                {bank.nibOrIban && (
                  <div className="flex justify-between">
                    <span className="text-[9px] text-blue-700 uppercase font-bold tracking-tighter">NIB/IBAN:</span>
                    <span className="text-[10px] font-mono font-bold text-black">{bank.nibOrIban}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      ) : null}

      {/* Carteiras Móveis */}
      {company.mobileWallets && (company.mobileWallets.mpesa || company.mobileWallets.emola) && (
        <div className={`${company.bankAccounts?.length > 0 ? 'pt-2 border-t border-blue-100' : ''}`}>
          <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-widest mb-3">Carteiras Móveis</h4>
          <div className="flex flex-wrap gap-6">
            {company.mobileWallets.mpesa && (
              <div className="flex flex-col">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mb-1">M-Pesa</p>
                <p className="text-[11px] font-bold text-black">{company.mobileWallets.mpesa}</p>
              </div>
            )}
            {company.mobileWallets.emola && (
              <div className="flex flex-col">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mb-1">E-Mola</p>
                <p className="text-[11px] font-bold text-black">{company.mobileWallets.emola}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <p className="text-[8px] text-blue-600 font-medium italic pt-2">
        * Por favor, anexe o comprovativo após a transferência ou envie para o e-mail de suporte.
      </p>
    </div>
  </div>
)}
        </div>
  

        {/* Totais Finais */}
        <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 space-y-6">
          <div className="flex justify-between items-center font-bold text-gray-400 text-[10px] uppercase tracking-widest">
            <span>Net Subtotal</span>
            <span>{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Payable</span>
              <span className="text-4xl font-black text-black tracking-tightest leading-none">
                {totals.grandTotal.toLocaleString()}
              </span>
            </div>
            <span className="text-sm font-black text-black mb-1 tracking-widest">{currency}</span>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handlePayment}
              disabled={!paymentMethod || ['none', 'transfer', 'emaola'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
              className="w-full py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-gray-800 transition-all shadow-lg disabled:opacity-20 disabled:grayscale active:scale-95"
            >             
              {hasOrderWithPrice ? `Pagar Taxa de Encomenda (${total.grandTotal.toLocaleString()} ${currency})` : 'Authorize Payment Online'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || hasOrderWithPrice}
              className="w-full py-5 bg-white border border-black text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full transition-all hover:bg-gray-50 disabled:opacity-20 active:scale-95"
            >
              {paymentMethod === 'transfer' ? 'Submit Wire Confirmation' : 'Finalize Dispatch'}
            </button>
            {hasOrderWithPrice && (
              <p className="text-[9px] text-amber-600 font-bold text-center mt-2 uppercase tracking-tighter">
                * Requer pagamento online da taxa de encomenda para prosseguir
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Botão Fechar */}
    <button 
      onClick={() => setIsCartOpen(false)} 
      className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center text-gray-300 hover:text-black hover:bg-gray-100 rounded-full transition-all z-20"
    >
      <X size={24} strokeWidth={3} />
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

export default ConsultingPortal;