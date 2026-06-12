// src/components/Layout.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, Users,Eye, ShoppingCart, Wrench, Building2, BookTemplate, 
  Settings, Menu, X, Globe, LogOut, Home, Combine, Dock, Package, ChevronLeft, ChevronRight, 
  Target, BarChart3, Search, Info, Bell, User, HandCoins, Handshake,
  AppWindow, CreditCard, CircleDollarSign, Coins, ChevronDown, ChevronUp,
  Play
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { motion, AnimatePresence } from 'framer-motion';

import OnboardingModal from './OnboardingModal';
import onboardingContents from '../constants/onboarding';
import OnboardingTooltip from './OnboardingBubble';

interface LayoutProps {
  children: React.ReactNode;
}

// ==================== MENU ESTRUTURADO ====================
export const structuredMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ]
  },
  {
    id: 'comercial',
    title: 'Comercial',
    icon: ShoppingCart,
    items: [
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Propostas', href: '/proposals', icon: FileText },
      { name: 'Vendas', href: '/sales', icon: ShoppingCart },
      { name: 'Metas', href: '/goals', icon: Target },
      { name: 'Clientes', href: '/clients', icon: Users },
      { name: 'Rentabilidade', href: '/customers', icon: BarChart3 },
      { name: 'Hub do Empreendedor', href: '/biblioteca', icon: Play },
      { name: 'Biblioteca do Empreendedor', href: '/admin/biblioteca', icon: Play },
    ]
  },
  {
    id: 'parceiros',
    title: 'Parceiros e Comissões',
    icon: Handshake,
    items: [
      { name: 'Painel do Parceiro', href: '/partner-dashboard', icon: HandCoins },
      { name: 'Gerenciamento de Parceiros', href: '/partner-management', icon: Handshake },
      { name: 'Gestão de Comissões', href: '/commission-management', icon: HandCoins },
      { name: 'Dashboard Comissões', href: '/admin-commissions-dashboard', icon: Coins },
      { name: 'Minhas comissões', href: '/my-commissions', icon: CircleDollarSign },
      { name: 'Meus ganhos', href: '/my-earnings', icon: BarChart3 },
      { name: 'Dashboard de Recomendação', href: '/referral/dashboard', icon: Target },
      { name: 'Recomendar Clientes', href: '/recommended-clients', icon: Users },
    ]
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    icon: CircleDollarSign,
    items: [
      { name: 'Dashboard de Despesas', href: '/expenses', icon: Coins },
      { name: 'Documentos', href: '/documents', icon: FileText },
      { name: 'Modelos documentos', href: '/templates', icon: BookTemplate },
      { name: 'Configurações de Pagamento', href: '/payment-settings', icon: CreditCard },
      {name: 'Transações no website', href: '/transactions', icon: Dock},
      { name: 'Configuração de Planos de Assinatura', href: '/plans-config', icon: Package },
    ]
  },
  {
    id: 'administrativo',
    title: 'Administrativo',
    icon: Building2,
    items: [
      { name: 'Serviços', href: '/services', icon: Wrench },
      { name: 'Fornecedores', href: '/suppliers', icon: Package },
      { name: 'Requisições', href: '/requisitions', icon: Building2 },
      { name: 'Empresa', href: '/company', icon: Building2 },
      { name: 'Grupos', href: '/groups', icon: Users },
      { name: 'Definições', href: '/settings', icon: Settings },
      { name: 'Gestão de Usuários', href: '/users', icon: Users },
      { name: 'Gestão de cargos', href: '/role-management', icon: Users },
      { name: 'Performance dos Usuários', href: '/users-performance', icon: BarChart3 },
      { name: 'Minhas Empresas', href: '/super-admin', icon: User },
      { name: 'Gestão de Onboarding', href: '/admin/onboarding', icon: Info },
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing',
    icon: Globe,
    items: [
      { name: 'Portais Públicos', href: '/public-portal-templates', icon: AppWindow },
      { name: 'Configurar Website Público', href: '/portal-customization', icon: Globe },
      { name: 'Social media', href: '/social-publish', icon: Combine },
    ]
  },
  {
    id: 'operacoes',
    title: 'Operações Específicas',
    icon: Wrench,
    items: [
      { name: 'Display de Pedidos', href: '/orders-display', icon: ShoppingCart },
      { name: 'Confirmação da Cozinha', href: '/kitchen', icon: Wrench },
    ]
  },
];

const WorkspaceBadge: React.FC = () => {
  const [wsId, setWsId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('activeWorkspace');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.companyId || null;
      }
    } catch {}
    return null;
  });
  const [wsName, setWsName] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('activeWorkspace');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.companyName || null;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem('activeWorkspace');
        if (stored) {
          const parsed = JSON.parse(stored);
          setWsId(parsed.companyId || null);
          setWsName(parsed.companyName || null);
        } else {
          setWsId(null);
          setWsName(null);
        }
      } catch {
        setWsId(null);
        setWsName(null);
      }
    };
    window.addEventListener('workspaceChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('workspaceChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  if (!wsId) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs">
      <Eye className="h-3.5 w-3.5 text-indigo-600" />
      <span className="text-indigo-700 font-medium truncate max-w-[140px]">
        {wsName}
      </span>
      <button onClick={() => {
        localStorage.removeItem('activeWorkspace');
        window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: { companyId: null, companyName: null } }));
        window.location.reload();
      }}
        className="p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [allowedNavigation, setAllowedNavigation] = useState<any[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboard: true,
    comercial: true,
  });

  const [seenOnboarding, setSeenOnboarding] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('seenOnboarding');
    return saved ? JSON.parse(saved) : {};
  });

  const [pendingNavigation, setPendingNavigation] = useState<{ 
    href: string; 
    name: string;
    element: HTMLElement | null;
  } | null>(null);

  const [modalItem, setModalItem] = useState<string | null>(null);

  const { user, logout, loading: authLoading } = useAuth();
  const { activeWorkspaceCompanyId, activeWorkspaceCompanyName, clearWorkspace } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // ==================== PERMISSÕES ====================
  useEffect(() => {
    if (!user || authLoading) {
      setAllowedNavigation([{ name: 'Dashboard', href: '/dashboard', icon: Home }]);
      return;
    }

    const roleName = user.role?.roleName || user.role || '';

    if (roleName === 'referralPartner') {
      const referralNavigation = [
        { name: 'Dashboard de Recomendação', href: '/referral/dashboard', icon: Target },
        { name: 'Recomendar Clientes', href: '/recommended-clients', icon: Users },
        { name: 'Meus ganhos', href: '/my-earnings', icon: BarChart3 },
      ];
      setAllowedNavigation(referralNavigation);
      return;
    }

    const loadPermissions = () => {
      let rolePermissions: string[] = user.rolePermissions || 
                                     user.role?.allowedMenuItems || 
                                     user.role?.permissions || [];

      // Filtra itens permitidos em todo o menu estruturado
      const allAllowedItems = new Set(
        structuredMenu.flatMap(section => 
          section.items.filter(item => 
            item.name === 'Dashboard' || rolePermissions.includes(item.name)
          )
        )
      );

      setAllowedNavigation(Array.from(allAllowedItems));
    };

    loadPermissions();
    const handleUpdate = () => loadPermissions();
    window.addEventListener('userPermissionsUpdated', handleUpdate);
    return () => window.removeEventListener('userPermissionsUpdated', handleUpdate);
  }, [user, authLoading]);

  // ==================== ONBOARDING ====================
  const markAsSeen = (name: string) => {
    const updated = { ...seenOnboarding, [name]: true };
    setSeenOnboarding(updated);
    localStorage.setItem('seenOnboarding', JSON.stringify(updated));
  };

  const handleBubbleSkip = () => {
    if (pendingNavigation) {
      markAsSeen(pendingNavigation.name);
      navigate(pendingNavigation.href);
      setPendingNavigation(null);
    }
  };

  const handleViewDetails = () => {
    if (pendingNavigation?.name) {
      setModalItem(pendingNavigation.name);
    }
  };

  const handleModalClose = () => {
    if (pendingNavigation?.name) {
      markAsSeen(pendingNavigation.name);
      navigate(pendingNavigation.href);
      setPendingNavigation(null);
    }
    setModalItem(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const companySubscription = (user?.company as any)?.subscription;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05051e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // ==================== NAV ITEM ====================
  const NavItem = ({ item, isMobile = false }: { item: any; isMobile?: boolean }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    const itemRef = useRef<HTMLAnchorElement>(null);

    const handleClick = (e: React.MouseEvent) => {
      if (isMobile) setMobileMenuOpen(false);

      const isSeen = !!seenOnboarding[item.name];

      if (!isSeen && onboardingContents[item.name]) {
        e.preventDefault();
        setPendingNavigation({ 
          href: item.href, 
          name: item.name,
          element: itemRef.current 
        });
        return;
      }
    };

    return (
      <Link
        ref={itemRef}
        to={item.href}
        onClick={handleClick}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative text-sm
          ${isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
            : 'text-gray-600 hover:bg-slate-100 hover:text-slate-900'
          }
        `}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
        <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${!isMobile && collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          {item.name}
        </span>
        {isActive && !collapsed && (
          <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </Link>
    );
  };

  // Filtra seções que possuem pelo menos um item permitido
  const visibleSections = structuredMenu.map(section => ({
    ...section,
    items: section.items.filter(item => 
      allowedNavigation.some(allowed => allowed.name === item.name)
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
      
      {/* Sidebar Desktop - COLLAPSIBLE TREE */}
      <motion.aside 
        animate={{ width: collapsed ? 88 : 280 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col relative z-20 border-r border-slate-200 bg-white transition-all duration-300"
      >
        {/* Logo Area */}
        <div className={`h-20 flex items-center mb-4 transition-all duration-300 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
          <div className="flex items-center gap-3">
            <img 
              src={collapsed ? "https://meupontodevenda.com/cdn/icon-logo.svg" : "https://meupontodevenda.com/cdn/logo-colored.svg"} 
              alt="Meu Ponto de Venda"
              className={`${collapsed ? 'w-9 h-9' : 'w-auto h-12'} object-contain shrink-0`}
            />
          </div>
        </div>

        {/* Menu Tree */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          {visibleSections.map((section) => {
            const isOpen = openSections[section.id] ?? true;
            const SectionIcon = section.icon;

            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                    hover:bg-slate-100 transition-colors group
                  `}
                >
                  <SectionIcon className="h-5 w-5 text-slate-500" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{section.title}</span>
                      {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </>
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && !collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden pl-3 mt-1 space-y-0.5"
                    >
                      {section.items.map((item) => (
                        <NavItem key={item.name} item={item} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Versão colapsada - apenas ícones */}
                {collapsed && section.items.some(item => 
                  location.pathname === item.href
                ) && (
                  <div className="pl-3 mt-1">
                    {section.items.filter(item => location.pathname === item.href).map(item => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-24 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-md hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all z-30"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* User Profile */}
        <div className="p-4 mt-auto border-t border-slate-200">
          <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${collapsed ? 'justify-center' : 'hover:bg-slate-100'}`}>
            <div className="h-9 w-9 text-white rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center font-bold shrink-0 shadow">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                  {user?.company?.name || 
                   user?.company?._doc?.name || 
                   user?.company?.toObject?.()?.name || 
                   'Empresa'}
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-medium text-gray-400">Plano:</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {user?.company?.subscription?.planName ||
                     user?.company?.planName ||
                     user?.company?.subscription?.plan?.name ||
                     'Básico'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-6 border-b border-slate-200 bg-white backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500 hover:text-slate-900" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-100 border border-slate-200 rounded-2xl w-80 text-slate-400 focus-within:border-indigo-300 transition-all">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar no sistema..." 
                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400" 
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Workspace Badge — reads from context OR localStorage for persistence */}
            <WorkspaceBadge />
            <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-900 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200"></div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-white z-50 lg:hidden flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <img 
                    src="https://meupontodevenda.com/cdn/logo-colored.svg" 
                    alt="Meu Ponto de Venda"
                    className="h-10 object-contain"
                  />
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                    <X size={28} />
                  </button>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                {visibleSections.map((section) => (
                  <div key={section.id}>
                    <div className="flex items-center gap-3 px-4 py-2 text-slate-500 font-semibold text-sm mb-2">
                      <section.icon className="h-5 w-5" />
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <NavItem key={item.name} item={item} isMobile />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="p-6 border-t mt-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 text-white rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-2xl">
                    {user?.firstName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.company?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-semibold flex items-center justify-center gap-3"
                >
                  <LogOut size={20} /> Sair da Conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Onboarding */}
      <AnimatePresence>
        {pendingNavigation && pendingNavigation.element && (
          <OnboardingTooltip
            itemName={pendingNavigation.name}
            targetElement={pendingNavigation.element}
            onSkip={handleBubbleSkip}
            onViewDetails={handleViewDetails}
          />
        )}
      </AnimatePresence>

      <OnboardingModal
        itemName={modalItem || ''}
        isOpen={!!modalItem}
        onClose={handleModalClose}
      />
    </div>
  );
};