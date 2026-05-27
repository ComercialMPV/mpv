import React, { useState } from 'react';
import { Services } from '../components/Services';
import { Products } from '../components/Products';
import BundleSelector from '../components/BundleSelector'
import { Package, Briefcase, Boxes, Zap } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'products' | 'bundles'>('services');

  // Função dummy para o onAdd, já que na página de inventário o foco é gestão/criação
  // e não adicionar ao carrinho como acontece no PDV.
  const handleBundleAction = (bundle: any) => {
    console.log("Visualizando detalhes do bundle:", bundle);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto py-8">
        <div className="px-2 sm:px-6 lg:px-8">
          
         <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
  {/* Title Section */}
  <div className="flex items-center space-x-4">
    <div className="p-3 bg-blue-600 rounded-md shadow-lg shadow-blue-200 shrink-0">
      <Boxes className="h-6 w-6 text-white" />
    </div>
    <div>
      <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
        Catálogo e Inventário
      </h1>
      <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
        Gira os seus produtos físicos, serviços e combos.
      </p>
    </div>
  </div>

  {/* Navigation Tabs - Responsive Scroll/Fill */}
  <div className="w-full lg:w-auto">
    <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 overflow-x-auto no-scrollbar">
      <button
        onClick={() => setActiveTab('services')}
        className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all whitespace-nowrap active:scale-95 ${
          activeTab === 'services' 
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
          : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span>Serviços</span>
      </button>

      <button
        onClick={() => setActiveTab('products')}
        className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all whitespace-nowrap active:scale-95 ${
          activeTab === 'products' 
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
          : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span>Produtos</span>
      </button>

      <button
        onClick={() => setActiveTab('bundles')}
        className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all whitespace-nowrap active:scale-95 ${
          activeTab === 'bundles' 
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
          : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span>Combos</span>
      </button>
    </div>
  </div>
</div>
          
          {/* Container Principal */}
          <div className="bg-slate-50 rounded-md shadow-xl shadow-gray-200/50 border border-gray-100  min-h-[600px]">
            {activeTab === 'services' && <Services />}
            {activeTab === 'products' && <Products />}
            {activeTab === 'bundles' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <BundleSelector onAdd={handleBundleAction} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};