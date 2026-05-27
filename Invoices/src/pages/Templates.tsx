import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X, Edit, Trash2, Eye, BookTemplate as FileTemplate, Star, Smartphone, CreditCard, ShieldCheck, Lock, Zap } from 'lucide-react';
import { templatesApi, Template, companyApi } from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

type PaymentMethod = 'mpesa' | 'emola' | 'visa';

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mine' | 'marketplace'>('mine');
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [previewCss, setPreviewCss] = React.useState('');
  const [previewTitle, setPreviewTitle] = React.useState('');
  const [companyCurrency, setCompanyCurrency] = React.useState<string | undefined>(undefined);
  const [currentCompanyId, setCurrentCompanyId] = React.useState<string>('');

  // Checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTemplate, setCheckoutTemplate] = useState<Template | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAwaiting, setShowAwaiting] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState('');

  React.useEffect(() => {
    const loadCompany = async () => {
      try {
        const profile = await companyApi.getProfile();
        setCompanyCurrency(profile.currency);
        setCurrentCompanyId(profile._id);
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
      }
    };
    loadCompany();
  }, []);

  const getCurrencySymbol = (code?: string) => {
    switch ((code || '').toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'MZN': return 'MTn';
      default: return code || '';
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [search, activeTab]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await templatesApi.getAll();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const myTemplates = templates.filter(template => {
    const templateCompanyId = typeof template.company === 'string'
      ? template.company
      : template.company?._id;
    return templateCompanyId === currentCompanyId || template.isBuiltIn === true || template.isPurchased === true;
  });

  const marketplaceTemplates = templates.filter(template =>
    template.isPublic === true &&
    (typeof template.company === 'string'
      ? template.company !== currentCompanyId
      : template.company?._id !== currentCompanyId)
  );

  const filteredTemplates = (activeTab === 'mine' ? myTemplates : marketplaceTemplates)
    .filter(template =>
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase())
    );

  const formatDocumentType = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');

  const getTemplateOwnerName = (template: Template) => {
    if (template.createdBy) {
      return `${template.createdBy.firstName} ${template.createdBy.lastName}`;
    }
    return 'System';
  };

  const isOwnCustomTemplate = (template: Template) => {
    const templateCompanyId = typeof template.company === 'string'
      ? template.company
      : template.company?._id;
    return !template.isBuiltIn && templateCompanyId === currentCompanyId;
  };

  const handleSetDefault = async (templateId: string, templateName: string) => {
    if (settingDefaultId) return;
    setSettingDefaultId(templateId);
    try {
      await templatesApi.setDefault(templateId);
      toast.success(`"${templateName}" definido como template padrão!`);
      await loadTemplates();
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Error setting default:', error);
      toast.error(error.response?.data?.message || 'Os templates pagos só poderão ser definidos como padrão após a compra. Por favor, adquira o template para habilitar esta funcionalidade.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await templatesApi.delete(id);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const openCheckout = (template: Template) => {
    setCheckoutTemplate(template);
    setPaymentMethod(null);
    setMobileMoneyPhone('');
    setShowAwaiting(false);
    setAwaitingRef('');
    setCheckoutOpen(true);
  };

  const handlePurchase = async () => {
    if (!checkoutTemplate || !paymentMethod) return;

    const validationError = validatePurchase();
    if (validationError) return toast.error(validationError);

    setSubmitting(true);
    try {
      const payload = {
        totalAmount: checkoutTemplate.price || 0,
        method: paymentMethod,
        customer: {
          name: 'Compra via Dashboard',
          phone: mobileMoneyPhone || '840000000',
        },
        mobileMoneyPhone: paymentMethod === 'mpesa' || paymentMethod === 'emola' ? mobileMoneyPhone : undefined,
        companyId: currentCompanyId,
      };

      const response = await templatesApi.purchase(checkoutTemplate._id, checkoutTemplate.name, payload);

      if (response.awaiting_confirmation || (response.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
        setAwaitingRef(response.externalRef || '');
        setShowAwaiting(true);
      } else if (response.url) {
        window.location.href = response.url;
      } else {
        toast.success('Template adquirido com sucesso!');
        setCheckoutOpen(false);
        await loadTemplates();
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || (err.message?.includes('Network') ? 'Erro de rede — verifique sua conexão' : null)
        || 'Erro ao processar pagamento. Tente novamente.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const validatePurchase = (): string | null => {
    if (!paymentMethod) return 'Selecione um método de pagamento';
    if ((paymentMethod === 'mpesa' || paymentMethod === 'emola')) {
      const cleaned = mobileMoneyPhone.replace(/[^0-9]/g, '');
      if (!cleaned) return `Informe o número ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para cobrança`;
      if (paymentMethod === 'mpesa' && !cleaned.startsWith('84') && !cleaned.startsWith('85')) {
        return 'Número M-Pesa deve começar com 84 ou 85';
      }
      if (paymentMethod === 'emola' && !cleaned.startsWith('86') && !cleaned.startsWith('87')) {
        return 'Número E-Mola deve começar com 86 ou 87';
      }
    }
    return null;
  };

  const buildMockPreview = (template: Template) => {
    const mock = {
      company: {
        name: 'Acme Incorporated',
        email: 'hello@acme.example',
        phone: '+258 84 000 0000',
        address: { street: '123 Main St', city: 'Maputo', state: 'MP', zipCode: '1100' },
        logo: '',
      },
      number: 'INV-0001',
      documentType: 'Invoice',
      subtotal: '1,234.00',
      taxAmount: '123.40',
      total: '1,357.40',
      currencySymbol: getCurrencySymbol(companyCurrency),
    };

    let html = template.htmlContent || '<div style="padding:20px">No content</div>';
    const css = template.cssContent || '';

    html = html.replace(/{{\s*company\.name\s*}}/g, mock.company.name);
    html = html.replace(/{{\s*company\.email\s*}}/g, mock.company.email);
    html = html.replace(/{{\s*company\.phone\s*}}/g, mock.company.phone);
    html = html.replace(/{{\s*company\.address\.street\s*}}/g, mock.company.address.street);
    html = html.replace(/{{\s*number\s*}}/g, mock.number);
    html = html.replace(/{{\s*documentType\s*}}/g, mock.documentType);
    html = html.replace(/{{\s*formatCurrency[^}]*}}/g, `${mock.currencySymbol}${mock.total}`);
    html = html.replace(/{{[^}]*}}/g, '');

    return { html, css };
  };

  const previewTemplate = (template: Template) => {
    try {
      const { html, css } = buildMockPreview(template);
      setPreviewTitle(template.name);
      setPreviewHtml(html);
      setPreviewCss(css);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to prepare preview');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
            Templates
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-md">
            Gerencie e personalize os seus modelos de documentos.
          </p>
        </div>

        <Link
          to="/templates/new"
          className="w-full sm:w-auto flex items-center justify-center px-6 py-3.5 md:py-2.5 bg-blue-600 text-white rounded-2xl md:rounded-xl text-xs md:text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-900/10 border border-blue-500/10"
        >
          <Plus className="h-5 w-5 mr-2 shrink-0" />
          Novo Template
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'mine'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Meus Templates
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'marketplace'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Marketplace
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-4 md:p-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template._id}
                    className="group flex min-h-[430px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => previewTemplate(template)}
                      className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-left"
                    >
                      <div className="absolute inset-5 rounded-lg border border-white/70 bg-white/75 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                        </div>
                        <div className="space-y-3 px-4 py-5">
                          <div className="h-4 w-2/3 rounded bg-gray-800/80" />
                          <div className="h-2.5 w-full rounded bg-gray-200" />
                          <div className="h-2.5 w-5/6 rounded bg-gray-200" />
                          <div className="mt-5 grid grid-cols-3 gap-2">
                            <div className="h-10 rounded bg-blue-100" />
                            <div className="h-10 rounded bg-gray-100" />
                            <div className="h-10 rounded bg-gray-100" />
                          </div>
                          <div className="ml-auto mt-5 h-8 w-24 rounded bg-blue-600/80" />
                        </div>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center bg-gray-950/0 opacity-0 transition-all group-hover:bg-gray-950/35 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-900 shadow-sm">
                          <Eye className="h-4 w-4" />
                          Preview
                        </span>
                      </div>

                      {template.isDefaultForCurrentCompany && (
                        <div className="absolute right-3 top-3">
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </span>
                        </div>
                      )}
                    </button>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="min-h-[126px]">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <FileTemplate className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900">{template.name}</h3>
                              <p className="mt-1 text-xs font-medium text-gray-400">By {getTemplateOwnerName(template)}</p>
                            </div>
                          </div>

                          {template.isPublic && template.isPaid && (
                            <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                              {getCurrencySymbol(companyCurrency)}{template.price?.toLocaleString('pt-MZ')}
                            </span>
                          )}
                        </div>

                        <div className="mb-3 flex min-h-[24px] flex-wrap gap-1.5">
                          {template.isDefaultForCurrentCompany && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                              <Star className="h-3 w-3" /> Default
                            </span>
                          )}
                          {template.isBuiltIn && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                              Built-in
                            </span>
                          )}
                          {template.isPublic && !template.isPaid && !template.isBuiltIn && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Grátis
                            </span>
                          )}
                          {template.isPurchased && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Adquirido
                            </span>
                          )}
                          {template.isPublic && template.isPaid && (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                              Premium
                            </span>
                          )}
                        </div>

                        {template.description && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">{template.description}</p>
                        )}
                      </div>

                      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">Document Types</p>
                        <div className="flex flex-wrap gap-1.5">
                          {template.documentTypes.map((type) => (
                            <span
                              key={type}
                              className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                            >
                              {formatDocumentType(type)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-auto pt-5">
                        <div className="mb-3 flex items-center justify-between border-t border-gray-100 pt-4">
                          <button
                            onClick={() => previewTemplate(template)}
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>

                          {isOwnCustomTemplate(template) && (
                            <div className="flex gap-1.5">
                              <Link
                                to={`/templates/${template._id}/edit`}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>

                              <button
                                onClick={() => handleDelete(template._id)}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {(!template.isBuiltIn || template.isPurchased) && (template.isDefaultForCurrentCompany === false) && (
                            <button
                              onClick={() => handleSetDefault(template._id, template.name)}
                              disabled={settingDefaultId === template._id}
                              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Star className="h-4 w-4" />
                              {settingDefaultId === template._id ? 'Definindo...' : 'Set as Default'}
                            </button>
                          )}

                          {activeTab === 'marketplace' && template.isPaid && !template.isPurchased && (
                            <button
                              onClick={() => openCheckout(template)}
                              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-emerald-700"
                            >
                              <CreditCard className="h-4 w-4" />
                              Comprar {getCurrencySymbol(companyCurrency)}{template.price}
                            </button>
                          )}

                          {template.isDefaultForCurrentCompany && (
                            <div className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
                              <Star className="h-4 w-4 fill-current" />
                              Active Default
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileTemplate className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search
                    ? 'Try adjusting your search criteria.'
                    : activeTab === 'mine'
                      ? 'Você ainda não tem templates próprios.'
                      : 'Nenhum template disponível no marketplace.'}
                </p>
                <div className="mt-6">
                  <Link
                    to="/templates/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && checkoutTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-gradient-to-br from-gray-900 to-black p-5 md:p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Adquirir Template</h2>
                <p className="text-gray-400 text-sm md:text-base mt-1">
                  <span className="text-indigo-400 font-semibold">{checkoutTemplate.name}</span>
                </p>
              </div>
              <button onClick={() => setCheckoutOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2">
                <X size={28} />
              </button>
            </div>

            <div className="p-5 md:p-8 space-y-6 md:space-y-8">
              {/* Awaiting confirmation */}
              {showAwaiting ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mb-6">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">A aguardar confirmação</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Um pedido de pagamento foi enviado para o seu telemóvel.<br />
                    <strong className="text-white">Introduza o seu PIN no telefone</strong> para autorizar.
                  </p>
                  {awaitingRef && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-6 inline-block">
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Referência</p>
                      <p className="font-mono text-sm text-amber-400">{awaitingRef}</p>
                    </div>
                  )}
                  <button onClick={() => setCheckoutOpen(false)} className="px-8 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all">
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  {/* Resumo */}
                  <div className="bg-white/5 rounded-2xl p-5 md:p-6 border border-white/10">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Resumo</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Template</span>
                      <span className="font-medium text-white">{checkoutTemplate.name}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                      <span className="text-gray-400">Valor</span>
                      <span className="text-3xl font-bold text-white tracking-tight">
                        {getCurrencySymbol(companyCurrency)}{checkoutTemplate.price?.toLocaleString('pt-MZ') || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-4">
                    <h3 className="text-lg md:text-xl font-semibold text-white">Forma de Pagamento</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { id: 'mpesa' as const, name: 'M-Pesa', icon: Smartphone, color: 'text-green-400' },
                        { id: 'emola' as const, name: 'E-Mola', icon: Smartphone, color: 'text-blue-400' },
                        { id: 'visa' as const, name: 'Visa/MC', icon: CreditCard, color: 'text-indigo-400' },
                      ]).map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => { setPaymentMethod(method.id); setMobileMoneyPhone(''); }}
                          className={`p-4 rounded-xl border-2 transition-all text-white flex flex-col items-center gap-2 text-center ${
                            paymentMethod === method.id
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-white/10 hover:border-white/30 bg-white/5'
                          }`}
                        >
                          <method.icon size={24} className={method.color} />
                          <span className="text-xs font-medium">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Money Phone */}
                  {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        {paymentMethod === 'mpesa' ? 'Número M-Pesa (84/85)' : 'Número E-Mola (86/87)'}
                      </label>
                      <input
                        type="tel"
                        value={mobileMoneyPhone}
                        onChange={e => setMobileMoneyPhone(e.target.value)}
                        placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                      />
                      <p className="text-[10px] text-gray-500">
                        {paymentMethod === 'mpesa'
                          ? 'O número deve começar com 84 ou 85'
                          : 'O número deve começar com 86 ou 87'}
                      </p>
                    </div>
                  )}

                  {/* Confirmar */}
                  <button
                    onClick={handlePurchase}
                    disabled={submitting || !paymentMethod || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg uppercase tracking-wider hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-900/30"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        A Processar...
                      </>
                    ) : (
                      <>
                        Confirmar Pagamento
                        <Zap size={20} className="fill-current" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-green-400" />
                      Pagamento 100% seguro
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-green-400" />
                      Criptografia ponta a ponta
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setPreviewOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto" style={{ maxHeight: '90vh', zIndex: 60 }}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{previewTitle} — Preview</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{companyCurrency ? companyCurrency : ''}</span>
                <button onClick={() => setPreviewOpen(false)} className="p-2 hover:bg-gray-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="border rounded overflow-hidden" style={{ minHeight: 300 }}>
                <style>{previewCss}</style>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>

              <div className="mt-3 text-sm text-gray-500">
                Esta é uma pré-visualização simulada com dados mock (nome da empresa, cliente, números e valores fictícios). Valores de moeda usam o código da empresa exibido acima.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
