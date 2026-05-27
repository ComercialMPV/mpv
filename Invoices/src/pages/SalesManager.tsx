import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Globe, 
  History, 
  LayoutDashboard, 
  Menu, 
  X 
} from 'lucide-react';
import { Sales } from './Sales';
import { SalesHistory } from './SalesHistory';
import { SalesOnline } from './SalesOnline';

export const SalesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'online'>('pos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Ícone e texto da aba ativa (para o FAB)
  const getActiveTabInfo = () => {
    switch (activeTab) {
      case 'pos':
        return { icon: ShoppingBag, label: 'PDV' };
      case 'history':
        return { icon: History, label: 'His' };
      case 'online':
        return { icon: Globe, label: 'On' };
    }
  };

  const { icon: ActiveIcon, label: activeLabel } = getActiveTabInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Cabeçalho fixo + navegação desktop */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-2 md:py-6 top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 bg-blue-600 rounded-md text-white shadow-lg shadow-blue-200">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight uppercase">
              Gestão de Vendas
            </h1>
          </div>

          {/* Navegação desktop – visível apenas em md+ */}
          <nav className="hidden md:flex bg-gray-100 p-1.5 rounded-[20px] gap-1.5">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[16px] text-sm font-semibold transition-all ${
                activeTab === 'pos'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/60'
              }`}
            >
              <ShoppingBag size={18} />
              Terminal PDV
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[16px] text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/60'
              }`}
            >
              <History size={18} />
              Histórico
            </button>

            <button
              onClick={() => setActiveTab('online')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[16px] text-sm font-semibold transition-all ${
                activeTab === 'online'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/60'
              }`}
            >
              <Globe size={18} />
              Vendas Online
            </button>
          </nav>
        </div>
      </div>

      {/* Floating Action Button + Menu Mobile */}
      <div className="md:hidden fixed bottom-24 right-6 z-40">
        <div className="relative" ref={menuRef}>
          {/* Botão principal */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all active:scale-95"
          >
            {isMobileMenuOpen ? (
              <X size={28} />
            ) : (
              <div className="flex flex-col items-center text-xs font-bold">
                <ActiveIcon size={26} />
                <span className="mt-1">{activeLabel}</span>
              </div>
            )}
          </button>

          {/* Menu dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
              <div className="py-2">
                <button
                  onClick={() => {
                    setActiveTab('pos');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition ${
                    activeTab === 'pos' ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                  }`}
                >
                  <ShoppingBag size={22} />
                  <span>Terminal PDV</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('history');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition ${
                    activeTab === 'history' ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                  }`}
                >
                  <History size={22} />
                  <span>Histórico & Filtros</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('online');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition ${
                    activeTab === 'online' ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                  }`}
                >
                  <Globe size={22} />
                  <span>Vendas Online</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto pb-24 md:pb-0">
        <div className="animate-in fade-in zoom-in-95 duration-300 h-full">
          {activeTab === 'pos' && <Sales />}
          {activeTab === 'history' && (
            <div className="py-6 px-4 sm:px-6">
              <SalesHistory />
            </div>
          )}
          {activeTab === 'online' && (
            <div className="py-6 px-4 sm:px-6">
              <SalesOnline />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};