import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Phone, Plus, MapPin, Upload, Trash2, Save, CreditCard, Smartphone, ExternalLink, Settings } from 'lucide-react';
import { api, API_BS_URL, companyApi, Company as CompanyType } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UsersManager from '../components/UsersManager';
import toast from 'react-hot-toast';

// Define proper types
interface BankAccount {
  _id?: string;           // useful if you later want to update/delete individually
  nibOrIban: string;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  isPrimary?: boolean;
}
interface MobileWallets {
  mpesa?: string;
  emola?: string;
  mkesh?: string;
  visa?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId: string;
  vatNumber: string;
  bankAccounts: BankAccount[];
  mobileWallets: MobileWallets;
  debitoMerchantId: string;
}
export const CompanyEdit: React.FC = () => {
const { user, refreshUser } = useAuth(); // refreshUser is now provided by AuthContext
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const navigate = useNavigate();
const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: { street: '', city: '', state: '', zipCode: '', country: '' },
    taxId: '',
    vatNumber: '',
    bankAccounts: [],
    mobileWallets: { mpesa: '', emola: '', mkesh: '', visa: '' },
    debitoMerchantId: '',
  });


// Load company data once on mount + when user changes
// Carregar dados frescos da empresa ao montar o componente
useEffect(() => {
  const loadCompanyData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const companyData = await companyApi.getProfile();   // ← Busca sempre fresca

      console.log("Dados da empresa carregados para edição:", companyData);

      setFormData({
        name: companyData.name || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        website: companyData.website || '',
        address: {
          street: companyData.address?.street || '',
          city: companyData.address?.city || '',
          state: companyData.address?.state || '',
          zipCode: companyData.address?.zipCode || '',
          country: companyData.address?.country || '',
        },
        taxId: companyData.taxId || '',
        vatNumber: companyData.vatNumber || '',
        bankAccounts: Array.isArray(companyData.bankAccounts) ? companyData.bankAccounts : [],
        mobileWallets: {
          mpesa: companyData.mobileWallets?.mpesa || '',
          emola: companyData.mobileWallets?.emola || '',
          mkesh: companyData.mobileWallets?.mkesh || '',
          visa: companyData.mobileWallets?.visa || '',
        },
        debitoMerchantId: companyData.debitoMerchantId || '',
      });

      // Atualiza também o preview do logo
      if (companyData.logo) {
        setLogoPreview(companyData.logo);
      }

    } catch (err: any) {
      console.error('Erro ao carregar dados da empresa para edição:', err);
      toast.error('Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  loadCompanyData();
}, [user]);   // Mantém dependência no user (para quando fizer logout/login)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);

  try {
    await companyApi.updateProfile(formData);
    toast.success('Perfil atualizado com sucesso');

    // atualiza contexto do usuário para refletir mudanças (logo, contas, etc.)
    if (refreshUser) {
      await refreshUser();
    }

    // redireciona para a página de visualização
    navigate('/company');
  } catch (err: any) {
    console.error('Erro ao atualizar perfil:', err);
    toast.error(err.message || 'Falha ao guardar alterações');
  } finally {
    setSaving(false);
  }
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Handle bank accounts (dynamic indices)
    if (name.startsWith('bankAccounts')) {
      const match = name.match(/bankAccounts\[(\d+)\]\.(.+)/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const field = match[2];
        setFormData((prev) => {
          const accounts = [...prev.bankAccounts];
          accounts[idx] = { ...accounts[idx], [field]: value };
          return { ...prev, bankAccounts: accounts };
        });
      }
      return;
    }

    // Nested objects (address, mobileWallets)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof FormData] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
const addBankAccount = () => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: [
        ...prev.bankAccounts,
        { nibOrIban: '', accountNumber: '', accountHolder: '', bankName: '', isPrimary: false },
      ],
    }));
  };
  const removeBankAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((_, i) => i !== index),
    }));
  };

  const setAsPrimary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((acc, i) => ({
        ...acc,
        isPrimary: i === index,
      })),
    }));
  };
const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // preview local file immediately
  setLogoPreview(URL.createObjectURL(file));

  try {
    setLoading(true);
    const data = await api.company.uploadLogo(file);
    toast.success('Logo carregado com sucesso');

    // server returns company object; if present update preview and context
    if (data && data.company && data.company.logo) {
      setLogoPreview(data.company.logo);
    }
    if (refreshUser) await refreshUser();
  } catch (error: any) {
    console.error('Erro ao carregar logo:', error);
    toast.error(error.message || 'Falha ao carregar o logo');
  } finally {
    setLoading(false);
  }
};
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Carregando dados da empresa...</p>
      </div>
    </div>
  );
}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Perfil da Empresa</h1>
          <p className="text-gray-600 mt-1">Atualize os dados da sua empresa e configure colaboradores</p>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* left preview column */}
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-6 shadow-sm text-center">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="h-24 w-24 mx-auto object-contain rounded-lg border mb-4" />
            ) : user?.company?.logo ? (
              <img src={user.company.logo} alt="Logo" className="h-24 w-24 mx-auto object-contain rounded-lg border mb-4" />
            ) : (
              <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <h2 className="text-xl font-semibold">{formData.name || 'Sem nome'}</h2>
            <p className="text-sm text-gray-600">{formData.email || ''}</p>
          </div>
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-2">Informações Básicas</h3>
            <p><strong>Telefone:</strong> {formData.phone || '—'}</p>
            <p><strong>Website:</strong> {formData.website || '—'}</p>
            <p><strong>Tax ID:</strong> {formData.taxId || '—'}</p>
            <p><strong>VAT:</strong> {formData.vatNumber || '—'}</p>
          </div>
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-2">Morada</h3>
            <p>{formData.address.street}</p>
            <p>{formData.address.city}{formData.address.state && ", " + formData.address.state}</p>
            <p>{formData.address.zipCode}{formData.address.country && " — " + formData.address.country}</p>
          </div>
        </div>

        {/* right form column */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Logo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Logo</h2>
              
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company Logo Preview"
                      className="h-20 w-20 object-contain border border-gray-200 rounded-lg"
                    />
                  ) : user?.company?.logo ? (
                    <img
                      src={user.company.logo}
                      alt="Company Logo"
                      className="h-20 w-20 object-contain border border-gray-200 rounded-lg"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="logo" className="cursor-pointer">
                    <div className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Upload className="h-5 w-5 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Upload Logo</span>
                    </div>
                    <input
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Recommended: 200x80px, PNG or JPG, max 5MB
                  </p>
                </div>
              </div>
            </div>

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
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.example.com"
                  />
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
              </div>
            </div> {/* FIXED: Properly closing Basic Information */}

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
            </div> {/* FIXED: Properly closing Address */}

            {/* Contas Bancárias */}
            <div className="bg-white border rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="text-blue-600" /> Contas Bancárias
              </h2>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-medium">Contas Bancárias</h3>
                  <button
                    type="button"
                    onClick={addBankAccount}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <Plus size={16} /> Adicionar conta
                  </button>
                </div>

                {formData.bankAccounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed">
                    Nenhuma conta bancária registada ainda
                  </div>
                ) : (
                  <div className="space-y-6">
                    {formData.bankAccounts.map((acc, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-5 ${acc.isPrimary ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">NIB / IBAN</label>
                            <input
                              name={`bankAccounts[${idx}].nibOrIban`}
                              value={acc.nibOrIban}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="MZ5900..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de Conta</label>
                            <input
                              name={`bankAccounts[${idx}].accountNumber`}
                              value={acc.accountNumber}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titular</label>
                            <input
                              name={`bankAccounts[${idx}].accountHolder`}
                              value={acc.accountHolder}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Banco</label>
                            <input
                              name={`bankAccounts[${idx}].bankName`}
                              value={acc.bankName}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Millennium BIM, BCI, Standard Bank..."
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-4">
                          <button
                            type="button"
                            onClick={() => setAsPrimary(idx)}
                            className={`px-4 py-1.5 text-sm rounded-md border transition ${
                              acc.isPrimary
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {acc.isPrimary ? 'Conta Principal ✓' : 'Definir como principal'}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeBankAccount(idx)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1.5"
                          >
                            <Trash2 size={16} /> Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Wallets */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Carteiras Móveis (Mobile Money)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label htmlFor="mobileWallets.mpesa" className="block text-sm font-medium text-gray-700 mb-2">
                      M-Pesa
                    </label>
                    <input
                      type="tel"
                      id="mobileWallets.mpesa"
                      name="mobileWallets.mpesa"
                      value={formData.mobileWallets.mpesa}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="+258 84 xxx xxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="mobileWallets.emola" className="block text-sm font-medium text-gray-700 mb-2">
                      e-Mola
                    </label>
                    <input
                      type="tel"
                      id="mobileWallets.emola"
                      name="mobileWallets.emola"
                      value={formData.mobileWallets.emola}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="+258 82 xxx xxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="mobileWallets.mkesh" className="block text-sm font-medium text-gray-700 mb-2">
                      mKesh
                    </label>
                    <input
                      type="tel"
                      id="mobileWallets.mkesh"
                      name="mobileWallets.mkesh"
                      value={formData.mobileWallets.mkesh}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="+258 86 xxx xxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="mobileWallets.visa" className="block text-sm font-medium text-gray-700 mb-2">
                      Visa/MC
                    </label>
                    <input
                      type="text"
                      id="mobileWallets.visa"
                      name="mobileWallets.visa"
                      value={formData.mobileWallets.visa}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Código da carteira"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Os números de telemóvel são usados nas faturas para referência de pagamento.
                </p>
              </div>

              {/* Link para Configurações de Pagamento */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Configurações Debito Pay</p>
                    <p className="text-xs text-blue-700">
                      Merchant ID, Token PAT e Webhook Secret — geridos separadamente
                    </p>
                  </div>
                </div>
                <Link
                  to="/payments"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-all"
                >
                  <ExternalLink size={14} />
                  Ir para Pagamentos
                </Link>
              </div>
            </div>
          </form>
        </div>
     
    </div>
     {/* Users management for admins */}
      {user?.role === 'admin' && (
        <div className="mt-8">
          <div className="bg-white w-full rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestão de Utilizadores</h2>
            <UsersManager />
          </div>
        </div>
      )}
      </div>
  );
};