// src/templates/public-portal/variants/ShoestorePortal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText, MessageCircle, LayoutGrid, Package, Menu, ArrowRight, ArrowLeft, ArrowUpRight, Layers, Settings, Utensils, Briefcase, PhoneCall, Heart, ChevronDown, ShoppingBag, ChevronLeft, ChevronRight, Play,Plus, Trash2,
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

interface ShoestoreProps {
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

const ShoestorePortal: React.FC<ShoestoreProps> = ({ 
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


{/* Header Estilo Premium Consulting */}
<div className="font-sans text-slate-900">
  

      {/* 2. MAIN HEADER (Logo & Search) */}
{/* 2. MAIN HEADER (Estilo Minimalista Dark) */}
{/* MAIN HEADER – Estilo Axion Minimalista */}
<header className="bg-white py-4 sticky top-0 z-50 border-b border-gray-50">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 items-center">
    
    {/* Logo (Esquerda) */}
    <div className="flex items-center">
      {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-6 w-auto" />
      ) : (
        <span className="font-serif text-xl tracking-tight text-black">{company.name}</span>
      )}
    </div>

    {/* Navegação Centralizada (Inspirada na imagem) */}
    <nav className="hidden md:flex items-center justify-center gap-6">
      {['Mulheres', 'Homens', 'Lojas', 'Cupons'].map((item) => (
        <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-bold uppercase tracking-widest text-gray-800 hover:opacity-60 transition-opacity">
          {item}
        </a>
      ))}
    </nav>

    {/* Ações (Direita) */}
    <div className="flex items-center justify-end gap-5">
      <button className="text-gray-800 hover:opacity-60"><Search size={18} strokeWidth={1.5} /></button>
      
      {/* Carrinho Preservado */}
      <button onClick={() => setIsCartOpen(true)} className="relative text-gray-800 hover:opacity-60 transition-all">
        <ShoppingBag size={18} strokeWidth={1.5} />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-black text-white text-[7px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
            {cart.length}
          </span>
        )}
      </button>

      <button className="text-gray-800 hover:opacity-60"><User size={18} strokeWidth={1.5} /></button>
    </div>
  </div>
</header>

{/* HERO SECTION – Sapataria Itália Refined Grid */}
<section className="bg-[#F9F7F5] pt-8 pb-16 overflow-hidden">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Lado Esquerdo: Imagem Principal Vertical (Campanha) */}
      <div className="lg:col-span-5 lg:h-[100vh] md:h-[650px] sm:h-[650px] rounded-[2.5rem] overflow-hidden shadow-sm group">
        {portalContent?.hero?.backgroundVideo ? (
          <video 
            src={getImageUrl(portalContent.hero.backgroundVideo)} 
            autoPlay 
            muted 
            loop 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          />
        ) : (
          <img 
            src={getImageUrl(portalContent?.hero?.backgroundImage) || "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80"} 
            alt="Main Campaign" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          />
        )}
      </div>

      {/* Lado Direito: Info e Produtos Recentes */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Card de Texto Elegante (Sem CTAs) */}
        <div className="bg-white/60 backdrop-blur-sm p-14 rounded-[2.5rem] flex-grow flex flex-col justify-center border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-stone-300" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-stone-400 font-bold block">
              Loja S 14 E 15 Hotel Rovuma
            </span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] text-stone-900 mb-8 uppercase italic">
            {portalContent?.hero?.headline || "O Coração e a Alma do Calçado Italiano"}
          </h1>

          <div className="flex items-center gap-6 mb-8">
            <div className="inline-block border border-orange-100 bg-orange-50/50 px-6 py-2 rounded-full">
               <span className="text-sm font-serif italic text-orange-900">Handcrafted</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 italic">Prestigio & Tradição</span>
          </div>

          <p className="max-w-lg text-stone-500 text-sm leading-[1.8] font-medium italic font-serif">
            {portalContent?.hero?.subheadline || "Utilizamos apenas os melhores materiais. A nossa colecção inclui tudo, desde mocassins a botas da moda."}
          </p>
        </div>

        {/* Grid de Imagens Dinâmicas (Últimos 2 Produtos) */}
        <div className="grid grid-cols-2 gap-6 h-[220px]">
          {(() => {
            // Pegamos os dois últimos produtos adicionados
            const latestProducts = [...(products || [])].reverse().slice(0, 2);
            
            // Fallback caso não existam produtos suficientes
            const fallbacks = [
              "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80",
              "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80"
            ];

            return [0, 1].map((index) => (
              <div key={index} className="rounded-[2rem] overflow-hidden bg-white relative group border border-stone-100">
                <img 
                  src={latestProducts[index]?.image ? getImageUrl(latestProducts[index].image) : fallbacks[index]} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={latestProducts[index]?.name || `Novidade ${index + 1}`} 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
                
                {/* Overlay discreto com o nome do produto */}
                {latestProducts[index] && (
                  <div className="absolute bottom-4 left-6">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white drop-shadow-md">
                      {latestProducts[index].name}
                    </p>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>

      </div>
    </div>
  </div>
</section>
 </div>
{/* SEARCH & FILTERS SECTION – Estilo Sapataria Itália Dinâmico */}
<div className="max-w-7xl mx-auto px-6 mb-16">
  
  <div className="mb-10 max-w-4xl">
    <h2 className="text-3xl md:text-4xl font-serif leading-tight uppercase italic mb-4">
      Explore a nossa <span className="underline decoration-1 underline-offset-8">Coleção</span>
    </h2>
  </div>

  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-stone-100 pb-8">
    
    {/* Filtros de Categoria Dinâmicos */}
    <div className="flex flex-wrap gap-3">
      {(() => {
        // 1. Extrair categorias únicas de produtos e serviços
        const allCategories = [
          ...new Set([
            ...products.map(p => p.category).filter(Boolean),
            ...services.map(s => s.category).filter(Boolean)
          ])
        ];

        // 2. Adicionar 'Todos' ao início
        const filterOptions = ['Todos', ...allCategories];

        return filterOptions.map((cat) => {
          // 3. Contagem dinâmica de itens por categoria
          const itemCount = cat === 'Todos' 
            ? products.length + services.length 
            : products.filter(p => p.category === cat).length + services.filter(s => s.category === cat).length;

          // Assumindo que você tem um estado 'activeCategory' (se não, use o searchTerm ou activeCatalog)
          const isActive = (cat === 'Todos' && !searchTerm) || searchTerm.toLowerCase() === cat.toLowerCase();

          return (
            <button 
              key={cat}
              onClick={() => cat === 'Todos' ? setSearchTerm('') : setSearchTerm(cat)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all border flex items-center gap-2 ${
                isActive
                ? 'bg-stone-900 text-white border-stone-900' 
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-900 hover:text-stone-900'
              }`}
            >
              {cat}
              <span className={`text-[8px] opacity-60 font-sans ${isActive ? 'text-stone-400' : 'text-stone-300'}`}>
                {itemCount}
              </span>
            </button>
          );
        });
      })()}
    </div>

    {/* Busca Minimalista */}
    <div className="relative w-full md:w-80 group">
      <input 
        type="text" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="O QUE PROCURA HOJE?" 
        className="w-full bg-transparent border-b border-stone-300 py-2 pr-10 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-stone-900 transition-colors placeholder:text-stone-300"
      />
      <button className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 group-hover:text-stone-900 transition-colors">
        <Search size={16} strokeWidth={1.5} />
      </button>
    </div>

  </div>

  <div className="flex justify-end mt-4">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
      <span>Grelha</span>
      <LayoutGrid size={14} className="text-stone-900" />
    </div>
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
{/* Item Details Modal - Estilo Sapataria Itália */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay com desfoque elegante */}
    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} />

    <div className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col md:flex-row max-h-[95vh]">
      
      {/* Botão Fechar Minimalista */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-6 right-6 z-50 p-2 text-stone-400 hover:text-black transition-colors"
      >
        <X size={24} strokeWidth={1} />
      </button>

      {/* COLUNA ESQUERDA: Galeria de Imagens Artística */}
      <div className="relative w-full md:w-[50%] bg-[#F9F7F5] overflow-hidden group">
        {(() => {
          const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
            ? selectedItem.images 
            : selectedItem.image ? [selectedItem.image] : [];

          if (itemImages.length > 0) {
            return (
              <div className="h-full flex flex-col items-center justify-center p-12">
                <img 
                  src={getImageUrl(itemImages[currentImgIndex])} 
                  className="w-full h-auto object-contain transition-transform duration-1000 group-hover:scale-110" 
                  alt={selectedItem.name} 
                />
                
                {/* Dots de navegação elegantes */}
                {itemImages.length > 1 && (
                  <div className="absolute bottom-10 flex gap-3">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`h-1.5 transition-all rounded-full ${idx === currentImgIndex ? 'w-10 bg-black' : 'w-2 bg-stone-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300"><Package size={48} strokeWidth={1} /></div>;
        })()}
        
        {/* Label Flutuante de Categoria */}
        <div className="absolute top-8 left-8">
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 border-b border-stone-200 pb-1">
             {selectedItem.type || "Coleção Exclusiva"}
           </span>
        </div>
      </div>

      {/* COLUNA DIREITA: Detalhes e Artesanato */}
      <div className="flex-1 flex flex-col min-h-0 bg-white p-8 md:p-14">
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          
          <div className="mb-8">
            <h3 className="font-serif text-4xl md:text-5xl italic text-stone-900 leading-tight mb-4">
              {selectedItem.name}
            </h3>
            <div className="flex items-center gap-4">
              <span className="inline-block px-4 py-1 border border-orange-200 bg-orange-50/50 text-orange-800 text-[10px] font-bold uppercase tracking-widest rounded-full">
                Artesanato Tradicional
              </span>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Disponibilidade: Imediata</span>
            </div>
          </div>
          
          <div className="space-y-10">
            {/* Descrição */}
            <section>
              <p className="text-stone-600 text-base leading-relaxed font-light">
                {selectedItem.description || "Uma peça que combina o rigor técnico italiano com a alma vibrante moçambicana. Desenvolvido para oferecer conforto excepcional sem comprometer a elegância atemporal."}
              </p>
            </section>

            {/* Detalhes da Peça */}
            <section>
              <h4 className="text-black text-[11px] font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <div className="h-[1px] w-8 bg-black" /> Detalhes da Peça
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {(selectedItem.includedItems || selectedItem.items || []).map((it, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-stone-100 group hover:border-black transition-colors">
                    <span className="text-sm text-stone-500 group-hover:text-black transition-colors font-medium">
                      {it.productId?.name || it.description || "Acabamento Premium"}
                    </span>
                    <span className="text-[10px] font-bold text-stone-300 uppercase">Verificado</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Medidas/Especificações */}
            {selectedItem.includedLimits?.length > 0 && (
              <div className="grid grid-cols-2 gap-6 bg-[#F9F7F5] p-6 rounded-2xl">
                {selectedItem.includedLimits.map((l, i) => (
                  <div key={i}>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">{l.description}</p>
                    <p className="text-lg font-serif italic text-stone-900">{l.maxValue} {l.unit}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Preço e Botão de Reserva */}
        <div className="pt-10 mt-8 border-t border-stone-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Valor Unitário</span>
            <div className="text-3xl font-serif text-stone-900 italic">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-xs font-sans not-italic font-bold ml-1">{currency}</span>
            </div>
          </div>
          
          <button 
            onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); setCurrentImgIndex(0); }} 
            className="px-10 py-5 bg-stone-900 text-white font-bold text-[10px] uppercase tracking-[0.25em] rounded-full hover:bg-black transition-all shadow-2xl active:scale-95 flex items-center gap-3"
          >
            Adicionar à Reserva <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  </div>
)}

 {/* agora três secções sequenciais com colapso */}
  <div className="space-y-36">
  {/* — Seção de Produtos Estilo Marketplace — */}
{/* — Seção de Produtos Estilo Sapataria Itália — */}
{filteredProducts.length > 0 && (
  <section className="py-24 bg-white text-black relative">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Header da Seção Estilo Editorial */}
      <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-serif leading-[1.1] text-stone-900 uppercase italic">
            Calçado de <span className="text-stone-300">Alta Qualidade</span>
          </h2>
          <div className="h-[1px] w-24 bg-stone-900 mt-6" />
        </div>
        <p className="max-w-xs text-stone-500 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed">
          O artesanato tradicional da Itália com o estilo e cultura Moçambicana.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 3)).map((item) => {
          
          const firstImage = Array.isArray(item.images) && item.images.length > 0 
            ? item.images[0] 
            : item.image;
            
          const imageUrl = getImageUrl(firstImage || '');

          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className="group cursor-pointer flex flex-col"
            >
              {/* Container da Imagem (Fundo Cinza Suave como na imagem) */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F2F2F2] rounded-2xl flex items-center justify-center p-10 transition-all duration-700 group-hover:bg-[#EBEBEB]">
                
                {/* Badge de Promoção (Igual ao "GANHE 10%" da imagem) */}
                <div className="absolute top-6 left-6">
                  <span className="bg-[#F6D5C3] text-[#A66D52] text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                    Novo Modelo
                  </span>
                </div>

                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105" 
                  />
                ) : (
                  <Package className="text-stone-300" size={48} strokeWidth={1} />
                )}
                
                {/* Overlay de Ação Rápida (Estilo "ADICIONAR À RESERVA" que aparece no hover) */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      Ver Detalhes
                   </div>
                </div>
              </div>

              {/* Informações do Produto (Tipografia da imagem) */}
              <div className="mt-6 text-center">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-stone-900 mb-2 group-hover:text-stone-500 transition-colors">
                  {item.name}
                </h3>
                
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg font-serif italic text-stone-900">
                    {getItemPrice(item).toLocaleString()} {currency}
                  </span>
                </div>
                
                {/* Linha decorativa que aparece no hover */}
                <div className="mt-4 flex justify-center">
                  <div className="h-[1px] w-0 bg-stone-900 group-hover:w-12 transition-all duration-500" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão Carregar Mais (Estilo Pill Minimalista) */}
      {filteredProducts.length > 3 && (
        <div className="mt-20 flex justify-center">
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="group flex flex-col items-center gap-4"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 group-hover:text-black transition-colors">
              {showAllProducts ? 'Ver Menos' : 'Descobrir Mais'}
            </span>
            <div className="w-12 h-[1px] bg-stone-200 group-hover:w-20 group-hover:bg-black transition-all duration-500" />
          </button>
        </div>
      )}
    </div>
  </section>
)}

{/* — Seção de Serviços Estilo Grid Mosaico Nike — */}
{filteredServices.length > 0 && (
  <section className="py-24 bg-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Cabeçalho Editorial */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif leading-tight text-stone-900 uppercase italic">
            Serviços <span className="text-stone-300">Exclusivos</span>
          </h2>
          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-4">
            A excelência em cada detalhe da sua jornada
          </p>
        </div>
      </div>

      {/* Grid Assimétrico Estilo a Imagem (Mosaico) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[600px]">
        
        {/* Lado Esquerdo: Banner Grande (Equivalente ao tênis laranja) */}
        {filteredServices[0] && (
          <div 
            onClick={() => openItem(filteredServices[0], 'services')}
            className="md:col-span-4 relative group cursor-pointer overflow-hidden rounded-[2.5rem] bg-[#96D1B0]"
          >
            <img 
              src={getImageUrl(filteredServices[0].images?.[0] || filteredServices[0].image)} 
              alt={filteredServices[0].name}
              className="w-full h-full object-cover mix-blend-multiply opacity-90 transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute bottom-10 left-10 right-10 z-10">
              <h3 className="text-2xl font-serif italic text-white leading-tight mb-2">
                {filteredServices[0].name}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/80 border-b border-white/30 pb-1">
                Explorar Serviço
              </span>
            </div>
          </div>
        )}

        {/* Centro: Duas imagens empilhadas (Equivalente ao tênis azul e o banner de 25% OFF) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {/* Card Superior */}
          {filteredServices[1] && (
            <div 
              onClick={() => openItem(filteredServices[1], 'services')}
              className="h-1/2 relative group cursor-pointer overflow-hidden rounded-[2.5rem] bg-[#F1F3F2]"
            >
              <img 
                src={getImageUrl(filteredServices[1].images?.[0] || filteredServices[1].image)} 
                className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-105"
                alt={filteredServices[1].name}
              />
              <div className="absolute top-8 left-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{filteredServices[1].name}</p>
              </div>
            </div>
          )}
          
          {/* Card Inferior (Estilo Banner Promocional) */}
          <div className="h-1/2 relative overflow-hidden rounded-[2.5rem] bg-stone-800 flex flex-col items-center justify-center text-center p-8">
            <div className="relative z-10">
              <h4 className="text-white text-xl font-bold uppercase tracking-tighter mb-2">
                SEM CUPONS <br/> <span className="text-3xl text-[#96D1B0]">DISPONIVEIS</span>
              </h4>
              <p className="text-white/40 text-[9px] uppercase tracking-widest">Brevemente teremos cupons disponíveis</p>
            </div>
            {/* Elementos visuais de fundo (sapatos pequenos como na imagem) */}
            <div className="absolute inset-0 opacity-20 flex justify-around items-center grayscale pointer-events-none">
                <Package size={40} className="rotate-12" />
                <Package size={40} className="-rotate-12" />
            </div>
          </div>
        </div>

        {/* Lado Direito: Banner Grande Vertical (Equivalente ao tênis verde na mão) */}
        {filteredServices[2] && (
          <div 
            onClick={() => openItem(filteredServices[2], 'services')}
            className="md:col-span-4 relative group cursor-pointer overflow-hidden rounded-[2.5rem] bg-[#C5E898]"
          >
            <img 
              src={getImageUrl(filteredServices[2].images?.[0] || filteredServices[2].image)} 
              alt={filteredServices[2].name}
              className="w-full h-full object-cover mix-blend-multiply opacity-80 transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute bottom-10 left-10 right-10 z-10 text-right">
              <h3 className="text-2xl font-serif italic text-stone-900 leading-tight mb-2">
                {filteredServices[2].name}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-stone-900/60 border-b border-stone-900/20 pb-1">
                Saber Mais
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Botão Ver Todos (Minimalista) */}
      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => setVisibleServices(prev => prev + 3)}
          className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400 hover:text-black transition-all flex flex-col items-center gap-2 group"
        >
          Ver Todos os Serviços
          <div className="w-8 h-[1px] bg-stone-200 group-hover:w-20 group-hover:bg-black transition-all duration-500" />
        </button>
      </div>

    </div>
  </section>
)}

{/* ── Seção: Coleções & Bundles (Estilo Boutique Italiana) ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-24 bg-[#F9F7F5] relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Cabeçalho de Coleção */}
      <div className="mb-16 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-orange-800/60 mb-4 block">
          Combinações Exclusivas
        </span>
        <h2 className="text-4xl md:text-5xl font-serif italic text-stone-900 leading-tight">
          Nossas <span className="text-stone-400">Coleções Selecionadas</span>
        </h2>
        <div className="h-[1px] w-20 bg-stone-300 mx-auto mt-8" />
      </div>

      {/* Horizontal Scroll Estilo Desfile */}
      <div className="flex gap-8 overflow-x-auto pb-16 scrollbar-hide snap-x">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map((item, index) => {
            const image = getImageUrl(item.image || '');
            
            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className="group relative min-w-[300px] md:min-w-[450px] snap-center cursor-pointer"
              >
                {/* Container da Imagem com Bordas Arredondadas Suaves */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-white shadow-sm transition-all duration-700 group-hover:shadow-2xl">
                  <img 
                    src={image} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  />
                  
                  {/* Badge de Destaque Estilo Sapataria Itália */}
                  <div className="absolute top-6 left-6">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-stone-100">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-900">
                        Bundle {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Overlay de Preço Flutuante no Hover */}
                  <div className="absolute inset-0 bg-stone-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                     <button className="w-full bg-white text-stone-900 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-xl">
                        Ver Coleção Completa
                     </button>
                  </div>
                </div>

                {/* Info Textual Editorial */}
                <div className="mt-8 px-2 text-center">
                  <h3 className="text-xl font-serif italic text-stone-900 mb-2">
                    {item.name}
                  </h3>
                  <p className="text-stone-500 text-xs font-medium leading-relaxed line-clamp-2 max-w-sm mx-auto mb-4">
                    {item.description || "Uma seleção harmoniosa que une o clássico italiano ao conforto moderno."}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">A partir de</span>
                    <span className="text-lg font-serif text-stone-900 italic">
                      {getItemPrice(item).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Indicador de Progresso Minimalista (Line-style) */}
      <div className="max-w-xs mx-auto flex items-center gap-4">
        <div className="h-[1px] flex-1 bg-stone-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-stone-900 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-1000" />
        </div>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Scroll</span>
        <div className="h-[1px] flex-1 bg-stone-200" />
      </div>
    </div>
  </section>
)}

{/* ── Seção: Assinaturas de Curadoria (Estilo Boutique Luxury) ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-24 bg-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      <div className="flex flex-col items-center text-center mb-20">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400 mb-4 block italic">Privilégios Exclusivos</span>
        <h2 className="text-4xl md:text-5xl font-serif italic text-stone-900 leading-tight mb-10">
          Assinaturas <span className="text-stone-300">Premium</span>
        </h2>
        
        {/* Toggle UI - Estilo Pílula Minimalista */}
        <div className="inline-flex items-center p-1.5 bg-[#F9F7F5] rounded-full border border-stone-100 shadow-inner">
          <button className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Mensal</button>
          <button className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-stone-900 text-white rounded-full shadow-lg">Anual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis') || plan.name.toLowerCase().includes('premium');

          return (
            <div 
              key={plan._id} 
              className={`relative p-12 rounded-[3.5rem] transition-all duration-700 flex flex-col group
                ${isPopular 
                  ? 'bg-stone-900 text-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] scale-105 z-10' 
                  : 'bg-[#F9F7F5] border border-stone-100 text-stone-900 hover:bg-white hover:shadow-xl'}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F6D5C3] text-[#A66D52] text-[9px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-md whitespace-nowrap">
                  Mais Recomendado
                </div>
              )}

              <div className="mb-10 text-center">
                <h3 className={`font-serif text-3xl italic mb-4 ${isPopular ? 'text-white' : 'text-stone-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs font-medium leading-relaxed px-4 h-12 overflow-hidden ${isPopular ? 'text-stone-400' : 'text-stone-500'}`}>
                  {plan.description}
                </p>
              </div>
              
              <div className="mb-12 text-center border-y border-stone-200/10 py-8">
                <div className="flex flex-col items-center">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-2 ${isPopular ? 'text-stone-500' : 'text-stone-300'}`}>
                    Investimento
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-5xl italic tracking-tighter">
                      {getItemPrice(plan) === 0 ? 'Grátis' : `${getItemPrice(plan).toLocaleString()}`}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ml-2 ${isPopular ? 'text-stone-500' : 'text-stone-400'}`}>
                       {currency}
                    </span>
                  </div>
                  <p className={`text-[9px] mt-2 uppercase tracking-widest font-bold ${isPopular ? 'text-stone-400' : 'text-stone-300'}`}>
                    Cobrado {plan.billingCycle}
                  </p>
                </div>
              </div>

              {/* Lista de Benefícios Clean e Centralizada */}
              <ul className="space-y-6 mb-14 flex-1">
                {plan.includedLimits?.map((limit: any, i: number) => (
                  <li key={i} className="flex flex-col items-center text-center gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isPopular ? 'text-white' : 'text-stone-900'}`}>
                      {limit.description}
                    </span>
                    <span className={`text-[11px] font-serif italic ${isPopular ? 'text-stone-500' : 'text-stone-400'}`}>
                      {limit.maxValue} {limit.unit}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-5 rounded-full font-bold text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95 shadow-lg
                    ${isPopular 
                      ? 'bg-white text-stone-900 hover:bg-[#F9F7F5]' 
                      : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                >
                  {plan.price === 0 ? 'Começar Agora' : 'Aderir ao Plano'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className={`w-full py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all
                    ${isPopular ? 'text-stone-500 hover:text-white' : 'text-stone-300 hover:text-stone-900'}`}
                >
                  Especificações Detalhadas
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
{/* CART MODAL – Sapataria Itália Edition */}
<div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 ${isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-all duration-300`}>
  
  {/* Overlay Suave */}
  <div
    className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
    onClick={() => setIsCartOpen(false)}
  />

  {/* Modal Container */}
  <div
    className={`relative w-full max-w-6xl max-h-[90vh] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden flex flex-col transform transition-all duration-700 ${isCartOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}
  >
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      
      {/* COLUNA ESQUERDA: Carrinho */}
      <div className="flex-[1.4] flex flex-col min-h-0 bg-white">
        <div className="p-10 border-b border-stone-50 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400 mb-2 block italic">Sua Seleção</span>
            <h2 className="text-4xl font-serif italic text-stone-900 leading-none">
              Carrinho de <span className="text-stone-300">Reserva</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{cart.length} Itens Selecionados</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
          {cart.length > 0 ? (
            <div className="min-w-[500px]">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-stone-400">
                    <th className="text-[10px] font-bold uppercase tracking-widest pb-4">Artigo</th>
                    <th className="text-[10px] font-bold uppercase tracking-widest pb-4 text-center">Quantidade</th>
                    <th className="text-[10px] font-bold uppercase tracking-widest pb-4 text-center">Unitário</th>
                    <th className="text-[10px] font-bold uppercase tracking-widest pb-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {cart.map(cartItem => {
                    console.log("Conteúdo do Item no Carrinho:", cartItem);
                    return (
                      <tr key={cartItem.itemId} className="group">
                        <td className="py-6">
                          <div className="flex gap-6 items-center">
                            <div className="w-24 h-24 rounded-2xl bg-[#F9F7F5] flex items-center justify-center p-4 relative overflow-hidden transition-colors group-hover:bg-[#F2EFEF]">
                              <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-1">{cartItem.name}</p>
                              <button 
                                onClick={() => removeFromCart(cartItem.itemId)} 
                                className="text-[9px] text-stone-400 hover:text-red-800 transition-colors uppercase font-bold tracking-widest flex items-center gap-1"
                              >
                                <X size={10} /> Remover
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="inline-flex items-center bg-[#F9F7F5] rounded-full p-1 border border-stone-100">
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-2 text-stone-400 hover:text-stone-900"><Minus size={12} /></button>
                            <span className="px-3 text-[11px] font-bold text-stone-900">{cartItem.quantity}</span>
                            <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-2 text-stone-400 hover:text-stone-900"><Plus size={12} /></button>
                          </div>
                        </td>
                        <td className="text-center text-xs font-serif italic text-stone-400">
                          {cartItem.price.toLocaleString()} {currency}
                        </td>
                        <td className="text-right">
                          <span className="text-sm font-serif italic text-stone-900">
                            {(cartItem.price * cartItem.quantity).toLocaleString()} {currency}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20">
               <div className="w-20 h-20 bg-[#F9F7F5] rounded-full flex items-center justify-center mb-6">
                 <Package size={32} strokeWidth={1} className="text-stone-300" />
               </div>
               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.4em]">Seu carrinho está vazio</p>
            </div>
          )}
        </div>

        <div className="p-10 border-t border-stone-50 bg-[#F9F7F5]/50">
          <button 
            onClick={() => setIsCartOpen(false)}
            className="flex items-center gap-3 text-stone-900 text-[10px] font-bold uppercase tracking-[0.3em] hover:gap-6 transition-all"
          >
            <ArrowLeft size={14} /> Continuar Comprando
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA: Resumo e Pagamento */}
      <div className="flex-1 bg-[#F9F7F5] border-l border-stone-100 p-10 flex flex-col overflow-y-auto scrollbar-hide">
        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.4em] mb-10 text-center">Detalhes da Reserva</h3>
        
        <div className="flex-1 space-y-10">
          {/* Dados do Cliente */}
          <div className="space-y-4">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-900 ml-2">Dados do Cliente</label>
            <div className="space-y-3">
              <input placeholder="Nome Completo" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-6 py-4 bg-white border-none rounded-2xl text-xs font-medium text-stone-900 placeholder:text-stone-300 focus:ring-1 focus:ring-stone-200 outline-none transition-all shadow-sm" />
              <input placeholder="Email para Confirmação" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-6 py-4 bg-white border-none rounded-2xl text-xs font-medium text-stone-900 placeholder:text-stone-300 focus:ring-1 focus:ring-stone-200 outline-none transition-all shadow-sm" />
              <input type='number' placeholder="Telefone / WhatsApp" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-6 py-4 bg-white border-none rounded-2xl text-xs font-medium text-stone-900 placeholder:text-stone-300 focus:ring-1 focus:ring-stone-200 outline-none transition-all shadow-sm" />
              <div className="relative">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl text-xs font-medium text-stone-900 outline-none focus:ring-1 focus:ring-stone-200 shadow-sm" />
              </div>
            </div>

            {/* MADE TO ORDER */}
            {cart.some(item => item.madeToOrder) && (
              <div className="pt-4">
                <div className="p-6 bg-white rounded-[1.5rem] shadow-sm border border-stone-50">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <div className="relative flex items-center pt-0.5">
                      <input 
                        type="checkbox" 
                        checked={cart.every(item => item.madeToOrder ? item.wantsOrder : true)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCart(prev => prev.map(i => i.madeToOrder ? { ...i, wantsOrder: checked } : i));
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-stone-200 checked:bg-stone-900 transition-all" 
                      />
                      <Check className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 left-1 pointer-events-none" strokeWidth={4} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-900">Pedido por Encomenda</span>
                      <p className="text-[9px] text-stone-400 font-medium leading-relaxed mt-1 italic">
                        Ativar produção artesanal para itens sem estoque imediato.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Pagamento */}
          <div className="space-y-4">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-900 ml-2">Método de Preferência</label>
            <div className="grid grid-cols-2 gap-3">
              {['mpesa', 'visa', 'emola', 'transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                  className={`py-4 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all duration-500 ${paymentMethod === m ? 'border-stone-900 bg-stone-900 text-white shadow-xl' : 'border-white bg-white text-stone-400 hover:border-stone-200'}`}
                >
                  {m === 'transfer' ? 'Transferência' : m}
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
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-900 transition-colors"
            />
            <p className="text-[10px] text-stone-400 font-medium">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}
          </div>

          {/* Dados Bancários Estilo Elegant Box */}
          {paymentMethod === 'transfer' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="p-6 bg-white rounded-[2rem] border border-stone-100 space-y-6 shadow-sm">
                <h4 className="text-[10px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-stone-50">
                  <Briefcase size={12} className="text-orange-800/40" /> Dados para Liquidação
                </h4>
                
                {company.bankAccounts?.map((bank, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-[11px] font-bold text-stone-900 uppercase tracking-tighter">{bank.bankName}</p>
                    <div className="grid grid-cols-1 gap-1 text-[10px]">
                      <div className="flex justify-between border-b border-stone-50 pb-1">
                        <span className="text-stone-400 italic font-serif uppercase text-[8px]">Titular</span>
                        <span className="text-stone-900">{bank.accountHolder}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-50 pb-1 pt-1">
                        <span className="text-stone-400 italic font-serif uppercase text-[8px]">Conta</span>
                        <span className="font-mono font-bold">{bank.accountNumber}</span>
                      </div>
                      {bank.nibOrIban && (
                        <div className="flex justify-between pt-1">
                          <span className="text-stone-400 italic font-serif uppercase text-[8px]">NIB/IBAN</span>
                          <span className="font-mono font-bold text-[9px]">{bank.nibOrIban}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(company.mobileWallets?.mpesa || company.mobileWallets?.emola) && (
                  <div className="pt-4 border-t border-stone-50 flex gap-6">
                    {company.mobileWallets.mpesa && (
                      <div>
                        <p className="text-[8px] font-bold text-stone-300 uppercase mb-1">M-Pesa</p>
                        <p className="text-[11px] font-bold text-stone-900 font-mono">{company.mobileWallets.mpesa}</p>
                      </div>
                    )}
                    {company.mobileWallets.emola && (
                      <div>
                        <p className="text-[8px] font-bold text-stone-300 uppercase mb-1">E-Mola</p>
                        <p className="text-[11px] font-bold text-stone-900 font-mono">{company.mobileWallets.emola}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Totais */}
        <div className="mt-12 pt-10 border-t border-stone-200 space-y-8">
          <div className="flex justify-between items-center font-bold text-stone-400 text-[10px] uppercase tracking-[0.2em]">
            <span>Subtotal da Reserva</span>
            <span className="font-serif italic text-stone-900 text-sm">{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-orange-800/60 uppercase tracking-widest mb-2">Total a Liquidar</span>
              <span className="text-5xl font-serif italic text-stone-900 leading-none tracking-tighter">
                {totals.grandTotal.toLocaleString()}
                <span className="text-sm ml-2 font-sans not-italic font-bold text-stone-300 uppercase tracking-widest">{currency}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handlePayment}
              disabled={!paymentMethod || ['none', 'transfer'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
              className="w-full py-6 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-full hover:bg-stone-800 transition-all shadow-xl disabled:opacity-20 active:scale-95"
            >              
              {hasOrderWithPrice ? `Pagar Taxa de Encomenda` : 'Confirmar Reserva Online'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || hasOrderWithPrice}
              className="w-full py-6 bg-white border border-stone-100 text-stone-900 text-[10px] font-bold uppercase tracking-[0.3em] rounded-full transition-all hover:bg-stone-50 disabled:opacity-30 active:scale-95 shadow-sm"
            >
              {paymentMethod === 'transfer' ? 'Enviar Comprovativo de Reserva' : 'Finalizar Pedido de Reserva'}
            </button>
            
            {hasOrderWithPrice && (
              <p className="text-[9px] text-orange-800/60 font-bold text-center italic tracking-widest">
                * Artigo de encomenda requer liquidação prévia da taxa
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Fechar */}
    <button 
      onClick={() => setIsCartOpen(false)} 
      className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center text-stone-300 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-all z-20 group"
    >
      <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
    </button>
  </div>
</div>

{/* Success Modal - Estilo Boutique Elegance */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-500" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] max-w-lg w-full overflow-hidden border border-stone-100 transform animate-in zoom-in-95 duration-500"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-12 text-center relative">
        
        {/* Ícone Minimalista e Centralizado */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-[#F9F7F5] rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 border border-stone-100 rounded-full animate-ping opacity-20" />
            <Check size={32} className="text-stone-900" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-orange-800/60 block">
            Reserva Confirmada
          </span>
          
          <h2 className="text-4xl font-serif italic text-stone-900 leading-tight">
            Grazie <span className="text-stone-300">por escolher</span> <br /> a Itália
          </h2>
          
          <p className="text-stone-500 text-xs font-medium leading-relaxed max-w-[280px] mx-auto">
            Seu pedido foi recebido com sucesso. Enviamos um manifesto detalhado para o seu e-mail com os próximos passos da sua experiência.
          </p>
        </div>

        {/* Informação de Rastreio Estilo Etiqueta de Preço */}
        <div className="bg-[#F9F7F5] rounded-2xl p-4 mb-10 flex items-center justify-between px-8 border border-stone-50">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Ref. do Pedido</span>
          <span className="font-serif italic text-stone-900 text-lg">
            #IT-{Math.random().toString(36).substr(2, 5).toUpperCase()}
          </span>
        </div>

        {/* Botão de Fechamento Minimalista */}
        <button
          onClick={closeSuccessModal}
          className="w-full py-5 bg-stone-900 text-white rounded-full transition-all hover:bg-stone-800 active:scale-95 font-bold text-[10px] uppercase tracking-[0.3em] shadow-xl"
        >
          Voltar à Loja
        </button>
        
        <p className="mt-6 text-[9px] text-stone-300 font-bold uppercase tracking-widest">
          Conserve sua referência para consultas
        </p>
      </div>
    </div>
  </div>
)}
<footer className="bg-[#F9F7F5] pt-24 pb-12 overflow-hidden relative border-t border-stone-100">
  {/* Detalhe estético: Textura de linho ou grão fino (opcional via CSS) */}
  <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }} />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
      
      {/* Coluna 1: Branding e Filosofia */}
      <div className="lg:col-span-4 space-y-10">
        <div className="flex items-center">
          {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-10 w-auto grayscale contrast-125" />
          ) : (
            <span className="font-serif italic text-2xl tracking-tight text-stone-900 uppercase">
              {company.name} <span className="text-stone-300">Italia</span>
            </span>
          )}
        </div>
        
        <p className="text-stone-500 text-xs font-medium leading-[1.8] max-w-xs italic font-serif">
          Preservando a arte da manufatura e o design atemporal. Da Itália para os seus pés, com a curadoria que você merece.
        </p>
        
        {/* Newsletter Estilo Convite */}
        <div className="space-y-4 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-900">Mural de Novidades</p>
          <div className="flex p-1.5 bg-white rounded-full border border-stone-100 focus-within:ring-1 focus-within:ring-stone-200 transition-all shadow-sm">
            <input 
              type="email" 
              placeholder="Seu melhor e-mail" 
              className="flex-1 px-6 bg-transparent text-stone-900 text-[11px] outline-none placeholder:text-stone-300 font-medium" 
            />
            <button className="px-8 py-3 bg-stone-900 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-stone-800 transition-all">
              Acompanhar
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Coleções */}
      <div className="lg:col-span-2 space-y-8">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400 italic">Coleções</h4>
        <ul className="space-y-5">
          {['Sapatos Masculinos', 'Coleção Feminina', 'Acessórios', 'Edição Limitada'].map(link => (
            <li key={link}>
              <a href="#" className="text-[10px] text-stone-600 hover:text-stone-900 transition-colors font-bold uppercase tracking-[0.2em]">{link}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Atendimento Boutique */}
      <div className="lg:col-span-3 space-y-8">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400 italic">Concierge</h4>
        <ul className="space-y-8">
          <li className="flex flex-col gap-2">
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.2em]">Atendimento Direto</span>
            <a href={`tel:${company.phone}`} className="text-stone-900 font-serif italic text-2xl hover:text-orange-800/60 transition-colors">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col gap-2">
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.2em]">Suporte por E-mail</span>
            <a href={`mailto:${company.email}`} className="text-stone-900 font-medium text-xs hover:underline decoration-stone-200 underline-offset-4 transition-all break-all tracking-wide">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Presença Social */}
      <div className="lg:col-span-3 space-y-12">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400 mb-6 italic">Social Media</h4>
          <div className="flex gap-4">
            {[Instagram, Facebook, Linkedin].map((Icon, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 hover:shadow-lg transition-all duration-500 border border-stone-50"
              >
                <Icon size={18} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
           <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Pagamentos Seguros</p>
           <div className="flex flex-wrap gap-3">
              {['MPESA', 'VISA', 'emola'].map(p => (
                <div key={p} className="px-4 py-1.5 bg-white border border-stone-50 rounded-md text-[8px] font-bold text-stone-400 tracking-widest">
                  {p}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Copyright e Legal */}
    <div className="pt-12 border-t border-stone-200/60 flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="space-y-2 text-center md:text-left">
        <p className="text-[10px] font-bold text-stone-900 uppercase tracking-[0.3em]">
          © 2026 {company.name} Italia <span className="text-stone-300 font-medium mx-2">|</span> <span className="text-stone-400">Todos os direitos reservados</span>
        </p>
        <p className="text-[9px] text-stone-300 font-medium italic font-serif tracking-widest">
          Handcrafted Quality & Italian Heritage.
        </p>
      </div>
      
      <div className="flex gap-10">
        <a href="#" className="text-[9px] font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-[0.2em]">Privacidade</a>
        <a href="#" className="text-[9px] font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-[0.2em]">Termos de Uso</a>
      </div>

      {/* Status Simplificado */}
      <div className="flex items-center gap-3 px-6 py-2.5 bg-white rounded-full border border-stone-100 shadow-sm">
         <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
         <span className="text-[9px] font-bold text-stone-500 uppercase tracking-[0.2em]">Atendimento Online</span>
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

export default ShoestorePortal;