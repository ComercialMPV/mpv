import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Phone, MapPin, Building2, User, CreditCard } from 'lucide-react';
import { clientsApi, Client } from '../services/api';
import toast from 'react-hot-toast';

export const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    taxId: '',
    vatNumber: '',
    paymentTerms: 'Net 30',
    currency: 'MT',
    balance: 0,
    notes: '',
     // This should be set to the actual user ID in a real application
    isActive: true,
    isWalkIn: false,
  });
  const [sameAsbilling, setSameAsbilling] = useState(true);

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const client = await clientsApi.getById(id!);
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        contactPerson: client.contactPerson || '',
        billingAddress: client.billingAddress || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        shippingAddress: client.shippingAddress || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        taxId: client.taxId || '',
        vatNumber: client.vatNumber || '',
        paymentTerms: client.paymentTerms,
        currency: client.currency,
        balance: client.balance || 0,
        notes: client.notes || '',
         // This should be set to the actual user ID in a real application
        isActive: client.isActive,
        isWalkIn: client.isWalkIn ?? false,
      });
      
      // Check if shipping address is the same as billing
      const billing = client.billingAddress || {};
      const shipping = client.shippingAddress || {};
      const isSame = Object.keys(billing).every(key => billing[key] === shipping[key]);
      setSameAsbilling(isSame);
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    setLoading(true);
    
    const clientData = {
      ...formData,
      shippingAddress: sameAsbilling ? formData.billingAddress : formData.shippingAddress,
    };

    if (isEdit) {
      await clientsApi.update(id!, clientData);
      toast.success('Cliente atualizado com sucesso');
    } else {
      // === NOVA LÓGICA DE VERIFICAÇÃO DE DUPLICADOS ===
      try {
        await clientsApi.create(clientData);
        toast.success('Cliente criado com sucesso');
      } catch (err: any) {
        if (err.response?.status === 409) {
          const existing = err.response.data.existingClient;
          
          const confirmUpdate = window.confirm(
            `Já existe um cliente com o nome "${existing.name}" e email "${existing.email}".\n\n` +
            `Deseja atualizar os dados deste cliente em vez de criar um novo?`
          );

          if (confirmUpdate && existing._id) {
            // Atualiza o cliente existente (mantém createdBy original)
            await clientsApi.update(existing._id, clientData);
            toast.success('Cliente atualizado com sucesso');
          } else {
            // Usuário cancelou → não faz nada
            setLoading(false);
            return;
          }
        } else {
          throw err; // outros erros
        }
      }
    }
    
    navigate('/clients');
  } catch (error: any) {
    console.error('Error saving client:', error);
    toast.error(error.response?.data?.message || 'Falha ao guardar cliente');
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
  {/* Botão Voltar - Sempre no topo no Mobile */}
  <button
    onClick={() => navigate('/clients')}
    className="group flex items-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors w-fit"
  >
    <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
    Voltar para Clientes
  </button>

  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
    {/* Título e Subtítulo */}
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
        {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
      </h1>
      <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
        {isEdit ? 'Atualize as informações de contacto e faturação.' : 'Registe um novo cliente nos seus contactos.'}
      </p>
    </div>
    
    {/* Botão de Ação Principal */}
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
          {isEdit ? 'Atualizar Cliente' : 'Criar Cliente'}
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
              <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-2">
                Saldo (Carteira)
              </label>
              <input
                type="number"
                id="balance"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
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
                <option value="ZAR">ZAR</option>
                <option value="CAD">CAD</option>               
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
                  Active client
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Billing Address</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="billingAddress.street" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                id="billingAddress.street"
                name="billingAddress.street"
                value={formData.billingAddress.street}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label htmlFor="billingAddress.city" className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                id="billingAddress.city"
                name="billingAddress.city"
                value={formData.billingAddress.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label htmlFor="billingAddress.state" className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                id="billingAddress.state"
                name="billingAddress.state"
                value={formData.billingAddress.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter state or province"
              />
            </div>

            <div>
              <label htmlFor="billingAddress.zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                id="billingAddress.zipCode"
                name="billingAddress.zipCode"
                value={formData.billingAddress.zipCode}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter ZIP or postal code"
              />
            </div>

            <div>
              <label htmlFor="billingAddress.country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                id="billingAddress.country"
                name="billingAddress.country"
                value={formData.billingAddress.country}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter country"
              />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
  {/* Header: Título e Checkbox de Sincronização */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-50 rounded-lg">
        <MapPin className="h-5 w-5 text-blue-600" />
      </div>
      <h2 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-widest">
        Endereço de Envio
      </h2>
    </div>

    <label className="flex items-center gap-3 p-3 bg-gray-50 sm:bg-transparent rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          id="sameAsBilling"
          checked={sameAsbilling}
          onChange={(e) => setSameAsbilling(e.target.checked)}
          className="peer h-5 w-5 opacity-0 absolute cursor-pointer"
        />
        {/* Custom Checkbox para facilitar o toque no Mobile */}
        <div className="h-5 w-5 border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
      </div>
      <span className="text-xs md:text-sm font-bold text-gray-600">
        Igual ao endereço de faturação
      </span>
    </label>
  </div>

  {/* Formulário de Endereço */}
  {!sameAsbilling ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
      <div className="md:col-span-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
          Rua e Número
        </label>
        <input
          type="text"
          name="shippingAddress.street"
          value={formData.shippingAddress.street}
          onChange={handleChange}
          className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          placeholder="Ex: Av. Eduardo Mondlane, 123"
        />
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
          Cidade
        </label>
        <input
          type="text"
          name="shippingAddress.city"
          value={formData.shippingAddress.city}
          onChange={handleChange}
          className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          placeholder="Cidade"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Província
          </label>
          <input
            type="text"
            name="shippingAddress.state"
            value={formData.shippingAddress.state}
            onChange={handleChange}
            className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            placeholder="Província"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Código Postal
          </label>
          <input
            type="text"
            name="shippingAddress.zipCode"
            value={formData.shippingAddress.zipCode}
            onChange={handleChange}
            className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            placeholder="0000"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
          País
        </label>
        <input
          type="text"
          name="shippingAddress.country"
          value={formData.shippingAddress.country}
          onChange={handleChange}
          className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          placeholder="País"
        />
      </div>
    </div>
  ) : (
    /* Estado Sincronizado */
    <div className="flex flex-col items-center justify-center py-10 px-4 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
      <div className="bg-white p-3 rounded-full shadow-sm mb-3">
        <MapPin className="h-6 w-6 text-blue-600" />
      </div>
      <p className="text-xs md:text-sm font-bold text-blue-800 text-center">
        Endereço de envio sincronizado com o de faturação.
      </p>
      <p className="text-[10px] text-blue-500 mt-1 uppercase tracking-widest font-medium">
        (Os dados serão os mesmos)
      </p>
    </div>
  )}
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
            placeholder="Add any additional notes about this client..."
          />
        </div>
      </form>
    </div>
  );
};