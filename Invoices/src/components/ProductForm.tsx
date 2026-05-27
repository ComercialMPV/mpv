import React, { useState } from 'react';
import { X, Save, Home, Info, Printer, Cpu, Tag, Boxes, Package, DollarSign, Settings } from 'lucide-react';
import { ImageUploader } from './ImageUploader';

interface ProductFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  formData, setFormData, onSubmit, onClose, isEditing 
}) => {
  const renderSectorFields = () => {
    const baseStyle = "grid grid-cols-1 gap-4 p-4 rounded-xl border mb-4";
    
    switch (formData.category) {
    case 'Restaurante':
  return (
    <div className={`${baseStyle} bg-orange-50 border-orange-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-orange-200 pb-2">
        <div className="text-orange-700 text-xs font-black uppercase flex items-center gap-2">
          <Info size={14} className="text-orange-500"/> 
          Detalhes do Cardápio
        </div>
        <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Setor Gastronómico
        </span>
      </div>

      {/* Grid Principal Responsiva */}
      <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4">
        {/* Tipo de Item */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-orange-600 uppercase ml-1">Tipo de Produto</label>
          <select 
            className="w-full p-2.5 border border-orange-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
            value={formData.restaurantItemType} 
            onChange={e => setFormData({...formData, restaurantItemType: e.target.value})}
          >
            <option value="Prato">Prato Principal</option>
            <option value="Entrada">Entrada / Petisco</option>
            <option value="Bebida">Bebida / Bar</option>
            <option value="Sobremesa">Sobremesa</option>
            <option value="Consumível">Consumível</option>
          </select>
        </div>

        {/* Campo Dinâmico: Volume ou Serve */}
        <div className="flex flex-col gap-1">
          {formData.restaurantItemType === 'Bebida' ? (
            <>
              <label className="text-[10px] font-bold text-orange-600 uppercase ml-1">Volume / Capacidade</label>
              <input type="text" placeholder="Ex: 330ml, 1.5L" className="p-2.5 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" 
                value={formData.volume} onChange={e => setFormData({...formData, volume: e.target.value})} />
            </>
          ) : (
            <>
              <label className="text-[10px] font-bold text-orange-600 uppercase ml-1">Doses (Serve qtas pessoas)</label>
              <input type="number" min="1" className="p-2.5 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" 
                value={formData.serves} onChange={e => setFormData({...formData, serves: Number(e.target.value)})} />
            </>
          )}
        </div>

        {/* Tempo de Preparação ou Marca */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-orange-600 uppercase ml-1">
            {formData.restaurantItemType === 'Bebida' || formData.restaurantItemType === 'Consumível' ? 'Marca / Fornecedor' : 'Tempo Prep. (min)'}
          </label>
          <input 
            type={formData.restaurantItemType === 'Bebida' ? "text" : "number"}
            className="p-2.5 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" 
            value={formData.restaurantItemType === 'Bebida' ? formData.brand : formData.preparationTime} 
            onChange={e => setFormData({...formData, [formData.restaurantItemType === 'Bebida' ? 'brand' : 'preparationTime']: e.target.value})} 
          />
        </div>
      </div>

      {/* Ingredientes e Alérgenos (Apenas Comida) */}
      {formData.restaurantItemType !== 'Bebida' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-orange-600 uppercase ml-1 text-flex items-center gap-1">
              Ingredientes <span className="text-[8px] font-normal lowercase">(separar por vírgula)</span>
            </label>
            <textarea 
              rows={2}
              className="w-full p-3 border border-orange-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none" 
              placeholder="Ex: Tomate, Mozzarella, Manjericão..."
              value={formData.ingredients?.join(', ')} 
              onChange={e => setFormData({...formData, ingredients: e.target.value.split(',').map(i => i.trim())})}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-orange-600 uppercase ml-1">Alérgenos / Notas de Dieta</label>
            <textarea 
              rows={2}
              className="w-full p-3 border border-orange-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none" 
              placeholder="Ex: Lactose, Glúten, Marisco..."
              value={formData.allergens?.join(', ')} 
              onChange={e => setFormData({...formData, allergens: e.target.value.split(',').map(i => i.trim())})}
            />
          </div>
            {/* Badges de Preferências Diárias e Status */}
      <div className="bg-white/50 p-4 rounded-2xl border border-orange-100">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-orange-300" 
              checked={formData.isVegetarian} onChange={e => setFormData({...formData, isVegetarian: e.target.checked})} />
            <span className="text-xs font-bold text-gray-700 group-hover:text-orange-600 transition-colors">Vegetariano</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-orange-300" 
              checked={formData.isGlutenFree} onChange={e => setFormData({...formData, isGlutenFree: e.target.checked})} />
            <span className="text-xs font-bold text-gray-700 group-hover:text-orange-600 transition-colors">Sem Glúten</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-orange-300" 
              checked={formData.isVegan} onChange={e => setFormData({...formData, isVegan: e.target.checked})} />
            <span className="text-xs font-bold text-gray-700 group-hover:text-orange-600 transition-colors">Vegan</span>
          </label>

          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full border border-green-200">
            <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
              checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
            <span className="text-[10px] font-black text-green-700 uppercase italic">Disponível no Menu</span>
          </div>
        </div>
      </div>
        </div>
        
      )}

    
    </div>
  );

    case 'Construção':
  return (
    <div className={`${baseStyle} bg-stone-50 border-stone-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <div className="text-stone-700 text-xs font-black uppercase flex items-center gap-2">
          <Info size={14} className="text-stone-500"/> 
          Ficha Técnica de Materiais
        </div>
        <span className="text-[10px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Building & Hardware
        </span>
      </div>

      {/* Grid de Identificação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Material Base</label>
          <input type="text" placeholder="Ex: Porcelanato, Cimento" className="p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-500 bg-white" 
            value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Marca / Fabricante</label>
          <input type="text" placeholder="Ex: Revigrés, Weber" className="p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-500 bg-white" 
            value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Classe de Resistência</label>
          <input type="text" placeholder="Ex: PEI 5, R10, C30" className="p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-500 bg-white" 
            value={formData.resistanceClass} onChange={e => setFormData({...formData, resistanceClass: e.target.value})} />
        </div>
      </div>

      {/* Dimensões e Rendimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Dimensões / Formato</label>
          <input type="text" placeholder="Ex: 60x120cm, 25kg (Saco)" className="p-2.5 border border-stone-200 rounded-xl outline-none" 
            value={formData.dimensions} onChange={e => setFormData({...formData, dimensions: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Rendimento (m²/unid)</label>
          <input type="number" step="0.01" placeholder="1.44" className="p-2.5 border border-stone-200 rounded-xl outline-none" 
            value={formData.coverageArea} onChange={e => setFormData({...formData, coverageArea: Number(e.target.value)})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Peso Unid. (kg)</label>
          <input type="number" step="0.1" placeholder="25" className="p-2.5 border border-stone-200 rounded-xl outline-none" 
            value={formData.weightPerUnit} onChange={e => setFormData({...formData, weightPerUnit: Number(e.target.value)})} />
        </div>
      </div>

      {/* Aplicação e Resistência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-600 uppercase ml-1">Local de Aplicação</label>
          <input type="text" placeholder="Ex: Pavimento Interior, Estruturas Marítimas" className="p-2.5 border border-stone-200 rounded-xl outline-none" 
            value={formData.application} onChange={e => setFormData({...formData, application: e.target.value})} />
        </div>
        
        <div className="bg-white/50 p-3 rounded-2xl border border-stone-200 flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded text-stone-600 focus:ring-stone-500 border-stone-300" 
              checked={formData.isWeatherResistant} onChange={e => setFormData({...formData, isWeatherResistant: e.target.checked})} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-700">Uso Exterior?</span>
              <span className="text-[9px] text-gray-400 uppercase font-medium">Antigel / Resistente a UV</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group ml-auto">
            <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
              checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
            <span className="text-[10px] font-black text-green-700 uppercase">Em Stock</span>
          </label>
        </div>
      </div>
    </div>
  );

case 'Gráfica':
  return (
    <div className={`${baseStyle} bg-indigo-50 border-indigo-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
        <div className="text-indigo-700 text-xs font-black uppercase flex items-center gap-2">
          <Printer size={14} className="text-indigo-500"/> 
          Configurações de Produção Gráfica
        </div>
        <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Print & Design
        </span>
      </div>

      {/* Grid Principal: Categoria e Técnica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Categoria de Produto</label>
          <select 
            className="w-full p-2.5 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
            value={formData.printCategory} 
            onChange={e => setFormData({...formData, printCategory: e.target.value})}
          >
            <option value="Papelaria">Papelaria (Cartões, Flyers)</option>
            <option value="Têxtil">Têxtil (T-shirts, Bonés)</option>
            <option value="Grandes Formatos">Grandes Formatos (Banners, Roll-ups)</option>
            <option value="Brindes">Brindes (Canecas, Canetas)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Técnica de Impressão</label>
          <input type="text" placeholder="Ex: Serigrafia, DTF, Offset" className="p-2.5 border border-indigo-200 rounded-xl outline-none bg-white" 
            value={formData.printTechnique} onChange={e => setFormData({...formData, printTechnique: e.target.value})} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Esquema de Cores</label>
          <input type="text" placeholder="Ex: 4x4 (Cores Total), 1 Cor Sólida" className="p-2.5 border border-indigo-200 rounded-xl outline-none bg-white" 
            value={formData.colorType} onChange={e => setFormData({...formData, colorType: e.target.value})} />
        </div>
      </div>

      {/* Suporte e Dimensões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/40 p-4 rounded-2xl border border-indigo-100 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-indigo-500 uppercase">Material / Suporte</label>
            <input type="text" placeholder="Ex: Algodão 100%, Couchê 300g, Lona Vinílica" 
              className="w-full p-2 border-b border-indigo-200 bg-transparent outline-none text-sm" 
              value={formData.materialSupport} onChange={e => setFormData({...formData, materialSupport: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-indigo-500 uppercase">Dimensões / Tamanhos</label>
            <input type="text" placeholder="Ex: S ao XXL, 80x200cm, A5" 
              className="w-full p-2 border-b border-indigo-200 bg-transparent outline-none text-sm" 
              value={formData.dimensions} onChange={e => setFormData({...formData, dimensions: e.target.value})} />
          </div>
        </div>

        <div className="bg-white/40 p-4 rounded-2xl border border-indigo-100 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-indigo-500 uppercase">Acabamento Adicional</label>
            <input type="text" placeholder="Ex: Plastificação Mate, Bainhas e Ilhós" 
              className="w-full p-2 border-b border-indigo-200 bg-transparent outline-none text-sm" 
              value={formData.finish} onChange={e => setFormData({...formData, finish: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-indigo-500 uppercase">Qtd Mínima</label>
              <input type="number" className="w-full p-2 border-b border-indigo-200 bg-transparent outline-none text-sm" 
                value={formData.minQuantity} onChange={e => setFormData({...formData, minQuantity: Number(e.target.value)})} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-indigo-500 uppercase">Prazo Médio</label>
              <input type="text" placeholder="5 dias" className="w-full p-2 border-b border-indigo-200 bg-transparent outline-none text-sm" 
                value={formData.productionTime} onChange={e => setFormData({...formData, productionTime: e.target.value})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

      case 'Perfumaria':
  return (
    <div className={`${baseStyle} bg-pink-50 border-pink-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-pink-200 pb-2">
        <div className="text-pink-700 text-xs font-black uppercase flex items-center gap-2">
          <Tag size={14} className="text-pink-500"/> 
          Especificações da Fragrância
        </div>
        <span className="text-[10px] bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Beauty & Luxury
        </span>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Concentração */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-pink-600 uppercase ml-1">Concentração</label>
          <select 
            className="w-full p-2.5 border border-pink-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" 
            value={formData.concentration} 
            onChange={e => setFormData({...formData, concentration: e.target.value})}
          >
            <option value="EDP">Eau de Parfum (EDP)</option>
            <option value="EDT">Eau de Toilette (EDT)</option>
            <option value="Parfum">Parfum</option>
            <option value="EDC">Eau de Cologne</option>
            <option value="Splash">Body Splash</option>
          </select>
        </div>

        {/* Volume */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-pink-600 uppercase ml-1">Volume (ml/oz)</label>
          <input type="text" placeholder="Ex: 100ml" className="p-2.5 border border-pink-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" 
            value={formData.volume} onChange={e => setFormData({...formData, volume: e.target.value})} />
        </div>

        {/* Gênero */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-pink-600 uppercase ml-1">Gênero</label>
          <select 
            className="w-full p-2.5 border border-pink-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500" 
            value={formData.gender} 
            onChange={e => setFormData({...formData, gender: e.target.value})}
          >
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Unissex">Unissex</option>
          </select>
        </div>

        {/* Marca */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-pink-600 uppercase ml-1">Marca / Designer</label>
          <input type="text" placeholder="Ex: Chanel" className="p-2.5 border border-pink-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" 
            value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>
      </div>

      {/* Família e Notas Olfativas */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-pink-600 uppercase ml-1">Família Olfativa</label>
          <input type="text" placeholder="Ex: Oriental Amadeirado, Floral Frutado..." 
            className="w-full p-2.5 border border-pink-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" 
            value={formData.olfactiveFamily} onChange={e => setFormData({...formData, olfactiveFamily: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/40 p-3 rounded-xl border border-pink-100">
            <label className="text-[9px] font-black text-pink-400 uppercase">Notas de Topo (Saída)</label>
            <textarea className="w-full bg-transparent text-sm outline-none resize-none mt-1" rows={2} placeholder="Limão, Bergamota..."
              value={formData.topNotes?.join(', ')} onChange={e => setFormData({...formData, topNotes: e.target.value.split(', ')})} />
          </div>
          <div className="bg-white/40 p-3 rounded-xl border border-pink-100">
            <label className="text-[9px] font-black text-pink-400 uppercase">Notas de Coração (Corpo)</label>
            <textarea className="w-full bg-transparent text-sm outline-none resize-none mt-1" rows={2} placeholder="Jasmim, Rosa..."
              value={formData.middleNotes?.join(', ')} onChange={e => setFormData({...formData, middleNotes: e.target.value.split(', ')})} />
          </div>
          <div className="bg-white/40 p-3 rounded-xl border border-pink-100">
            <label className="text-[9px] font-black text-pink-400 uppercase">Notas de Fundo (Base)</label>
            <textarea className="w-full bg-transparent text-sm outline-none resize-none mt-1" rows={2} placeholder="Baunilha, Sândalo..."
              value={formData.baseNotes?.join(', ')} onChange={e => setFormData({...formData, baseNotes: e.target.value.split(', ')})} />
          </div>
        </div>
      </div>
    </div>
  );
  case 'Bijuteria':
  return (
    <div className={`${baseStyle} bg-amber-50 border-amber-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
        <div className="text-amber-700 text-xs font-black uppercase flex items-center gap-2">
          <Tag size={14} className="text-amber-500"/> 
          Detalhes do Acessório
        </div>
        <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Jewelry & Accessories
        </span>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tipo de Acessório */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Categoria de Peça</label>
          <select 
            className="w-full p-2.5 border border-amber-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
            value={formData.accessoryType} 
            onChange={e => setFormData({...formData, accessoryType: e.target.value})}
          >
            <option value="Colar">Colar</option>
            <option value="Anel">Anel</option>
            <option value="Brincos">Brincos</option>
            <option value="Pulseira">Pulseira</option>
            <option value="Tornozeleira">Tornozeleira</option>
            <option value="Conjunto">Conjunto</option>
          </select>
        </div>

        {/* Banho / Acabamento */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Banho / Acabamento</label>
          <input type="text" placeholder="Ex: Ouro 18k, Ródio Negro" className="p-2.5 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white" 
            value={formData.plating} onChange={e => setFormData({...formData, plating: e.target.value})} />
        </div>

        {/* Tamanho / Medida */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Medida (cm/nº)</label>
          <input type="text" placeholder="Ex: 45cm + extensor" className="p-2.5 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500" 
            value={formData.sizeLength} onChange={e => setFormData({...formData, sizeLength: e.target.value})} />
        </div>

        {/* Cor Principal */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Cor da Peça</label>
          <input type="text" placeholder="Ex: Dourado, Rosé" className="p-2.5 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500" 
            value={formData.mainColor} onChange={e => setFormData({...formData, mainColor: e.target.value})} />
        </div>
      </div>

      {/* Composição e Pedraria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Material Base</label>
          <input type="text" placeholder="Ex: Aço Cirúrgico, Prata de Lei" className="p-2.5 border border-amber-200 rounded-xl outline-none" 
            value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Pedraria / Detalhes</label>
          <input type="text" placeholder="Ex: Zircónias Verdes, Pérola de Rio" className="p-2.5 border border-amber-200 rounded-xl outline-none" 
            value={formData.stoneType} onChange={e => setFormData({...formData, stoneType: e.target.value})} />
        </div>
      </div>

      {/* Cuidados e Atributos de Saúde */}
      <div className="bg-white/60 p-4 rounded-2xl border border-amber-100 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300" 
            checked={formData.isHypoallergenic} onChange={e => setFormData({...formData, isHypoallergenic: e.target.checked})} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-700">Hipoalergénico</span>
            <span className="text-[9px] text-gray-400 uppercase">Sem níquel / Amigo da pele</span>
          </div>
        </label>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Breves Cuidados</label>
          <input type="text" placeholder="Ex: Não molhar, evitar perfumes" className="w-full p-2 bg-transparent border-b border-amber-200 outline-none text-sm" 
            value={formData.careInstructions} onChange={e => setFormData({...formData, careInstructions: e.target.value})} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer group ml-auto">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
            checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
          <span className="text-[10px] font-black text-green-700 uppercase italic">Visível no Catálogo</span>
        </label>
      </div>
    </div>
  );

     case 'Calçados':
  return (
    <div className={`${baseStyle} bg-cyan-50 border-cyan-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-cyan-200 pb-2">
        <div className="text-cyan-700 text-xs font-black uppercase flex items-center gap-2">
          <Tag size={14} className="text-cyan-500"/> 
          Especificações de Calçado
        </div>
        <span className="text-[10px] bg-cyan-200 text-cyan-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Fashion & Footwear
        </span>
      </div>

      {/* Grid Principal Responsiva */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Marca/Modelo */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-cyan-600 uppercase ml-1">Marca / Coleção</label>
          <input type="text" placeholder="Ex: Nike, Timberland" className="p-2.5 border border-cyan-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 bg-white" 
            value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>

        {/* Gênero */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-cyan-600 uppercase ml-1">Público-Alvo</label>
          <select 
            className="w-full p-2.5 border border-cyan-200 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500 outline-none" 
            value={formData.gender} 
            onChange={e => setFormData({...formData, gender: e.target.value})}
          >
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Unissex">Unissex</option>
            <option value="Infantil">Infantil</option>
          </select>
        </div>

        {/* Tipo de Fecho */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-cyan-600 uppercase ml-1">Tipo de Fecho</label>
          <select 
            className="w-full p-2.5 border border-cyan-200 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500 outline-none" 
            value={formData.closureType} 
            onChange={e => setFormData({...formData, closureType: e.target.value})}
          >
            <option value="Atacadores">Atacadores</option>
            <option value="Velcro">Velcro</option>
            <option value="Fivela">Fivela</option>
            <option value="Slip-on">Sem atacadores (Slip-on)</option>
            <option value="Zíper">Zíper</option>
          </select>
        </div>
      </div>

      {/* Variantes: Tamanhos e Cores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-cyan-600 uppercase ml-1">Tamanhos Disponíveis (separar por vírgula)</label>
          <input type="text" placeholder="Ex: 38, 39, 40, 41" className="p-2.5 border border-cyan-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500" 
            value={formData.sizes?.join(', ')} 
            onChange={e => setFormData({...formData, sizes: e.target.value.split(',').map(s => s.trim())})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-cyan-600 uppercase ml-1">Cores (separar por vírgula)</label>
          <input type="text" placeholder="Ex: Preto, Branco, Azul Marinho" className="p-2.5 border border-cyan-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500" 
            value={formData.colors?.join(', ')} 
            onChange={e => setFormData({...formData, colors: e.target.value.split(',').map(c => c.trim())})} />
        </div>
      </div>

      {/* Composição Técnica */}
      <div className="bg-white/40 p-4 rounded-2xl border border-cyan-100 space-y-4">
        <div className="text-[10px] font-black text-cyan-700 uppercase flex items-center gap-2 mb-2">
          <Boxes size={14}/> Materiais de Composição
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase">Material Exterior</label>
            <input type="text" placeholder="Ex: Pele, Camurça" className="p-2 border border-cyan-100 rounded-lg text-sm" 
              value={formData.upperMaterial} onChange={e => setFormData({...formData, upperMaterial: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase">Sola</label>
            <input type="text" placeholder="Ex: Borracha Anti-derrapante" className="p-2 border border-cyan-100 rounded-lg text-sm" 
              value={formData.soleMaterial} onChange={e => setFormData({...formData, soleMaterial: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase">Forro Interno</label>
            <input type="text" placeholder="Ex: Têxtil Respirável" className="p-2 border border-cyan-100 rounded-lg text-sm" 
              value={formData.liningMaterial} onChange={e => setFormData({...formData, liningMaterial: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Funcionalidades Extra */}
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-cyan-300" 
            checked={formData.isOrthopedic} onChange={e => setFormData({...formData, isOrthopedic: e.target.checked})} />
          <span className="text-xs font-bold text-gray-700 group-hover:text-cyan-600 transition-colors">Calçado Ortopédico</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer group ml-auto">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
            checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
          <span className="text-[10px] font-black text-green-700 uppercase italic">Ativo no Catálogo</span>
        </label>
      </div>
    </div>
  );

  case 'Cabelos':
  return (
    <div className={`${baseStyle} bg-violet-50 border-violet-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-violet-200 pb-2">
        <div className="text-violet-700 text-xs font-black uppercase flex items-center gap-2">
          <Info size={14} className="text-violet-500"/> 
          Ficha Técnica de Cabelos
        </div>
        <span className="text-[10px] bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Hair & Extensions
        </span>
      </div>

      {/* Grid de Atributos Físicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tipo de Cabelo */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Fibra / Tipo</label>
          <select 
            className="w-full p-2.5 border border-violet-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 outline-none" 
            value={formData.hairType} 
            onChange={e => setFormData({...formData, hairType: e.target.value})}
          >
            <option value="Humano">Humano (Remy)</option>
            <option value="Sintético">Sintético</option>
            <option value="Bio-vegetal">Bio-vegetal</option>
            <option value="Mistura">Mistura (Mix)</option>
          </select>
        </div>

        {/* Textura */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Textura</label>
          <select 
            className="w-full p-2.5 border border-violet-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 outline-none" 
            value={formData.texture} 
            onChange={e => setFormData({...formData, texture: e.target.value})}
          >
            <option value="Liso">Liso</option>
            <option value="Ondulado">Ondulado</option>
            <option value="Cacheado">Cacheado</option>
            <option value="Crespo">Crespo / Afro</option>
          </select>
        </div>

        {/* Comprimento */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Comprimento (cm)</label>
          <input type="number" placeholder="Ex: 55" className="p-2.5 border border-violet-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" 
            value={formData.length} onChange={e => setFormData({...formData, length: Number(e.target.value)})} />
        </div>

        {/* Peso */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Peso (Gramas)</label>
          <input type="number" placeholder="Ex: 100" className="p-2.5 border border-violet-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" 
            value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} />
        </div>
      </div>

      {/* Detalhes de Origem e Estilo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Origem / Região</label>
          <input type="text" placeholder="Ex: Brasileiro, Indiano" className="p-2.5 border border-violet-200 rounded-xl outline-none" 
            value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Cor / Tom</label>
          <input type="text" placeholder="Ex: #613 Platinado" className="p-2.5 border border-violet-200 rounded-xl outline-none" 
            value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-violet-600 uppercase ml-1">Método de Aplicação</label>
          <input type="text" placeholder="Ex: Fita Adesiva, Queratina" className="p-2.5 border border-violet-200 rounded-xl outline-none" 
            value={formData.applicationMethod} onChange={e => setFormData({...formData, applicationMethod: e.target.value})} />
        </div>
      </div>

      {/* Opções de Tratamento */}
      <div className="bg-white/50 p-4 rounded-2xl border border-violet-100 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-violet-300" 
            checked={formData.isChemicalTreated} onChange={e => setFormData({...formData, isChemicalTreated: e.target.checked})} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-700">Tratado Quimicamente?</span>
            <span className="text-[9px] text-gray-400">Marque se o cabelo já passou por descoloração ou permanente</span>
          </div>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer group ml-auto">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
            checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
          <span className="text-[10px] font-black text-green-700 uppercase italic">Disponível em Loja</span>
        </label>
      </div>
    </div>
  );
  case 'Plantas':
  return (
    <div className={`${baseStyle} bg-green-50 border-green-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-green-200 pb-2">
        <div className="text-green-700 text-xs font-black uppercase flex items-center gap-2">
          <Info size={14} className="text-green-500"/> 
          Guia de Botânica e Cuidados
        </div>
        <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Garden & Nature
        </span>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nome Científico */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[10px] font-bold text-green-600 uppercase ml-1">Nome Científico / Espécie</label>
          <input type="text" placeholder="Ex: Monstera Deliciosa" className="p-2.5 border border-green-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white italic" 
            value={formData.scientificName} onChange={e => setFormData({...formData, scientificName: e.target.value})} />
        </div>

        {/* Nível de Cuidado */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-green-600 uppercase ml-1">Nível de Dificuldade</label>
          <select 
            className="w-full p-2.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-green-500 outline-none" 
            value={formData.careLevel} 
            onChange={e => setFormData({...formData, careLevel: e.target.value})}
          >
            <option value="Fácil">Fácil (Para iniciantes)</option>
            <option value="Médio">Médio (Requer atenção)</option>
            <option value="Avançado">Avançado (Colecionador)</option>
          </select>
        </div>
      </div>

      {/* Necessidades Vitais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/60 p-4 rounded-2xl border border-green-100 space-y-3">
          <label className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-2">
             Exposição Solar
          </label>
          <select 
            className="w-full p-2 border border-green-200 rounded-lg outline-none" 
            value={formData.sunlightRequirement} 
            onChange={e => setFormData({...formData, sunlightRequirement: e.target.value})}
          >
            <option value="Sol Pleno">Sol Pleno (6h+ de sol direto)</option>
            <option value="Luz Indireta">Luz Indireta / Brilhante</option>
            <option value="Meia Sombra">Meia Sombra</option>
            <option value="Sombra">Sombra (Interior)</option>
          </select>
        </div>

        <div className="bg-white/60 p-4 rounded-2xl border border-green-100 space-y-3">
          <label className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-2">
             Frequência de Rega
          </label>
          <input type="text" placeholder="Ex: 2x por semana / Solo seco" className="w-full p-2 border border-green-200 rounded-lg outline-none" 
            value={formData.wateringFrequency} onChange={e => setFormData({...formData, wateringFrequency: e.target.value})} />
        </div>
      </div>

      {/* Dimensões e Logística */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-green-600 uppercase ml-1">Tamanho do Vaso</label>
          <input type="text" placeholder="Ex: Vaso 17" className="p-2.5 border border-green-200 rounded-xl outline-none" 
            value={formData.potSize} onChange={e => setFormData({...formData, potSize: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-green-600 uppercase ml-1">Altura Atual (cm)</label>
          <input type="number" className="p-2.5 border border-green-200 rounded-xl outline-none" 
            value={formData.currentHeight} onChange={e => setFormData({...formData, currentHeight: Number(e.target.value)})} />
        </div>
        <div className="flex items-center gap-2 mt-4 ml-2">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 border-green-300" 
            checked={formData.includesPot} onChange={e => setFormData({...formData, includesPot: e.target.checked})} />
          <span className="text-xs font-bold text-gray-700 italic">Inclui Vaso Decorativo?</span>
        </div>
      </div>

      {/* Alertas de Segurança */}
      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex flex-wrap items-center gap-6">
        <span className="text-[10px] font-black text-red-600 uppercase">Segurança:</span>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300" 
            checked={formData.isToxicToPets} onChange={e => setFormData({...formData, isToxicToPets: e.target.checked})} />
          <span className="text-xs font-bold text-gray-700 group-hover:text-red-600 transition-colors">Tóxica para Pets</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300" 
            checked={formData.isToxicToChildren} onChange={e => setFormData({...formData, isToxicToChildren: e.target.checked})} />
          <span className="text-xs font-bold text-gray-700 group-hover:text-red-600 transition-colors">Tóxica para Crianças</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group ml-auto">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
            checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
          <span className="text-[10px] font-black text-green-700 uppercase">Em Stock</span>
        </label>
      </div>
    </div>
  );

case 'Veículos':
  return (
    <div className={`${baseStyle} bg-blue-50 border-blue-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-blue-200 pb-2">
        <div className="text-blue-700 text-xs font-black uppercase flex items-center gap-2">
          <Info size={14} className="text-blue-500"/> 
          Especificações Automóveis
        </div>
        <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Automotive Business
        </span>
      </div>

      {/* Identificação Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Marca</label>
          <input type="text" placeholder="Ex: BMW, Toyota" className="p-2.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
            value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Modelo</label>
          <input type="text" placeholder="Ex: Série 3, Corolla" className="p-2.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
            value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Ano</label>
          <input type="number" placeholder="2024" className="p-2.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
            value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Quilometragem (KM)</label>
          <input type="number" placeholder="0" className="p-2.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
            value={formData.mileage} onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} />
        </div>
      </div>

      {/* Performance e Técnica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Combustível</label>
          <select 
            className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none" 
            value={formData.fuelType} 
            onChange={e => setFormData({...formData, fuelType: e.target.value})}
          >
            <option value="Gasóleo">Gasóleo (Diesel)</option>
            <option value="Gasolina">Gasolina</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Elétrico">Elétrico</option>
            <option value="GPL">GPL</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Transmissão</label>
          <select 
            className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none" 
            value={formData.transmission} 
            onChange={e => setFormData({...formData, transmission: e.target.value})}
          >
            <option value="Manual">Manual</option>
            <option value="Automática">Automática</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Cilindrada (cc) / Potência (cv)</label>
          <div className="flex gap-2">
            <input type="text" placeholder="1600" className="w-1/2 p-2.5 border border-blue-200 rounded-xl outline-none" 
              value={formData.engineSize} onChange={e => setFormData({...formData, engineSize: e.target.value})} />
            <input type="number" placeholder="116" className="w-1/2 p-2.5 border border-blue-200 rounded-xl outline-none" 
              value={formData.horsePower} onChange={e => setFormData({...formData, horsePower: Number(e.target.value)})} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Condição</label>
          <select className="p-2.5 border border-blue-200 rounded-xl bg-white" 
            value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
            <option value="Novo">Novo (0km)</option>
            <option value="Seminovo">Seminovo</option>
            <option value="Usado">Usado</option>
          </select>
        </div>
      </div>

      {/* Extras e Equipamento */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-blue-600 uppercase ml-1 flex items-center gap-1">
          <Tag size={12}/> Extras e Equipamento <span className="text-[8px] font-normal">(separar por vírgula)</span>
        </label>
        <textarea 
          placeholder="Ex: GPS, Teto Abrir, Sensores Estacionamento, Estofos em Pele..."
          className="w-full p-3 border border-blue-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white/50"
          rows={2}
          value={formData.features?.join(', ')}
          onChange={e => setFormData({...formData, features: e.target.value.split(',').map(f => f.trim())})}
        />
      </div>

      {/* Footer de Status */}
      <div className="bg-white/40 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <input type="text" placeholder="Nº de Quadro (VIN)" className="bg-transparent border-b border-blue-200 text-xs outline-none w-48"
             value={formData.vinNumber} onChange={e => setFormData({...formData, vinNumber: e.target.value})} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
            checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
          <span className="text-[10px] font-black text-green-700 uppercase italic underline decoration-green-300">Publicar no Stand Virtual</span>
        </label>
      </div>
    </div>
  );
  case 'Acessórios Auto':
  return (
    <div className={`${baseStyle} bg-slate-50 border-slate-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="text-slate-700 text-xs font-black uppercase flex items-center gap-2">
          <Settings size={14} className="text-slate-500"/> Peças e Acessórios
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Part Number (Cód. Peça)</label>
          <input type="text" placeholder="Ex: OEM-992384-A" className="p-2.5 border border-slate-200 rounded-xl bg-white font-mono text-sm outline-none" 
            value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Garantia (Meses)</label>
          <input type="number" placeholder="24" className="p-2.5 border border-slate-200 rounded-xl bg-white outline-none" 
            value={formData.warrantyMonths} onChange={e => setFormData({...formData, warrantyMonths: Number(e.target.value)})} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-600 uppercase ml-1 flex items-center gap-1">
          Compatibilidade <span className="text-[8px] font-normal lowercase">(Marcas/Modelos separados por vírgula)</span>
        </label>
        <textarea rows={2} placeholder="Ex: VW Golf V, Audi A3 (2012-2018), BMW Série 1..."
          className="p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-500 bg-white/50"
          value={formData.compatibility?.join(', ')} 
          onChange={e => setFormData({...formData, compatibility: e.target.value.split(',').map(c => c.trim())})} />
      </div>
    </div>
  );
  case 'Informática':
  return (
    <div className={`${baseStyle} bg-zinc-50 border-zinc-200 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      <div className="flex items-center justify-between border-b border-zinc-300 pb-2">
        <div className="text-zinc-800 text-xs font-black uppercase flex items-center gap-2">
          <Cpu size={14} className="text-zinc-600"/> Especificações de Hardware
        </div>
        <span className="text-[8px] bg-zinc-800 text-white px-2 py-0.5 rounded font-mono italic">TECH_SPEC</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Marca</label>
          <input type="text" placeholder="Ex: Razer, Dell, Logitech" className="p-2.5 border border-zinc-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500" 
            value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Conectividade</label>
          <select className="p-2.5 border border-zinc-300 rounded-xl bg-white outline-none" 
            value={formData.connectionType} onChange={e => setFormData({...formData, connectionType: e.target.value})}>
            <option value="USB">USB-A</option>
            <option value="USB-C">USB-C</option>
            <option value="Wireless">Wireless 2.4GHz</option>
            <option value="Bluetooth">Bluetooth</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Sistemas Compatíveis</label>
          <input type="text" placeholder="Ex: Windows 11, MacOS, Linux" className="p-2.5 border border-zinc-300 rounded-xl outline-none" 
            value={formData.osCompatibility?.join(', ')} 
            onChange={e => setFormData({...formData, osCompatibility: e.target.value.split(',').map(o => o.trim())})} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Especificações Técnicas (RAM, CPU, Armazenamento)</label>
        <textarea rows={3} placeholder="Ex: 16GB RAM DDR5, SSD 1TB NVMe, Intel i7 13th Gen..."
          className="p-3 border border-zinc-300 rounded-xl font-mono text-xs outline-none bg-zinc-100/50"
          value={formData.specs} onChange={e => setFormData({...formData, specs: e.target.value})} />
      </div>
    </div>
  );
case 'Utensílios':
  return (
    <div className={`${baseStyle} bg-teal-50 border-teal-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      <div className="flex items-center justify-between border-b border-teal-200 pb-2">
        <div className="text-teal-700 text-xs font-black uppercase flex items-center gap-2">
          <Home size={14} className="text-teal-500"/> Detalhes do Utensílio
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-teal-600 uppercase ml-1">Material</label>
          <input type="text" placeholder="Ex: Inox, Silicone" className="p-2.5 border border-teal-200 rounded-xl bg-white outline-none" 
            value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-teal-600 uppercase ml-1">Capacidade / Volume</label>
          <input type="text" placeholder="Ex: 500ml, 2.5L" className="p-2.5 border border-teal-200 rounded-xl bg-white outline-none" 
            value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
        </div>
        <div className="flex items-center gap-3 bg-white/50 p-2.5 rounded-xl border border-teal-100 self-end">
          <input type="checkbox" className="w-5 h-5 rounded text-teal-600 border-teal-300" 
            checked={formData.isDishwasherSafe} onChange={e => setFormData({...formData, isDishwasherSafe: e.target.checked})} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-700 italic">Lava-louças</span>
            <span className="text-[9px] text-gray-400 uppercase">Seguro para máquina</span>
          </div>
        </div>
      </div>
    </div>
  );
     case 'Talho':
  return (
    <div className={`${baseStyle} bg-red-50 border-red-100 p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-top-2`}>
      {/* Header do Setor */}
      <div className="flex items-center justify-between border-b border-red-200 pb-2">
        <div className="text-red-700 text-xs font-black uppercase flex items-center gap-2">
          <Info size={14} className="text-red-500"/> 
          Controlo de Origem e Cortes
        </div>
        <span className="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase">
          Butcher & Meats
        </span>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Espécie/Origem */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-red-600 uppercase ml-1">Espécie do Animal</label>
          <select 
            className="w-full p-2.5 border border-red-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 outline-none" 
            value={formData.animalOrigin} 
            onChange={e => setFormData({...formData, animalOrigin: e.target.value})}
          >
            <option value="Bovino">Bovino (Vaca)</option>
            <option value="Suíno">Suíno (Porco)</option>
            <option value="Aves">Aves (Frango/Peru)</option>
            <option value="Caprino">Caprino (Cabrito)</option>
            <option value="Ovino">Ovino (Borrego)</option>
            <option value="Caça">Caça (Veado/Javali)</option>
          </select>
        </div>

        {/* Tipo de Corte */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-red-600 uppercase ml-1">Tipo de Corte</label>
          <input type="text" placeholder="Ex: Picanha, T-Bone" className="p-2.5 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-white" 
            value={formData.cutType} onChange={e => setFormData({...formData, cutType: e.target.value})} />
        </div>

        {/* Estado de Conservação */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-red-600 uppercase ml-1">Conservação</label>
          <select 
            className="w-full p-2.5 border border-red-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 outline-none" 
            value={formData.conservationState} 
            onChange={e => setFormData({...formData, conservationState: e.target.value})}
          >
            <option value="Fresco">Fresco</option>
            <option value="Congelado">Congelado</option>
            <option value="Maturado (Dry Aged)">Maturado (Dry Aged)</option>
            <option value="Vácuo">Embalado a Vácuo</option>
          </select>
        </div>

        {/* País de Origem */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-red-600 uppercase ml-1">Rastreabilidade (País)</label>
          <input type="text" placeholder="Ex: Portugal, Argentina" className="p-2.5 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" 
            value={formData.traceabilityCountry} onChange={e => setFormData({...formData, traceabilityCountry: e.target.value})} />
        </div>
      </div>

      {/* Detalhes Técnicos e Maturação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-red-600 uppercase ml-1">Teor de Gordura</label>
          <select className="p-2.5 border border-red-200 rounded-xl bg-white outline-none"
            value={formData.fatContent} onChange={e => setFormData({...formData, fatContent: e.target.value})}>
            <option value="Magra">Magra</option>
            <option value="Média">Média</option>
            <option value="Gorda">Gorda / Marmoreada</option>
          </select>
        </div>
        
        {formData.conservationState === 'Maturado (Dry Aged)' && (
          <div className="flex flex-col gap-1 animate-in zoom-in-95">
            <label className="text-[10px] font-bold text-red-600 uppercase ml-1">Dias de Maturação</label>
            <input type="number" placeholder="Ex: 30" className="p-2.5 border border-red-200 rounded-xl outline-none bg-orange-50" 
              value={formData.maturationDays} onChange={e => setFormData({...formData, maturationDays: Number(e.target.value)})} />
          </div>
        )}
      </div>

      {/* Selos e Certificações */}
      <div className="bg-white/60 p-4 rounded-2xl border border-red-100 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300" 
            checked={formData.isHalal} onChange={e => setFormData({...formData, isHalal: e.target.checked})} />
          <span className="text-xs font-bold text-gray-700 group-hover:text-red-600 transition-colors uppercase">Certificação Halal</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-green-300" 
            checked={formData.isOrganic} onChange={e => setFormData({...formData, isOrganic: e.target.checked})} />
          <span className="text-xs font-bold text-gray-700 group-hover:text-green-600 transition-colors uppercase">Biológico / Orgânico</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer group ml-auto">
          <input type="checkbox" className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300" 
            checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
          <span className="text-[10px] font-black text-red-700 uppercase italic underline decoration-red-300">Pronto para Venda</span>
        </label>
      </div>
    </div>
  );

      default: return null;
    }
  };



  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white"><Package size={20}/></div>
            <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Atualizar Produto' : 'Novo Produto'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X/></button>
        </div>

        <form onSubmit={onSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Image Uploader */}
          {isEditing && formData._id && (
            <div className="pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Galeria de Imagens</h3>
              <ImageUploader
                itemId={formData._id}
                itemType="product"
                existingImages={formData.images || []}
                onImagesUpdated={(images) => {
                  setFormData({ ...formData, images });
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informação Principal */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto *</label>
                <input required className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Setor/Categoria</label>
                  <select className="w-full p-2.5 border rounded-xl bg-gray-50 font-medium" 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {['Geral', 'Restaurante', 'Construção', 'Gráfica', 'Utensílios', 'Perfumaria', 'Calçados', 'Cabelos', 'Bijuteria', 'Plantas', 'Acessórios Auto', 'Veículos', 'Informática', 'Talho'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">SKU</label>
                  <input readOnly className="w-full p-2.5 border rounded-xl bg-gray-100 font-mono text-sm" value={formData.sku} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Curta (SEO/Portal) *</label>
                <textarea maxLength={160} rows={2} required className="w-full p-2.5 border rounded-xl outline-none" 
                  placeholder="Aparecerá nos resultados de busca (máx 160 caracteres)"
                  value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} />
                <p className="text-[10px] text-right text-gray-400">{formData.shortDescription?.length || 0}/160</p>
              </div>
            </div>

            {/* Financeiro e Stock */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-4 border border-gray-100">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase mb-2"><DollarSign size={14}/> Gestão Financeira</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Preço Venda</label>
                    <input type="number" className="w-full p-2 border rounded-lg font-bold text-blue-600" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Preço Custo</label>
                    <input type="number" className="w-full p-2 border rounded-lg" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Stock</label>
                    <input type="number" className="w-full p-2 border rounded-lg" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Unidade</label>
                    <input className="w-full p-2 border rounded-lg" placeholder="kg, un, dose" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>


          </div>
          {/* --- SEÇÃO SOB ENCOMENDA --- */}
<div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      // USE formData.madeToOrder em vez de product.madeToOrder
      checked={formData.madeToOrder || false} 
      onChange={e => setFormData({ ...formData, madeToOrder: e.target.checked })}
      className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
    />
    <div>
      <span className="font-bold text-blue-900">Vender sob encomenda?</span>
      <p className="text-xs text-blue-700">Ative se o produto exige produção ou encomenda externa.</p>
    </div>
  </label>

  {/* Campos Condicionais */}
  {formData.madeToOrder && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
      <div>
        <label className="block text-sm font-medium text-blue-900 mb-1">Valor Inicial</label>
        <input
          type="number"
          // USE formData.orderPrice
          value={formData.orderPrice || 0}
          onChange={e => setFormData({ ...formData, orderPrice: parseFloat(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-blue-900 mb-1">Dias Úteis para Entrega</label>
        <input
          type="number"
          // USE formData.deliveryDays
          value={formData.deliveryDays || 0}
          onChange={e => setFormData({ ...formData, deliveryDays: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
    </div>
  )}
</div>

          {/* Renderização dos Campos Específicos do Modelo */}
          <div className="mt-2">
            {renderSectorFields()}
          </div>

         <div className="pt-6 mt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3">
  {/* Botão Cancelar: Segundo plano no mobile, lateral no desktop */}
  <button 
    type="button" 
    onClick={onClose} 
    className="w-full sm:w-auto px-8 py-4 border border-gray-200 rounded-2xl sm:rounded-xl font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95 text-xs uppercase tracking-widest"
  >
    Cancelar
  </button>

  {/* Botão Principal: Destaque total no mobile (topo da pilha) */}
  <button 
    type="submit" 
    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl sm:rounded-xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 active:scale-[0.98] text-xs uppercase tracking-widest"
  >
    <Save size={18} className="shrink-0" /> 
    <span>
      {isEditing ? 'Salvar Alterações' : 'Finalizar Cadastro'}
    </span>
  </button>
</div>
        </form>
      </div>
    </div>
  );
};