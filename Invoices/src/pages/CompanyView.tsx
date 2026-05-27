import React from 'react';
import { Building2, Mail, Phone, ChevronDown, Search, MapPin, CreditCard, Smartphone, Edit, CheckCircle2, Globe, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BS_URL, usersApi, companyApi } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { USER_ROLES } from '../constants/roles';

export const CompanyView: React.FC = () => {
  const { user } = useAuth();
  // Estado local para garantir que os dados são os mais recentes
  const [company, setCompany] = React.useState<any>(user?.company || null);
  const [loading, setLoading] = React.useState(!user?.company);

React.useEffect(() => {
  const fetchCompany = async () => {
    try {
      setLoading(true);
      const data = await companyApi.getProfile(); 
      
      console.log("Dados recebidos da API:", data); 
      
      // Se o backend envia res.json(company), o 'data' JÁ É a empresa.
      // Remova o .company se o backend não estiver encapsulando dentro de uma chave.
      setCompany(data); 
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };
  fetchCompany();
}, []);

  if (loading) return <div className="p-8 text-center">Carregando dados...</div>;
  if (!company) return <div className="p-8 text-center">Nenhuma empresa encontrada.</div>;



return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header Refinado */}
      <div className="flex items-start justify-between bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-6 text-center lg:text-left">
  {/* Logo Container - Increased size and centered */}
  <div className="flex flex-col lg:flex-row items-center gap-6 w-full lg:w-auto">
    <div className="h-32 w-32 shrink-0 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
      {company.logo ? (
        <img src={company.logo} alt="Logo" className="h-full w-full object-contain" />
      ) : (
        <Building2 className="h-14 w-14 text-slate-300" />
      )}
    </div>

    {/* Content Wrapper */}
    <div className="flex flex-col items-center lg:items-start">
      <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
        {company.name}
      </h1>
      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-6 gap-y-2 mt-3 text-slate-500 text-sm">
        <span className="flex items-center gap-1.5">
          <Mail size={16} className="text-slate-400" /> {company.email}
        </span>
        {company.phone && (
          <span className="flex items-center gap-1.5">
            <Phone size={16} className="text-slate-400" /> {company.phone}
          </span>
        )}
      </div>
    </div>
  </div>

  {/* Action Button - Full width on mobile, auto on desktop */}
  <Link 
    to="/company/edit" 
    className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm"
  >
    <Edit size={16} /> Editar Perfil
  </Link>
</div>
      
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Informações Básicas (Col span 2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 className="text-blue-600" size={20} /> Detalhes Corporativos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            {[
              { label: 'Website', value: company.website, icon: Globe },
              { label: 'NIF / NUIPC', value: company.taxId, icon: Hash },
              { label: 'NUIT / IVA', value: company.vatNumber, icon: Hash },
            ].map((item, i) => (
              <div key={i}>
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</dt>
                <dd className="mt-1.5 text-slate-700 font-medium">{item.value || '—'}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2"><MapPin size={14}/> Morada</dt>
              <dd className="text-slate-700">{company.address?.street}, {company.address?.city} - {company.address?.country}</dd>
            </div>
          </div>
        </div>

        {/* Carteiras Móveis (Col span 1) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Smartphone className="text-blue-600" size={20} /> Pagamentos Móveis
          </h3>
          <div className="space-y-4">
            {['mpesa', 'emola', 'mkesh', 'visa'].map((wallet) => (
              <div key={wallet} className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <span className="text-sm font-medium text-slate-600 uppercase">{wallet}</span>
                <span className="text-sm font-mono text-slate-900">{company.mobileWallets?.[wallet] || '—'}</span>
              </div>
            ))}
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border-t border-slate-200 mt-2">
              <span className="text-sm font-medium text-slate-600">Debito Merchant ID</span>
              <span className="text-sm font-mono text-slate-900">{company.debitoMerchantId || '— (usando ID do servidor)'}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
              <span className="text-sm font-medium text-slate-600">DEBITO_PAT</span>
              <span className="text-sm font-mono text-slate-900">
                {company.debitoPat ? '••••••••' + company.debitoPat.slice(-4) : '— (usando do servidor)'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
              <span className="text-sm font-medium text-slate-600">Webhook Secret</span>
              <span className="text-sm font-mono text-slate-900">
                {company.debitoWebhookSecret ? '••••••••' + company.debitoWebhookSecret.slice(-4) : '— (usando do servidor)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contas Bancárias */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <CreditCard className="text-blue-600" size={20} /> Contas Bancárias
        </h3>
        {company.bankAccounts?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {company.bankAccounts.map((acc: any, i: number) => (
              <div key={i} className={`p-5 rounded-xl border ${acc.isPrimary ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-slate-800">{acc.bankName}</span>
                  {acc.isPrimary && <CheckCircle2 className="text-blue-600" size={18} />}
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>Titular: {acc.accountHolder}</p>
                  <p className="font-mono text-slate-900 bg-white px-2 py-1 rounded border inline-block mt-1">{acc.nibOrIban}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm italic">Nenhuma conta bancária registada.</p>
        )}
      </div>
    </div>
  );
};