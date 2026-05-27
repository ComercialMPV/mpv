import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Code, Globe, Palette, Image as ImageIcon, X, BookTemplate as FileTemplate } from 'lucide-react';
import { publicPortalTemplatesApi } from '../services/api';
import toast from 'react-hot-toast';
import { PUBLIC_PORTAL_VARIANTS, PortalVariantId } from '../config/public-portal-variants';

export const PublicPortalTemplateForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'branding'>('html');

  const [templateType, setTemplateType] = useState<'html' | 'variant' | 'react-custom'>('html');
  const [variantId, setVariantId] = useState<PortalVariantId | string>('default');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [PreviewComponent, setPreviewComponent] = useState<React.ComponentType<any> | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    htmlContent: getDefaultPublicPortalHtml(),
    cssContent: '',
    logoOverride: '',
    primaryColor: '#3b82f6',
    accentColor: '#1e40af',
  });

  const [isPublic, setIsPublic] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | string>('');

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const template = await publicPortalTemplatesApi.getById(id!);
      setFormData({
        name: template.name,
        description: template.description || '',
        htmlContent: template.htmlContent,
        cssContent: template.cssContent || '',
        logoOverride: template.logoOverride || '',
        primaryColor: template.primaryColor || '#3b82f6',
        accentColor: template.accentColor || '#1e40af',
      });
      if (template.templateType) setTemplateType(template.templateType === 'variant' ? 'variant' : 'html');
      if (template.variantId) setVariantId(template.variantId);
      if (template.isPublic) setIsPublic(template.isPublic);
      if (template.isPaid) setIsPaid(template.isPaid);
      if (template.price) setPrice(template.price);
    } catch (error) {
      toast.error('Failed to load template');
      navigate('/public-portal-templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isPublic && isPaid && (!price || Number(price) <= 0)) {
        toast.error('Preço é obrigatório para templates pagos');
        setLoading(false);
        return;
      }
      const payload = { ...formData, templateType, variantId };
      if (isPublic) Object.assign(payload, { isPublic: true, isPaid, price: isPaid ? Number(price) : 0 });
      if (isEdit) {
        await publicPortalTemplatesApi.update(id!, payload);
        toast.success('Template atualizado');
      } else {
        await publicPortalTemplatesApi.create(payload);
        toast.success('Template criado');
      }
      navigate('/public-portal-templates');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao guardar');
    } finally {
      setLoading(false);
    }
  };
const handleUseAsBase = async (variant) => {
  setTemplateType('react-custom');
  
  try {
    // Se o variant tiver código fonte exposto (recomendado), carregar
    // Senão, usar um fallback genérico
    const source = await variant.source?.(); // ← ideal: cada variant exporta seu próprio código fonte
    if (source) {
      setFormData(prev => ({
        ...prev,
        reactImportsAndLogic: source.importsAndLogic || '// imports e lógica aqui',
        reactJSXReturn: source.jsx || '<div>Carregado de variant base</div>',
      }));
    } else {
      // fallback
      setFormData(prev => ({
        ...prev,
        reactImportsAndLogic: `import React from 'react';\n`,
        reactJSXReturn: `<div style={{ color: primaryColor }}>Base: ${variant.name}</div>`,
      }));
    }
    setVariantId(variant.id); // mantém referência
    toast.success(`Base "${variant.name}" carregada para edição`);
  } catch (err) {
    toast.error('Não foi possível carregar o código base');
  }
};
  const handlePreview = async () => {
    if (templateType === 'variant') {
      setPreviewOpen(true);
      setPreviewComponent(null);
      try {
        const variant = PUBLIC_PORTAL_VARIANTS.find(v => v.id === variantId);
        if (variant) {
          const mod: any = await variant.component();
          const Comp = mod.default || mod;
          setPreviewComponent(() => Comp);
        } else {
          toast.error('Variant not found');
        }
      } catch (err) {
        console.error('Variant load error', err);
        toast.error('Failed to load variant');
      }
    } else {
      setPreviewOpen(true);
      setPreviewComponent(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Navegação Breadcrumb */}
        <button
          onClick={() => navigate('/public-portal-templates')}
          className="group flex items-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Templates
        </button>

        {/* Título e Descrição */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
            {isEdit ? 'Edit Portal Template' : 'Create Portal Template'}
          </h1>
          <p className="text-sm md:text-base text-gray-600 font-medium leading-relaxed mt-2 max-w-2xl">
            {isEdit
              ? 'Customize your portal template with built-in React variants or create a custom HTML template.'
              : 'Create a new portal template by choosing a built-in React variant or designing a custom HTML template.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <FileTemplate className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Template Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Minimal Portal, Modern Checkout"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the template"
              />
            </div>
          </div>

          {/* Template Type Selection */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Template Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${templateType === 'react-custom'  ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'}`}>
    <input 
    type="radio" 
    value="react-custom" 
    checked={templateType === 'react-custom'}
    onChange={() => setTemplateType('react-custom')}
    className="mt-1 h-4 w-4 text-blue-600 cursor-pointer" />
    Custom React Component
  </label>
              {/* React Variant Option */}
              <label
                className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                  templateType === 'variant'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="templateType"
                  value="variant"
                  checked={templateType === 'variant'}
                  onChange={() => setTemplateType('variant')}
                  className="mt-1 h-4 w-4 text-blue-600 cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <Globe className="h-5 w-5 text-purple-600 mb-2" />
                  <p className="font-medium text-gray-900">React Component Variant</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Use a pre-built React component. Great for advanced customization with interactivity.
                  </p>
                </div>
              </label>

              {/* HTML Option */}
              <label
                className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                  templateType === 'html'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="templateType"
                  value="html"
                  checked={templateType === 'html'}
                  onChange={() => setTemplateType('html')}
                  className="mt-1 h-4 w-4 text-blue-600 cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <Code className="h-5 w-5 text-blue-600 mb-2" />
                  <p className="font-medium text-gray-900">Custom HTML Template</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Write HTML & CSS from scratch. Full control over design and layout.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Variant Selection */}
          {templateType === 'variant' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Select Variant</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PUBLIC_PORTAL_VARIANTS.map((variant) => (
                  <label
                    key={variant.id}
                    className={`relative flex flex-col items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      variantId === variant.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="variantId"
                      value={variant.id}
                      checked={variantId === variant.id}
                      onChange={() => setVariantId(variant.id as PortalVariantId)}
                      className="h-4 w-4 text-blue-600 cursor-pointer"
                    />
                    <p className="font-semibold text-gray-900 mt-3">{variant.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{variant.description}</p>
                    <button
                    type="button"
                    onClick={() => handleUseAsBase(variant)}
                    className="text-xs text-blue-600 hover:underline mt-2"
                  >
                    Usar como base (copiar para editar)
                  </button>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visibility & Pricing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Visibility & Pricing</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
              />
              <label htmlFor="isPublic" className="ml-3 text-sm font-medium cursor-pointer text-gray-900">
                Make this template public (visible to other users)
              </label>
            </div>

            {isPublic && (
              <div className="ml-6 space-y-4 border-l-2 border-blue-300 pl-4">
                <div className="flex items-center gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isPaid}
                      onChange={() => setIsPaid(false)}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <span className="text-sm font-medium">Free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isPaid}
                      onChange={() => setIsPaid(true)}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <span className="text-sm font-medium">Paid</span>
                  </label>
                </div>

                {isPaid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (MT) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      step="0.01"
                      min="0.01"
                      required={isPaid}
                      className="w-40 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {templateType === 'react-custom' && (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="flex items-center justify-between p-6 border-b">
      <div className="flex items-center">
        <Code className="h-5 w-5 text-gray-400 mr-2" />
        <h2 className="text-lg font-semibold">React Component Code</h2>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setActiveTab('imports')}
          className={`px-4 py-2 text-sm ${activeTab === 'imports' ? 'bg-white shadow-sm' : ''}`}
        >
          Imports & Logic
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jsx')}
          className={`px-4 py-2 text-sm ${activeTab === 'jsx' ? 'bg-white shadow-sm' : ''}`}
        >
          JSX Return
        </button>
      </div>
    </div>

    <div className="p-6">
      {activeTab === 'imports' && (
        <textarea
          value={formData.reactImportsAndLogic}
          onChange={e => setFormData({ ...formData, reactImportsAndLogic: e.target.value })}
          rows={20}
          className="w-full font-mono text-sm ..."
          placeholder={`import React, { useState } from 'react';\nimport { Button } from '@/components/ui/button';\n\n// seus hooks, funções, estados...`}
        />
      )}

      {activeTab === 'jsx' && (
        <textarea
          value={formData.reactJSXReturn}
          onChange={e => setFormData({ ...formData, reactJSXReturn: e.target.value })}
          rows={20}
          className="w-full font-mono text-sm ..."
          placeholder={`return (\n  <div className="min-h-screen bg-gray-50 p-8">\n    <h1 className="text-4xl font-bold text-center" style={{ color: primaryColor }}>\n      {company.name}\n    </h1>\n    {/* seu layout aqui */}\n  </div>\n)`}
        />
      )}
    </div>

    <div className="p-6 bg-blue-50 border-t text-sm text-blue-800">
      <strong>Variáveis disponíveis no componente:</strong><br/>
      <code>company</code>, <code>primaryColor</code>, <code>accentColor</code>, <code>logoOverride</code>
    </div>
  </div>
)}

        {/* Template Code */}
        {templateType === 'html' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Code className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Template Code</h2>
              </div>
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('html')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'html'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('css')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'css'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  CSS
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'html' && (
                <div>
                  <label htmlFor="htmlContent" className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="htmlContent"
                    required
                    value={formData.htmlContent}
                    onChange={e => setFormData({ ...formData, htmlContent: e.target.value })}
                    rows={25}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Enter HTML template code..."
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Use Handlebars syntax for dynamic content. Available variables: company.name, company.logo, company.email, primaryColor, accentColor, logoOverride
                  </p>
                </div>
              )}

              {activeTab === 'css' && (
                <div>
                  <label htmlFor="cssContent" className="block text-sm font-medium text-gray-700 mb-2">
                    CSS Styles
                  </label>
                  <textarea
                    id="cssContent"
                    value={formData.cssContent}
                    onChange={e => setFormData({ ...formData, cssContent: e.target.value })}
                    rows={25}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Enter CSS styles..."
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Add custom styles to make your template look professional and branded.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Branding & Colors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Palette className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Branding & Colors</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-12 w-12 rounded border border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-mono text-sm text-gray-900">{formData.primaryColor}</p>
                  <p className="text-xs text-gray-500">Used for main actions and buttons</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.accentColor}
                  onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                  className="h-12 w-12 rounded border border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-mono text-sm text-gray-900">{formData.accentColor}</p>
                  <p className="text-xs text-gray-500">Used for highlights and links</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="logoOverride" className="block text-sm font-medium text-gray-700 mb-3">
                Logo Override URL
              </label>
              <input
                type="url"
                id="logoOverride"
                value={formData.logoOverride}
                onChange={e => setFormData({ ...formData, logoOverride: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-2">Optional: Override company logo with a custom URL</p>
            </div>
          </div>
        </div>

        {/* Template Variables Help */}
        {templateType === 'html' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Available Template Variables</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Company</h4>
                <ul className="space-y-1 text-blue-700 font-mono text-xs">
                  <li>{'{{company.name}}'}</li>
                  <li>{'{{company.logo}}'}</li>
                  <li>{'{{company.email}}'}</li>
                  <li>{'{{company.phone}}'}</li>
                  <li>{'{{logoOverride}}'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Theme Colors</h4>
                <ul className="space-y-1 text-blue-700 font-mono text-xs">
                  <li>{'{{primaryColor}}'}</li>
                  <li>{'{{accentColor}}'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between gap-4 pt-6">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-900 transition-colors"
          >
            <Eye className="h-5 w-5" />
            Preview
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/public-portal-templates')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium transition-colors"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Template Preview</h3>
                <p className="text-sm text-gray-600 mt-1">{formData.name || 'Untitled Template'}</p>
              </div>
              <button
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewComponent(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 bg-gray-50 min-h-96">
              {templateType === 'variant' ? (
                PreviewComponent ? (
                  <div className="bg-white rounded-lg overflow-hidden border">
                    <PreviewComponent company={{ name: 'Empresa Exemplo', logo: '' }} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading variant...</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white rounded-lg overflow-hidden border">
                  <style>{formData.cssContent}</style>
                  <div
                    className="p-6"
                    dangerouslySetInnerHTML={{
                      __html: formData.htmlContent
                        .replace(/{{company\.name}}/g, 'Empresa Exemplo')
                        .replace(/{{company\.logo}}/g, '')
                        .replace(/{{company\.email}}/g, 'contact@example.com')
                        .replace(/{{company\.phone}}/g, '+258 84 000 0000')
                        .replace(/{{primaryColor}}/g, formData.primaryColor)
                        .replace(/{{accentColor}}/g, formData.accentColor)
                        .replace(/{{logoOverride}}/g, formData.logoOverride || ''),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for default HTML template
function getDefaultPublicPortalHtml() {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>{{company.name}} – Solicite um Serviço</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f8fafc;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 20px;
    }
    h1 {
      color: {{primaryColor}};
      margin: 10px 0 0 0;
    }
    main {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <header>
    {{#if logoOverride}}
      <img src="{{logoOverride}}" alt="Logo" style="max-height:80px;" />
    {{else if company.logo}}
      <img src="{{company.logo}}" alt="Logo" style="max-height:80px;" />
    {{/if}}
    <h1>{{company.name}}</h1>
  </header>

  <main>
    <p>Welcome to {{company.name}}. Please fill out the form below.</p>
    <!-- Your custom form content goes here -->
  </main>
</body>
</html>`;
}