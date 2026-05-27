// src/templates/public-portal/variants/PlansrPortal.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import gsap from 'gsap';


const SERVER_BASE_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';

// Helper function to convert relative paths to absolute URLs
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath; // Already absolute
  return `${SERVER_BASE_URL}${imagePath}`; // Convert relative to absolute
};

interface PlansrProps {
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
  bundleType?: 'Subscription' | 'Combo';
  annualDiscountPercent?: number; // 11 for annual subscriptions, undefined for monthly
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

const PlansrPortal: React.FC<PlansrProps> = ({ 
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [showAwaitingConfirmation, setShowAwaitingConfirmation] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [pollStatus, setPollStatus] = useState<'waiting'|'confirmed'|'failed'>('waiting');
  const [pollAttempts, setPollAttempts] = useState(0);
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
const [visibleServices, setVisibleServices] = useState(3);
const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const currency = company.currency || 'MT';
  const [billingPeriod, setBillingPeriod] = useState('mensal'); // 'mensal' ou 'anual'

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
  const subtotal = cart.reduce((acc, item) => {
    if (item.annualDiscountPercent) {
      return acc + Math.round(item.price * item.quantity * (1 - item.annualDiscountPercent / 100));
    }
    return acc + (item.price * item.quantity);
  }, 0);
  
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
      quantity: item.annualDiscountPercent ? 12 : 1,
      name: item.name,
      price: getItemPrice(item),
      image: getItemImage(item, type),

      // === CAMPOS CRUCIAIS PARA MADE TO ORDER ===
      madeToOrder: item.madeToOrder, 
    orderPrice: item.orderPrice,
    deliveryDays: item.deliveryDays,
      wantsOrder: false,                          // começa desmarcado
       bundleType: item.type,
       annualDiscountPercent: item.annualDiscountPercent,
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
      const lineTotal = cartItem.annualDiscountPercent
        ? Math.round(cartItem.price * cartItem.quantity * (1 - cartItem.annualDiscountPercent / 100))
        : cartItem.price * cartItem.quantity;
      subtotal += lineTotal;
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
          items: cart.map(cartItem => {
            const effectivePriceAtOrder = cartItem.annualDiscountPercent
              ? Math.round(cartItem.price * (1 - cartItem.annualDiscountPercent / 100))
              : cartItem.price;
            return {
              itemType: cartItem.type === 'services' ? 'service' : 
                        cartItem.type === 'products' ? 'product' : 'bundle',
              item: cartItem.itemId,
              isMadeToOrder: cartItem.wantsOrder,
              priceAtOrder: effectivePriceAtOrder,
              feePaid: cartItem.wantsOrder ? cartItem.orderPrice : 0,
              quantity: cartItem.quantity
            };
          }),
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

  if (paymentMethod === 'mpesa' || paymentMethod === 'emola') {
    if (!mobileMoneyPhone) {
      toast.error('Insira o número de telemóvel para pagamento');
      return;
    }
    const cleaned = mobileMoneyPhone.replace(/\D/g, '');
    const isMpesa = paymentMethod === 'mpesa';
    const isEmola = paymentMethod === 'emola';
    if (isMpesa && !(cleaned.startsWith('84') || cleaned.startsWith('85'))) {
      toast.error('Número M-Pesa deve começar com 84 ou 85');
      return;
    }
    if (isEmola && !(cleaned.startsWith('86') || cleaned.startsWith('87'))) {
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
        price: ci.annualDiscountPercent
          ? Math.round(ci.price * (1 - ci.annualDiscountPercent / 100))
          : ci.price,
        type: ci.type
      }))
    };

    const resp = await api.checkout.process(payload, true); // public

    console.log('✅ Resposta do checkout:', resp); // ← Debug importante

    if (resp?.success) {
      if (resp.awaiting_confirmation || (resp.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
        setShowAwaitingConfirmation(true);
        setAwaitingRef(resp.externalRef || resp.reference || '');
      } else if (resp.url) {
        // Redireciona para a página de pagamento (Visa)
        window.location.href = resp.url;
      } else {
        // Caso onde o pagamento foi concluído imediatamente (status: success)
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
    
    // Tratamento específico para timeout 504 do Débito
    if (err.message?.includes('504') || err.response?.status === 504) {
      toast.error('O serviço de pagamento está demorando muito. Tente novamente.');
    } else {
      toast.error(err.message || 'Erro ao processar pagamento');
    }
  } finally {
    setSubmitting(false);
  }
};

  // ── Poll transaction status when awaiting confirmation ──
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
        }
        setPollAttempts(p => p + 1);
      } catch {}
    }, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [showAwaitingConfirmation, awaitingRef]);

  const closeSuccessModal = () => setShowSuccessModal(false);

  // ── GSAP horizontal scroll state & handlers ──
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const isScrolling = useRef(false);
  const dragStartX = useRef(0);
  const dragStartProgress = useRef(0);

  const getMaxScroll = useCallback(() => {
    if (!scrollContainerRef.current || !scrollWrapperRef.current) return 0;
    return Math.max(0, scrollWrapperRef.current.scrollWidth - scrollContainerRef.current.clientWidth);
  }, []);

  const smoothScrollTo = useCallback((targetX: number) => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;
    const maxScroll = getMaxScroll();
    const clamped = Math.max(-maxScroll, Math.min(0, targetX));
    gsap.to(wrapper, {
      x: clamped,
      duration: 0.7,
      ease: 'power3.out',
      onUpdate: () => {
        const x = gsap.getProperty(wrapper, 'x') as number;
        setScrollProgress(maxScroll > 0 ? Math.abs(x / maxScroll) : 0);
      }
    });
  }, [getMaxScroll]);

  const smoothScrollBy = useCallback((deltaX: number) => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;
    const currentX = gsap.getProperty(wrapper, 'x') as number;
    smoothScrollTo(currentX + deltaX);
  }, [smoothScrollTo]);

  // Wheel → GSAP smooth scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      smoothScrollBy(e.deltaY * 1.2);
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [smoothScrollBy]);

  // Re-clamp on resize
  useEffect(() => {
    const handler = () => {
      const wrapper = scrollWrapperRef.current;
      if (!wrapper) return;
      const maxScroll = getMaxScroll();
      const currentX = gsap.getProperty(wrapper, 'x') as number;
      if (currentX < -maxScroll) {
        gsap.set(wrapper, { x: -maxScroll });
        setScrollProgress(1);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [getMaxScroll]);

  // Reset position when bundles change
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    if (wrapper) {
      gsap.set(wrapper, { x: 0 });
      setScrollProgress(0);
    }
  }, [filteredBundles.length]);

  // Touch swipe support
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;
    let startX = 0, startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        smoothScrollBy(-dx * 0.5);
        startX = e.touches[0].clientX;
      }
    };
    wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart);
      wrapper.removeEventListener('touchmove', onTouchMove);
    };
  }, [smoothScrollBy]);

  // Scrollbar drag handlers
  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isScrolling.current = true;
    dragStartX.current = e.clientX;
    dragStartProgress.current = scrollProgress;
    const onMove = (ev: MouseEvent) => {
      if (!isScrolling.current) return;
      const container = scrollContainerRef.current;
      const wrapper = scrollWrapperRef.current;
      if (!container || !wrapper) return;
      const trackWidth = container.clientWidth - 32;
      const delta = ev.clientX - dragStartX.current;
      const pDelta = delta / trackWidth;
      const np = Math.max(0, Math.min(1, dragStartProgress.current + pDelta));
      const maxScroll = getMaxScroll();
      gsap.to(wrapper, {
        x: -np * maxScroll,
        duration: 0.25,
        ease: 'power2.out',
        onUpdate: () => setScrollProgress(np)
      });
    };
    const onUp = () => {
      isScrolling.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [scrollProgress, getMaxScroll]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const wrapper = scrollWrapperRef.current;
    const container = scrollContainerRef.current;
    if (!wrapper || !container || !scrollbarThumbRef.current) return;
    const track = scrollbarThumbRef.current.parentElement;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const p = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = getMaxScroll();
    gsap.to(wrapper, {
      x: -p * maxScroll,
      duration: 0.5,
      ease: 'power3.out',
      onUpdate: () => setScrollProgress(p)
    });
  }, [getMaxScroll]);

  return (
    <div className="min-h-screen bg-white/5 text-slate-900 font-sans">
      {/* Modern Navbar */}
  
{/* Header Estilo Premium Salon */}
<div className="min-h-screen bg-[#02040a] text-slate-100 font-sans tracking-tight selection:bg-cyan-500/30 overflow-x-hidden antialiased relative">
{/* MAIN CONTAINER: Imersão total em Dark Mode de nova geração */}


  

{/* 1. HEADER GLASSMORPHISM (Estilo Cápsula Suspensa Omnichannel) */}
<header className="fixed top-5 left-0 right-0 mx-auto px-4 max-w-[1200px] w-full z-[60] pointer-events-none">
  <div className="w-full bg-[#080b11]/60 backdrop-blur-xl rounded-2xl lg:rounded-full border border-white/[0.06] px-4 lg:px-5 py-2.5 flex justify-between items-center pointer-events-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300">
    
    {/* Brand Identity */}
    <div className="flex items-center gap-2.5 shrink-0 relative z-50">      
       {company?.logo ? (
            <img src={company.logo} alt={company.name} className="h-16 w-16 object-contain brightness-0 invert" />
          ) : (
            <div className="w-3.5 h-3.5 bg-white rounded-full animate-pulse" /> 
          )}
      
    </div>

    {/* Navegação Flutuante Centro (Desktop) e Campo de Pesquisa Unificado */}
    <div className="flex-1 lg:flex-none flex justify-end lg:justify-center items-center h-8 px-2 lg:px-0">
      {!isSearchOpen ? (
        <div className="flex items-center gap-2">
          {/* Menu Desktop */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.02] p-0.5 rounded-full border border-white/[0.04] whitespace-nowrap">
              {[
                { label: 'Funcionalidades', url: 'https://meupontodevenda.com/' },
                { label: 'Planos', url: '#planos' },
                { label: 'Websites', url: 'https://meupontodevenda.com/websites' },
                { label: 'Suporte', url: 'https://meupontodevenda.com/support-assistance' }
              ].map((item) => (
                <a 
                  key={item.label} 
                  href={item.url} 
                  className="text-[11.5px] font-medium text-slate-400 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white/[0.03] transition-all duration-200 tracking-wide"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          
          {/* Botão Search - Sempre Visível no Mobile e Desktop */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="text-slate-400 hover:text-white p-2 rounded-full bg-white/[0.02] lg:bg-transparent border border-white/[0.04] lg:border-none hover:bg-white/[0.06] transition-transform active:scale-95"
          >
            <Search size={14} />
          </button>
        </div>
      ) : (
        /* Input de Pesquisa Adaptável (Garante largura fluida no mobile) */
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#05070c]/95 rounded-full border border-blue-500/20 animate-in fade-in slide-in-from-top-1 duration-300 w-full max-w-[180px] sm:max-w-[260px] md:max-w-[380px] lg:w-[420px] relative z-50">
          <Search size={13} className="text-blue-400 shrink-0" />
          <input 
            autoFocus
            type="text"
            placeholder="Buscar..."
            className="bg-transparent border-none outline-none text-[11px] sm:text-[11.5px] w-full placeholder:text-slate-600 text-white font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => setIsSearchOpen(false)} className="text-slate-500 hover:text-white shrink-0">
            <X size={13} />
          </button>
        </div>
      )}
    </div>

    {/* Ações Laterais (Carrinho sempre fora, Seletor MZ e Hamburguer) */}
    <div className="flex items-center gap-2 shrink-0 relative z-50">
      {/* Moeda/Região - Oculto em telas pequenas */}
      <div className="hidden md:flex bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.05] px-3 py-1.5 rounded-full text-[10.5px] font-medium text-slate-400 cursor-pointer items-center gap-1 transition-all">
        MZ <span className="text-[8px] opacity-30">▼</span>
      </div>

      {/* Ícone do Carrinho - Sempre visível e prioritário no Mobile */}
      <button 
        onClick={() => setIsCartOpen(true)}
        className="relative bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-2 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_4px_15px_rgba(37,99,235,0.25)] active:scale-95 border border-blue-400/20"
      >
        <Briefcase size={14} />
        {cart.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-cyan-400 text-[#030712] text-[8px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {cart.length}
          </span>
        )}
      </button>

      {/* Botão Hambúrguer - Visível apenas no Mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden p-2 text-slate-400 hover:text-white bg-white/[0.02] border border-white/[0.04] rounded-full transition-all active:scale-95"
      >
        {isMobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
      </button>
    </div>

    {/* ========================================================================= */}
    {/* MENU MOBILE DROP DOWN (Glassmorphism de Cortina) */}
    {/* ========================================================================= */}
    {isMobileMenuOpen && (
      <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#080b11]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-2 lg:hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
        {['Funcionalidades', 'Planos', 'Catálogo Digital', 'Suporte'].map((item) => (
          <a 
            key={item} 
            href={`#${item.toLowerCase()}`} 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-xs font-medium text-slate-400 hover:text-white px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-all tracking-wide border border-transparent hover:border-white/[0.02]"
          >
            {item}
          </a>
        ))}
        {/* Item extra embutido no mobile */}
        <div className="border-t border-white/[0.04] pt-2 mt-1 flex justify-between items-center px-4 py-2 text-[11px] text-slate-500">
          <span>Região de Operação</span>
          <span className="text-cyan-400 font-medium">Moçambique (MZ)</span>
        </div>
      </div>
    )}

  </div>
</header>

  {/* 2. HERO SECTION TECH CENTRIC */}
<section className="relative min-h-screen flex flex-col justify-between pt-36 pb-16 overflow-hidden bg-[#02040a]">

  {/* Meia-lua Superior Descendente */}
  <div className="absolute top-[-25vh] left-1/2 -translate-x-1/2 w-[140vw] sm:w-[100vw] h-[50vh] rounded-[50%] bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent blur-[100px] pointer-events-none z-0" />
  
  {/* Núcleo Laser Intenso da Meia-lua Superior */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent blur-[4px] pointer-events-none z-0" />

  {/* Meia-lua Inferior Ascendente (Abraça os Dashboard Cards) */}
  <div className="absolute bottom-[-30vh] left-1/2 -translate-x-1/2 w-[150vw] sm:w-[120vw] h-[65vh] rounded-[50%] border-t border-cyan-500/20 bg-gradient-to-t from-indigo-900/20 via-blue-600/5 to-transparent blur-[120px] pointer-events-none z-0" />
  
  {/* Brilho de Contorno da Meia-lua Inferior */}
  <div className="absolute bottom-[20vh] left-1/2 -translate-x-1/2 w-[80vw] h-[150px] bg-cyan-500/[0.02] rounded-[50%] blur-[80px] pointer-events-none z-0" />
  {/* ========================================================================= */}

  {/* Bloco de Texto Principal */}
  <div className="relative z-10 max-w-5xl mx-auto px-6 w-full text-center space-y-6 mt-6">
    
    {/* Micro-badge Avançado */}
    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <span className="flex h-1.5 w-1.5 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
      </span>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        Sistema Comercial para Pequenas e grandes empresas
      </p>
    </div>

    {/* Headline Estilo Aventa Medium */}
    <h1 className="text-4xl sm:text-6xl lg:text-[4.75rem] font-medium leading-[1.05] tracking-[-0.03em] text-white max-w-4xl mx-auto">
      {portalContent?.hero?.headline || (
        <>O Ecossistema Comercial Inteligente para <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">pequenas e grandes empresas</span></>
      )}
    </h1>

    {/* Subheadline Refinado */}
    <p className="max-w-2xl mx-auto text-slate-400 text-[13.5px] sm:text-[15px] leading-relaxed tracking-normal font-normal opacity-90">
      {portalContent?.hero?.subheadline || "Controle o seu ponto de venda físico, monitorize metas financeiras em tempo real e expanda a faturação do seu negócio através de uma presença digital automatizada."}
    </p>

    {/* CTA Espacial */}
    <div className="pt-3">
      <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="bg-white text-[#030712] hover:bg-slate-200 text-[11px] font-medium uppercase tracking-wider px-7 py-3.5 rounded-full shadow-[0_20px_40px_rgba(255,255,255,0.05)] transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-white/20">
        Deslize para subscrever
      </button>
    </div>
  </div>

  {/* 3. PROPOSTA DE VALOR EM DASHBOARD CARDS */}
  <div className="relative z-10 max-w-[1200px] w-full mx-auto px-6 mt-20 grid grid-cols-1 md:grid-cols-12 gap-5">
    
    {/* Card 1: POS & Vendas Inteligentes (Col 5) */}
    <div className="md:col-span-5 bg-[#090d16]/20 backdrop-blur-xl border border-white/[0.04] hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden rounded-2xl p-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.02] rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-0.5">
          <span className="text-[10px] font-medium text-blue-400 uppercase tracking-widest">Interface Omnichannel</span>
          <h3 className="text-sm font-medium text-white">POS Multi-utilizador</h3>
        </div>
        <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">Live POS</div>
      </div>

      {/* Mini UI de Venda Ativa */}
      <div className="space-y-2 bg-[#05070c]/50 p-3 rounded-xl border border-white/[0.03]">
        <div className="flex justify-between items-center text-[11px] border-b border-white/[0.04] pb-2">
          <span className="text-slate-400">Produto selecionado</span>
          <span className="text-white font-medium">Stock Consolidado</span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[9px]">📦</div>
            <div>
              <p className="text-[11px] text-white font-medium leading-none">Artigo Comercial A</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Ref: MPDV-908</p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-200">2.450,00 MT</span>
        </div>
        <div className="w-full h-7 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-medium flex items-center justify-center rounded-lg border  transition-colors mt-2">
          + Registar Nova Venda
        </div>
      </div>
    </div>

    {/* Card 2: Metas & Crescimento Financeiro (Col 7) */}
    <div className="md:col-span-7 bg-[#090d16]/20 backdrop-blur-xl border border-white/[0.04] hover:border-cyan-500/30 transition-all duration-500 group relative overflow-hidden rounded-2xl p-5">
      <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-cyan-500/[0.02] rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-0.5">
          <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-widest">Módulo Analítico</span>
          <h3 className="text-sm font-medium text-white">Metas & Desempenho de Negócio</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 block">Faturação Mensal</span>
          <span className="text-base font-medium text-white tracking-tight">384.200 MT</span>
        </div>
      </div>

      {/* Gráfico Simulado Futurista */}
      <div className="grid grid-cols-6 gap-3 items-end h-20 pt-4 px-2 border-b border-white/[0.03]">
        {[30, 55, 45, 85, 70, 95].map((height, idx) => (
          <div key={idx} className="relative group/bar flex flex-col items-center">
            <div 
              style={{ height: `${height}%` }} 
              className={`w-full rounded-t-sm transition-all duration-500 ${
                idx === 5 
                  ? 'bg-gradient-to-t from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                  : 'bg-white/[0.04] group-hover/bar:bg-white/[0.08]'
              }`}
            />
            <span className="text-[8px] text-slate-600 mt-1">{`Sem0${idx+1}`}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Card 3: Presença Digital Integrada (Col 7) */}
    <div className="md:col-span-7 bg-[#090d16]/20 backdrop-blur-xl border border-white/[0.04] hover:border-indigo-500/30 transition-all duration-500 group relative overflow-hidden rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-0.5">
          <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-widest">E-Commerce Autónomo</span>
          <h3 className="text-sm font-medium text-white">Catálogo Digital Online</h3>
        </div>
        <span className="text-[9px] font-medium text-indigo-300 border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 rounded-full">Sincronização Ativa</span>
      </div>
      
      <p className="text-[11.5px] text-slate-400 leading-relaxed mb-4 max-w-md">
        Active a sua montra digital instantaneamente a partir do stock do seu POS. O seu cliente encomenda na web, e o pedido entra direto no painel principal do sistema.
      </p>

      {/* Visual de Link do Catálogo */}
      <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-xl border border-white/[0.03] text-[11px]">
        <span className="text-slate-500 select-all">meupontodevenda.com/loja/sua-empresa</span>
        <span className="text-blue-400 cursor-pointer font-medium hover:underline">Abrir Montra →</span>
      </div>
    </div>

    {/* Card 4: Hardware & Mobilidade (Col 5) */}
    <div className="md:col-span-5 bg-[#090d16]/20 backdrop-blur-xl border border-white/[0.04] hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between rounded-2xl p-5">
      <div>
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Infraestrutura</span>
        <h3 className="text-sm font-medium text-white mb-2">Mobilidade Absoluta</h3>
        <p className="text-[11.5px] text-slate-400 leading-relaxed">
          Funciona no tablet, smartphone ou desktop. A sua operação comercial não fica presa a terminais fixos ou licenças locais.
        </p>
      </div>
      
      <div className="pt-4 flex gap-2 text-[10px] text-slate-400 font-medium">
        <span className="bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.03]">✓ Cloud Sync</span>
        <span className="bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.03]">✓ Multi-Terminal</span>
      </div>
    </div>

  </div>
</section>

  {/* OVERLAY DE PESQUISA ULTRA REFINADO */}
  {isSearchOpen && (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[55] transition-opacity duration-300" />
  )}


{/* === SEÇÕES DINÂMICAS DO PORTAL CONTENT === */}


 {/* agora três secções sequenciais com colapso */}
  <div className="">
    {/* ── Seção: Legal Subscriptions (Estilo Boutique Law Tech) ── */}
{/* ── Seção: Legal Subscriptions (Estilo Boutique Law Tech) ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section id="planos" className="py-28 bg-[#02040a] relative overflow-hidden">
    
    {/* Malha de Iluminação Neon Traseira (Ambiente Absoluto) */}
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute top-[20%] left-1/4 w-[600px] h-[600px] bg-blue-600/[0.04] rounded-full blur-[160px]" />
      <div className="absolute bottom-[10%] right-1/4 w-[500px] h-[500px] bg-cyan-400/[0.03] rounded-full blur-[140px]" />
    </div>

    <div className="max-w-[1200px] mx-auto px-6 relative z-10">
      
      {/* Cabeçalho */}
      <div className="flex flex-col items-center text-center mb-20 space-y-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          Upgrade de Infraestrutura
        </span>
        <h2 className="text-4xl md:text-5xl font-medium text-white tracking-[-0.02em]">
          Escolha a escala ideal para o seu <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]">Negócio</span>
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl font-normal opacity-75 pt-1">
          Ative os módulos que a sua empresa precisa e mude de plano conforme a sua faturação cresce.
        </p>
        
        {/* Toggle Ciberpunk Funcional */}
        <div className="inline-flex items-center p-1 bg-[#090d16]/80 border border-white/[0.05] rounded-full backdrop-blur-xl mt-4 shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)]">
          <button 
            type="button"
            onClick={() => setBillingPeriod('mensal')}
            className={`px-6 py-2 text-[10.5px] font-medium uppercase tracking-wider rounded-full transition-all duration-300 ${billingPeriod === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/20 font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Mensal
          </button>
          <button 
            type="button"
            onClick={() => setBillingPeriod('anual')}
            className={`px-6 py-2 text-[10.5px] font-medium uppercase tracking-wider rounded-full transition-all duration-300 flex items-center gap-1.5 ${billingPeriod === 'anual' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/20 font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Anual <span className="text-[9px] text-cyan-400 font-bold bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.5 rounded-md">-11%</span>
          </button>
        </div>
      </div>

      {/* Grid contendo os Cartões Neon Glass */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis') || plan.name.toLowerCase().includes('gold') || plan.name.toLowerCase().includes('plus');
          
          // Cálculo do Preço Dinâmico com Desconto de 11% se for Anual
          const basePrice = getItemPrice(plan);
          const finalPrice = billingPeriod === 'anual' 
            ? Math.round((basePrice * 12) * 0.89) 
            : basePrice;

          return (
            <div 
              key={plan._id} 
              className={`relative p-8 rounded-2xl transition-all duration-500 flex flex-col group backdrop-blur-xl backdrop-saturate-[180%]
                ${isPopular 
                  ? 'bg-gradient-to-b from-[#0a142c]/60 to-[#050b18]/80 border border-cyan-500/40 shadow-[0_0_50px_-12px_rgba(34,211,238,0.25)] scale-[1.03] z-10' 
                  : 'bg-[#070c14]/40 border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-blue-500/30 hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.2)]'}`}
            >
              
              {/* Glow Linear Interno Superior */}
              <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r transition-opacity duration-500
                ${isPopular ? 'from-transparent via-cyan-400 to-transparent opacity-100' : 'from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100'}`} 
              />

              {/* Badge Flutuante em Neon */}
              {isPopular && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#02040a] border border-cyan-400/50 text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                  Mais Recomendado
                </div>
              )}

              {/* Header do Cartão */}
              <div className="mb-6">
                <h3 className="text-lg font-medium tracking-tight text-white mb-2 group-hover:text-cyan-300 transition-colors duration-300">
                  {plan.name}
                </h3>
                <p className="text-[12.5px] font-normal leading-relaxed h-10 line-clamp-2 text-slate-400">
                  {plan.description || "Gestão comercial integrada ideal para estruturar a sua operação."}
                </p>
              </div>
              
              {/* Preço e Ciclo Dinâmicos */}
              <div className="mb-8 pt-6 border-t border-white/[0.04] relative">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-medium tracking-tight text-white bg-gradient-to-b from-white to-slate-300 bg-clip-text">
                    {basePrice === 0 ? 'Grátis' : finalPrice.toLocaleString()}
                  </span>
                  <div className="flex flex-col justify-end">
                    <span className="text-[8.5px] font-bold tracking-widest text-cyan-400 uppercase drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
                       {currency}
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 lowercase mt-0.5">
                       / {billingPeriod === 'mensal' ? 'mês' : 'ano'}
                    </span>
                  </div>
                </div>
                {billingPeriod === 'anual' && basePrice > 0 && (
                  <span className="absolute bottom-[-16px] left-0 text-[9px] font-medium text-emerald-400/80 tracking-wide animate-[fadeIn_0.2s_ease-out]">
                    Economia anual ativa com 11% de desconto incluído
                  </span>
                )}
              </div>

              {/* Recursos com bullets em Neon Ativo */}
              <ul className="space-y-4 mb-10 flex-1">
                {plan.includedLimits?.map((limit: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[12px] font-normal">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300
                      ${isPopular 
                        ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]' 
                        : 'bg-white/[0.02] border-white/[0.08] text-slate-400 group-hover:border-blue-500/30 group-hover:text-blue-400'}`}
                    >
                      <Check size={8} strokeWidth={3.5} />
                    </div>
                    <span className="text-slate-300 leading-tight">
                      {limit.description}: <span className="font-medium text-white group-hover:text-slate-100 transition-colors">{limit.maxValue} {limit.unit}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Ações e Botões de Vidro Fluido */}
              <div className="flex flex-col gap-2.5 pt-4">
                <button 
                  onClick={() => { 
                    // Passa o plano modificado com o preço correto e ciclo atual para o carrinho
                    const checkoutPlan = {
                      ...plan,
                      price: basePrice, // always the monthly base price
                      billingCycle: billingPeriod === 'anual' ? 'Anual' : 'Mensal',
                      annualDiscountPercent: billingPeriod === 'anual' ? 11 : undefined
                    };
                    addToCart(checkoutPlan, 'bundles'); 
                  }} 
                  className={`w-full py-3.5 rounded-xl font-medium text-xs tracking-wide transition-all duration-300 active:scale-95
                    ${isPopular 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] border border-cyan-400/20' 
                      : 'bg-white/[0.03] text-white hover:bg-white/[0.07] border border-white/[0.08] hover:border-blue-500/20'}`}
                >
                  {basePrice === 0 ? 'Começar Agora' : 'Ativar Sistema'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className="w-full py-2 text-[10.5px] font-normal tracking-wide text-slate-500 hover:text-slate-400 transition-colors"
                >
                  Ver todos os detalhes e termos
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  </section>
)}

{/* ── Seção: Combos Comerciais (Neon Glassmorphism Horizontal) ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-12 sm:py-16 bg-transparent relative overflow-hidden">
    
    {/* Malha de Luz de Fundo Direcionada para o Scroll */}
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute top-[50%] right-[-10%] w-[600px] h-[400px] bg-indigo-600/[0.03] rounded-full blur-[140px]" />
    </div>

    <div className="max-w-[1200px] mx-auto px-6 relative z-10">
      
      {/* Cabeçalho Avançado */}
      <div className="max-w-2xl mb-10 space-y-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-blue-400 bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10">
          Soluções Completas
        </span>
        <h2 className="text-3xl md:text-4xl font-medium text-white tracking-[-0.02em]">
          Pacotes de Integração <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">MPV + Branding</span>
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl font-normal opacity-75">
          Combinações estruturadas para digitalizar o seu balcão físico e a sua operação online num único ecossistema.
        </p>
      </div>

      {/* Horizontal Scroll — GSAP smooth scroll + custom scrollbar */}
      <div ref={scrollContainerRef} className="relative overflow-hidden pb-10 select-none">
        <div ref={scrollWrapperRef} className="flex gap-6 pointer-events-auto will-change-transform" style={{ transform: 'translateX(0px)' }}>
          {filteredBundles
            .filter(item => item.type === 'Combo')
            .map((item, index) => {
              const image = getImageUrl(item.image || '');
              
              return (
                <div
                  key={item._id}
                  onClick={() => openItem(item, 'bundles')}
                  className="group relative bg-[#070c14]/30 backdrop-blur-xl backdrop-saturate-[180%] rounded-2xl p-[1px] w-[50vw] md:w-[50vw] shrink-0 transition-all duration-500 border border-white/[0.05] hover:border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.15)] cursor-pointer overflow-hidden"
                >
                  {/* Linha de Luz Superior Reativa */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-cyan-400/50 to-transparent transition-all duration-700" />

                  <div className="bg-[#050911]/60 rounded-2xl p-5 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 max-h-96 items-center">
                    
                    {/* Container da Imagem com Filtro Tech */}
                    <div className="w-full md:w-2/5 aspect-[4/4] md:aspect-[4/5] rounded-xl overflow-hidden bg-black/40 border border-white/[0.05] shrink-0 relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-transparent z-10 opacity-60" />
                      <img 
                        src={image || "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=600&auto=format&fit=crop"} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 opacity-80 group-hover:opacity-100 mix-blend-luminosity group-hover:mix-blend-normal" 
                      />
                    </div>

                    {/* Conteúdo Avançado do Produto */}
                    <div className="flex-1 flex flex-col justify-between w-full h-full py-1">
                      <div>
                        <div className="flex justify-between items-center mb-5">
                          <span className="text-[9px] font-medium text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full uppercase tracking-wider border border-cyan-400/20">
                            Configuração {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </span>
                          <div className="text-slate-600 group-hover:text-cyan-400 transition-colors duration-300">
                            <Layers size={16} />
                          </div>
                        </div>
                        
                        <h3 className="text-xl md:text-2xl font-medium text-white mb-4 tracking-tight group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 group-hover:bg-clip-text transition-all">
                          {item.name}
                        </h3>
                        
                        <p className="text-slate-400 text-[12.5px] leading-relaxed font-normal mb-4 line-clamp-3">
                          {item.description || "Agrupamento estratégico de terminais e licenças cloud otimizado para o faturamento imediato do seu negócio."}
                        </p>
                      </div>
                      
                      {/* Footer de Preço e Ação Ciberpunk */}
                      <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-end justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1">Valor do Ecossistema</span>
                          <span className="text-xl font-medium text-white tracking-tight">
                            {getItemPrice(item).toLocaleString()} <span className="text-[11px] text-cyan-400 font-medium tracking-wide">{currency}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10.5px] font-medium text-slate-400 group-hover:text-white uppercase tracking-wider pb-1 border-b border-transparent group-hover:border-cyan-400/40 transition-all duration-300">
                          Configurar Combo <ArrowUpRight size={13} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Badge Flutuante "Premium" em Holograma */}
                  <div className="absolute top-6 right-6 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-[#02040a] border border-cyan-400/30 text-cyan-300 text-[8px] font-medium py-1 px-3 rounded-full tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                      INFRAESTRUTURA COMPLETA
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Custom styled scrollbar with drag + click-to-seek */}
      <div
        className="relative mx-auto mt-4 h-6 flex items-center cursor-pointer select-none w-[calc(100%-3rem)] max-w-[1000px]"
        onClick={handleTrackClick}
      >
        {/* Track background — glass holographic */}
        <div className="absolute inset-x-0 mx-auto h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
          {/* Fill glow */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500/50 via-cyan-400/60 to-cyan-300/50 rounded-full transition-[width] duration-200"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>

        {/* Thumb — draggable glowing pill */}
        <div
          ref={scrollbarThumbRef}
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 z-10 flex items-center justify-center"
          style={{ left: `calc(${scrollProgress * 100}% - 8px)` }}
          onMouseDown={handleThumbMouseDown}
        >
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.5),0_0_4px_rgba(34,211,238,0.3)] border border-white/20 transition-transform duration-200 hover:scale-125 active:scale-90" />
        </div>

        {/* Step indicators */}
        <div className="absolute inset-x-0 bottom-[-14px] flex justify-between text-[8px] font-mono text-white/[0.12] tracking-wider px-0.5 select-none pointer-events-none">
          <span>{scrollProgress === 0 ? '▸' : '◂'}</span>
          <span className="text-[7px] text-white/[0.06]">{Math.round(scrollProgress * 100)}%</span>
          <span>{scrollProgress >= 0.98 ? '◂' : '▸'}</span>
        </div>
      </div>

    </div>
  </section>
)}
{/* Section: Practice Areas & Services — Interface de Soluções Inteligentes */}
{filteredServices.length > 0 && (
  <section id="services" className="py-32 bg-transparent relative overflow-hidden">
    
    <div className="max-w-[1200px] mx-auto px-6 relative z-10">
      
      {/* Cabeçalho Tecnológico Fluido */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
        <div className="max-w-2xl space-y-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-400/10">
            Websites, Portais e Personalizações 
          </span>
          <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.02em] text-white">
            Serviços e Especialidades <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Do Seu Ponto de Venda</span>
          </h2>
        </div>
        <div className="max-w-xs">
          <p className="text-slate-400 text-xs md:text-[13px] leading-relaxed border-l border-white/[0.08] pl-6 font-normal opacity-80">
            Crie sua presença online com websites modernos, personalize o que já existe ou escolha entre modelos prontos de portais de venda. Tudo integrado ao MPV para transformar dados em resultados.
          </p>
        </div>
      </div>

      {/* Grid de Serviços — Neon Glass Interactive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.slice(0, visibleServices).map((item, index) => (
          <div
            key={item._id}
            onClick={() => openItem(item, 'services')}
            className="group relative flex flex-col h-[460px] rounded-2xl overflow-hidden bg-[#070c14]/20 border border-white/[0.04] hover:border-blue-500/30 cursor-pointer transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.2)]"
          >
            {/* Background Image com Máscara de Fusão Digital */}
            <div className="absolute inset-0 z-0 bg-[#030712]">
              {item.images?.length > 0 ? (
                <img 
                  src={getImageUrl(item.images[0])} 
                  alt={item.name}
                  className="w-full h-full object-cover grayscale opacity-[0.12] scale-100 transition-all duration-700 group-hover:scale-105 group-hover:opacity-[0.25] group-hover:grayscale-0 mix-blend-luminosity group-hover:mix-blend-normal"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-950/10 to-indigo-950/10" />
              )}
              
              {/* Overlay de Gradiente Técnico Termo-reativo */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/90 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] via-transparent to-cyan-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
            </div>

            {/* Linha Laser na Borda Superior */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/0 group-hover:via-cyan-400/40 to-transparent transition-all duration-500 z-20" />

            {/* Conteúdo Interno da UI do Card */}
            <div className="relative z-20 flex flex-col h-full p-8 justify-end">
              
              {/* Micro Categoria */}
              <div className="mb-4 transform translate-y-0 group-hover:-translate-y-1 transition-transform duration-500">
                <span className="text-[9px] font-medium uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/20">
                  {item.category || "Módulo Geral"}
                </span>
              </div>
              
              {/* Título Estilo Aventa Medium */}
              <h3 className="text-lg md:text-xl font-medium text-white mb-3 tracking-tight group-hover:text-cyan-300 transition-colors duration-300">
                {item.name}
              </h3>
              
              {/* Descrição em Gaveta Fluida */}
              <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-24 group-hover:opacity-100 transition-all duration-500 ease-in-out">
                <p className="text-slate-400 text-[12.5px] leading-relaxed mb-5 line-clamp-3 font-normal">
                  {item.description || "Gestão automatizada e integrações desenhadas para proteger as margens e garantir a sincronização do stock físico."}
                </p>
              </div>

              {/* Gatilho de Ação Estilo Terminal */}
              <div className="pt-5 border-t border-white/[0.04] group-hover:border-cyan-500/20 flex items-center justify-between transition-colors duration-500">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 group-hover:text-white transition-colors">
                  Iniciar Configuração
                </span>
                <div className="w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:bg-cyan-500 group-hover:border-transparent group-hover:shadow-[0_0_12px_rgba(34,211,238,0.4)] transition-all duration-500 shrink-0">
                  <ArrowRight size={12} className="text-slate-400 group-hover:text-[#02040a] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Botão Expandir com Elemento de Varredura Conector */}
      {visibleServices < filteredServices.length && (
        <div className="mt-20 flex flex-col items-center">
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-blue-500/50 to-cyan-500 mb-6" />
          <button 
            onClick={() => setVisibleServices(prev => prev + 3)}
            className="group flex items-center gap-3 text-slate-400 hover:text-white text-[10.5px] font-medium uppercase tracking-wider transition-colors"
          >
            Carregar Mais Funcionalidades
            <div className="w-7 h-7 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-cyan-400/40 group-hover:bg-cyan-500/5 transition-all">
              <Plus size={12} className="text-slate-400 group-hover:text-cyan-400" />
            </div>
          </button>
        </div>
      )}
      
    </div>
  </section>
)}

{/* — Seção de Produtos/Soluções Estilo Prateleira Digital Neon — */}
{filteredProducts.length > 0 && (
  <section className="py-28 bg-transparent text-white relative overflow-hidden">
    <div className="max-w-[1200px] mx-auto px-6 relative z-10">
      
      {/* Header Grid Refinado */}
      <div className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7 space-y-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-400/10 inline-block">
            Produtos Digitais do Ecossistema
          </span>
          <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.02em] text-white">
            Modelos, Portais & <br /> <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Documentos Integrados</span>
          </h2>
        </div>
        <div className="lg:col-span-5">
          <p className="text-slate-400 text-xs md:text-[13px] leading-relaxed border-l border-white/[0.08] pl-6 font-normal opacity-80">
           Expanda o seu ponto de venda com infraestrutura digital pronta para integração automática. Adicione modelos de websites ou portais de venda, incorpore documentos fiscais (faturas, cotações, guias de entrega, ordens de compra) e garanta presença profissional com domínios .co.mz. Cada produto conecta-se ao ecossistema MPV para aumentar capacidade e simplificar a gestão.
          </p>
        </div>
      </div>

      {/* Grid de Produtos */}
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
              className="group relative bg-[#070c14]/30 backdrop-blur-xl backdrop-saturate-[180%] p-4 flex flex-col transition-all duration-500 cursor-pointer rounded-2xl border border-white/[0.04] hover:border-blue-500/30 hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.25)] h-full min-h-[560px]"
            >
              {/* Linha de Luz Guia de Aresta Superior */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/0 group-hover:via-cyan-400/30 to-transparent transition-all duration-500 z-20" />

              {/* Área da Imagem (Display Técnico Retroiluminado) */}
              <div className="relative h-72 w-full overflow-hidden bg-black/40 rounded-xl flex items-center justify-center p-4 border border-white/[0.04]">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover rounded-lg opacity-85 group-hover:opacity-100 transition-all duration-700 group-hover:scale-102 mix-blend-luminosity group-hover:mix-blend-normal" 
                  />
                ) : (
                  <div className="w-full h-full bg-white/[0.01] rounded-lg flex items-center justify-center border border-dashed border-white/[0.08]">
                     <Package className="text-slate-600 group-hover:text-cyan-500 transition-colors" size={40} strokeWidth={1.5} />
                  </div>
                )}
                
                {/* Badge de Preço em Neon Minimalista */}
                <div className="absolute top-4 right-4 bg-[#02040a]/90 border border-white/[0.08] group-hover:border-cyan-500/40 text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-tight shadow-md backdrop-blur-md transition-colors duration-300">
                   {getItemPrice(item).toLocaleString()} <span className="text-[10px] text-cyan-400 font-normal ml-0.5">{currency}</span>
                </div>
              </div>

              {/* Conteúdo do Produto */}
              <div className="px-3 pt-6 pb-2 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-[9px] font-medium uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
                    {item.category || 'Módulo'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-[#02040a] group-hover:border-transparent transition-all duration-300">
                    <ArrowUpRight size={12} />
                  </div>
                </div>

                <h3 className="text-lg font-medium mb-3 tracking-tight text-white group-hover:text-cyan-300 transition-colors duration-300">
                  {item.name}
                </h3>
                
                <p className="text-[12.5px] leading-relaxed text-slate-400 font-normal line-clamp-2">
                  {item.description || "Infraestrutura de expansão periférica desenhada para integração automática."}
                </p>

                {/* Botão de Aquisição */}
                <div className="mt-auto pt-6">
                   <div className="w-full py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:border-cyan-400/20 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] text-slate-300 transition-all duration-300 text-center text-[10.5px] font-medium uppercase tracking-wider">
                     Adicionar ao Ecossistema
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão Carregar Mais / Ocultar Soluções */}
      {filteredProducts.length > 3 && (
        <div className="mt-16 flex justify-center">
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="flex items-center gap-3 px-8 py-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.08] hover:border-cyan-400/30 text-slate-300 hover:text-white text-[10.5px] font-medium uppercase tracking-wider rounded-xl transition-all duration-300 shadow-sm"
          >
            {showAllProducts ? 'Recolher Prateleira' : 'Ver Todos os Componentes'}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-500 ${showAllProducts ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>
        </div>
      )}
      
    </div>
  </section>
)}






  </div>
{/* Seção: Clientes / Parceiros (Esteira Holográfica com Máscara de Desvanecimento) */}
{portalContent?.clients?.enabled && portalContent.clients.items?.length > 0 && (
  <section className="py-20 bg-transparent relative overflow-hidden">
    <div className="max-w-[1200px] mx-auto px-6 relative z-10">
      
      {/* Micro-Header Centrado com Brilho Sutil */}
      <div className="flex flex-col items-center text-center mb-12">
        <h3 className="text-center text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 bg-white/[0.01] border border-white/[0.04] px-4 py-1.5 rounded-full backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          Empresas que escalam com o <span className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">Meu Ponto de Venda</span>
        </h3>
      </div>
      
      {/* Container Principal com Máscaras de Gradiente Laterais para Fusão Infinita */}
      <div className="relative w-full overflow-hidden before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-20 before:bg-gradient-to-r before:from-[#02040a] before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-20 after:bg-gradient-to-l after:from-[#02040a] after:to-transparent">
        
        {/* Flex / Grid Alinhado e Purista (Suporta scroll nativo ou loop infinito CSS) */}
        <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 md:gap-x-20 px-8">
          {portalContent.clients.items.map((client: any, i: number) => (
            <div 
              key={i} 
              className="group/logo relative flex items-center justify-center h-9 transition-all duration-300 transform hover:scale-[1.04]"
            >
              {/* Brilho Traseiro Escondido que Acorda no Hover */}
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <img 
                src={getImageUrl(client.logo)} 
                alt={client.name} 
                className="h-full w-auto object-contain brightness-0 invert opacity-40 group-hover/logo:opacity-90 group-hover/logo:contrast-125 transition-all duration-300 mix-blend-plus-lighter" 
              />
            </div>
          ))}
        </div>

      </div>

    </div>
  </section>
)}

{/* — Testemunhos: Painéis de Validação Holográfica — */}
{portalContent?.testimonials?.enabled && portalContent.testimonials.items?.length > 0 && (
  <section id="testimonials" className="py-28 bg-transparent relative overflow-hidden">
    
    {/* Detalhe de Iluminação de Fundo da Secção */}
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/[0.02] rounded-full blur-[140px]" />
    </div>

    <div className="max-w-[1200px] mx-auto px-6 relative z-10">
      
      {/* Header Centralizado Tecnológico */}
      <div className="text-center mb-20 space-y-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-400/10 inline-block">
          Casos de Sucesso
        </span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.02em] text-white">
          Quem opera com o <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Nosso Ecossistema</span>
        </h2>
      </div>

      {/* Grid de Depoimentos Acrílicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portalContent.testimonials.items.map((t, i) => (
          <div 
            key={i} 
            className="group relative p-8 rounded-2xl bg-[#070c14]/30 backdrop-blur-xl backdrop-saturate-[180%] border border-white/[0.04] hover:border-cyan-500/30 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(34,211,238,0.15)] hover:-translate-y-1"
          >
            {/* Linha Laser decorativa no topo apenas visível no hover */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-blue-400/30 to-transparent transition-all duration-500 z-20" />

            <div>
              {/* Rating com Estrelas em Brilho de Neon */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-1">
                  {Array.from({ length: t.rating || 5 }).map((_, k) => (
                    <svg key={k} className="w-3 h-3 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.5)] fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Ícone de Aspas Modernizado */}
                <span className="text-2xl font-mono text-slate-700/40 select-none leading-none group-hover:text-cyan-400/20 transition-colors duration-300">”</span>
              </div>

              {/* Bloco de Texto Modificado */}
              <blockquote className="mb-8">
                <p className="text-[13.5px] font-normal leading-relaxed text-slate-300 tracking-tight group-hover:text-white transition-colors duration-300">
                  "{t.text}"
                </p>
              </blockquote>
            </div>

            {/* Perfil e Assinatura Digital do Cliente */}
            <div className="flex items-center gap-3.5 pt-5 border-t border-white/[0.04] group-hover:border-cyan-500/10 transition-colors duration-500">
              <div className="w-10 h-10 rounded-full bg-black/40 border border-white/[0.06] overflow-hidden shrink-0 relative">
                {t.avatar ? (
                  <img src={t.avatar} alt={t.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0a0f1d] text-cyan-400 text-[10px] font-medium tracking-wider uppercase">
                    {t.name?.substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs text-white truncate mb-0.5">{t.name}</p>
                <p className="text-[9.5px] font-normal tracking-wide text-slate-500 truncate lowercase">
                  {t.role} <span className="text-cyan-500/40 font-bold mx-1">•</span> <span className="text-slate-400">{t.company}</span>
                </p>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Divisor de Rodapé Técnico */}
      <div className="mt-20 flex justify-center opacity-40">
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/[0.08] self-center"></div>
        <span className="mx-4 text-[9px] font-medium uppercase tracking-[0.25em] text-slate-500">Métricas de Satisfação Verificadas</span>
        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/[0.08] self-center"></div>
      </div>
      
    </div>
  </section>
)}



{/* Item Details - Visualização Imersiva Fullscreen (100vw/100vh) */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] bg-[#02040a] md:overflow-hidden flex flex-col h-screen w-screen animate-[fadeIn_0.3s_ease-out]">
    
    {/* Micro Linha de Progresso Superior Estética */}
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 z-50" />

    {/* Header Superior Fixo - Barra de Navegação de Fecho */}
    <div className="w-full h-20 border-b border-white/[0.04] bg-[#02040a]/80 backdrop-blur-md flex items-center justify-between px-6 md:px-12 z-40 shrink-0">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
          Módulo de Inspeção / {selectedItem.category || selectedItem.type || activeCatalog}
        </span>
      </div>
      
      {/* Botão Fechar Minimalista Estilo Terminal */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="group flex items-center gap-3 text-[10px] font-medium text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
      >
        <span>Fechar Painel</span>
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-all text-slate-400 group-hover:text-cyan-400">
          <X size={14} />
        </div>
      </button>
    </div>

    {/* Corpo Principal: Ajustado overflow para scroll natural no mobile */}
    <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full relative overflow-y-auto md:overflow-y-hidden">
      
      {/* COLUNA ESQUERDA: Carrossel Imersivo (Altura dinâmica e fluida no mobile) */}
      <div className="w-full md:w-1/2 h-[40vh] sm:h-[45vh] md:h-full bg-black/20 border-b md:border-b-0 md:border-r border-white/[0.04] relative flex items-center justify-center p-4 sm:p-6 md:p-16 select-none shrink-0 md:shrink">
        {(() => {
          const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
            ? selectedItem.images 
            : selectedItem.image ? [selectedItem.image] : [];

          const handleCarouselClick = () => {
            if (itemImages.length > 1) {
              setCurrentImgIndex((prev) => (prev + 1) % itemImages.length);
            }
          };

          if (itemImages.length > 0) {
            return (
              <div className="w-full h-full flex flex-col items-center justify-center relative max-w-2xl">
                
                {/* Visualizador Principal Clicável */}
                <div 
                  onClick={handleCarouselClick}
                  className="relative w-full h-full rounded-2xl overflow-hidden bg-[#050911]/60 border border-white/[0.05] cursor-pointer group shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
                >
                  <img 
                    src={getImageUrl(itemImages[currentImgIndex])} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" 
                    alt={selectedItem.name} 
                  />
                  
                  {/* Feedback Visual de Clique */}
                  {itemImages.length > 1 && (
                    <div className="absolute inset-0 bg-cyan-400/[0.02] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] uppercase font-medium tracking-widest text-cyan-400/80 bg-[#02040a]/80 px-4 py-2 rounded-xl border border-cyan-400/20 backdrop-blur-sm pointer-events-none transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500 hidden md:inline-block">
                        Clique para Avançar Imagem
                      </span>
                    </div>
                  )}

                  {/* Estado Ativo Flutuante */}
                  <div className="absolute top-4 left-4 bg-[#02040a]/90 border border-white/[0.06] px-3 py-1.5 rounded-lg backdrop-blur-md shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[9px] font-medium uppercase tracking-wider text-white">SaaS Integração</span>
                    </div>
                  </div>
                </div>
                
                {/* Indicadores / Mini-Trilhos Clicáveis */}
                {itemImages.length > 1 && (
                  <div className="absolute bottom-4 sm:bottom-6 flex gap-2 z-30 bg-[#02040a]/60 border border-white/[0.05] p-2 rounded-xl backdrop-blur-md">
                    {itemImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImgIndex(idx);
                        }}
                        className={`h-1.5 transition-all duration-300 ${idx === currentImgIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div className="w-full h-full max-w-2xl bg-white/[0.01] border border-dashed border-white/[0.08] rounded-2xl flex items-center justify-center">
              <Package size={48} strokeWidth={1.5} className="text-slate-700 animate-pulse" />
            </div>
          );
        })()}
      </div>

      {/* COLUNA DIREITA: Especificações do Sistema (Scrola de forma independente apenas no desktop) */}
      <div className="flex-1 flex flex-col bg-transparent p-6 sm:p-8 md:p-12 lg:p-16 md:overflow-y-auto">
        <div className="flex-1 max-w-2xl w-full mx-auto space-y-10">
          
          {/* Header de Título */}
          <div className="space-y-4">
            <h3 className="text-2xl md:text-4xl font-medium text-white leading-tight tracking-tight">
              {selectedItem.name}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed font-normal opacity-90">
              {selectedItem.description || "Solução modular integrada desenhada para unificar a gestão de fluxos comerciais, inventário inteligente e faturamento."}
            </p>
          </div>

          {/* Divisor de Fluxo */}
          <div className="h-[1px] w-full bg-white/[0.04]" />

          {/* Módulos Incluídos / Especificações Técnicas */}
          <div className="space-y-8">
            <section>
              <h4 className="text-slate-400 text-[10.5px] font-medium uppercase tracking-wider mb-5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500/50" /> Componentes Integrados no Setup
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(selectedItem.includedItems || selectedItem.items || []).map((it, i) => (
                  <div key={i} className="flex items-center gap-3.5 p-4 rounded-xl bg-[#070c14]/30 border border-white/[0.04] hover:border-blue-500/20 transition-all group">
                    <div className="w-5 h-5 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-[#02040a] transition-all">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-normal text-slate-300 group-hover:text-white truncate transition-colors">
                      {it.productId?.name || it.description || "Feature Component"}
                    </span>
                    {it.quantity > 1 && (
                      <span className="ml-auto text-[9px] font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">x{it.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Limites de Operação da Licença Cloud */}
            {selectedItem.includedLimits?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {selectedItem.includedLimits.map((l, i) => (
                  <div key={i} className="p-5 rounded-xl bg-gradient-to-br from-[#070c14]/40 to-black/20 border border-white/[0.04]">
                    <p className="text-[9.5px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{l.description}</p>
                    <p className="text-xl font-medium text-white tracking-tight">
                      {l.maxValue} <span className="text-xs font-normal text-cyan-400">{l.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Painel de Ativação e Investimento */}
        <div className="max-w-2xl w-full mx-auto pt-8 mt-10 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex flex-col text-center sm:text-left">
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1">Valor do Setup Licenciado</span>
            <div className="text-3xl font-medium text-white tracking-tight">
              {getItemPrice(selectedItem).toLocaleString()} <span className="text-xs text-cyan-400 font-medium tracking-wide uppercase">{currency}</span>
            </div>
          </div>
          
          <button 
            onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); setCurrentImgIndex(0); }} 
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 border border-cyan-400/20 text-white font-medium text-[11px] uppercase tracking-wider rounded-xl hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] transition-all duration-300 active:scale-[0.98]"
          >
            Ativar Módulo e Implementar
          </button>
        </div>

      </div>
    </div>
  </div>
)}

{/* CART MODAL – Edição Imersiva Neon Glassmorphism (Ajuste de Scroll Unificado) */}
<div className={`fixed inset-0 z-[100] bg-[#02040a] lg:overflow-hidden flex flex-col h-screen w-screen transition-all duration-500 ${isCartOpen ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-4'}`}>
  
  {/* Linha de Progresso Superior Laser */}
  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 z-50" />

  {/* Header Fixo do Carrinho */}
  <div className="w-full h-20 border-b border-white/[0.04] bg-[#02040a]/80 backdrop-blur-md flex items-center justify-between px-6 md:px-12 z-40 shrink-0">
    <div className="flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
        Módulo de Checkout / Operações Comerciais
      </span>
    </div>
    
    <button 
      onClick={() => setIsCartOpen(false)} 
      className="group flex items-center gap-3 text-[10px] font-medium text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
    >
      <span>Retornar ao Painel</span>
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-all text-slate-400 group-hover:text-cyan-400">
        <X size={14} />
      </div>
    </button>
  </div>

  {/* Área Principal: Unificada para scroll global abaixo do desktop */}
  <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full relative overflow-y-auto lg:overflow-y-hidden">
    
    {/* COLUNA ESQUERDA: Portfólio de Itens e Lista Técnica */}
    <div className="w-full lg:w-[58%] flex flex-col bg-transparent border-b lg:border-b-0 lg:border-r border-white/[0.04] shrink-0 lg:shrink">
      <div className="p-6 md:p-10 border-b border-white/[0.04] flex justify-between items-end bg-[#050911]/20">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-400/10 inline-block mb-3">
            Seleção de Recursos
          </span>
          <h2 className="text-2xl md:text-4xl font-medium text-white tracking-tight">
            Módulos <span className="text-slate-500 font-light">Configurados</span>
          </h2>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-medium text-slate-400 bg-white/[0.02] border border-white/[0.06] px-3 py-1 rounded-lg">
            {cart.length} {cart.length === 1 ? 'Sistema na Prateleira' : 'Sistemas na Prateleira'}
          </p>
        </div>
      </div>

      {/* Lista de Dispositivos/Módulos - Scroll independente apenas em telas grandes (lg) */}
      <div className="p-6 md:p-10 space-y-4 lg:overflow-y-auto lg:flex-1">
        {cart.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3 min-w-[500px] sm:min-w-0">
              <thead>
                <tr>
                  <th className="text-[10px] font-medium uppercase tracking-wider text-slate-500 px-4 pb-2">Especificação</th>
                  <th className="text-[10px] font-medium uppercase tracking-wider text-slate-500 text-center pb-2">
                    Quantidade
                  </th>
                  <th className="text-[10px] font-medium uppercase tracking-wider text-slate-500 text-right px-4 pb-2">Investimento</th>
                </tr>
              </thead>
              <tbody>
                {cart.map(cartItem => {
                  const isAnnualSub = !!cartItem.annualDiscountPercent;
                  const effectiveUnitPrice = isAnnualSub
                    ? Math.round(cartItem.price * (1 - cartItem.annualDiscountPercent! / 100))
                    : cartItem.price;

                  return (
                    <tr key={cartItem.itemId} className="group bg-[#070c14]/30 backdrop-blur-md border border-white/[0.04] hover:border-white/[0.08] transition-all">
                      <td className="py-4 px-4 rounded-l-xl border-l border-t border-b border-white/[0.04]">
                        <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-center p-2 shrink-0 overflow-hidden">
                            <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate tracking-tight">{cartItem.name}</p>
                            
                            {/* Label indicativo de faturação e desconto */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${isAnnualSub ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400'}`}>
                                Ciclo: {isAnnualSub ? 'Anual' : 'Mensal'}
                              </span>
                              {isAnnualSub && cartItem.price > 0 && (
                                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                                  -11% Poupança
                                </span>
                              )}
                            </div>

                            <button 
                              onClick={() => removeFromCart(cartItem.itemId)} 
                              className="flex items-center gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 transition-colors mt-2 font-normal tracking-wide"
                            >
                              <X size={11} /> Remover Módulo
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 border-t border-b border-white/[0.04]">
                        <div className="inline-flex items-center bg-black/40 border border-white/[0.06] rounded-xl p-1 shadow-inner">
                          <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-1 text-slate-400 hover:text-white transition-colors"><Minus size={11} /></button>
                          <span className="px-3 text-xs font-medium text-white min-w-[28px]">{cartItem.quantity}</span>
                          <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-1 text-slate-400 hover:text-white transition-colors"><Plus size={11} /></button>
                        </div>
                      </td>
                      <td className="text-right px-4 rounded-r-xl border-r border-t border-b border-white/[0.04]">
                        <p className="text-sm font-medium text-white tracking-tight">
                          {cartItem.price === 0 ? 'Grátis' : (effectiveUnitPrice * cartItem.quantity).toLocaleString()} <span className="text-[10px] text-cyan-400 font-normal ml-0.5">{cartItem.price > 0 && currency}</span>
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center opacity-40">
             <Briefcase size={40} strokeWidth={1.5} className="text-slate-500 mb-3 animate-pulse" />
             <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Nenhum componente selecionado</p>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 border-t border-white/[0.04] bg-[#050911]/20 shrink-0">
        <button 
          onClick={() => setIsCartOpen(false)}
          className="flex items-center gap-2.5 text-slate-400 hover:text-white text-[11px] font-medium uppercase tracking-wider group transition-colors"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform" /> Voltar para a Prateleira
        </button>
      </div>
    </div>

    {/* COLUNA DIREITA: Ativação de Protocolos & Faturamento */}
    <div className="flex-1 bg-transparent p-6 md:p-10 flex flex-col lg:overflow-y-auto">
      <div className="max-w-xl w-full mx-auto space-y-8 flex-1">
        <div>
          <h3 className="text-slate-400 text-[10.5px] font-medium uppercase tracking-wider mb-5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400/50" /> Identificação do Operador
          </h3>
          
          {/* Formulário de Identificação */}
          <div className="space-y-3">
            <input placeholder="Nome Completo / Entidade Corporativa" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-5 py-3.5 bg-[#070c14]/40 border border-white/[0.04] rounded-xl text-xs font-normal text-white placeholder:text-slate-600 focus:border-cyan-500/40 outline-none transition-all shadow-inner" />
            <input placeholder="E-mail Corporativo ou Profissional" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-5 py-3.5 bg-[#070c14]/40 border border-white/[0.04] rounded-xl text-xs font-normal text-white placeholder:text-slate-600 focus:border-cyan-500/40 outline-none transition-all shadow-inner" />
            <input type='number' placeholder="Terminal de Contacto" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="w-full px-5 py-3.5 bg-[#070c14]/40 border border-white/[0.04] rounded-xl text-xs font-normal text-white placeholder:text-slate-600 focus:border-cyan-500/40 outline-none transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            
            <textarea 
              placeholder="Notas de Integração ou Requisitos Específicos (Opcional)" 
              rows={2}
              value={client.notes || ""} 
              onChange={e => setClient({ ...client, notes: e.target.value })} 
              className="w-full px-5 py-3.5 bg-[#070c14]/40 border border-white/[0.04] rounded-xl text-xs font-normal text-white placeholder:text-slate-600 focus:border-cyan-500/40 outline-none transition-all shadow-inner resize-none"
            />

            <div className="relative">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-[#070c14]/40 border border-white/[0.04] rounded-xl text-xs font-normal text-white outline-none focus:border-cyan-500/40 [color-scheme:dark] shadow-inner" />
            </div>
          </div>

          {/* Pedido sob Encomenda Customizado */}
          {cart.some(item => item.madeToOrder) && (
            <div className="pt-4">
              <div className="p-4 bg-cyan-500/5 border border-cyan-400/10 rounded-xl">
                <label className="flex items-start gap-3.5 cursor-pointer group">
                  <div className="relative flex items-center pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={cart.every(item => item.madeToOrder ? item.wantsOrder : true)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCart(prev => prev.map(i => i.madeToOrder ? { ...i, wantsOrder: checked } : i));
                      }}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded bg-black/40 border border-white/[0.1] checked:bg-cyan-500 transition-all" 
                    />
                    <Check className="absolute h-3 w-3 text-[#02040a] opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" strokeWidth={4} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-300">Solicitar Ajuste Estrutural Customizado</span>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5 font-normal opacity-80">
                      Ativa o suporte sob medida para arquiteturas de hardware ou licenças não padronizadas.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Protocolos de Pagamento Activos */}
        <div>
          <h3 className="text-slate-400 text-[10.5px] font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400/50" /> Protocolo de Liquidação
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {['mpesa', 'visa', 'emola', 'transfer'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                className={`py-3.5 rounded-xl border text-[10px] font-medium uppercase tracking-wider transition-all duration-300 ${paymentMethod === m ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)] scale-[1.01]' : 'border-white/[0.04] bg-white/[0.01] text-slate-500 hover:border-white/[0.1] hover:text-slate-300'}`}
              >
                {m === 'transfer' ? 'Transferência Bancária' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Número de Telemóvel para M-Pesa / E-Mola */}
        {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
          <div className="animate-[fadeIn_0.4s_ease-out] space-y-2">
            <label className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
              {paymentMethod === 'mpesa' ? 'Número M-Pesa' : 'Número E-Mola'}
            </label>
            <input
              type="tel"
              value={mobileMoneyPhone}
              onChange={e => setMobileMoneyPhone(e.target.value)}
              placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
              className="w-full bg-[#070c14]/40 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-400/30 transition-colors"
            />
            <p className="text-[10px] text-slate-500">
              {paymentMethod === 'mpesa'
                ? 'O número deve começar com 84 ou 85'
                : 'O número deve começar com 86 ou 87'}
            </p>
          </div>
        )}

        {/* Dados Bancários Dinâmicos */}
        {paymentMethod === 'transfer' && company?.bankAccounts && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <div className="p-5 bg-[#070c14]/40 border border-white/[0.04] rounded-xl space-y-3 shadow-inner">
              <h4 className="text-[10px] font-medium text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={13} className="text-cyan-400" /> Coordenadas de Depósito Bancário
              </h4>
              {company.bankAccounts.map((bank, idx) => (
                <div key={idx} className="pb-3 last:pb-0 border-b last:border-0 border-white/[0.04]">
                  <p className="text-[11px] font-medium text-cyan-400 uppercase mb-1.5">{bank.bankName}</p>
                  <div className="space-y-1 bg-black/40 p-3 rounded-lg border border-white/[0.02]">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-500 font-normal">Nº de Conta:</span>
                      <span className="font-mono text-slate-300 font-medium">{bank.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-500 font-normal">NIB:</span>
                      <span className="font-mono text-slate-300 font-medium">{bank.nibOrIban}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Totais Dinâmicos Recalculados e Execução de Processos */}
      <div className="mt-8 pt-6 border-t border-white/[0.04] space-y-6 shrink-0 max-w-xl w-full mx-auto">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[9px] font-medium text-cyan-400 uppercase tracking-widest mb-1">
              Volume de Investimento {billingPeriod === 'anual' ? 'Anual' : 'Estimado'}
            </span>
            <span className="text-3xl md:text-4xl font-medium text-white tracking-tight leading-none">
              {cart.reduce((acc, curr) => {
                const lineTotal = curr.annualDiscountPercent
                  ? Math.round(curr.price * curr.quantity * (1 - curr.annualDiscountPercent / 100))
                  : curr.price * curr.quantity;
                return acc + lineTotal;
              }, 0).toLocaleString()}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{currency}</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handlePayment}
            disabled={submitting || !paymentMethod || !['mpesa', 'visa', 'emola'].includes(paymentMethod) || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 border border-cyan-400/20 text-white text-[11px] font-medium uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-10 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {submitting && ['mpesa', 'visa', 'emola'].includes(paymentMethod) ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {hasOrderWithPrice 
              ? `Liquidar Retenção Obrigatória` 
              : 'Autorizar Pagamento Online'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || !client.name || !client.email || hasOrderWithPrice}
            className="w-full py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] text-white text-[11px] font-medium uppercase tracking-wider rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-20"
          >
            {submitting && !['mpesa', 'visa', 'emola'].includes(paymentMethod) ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : null}
            {paymentMethod === 'transfer' ? 'Confirmar Ordem de Transferência' : 'Finalizar Requisição do Ecossistema'}
          </button>
        </div>
      </div>
    </div>

  </div>
</div>

{/* Modal de Sucesso - Arquitetura de Duas Colunas (Holographic Rocket Edition) */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-[#02040a]/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" 
    onClick={closeSuccessModal}
  >
    {/* Estilos CSS Inline Embutidos para Animação do Foguete e das Partículas de Dados */}
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes rocketFloat {
        0%, 100% { transform: translateY(0px) rotate(-45deg); }
        50% { transform: translateY(-15px) rotate(-45deg); }
      }
      @keyframes beamStream {
        0% { transform: translateY(-100%); opacity: 0; }
        50% { opacity: 0.4; }
        100% { transform: translateY(100%); opacity: 0; }
      }
      .animate-rocket { animation: rocketFloat 4s ease-in-out infinite; }
      .animate-beam-1 { animation: beamStream 2s linear infinite; }
      .animate-beam-2 { animation: beamStream 3s linear infinite; animation-delay: 0.5s; }
      .animate-beam-3 { animation: beamStream 2.5s linear infinite; animation-delay: 1.2s; }
    `}} />

    <div
      className="bg-[#070c14]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] max-w-4xl w-full flex flex-col md:flex-row overflow-hidden relative"
      onClick={e => e.stopPropagation()}
    >
      {/* Micro Linha de Status Superior Laser (Verde Operacional) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-cyan-400 z-50" />

      {/* COLUNA ESQUERDA: Showcase da Evolução (Skyrocket Animado) */}
      <div className="w-full md:w-[45%] bg-gradient-to-br from-blue-600/10 via-cyan-500/[0.02] to-transparent p-8 flex flex-col items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.04] min-h-[220px] md:min-h-0">
        
        {/* Linhas de Dados Verticais Cortando o Fundo */}
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-beam-1" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/30 to-transparent animate-beam-2" />
        <div className="absolute top-0 left-3/4 w-[1px] h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-beam-3" />

        {/* Círculos Concêntricos de Radar */}
        <div className="absolute w-44 h-44 rounded-full border border-cyan-500/5 animate-pulse" />
        <div className="absolute w-64 h-64 rounded-full border border-blue-500/[0.02]" />

        {/* Iconografia do Skyrocket */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500/10 to-blue-500/20 rounded-2xl border border-cyan-400/20 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-rocket">
            <Rocket size={36} className="text-cyan-400 transform -rotate-45" />
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-[10px] font-medium tracking-[0.3em] text-cyan-400 uppercase">Status: Deploy Activo</p>
            <p className="text-[9px] text-slate-500 font-normal mt-1">A Escalar Infraestrutura...</p>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: Confirmação e Informações de Despacho */}
      <div className="flex-1 p-8 md:p-12 flex flex-col justify-between space-y-8 bg-[#02040a]/40">
        
        <div className="space-y-5">
          <div className="flex">
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/5 px-3 py-1 rounded-md border border-emerald-500/20">
              Operação Concluída com Sucesso
            </span>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-xl md:text-3xl font-medium text-white tracking-tight">
              A sua evolução comercial <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">acaba de ser ativada</span>
            </h2>
            
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-normal">
              A sua solicitação foi registada com sucesso na rede. Um e-mail de faturamento contendo os manifestos técnicos e as credenciais do seu novo ecossistema já foi disparado para a sua caixa de entrada.
            </p>
          </div>
        </div>

        {/* Identificador de Rastreamento (Estilo Chave Criptográfica) */}
        <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
                Chave de Rastreamento / ID
              </p>
            </div>
            <p className="text-[9px] text-slate-500 font-normal">Use esta hash de referência para suporte técnico.</p>
          </div>
          
          <span className="font-mono text-sm font-medium text-cyan-400 tracking-wider bg-cyan-500/5 px-4 py-2 border border-cyan-400/10 rounded-lg shrink-0 select-all">
            MPV-{Math.random().toString(36).substr(2, 6).toUpperCase()}
          </span>
        </div>

        {/* Painel de Ação de Fecho */}
        <div className="pt-2">
          <button
            onClick={closeSuccessModal}
            className="w-full py-4 bg-white text-[#02040a] rounded-xl hover:bg-slate-200 active:scale-[0.99] font-medium text-[11px] uppercase tracking-wider shadow-[0_20px_40px_rgba(255,255,255,0.05)] transition-all duration-300"
          >
            Retornar ao Painel de Controle
          </button>
        </div>

      </div>
    </div>
  </div>
)}

{/* Modal de Aguardando Confirmação (Mobile Money) */}
{showAwaitingConfirmation && (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-[#02040a]/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
    <div className="bg-[#070c14]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] max-w-md w-full p-8 md:p-10 text-center">
      {pollStatus === 'waiting' && (
        <>
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-400/20 flex items-center justify-center mb-6">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">A aguardar confirmação</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Um pedido de pagamento foi enviado para o seu telemóvel.<br />
            <strong className="text-white">Introduza o seu PIN no telefone</strong> para autorizar o pagamento.
          </p>
          {awaitingRef && (
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl mb-6">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Referência</p>
              <p className="font-mono text-sm text-amber-400">{awaitingRef}</p>
            </div>
          )}
          <p className="text-xs text-slate-500 mb-6">A verificar pagamento a cada 3 segundos... (tentativa {pollAttempts})</p>
          <button
            onClick={() => setShowAwaitingConfirmation(false)}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/[0.06] text-sm font-medium transition-all"
          >
            Fechar
          </button>
        </>
      )}
      {pollStatus === 'confirmed' && (
        <>
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-400/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">Pagamento Confirmado!</h3>
          <p className="text-slate-400 text-sm mb-6">Redirecionando...</p>
        </>
      )}
      {pollStatus === 'failed' && (
        <>
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-400/20 flex items-center justify-center mb-6">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">Pagamento não confirmado</h3>
          <p className="text-slate-400 text-sm mb-6">O pagamento não foi autorizado. Tente novamente.</p>
        </>
      )}
    </div>
  </div>
)}

{/* FOOTER – Edição de Alta Performance Neon Glassmorphism */}
<footer className="bg-[#02040a] pt-24 pb-12 overflow-hidden relative border-t border-white/[0.04]">
  
  {/* Grelha de Micro-Pontos Cibernéticos Estilizados ao Fundo */}
  <div 
    className="absolute inset-0 opacity-[0.03] pointer-events-none" 
    style={{ 
      backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
      backgroundSize: '30px 30px' 
    }} 
  />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
      
      {/* Coluna 1: Branding e Captura de Leads Tecnológicos */}
      <div className="lg:col-span-4 space-y-8">
        <div className="flex items-center">
          {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-8 w-auto brightness-0 invert opacity-90" />
          ) : (
            <span className="font-medium text-lg tracking-tight text-white uppercase">
              /{company.name}<span className="text-cyan-400 font-light">.io</span>
            </span>
          )}
        </div>
        
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-normal opacity-80">
          Sistemas inteligentes de gestão comercial e faturação integrada para PMEs. Potenciando clareza, performance e expansão contínua.
        </p>
        
        {/* Newsletter Estilo Terminal */}
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400">Atualizações de Engenharia</p>
          <div className="flex p-1 bg-[#070c14]/50 border border-white/[0.06] rounded-xl focus-within:border-cyan-500/40 focus-within:bg-[#070c14]/90 transition-all">
            <input 
              type="email" 
              placeholder="E-mail corporativo" 
              className="flex-1 px-4 bg-transparent text-white text-xs outline-none placeholder:text-slate-600 font-normal" 
            />
            <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 border border-cyan-400/20 text-white rounded-lg text-[10px] font-medium uppercase tracking-wider hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all">
              Subscrever
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Links Rápidos do Ecossistema */}
      <div className="lg:col-span-2 space-y-6">
        <h4 className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Arquitetura</h4>
        <ul className="space-y-3">
          {['Módulos POS', 'Gestão Cloud', 'Faturação API', 'Segurança'].map(link => (
            <li key={link}>
              <a href="#" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors font-normal tracking-wide">{link}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Suporte Direto e Canais de Operação */}
      <div className="lg:col-span-3 space-y-6">
        <h4 className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Suporte de Operações</h4>
        <ul className="space-y-6">
          <li className="flex flex-col gap-1 border-l border-white/[0.08] pl-4">
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Linha Dedicada 24/7</span>
            <a href={`tel:${company.phone}`} className="text-white font-medium text-lg hover:text-cyan-400 transition-colors tracking-tight">
              {company.phone}
            </a>
          </li>
          <li className="flex flex-col gap-1 border-l border-white/[0.08] pl-4">
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Compliance & Infra</span>
            <a href={`mailto:${company.email}`} className="text-white font-normal text-xs hover:text-cyan-400 transition-colors tracking-wide break-all opacity-90">
              {company.email}
            </a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Redes Sociais e Gateway de Pagamentos */}
      <div className="lg:col-span-3 space-y-8">
        <div>
          <h4 className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 mb-4">Comunidade</h4>
          <div className="flex gap-2">
            {[
              { Icon: Instagram, url: 'https://www.instagram.com/mpv_software' },
              { Icon: Facebook, url: 'https://www.facebook.com/meupontodevenda' },
              { Icon: Linkedin, url: 'https://www.linkedin.com/company/meu-ponto-de-venda' }
            ].map((social, idx) => (
              <a 
                key={idx} 
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/[0.01] border border-white/[0.06] rounded-xl flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/30 transition-all duration-300"
              >
                <social.Icon size={15} />
              </a>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Gateways Integrados</p>
          <div className="flex flex-wrap gap-1.5">
            {['M-PESA', 'E-MOLA', 'VISA', 'MASTERCARD'].map(p => (
              <div key={p} className="px-2.5 py-1 bg-black/40 border border-white/[0.05] rounded text-[9px] font-mono text-slate-400 tracking-wide">
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Barra Inferior: Copyright e Status do Cluster */}
    <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="space-y-1 text-center md:text-left">
        <p className="text-[10px] font-medium text-white uppercase tracking-wider">
          © {new Date().getFullYear()} {company.name} <span className="text-slate-500 font-light">/ Inteligência SaaS Corporativa</span>
        </p>
        <p className="text-[9px] text-slate-600 font-normal uppercase tracking-widest">
          Garantia de Acordo de Nível de Serviço (SLA) de 99.99%.
        </p>
      </div>
      
      <div className="flex gap-6">
        <a href="#" className="text-[9px] font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-wider">Privacidade</a>
        <a href="#" className="text-[9px] font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-wider">Termos de Uso</a>
      </div>

      {/* Indicador de Status do Sistema Estilo Painel Cloud */}
      <div className="flex items-center gap-2.5 px-4 py-1.5 bg-[#070c14]/60 rounded-xl border border-white/[0.04]">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
         <span className="text-[9px] font-medium text-slate-300 uppercase tracking-wider">Cluster Global: Operacional</span>
      </div>
    </div>
  </div>
</footer>
    </div>
      </div>
  );
};

export default PlansrPortal;