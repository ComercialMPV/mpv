// src/components/BundleGrid.tsx
import React from 'react';
import { Edit3, Trash2, Package, Layers } from 'lucide-react';
import { Bundle } from '../services/api';

interface BundleGridProps {
  bundles: Bundle[];
  onEdit: (bundle: Bundle) => void;
  onDelete: (bundle: Bundle) => void;
}

export default function BundleGrid({ bundles, onEdit, onDelete }: BundleGridProps) {
  if (bundles.length === 0) {
    return (
      <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
        <Layers className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Nenhum pacote ou plano criado ainda
        </h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Crie combos de produtos/serviços ou planos de subscrição para oferecer aos seus clientes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {bundles.map((bundle) => {
        const isSubscription = bundle.type === 'Subscription';

        // Contagem correta
        const itemCount = isSubscription 
          ? (bundle.includedLimits?.length || 0) 
          : (bundle.items?.length || 0);

        // Preço correto
        const displayPrice = isSubscription 
          ? Number(bundle.billingPricePerCycle || bundle.price || 0)
          : Number(bundle.price || 0);

        return (
          <div
            key={bundle._id}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200 group flex flex-col h-full"
          >
            {/* Badge de tipo */}
            <div
              className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow-sm ${
                isSubscription
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {isSubscription ? 'Subscrição' : 'Combo'}
            </div>

            {/* Imagem */}
            <div className="relative h-44 bg-gray-100 flex-shrink-0">
              {bundle.image ? (
                <img
                  src={bundle.image}
                  alt={bundle.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  {isSubscription ? (
                    <Layers size={64} strokeWidth={1.2} />
                  ) : (
                    <Package size={64} strokeWidth={1.2} />
                  )}
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 mb-1.5">
                {bundle.name}
              </h3>

              {bundle.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {bundle.description}
                </p>
              )}

              <div className="mt-auto space-y-3">
              {/* Contagem de itens / limites */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  {itemCount} {isSubscription ? 'benefício(s)' : 'item(s)'}
                </div>

                <div className="font-bold text-xl text-green-700 text-right">
                  {displayPrice.toLocaleString('pt-MZ')} MT
                  {isSubscription && (
                    <span className="block text-xs font-normal text-gray-500">
                      / {bundle.billingCycle || 'ciclo'}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onEdit(bundle)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-medium transition-colors border border-amber-200"
                >
                  <Edit3 size={16} />
                  Editar
                </button>

                <button
                  onClick={() => onDelete(bundle)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-medium transition-colors border border-red-200"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}