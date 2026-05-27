import React, { useState, useEffect } from 'react';
import { api, companyApi } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Wallet, 
  CreditCard, 
  Key, 
  Save, 
  Loader2, 
  Info,
  Smartphone,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';

interface PaymentConfig {
  // Wallet codes
  mpesa: string;
  emola: string;
  visa: string;
  // Debito Pay
  debitoMerchantId: string;
  debitoPat: string;
  debitoWebhookSecret: string;
}

export const PaymentsSettings: React.FC = () => {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaymentConfig>({
    mpesa: '',
    emola: '',
    visa: '',
    debitoMerchantId: '',
    debitoPat: '',
    debitoWebhookSecret: '',
  });
  const [initialConfig, setInitialConfig] = useState<PaymentConfig | null>(null);
  const [showPat, setShowPat] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  const hasChanges = initialConfig !== null && Object.keys(config).some(
    (key) => config[key as keyof PaymentConfig] !== initialConfig![key as keyof PaymentConfig]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const company = await companyApi.getProfile();
        const loaded: PaymentConfig = {
          mpesa: company.mobileWallets?.mpesa || '',
          emola: company.mobileWallets?.emola || '',
          visa: company.mobileWallets?.visa || '',
          debitoMerchantId: company.debitoMerchantId || '',
          debitoPat: company.debitoPat || '',
          debitoWebhookSecret: company.debitoWebhookSecret || '',
        };
        setConfig(loaded);
        setInitialConfig(loaded);
      } catch (err: any) {
        toast.error('Erro ao carregar configurações de pagamento');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await companyApi.updateProfile({
        mobileWallets: {
          mpesa: config.mpesa.trim(),
          emola: config.emola.trim(),
          visa: config.visa.trim(),
        },
        debitoMerchantId: config.debitoMerchantId.trim(),
        debitoPat: config.debitoPat.trim(),
        debitoWebhookSecret: config.debitoWebhookSecret.trim(),
      });
      toast.success('Configurações de pagamento atualizadas!');
      setInitialConfig({ ...config });
      await refreshUser?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Wallet className="text-blue-600" />
          Configurações de Pagamento
        </h1>
        <p className="text-slate-500 mt-1">
          Configure as wallets e credenciais de integração para receber pagamentos
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Seção 1: Carteiras Móveis */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Smartphone size={18} />
              Carteiras Móveis — Códigos Wallet
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Códigos de carteira fornecidos pela Debito Pay. Se deixar vazio, serão usados os códigos mestres do servidor.
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'mpesa', label: 'M-Pesa', color: 'text-red-600', placeholder: 'Ex: 50096' },
              { id: 'emola', label: 'E-Mola', color: 'text-orange-500', placeholder: 'Ex: 27254' },
              { id: 'visa', label: 'Visa/MC', color: 'text-blue-600', placeholder: 'Ex: 81048' },
            ].map((f) => (
              <div key={f.id} className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Smartphone size={14} className={f.color} />
                  {f.label}
                </label>
                <input
                  name={f.id}
                  type="text"
                  value={config[f.id as keyof PaymentConfig]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Seção 2: Merchant ID */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Globe size={18} />
              ID do Comerciante
            </h3>
          </div>
          <div className="p-6">
            <div className="max-w-md space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Merchant ID (Debito Pay)
              </label>
              <input
                name="debitoMerchantId"
                type="text"
                value={config.debitoMerchantId}
                onChange={handleChange}
                placeholder="Ex: merchant_xxxxxxxxx"
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-mono"
              />
              <p className="text-xs text-slate-400">
                Se deixar vazio, será usado o ID configurado nas variáveis de ambiente do servidor.
              </p>
            </div>
          </div>
        </div>

        {/* Seção 3: Debito Pay — Chaves de API */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Key size={18} />
              Credenciais Debito Pay
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {/* PAT */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Token de Autorização (DEBITO_PAT)
                </label>
                <div className="relative">
                  <input
                    name="debitoPat"
                    type={showPat ? 'text' : 'password'}
                    value={config.debitoPat}
                    onChange={handleChange}
                    placeholder="••••••••••••••••"
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPat(!showPat)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPat ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Webhook Secret (DEBITO_WEBHOOK_SECRET)
                </label>
                <div className="relative">
                  <input
                    name="debitoWebhookSecret"
                    type={showWebhook ? 'text' : 'password'}
                    value={config.debitoWebhookSecret}
                    onChange={handleChange}
                    placeholder="••••••••••••••••"
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhook(!showWebhook)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showWebhook ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <div className="flex gap-3">
                <Info className="text-amber-600 shrink-0" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Estas credenciais permitem que o sistema processe pagamentos em nome da sua empresa.
                  Mantenha-as seguras. Se deixar vazio, serão usados os valores configurados no servidor.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ações */}
        <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl shadow-xl shadow-slate-200">
          <div className="hidden md:flex items-center gap-3 text-slate-400 ml-2">
            {hasChanges ? (
              <div className="flex items-center gap-2 text-amber-400 text-sm animate-pulse">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                Alterações não guardadas
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 size={16} />
                Tudo atualizado
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !hasChanges}
            className={`
              relative flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all
              ${!hasChanges || saving 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/20'}
            `}
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentsSettings;
