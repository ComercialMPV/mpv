import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Eye, Trash2, X, Globe, Code, Copy, Settings, Check, Sparkles, CreditCard, ShoppingBag, Monitor, Tablet, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { publicPortalTemplatesApi, adminBuiltInVariantsApi, api, Company } from '../services/api';
import { PUBLIC_PORTAL_VARIANTS } from '../config/public-portal-variants';
import { useAuth } from '../contexts/AuthContext';

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface BuiltInVariant {
  _id: string;
  variantId: string;
  name: string;
  description: string;
  previewImageUrl?: string;
  category?: string;
  tags?: string[];
  tier: 'freemium' | 'premium';
  isActive: boolean;
  isPublic: boolean;
  isPaid: boolean;
  price: number;
  isTaken?: boolean;
}

type PreviewState = {
  open: boolean;
  template?: any;
  Component?: React.ComponentType<any> | null;
};

const mockCompany = { name: 'Empresa Demo', logo: '' };
const mockServices = [
  { _id: '1', image: '', name: 'Serviço 1', description: 'Descrição', price: 100 },
  { _id: '2', image: '', name: 'Serviço 2', description: 'Descrição', price: 200 },
];
const mockProducts = [
  { _id: '1', image: '', name: 'Produto 1', description: 'Descrição', price: 100 },
];
const mockBundles = [
  { _id: 'b1', name: 'Combo', type: 'Combo', description: 'Pacote', price: 500, image: '', items: [] },
];

const variantModules = import.meta.glob<{ default: React.ComponentType<any> }>(
  '../templates/public-portal/variants/*.tsx',
  { eager: true }
);

const getComponentForVariant = (variantId: string): React.ComponentType<any> | undefined => {
  const pascalCase = variantId
    .split(/[-_]/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const possibleFileNames = [
    `../templates/public-portal/variants/${pascalCase}Portal.tsx`,
    `../templates/public-portal/variants/${pascalCase}Digital.tsx`,
    `../templates/public-portal/variants/${pascalCase}.tsx`,
  ];
  for (const fileName of possibleFileNames) {
    if (variantModules[fileName]) {
      return variantModules[fileName].default;
    }
  }
  return undefined;
};

export const PublicPortalTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { user, company, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [builtInVariants, setBuiltInVariants] = useState<BuiltInVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<PreviewState>({ open: false, Component: null });
  const [selectedTier, setSelectedTier] = useState<'all' | 'freemium' | 'premium'>('all');

  // Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutVariant, setCheckoutVariant] = useState<BuiltInVariant | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'emola' | 'visa' | 'none'>('none');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAwaitingConfirmation, setShowAwaitingConfirmation] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState('');
  const [pollStatus, setPollStatus] = useState<'waiting'|'confirmed'|'failed'>('waiting');
  const [pollAttempts, setPollAttempts] = useState(0);

  const isSuperAdmin = user && (
    user.role === 'superadmin' ||
    (typeof user.role === 'object' && user.role.roleName === 'superadmin')
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tmplData, builtInData] = await Promise.all([
        publicPortalTemplatesApi.getAll(),
        adminBuiltInVariantsApi.getAll(),
      ]);
      setTemplates(tmplData);
      const enriched = builtInData.map((b: any) => ({
        _id: b._id?.$oid || b._id,
        variantId: b.variantId,
        name: b.name,
        description: b.description,
        previewImageUrl: b.previewImageUrl,
        category: b.category,
        tags: Array.isArray(b.tags) ? b.tags : [],
        tier: b.tier || 'freemium',
        isActive: b.isActive ?? true,
        isPublic: b.isPublic ?? true,
        isPaid: b.isPaid ?? false,
        price: b.price ?? 0,
        isTaken: b.isTaken ?? false,
      }));
      setBuiltInVariants(enriched);
    } catch (err) {
      console.error('Error loading data', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filteredBuiltIn = builtInVariants.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === 'all' || v.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const filteredTemplates = templates.filter(t =>
    !t.isBuiltIn &&
    (t.name.toLowerCase().includes(search.toLowerCase()) ||
     t.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (id: string) => {
    if (id.startsWith('builtin-')) {
      toast.info('Built-in templates cannot be edited. Create a custom variant instead.');
      return;
    }
    navigate(`/public-portal-templates/${id}/edit`);
  };

  const handleCreate = () => {
    navigate('/public-portal-templates/new');
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('builtin-')) {
      toast.error('Cannot delete built-in templates');
      return;
    }
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await publicPortalTemplatesApi.delete(id);
      toast.success('Template deleted successfully');
      loadData();
    } catch (e) {
      toast.error('Failed to delete template');
    }
  };

  const handlePreviewTemplate = async (t: any) => {
    setPreview({ open: true, template: t, Component: null });
    if (t.templateType === 'variant') {
      try {
        const variant = PUBLIC_PORTAL_VARIANTS.find(v => v.id === t.variantId);
        if (!variant) return toast.error('Variant not found');
        if (!('component' in variant)) return toast.error('Variant does not have a component');
        const mod: any = await variant.component();
        const Comp = mod.default || mod;
        setPreview({ open: true, template: t, Component: Comp });
      } catch (err) {
        toast.error('Failed to load variant');
      }
    }
  };

  const handlePreviewBuiltIn = (variant: BuiltInVariant) => {
    const Component = getComponentForVariant(variant.variantId);
    if (!Component) {
      toast.error('Preview not available for this variant');
      return;
    }
    setPreview({ open: true, template: variant, Component });
  };

  const closePreview = () => setPreview({ open: false, Component: null });

  const handleSetAsChosen = async (variant: BuiltInVariant) => {
    try {
      await api.company.publishPublicPortal({ variant: variant.variantId });
      toast.success(`"${variant.name}" set as active portal!`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to set template');
    }
  };

  const openCheckout = (variant: BuiltInVariant) => {
    setCheckoutVariant(variant);
    setPaymentMethod('none');
    setCheckoutOpen(true);
  };

  const handlePurchase = async () => {
    if (!checkoutVariant) return;
    if (paymentMethod === 'none') {
      toast.error('Select a payment method');
      return;
    }
    if (paymentMethod === 'mpesa') {
      const cleaned = mobileMoneyPhone.replace(/[^0-9]/g, '');
      if (!cleaned.startsWith('84') && !cleaned.startsWith('85')) {
        toast.error('M-Pesa number must start with 84 or 85');
        return;
      }
    }
    if (paymentMethod === 'emola') {
      const cleaned = mobileMoneyPhone.replace(/[^0-9]/g, '');
      if (!cleaned.startsWith('86') && !cleaned.startsWith('87')) {
        toast.error('E-Mola number must start with 86 or 87');
        return;
      }
    }
    setSubmitting(true);
    try {
      const resp = await api.checkout.template({
        variantId: checkoutVariant.variantId,
        variantName: checkoutVariant.name,
        totalAmount: checkoutVariant.price,
        method: paymentMethod,
        mobileMoneyPhone: (paymentMethod === 'mpesa' || paymentMethod === 'emola') ? mobileMoneyPhone : undefined,
        customer: {
          name: company?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User',
          phone: company?.phone || '',
          email: company?.email || user?.email || '',
        },
        companyId: company?._id,
      });

      if (resp?.success) {
        if (resp.awaiting_confirmation || (resp.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
          setCheckoutOpen(false);
          setAwaitingRef(resp.externalRef || resp.reference || '');
          setShowAwaitingConfirmation(true);
        } else if (resp.url) {
          window.location.href = resp.url;
        } else {
          toast.success(resp.message || 'Template purchased successfully!');
          setCheckoutOpen(false);
          loadData();
        }
      } else {
        toast.error(resp?.message || 'Failed to process payment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payment');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Poll transaction status when awaiting confirmation ──
  useEffect(() => {
    if (!showAwaitingConfirmation || !awaitingRef) return;
    let cancelled = false;
    setPollStatus('waiting');
    setPollAttempts(0);

    const interval = setInterval(async () => {
      try {
        const res = await api.checkout.transactionStatus(awaitingRef);
        if (cancelled) return;
        if (res?.found && res.transaction) {
          if (res.transaction.status === 'success') {
            setPollStatus('confirmed');
            clearInterval(interval);
            setTimeout(() => {
              setShowAwaitingConfirmation(false);
              toast.success('Template purchased successfully!');
              loadData();
            }, 1500);
            return;
          } else if (res.transaction.status === 'failed') {
            setPollStatus('failed');
            clearInterval(interval);
            setTimeout(() => setShowAwaitingConfirmation(false), 3000);
            return;
          }
        }
        setPollAttempts(p => p + 1);
      } catch {}
    }, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [showAwaitingConfirmation, awaitingRef]);

  const getVariantName = (variantId: string) => {
    const variant = PUBLIC_PORTAL_VARIANTS.find(v => v.id === variantId);
    return variant?.name || variantId;
  };

  const handleDuplicateBuiltIn = async (template: any) => {
    try {
      const newTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        htmlContent: template.htmlContent || '',
        cssContent: template.cssContent || '',
        logoOverride: template.logoOverride || '',
        primaryColor: template.primaryColor || '#3b82f6',
        accentColor: template.accentColor || '#1e40af',
        templateType: template.templateType,
        variantId: template.variantId,
        isPublic: false,
        isPaid: false,
        price: 0,
      };
      const created = await publicPortalTemplatesApi.create(newTemplate);
      toast.success('Template duplicated! Now customizing your copy.');
      navigate(`/public-portal-templates/${created._id}/edit`);
    } catch (e) {
      toast.error('Failed to duplicate template');
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
            Portal Templates
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-md">
            Browse, purchase, or manage public portal variants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/builtin-variants')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm text-xs font-bold uppercase tracking-wider"
            >
              <Settings className="h-4 w-4" />
              Manage Variants
            </button>
          )}
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm text-xs font-bold uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Search + Tier Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search variants and templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'freemium', 'premium'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  selectedTier === tier
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tier === 'all' ? 'All' : tier === 'freemium' ? 'Free' : 'Premium'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Built-in Variants Grid */}
          {filteredBuiltIn.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Available Variants</h2>
                <p className="text-sm text-gray-500 mt-1">Browse and activate or purchase portal designs</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBuiltIn.map(variant => {
                  const Component = getComponentForVariant(variant.variantId);
                  return (
                    <div
                      key={variant._id}
                      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      {/* Cover */}
                      <div
                        className="aspect-[4/3] bg-gray-100 relative overflow-hidden cursor-pointer"
                        onClick={() => Component && handlePreviewBuiltIn(variant)}
                      >
                        {variant.previewImageUrl ? (
                          <img
                            src={variant.previewImageUrl}
                            alt={variant.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                            <Globe className="w-12 h-12 text-blue-300" />
                          </div>
                        )}
                        {/* Tier badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            variant.tier === 'premium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {variant.tier === 'premium' ? 'PREMIUM' : 'FREE'}
                          </span>
                        </div>
                        {/* Preview overlay */}
                        {Component && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                              Preview
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{variant.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{variant.description}</p>

                        <div className="flex items-center justify-between">
                          <div>
                            {variant.price > 0 ? (
                              <span className="text-sm font-bold text-gray-900">{variant.price} MT</span>
                            ) : (
                              <span className="text-sm font-bold text-emerald-600">Free</span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {Component && (
                              <button
                                onClick={() => handlePreviewBuiltIn(variant)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {variant.price > 0 ? (
                              <button
                                onClick={() => openCheckout(variant)}
                                disabled={variant.isTaken}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                  variant.isTaken
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                }`}
                              >
                                <ShoppingBag className="h-3.5 w-3.5" />
                                {variant.isTaken ? 'Taken' : 'Buy'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSetAsChosen(variant)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Choose
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Templates */}
          {filteredTemplates.length > 0 && (
            <div className="mt-12">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">My Custom Templates</h2>
                <p className="text-sm text-gray-500 mt-1">Templates you created or duplicated</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {filteredTemplates.map(template => (
                    <div key={template._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {template.templateType === 'variant' ? (
                              <Globe className="h-4 w-4 text-purple-500 shrink-0" />
                            ) : (
                              <Code className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {template.isBuiltIn && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">Built-in</span>
                        )}
                        {template.templateType === 'variant' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800">{getVariantName(template.variantId)}</span>
                        )}
                        {template.isPublic && !template.isPaid && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">Free Public</span>
                        )}
                        {template.isPublic && template.isPaid && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Paid</span>
                        )}
                        {!template.isPublic && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">Private</span>
                        )}
                      </div>
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                          <button onClick={() => handlePreviewTemplate(template)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {!template.isBuiltIn && (
                            <>
                              <button onClick={() => handleEdit(template._id)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all" title="Edit">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(template._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                        {template.isBuiltIn && (
                          <button onClick={() => handleDuplicateBuiltIn(template)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-green-700 border border-green-300 hover:bg-green-50 transition-all">
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filteredBuiltIn.length === 0 && filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 mb-4">No variants or templates found</p>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {preview.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{preview.template?.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{preview.template?.description}</p>
              </div>
              <button onClick={closePreview} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {preview.Component ? (
                <div className="border rounded-lg overflow-hidden bg-gray-50 min-h-[400px]">
                  <preview.Component company={mockCompany} slug="preview" services={mockServices} products={mockProducts} bundles={mockBundles} />
                </div>
              ) : preview.template?.templateType === 'variant' ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading variant...</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <style>{preview.template?.cssContent || ''}</style>
                  <div className="p-6" dangerouslySetInnerHTML={{
                    __html: (preview.template?.htmlContent || '')
                      .replace(/{{company\.name}}/g, 'Empresa Exemplo')
                      .replace(/{{primaryColor}}/g, preview.template?.primaryColor || '#3b82f6')
                      .replace(/{{accentColor}}/g, preview.template?.accentColor || '#1e40af'),
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && checkoutVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Purchase Template</h3>
                <button onClick={() => setCheckoutOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {checkoutVariant.previewImageUrl ? (
                    <img src={checkoutVariant.previewImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Globe className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{checkoutVariant.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{checkoutVariant.description}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{checkoutVariant.price} MT</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['mpesa', 'emola', 'visa'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                        paymentMethod === method
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">
                    {paymentMethod === 'mpesa' ? 'M-Pesa Number (84/85)' : 'E-Mola Number (86/87)'}
                  </label>
                  <input
                    type="tel"
                    value={mobileMoneyPhone}
                    onChange={e => setMobileMoneyPhone(e.target.value)}
                    placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-0 outline-none transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {paymentMethod === 'mpesa'
                      ? 'Number must start with 84 or 85'
                      : 'Number must start with 86 or 87'}
                  </p>
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={submitting || paymentMethod === 'none'}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {checkoutVariant.price} MT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aguardando Confirmação */}
      {showAwaitingConfirmation && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full p-8 text-center">
            {pollStatus === 'waiting' && (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-5">
                  <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Awaiting confirmation</h3>
                <p className="text-sm text-gray-500 mb-4">
                  A payment request was sent to your phone.<br />
                  <strong className="text-gray-800">Enter your PIN</strong> to authorize the payment.
                </p>
                {awaitingRef && (
                  <div className="p-3 bg-gray-50 rounded-xl mb-5">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Reference</p>
                    <p className="font-mono text-sm text-amber-600 font-medium">{awaitingRef}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mb-5">Checking every 3 seconds... (attempt {pollAttempts})</p>
                <button
                  onClick={() => setShowAwaitingConfirmation(false)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all"
                >
                  Close
                </button>
              </>
            )}
            {pollStatus === 'confirmed' && (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Confirmed!</h3>
                <p className="text-sm text-gray-500">Redirecting...</p>
              </>
            )}
            {pollStatus === 'failed' && (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Failed</h3>
                <p className="text-sm text-gray-500">The payment was not authorized. Please try again.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
