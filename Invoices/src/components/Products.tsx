import React, { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Package, Eye, Edit, Trash2, BarChart2, Wallet } from 'lucide-react';
import { api, Product } from '../services/api';
import { ProductViewModal } from './ProductViewModal';
import { ProductForm } from './ProductForm';
import toast from 'react-hot-toast';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: 'Geral', basePrice: 0, stockQuantity: 0, 
    unit: 'un', images: [], shortDescription: '', sku: ''
  });

  const generateSKU = (name: string) => `${name.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await api.products.getAll();
      setProducts(data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };
const [profitStats, setProfitStats] = useState({
  lucroRealizado: 0,
  totalRevenue: 0,
});

const loadProfitStats = async () => {
  try {
    const data = await api.request('/products/profit-stats');   // ← importante usar api.request
    console.log("📊 Profit Stats recebido:", data);
    setProfitStats(data);
  } catch (error) {
    console.error('Erro ao carregar lucro realizado:', error);
    // Mantém valores em 0 se falhar
  }
};

// No useEffect:
useEffect(() => {
  loadProducts();
  loadProfitStats();
}, []);
  // Cálculos de Contabilidade
const stats = {
  totalRegistado: products.length,
  totalPublicado: products.filter(p => p.isActive).length,
  totalNaoPublicado: products.filter(p => !p.isActive).length,
  
  valorTotalStock: products.reduce((acc, p) => acc + (p.basePrice * (p.stockQuantity || 0)), 0),

  lucroPotencialStock: products.reduce((acc, p) => {
    const profitPerUnit = (p.basePrice || 0) - (p.costPrice || 0);
    return acc + (profitPerUnit * (p.stockQuantity || 0));
  }, 0),

  // Lucro Realizado vindo do backend
  lucroRealizado: profitStats.lucroRealizado,
};
  const handleOpenForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: 'Geral', basePrice: 0, stockQuantity: 0, unit: 'un', images: [], shortDescription: '', sku: '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, sku: formData.sku || generateSKU(formData.name!) };
      if (editingProduct) {
        await api.products.update(editingProduct._id, payload);
        toast.success('Atualizado!');
      } else {
        await api.products.create(payload);
        toast.success('Criado!');
      }
      setShowForm(false);
      loadProducts();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setDeleteConfirmProduct(product);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmProduct) return;

    try {
      setIsDeleting(true);
      await api.products.delete(deleteConfirmProduct._id);
      toast.success('Produto eliminado com sucesso');
      setDeleteConfirmProduct(null);
      loadProducts();
    } catch (error) {
      toast.error('Erro ao eliminar produto');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
  {/* Lado Esquerdo: Título e Ícone */}
  <div className="flex items-center gap-3">
    <div className="p-2.5 bg-blue-50 rounded-lg lg:hidden">
      <Package className="w-6 h-6 text-blue-600" />
    </div>
    <div>
      <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
        <Package className="hidden lg:block text-blue-600 w-6 h-6" /> 
        Inventário
      </h2>
      <p className="text-xs text-gray-500 font-medium hidden sm:block">
        Controle o stock e disponibilidade dos seus produtos.
      </p>
    </div>
  </div>

  {/* Lado Direito: Botão de Ação */}
  <button 
    onClick={() => handleOpenForm()} 
    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 sm:py-2.5 rounded-2xl sm:rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-95"
  >
    <Plus size={20} className="shrink-0" />
    <span className="uppercase tracking-widest text-xs">Novo Item</span>
  </button>
</div>
{/* Dashboard de Contabilidade de Stock - Melhorado */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  
  {/* Total Registado */}
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
        <Package size={20} />
      </div>
      <span className="text-[10px] font-black text-blue-500 uppercase">Total Geral</span>
    </div>
    <p className="text-3xl font-black text-gray-800">{stats.totalRegistado}</p>
    <p className="text-xs text-gray-400">Itens no sistema</p>
  </div>

  {/* Publicados vs Não Publicados */}
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
    <div className="flex justify-between items-center mb-4">
       <span className="text-[10px] font-black text-gray-400 uppercase">Visibilidade</span>
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <div className="w-2 h-2 rounded-full bg-green-500"></div> Publicados
        </div>
        <span className="text-sm font-black text-green-600">{stats.totalPublicado}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div> Não Publicados
        </div>
        <span className="text-sm font-black text-amber-600">{stats.totalNaoPublicado}</span>
      </div>
    </div>
  </div>

  {/* Valor Total em Stock */}
  <div className="bg-gray-900 p-5 rounded-xl shadow-lg">
    <div className="flex justify-between items-start mb-2 text-gray-400">
      <Wallet size={20} className="text-blue-400" />
      <span className="text-[10px] font-black uppercase">Valor em Stock</span>
    </div>
    <p className="text-3xl font-black text-white">
      {stats.valorTotalStock.toLocaleString('pt-MZ')} <span className="text-xs text-blue-400">MT</span>
    </p>
  </div>

  {/* Lucro Potencial no Stock */}
  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
        <DollarSign size={20} />
      </div>
      <span className="text-[10px] font-black text-emerald-600 uppercase">Lucro Potencial</span>
    </div>
    <p className="text-3xl font-black text-emerald-700">
      {stats.lucroPotencialStock.toLocaleString('pt-MZ')} <span className="text-sm">MT</span>
    </p>
    <p className="text-xs text-emerald-600/70">Se vender todo o stock atual</p>
  </div>

 {/* Lucro Realizado (Vendas) */}
<div className="bg-green-600 text-white p-5 rounded-xl col-span-1 md:col-span-2 lg:col-span-1">
  <div className="flex justify-between items-start mb-2">
    <div className="p-2 bg-white/20 rounded-xl">
      <BarChart2 size={20} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest">Lucro Realizado</span>
  </div>
  <p className="text-3xl font-black">
    {stats.lucroRealizado.toLocaleString('pt-MZ')} <span className="text-sm opacity-75">MT</span>
  </p>
  <p className="text-xs opacity-75 mt-1">
    Lucro obtido com vendas realizadas
  </p>
</div>
</div>
      {/* Lista de Produtos (Tabela ou Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
          <div key={product._id} onClick={() => setViewingProduct(product)} className="bg-white p-5 rounded-2xl border hover:shadow-xl transition group relative">
             {/* Badge de Status */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[8px] font-black uppercase z-10 ${
                    product.isActive ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                    {product.isActive ? 'Publicado' : 'Privado'}
                </div>
             
             <div className="h-32 bg-gray-100 rounded-xl mb-4 overflow-hidden">
               {product.images?.[0] ? <img src={product.images[0]} className="w-full h-full object-cover"/> : <Package className="w-full h-full p-8 text-gray-300"/>}
             </div>
             <div className="flex justify-between items-start">
               <div>
                 <span className="text-[10px] font-bold text-blue-500 uppercase">{product.category}</span>
                 <h4 className="font-bold text-gray-800">{product.name}</h4>
                 <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
               </div>
               <p className="font-black text-lg">{product.basePrice} MZN</p>
             </div>
             
             <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition">
               <button onClick={(e) => { e.stopPropagation(); handleOpenForm(product); }} className="flex-1 bg-gray-100 py-2 rounded-lg hover:bg-amber-100 hover:text-amber-600 transition flex items-center justify-center"><Edit size={16}/></button>
               <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product); }} className="flex-1 bg-gray-100 py-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center"><Trash2 size={16}/></button>
             </div>
          </div>
        ))}

        {products.map(product => (
  <div key={product._id} className="...">
    <div className="flex items-center gap-2">
      <span>{product.name}</span>
      {product.stockQuantity <= product.minStockLevel && (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
          Stock baixo: {product.stockQuantity}
        </span>
      )}
      {product.stockQuantity <= 0 && !product.madeToOrder && (
        <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
          Sem stock
        </span>
      )}
    </div>
    {/* resto */}
  </div>
))}
      </div>

      {showForm && (
        <ProductForm 
          formData={formData} 
          setFormData={setFormData} 
          onSubmit={handleSubmit} 
          onClose={() => setShowForm(false)} 
          isEditing={!!editingProduct} 
        />
      )}
      {viewingProduct && (
        <ProductViewModal 
          product={viewingProduct} 
          onClose={() => setViewingProduct(null)} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                Confirmar Eliminação
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-600 font-medium">
                Tem a certeza que deseja eliminar o produto:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-bold text-gray-900">{deleteConfirmProduct.name}</p>
                <p className="text-sm text-gray-500 font-mono">{deleteConfirmProduct.sku}</p>
              </div>
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Esta ação é irreversível e eliminará todo o histórico do produto.
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Eliminar Produto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};