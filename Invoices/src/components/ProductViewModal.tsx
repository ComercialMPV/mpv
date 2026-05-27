import React from 'react';
import { Product } from '../services/api';
import { X, Package } from 'lucide-react';
export const ProductViewModal: React.FC<{ product: Product, onClose: () => void }> = ({ product, onClose }) => {
  const DetailItem = ({ label, value }: { label: string, value: any }) => (
    <div className="flex flex-col border-b border-gray-50 pb-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-gray-700">{value || '---'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl">
        {/* Header com Imagem */}
        <div className="relative h-48 bg-gray-100">
          {product.images?.[0] ? (
            <img src={product.images[0]} className="w-full h-full object-cover" alt={product.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={48} /></div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                {product.category}
              </span>
              <h2 className="text-2xl font-black text-gray-800 mt-2">{product.name}</h2>
              <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
              <p className="text-xs text-gray-400 font-mono">{product.madeToOrder ? 'Sob Encomenda' : 'Disponível em Stock'}</p>
               <p className="text-xs text-gray-400 font-mono">Entrega em {product.deliveryDays} dias</p>
               <p className="text-xs text-gray-400 font-mono">Preço de Encomenda: {product.orderPrice.toLocaleString()} MZN</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900">{product.basePrice.toLocaleString()} MZN</p>
              <p className="text-xs text-green-600 font-bold italic">Em Stock: {product.stockQuantity} {product.unit}</p>

            </div>
          </div>

          {/* Área de Detalhes Dinâmicos por Categoria */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            {product.category === 'Veículos' && (
              <>
                <DetailItem label="Marca/Modelo" value={`${(product as any).brand} ${(product as any).model}`} />
                <DetailItem label="Ano" value={(product as any).year} />
                <DetailItem label="Quilometragem" value={`${(product as any).mileage} KM`} />
                <DetailItem label="Combustível" value={(product as any).fuelType} />
                <DetailItem label="Transmissão" value={(product as any).transmission} />
              </>
            )}

            {product.category === 'Gráfica' && (
              <>
                <DetailItem label="Técnica" value={(product as any).printTechnique} />
                <DetailItem label="Material" value={(product as any).materialSupport} />
                <DetailItem label="Dimensões" value={(product as any).dimensions} />
                <DetailItem label="Acabamento" value={(product as any).finish} />
                <DetailItem label="Qtd Mínima" value={(product as any).minQuantity} />
              </>
            )}

            {product.category === 'Talho' && (
              <>
                <DetailItem label="Origem" value={(product as any).animalOrigin} />
                <DetailItem label="Corte" value={(product as any).cutType} />
                <DetailItem label="Estado" value={(product as any).conservationState} />
                { (product as any).isHalal && <DetailItem label="Certificado" value="HALAL ✅" /> }
              </>
            )}
            
            {/* Adicionar outros cases conforme necessário... */}
          </div>

          <div className="mt-8 flex gap-3">
             <button onClick={onClose} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition">
               Fechar Visualização
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};