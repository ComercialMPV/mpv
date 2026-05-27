import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { 
  Eye, Globe, Link2, Copy, Check, ExternalLink 
} from 'lucide-react';
import { adminBuiltInVariantsApi, companyApi } from '../services/api';
import toast from 'react-hot-toast';
import { PortalCustomizationForm } from '@/components/PortalCustomizationForm';
import { Link } from 'react-router-dom';
import { VARIANTS_META } from '../config/portalRegistry';
import { useAuth } from '../contexts/AuthContext';

const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_PORTAL_BASE_URL || 'http://localhost:5173/public';

const DEFAULT_VARIANTS = VARIANTS_META as any;

export default function PortalCustomization() {
  const { user } = useAuth();
  const [variants, setVariants] = useState(DEFAULT_VARIANTS);
  const [builtInMap, setBuiltInMap] = useState<Record<string, any>>({});
  const [paidCount, setPaidCount] = useState(0);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Portal States
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalPublishing, setPortalPublishing] = useState(false);
  const [portalStatus, setPortalStatus] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('default');
  const [customSlug, setCustomSlug] = useState<string>('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Subdomínio Personalizado
  const [subdomainPrefix, setSubdomainPrefix] = useState<string>('');
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Subdomínio Automático (Sugestão)
  const [suggestedSubdomain, setSuggestedSubdomain] = useState<string>('');

  const isSuperAdmin = user?.role === 'superadmin';

  // Carrega variantes built-in para saber quais são pagas
  useEffect(() => {
    const loadBuiltInVariants = async () => {
      try {
        const data = await adminBuiltInVariantsApi.getAll();
        const map: Record<string, any> = {};
        let paid = 0;
        data.forEach((v: any) => {
          map[v.variantId] = v;
          if (v.isPaid || v.tier === 'premium') paid++;
        });
        setBuiltInMap(map);
        setPaidCount(paid);
      } catch (err) {
        console.error('Erro ao carregar variantes:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadBuiltInVariants();
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const portalData = await companyApi.getPublicPortalStatus();
        
        if (portalData) {
          setPortalStatus(portalData);
          
          if (portalData.enabled) {
            setSelectedVariant(portalData.variant || 'default');
            setCustomSlug(portalData.slug || '');
            setSubdomainPrefix(portalData.subdomainPrefix || '');
          } else {
            setSuggestedSubdomain(portalData.suggestedSubdomain || '');
          }

          if (portalData.companyName && !portalData.subdomainPrefix) {
            const suggested = portalData.companyName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .replace(/-+/g, '-');

            setSuggestedSubdomain(suggested);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Falha ao carregar configurações do portal');
      } finally {
        setPortalLoading(false);
      }
    };

    loadAll();
  }, []);

  // Opções filtradas: free + purchased (ou todas para superadmin)
  const filteredOptions = useMemo(() => {
    return DEFAULT_VARIANTS.filter((v: any) => {
      if (isSuperAdmin) return true;
      const meta = builtInMap[v.id];
      const isPaid = meta?.isPaid || meta?.tier === 'premium' || false;
      if (!isPaid) return true;
      const purchased = portalStatus?.variantPurchased && portalStatus?.variant === v.id;
      return purchased;
    });
  }, [builtInMap, portalStatus, isSuperAdmin]);

  const unavailablePaidCount = useMemo(() => {
    if (isSuperAdmin) return 0;
    let purchased = 0;
    if (portalStatus?.variantPurchased && portalStatus?.variant) {
      purchased = 1;
    }
    return Math.max(0, paidCount - purchased);
  }, [paidCount, portalStatus, isSuperAdmin]);

  const validateSlug = (value: string): string | null => {
    if (!value) return null;
    if (value.length < 3) return 'O slug deve ter pelo menos 3 caracteres';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return 'Apenas letras minúsculas, números e hífens são permitidos';
    }
    return null;
  };

  const validateSubdomain = (value: string): string | null => {
    if (!value) return null;
    if (value.length < 3) return 'O subdomínio deve ter pelo menos 3 caracteres';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return 'Apenas letras minúsculas, números e hífens são permitidos';
    }
    return null;
  };

  const handlePublishPortal = async () => {
    const slugVal = customSlug.trim().toLowerCase().replace(/\s+/g, '-');
    const slugValidationError = validateSlug(slugVal);
    if (slugValidationError) {
      toast.error(slugValidationError);
      return;
    }

    const subdomainVal = subdomainPrefix.trim().toLowerCase().replace(/\s+/g, '-');
    const subdomainValidationError = validateSubdomain(subdomainVal);
    if (subdomainValidationError) {
      toast.error(subdomainValidationError);
      return;
    }

    setPortalPublishing(true);

    try {
      const payload = {
        variant: selectedVariant,
        customSlug: slugVal || undefined,
        subdomainPrefix: subdomainVal || undefined,
      };

      const response = await companyApi.publishPublicPortal(payload);

      setPortalStatus(response);
      setCustomSlug(response.slug || slugVal);
      setSubdomainPrefix(response.subdomainPrefix || subdomainVal);
      setSelectedVariant(response.variant || selectedVariant);

      toast.success('Portal público ativado/atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao publicar portal:', err);
      toast.error(err.message || 'Falha ao publicar o portal');
    } finally {
      setPortalPublishing(false);
    }
  };

  const publicUrl = portalStatus?.enabled && portalStatus?.slug
    ? `${PUBLIC_BASE_URL}/${portalStatus.slug}`
    : null;

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const suggestedSubdomainUrl = portalStatus?.fullSubdomainUrl || 
    (suggestedSubdomain ? `https://${suggestedSubdomain}.meupontodevenda.com` : null);

  const copySubdomain = () => {
    if (suggestedSubdomainUrl) {
      navigator.clipboard.writeText(suggestedSubdomainUrl);
      toast.success('Subdomínio copiado para a área de transferência!');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Seção Portal Público */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-50 bg-gradient-to-r from-white to-indigo-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="flex-shrink-0 p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 transition-transform hover:scale-105">
                <Globe className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 uppercase tracking-tighter leading-tight">
                  Portal Público de Requisições
                </h2>
                <p className="text-sm md:text-base text-gray-500 font-medium max-w-md mx-auto sm:mx-0">
                  Configure como os seus clientes veem a sua marca.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/public-portal-templates"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
              >
                <Eye size={16} /> Galeria
              </Link>

              {portalLoading ? (
                <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-xl" />
              ) : (
                <button
                  type="button"
                  onClick={handlePublishPortal}
                  disabled={portalPublishing || !selectedVariant || !!slugError || !!subdomainError}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 active:scale-95"
                >
                  {portalStatus?.enabled ? 'Republicar' : 'Ativar Portal'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Seleção de Layout */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Selecione um template para a sua página
              </label>
              <Select
                value={filteredOptions.find(v => v.id === selectedVariant)}
                onChange={(option) => setSelectedVariant(option ? option.id : 'default')}
                options={filteredOptions}
                getOptionLabel={(option) => {
                  const meta = builtInMap[option.id];
                  const isPaid = meta?.isPaid || meta?.tier === 'premium';
                  const purchased = portalStatus?.variantPurchased && portalStatus?.variant === option.id;
                  if (isPaid && purchased) return `${option.name} ★`;
                  if (isPaid) return `${option.name} 🔒`;
                  return option.name;
                }}
                getOptionValue={(option) => option.id}
                placeholder="Pesquisar ou selecionar estilo..."
                isSearchable={true}
                isClearable={false}
                filterOption={(option, rawInput) => {
                  const input = rawInput.toLowerCase().trim();
                  if (!input) return true;
                  const { name, description } = option.data;
                  return (
                    name.toLowerCase().includes(input) ||
                    (description || '').toLowerCase().includes(input)
                  );
                }}
                className="w-full"
                classNames={{
                  control: ({ isFocused }) => `!border-2 !rounded-2xl !px-1.5 !py-2.5 !text-sm !font-bold transition-all !shadow-none ${isFocused ? '!border-indigo-500 !bg-white' : '!border-gray-100 !bg-gray-50'}`,
                  valueContainer: () => '!p-0 !flex-nowrap',
                  singleValue: () => '!text-gray-700 !font-bold',
                  menu: () => '!rounded-xl !border !border-gray-200 !shadow-lg !mt-1 !bg-white !z-50',
                  option: ({ isFocused, isSelected }) => `!px-4 !py-2.5 !text-sm transition-colors ${isSelected ? '!bg-indigo-600 !text-white' : isFocused ? '!bg-indigo-50 !text-indigo-900' : '!text-gray-800'}`,
                }}
              />

              <div className="min-h-[3rem] px-1">
                {selectedVariant && selectedVariant !== 'default' ? (
                  <>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {filteredOptions.find(v => v.id === selectedVariant)?.description || 'Sem descrição disponível.'}
                    </p>
                    {!loadingTemplates && !isSuperAdmin && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {portalStatus?.variant === selectedVariant && portalStatus?.variantPurchased && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200">
                            <Check size={12} /> Adquirido
                          </span>
                        )}
                        {builtInMap[selectedVariant]?.isPaid && !portalStatus?.variantPurchased && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-200">
                            🔒 Premium — adquira na Galeria
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 italic">Selecione um estilo acima para ver a descrição</p>
                )}
              </div>

              {/* Footer: contagem de templates pagos não adquiridos */}
              {!loadingTemplates && !isSuperAdmin && (
                <div className="pt-3 border-t border-gray-100 mt-3">
                  <Link
                    to="/public-portal-templates"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {unavailablePaidCount > 0
                      ? `Veja mais ${unavailablePaidCount} template${unavailablePaidCount !== 1 ? 's' : ''} premium disponível na galeria →`
                      : 'Ver todos os templates na galeria →'}
                  </Link>
                </div>
              )}
            </div>

            {/* Custom Slug */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Endereço Personalizado (Slug)
              </label>
              <div className="flex group shadow-sm rounded-2xl overflow-hidden border-2 border-gray-100 focus-within:border-indigo-500 transition-all">
                <span className="hidden sm:flex items-center px-5 bg-gray-50 border-r border-gray-100 text-gray-400 text-xs font-bold lowercase">
                  {PUBLIC_BASE_URL.replace('https://', '')}/
                </span>
                <input
                  value={customSlug}
                  onChange={e => {
                    const val = e.target.value.trim().toLowerCase().replace(/\s+/g, '-');
                    setCustomSlug(val);
                    setSlugError(validateSlug(val));
                  }}
                  placeholder="nome-da-empresa"
                  className={`flex-1 bg-white px-5 py-4 text-sm font-bold outline-none ${slugError ? 'text-red-600' : 'text-indigo-600'}`}
                />
              </div>
              {slugError ? (
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight ml-1">{slugError}</p>
              ) : (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">
                  Sugestão: Use o nome da sua marca para facilitar a memorização.
                </p>
              )}
            </div>
          </div>

          {/* ==================== SUBDOMÍNIO PERSONALIZÁVEL ==================== */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="text-indigo-600" size={22} />
              Subdomínio Personalizado
            </h3>
            
            <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Prefixo do Subdomínio
              </label>
              
              <div className="flex rounded-2xl overflow-hidden border-2 border-gray-100 focus-within:border-indigo-500 transition-all">
                <div className="bg-gray-50 border-r border-gray-100 px-5 flex items-center text-gray-400 text-sm font-medium">
                  https://
                </div>
                <input
                  type="text"
                  value={subdomainPrefix}
                  onChange={(e) => {
                    const val = e.target.value.trim().toLowerCase().replace(/\s+/g, '-');
                    setSubdomainPrefix(val);
                    setSubdomainError(validateSubdomain(val));
                  }}
                  placeholder="minha-empresa"
                  className="flex-1 bg-white px-5 py-4 text-sm font-bold outline-none"
                />
                <div className="bg-gray-50 border-l border-gray-100 px-5 flex items-center text-gray-400 text-sm font-medium">
                  .meupontodevenda.com
                </div>
              </div>

              {subdomainError && (
                <p className="text-red-500 text-xs mt-2">{subdomainError}</p>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Este será o endereço do teu portal: 
                <span className="font-medium"> https://{subdomainPrefix || 'sua-empresa'}.meupontodevenda.com</span>
              </p>
            </div>
          </div>

          {/* ==================== SUBDOMÍNIO AUTOMÁTICO (SUGESTÃO) ==================== */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="text-indigo-600" size={22} />
              Subdomínio Automático (Sugestão)
            </h3>
            
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-6 md:p-8">
              <p className="text-gray-700 mb-5">
                Seu portal também estará disponível automaticamente neste subdomínio:
              </p>
              
              {suggestedSubdomainUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex-1 font-mono text-indigo-700 text-[17px] break-all font-medium">
                    {suggestedSubdomainUrl}
                  </div>
                  <button
                    onClick={copySubdomain}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-2 whitespace-nowrap font-medium"
                  >
                    <Copy size={18} /> Copiar
                  </button>
                </div>
              ) : (
                <p className="text-amber-600">Carregando sugestão de subdomínio...</p>
              )}

              <p className="text-xs text-gray-500 mt-6 leading-relaxed">
                Este subdomínio será ativado automaticamente assim que publicar o portal.
              </p>
            </div>
          </div>

          {/* Estado do Portal */}
          {portalLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm font-bold uppercase tracking-widest">Sincronizando portal...</p>
            </div>
          ) : (
            <div className="space-y-10 mt-10">
              {portalStatus?.enabled && publicUrl && (
                <div className="relative group overflow-hidden bg-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-2xl">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                      <Link2 size={14} strokeWidth={3} /> Portal Online e Ativo
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                      <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 font-mono text-sm md:text-lg break-all">
                        {publicUrl}
                      </div>
                      <button
                        type="button"
                        onClick={copyLink}
                        className={`flex items-center justify-center gap-2 px-6 py-4 md:py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                          copied ? 'bg-green-500 text-white' : 'bg-white text-indigo-900 hover:bg-indigo-50'
                        }`}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="mt-4 text-indigo-200/80 text-xs font-medium">
                      Partilhe este link profissional no seu Instagram, WhatsApp ou Site Oficial.
                    </p>
                  </div>
                </div>
              )}

              {!portalStatus?.enabled && (
                <div className="bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-3xl p-8 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                    <Globe size={24} />
                  </div>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2">Portal em Rascunho</h3>
                  <p className="text-xs text-amber-700 font-medium max-w-sm leading-relaxed">
                    O seu formulário ainda não está acessível ao público. Escolha um estilo e ative o portal para começar a receber requisições.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PortalCustomizationForm />
    </div>
  );
}
