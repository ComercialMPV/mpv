// src/templates/public-portal/variants/RetreatPortal.tsx
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

const RetreatPortal: React.FC<ConsultingProps> = ({ 
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
    <div className="min-h-screen bg-[#080808] text-slate-900 font-sans">
      {/* Modern Navbar */}
{/* Header Estilo Premium Salon */}

{/* Header & Hero Estilo Guinness Premium */}
<div className="font-sans bg-[#0a0a0a] text-white min-h-screen">
  
  {/* 1. HEADER (Logo Centralizado & Sticky) */}
  <header className="bg-[#0a0a0a]/90 backdrop-blur-md py-6 sticky top-0 z-50 border-b border-white/10">
    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
      
      {/* Links Esquerda (Ocultos em mobile para manter simetria) */}
      <nav className="hidden lg:flex items-center gap-6 flex-1">
        {['Our Story', 'Our Beers'].map((item) => (
          <a key={item} href="#" className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 hover:text-white transition-colors">
            {item}
          </a>
        ))}
      </nav>

      {/* Logo Centralizado */}
      <div className="flex justify-center flex-1">
        {company.logo ? (
          <img src={company.logo} alt={company.name} className="h-16 w-auto " />
        ) : (
          <span className="font-black text-2xl tracking-tighter uppercase italic">{company.name}</span>
        )}
      </div>

      {/* Ações Direita (Carrinho e Links) */}
      <div className="flex items-center justify-end gap-6 flex-1">
        <nav className="hidden lg:flex items-center gap-6">
           <a href="#" className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 hover:text-white">Latest</a>
        </nav>

        <div className="flex items-center gap-4">
          {/* Carrinho Preservado */}
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-400 hover:text-white transition-all">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-[#c5a059] text-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cart.length}
              </span>
            )}
          </button>
          
          <button className="hidden sm:block px-6 py-2 border border-white/20 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
            Contact
          </button>
        </div>
      </div>
    </div>
  </header>

  {/* 2. HERO SECTION – Estilo Guinness Split */}
  <section className="relative pt-20 pb-20 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Lado Esquerdo: Headline Gigante */}
        <div className="lg:col-span-7 z-10">
          <div className="flex items-center gap-4 mb-4">
             <span className="text-[#c5a059] font-bold tracking-[0.3em] uppercase text-xs">made of more</span>
             <div className="h-[1px] w-24 bg-[#c5a059]/50"></div>
          </div>
          
          <h1 className="text-4xl md:text-[6rem] font-black leading-[0.85] uppercase tracking-tighter text-white">
            {portalContent?.hero?.headline || "Guinness Original"}
          </h1>

          <div className="mt-12">
            <button className="group flex items-center gap-4 border border-white/30 px-8 py-4 rounded-full hover:border-[#c5a059] transition-all">
               <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Join the movement</span>
               <div className="w-2 h-2 rounded-full bg-[#c5a059]"></div>
            </button>
          </div>
        </div>

        {/* Lado Direito: Subheadline & Imagem Contextual */}
        <div className="lg:col-span-5 space-y-8 lg:pl-12">
          <div className="space-y-4">
            <h3 className="text-[#c5a059] text-[10px] font-bold uppercase tracking-[0.3em]">
               The Story of {company.name}
            </h3>
            <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light">
              {portalContent?.hero?.subheadline || "As deep as the colour is its taste. Crisp barley cuts through hops. A bite draws you in, bold flavours linger. Bitter marries sweet."}
            </p>
          </div>

          {/* Container de Imagem/Garrafa Simbolizada */}
          <div className="relative aspect-[3/4] w-full max-w-sm mx-auto lg:mx-0 overflow-hidden rounded-lg group">
            {portalContent?.hero?.backgroundImage ? (
              <img 
                src={getImageUrl(portalContent.hero.backgroundImage)} 
                alt="Product" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center border border-white/5">
                 <span className="text-white/10 text-90xl font-black">01</span>
              </div>
            )}
            {/* Efeito de brilho sobre a imagem */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60"></div>
          </div>
        </div>

      </div>
    </div>

    {/* Marca d'água de fundo (Opcional) */}
    <div className="absolute -bottom-20 -right-20 text-[20rem] font-black text-white/[0.02] pointer-events-none select-none">
      01
    </div>
  </section>
</div>
{/* About / Quem Somos – Estilo Heritage Guinness */}
{portalContent?.about?.enabled && (
  <section id="about" className="py-32 bg-[#0a0a0a] text-white border-t border-white/5 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
      
      {/* Cabeçalho de Secção com Linha Decorativa Dourada */}
      <div className="flex items-center gap-4 mb-16">
        <div className="h-[1px] w-12 bg-[#c5a059]"></div>
        <span className="text-[#c5a059] font-bold tracking-[0.4em] uppercase text-[10px]">
          Our Legacy / Since 1759
        </span>
      </div>

      <div className="grid lg:grid-cols-12 gap-16 items-start">
        
        {/* Coluna de Texto (Esquerda) */}
        <div className="lg:col-span-6 space-y-12">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase italic">
            {portalContent.about.title || "The Craft Behind The Name"}
          </h2>
          
          <div 
            className="text-lg md:text-xl leading-relaxed text-zinc-400 font-light max-w-xl prose prose-invert prose-p:mb-6" 
            dangerouslySetInnerHTML={{ __html: portalContent.about.body || '' }} 
          />

          <div className="pt-8">
            <button className="text-[11px] font-black uppercase tracking-[0.3em] text-white border-b-2 border-[#c5a059] pb-2 hover:text-[#c5a059] transition-colors">
              Explore our history
            </button>
          </div>
        </div>

        {/* Coluna de Imagem (Direita) */}
        <div className="lg:col-span-6 relative">
          {portalContent.about.image ? (
            <div className="relative group">
              {/* Moldura decorativa atrás da imagem */}
              <div className="absolute -inset-4 border border-[#c5a059]/20 translate-x-8 translate-y-8 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-700"></div>
              
              <div className="relative aspect-[4/5] overflow-hidden">
                <img 
                  src={getImageUrl(portalContent.about.image)} 
                  alt="About Heritage" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" 
                />
                {/* Overlay de vinheta para o look dramático */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>
              </div>
              
              {/* Selo Flutuante */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#c5a059] rounded-full flex items-center justify-center p-4 text-center shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <span className="text-black text-[9px] font-black uppercase tracking-tight leading-none">
                  Traditionally Brewed
                </span>
              </div>
            </div>
          ) : (
            /* Fallback caso não haja imagem */
            <div className="aspect-square bg-zinc-900 border border-white/5 flex items-center justify-center">
               <span className="text-zinc-800 text-[15rem] font-black italic">ESTB</span>
            </div>
          )}
        </div>

      </div>
    </div>
  </section>
)}
{/* SEARCH BAR – Estilo Guinness Premium (Dark & Gold) */}
<div className="relative flex-1 group w-full mb-12 max-w-2xl mx-auto z-20 -mt-12">
  
  {/* Search Bar Container */}
  <div className="hidden md:flex flex-1 max-w-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-none items-center p-1.5 transition-all group-hover:border-[#c5a059]/50 shadow-2xl">
    
    {/* Categoria (Estilo Select Dark) */}
    <div className="relative border-r border-white/10">
      <select 
        className="appearance-none bg-transparent pl-6 pr-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] outline-none cursor-pointer hover:text-white transition-colors"
      >
        <option className="bg-zinc-900 text-white">All Beers</option>
        <option className="bg-zinc-900 text-white">Digital</option>
        <option className="bg-zinc-900 text-white">Automation</option>
      </select>
      {/* Ícone de seta customizado */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#c5a059]">
        <ChevronDown size={12} />
      </div>
    </div>

    {/* Input de busca */}
    <input 
      type="text" 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search for solutions, services or tech..." 
      className="bg-transparent flex-1 px-6 py-2 text-sm text-white placeholder-zinc-600 outline-none font-light tracking-wide"
    />
    
    {/* Botão de busca (Estilo Guinness: Dourado ou Branco) */}
    <button className="bg-[#c5a059] text-black px-6 py-3 rounded-none hover:bg-white transition-all duration-500 font-bold active:scale-95">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest font-black">Search</span>
        <Search className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    </button>
  </div>

  {/* Tags Rápidas (Minimalismo Dark) */}
  <div className="hidden md:flex justify-start gap-6 mt-4 px-2 opacity-50 group-hover:opacity-100 transition-opacity">
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
      Trending: 
      <span className="text-[#c5a059] ml-2 cursor-pointer hover:text-white transition-colors">Digital Craft</span>
    </span>
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 cursor-pointer hover:text-white transition-colors underline decoration-[#c5a059]/30 underline-offset-4">E-commerce</span>
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 cursor-pointer hover:text-white transition-colors underline decoration-[#c5a059]/30 underline-offset-4">Automations</span>
  </div>
</div>
{/* === SEÇÕES DINÂMICAS DO PORTAL CONTENT === */}



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
{/* Item Details Modal - Guinness Dark Edition */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay Dramático */}
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} />

    <div className="relative w-full max-w-5xl bg-[#0d0d0d] border border-white/10 rounded-none overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row max-h-[90vh]">
      
      {/* Botão Fechar (Estilo Minimalista Industrial) */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-6 right-6 z-50 w-10 h-10 flex items-center justify-center bg-[#c5a059] text-black hover:bg-white transition-all group"
      >
        <X size={20} strokeWidth={3} />
      </button>

      {/* COLUNA ESQUERDA: Visual (Look de Estúdio) */}
      <div className="relative w-full md:w-[50%] bg-[#080808] overflow-hidden group border-r border-white/5 flex flex-col justify-center">
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
                    className="w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(197,160,89,0.2)] transition-transform duration-1000 group-hover:scale-110" 
                    alt={selectedItem.name} 
                  />
                </div>
                
                {itemImages.length > 1 && (
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`h-1 transition-all duration-500 ${idx === currentImgIndex ? 'w-12 bg-[#c5a059]' : 'w-4 bg-zinc-800'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package size={80} strokeWidth={1} /></div>;
        })()}
        
        {/* Marca d'água lateral */}
        <div className="absolute bottom-10 left-10 opacity-5 pointer-events-none">
           <span className="text-8xl font-black italic uppercase tracking-tighter">ESTD 1759</span>
        </div>
      </div>

      {/* COLUNA DIREITA: Conteúdo (Premium Typography) */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d] p-8 md:p-14">
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide">
          
          <div className="flex items-center gap-4 mb-8">
            <span className="text-[#c5a059] text-[10px] font-black uppercase tracking-[0.3em] border-b border-[#c5a059]/50 pb-1">
              {selectedItem.type || activeCatalog}
            </span>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] shadow-[0_0_10px_#c5a059]" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Premium Allocation</span>
            </div>
          </div>
          
          <h3 className="text-5xl font-black text-white mb-6 leading-none uppercase italic tracking-tighter">
            {selectedItem.name}
          </h3>
          
          <p className="text-zinc-400 text-base leading-relaxed mb-12 font-light border-l border-white/10 pl-6">
            {selectedItem.description}
          </p>

          {/* Especificações Técnicas */}
          <div className="space-y-10">
            <section>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <div className="w-8 h-[1px] bg-[#c5a059]"></div> Features & Specs
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {(selectedItem.includedItems || selectedItem.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 group/item">
                    <div className="w-4 h-4 rounded-none border border-[#c5a059]/30 flex items-center justify-center group-hover/item:border-[#c5a059] transition-colors">
                      <Check size={10} className="text-[#c5a059]" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-zinc-300 group-hover/item:text-white transition-colors">
                      {it.productId?.name || it.description || "Feature Item"}
                    </span>
                    {it.quantity > 1 && (
                      <span className="ml-auto text-[9px] font-black text-[#c5a059] border border-[#c5a059]/20 px-2 py-0.5 uppercase tracking-widest">
                        x{it.quantity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Metrics Grid */}
            {selectedItem.includedLimits?.length > 0 && (
              <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5">
                {selectedItem.includedLimits.map((l: any, i: number) => (
                  <div key={i} className="p-6 bg-[#0d0d0d]">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">{l.description}</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">
                      {l.maxValue} <span className="text-[10px] text-[#c5a059] uppercase not-italic">{l.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Price & CTA */}
        <div className="pt-10 mt-8 border-t border-white/10 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">Standard Rate</span>
            <div className="text-4xl font-black text-white italic tracking-tighter">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-sm font-light text-[#c5a059] not-italic">{currency}</span>
            </div>
          </div>
          
          <button 
            onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); setCurrentImgIndex(0); }} 
            className="px-10 py-5 bg-white text-black font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#c5a059] hover:text-black transition-all duration-500 active:scale-95"
          >
            Add to Selection
          </button>
        </div>
      </div>
    </div>
  </div>
)}

 {/* agora três secções sequenciais com colapso */}
  <div className="space-y-36">
{/* — Seção de Produtos Estilo Guinness "The Selection" — */}
{filteredProducts.length > 0 && (
  <section className="py-32 bg-[#0a0a0a] text-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Header da Seção: Tipografia Massiva */}
      <div className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-[#c5a059]"></div>
            <span className="text-[#c5a059] font-bold tracking-[0.4em] uppercase text-[10px]">The Collection</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] text-white uppercase italic">
            Featured <br /> <span className="text-zinc-800">Solutions</span>
          </h2>
        </div>
        <div className="lg:col-span-4 border-l border-white/10 pl-8">
          <p className="text-zinc-500 text-sm md:text-base leading-relaxed font-light">
            Optimize your supply chain with our high-end equipment and digital monitoring systems. 
            <span className="text-white block mt-2 font-bold italic uppercase tracking-widest text-[10px]">Precision in every move.</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/5">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 3)).map((item, index) => {
          
          const firstImage = Array.isArray(item.images) && item.images.length > 0 
            ? item.images[0] 
            : item.image;
            
          const imageUrl = getImageUrl(firstImage || '');

          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className="group relative bg-[#0d0d0d] p-10 flex flex-col transition-all duration-700 cursor-pointer hover:bg-[#121212] min-h-[580px] overflow-hidden"
            >
              {/* Detalhe de canto dourado no Hover */}
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-[#c5a059] border-l-[40px] border-l-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

              {/* Categoria Estilo Badge de Luxo */}
              <div className="flex justify-between items-start mb-8">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c5a059] border-b border-[#c5a059]/30 pb-1">
                  {item.category || 'Premium Tier'}
                </span>
                <div className="translate-y-[-10px] group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <ArrowUpRight size={24} className="text-[#c5a059]" />
                </div>
              </div>

              {/* Título e Descrição */}
              <div className="flex-1 z-10">
                <h3 className="text-3xl font-black mb-4 leading-none tracking-tighter text-white uppercase italic group-hover:text-[#c5a059] transition-colors duration-500">
                  {item.name}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 font-light line-clamp-3 group-hover:text-zinc-300 transition-colors">
                  {item.description || "High-performance infrastructure for global operations."}
                </p>
              </div>

              {/* Área da Imagem com Efeito de Brilho */}
              <div className="relative mt-12 h-64 w-full flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                {/* Glow de fundo no hover */}
                <div className="absolute inset-0 bg-[#c5a059]/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="max-w-[85%] max-h-full object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10" 
                  />
                ) : (
                  <Package className="text-zinc-800" size={80} strokeWidth={1} />
                )}
              </div>

              {/* Preço e Footer do Card */}
              <div className="mt-8 pt-8 border-t border-white/5 flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Value</span>
                  <div className="text-2xl font-black text-white italic tracking-tighter">
                    {getItemPrice(item).toLocaleString()} <span className="text-[10px] text-[#c5a059] not-italic ml-1">{currency}</span>
                  </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-4 py-2 group-hover:bg-white group-hover:text-black transition-all duration-500">
                  Details
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão Carregar Mais (Estilo Minimalista Heritage) */}
      {filteredProducts.length > 3 && (
        <div className="mt-24 flex flex-col items-center gap-6">
          <div className="h-16 w-[1px] bg-gradient-to-b from-[#c5a059] to-transparent" />
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="group flex flex-col items-center gap-4 bg-transparent text-white transition-all"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.4em] group-hover:text-[#c5a059] transition-colors">
              {showAllProducts ? 'View Less' : 'View Full Selection'}
            </span>
            <div className={`p-4 border border-white/10 rounded-full group-hover:border-[#c5a059] transition-all ${showAllProducts ? 'rotate-180' : ''}`}>
               <ChevronDown size={20} className="text-[#c5a059]" />
            </div>
          </button>
        </div>
      )}
    </div>
  </section>
)}

{/* — Seção de Serviços Estilo Editorial Guinness — */}
{filteredServices.length > 0 && (
  <section className="py-32 bg-[#050505] relative overflow-hidden border-t border-white/5">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Cabeçalho de Impacto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end mb-24">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[#c5a059] font-black tracking-[0.5em] uppercase text-[10px]">Expertise</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#c5a059]/50 to-transparent"></div>
          </div>
          <h2 className="text-6xl md:text-[5.5rem] font-black tracking-tighter leading-[0.85] text-white uppercase italic">
            Specialized <br /> <span className="text-zinc-800 group-hover:text-white transition-colors duration-1000">Services</span>
          </h2>
        </div>
        <div className="lg:col-span-4 border-l border-[#c5a059]/30 pl-8 pb-2">
          <p className="text-zinc-500 text-sm md:text-base leading-relaxed font-light italic">
            Oferecemos precisão, velocidade e confiança em cada etapa da sua cadeia de suprimentos digital e física.
          </p>
        </div>
      </div>

      {/* Grid de Serviços Estilo Poster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
        {filteredServices.slice(0, visibleServices).map((item, index) => (
          <div
            key={item._id}
            onClick={() => openItem(item, 'services')}
            className={`group relative overflow-hidden transition-all duration-1000 cursor-pointer bg-black
              ${index === 0 ? 'md:col-span-2 aspect-[21/9]' : 'aspect-square md:aspect-video'}`}
          >
            {/* Background com Zoom e Filtros */}
            <div className="absolute inset-0 z-0">
              {item.images?.length > 0 ? (
                <img 
                  src={getImageUrl(item.images[0])} 
                  alt={item.name}
                  className="w-full h-full object-cover grayscale opacity-50 transition-all duration-[1.5s] group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-40"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
              {/* Overlay de Gradiente Assinatura (Vignette) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />
            </div>

            {/* Conteúdo do Poster */}
            <div className="relative z-10 h-full p-10 md:p-16 flex flex-col justify-end">
              <div className="max-w-2xl transform transition-transform duration-700 group-hover:-translate-y-2">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-2 h-2 bg-[#c5a059] rotate-45 group-hover:scale-150 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059]">
                     Tier / 0{index + 1}
                   </span>
                </div>
                
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-none uppercase italic group-hover:text-white transition-colors">
                  {item.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-700 overflow-hidden">
                  <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-light">
                    {item.description || "Soluções estratégicas desenhadas para mover sua operação para o futuro com segurança."}
                  </p>
                  <div className="flex items-end justify-start md:justify-end">
                    <div className="flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-white bg-white/10 backdrop-blur-md px-6 py-3 border border-white/20 group-hover:bg-[#c5a059] group-hover:text-black transition-all">
                      Details <ArrowUpRight className="ml-3 w-4 h-4" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Marca d'água de posição */}
            <div className="absolute top-10 right-10 flex flex-col items-end opacity-20 group-hover:opacity-100 transition-all">
               <span className="text-white text-5xl font-black italic tracking-tighter leading-none">0{index + 1}</span>
               <div className="w-full h-1 bg-[#c5a059] mt-2 scale-x-0 group-hover:scale-x-100 transition-transform origin-right duration-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Botão Carregar Mais - Estilo "The Last Call" */}
      {visibleServices < filteredServices.length && (
        <div className="mt-24 flex flex-col items-center">
          <button 
            onClick={() => setVisibleServices(prev => prev + 3)}
            className="group relative px-16 py-6 bg-transparent overflow-hidden border border-white/10 active:scale-95 transition-all"
          >
            {/* Background Fill Effect */}
            <div className="absolute inset-0 bg-[#c5a059] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
            
            <div className="relative z-10 flex items-center gap-6">
               <span className="text-xs font-black uppercase tracking-[0.5em] text-white group-hover:text-black transition-colors">
                  Full Catalog
               </span>
               <Plus size={18} className="text-[#c5a059] group-hover:text-black transition-colors" strokeWidth={3} />
            </div>
          </button>
          
          <span className="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 italic">
            Quality takes time. Explore our legacy.
          </span>
        </div>
      )}
    </div>

    {/* Background Pattern de Fundo */}
    <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.03]" />
  </section>
)}

{/* ── Seção: Logistics Bundles (Estilo Guinness "The Perfect Blend") ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-32 bg-[#0a0a0a] relative overflow-hidden border-t border-white/5">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Título de Impacto Heritage */}
      <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[#c5a059] font-black tracking-[0.5em] uppercase text-[10px]">Curated Sets</span>
            <div className="h-[1px] w-24 bg-[#c5a059]/30"></div>
          </div>
          <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
            Service <span className="text-zinc-800">Bundles</span>
          </h2>
        </div>
        <p className="text-zinc-500 text-sm max-w-xs font-light italic border-l border-[#c5a059] pl-6">
          "The whole is greater than the sum of its parts." Integrated solutions for global scale.
        </p>
      </div>

      {/* Horizontal Scroll com Snap Estilo Galeria */}
      <div className="flex gap-8 overflow-x-auto pb-16 scrollbar-hide snap-x outline-none">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map((item, index) => {
            const image = getImageUrl(item.image || '');
            
            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className="group relative bg-[#0d0d0d] border border-white/5 p-2 min-w-[340px] md:min-w-[750px] snap-center transition-all duration-700 hover:border-[#c5a059]/40 cursor-pointer overflow-hidden"
              >
                <div className="bg-[#0d0d0d] p-6 md:p-10 flex flex-col md:flex-row gap-10 h-full items-center">
                  
                  {/* Imagem com Moldura Industrial */}
                  <div className="w-full md:w-2/5 aspect-square overflow-hidden bg-black relative">
                    <img 
                      src={image} 
                      alt={item.name} 
                      className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                  </div>

                  {/* Conteúdo Premium */}
                  <div className="flex-1 flex flex-col justify-between self-stretch py-2">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-black text-black bg-[#c5a059] px-3 py-1 uppercase tracking-[0.2em]">
                          Selection /{index + 1}
                        </span>
                        <div className="text-[#c5a059]/30 group-hover:text-[#c5a059] transition-colors">
                          <Layers size={22} strokeWidth={1.5} />
                        </div>
                      </div>
                      
                      <h3 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none group-hover:text-[#c5a059] transition-colors">
                        {item.name}
                      </h3>
                      
                      <p className="text-zinc-500 text-sm md:text-base leading-relaxed font-light line-clamp-3">
                        {item.description || "Complete logistics integration designed for high-scale operations."}
                      </p>
                    </div>
                    
                    {/* Footer: Price & Action */}
                    <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Bundle Rate</span>
                        <div className="text-3xl font-black text-white italic tracking-tighter">
                          {getItemPrice(item).toLocaleString()} <span className="text-xs text-[#c5a059] not-italic ml-1">{currency}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-[0.3em] border border-white/10 px-6 py-3 group-hover:bg-white group-hover:text-black transition-all">
                        Explore <ArrowUpRight size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Efeito de Gloss no Hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#c5a059]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>
            );
          })}
      </div>

      {/* Navegação Customizada (Indicadores Progressivos) */}
      <div className="flex justify-start items-center gap-4 mt-4">
        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Scroll to explore</span>
        <div className="flex gap-2">
          {filteredBundles.filter(item => item.type === 'Combo').map((_, i) => (
            <div key={i} className="h-[2px] w-12 bg-zinc-900 overflow-hidden relative">
               <div className="absolute inset-0 bg-[#c5a059] opacity-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Background Watermark */}
    <div className="absolute -bottom-10 -left-10 text-[15rem] font-black text-white/[0.02] italic select-none pointer-events-none">
      COMBOS
    </div>
  </section>
)}

{/* ── Seção: Logistics Plans (Estilo Guinness "Master Selection") ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-32 bg-[#050505] relative overflow-hidden">
    {/* Decoração de Fundo */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20 pointer-events-none" />

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      <div className="flex flex-col items-center text-center mb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[1px] w-8 bg-[#c5a059]"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">The Master Tiers</span>
          <div className="h-[1px] w-8 bg-[#c5a059]"></div>
        </div>
        <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-12">
          Fleet <span className="text-zinc-800 group-hover:text-white transition-colors duration-700">Subscriptions</span>
        </h2>
        
        {/* Toggle UI - Estilo Luxury Switch */}
        <div className="inline-flex items-center p-1.5 bg-zinc-900 border border-white/10 rounded-none shadow-2xl">
          <button className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors">Monthly</button>
          <button className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-[#c5a059] text-black font-bold">Annual Selection</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis');

          return (
            <div 
              key={plan._id} 
              className={`relative p-12 transition-all duration-700 flex flex-col group overflow-hidden
                ${isPopular 
                  ? 'bg-[#0d0d0d] shadow-[0_0_80px_rgba(197,160,89,0.1)] z-10 border-x border-[#c5a059]/20' 
                  : 'bg-[#080808] text-white hover:bg-[#0c0c0c]'}`}
            >
              {/* Badge de Recomendação Estilo Selo de Cera */}
              {isPopular && (
                <div className="absolute top-0 right-0">
                   <div className="bg-[#c5a059] text-black text-[8px] font-black uppercase tracking-[0.2em] py-2 px-10 rotate-45 translate-x-[35px] translate-y-[15px] shadow-lg">
                     Best Value
                   </div>
                </div>
              )}

              <div className="mb-12">
                <h3 className={`text-3xl font-black uppercase tracking-tighter mb-4 italic ${isPopular ? 'text-[#c5a059]' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm font-light leading-relaxed italic ${isPopular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {plan.description}
                </p>
              </div>
              
              <div className="mb-12 pt-10 border-t border-white/5 relative">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter italic text-white">
                    {getItemPrice(plan) === 0 ? 'COMP' : `${getItemPrice(plan).toLocaleString()}`}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">
                       {currency}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                       / {plan.billingCycle === 'Mensal' ? 'month' : 'annual'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Recursos - Manifest de Qualidade */}
              <ul className="space-y-6 mb-16 flex-1">
                {plan.includedLimits?.map((limit: any, i: number) => (
                  <li key={i} className="flex items-center gap-4 group/item">
                    <div className={`w-1.5 h-1.5 rotate-45 shrink-0 transition-all duration-500 ${isPopular ? 'bg-[#c5a059] shadow-[0_0_8px_#c5a059]' : 'bg-zinc-800 group-hover/item:bg-white'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover/item:text-white transition-colors">
                      {limit.description}: <span className="text-white ml-1 font-black italic">{limit.maxValue} {limit.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-4 relative z-10">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-5 font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-500
                    ${isPopular 
                      ? 'bg-white text-black hover:bg-[#c5a059]' 
                      : 'bg-transparent border border-white/10 text-white hover:bg-white hover:text-black'}`}
                >
                  {plan.price === 0 ? 'Get Started' : 'Initialize Plan'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className="w-full py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] hover:text-[#c5a059] transition-colors"
                >
                  Download Manifest Spec
                </button>
              </div>

              {/* Marca d'água de Fundo no Card */}
              <div className="absolute -bottom-6 -right-4 text-7xl font-black italic text-white/[0.02] pointer-events-none select-none">
                {plan.name.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé de Confiança */}
      <div className="mt-20 text-center">
         <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.4em]">
           All plans include <span className="text-white">24/7 Dedicated Support</span> & <span className="text-white">Global Scalability</span>
         </p>
      </div>
    </div>
  </section>
)}
  </div>
{/* CART MODAL – Guinness Heritage Logistics Edition */}
<div className={`fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 ${isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-all duration-500`}>
  
  {/* Overlay de Profundidade */}
  <div
    className="absolute inset-0 bg-black/80 backdrop-blur-md"
    onClick={() => setIsCartOpen(false)}
  />

  {/* Modal Container */}
  <div
    className={`relative w-full max-w-7xl h-full md:h-[90vh] bg-[#0a0a0a] shadow-[0_0_100px_rgba(0,0,0,1)] md:rounded-none overflow-hidden flex flex-col transform transition-all duration-700 ease-out border border-white/5 ${isCartOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-20'}`}
  >
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      
      {/* COLUNA ESQUERDA: Manifest List (Scrollable) */}
      <div className="flex-[1.4] flex flex-col min-h-0 bg-white">
        <div className="p-10 border-b border-zinc-100 flex justify-between items-end bg-[#fcfcfc]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-[#c5a059] rotate-45" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059]">Shipping Manifest</span>
            </div>
            <h2 className="text-5xl font-black text-black tracking-tighter uppercase italic">
              Your <span className="text-zinc-300">Selection</span>
            </h2>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Status: Pending Allocation</p>
            <p className="text-2xl font-black text-black italic tracking-tighter">{cart.length} <span className="text-xs not-italic text-zinc-300">Units</span></p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
          {cart.length > 0 ? (
            <div className="min-w-[600px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-[10px] font-black uppercase tracking-widest text-black pb-4">Item Description</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-black pb-4 text-center whitespace-nowrap">Quantity</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-black pb-4 text-center">Unit Price</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-black pb-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cart.map(cartItem => {
                    console.log("Conteúdo do Item no Carrinho:", cartItem);
                    return (
                      <tr key={cartItem.itemId} className="group hover:bg-zinc-50/50 transition-colors">
                        <td className="py-8">
                          <div className="flex gap-6 items-center">
                            <div className="w-24 h-24 bg-zinc-100 flex items-center justify-center p-4 relative overflow-hidden group-hover:bg-white transition-all duration-500 border border-transparent group-hover:border-zinc-200">
                              <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div>
                              <p className="text-lg font-black text-black uppercase italic tracking-tighter leading-none mb-2">{cartItem.name}</p>
                              <button 
                                onClick={() => removeFromCart(cartItem.itemId)} 
                                className="group/btn flex items-center gap-2 text-[9px] text-zinc-400 hover:text-black transition-all uppercase font-black tracking-[0.2em]"
                              >
                                <X size={12} className="group-hover/btn:rotate-90 transition-transform" /> Remove from manifest
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="inline-flex items-center border-2 border-black p-1 bg-white">
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-2 text-zinc-400 hover:text-black transition-colors"><Minus size={14} strokeWidth={3} /></button>
                            <span className="px-4 text-sm font-black text-black min-w-[40px] italic">{cartItem.quantity}</span>
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-2 text-zinc-400 hover:text-black transition-colors"><Plus size={14} strokeWidth={3} /></button>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                            {cartItem.price.toLocaleString()} {currency}
                          </span>
                        </td>
                        <td className="text-right">
                          <p className="text-lg font-black text-black italic tracking-tighter">
                            {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[10px] not-italic text-[#c5a059] ml-1">{currency}</span>
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-24">
               <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                 <Package size={40} strokeWidth={1} className="text-zinc-200" />
               </div>
               <p className="text-[11px] font-black text-black uppercase tracking-[0.5em] italic">No items allocated to queue</p>
            </div>
          )}
        </div>

        <div className="p-10 border-t border-zinc-100 bg-[#fcfcfc] flex items-center justify-between">
          <button 
            onClick={() => setIsCartOpen(false)}
            className="flex items-center gap-3 text-black text-[10px] font-black uppercase tracking-[0.4em] group"
          >
            <ArrowLeft size={16} strokeWidth={3} className="group-hover:-translate-x-2 transition-transform" /> Back to Catalog
          </button>
          <div className="h-px flex-1 mx-10 bg-zinc-200" />
        </div>
      </div>

      {/* COLUNA DIREITA: Summary (Industrial Dark) */}
      <div className="flex-1 bg-[#0d0d0d] p-10 flex flex-col overflow-y-auto scrollbar-hide text-white border-l border-white/5">
        <h3 className="text-[10px] font-black text-[#c5a059] uppercase tracking-[0.5em] mb-12 flex items-center gap-4">
           Consignee Details <div className="h-px flex-1 bg-white/5" />
        </h3>
        
        <div className="flex-1 space-y-10">
          {/* Inputs de Luxo */}
          <div className="space-y-4">
            <div className="group/field relative">
              <span className="absolute -top-2 left-4 px-2 bg-[#0d0d0d] text-[8px] font-black text-zinc-500 uppercase tracking-widest z-10 transition-colors group-focus-within/field:text-[#c5a059]">Consignee Name</span>
              <input placeholder="Full Name" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-6 py-5 bg-transparent border border-white/10 text-xs font-bold text-white outline-none focus:border-[#c5a059] transition-all" />
            </div>
            
            <div className="group/field relative">
               <span className="absolute -top-2 left-4 px-2 bg-[#0d0d0d] text-[8px] font-black text-zinc-500 uppercase tracking-widest z-10 transition-colors group-focus-within/field:text-[#c5a059]">Email Address</span>
               <input placeholder="corporate@domain.com" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-6 py-5 bg-transparent border border-white/10 text-xs font-bold text-white outline-none focus:border-[#c5a059] transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <input type='number' placeholder="Phone Number" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-6 py-5 bg-transparent border border-white/10 text-xs font-bold text-white outline-none focus:border-[#c5a059] transition-all" />
               <div className="relative">
                 <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c5a059]" />
                 <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-transparent border border-white/10 text-xs font-bold text-white outline-none focus:border-[#c5a059] [color-scheme:dark] transition-all" />
               </div>
            </div>

            {/* CHECKBOX MADE TO ORDER (Estilo Toggle de Segurança) */}
            {cart.some(item => item.madeToOrder) && (
              <div className="pt-4">
                <div className="p-6 bg-white/5 border border-white/10 hover:border-[#c5a059]/30 transition-colors cursor-pointer" 
                     onClick={() => {
                        const allChecked = cart.every(item => item.madeToOrder ? item.wantsOrder : true);
                        setCart(prev => prev.map(i => i.madeToOrder ? { ...i, wantsOrder: !allChecked } : i));
                     }}>
                  <div className="flex items-start gap-4">
                    <div className="relative flex items-center pt-1">
                      <div className={`h-6 w-6 border-2 flex items-center justify-center transition-all ${cart.every(item => item.madeToOrder ? item.wantsOrder : true) ? 'border-[#c5a059] bg-[#c5a059]' : 'border-white/20 bg-transparent'}`}>
                        {cart.every(item => item.madeToOrder ? item.wantsOrder : true) && <Check className="h-4 w-4 text-black" strokeWidth={4} />}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">Request Special Order Production</span>
                      <p className="text-[9px] text-zinc-500 font-light leading-relaxed mt-2 uppercase">
                        Importación y tasas de despacho serán aplicadas a los items fuera de inventario.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settlement Methods */}
          <div className="space-y-6">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 block">Payment Settlement</label>
            <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10">
              {['mpesa', 'visa', 'cash', 'transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                  className={`py-5 text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'bg-white text-black' : 'bg-[#0d0d0d] text-zinc-500 hover:text-white hover:bg-white/5'}`}
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
              className="w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059] transition-colors placeholder:text-zinc-600"
            />
            <p className="text-[10px] text-zinc-500 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
          </div>

          {/* Lógica de Transferência Bancária */}
          {paymentMethod === 'transfer' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-8 bg-[#121212] border-l-2 border-[#c5a059] space-y-6">
                <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest flex items-center gap-3 italic">
                  <Briefcase size={14} /> Bank Account Manifest
                </h4>
                
                {company.bankAccounts?.map((bank, idx) => (
                  <div key={idx} className="space-y-2 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <p className="text-xs font-black text-white uppercase italic">{bank.bankName}</p>
                    <div className="grid grid-cols-1 gap-1 text-[10px] uppercase font-bold tracking-tight text-zinc-400">
                      <div className="flex justify-between"><span>Holder:</span><span className="text-white">{bank.accountHolder}</span></div>
                      <div className="flex justify-between"><span>Account:</span><span className="text-white font-mono">{bank.accountNumber}</span></div>
                      {bank.nibOrIban && <div className="flex justify-between"><span>IBAN:</span><span className="text-white font-mono text-[9px]">{bank.nibOrIban}</span></div>}
                    </div>
                  </div>
                ))}

                {company.mobileWallets && (
                  <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                    {company.mobileWallets.mpesa && (
                      <div>
                        <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">M-Pesa</p>
                        <p className="text-sm font-black text-white tracking-tighter italic">{company.mobileWallets.mpesa}</p>
                      </div>
                    )}
                    {company.mobileWallets.emola && (
                      <div>
                        <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">E-Mola</p>
                        <p className="text-sm font-black text-white tracking-tighter italic">{company.mobileWallets.emola}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Totais Finais (Style Check) */}
        <div className="mt-12 pt-10 border-t border-white/10 space-y-8">
          <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">
            <span>Manifest Total</span>
            <span className="text-white italic">{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#c5a059] uppercase tracking-[0.5em] mb-2 italic underline underline-offset-8 decoration-[#c5a059]/30">Grand Total</span>
              <span className="text-6xl font-black text-white tracking-tighter leading-none italic">
                {totals.grandTotal.toLocaleString()}
              </span>
            </div>
            <span className="text-lg font-black text-white mb-1 tracking-widest italic">{currency}</span>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <button
              onClick={handlePayment}
              disabled={!paymentMethod || ['none', 'transfer', 'cash'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
              className="group w-full py-6 bg-[#c5a059] text-black text-[11px] font-black uppercase tracking-[0.4em] transition-all hover:bg-white disabled:opacity-20 active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(197,160,89,0.3)]"
            >              
              {hasOrderWithPrice ? `Pay Order Fee (${totals.grandTotal.toLocaleString()} ${currency})` : 'Authorize Transaction'}
              <ArrowUpRight size={18} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || hasOrderWithPrice}
              className="w-full py-6 bg-transparent border-2 border-white/20 text-white text-[11px] font-black uppercase tracking-[0.4em] transition-all hover:border-white hover:bg-white/5 disabled:opacity-20 active:scale-[0.98]"
            >
              {paymentMethod === 'transfer' ? 'Submit Wire Document' : 'Confirm & Dispatch'}
            </button>
            
            {hasOrderWithPrice && (
              <p className="text-[10px] text-[#c5a059] font-black text-center mt-2 uppercase tracking-tighter italic">
                * Online payment of order fee required to initialize production
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Botão Fechar de Luxo */}
    <button 
      onClick={() => setIsCartOpen(false)} 
      className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all z-20 group"
    >
      <X size={32} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-500" />
    </button>
  </div>
</div>

{/* Success Modal - Estilo Guinness "Certified Dispatch" */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-500" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-[#0d0d0d] shadow-[0_0_100px_rgba(197,160,89,0.2)] max-w-md w-full p-12 text-center relative overflow-hidden border border-white/10"
      onClick={e => e.stopPropagation()}
    >
      {/* Detalhe de Prestígio: Linha de Status Dourada */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.5)]" />
      
      {/* Decoração de Fundo (Marca d'água) */}
      <div className="absolute -top-10 -right-10 text-8xl font-black italic text-white/[0.03] select-none pointer-events-none">
        AX
      </div>

      <div className="relative z-10">
        {/* Ícone de Sucesso Estilo Selo de Qualidade */}
        <div className="inline-flex items-center justify-center w-28 h-28 border-2 border-[#c5a059]/20 rounded-none mb-10 rotate-45 mx-auto">
          <div className="w-20 h-20 bg-[#c5a059] flex items-center justify-center text-black -rotate-45 shadow-[0_0_30px_rgba(197,160,89,0.4)]">
            <Check size={40} strokeWidth={4} />
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">
              Authentication Successful
            </span>
            <div className="h-px w-12 bg-[#c5a059]/30" />
          </div>
          
          <h2 className="text-5xl font-black text-white leading-[0.85] tracking-tighter uppercase italic">
            Order <br /> <span className="text-zinc-700">Allocated</span>
          </h2>
          
          <p className="text-zinc-500 text-xs leading-relaxed max-w-[280px] mx-auto font-light italic">
            Sua solicitação foi autenticada no manifesto global. Os detalhes do despacho e o guia de rastreio foram enviados para o seu terminal de e-mail.
          </p>
        </div>

        {/* Botão de Ação Industrial */}
        <button
          onClick={closeSuccessModal}
          className="w-full py-6 bg-white text-black transition-all hover:bg-[#c5a059] active:scale-95 font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl mb-10"
        >
          Return to Operations
        </button>
        
        {/* Tracking ID Estilizado como Etiqueta de Importação */}
        <div className="pt-10 border-t border-white/5 flex flex-col items-center gap-4 group">
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-[#c5a059] rotate-45 animate-pulse" />
             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">
               Master Tracking Reference
             </p>
           </div>
           
           <div className="relative group">
             <span className="font-mono text-xl font-black text-white tracking-[0.2em] bg-white/5 px-8 py-3 border border-white/10 block italic">
               AX-{Math.random().toString(36).substr(2, 6).toUpperCase()}
             </span>
             {/* Pequenos "Cortes" nas bordas para parecer um ticket */}
             <div className="absolute top-1/2 -left-1 w-2 h-4 bg-[#0d0d0d] -translate-y-1/2 border-r border-white/10" />
             <div className="absolute top-1/2 -right-1 w-2 h-4 bg-[#0d0d0d] -translate-y-1/2 border-l border-white/10" />
           </div>

           <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest group-hover:text-zinc-500 transition-colors">
             Security Authenticated & Logged
           </p>
        </div>
      </div>
    </div>
  </div>
)}
{/* ── FOOTER: The Heritage & Operations Base ── */}
<footer className="bg-[#080808] pt-32 pb-16 overflow-hidden relative border-t border-white/5">
  {/* Detalhe de Textura: Ruído sutil para profundidade de luxo */}
  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-20 mb-32">
      
      {/* Coluna 1: Branding & Manifesto */}
      <div className="lg:col-span-5 space-y-12">
        <div className="flex items-center group">
          {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-16 w-auto" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-[#c5a059]" />
              <span className="font-black text-2xl tracking-tightest text-white uppercase italic">
                {company.name}<span className="text-[#c5a059]">.</span>LOG
              </span>
            </div>
          )}
        </div>
        
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm font-light italic">
          Definindo os padrões globais de excelência em transporte e inteligência de carga. 
          Onde a herança encontra a precisão tecnológica absoluta.
        </p>
        
        {/* Newsletter: Estilo "Corporate Subscription" */}
        <div className="space-y-6 max-w-md">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">Logistics Intelligence Newsletter</p>
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-none focus-within:border-[#c5a059] transition-all group">
            <input 
              type="email" 
              placeholder="Enter corporate email" 
              className="flex-1 px-6 bg-transparent text-white text-xs outline-none placeholder:text-zinc-700 font-bold uppercase tracking-widest" 
            />
            <button className="px-10 py-4 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Navegação Operacional */}
      <div className="lg:col-span-2 space-y-10">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white underline underline-offset-8 decoration-[#c5a059]/50">Operations</h4>
        <ul className="space-y-5">
          {['Global Fleet', 'Tracking', 'Warehouse', 'Solutions'].map(link => (
            <li key={link}>
              <a href="#" className="text-[11px] text-zinc-500 hover:text-[#c5a059] transition-all font-black uppercase tracking-[0.2em] flex items-center gap-2 group">
                <span className="w-0 group-hover:w-3 h-[1px] bg-[#c5a059] transition-all"></span>
                {link}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Contact & Hotline */}
      <div className="lg:col-span-2 space-y-10">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white underline underline-offset-8 decoration-[#c5a059]/50">Support</h4>
        <ul className="space-y-10">
          <li className="flex flex-col gap-2 group">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.3em]">Hotline 24/7</span>
            <a href={`tel:${company.phone}`} className="text-white font-black text-xl hover:text-[#c5a059] transition-colors tracking-tighter italic">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col gap-2 group">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.3em]">Terminal Email</span>
            <a href={`mailto:${company.email}`} className="text-zinc-400 font-bold text-xs hover:text-white transition-colors tracking-widest break-all uppercase underline decoration-white/10 underline-offset-4">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Social & Compliance */}
      <div className="lg:col-span-3 space-y-12">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white mb-8">Global Connectivity</h4>
          <div className="flex gap-4">
            {[Instagram, Facebook, Linkedin].map((Icon, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-black hover:bg-[#c5a059] hover:border-[#c5a059] transition-all duration-500 group"
              >
                <Icon size={18} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
        
        <div className="space-y-6 p-6 border border-white/5 bg-white/[0.02]">
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">Secure Settlement Protocols</p>
           <div className="flex flex-wrap gap-4">
              {['M-PESA', 'VISA', 'WIRE'].map(p => (
                <div key={p} className="text-[10px] font-black text-zinc-400 hover:text-white transition-colors cursor-default">
                  {p}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Legal & System Status */}
    <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-12">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="space-y-1 text-center md:text-left">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
            © 2026 {company.name} <span className="text-zinc-700 font-medium ml-2">/ Infrastructure & Heritage Logistics</span>
          </p>
          <p className="text-[9px] text-[#c5a059] font-bold uppercase tracking-[0.2em] italic">
            Built for High-Performance Standards.
          </p>
        </div>
      </div>
      
      <div className="flex gap-10 items-center">
        <a href="#" className="text-[9px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.3em]">Privacy</a>
        <a href="#" className="text-[9px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.3em]">Terms</a>
        
        {/* Status de Sistema Industrial */}
        <div className="flex items-center gap-4 pl-10 border-l border-white/10 group">
           <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-green-500 relative" />
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest leading-none">Global Server</span>
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Operational</span>
           </div>
        </div>
      </div>
    </div>
  </div>
  
  {/* Elemento Decorativo: O Número da Versão ou Ano em escala gigante */}
  <div className="absolute -bottom-20 -left-10 text-[200px] font-black text-white/[0.01] italic select-none pointer-events-none">
    2026
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

export default RetreatPortal;