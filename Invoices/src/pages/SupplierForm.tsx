import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Phone, MapPin, Building2, User, CreditCard } from 'lucide-react';
import { suppliersApi, Supplier } from '../services/api';
import toast from 'react-hot-toast';

export const SupplierForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    taxId: '',
    vatNumber: '',
    paymentTerms: 'Net 60',
    currency: 'MT',
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    if (id) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const supplier = await suppliersApi.getById(id!);
      setFormData({
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone || '',
        contactPerson: supplier.contactPerson || '',
        address: supplier.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        taxId: supplier.taxId || '',
        vatNumber: supplier.vatNumber || '',
        paymentTerms: supplier.paymentTerms,
        currency: supplier.currency,
        notes: supplier.notes || '',
        isActive: supplier.isActive,
      });
    } catch (error) {
      console.error('Error loading supplier:', error);
      toast.error('Failed to load supplier');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      if (isEdit) {
        await suppliersApi.update(id!, formData);
        toast.success('Supplier updated successfully');
      } else {
        await suppliersApi.create(formData);
        toast.success('Supplier created successfully');
      }
      
      navigate('/suppliers');
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
  {/* Botão de Navegação Estilo Breadcrumb */}
  <button
    onClick={() => navigate('/suppliers')}
    className="group flex items-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors w-fit"
  >
    <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
    Voltar para Fornecedores
  </button>

  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
    {/* Título e Subtítulo */}
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
        {isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      </h1>
      <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-md">
        {isEdit ? 'Atualize os detalhes de contacto e fornecimento.' : 'Registe um novo fornecedor para a sua cadeia logística.'}
      </p>
    </div>
    
    {/* Botão de Ação Principal: Adaptável */}
    <button
      onClick={handleSubmit}
      disabled={loading}
      className="w-full md:w-auto flex items-center justify-center px-8 py-4 md:py-3 bg-blue-600 text-white rounded-2xl md:rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-blue-900/10"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>A Guardar...</span>
        </div>
      ) : (
        <>
          <Save className="h-5 w-5 mr-2 shrink-0" />
          {isEdit ? 'Atualizar Fornecedor' : 'Criar Fornecedor'}
        </>
      )}
    </button>
  </div>
</div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Building2 className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <div className="relative">
                <User className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contact person name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <div className="relative">
                <CreditCard className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="paymentTerms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Net 30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MT">MT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>

            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID
              </label>
              <input
                type="text"
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tax identification number"
              />
            </div>

            <div>
              <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-2">
                VAT Number
              </label>
              <input
                type="text"
                id="vatNumber"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VAT registration number"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active supplier
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Address</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                id="address.street"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                id="address.city"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                id="address.state"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter state or province"
              />
            </div>

            <div>
              <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                id="address.zipCode"
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter ZIP or postal code"
              />
            </div>

            <div>
              <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                id="address.country"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter country"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any additional notes about this supplier..."
          />
        </div>
      </form>
    </div>
  );
};