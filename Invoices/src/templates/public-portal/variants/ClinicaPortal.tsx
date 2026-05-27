// src/templates/public-portal/variants/ClinicaPortal.tsx
import React, { useState, useEffect } from 'react';
import { Service, Company, Product, Bundle, API_BS_URL} from '../../../services/api';
import {
  User, FileText,  Package, Menu, ArrowRight, Utensils, Briefcase, PhoneCall, Heart, ChevronDown, ShoppingBag, ChevronLeft, ChevronRight, Play,Plus, Trash2,
  CheckCircle, Info, CreditCard, UtensilsCrossed, ShoppingCart, X,
  Search, Calendar, Minus, Check, User2, Eye,
  Zap,
  ShieldCheck,
  Globe,
  ClipboardCheck,
  Users,
  Linkedin,
  Instagram,
Twitter,
  Phone,
  Facebook,

  Mail
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

interface ClinicaProps {
  company: Company;
  slug: string;
  services: Service[];
  products?: Product[];
  bundles?: Bundle[];
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

const ClinicaPortal: React.FC<ClinicaProps> = ({ 
  company, 
  slug, 
  services: initialServices,
  products: initialProducts,
  bundles: initialBundles,
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
    <div className="min-h-screen bg-white">
      {/* Modern Navbar */}
{/* Header Estilo Premium Salon */}

{/* Header Estilo Premium Plans */}
<div className="font-sans text-slate-900">
  

      {/* 2. MAIN HEADER (Logo & Search) */}
{/* 2. MAIN HEADER (Estilo Minimalista Dark) */}
<header className="w-full font-sans">
  {/* TOP BAR */}
  <div className="relative bg-gradient-to-r from-[#1eb2a6] to-[#4a90e2] text-white py-2 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 flex justify-end items-center gap-8 relative z-10 text-sm">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4" /> <span>{company.phone}</span>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4" /> <span>{company.email}</span>
      </div>
      <div className="flex items-center gap-3 ml-4 border-l border-white/20 pl-4">
        <Facebook className="w-4 h-4" />
        <Twitter className="w-4 h-4" />
      </div>
    </div>
    <div 
      className="absolute top-0 left-0 h-full bg-white w-[35%] lg:w-[30%]" 
      style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}
    />
  </div>

  {/* MAIN NAV */}
  <div className="max-w-7xl mx-auto px-6 flex justify-between items-center py-4">
    
    {/* Logo Area Adaptada */}
    <div className="z-20 -mt-10">
      {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-12 w-auto" />
      ) : (
        <h1 className="text-2xl font-bold text-gray-800 leading-tight">
          {company.name}<br/>
          <span className="text-sm font-normal text-gray-500 uppercase tracking-widest">Home Health Care</span>
        </h1>
      )}
    </div>

    {/* Menu Items + Cart */}
    <div className="flex items-center gap-8">
      <nav className="hidden md:flex gap-8 text-[13px] font-bold text-gray-600 uppercase">
        <a href="#" className="text-[#1eb2a6] border-b-2 border-[#1eb2a6]">Home</a>
        <a href="#" className="hover:text-[#1eb2a6] transition-colors">About Us</a>
        <a href="#" className="hover:text-[#1eb2a6] transition-colors">Services</a>
        <a href="#" className="hover:text-[#1eb2a6] transition-colors">Careers</a>
      </nav>

      {/* Cart Logic Extracted */}
      <button 
        onClick={() => setIsCartOpen(true)} 
        className="relative group transition-all active:scale-95 text-gray-600 hover:text-[#1eb2a6]"
      >
        <ShoppingCart className="w-5 h-5" />
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#1eb2a6] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {cart.length}
          </span>
        )}
      </button>
    </div>
  </div>
</header>

{/* 4. HERO SECTION (Layout estilo "ClickBoost" com Dark Mode) */}
<section className="relative w-full h-[550px] overflow-hidden">
  {/* Lado Direito: Imagem de Fundo */}
  <div className="absolute inset-0 z-0">
    <img 
      src="https://i.pinimg.com/1200x/0d/80/ca/0d80ca58802c3106b017bf05139c502c.jpg" 
      alt="Health Care" 
      className="w-full h-full object-cover object-center"
    />
  </div>

  {/* Lado Esquerdo: Overlay Gradiente com Corte Diagonal */}
  <div 
    className="absolute inset-0 z-10 bg-gradient-to-br from-[#1eb2a6] via-[#4a90e2] to-transparent w-[60%] lg:w-[45%]"
    style={{ clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)' }}
  >
    <div className="h-full flex flex-col justify-center px-12 lg:px-24 text-white">
      <h2 className="text-4xl lg:text-5xl font-light leading-tight mb-6">
        This Awesome Slogan<br/>
        <span className="font-bold italic">is Temporary</span>
      </h2>
      <p className="text-sm opacity-90 max-w-xs mb-8 leading-relaxed">
        Dummy text for the reader to review. Words shown on this layout are placeholders.
      </p>
      
      <button className="flex items-center gap-3 bg-[#1a2b3c] hover:bg-black text-white px-6 py-3 rounded-md w-fit transition-all group">
        Find Out More
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  </div>

  {/* CARDS INFERIORES (Sobrepostos) */}
  <div className="absolute bottom-12 left-0 right-0 z-20 max-w-7xl mx-auto px-6 translate-y-1/2">
    <div className="grid grid-cols-1 md:grid-cols-3 shadow-2xl rounded-xl overflow-hidden">
      <div className="bg-white p-6 flex items-center justify-between border-r border-gray-100 group cursor-pointer">
        <div className="flex items-center gap-4">
          <Globe className="w-8 h-8 text-[#1eb2a6]" />
          <span className="text-[#1eb2a6] font-bold">Service Areas<br/>Covered</span>
        </div>
        <ChevronRight className="w-5 h-5 text-[#1eb2a6] group-hover:translate-x-1 transition-transform" />
      </div>
      
      <div className="bg-white p-6 flex items-center justify-between border-r border-gray-100 group cursor-pointer">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 text-[#1eb2a6]" />
          <span className="text-[#1eb2a6] font-bold">Meet Our Staff</span>
        </div>
        <ChevronRight className="w-5 h-5 text-[#1eb2a6] group-hover:translate-x-1 transition-transform" />
      </div>

      <div className="bg-[#1a2b3c] p-6 flex items-center justify-between text-white group cursor-pointer">
        <div className="flex items-center gap-4">
          <ClipboardCheck className="w-8 h-8 text-white" />
          <span className="font-bold">Insurance Accepted</span>
        </div>
        <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  </div>
</section>
 </div>
 <div className="relative flex-1  group w-full  max-w-2xl mx-auto">

{/* SEARCH BAR ADAPTADA AO LAYOUT (Inserir dentro do Hero, abaixo do parágrafo) */}
<div className="relative flex-1 group w-full mt-10 max-w-xl">
  
  {/* Container Principal: Trocamos o dark por um Glassmorphism claro ou Branco Sólido */}
  <div className="flex bg-white/90 backdrop-blur-md border border-white/20 rounded-full items-center p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all focus-within:shadow-[0_20px_50px_rgba(30,178,166,0.2)]">
    
    {/* Categoria (Estilo refinado com a cor principal do layout #1eb2a6) */}
    <select className="bg-transparent pl-6 py-2 text-[10px] font-black uppercase tracking-widest text-[#1eb2a6] outline-none cursor-pointer hover:text-[#1a2b3c] transition-colors border-r border-gray-200 mr-2 pr-4 appearance-none">
      <option>Serviços</option>
      <option>Unidades</option>
      <option>Especialistas</option>
    </select>

    {/* Input de busca (Texto escuro para legibilidade no fundo claro) */}
    <input 
      type="text" 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="O que você está procurando hoje?" 
      className="bg-transparent flex-1 px-4 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none"
    />
    
    {/* Botão de busca (Usando o azul marinho ou o verde da imagem para destaque) */}
    <button className="bg-[#1a2b3c] text-white p-3.5 rounded-full hover:scale-105 hover:bg-[#1eb2a6] transition-all duration-300 shadow-lg">
      <Search className="w-4 h-4" />
    </button>
  </div>

  {/* Tags Sugeridas (Opcional, mas dá um toque muito profissional abaixo da busca) */}
  <div className="flex gap-3 mt-4 ml-6">
    <span className="text-[10px] text-white/70 uppercase font-bold tracking-tighter">Sugestões:</span>
    <button className="text-[10px] text-white hover:underline decoration-[#1eb2a6]">Home Care</button>
    <button className="text-[10px] text-white hover:underline decoration-[#1eb2a6]">Fisioterapia</button>
    <button className="text-[10px] text-white hover:underline decoration-[#1eb2a6]">Enfermagem</button>
  </div>
</div>
</div>
{/* Item Details Modal - Luxury Boutique Style */}
{selectedItem && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay mais suave e claro */}
    <div 
      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
      onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
    />

    <div className="relative w-full max-w-2xl bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]">
      
      {/* Botão de Fechar (Estilo Light) */}
      <button 
        onClick={() => { setSelectedItem(null); setCurrentImgIndex(0); }} 
        className="absolute top-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-lg backdrop-blur-md transition-all border border-gray-100 group"
      >
        <X className="text-gray-500 group-hover:text-[#1eb2a6]" size={18} />
      </button>

      {/* Hero Image / Carousel Section */}
      <div className="relative h-[300px] w-full overflow-hidden shrink-0 group">
        {(() => {
          const itemImages = selectedItem.images && Array.isArray(selectedItem.images) && selectedItem.images.length > 0
            ? selectedItem.images 
            : selectedItem.image ? [selectedItem.image] : [];

          if (itemImages.length > 0) {
            return (
              <>
                <img 
                  src={getImageUrl(itemImages[currentImgIndex])} 
                  className="w-full h-full object-cover" 
                  alt={selectedItem.name} 
                />
                
                {itemImages.length > 1 && (
                  <>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setCurrentImgIndex(prev => (prev === 0 ? itemImages.length - 1 : prev - 1))}
                        className="p-2 rounded-full bg-white/90 text-gray-800 shadow-md hover:bg-[#1eb2a6] hover:text-white transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setCurrentImgIndex(prev => (prev === itemImages.length - 1 ? 0 : prev + 1))}
                        className="p-2 rounded-full bg-white/90 text-gray-800 shadow-md hover:bg-[#1eb2a6] hover:text-white transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                      {itemImages.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-1.5 rounded-full transition-all ${idx === currentImgIndex ? 'w-8 bg-[#1eb2a6]' : 'w-2 bg-white/60'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            );
          }
          return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><ImageOff size={48} /></div>;
        })()}
      </div>

      {/* Conteúdo (Luz e Tipografia) */}
      <div className="px-10 pb-10 pt-8 relative z-10 flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="inline-block px-3 py-1 rounded-md bg-[#1eb2a6]/10 text-[#1eb2a6] text-[10px] font-bold uppercase tracking-widest mb-4">
          {selectedItem.type || activeCatalog}
        </div>
        
        <h3 className="text-3xl font-bold text-gray-800 mb-4 leading-tight">{selectedItem.name}</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">{selectedItem.description}</p>

        {/* ÁREA DINÂMICA (Estilo de Listas Corporativas) */}
        <div className="space-y-6">
          
          {/* Combo / Included Items */}
          {selectedItem.includedItems?.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">Detalhes e Benefícios:</h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedItem.includedItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle size={18} className="text-[#1eb2a6] shrink-0" />
                    <span>{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Limits */}
          {selectedItem.includedLimits?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedItem.includedLimits.map((l, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">{l.description}</span>
                  <span className="text-lg font-bold text-gray-800">{l.maxValue} {l.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer (Barra de Ação Clara) */}
      <div className="px-10 py-6 bg-slate-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor do Investimento</span>
          <div className="text-2xl font-bold text-gray-800">
            {getItemPrice(selectedItem).toLocaleString()} <span className="text-sm font-medium text-[#1eb2a6]">{currency}</span>
          </div>
        </div>
        
        <button 
          onClick={() => { addToCart(selectedItem, activeCatalog); setSelectedItem(null); }} 
          className="bg-[#1a2b3c] hover:bg-[#1eb2a6] text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
        >
          Solicitar agora
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  </div>
)}
 {/* agora três secções sequenciais com colapso */}
  <div className="space-y-12">
  {/* — Seção de Produtos Estilo Marketplace — */}
{filteredProducts.length > 0 && (
  <section className="py-24 bg-slate-50 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      <div className="mb-20">
        <span className="text-[#1eb2a6] font-black uppercase tracking-[0.3em] text-[10px]">Catálogo Clínico</span>
        <h2 className="text-4xl md:text-5xl font-bold text-[#1a2b3c] tracking-tight mt-3">
          Produtos em <span className="text-[#1eb2a6]">Destaque</span>
        </h2>
        <div className="w-20 h-1 bg-[#1eb2a6] mt-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 3)).map((item, index) => {
          const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.image;
          const imageUrl = getImageUrl(firstImage || '');
          const isHighlighted = !showAllProducts && index === 1;

          return (
            <div
              key={item._id}
              onClick={() => openItem(item, 'products')}
              className={`group relative rounded-[1rem] p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer min-h-[480px] border border-gray-200 
                ${isHighlighted 
                  ? 'bg-[#1a2b3c] shadow-2xl text-white' 
                  : 'bg-white hover:border-[#1eb2a6] hover:shadow-lg'}`}
            >
              {/* Detalhe de precisão lateral */}
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${isHighlighted ? 'bg-[#1eb2a6]' : 'bg-transparent group-hover:bg-[#1eb2a6]/20'}`} />

              <div>
                <span className={`text-[9px] font-black uppercase tracking-[0.25em] mb-4 block ${isHighlighted ? 'text-[#1eb2a6]' : 'text-[#1eb2a6]'}`}>
                  {item.category || 'Clinical Solution'}
                </span>
                <h3 className={`text-xl font-bold mb-3 leading-tight tracking-tight ${isHighlighted ? 'text-white' : 'text-[#1a2b3c]'}`}>
                  {item.name}
                </h3>
                <p className={`text-sm leading-relaxed ${isHighlighted ? 'text-gray-300' : 'text-gray-500'}`}>
                  {item.description || "Precisão tecnológica aplicada ao diagnóstico e tratamento."}
                </p>
              </div>

              {/* Área da Imagem: Visual Técnico e Limpo */}
              <div className="relative mt-8 h-56 w-full rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-6 border border-gray-100">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                  />
                ) : (
                  <Package className="text-gray-300" size={48} strokeWidth={1} />
                )}
                
                {/* Botão de navegação estilo "Instrumento" */}
                <div className={`absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border border-gray-200
                  ${isHighlighted ? 'bg-[#1a2b3c] text-white border-white/10' : 'bg-white text-[#1a2b3c] hover:bg-[#1eb2a6] hover:text-white hover:border-transparent'}`}>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão "Ver mais" em estilo sóbrio */}
      {filteredProducts.length > 3 && (
        <div className="mt-20 flex justify-center">
          <button 
            onClick={() => setShowAllProducts(prev => !prev)}
            className="flex items-center gap-3 px-10 py-4 border border-[#1a2b3c] rounded-none text-[#1a2b3c] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#1a2b3c] hover:text-white transition-all"
          >
            {showAllProducts ? 'Mostrar menos' : 'Visualizar todo catálogo'}
            <ChevronDown className={`w-3 h-3 transition-transform duration-500 ${showAllProducts ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </div>
  </section>
)}

 {/* — Seção de Serviços Estilo Banner E-commerce — */}
{filteredServices.length > 0 && (
  <section className="py-32 bg-[#f8fafc] relative overflow-hidden">
    {/* Efeito decorativo sutil (substituindo o brilho azul escuro) */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1eb2a6]/20 to-transparent" />

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      
      {/* Cabeçalho da seção: Alinhado com a estética do Hero */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
        <div>
          <span className="text-[#1eb2a6] font-bold uppercase tracking-[0.3em] text-[10px] block mb-3">Nossas Especialidades</span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1a2b3c] tracking-tight">
            Nossos <span className="text-[#1eb2a6]">Serviços</span>
          </h2>
        </div>
        <p className="text-gray-500 text-sm max-w-sm leading-relaxed border-l-2 border-[#1eb2a6]/20 pl-6">
          Soluções humanizadas e tecnologia de ponta para garantir o melhor cuidado no conforto do seu lar.
        </p>
      </div>

      {/* Grid de Serviços: Cards Brancos com Cantos Arredondados (como na imagem) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredServices.slice(0, visibleServices).map(item => (
          <div
            key={item._id}
            onClick={() => openItem(item, 'services')}
            className="group relative bg-white border border-gray-100 rounded-[2rem] overflow-hidden aspect-[4/5] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] cursor-pointer"
          >
            {/* Imagem de Capa com Overlay Claro */}
            <div className="absolute inset-0 z-0">
              {item.images?.length > 0 ? (
                <img 
                  src={getImageUrl(item.images[0])} 
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-slate-100" />
              )}
              {/* Overlay: Do branco sólido para o transparente (contrário do dark mode) */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
            </div>

            {/* Conteúdo do Card */}
            <div className="relative z-10 h-full p-8 flex flex-col justify-between">
              
              {/* Botão de Ação Redondo (estilo o card da imagem) */}
              <div className="self-end w-12 h-12 rounded-full bg-[#1a2b3c] text-white flex items-center justify-center group-hover:bg-[#1eb2a6] transition-all duration-300 shadow-lg">
                <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>

              {/* Texto Inferior: Cores escuras para contraste */}
              <div>
                <h3 className="text-2xl font-bold text-[#1a2b3c] mb-3 tracking-tight group-hover:text-[#1eb2a6] transition-colors">
                  {item.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2">
                  {item.description || "Cuidados especializados focados no bem-estar e na recuperação rápida do paciente."}
                </p>
                
                <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-[#1a2b3c] opacity-60 group-hover:opacity-100 transition-all">
                  Saiba Mais <ArrowRight className="ml-2 w-3 h-3 text-[#1eb2a6]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Carregar Mais: Estilo Minimalista */}
      {visibleServices < filteredServices.length && (
        <div className="mt-24 flex justify-center">
          <button 
            onClick={() => setVisibleServices(prev => prev + 3)}
            className="group relative flex items-center gap-4 px-10 py-5 bg-white border border-gray-200 rounded-full text-[#1a2b3c] text-xs font-bold uppercase tracking-widest hover:border-[#1eb2a6] hover:text-[#1eb2a6] transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            Ver todos os serviços
            <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  </section>
)}

{/* ── Seção 1: Combos (Pacotes Especiais / Ofertas) ── */}
{/* ── Seção 1: Combos (Glassmorphism Style) ── */}
{filteredBundles.some(b => b.type === 'Combo') && (
  <section className="py-24 bg-white relative overflow-hidden">
    {/* Fundo decorativo sutil - trocando o brilho neon por um círculo suave */}
    <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#1eb2a6]/5 blur-[100px] rounded-full -translate-x-1/2" />
    
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="mb-16 flex flex-col gap-2">
        <span className="text-[#1eb2a6] font-bold uppercase tracking-[0.2em] text-[10px]">Melhor Custo-Benefício</span>
        <h2 className="text-4xl md:text-5xl font-bold text-[#1a2b3c] tracking-tight">
          Pacotes <span className="text-[#1eb2a6] italic">Especiais</span>
        </h2>
      </div>

      {/* Carrossel Horizontal Snap */}
      <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide snap-x perspective-1000">
        {filteredBundles
          .filter(item => item.type === 'Combo')
          .map(item => {
            const image = getImageUrl(item.image || '');
            
            return (
              <div
                key={item._id}
                onClick={() => openItem(item, 'bundles')}
                className="group relative bg-[#f8fafc] border border-gray-100 rounded-[2.5rem] p-8 min-w-[320px] md:min-w-[480px] snap-center transition-all duration-500 hover:bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-2 cursor-pointer"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Container da Imagem com bordas arredondadas e sombra leve */}
                  <div className="w-full md:w-1/3 aspect-square rounded-[1.5rem] overflow-hidden bg-slate-200 shrink-0 shadow-inner">
                    <img 
                      src={image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  </div>

                  {/* Conteúdo Informativo */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-[#1eb2a6] uppercase tracking-[0.15em] bg-[#1eb2a6]/10 px-3 py-1 rounded-full">
                          Combo Ativo
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-[#1a2b3c] mb-3 group-hover:text-[#1eb2a6] transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                        {item.description || "A união perfeita de serviços para garantir cuidado integral e economia."}
                      </p>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-between">
                      <div className="flex items-center text-xs font-bold text-[#1a2b3c] uppercase tracking-widest group-hover:text-[#1eb2a6] transition-all">
                        Ver Detalhes 
                        <div className="ml-3 w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:bg-[#1eb2a6] group-hover:text-white transition-all">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge de Destaque Sutil no Hover */}
                <div className="absolute top-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="text-[9px] font-bold text-gray-400">ID: {item._id.slice(-4)}</div>
                </div>
              </div>
            );
          })}
      </div>
      
      {/* Indicador visual de que há mais conteúdo pro lado */}
      <div className="flex justify-start gap-2 mt-4 ml-2">
        <div className="w-8 h-1 bg-[#1eb2a6] rounded-full" />
        <div className="w-2 h-1 bg-gray-200 rounded-full" />
        <div className="w-2 h-1 bg-gray-200 rounded-full" />
      </div>
    </div>
  </section>
)}

{/* ── Seção 2: Subscrições / Planos ── */}
{filteredBundles.some(b => b.type === 'Subscription') && (
  <section className="py-32 bg-[#f8fafc] relative overflow-hidden">
    {/* Decorative Soft Background */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-[#1eb2a6]/5 blur-[120px] rounded-full" />

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="text-center mb-20">
        <span className="text-[#1eb2a6] font-bold uppercase tracking-[0.3em] text-[10px] block mb-4">Planos e Assinaturas</span>
        <h2 className="text-5xl font-bold text-[#1a2b3c] tracking-tight mb-8">Escolha o seu plano</h2>
        
        {/* Toggle UI (Estilo Clean) */}
        <div className="inline-flex items-center gap-2 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
          <button className="px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#1a2b3c] transition-all">
            Mensal
          </button>
          <button className="px-6 py-2 bg-[#1a2b3c] rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
            Anual <span className="text-[#1eb2a6] ml-1">-20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {filteredBundles.filter(item => item.type === 'Subscription').map(plan => {
          const isPopular = plan.name.toLowerCase().includes('profis') || plan.name.toLowerCase().includes('premium');

          return (
            <div 
              key={plan._id} 
              className={`relative p-10 rounded-[2.5rem] border transition-all duration-500 flex flex-col h-full
                ${isPopular 
                  ? 'bg-white border-[#1eb2a6] shadow-[0_40px_80px_-20px_rgba(30,178,166,0.15)] scale-105 z-20' 
                  : 'bg-white/60 border-gray-100 hover:bg-white hover:shadow-xl z-10'}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#1eb2a6] text-[9px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full text-white shadow-lg">
                  Mais Recomendado
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#1a2b3c] mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed h-10">{plan.description}</p>
              </div>
              
              <div className="mb-10 flex items-baseline gap-1">
                <span className="text-4xl font-black text-[#1a2b3c] tracking-tighter">
                  {plan.price === 0 ? 'Grátis' : `${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-lg font-bold text-[#1eb2a6] uppercase ml-1">MT</span>
                )}
                <span className="text-gray-400 text-sm font-medium ml-2">/período</span>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">O que está incluso:</p>
                {plan.includedLimits?.map((limit, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-[#1eb2a6]/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-[#1eb2a6]" strokeWidth={3} />
                    </div>
                    {limit.description}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 mt-auto">
                <button 
                  onClick={() => { addToCart(plan, 'bundles'); }} 
                  className={`w-full py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95
                    ${isPopular 
                      ? 'bg-[#1a2b3c] text-white shadow-xl hover:bg-[#1eb2a6]' 
                      : 'bg-slate-50 text-[#1a2b3c] border border-slate-100 hover:bg-slate-100'}`}
                >
                  {plan.price === 0 ? 'Começar Grátis' : 'Ativar Plano'}
                </button>
                
                <button 
                  onClick={() => openItem(plan, 'bundles')}
                  className="w-full py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#1a2b3c] transition-colors"
                >
                  Ver todos os detalhes
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
{/* CART DRAWER – Digitaz E-commerce Version */}
{/* CART DRAWER – Digitaz Glassmorphic Version */}
<div className={`fixed inset-0 z-[100] pointer-events-none ${isCartOpen ? 'pointer-events-auto' : ''}`}>
  {/* Overlay Suave (Claro e elegante) */}
  <div
    className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsCartOpen(false)}
  />

  <div
    className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white/95 backdrop-blur-2xl border-l border-gray-100 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col transform transition-transform duration-500 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
  >
    {/* Header: Estilo Corporativo Clean */}
    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-[#1a2b3c] tracking-tight">Seu <span className="text-[#1eb2a6]">Carrinho</span></h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
          {cart.length} Itens selecionados
        </span>
      </div>
      <button 
        onClick={() => setIsCartOpen(false)} 
        className="p-3 text-gray-400 hover:text-[#1a2b3c] hover:bg-gray-50 rounded-full transition-all"
      >
        <X size={20} />
      </button>
    </div>

    {/* Conteúdo scrollable */}
    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
      
      {/* Listagem de Itens */}
      <section>
        {cart.length > 0 ? (
          <div className="space-y-4">
            {cart.map(cartItem => (
              <div key={cartItem.itemId} className="group flex gap-4 p-4 rounded-[1.5rem] bg-slate-50 border border-transparent hover:border-gray-200 transition-all">
                {cartItem.image && (
                  <div className="relative w-16 h-16 overflow-hidden rounded-xl bg-white shrink-0 border border-gray-100 flex items-center justify-center p-2 shadow-sm">
                    <img src={getImageUrl(cartItem.image)} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm text-[#1a2b3c] line-clamp-1 leading-tight tracking-tight">{cartItem.name}</p>
                    <button onClick={() => removeFromCart(cartItem.itemId)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-bold text-[#1eb2a6]">
                      {(cartItem.price * cartItem.quantity).toLocaleString()} <span className="text-[9px] opacity-60 uppercase">{currency}</span>
                    </p>

                    {/* Seletor de Qtd Light */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-1 h-7 shadow-sm">
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="p-1 text-gray-400 hover:text-[#1a2b3c]"><Minus size={10} strokeWidth={3} /></button>
                      <span className="px-2 text-[11px] font-bold text-[#1a2b3c] min-w-[20px] text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="p-1 text-gray-400 hover:text-[#1a2b3c]"><Plus size={10} strokeWidth={3} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                <ShoppingCart size={24} className="text-gray-200" />
            </div>
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] leading-relaxed">Carrinho <br /> Vazio</p>
            <button onClick={() => setIsCartOpen(false)} className="mt-6 text-[#1eb2a6] font-bold text-[10px] uppercase tracking-widest hover:underline">Voltar à loja</button>
          </div>
        )}
      </section>

      {/* Checkout Form - Estilo Light */}
      {cart.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Dados para Atendimento/Entrega</h3>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Nome Completo" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm text-[#1a2b3c] placeholder:text-gray-300 focus:border-[#1eb2a6] focus:bg-white outline-none transition-all" />
              <input placeholder="E-mail" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm text-[#1a2b3c] placeholder:text-gray-300 focus:border-[#1eb2a6] focus:bg-white outline-none transition-all" />
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm text-[#1a2b3c] outline-none focus:border-[#1eb2a6] focus:bg-white transition-all" />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>

    {/* Footer: Resumo Claro e Focado */}
    {cart.length > 0 && (
      <div className="bg-white border-t border-gray-100 p-8 space-y-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-gray-400 uppercase tracking-widest">
            <span>Subtotal</span>
            <span className="text-[#1a2b3c]">{totals.subtotal.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-50">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Total Final</span>
            <span className="text-3xl font-black text-[#1a2b3c] tracking-tighter">
              {totals.grandTotal.toLocaleString()} <span className="text-xs text-[#1eb2a6] font-bold ml-1">{currency}</span>
            </span>
          </div>
        </div>

        {/* Métodos de Pagamento Clean */}
        <div className="grid grid-cols-2 gap-2">
            {['mpesa', 'visa', 'cash', 'transfer'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setPaymentMethod(m as any); setMobileMoneyPhone(''); }}
                className={`py-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${paymentMethod === m ? 'border-[#1eb2a6] bg-[#1eb2a6]/10 text-[#1eb2a6]' : 'border-gray-100 bg-slate-50 text-gray-400 hover:border-gray-200'}`}
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
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1eb2a6] transition-colors"
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
            disabled={!paymentMethod || paymentMethod === 'none' || paymentMethod === 'transfer' || paymentMethod === 'cash' || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
            className="w-full py-5 bg-[#1a2b3c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-[#1eb2a6] transition-all shadow-lg disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Pagar Online agora
          </button>

           <button
              onClick={handleSubmit}
              disabled={submitting || !client.name || !client.email || !paymentMethod}
              className="w-full py-5 bg-white border-2 border-[#1a2b3c] text-[#1a2b3c] text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-slate-50 disabled:opacity-30"
            >
              {paymentMethod === 'transfer' ? 'Confirmar Envio de Comprovante' : 'Finalizar e Reservar'}
            </button>
          
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck size={12} className="text-[#1eb2a6]" />
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
              Ambiente 100% Seguro
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

{/* Success Modal - Estilo E-commerce Clean (Digitaz) */}
{showSuccessModal && (
  <div 
    className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#0a0a0c]/90 backdrop-blur-xl" 
    onClick={closeSuccessModal}
  >
    <div
      className="bg-[#121212] rounded-[3rem] shadow-[0_0_100px_-20px_rgba(59,130,246,0.3)] max-w-md w-full p-10 md:p-14 text-center relative overflow-hidden border border-white/10"
      onClick={e => e.stopPropagation()}
    >
      {/* Elemento Decorativo: Gradiente de Sucesso no Fundo */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        {/* Ícone de Sucesso com Glow */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-8 shadow-[0_0_30px_rgba(37,99,235,0.5)] animate-bounce-short">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>

        <div className="space-y-4 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
            Pedido Confirmado
          </span>
          
          <h2 className="text-4xl font-light text-white leading-tight tracking-tighter">
            Muito <br /> <span className="text-blue-500 font-medium">Obrigado!</span>
          </h2>
          
          <p className="text-white/40 text-sm leading-relaxed max-w-[280px] mx-auto font-light">
            Seu pedido foi processado. Verifique seu e-mail para acompanhar todos os detalhes da sua nova solução digital.
          </p>
        </div>

        {/* Botão de Ação Glassmorphic */}
        <button
          onClick={closeSuccessModal}
          className="group relative w-full py-5 bg-white text-black overflow-hidden rounded-2xl transition-all hover:bg-blue-600 hover:text-white active:scale-95 font-bold text-xs uppercase tracking-widest"
        >
          Continuar Explorando
        </button>
        
        {/* Order ID Estilizado como 'Ticket' */}
        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-3">
           <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
             Protocolo de Segurança
           </p>
           <span className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-sm font-medium text-blue-400 tracking-wider">
             #{Math.random().toString(36).substr(2, 8).toUpperCase()}
           </span>
        </div>
      </div>
    </div>
  </div>
)}
<footer className="bg-white pt-24 pb-12 overflow-hidden relative border-t border-gray-100">
  {/* Fundo sutil para separar do conteúdo acima */}
  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

  <div className="max-w-7xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
      
      {/* Coluna 1: Branding e Newsletter */}
      <div className="lg:col-span-4 space-y-8">
        <div className="flex items-center">
          {company.logo ? (
            <img src={API_BS_URL + company.logo} alt={company.name} className="h-8 w-auto grayscale opacity-80" />
          ) : (
            <span className="font-black text-2xl tracking-tighter text-[#1a2b3c] uppercase italic">
              {company.name}
            </span>
          )}
        </div>
        
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          Soluções de excelência em saúde e tecnologia. Compromisso com o bem-estar e resultados transparentes.
        </p>
        
        {/* Newsletter Clean */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a2b3c]">Receba novidades</p>
          <div className="flex p-1.5 bg-slate-50 border border-gray-200 rounded-2xl focus-within:border-[#1eb2a6] transition-all">
            <input 
              type="email" 
              placeholder="seuemail@exemplo.com" 
              className="flex-1 px-4 bg-transparent text-[#1a2b3c] text-xs outline-none placeholder:text-gray-300" 
            />
            <button className="px-6 py-2.5 bg-[#1a2b3c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#1eb2a6] transition-all">
              Assinar
            </button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Links Rápidos */}
      <div className="lg:col-span-2 space-y-6">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1eb2a6]">Institucional</h4>
        <ul className="space-y-4">
          {['Sobre Nós', 'Carreiras', 'Blog', 'Transparência'].map(link => (
            <li key={link}>
              <a href="#" className="text-sm text-gray-500 hover:text-[#1eb2a6] transition-colors tracking-wide">{link}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna 3: Atendimento */}
      <div className="lg:col-span-3 space-y-6">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1eb2a6]">Atendimento</h4>
        <ul className="space-y-6">
          <li className="flex flex-col gap-1">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Suporte</span>
            <a href={`tel:${company.phone}`} className="text-[#1a2b3c] font-bold text-lg hover:text-[#1eb2a6] transition-colors">{company.phone}</a>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">E-mail</span>
            <a href={`mailto:${company.email}`} className="text-[#1a2b3c] font-bold text-lg hover:text-[#1eb2a6] transition-colors break-all">{company.email}</a>
          </li>
        </ul>
      </div>

      {/* Coluna 4: Social */}
      <div className="lg:col-span-3 space-y-10">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1eb2a6] mb-6">Conecte-se</h4>
          <div className="flex gap-4">
            {[Instagram, Facebook, Linkedin].map((Icon, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="w-11 h-11 bg-slate-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1eb2a6] transition-all"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
           <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a2b3c]">Pagamentos</p>
           <div className="flex flex-wrap gap-2">
              {['M-Pesa', 'Visa', 'Transferência'].map(p => (
                <div key={p} className="h-8 px-4 bg-slate-50 rounded-lg border border-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase">
                  {p}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>

    {/* Bottom Bar: Minimalista */}
    <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        © 2026 {company.name}. Todos os direitos reservados.
      </p>
      
      <div className="flex gap-8">
        <a href="#" className="text-[10px] font-bold text-gray-400 hover:text-[#1a2b3c] uppercase tracking-widest">Termos</a>
        <a href="#" className="text-[10px] font-bold text-gray-400 hover:text-[#1a2b3c] uppercase tracking-widest">Privacidade</a>
      </div>

      <div className="flex items-center gap-3 px-5 py-2.5 bg-green-50 rounded-full">
         <div className="w-1.5 h-1.5 rounded-full bg-[#1eb2a6]" />
         <span className="text-[9px] font-black text-[#1eb2a6] uppercase tracking-[0.2em]">Serviços Operacionais</span>
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

export default ClinicaPortal;