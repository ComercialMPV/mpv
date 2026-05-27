import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { suppliersApi, Supplier } from '../services/api';
import toast from 'react-hot-toast';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
  });

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      
      const response = await suppliersApi.getAll(params);
      setSuppliers(response.suppliers);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    try {
      await suppliersApi.delete(id);
      toast.success('Supplier deleted successfully');
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
  {/* Título e Subtítulo */}
  <div className="space-y-1">
    <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
      Fornecedores
    </h1>
    <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
      Gerencie as suas relações e parcerias com fornecedores.
    </p>
  </div>

  {/* Botão de Ação Adaptável */}
  <Link
    to="/suppliers/new"
    className="w-full sm:w-auto flex items-center justify-center px-6 py-3.5 md:py-2.5 bg-blue-600 text-white rounded-2xl md:rounded-xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-900/10"
  >
    <Plus className="h-5 w-5 mr-2 shrink-0" />
    Adicionar Fornecedor
  </Link>
</div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {suppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {suppliers.map((supplier) => (
                  <div key={supplier._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                        {supplier.contactPerson && (
                          <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/suppliers/${supplier._id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(supplier._id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                      {supplier.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.address?.city && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {[supplier.address.city, supplier.address.state]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-xs">
                            <span className="text-gray-500">Payment Terms</span>
                            <p className="font-medium text-gray-900">{supplier.paymentTerms}</p>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Currency</span>
                            <p className="font-medium text-gray-900">{supplier.currency}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          supplier.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search 
                    ? 'Try adjusting your search criteria.' 
                    : 'Get started by adding your first supplier.'}
                </p>
                <div className="mt-6">
                  <Link
                    to="/suppliers/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};