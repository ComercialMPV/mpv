import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, X, ShoppingCart, Tag, Zap, Plus, Minus, 
  Trash2, CreditCard, Package, UserCheck, UserPlus, DollarSign, Star, Clock, CheckCircle2,
  Briefcase, Phone, AlertCircle, ChevronDown,
  Printer,
  LayoutGrid,
  List,
  Loader
} from 'lucide-react';
import { api, API_BASE_URL } from '../services/api';
import { CartContent } from './CartContent';
import { PendingPaymentRooms } from './PendingPaymentRooms';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '../components/Receipt';  // ajuste o caminho
import { useAuth } from '../contexts/AuthContext';
import { ConfirmationModal } from '../components/ConfirmationModal';

const SERVER_BASE_URL = import.meta.env.VITE_API_BS_URL || 'http://localhost:5000';

// Helper para transformar caminhos relativos em URLs absolutas
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${SERVER_BASE_URL}${imagePath}`;
};

interface Client {
  _id?: string;
  name: string;
  phone: string;
  balance?: number;
  currency?: string;
  [key: string]: any;
}

// CARD - Grid View (compacto)
const CatalogItemCard = ({ item, onAdd }: { item: any; onAdd: (item: any) => void }) => {
  const isBundle = 'type' in item;
  const isService = !isBundle && !('stockQuantity' in item);

  return (
    <div
      onClick={() => onAdd(item)}
      className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {isBundle && (
          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black text-white uppercase ${
            item.type === 'Subscription' ? 'bg-purple-600' : 'bg-amber-500'
          }`}>
            {item.type === 'Subscription' ? <Clock size={7} /> : <Star size={7} />}
            {item.type}
          </span>
        )}
        {isService && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black text-white uppercase bg-blue-500">
            <Briefcase size={7} /> Serviço
          </span>
        )}
      </div>

      {/* Imagem */}
      <div className="h-20 bg-gray-50 rounded-md mb-2 flex items-center justify-center overflow-hidden">
        {(item.images?.[0] || item.image) ? (
          <img
            src={getImageUrl(item.images?.[0] || item.image || '')}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
          />
        ) : (
          <Package size={20} className="text-gray-200" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1">
        <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">
          {isBundle ? 'Pacote' : (isService ? 'Mão de Obra' : item.category || 'Produto')}
        </span>
        <h4 className="font-bold text-gray-800 leading-tight line-clamp-2 text-xs mt-0.5">{item.name}</h4>
      </div>

      {/* Preço e Stock */}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between items-center">
          <p className="text-xs font-black text-gray-900">
            {(item.basePrice || item.price || item.billingPricePerCycle || 0).toLocaleString()} MT
          </p>
          <div className="p-1.5 bg-blue-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-lg">
            <Plus size={12} />
          </div>
        </div>

        {/* Stock Info */}
        {item.stockQuantity !== undefined && (
          <div className="flex justify-end text-[7px]">
            {item.stockQuantity <= 0 && !item.madeToOrder ? (
              <span className="px-1.5 py-0.5 bg-red-600 text-white font-bold rounded-full">
                SEM STOCK
              </span>
            ) : item.stockQuantity <= (item.minStockLevel || 5) ? (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white font-bold rounded-full">
                Baixo: {item.stockQuantity}
              </span>
            ) : (
              <span className="text-gray-600 text-[7px]">
                {item.stockQuantity} {item.unit || 'un'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// LISTA - List View (compacto)
const CatalogItemRow = ({ item, onAdd }: { item: any; onAdd: (item: any) => void }) => {
  const isBundle = 'type' in item;
  const isService = !isBundle && !('stockQuantity' in item);
  const hasStock = item.stockQuantity > 0 || item.madeToOrder;

  return (
    <div
      onClick={() => onAdd(item)}
      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Imagem pequena */}
      <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-md flex items-center justify-center overflow-hidden">
        {(item.images?.[0] || item.image) ? (
          <img
            src={getImageUrl(item.images?.[0] || item.image || '')}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package size={16} className="text-gray-200" />
        )}
      </div>

      {/* Informação */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
          {isBundle && (
            <span className={`text-[7px] font-black text-white px-1.5 py-0.5 rounded-full whitespace-nowrap ${
              item.type === 'Subscription' ? 'bg-purple-600' : 'bg-amber-500'
            }`}>
              {item.type}
            </span>
          )}
          {isService && (
            <span className="text-[7px] font-black text-white bg-blue-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Serviço
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.category || (isService ? 'Mão de Obra' : 'Produto')}
          {item.stockQuantity !== undefined && (
            <span className={`ml-2 ${
              item.stockQuantity <= 0 && !item.madeToOrder ? 'text-red-600 font-bold' :
              item.stockQuantity <= (item.minStockLevel || 5) ? 'text-orange-600 font-bold' :
              'text-green-600'
            }`}>
              {item.stockQuantity <= 0 && !item.madeToOrder ? 'SEM STOCK' :
               item.stockQuantity <= (item.minStockLevel || 5) ? `Stock: ${item.stockQuantity}` :
               `Stock: ${item.stockQuantity}`}
            </span>
          )}
        </p>
      </div>

      {/* Preço e botão */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs font-black text-gray-900">
            {(item.basePrice || item.price || item.billingPricePerCycle || 0).toLocaleString()} MT
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          disabled={item.stockQuantity <= 0 && !item.madeToOrder}
          className="p-2 bg-blue-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

export const Sales: React.FC = () => {
  // Tabs principais (atualmente só PDV está implementado)
  const [mainTab] = useState<'pdv'>('pdv');
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Catálogo
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrinho e venda
  const [cart, setCart] = useState<any[]>([]);
  const [saleStatus, setSaleStatus] = useState('Pago 100%');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; value: number; type: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Wallet' | 'M-Pesa' | 'E-Mola' | 'POS' | 'Transferência'>('Cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [remainingAmountPaid, setRemainingAmountPaid] = useState<number>(0);
const [company, setCompany] = useState<any>(null);
  // Cliente
  const [selectedClient, setSelectedClient] = useState<Partial<Client> | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const clientSearchInputRef = useRef<HTMLInputElement>(null);
  const quickClientNameRef = useRef<HTMLInputElement>(null);
  const quickClientPhoneRef = useRef<HTMLInputElement>(null);

  // Catálogo UI
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal abrir caixa
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [openCashFloat, setOpenCashFloat] = useState('');
  const [openCashNotes, setOpenCashNotes] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Drawer mobile
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Pending Payment Rooms
  const [showPendingRoomsDrawer, setShowPendingRoomsDrawer] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<any | null>(null);
  const [pendingRoomsCount, setPendingRoomsCount] = useState(0);

  // Dentro do componente Sales:
const receiptRef = useRef<HTMLDivElement>(null);
const [lastSale, setLastSale] = useState<any>(null);
const [showConfirmModal, setShowConfirmModal] = useState(false);
const openConfirmation = () => {
  setShowConfirmModal(true);
};
  // ────────────────────────────────────────────────
  //  CARREGAMENTO DE DADOS
  // ────────────────────────────────────────────────
const userLoggedIn = JSON.parse(localStorage.getItem('user') || '{}'); // Ou de onde vem o seu user
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, bundles, services] = await Promise.all([
          api.products.getAll(),
          api.bundles.getAll(),
          api.services.getAll(),
        ]);
        setItems([...products, ...bundles, ...services]);
      } catch (error) {
        toast.error("Erro ao carregar catálogo");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.clients.getAll({ page: 1, limit: 50, search: '', origin: 'all' });
        setClients(res.clients || []);
      } catch (err) {
        toast.error('Erro ao carregar clientes');
      }
    };
    loadClients();
  }, []);

  // Reset página ao mudar filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Manter foco no input de pesquisa de cliente
  useEffect(() => {
    if (clientSearchTerm && clientSearchInputRef.current && document.activeElement !== clientSearchInputRef.current) {
      clientSearchInputRef.current.focus();
    }
  }, [searchResults]);

  // Focar no input de nome quando o formulário de quick client abre
  useEffect(() => {
    if (showQuickClient && quickClientNameRef.current) {
      setTimeout(() => quickClientNameRef.current?.focus(), 0);
    }
  }, [showQuickClient]);

useEffect(() => {
  const loadCompany = async () => {
    try {
      const data = await api.company.getProfile();
      setCompany(data);
      console.log("✅ Empresa carregada:", data.name);
    } catch (err: any) {
      console.error("❌ Erro ao carregar dados da empresa:", err.message || err);

      // Fallback seguro se falhar
      setCompany({
        name: "Empresa não encontrada",
        address: { street: "", city: "" },
        phone: "",
        taxId: "",
        vatNumber: "",
        taxRate: 16,
        currency: "MT"
      });

      // Opcional: mostrar toast só uma vez
      if (!localStorage.getItem('companyLoadErrorShown')) {
        toast.error("Não foi possível carregar os dados da empresa. Algumas funcionalidades podem estar limitadas.");
        localStorage.setItem('companyLoadErrorShown', 'true');
      }
    }
  };

  loadCompany();
}, []);

  // ────────────────────────────────────────────────
  //  CÁLCULOS
  // ────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = new Set<string>(['Todos', 'Combos', 'Serviços']);
    items.forEach(item => {
      if (item.category && !['Serviços'].includes(item.category)) {
        cats.add(item.category);
      }
    });
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      const isBundle = 'type' in item;
      const isService = !isBundle && !('stockQuantity' in item);

      if (activeTab === 'Todos') return true;
      if (activeTab === 'Combos') return isBundle;
      if (activeTab === 'Serviços') return isService;
      return item.category === activeTab;
    });
  }, [items, activeTab, searchTerm]);

  const subtotal = useMemo(
    () => cart.reduce((acc, i) => acc + (i.basePrice || i.price || i.billingPricePerCycle || 0) * i.qty, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (!coupon) return 0;
    return coupon.type === 'Percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  }, [coupon, subtotal]);

  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  // Ajusta valor pago automaticamente conforme status
  useEffect(() => {
    if (saleStatus === 'Pago 100%') {
      setAmountPaid(total);
    } else if (saleStatus === 'Pago 50%') {
      setAmountPaid(total / 2);
    } else {
      setAmountPaid(0);
    }
  }, [saleStatus, total]);

  // Abrir drawer de rooms quando selecionam "Pendente"
  useEffect(() => {
    if (saleStatus === 'Pendente') {
      setShowPendingRoomsDrawer(true);
    }
  }, [saleStatus]);

  const walletDeduction = useMemo(() => {
    if (!useWallet || !selectedClient?.balance) return 0;
    return Math.min(selectedClient.balance, total);
  }, [useWallet, selectedClient, total]);

  // ────────────────────────────────────────────────
  //  AÇÕES DO CARRINHO
  // ────────────────────────────────────────────────

const addToCart = (item: any) => {
  // Validação de stock (mantém como está)
  if (item.stockQuantity <= 0 && !item.madeToOrder) {
    toast.error(`Produto ${item.name} sem stock disponível`);
    return;
  }

  setCart(prev => {
    const existing = prev.find(i => i._id === item._id);
    if (existing) {
      return prev.map(i => i._id === item._id ? { ...i, qty: i.qty + 1 } : i);
    }

    // Determinar itemType corretamente
    let itemType = 'Product';
    if ('type' in item) {                    // Bundle / Subscription
      itemType = item.type === 'Subscription' ? 'Subscription' : 'Combo';
    } else if (!('stockQuantity' in item)) { // Serviço
      itemType = 'Service';
    }

    return [...prev, { 
      ...item, 
      qty: 1,
      itemType,           // ← importante!
      // Garante que productId sempre existe e aponta para o documento original
      productId: item._id 
    }];
  });
};

  const decreaseQty = (id: string) => {
    setCart(prev =>
      prev
        .map(i => (i._id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter(i => i.qty > 0)
    );
  };
const { user } = useAuth();
// Replace the whole useCallback with this:
const finalizeSaleVisuals = (saleData: any) => {
  const saleId = saleData._id || saleData.id || saleData.saleId;

  const formattedItems = (saleData.items || []).map((item: any) => ({
    name: item.name || 'Item sem nome',
    qty: Number(item.quantity || item.qty || 1),
    priceAtSale: Number(item.priceAtSale || item.price || item.basePrice || item.billingPricePerCycle || 0),
    discount: Number(item.discount || 0),
    unit: item.unit || 'unid',
    category: item.category || '',
    orderPrice: Number(item.orderPrice || 0),
    deliveryDays: Number(item.deliveryDays || 0),
    itemType: item.itemType || 'Product'
  }));

  setLastSale({
    ...saleData,
    _id: saleId,
    items: formattedItems,
    subtotal: Number(saleData.subtotal || saleData.total || 0),
    discount: Number(saleData.discount || 0),
    taxRate: Number(saleData.taxRate || 16),
    notes: saleData.notes || '',
  });

  setShowSuccessModal(true);
  setShowConfirmModal(false);

  toast.success(`Venda #${String(saleId).slice(-6)} registada com sucesso!`);

  // Reset everything
  setCart([]);
  setSelectedClient(null);
  setUseWallet(false);
  setQuickClientName('');
  setQuickClientPhone('');
  setClientSearchTerm('');
  setShowQuickClient(false);
  setDueDate('');
  setAmountPaid(0);
  setRemainingAmountPaid(0);
};
// Replace your current handleCheckout with this clean version
const handleCheckout = async () => {
  console.log("🚀 STEP 1: Iniciando Checkout Completo");

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    toast.error('Carrinho vazio ou inválido.');
    return;
  }

  try {
    console.log("🚀 STEP 2: Payload montado...");

    let finalCustomer = {
      id: selectedClient?._id || null,
      name: selectedClient?.name?.trim() || "Consumidor Final",
      phone: selectedClient?.phone?.trim() || "",
    };

    if (showQuickClient && quickClientName.trim()) {
      finalCustomer = {
        id: null,
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
      };
    }

    const payload = {
      items: cart.map(item => ({
        productId: item._id,
        name: item.name,
        quantity: item.qty || 1,
        priceAtSale: item.price || item.basePrice || item.billingPricePerCycle || 0,

        itemType: item.itemType || 'Product',
        discount: item.discount || 0,
        unit: item.unit || 'unid',
      })),
      total: Number(total) || 0,
      paymentMethod: useWallet ? 'Wallet' : paymentMethod,
      status: saleStatus,
      customer: finalCustomer,
      amountPaid: Number(amountPaid || 0),
      dueDate: dueDate || null,
      walletDeduction: useWallet ? Number(walletDeduction || 0) : 0,
      discount: 0,
      notes: ""
    };

    console.log("🚀 STEP 2.5: Payload enviado →", payload);

    // === DIRECT FETCH WITH TIMEOUT (bypasses complex interceptor for now) ===
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12 seconds

    const token = localStorage.getItem('accessToken');

    const res = await fetch(`${API_BASE_URL}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log("🚀 STEP 3: Resposta HTTP recebida → Status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Erro do servidor:", errorText);
      throw new Error(`HTTP ${res.status} - ${errorText || 'Erro desconhecido'}`);
    }

    const apiResponse = await res.json();
    console.log("🚀 STEP 4: JSON recebido →", apiResponse);

    let createdSale = apiResponse?.sale || apiResponse?.data || apiResponse;

    if (!createdSale || typeof createdSale !== 'object') {
      throw new Error('Servidor não retornou dados da venda');
    }

    const saleId = createdSale._id || createdSale.id || createdSale.saleId;
    if (!saleId) throw new Error('ID da venda não retornado');

    finalizeSaleVisuals({ ...createdSale, _id: saleId });

  } catch (err: any) {
    console.error('❌ ERRO FINAL NO CHECKOUT:', err);

    if (err.name === 'AbortError') {
      toast.error('A requisição demorou demasiado (timeout). Servidor lento ou caído?');
    } else {
      toast.error(err.message || 'Falha ao registar venda');
    }
    throw err;
  }
};


const handleRoomClosed = useCallback(async (closedRoom: any, saleFromRoom?: any) => {
  // saleFromRoom virá da resposta da API de closeRoom
  if (!saleFromRoom) {
    toast.success(`Room ${closedRoom.ticketCode} fechado com sucesso`);
    return;
  }

  // Formata os itens da mesma forma que fazes no handleCheckout
  const formattedItems = (saleFromRoom.items || []).map((item: any) => ({
    name: item.name || 'Item sem nome',
    qty: Number(item.quantity || item.qty || 1),
    priceAtSale: Number(item.priceAtSale || item.price || 0),
    discount: Number(item.discount || 0),
    unit: item.unit || 'unid',
    category: item.category || '',
  }));

  setLastSale({
    ...saleFromRoom,
    items: formattedItems,
    subtotal: Number(saleFromRoom.subtotal || saleFromRoom.total || 0),
    discount: Number(saleFromRoom.discount || 0),
    taxRate: Number(saleFromRoom.taxRate || 16),
    _id: saleFromRoom._id,
  });

  setShowSuccessModal(true);   // ← Aqui abre o modal de sucesso/impressão
}, []);


const handlePrint = useReactToPrint({
  content: () => receiptRef.current,
  
  pageStyle: `
    @media print {
      body { font-family: 'Courier New', Courier, monospace !important; }
      .receipt-content { 
        width: 80mm !important; 
        padding: 10px !important; 
        display: block !important;
      }
      /* Forçar o Tailwind a imprimir cores */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `,
  copyStyles: false,
  onAfterPrint: () => setLastSale(null),
  removeAfterPrint: true, // Crucial para evitar o erro de TrustedScript em impressões seguidas
});




  // ────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────

  // props object to share among CartContent instances
const cartProps = {
  cart,
  saleStatus,
  setSaleStatus,
  selectedClient,
  setSelectedClient,
  clientSearchTerm,
  setClientSearchTerm,
  searchResults,
  setSearchResults,
  clients,
  setClients,
  showQuickClient,
  setShowQuickClient,
  quickClientName,
  setQuickClientName,
  quickClientPhone,
  setQuickClientPhone,
  useWallet,
  setUseWallet,
  remainingAmountPaid,
  setRemainingAmountPaid,
  amountPaid,
  setAmountPaid,
  dueDate,
  setDueDate,
  customerPhone,
  setCustomerPhone,
  paymentMethod,
  setPaymentMethod,
  subtotal,
  total,
  handleCheckout,
  decreaseQty,
  addToCart,
  quickClientNameRef,
  quickClientPhoneRef,
  clientSearchInputRef,
  setCart,
  onOpenRooms: () => setShowPendingRoomsDrawer(true),
  openRoomCount: pendingRoomsCount,
  // NOVAS PROPS:
  showConfirmModal,           // ← adicionado
  setShowConfirmModal,        // ← adicionado
};

  return (
    <div className="flex h-screen bg-[#F8FAFC] p-2 gap-6 overflow-hidden flex-col">
   

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {mainTab === 'pdv' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden h-full">
            {/* Área esquerda - Catálogo */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto lg:overflow-hidden">
              {/* Barra de pesquisa + ações */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-4xl mx-auto px-1">
                <div className="relative w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="O que procura hoje?"
                    className="w-full pl-14 pr-6 py-3 md:py-4 bg-white rounded-[24px] shadow-sm outline-none text-sm focus:ring-2 focus:ring-blue-500 transition"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

               {/* Botões de Ação – adaptados para mobile */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                    {/* Botão Abrir Caixa – só em desktop */}
                    <button
                      onClick={() => setIsOpenCashModalOpen(true)}
                      className="hidden md:flex items-center justify-center whitespace-nowrap px-6 py-3 bg-green-600 text-white rounded-[24px] text-sm font-medium hover:bg-green-700 transition shadow-sm min-w-[160px]"
                    >
                      <DollarSign className="mr-2" size={18} />
                      Abrir Caixa
                    </button>

                    {/* Botão Carrinho normal – só em desktop */}
                    <button
                      onClick={() => setIsCartDrawerOpen(true)}
                      className="hidden md:flex items-center justify-center whitespace-nowrap px-6 py-3 bg-blue-600 text-white rounded-[24px] text-sm font-medium hover:bg-blue-700 transition shadow-sm min-w-[160px] relative"
                    >
                      <ShoppingCart className="mr-2" size={18} />
                      Carrinho
                      {cart?.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                          {cart.length}
                        </span>
                      )}
                    </button>
 {/* Toggle View Mode */}
                  <div className="flex gap-1 bg-white rounded-[24px] p-1 shadow-sm border border-gray-100">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2.5 rounded-lg transition ${
                        viewMode === 'grid'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="Visualização em Grid"
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2.5 rounded-lg transition ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="Visualização em Lista"
                    >
                      <List size={18} />
                    </button>
                  </div>
                    {/* FAB Carrinho – só em mobile/tablet */}
                    <div className="md:hidden fixed bottom-6 right-6 z-50">
                      <button
                        onClick={() => setIsCartDrawerOpen(true)}
                        className="relative flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 active:scale-95 transition-all duration-200"
                      >
                        <ShoppingCart size={28} />
                        {cart?.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 shadow-lg border-2 border-white">
                            {cart.length > 99 ? '99+' : cart.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
              </div>

              {/* Tabs de categorias (desktop) */}
              <div className="hidden lg:flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                {categories.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Grade de produtos */}
             {/* Grade/Lista de produtos */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[400px]">
                {loading ? (
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-pulse"
                    : "space-y-2 animate-pulse"
                  }>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className={viewMode === 'grid' ? "h-48 bg-gray-200 rounded-md" : "h-16 bg-gray-200 rounded-lg"} />
                    ))}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <>
                    {/* GRID VIEW */}
                    {viewMode === 'grid' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredItems
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map(item => (
                            <CatalogItemCard key={item._id} item={item} onAdd={addToCart} />
                          ))}
                      </div>
                    )}

                    {/* LIST VIEW */}
                    {viewMode === 'list' && (
                      <div className="space-y-2">
                        {filteredItems
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map(item => (
                            <CatalogItemRow key={item._id} item={item} onAdd={addToCart} />
                          ))}
                      </div>
                    )}


                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pb-8">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50 font-bold text-sm"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-gray-600 font-medium order-first sm:order-none">
                        Página {currentPage} de {Math.ceil(filteredItems.length / itemsPerPage) || 1}
                      </span>
                      <button
                        disabled={currentPage >= Math.ceil(filteredItems.length / itemsPerPage)}
                        onClick={() =>
                          setCurrentPage(p =>
                            Math.min(Math.ceil(filteredItems.length / itemsPerPage), p + 1)
                          )
                        }
                        className="w-full sm:w-auto px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50 font-bold text-sm"
                      >
                        Próxima
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 md:p-12 bg-white rounded-md border-2 border-dashed border-gray-100">
                    <div className="p-6 bg-gray-50 rounded-full mb-4">
                      {activeTab === 'Combos' ? (
                        <Zap size={48} className="text-amber-400" />
                      ) : (
                        <AlertCircle size={48} className="text-gray-300" />
                      )}
                    </div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                      {activeTab === 'Combos' ? 'Nenhum Combo Criado' : 'Sem resultados encontrados'}
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs mt-2 font-medium">
                      {activeTab === 'Combos'
                        ? 'Não foram encontrados combos ativos. Crie um novo combo na secção de Inventário.'
                        : `Não encontramos nada para "${searchTerm}" na categoria ${activeTab}.`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Carrinho - desktop sidebar */}
            <aside className="hidden lg:flex w-full lg:w-[400px] xl:w-[420px] flex-col gap-4 lg:h-full mt-6 lg:mt-0">
              <CartContent {...cartProps} />
            </aside>

            {/* Drawer mobile */}
            {isCartDrawerOpen && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div
                  className="absolute inset-0 bg-black opacity-50"
                  onClick={() => setIsCartDrawerOpen(false)}
                />
                <div className="relative ml-auto w-full max-w-xs h-full bg-white shadow-lg flex flex-col">
                  <div className="p-4 flex justify-between items-center border-b border-gray-100">
                    <h3 className="font-black text-gray-900 uppercase">Carrinho</h3>
                    <button onClick={() => setIsCartDrawerOpen(false)} className="p-1">
                      <X className="text-gray-600" />
                    </button>
                  </div>
                  <CartContent {...cartProps} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Abrir Caixa */}
      {isOpenCashModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Abrir Caixa</h2>
                <button
                  onClick={() => {
                    setIsOpenCashModalOpen(false);
                    setOpenCashFloat('');
                    setOpenCashNotes('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase px-1">Fundo Inicial (MT)</label>
                  <input
                    type="number"
                    value={openCashFloat}
                    onChange={e => setOpenCashFloat(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase px-1">Notas (opcional)</label>
                  <textarea
                    value={openCashNotes}
                    onChange={e => setOpenCashNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                    placeholder="Ex: Caixa aberto para turno da manhã"
                  />
                </div>
              </div>

                         <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await api.cashClosures.openRequest(Number(openCashFloat) || 0, openCashNotes);
                    toast.success('Solicitação de abertura enviada');
                    setIsOpenCashModalOpen(false);
                    setOpenCashFloat('');
                    setOpenCashNotes('');
                  } catch (err: any) {
                    toast.error(err.message || 'Falha ao enviar solicitação');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-black text-xs text-white uppercase shadow-xl transition flex items-center justify-center gap-2
                  ${loading
                    ? 'bg-green-400 cursor-not-allowed opacity-70'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'}
                `}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Carregando…
                  </>
                ) : (
                  'Solicitar Abertura'
                )}
              </button>
            </div>
          </div>
        </div>
        
      )}

{lastSale && (
  <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
    <div ref={receiptRef}>
      <Receipt
        sale={lastSale}
        company={{
          name: company?.name || "A carregar...",
          address: company?.address
            ? `${company.address.street || ''}, ${company.address.city || ''}`
            : "---",
          phone: company?.phone || "---",
          taxId: company?.taxId || company?.vatNumber || "---",
          slogan: company?.slogan || ""
        }}
        items={lastSale.items || []}
        subtotal={lastSale.subtotal || lastSale.total || 0}
        discount={lastSale.discount || 0}
        total={lastSale.total || 0}
        taxRate={company?.taxRate || lastSale.taxRate || 16}
        amountPaid={lastSale.amountPaid || 0}
        paymentMethod={lastSale.paymentMethod || "N/A"}
        saleStatus={lastSale.status || "N/A"}
        dueDate={lastSale.dueDate}
        customerName={
          lastSale.customer?.name ||
          lastSale.customerName ||
          "Consumidor Final"
        }
        customerPhone={lastSale.customer?.phone || ""}
        notes={lastSale.notes || ""}
        // Sempre passar STRING aqui
        createdBy={
          lastSale.createdBy?.firstName
            ? `${lastSale.createdBy.firstName} ${lastSale.createdBy.lastName || ''}`.trim()
            : lastSale.createdBy || "Sistema"
        }
      />
    </div>
  </div>
)}

      {/* Pending Payment Rooms Drawer */}
      <PendingPaymentRooms
        showDrawer={showPendingRoomsDrawer}
        onCloseDrawer={() => setShowPendingRoomsDrawer(false)}
        onRoomUpdated={(room) => setCurrentRoom(room)}
       onRoomClosed={handleRoomClosed}
        onCountChange={(count) => setPendingRoomsCount(count)}
      />
      {/* Modal de Sucesso / Pergunta de Impressão */}
{showSuccessModal && (
  <div key="success-modal" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Venda Finalizada!</h3>
        <p className="text-gray-500 mt-2">Deseja imprimir o recibo desta venda?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => {
            setShowSuccessModal(false);
            // Função para limpar os estados (Reset)
            setCart([]);
            setLastSale(null);
            setSelectedClient(null);
          }}
          className="py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
        >
          Não, Sair
        </button>
        <button
          onClick={async () => {
            await handlePrint(); // Dispara a impressão
            setShowSuccessModal(false);
            // Limpa tudo após imprimir
            setCart([]);
            setSelectedClient(null);
          }}
          className="py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>
    </div>
  </div>
)}
<ConfirmationModal
  showConfirmModal={showConfirmModal}
  setShowConfirmModal={setShowConfirmModal}
  saleStatus={saleStatus}
  total={total}
  useWallet={useWallet}
  actualWalletDeduction={walletDeduction}   // usa o memoizado do Sales
  amountPaid={amountPaid}
  handleCheckout={handleCheckout}
/>
    </div>
  );
};