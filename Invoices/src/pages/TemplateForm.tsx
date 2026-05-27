import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Code, BookTemplate as FileTemplate, X } from 'lucide-react';
import { templatesApi, Template, companyApi } from '../services/api';
import toast from 'react-hot-toast';

export const TemplateForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCss, setPreviewCss] = useState('');
  const [companyCurrency, setCompanyCurrency] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentTypes: [] as string[],
    htmlContent: '',
    cssContent: '',
    isDefault: false,
    // visibility / pricing
    isPublic: false,
    isPaid: false,
    price: 0,
  });

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const profile = await companyApi.getProfile();
        setCompanyCurrency(profile.currency);
      } catch (e) {
        // ignore
      }
    };
    loadCompany();
  }, []);

  useEffect(() => {
    if (id) {
      loadTemplate();
    } else {
      // Set default HTML template for new templates
      setFormData(prev => ({
        ...prev,
        htmlContent: getDefaultHtmlTemplate(),
        cssContent: getDefaultCssTemplate(),
      }));
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const template = await templatesApi.getById(id!);
      setFormData({
        name: template.name,
        description: template.description || '',
        documentTypes: template.documentTypes,
        htmlContent: template.htmlContent,
        cssContent: template.cssContent || '',
        isDefault: template.isDefault,
        isPublic: !!template.isPublic,
        isPaid: !!template.isPaid,
        price: template.price || 0,
      });
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.documentTypes.length === 0) {
      toast.error('Please select at least one document type');
      return;
    }
    if (formData.isPublic && formData.isPaid && (!formData.price || formData.price <= 0)) {
      toast.error('Please enter a valid price for a paid template');
      return;
    }

    try {
      setLoading(true);

      if (isEdit) {
        await templatesApi.update(id!, formData);
        toast.success('Template updated successfully');
      } else {
        await templatesApi.create(formData);
        toast.success('Template created successfully');
      }
      
      navigate('/templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        documentTypes: [...formData.documentTypes, type],
      });
    } else {
      setFormData({
        ...formData,
        documentTypes: formData.documentTypes.filter(t => t !== type),
      });
    }
  };

  const getCurrencySymbol = (code?: string) => {
    switch ((code || '').toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'MZN': return 'MTn';
      default: return code || '';
    }
  };

  const buildMockPreview = () => {
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

    let html = formData.htmlContent || '<div style="padding:20px">No content</div>';
    const css = formData.cssContent || '';

    html = html.replace(/{\{\s*company\.name\s*}}/g, mock.company.name);
    html = html.replace(/{\{\s*company\.email\s*}}/g, mock.company.email);
    html = html.replace(/{\{\s*company\.phone\s*}}/g, mock.company.phone);
    html = html.replace(/{\{\s*company\.address\.street\s*}}/g, mock.company.address.street);
    html = html.replace(/{\{\s*number\s*}}/g, mock.number);
    html = html.replace(/{\{\s*documentType\s*}}/g, mock.documentType);
    html = html.replace(/{\{\s*formatCurrency[^}]*}}/g, `${mock.currencySymbol}${mock.total}`);
    html = html.replace(/{{[^}]*}}/g, '');

    return { html, css };
  };

  const handlePreview = () => {
    try {
      const { html, css } = buildMockPreview();
      setPreviewHtml(html);
      setPreviewCss(css);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to prepare preview');
    }
  };

  const getDefaultHtmlTemplate = () => {
 return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{documentType}} {{number}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .company-info h1 { margin: 0; font-size: 24px; }
    .logo { max-height: 80px; max-width: 200px; }
    .document-info { text-align: right; margin-bottom: 30px; }
    .client-info, .supplier-info { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    .totals { width: 300px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
    .notes, .terms { margin-top: 30px; }
  </style>
</head>
<body>

  <div class="header">
    <div class="company-info">
      <h1>{{company.name}}</h1>
      {{#if company.address}}
      <p>
        {{company.address.street}}<br>
        {{company.address.city}}, {{company.address.state}} {{company.address.zipCode}}<br>
        {{#if company.email}}{{company.email}} | {{/if}}
        {{#if company.phone}}{{company.phone}}{{/if}}
      </p>
      {{/if}}
    </div>
   {{#if company.logo}}
  <img src="{{company.logo}}" alt="Company Logo" class="logo" style="max-height: 80px; max-width: 200px;">
{{/if}}
  </div>

  <div class="document-info">
    <h2>{{documentType}} {{number}}</h2>
    <p><strong>Data:</strong> {{formatDate createdAt}}</p> <!-- requisition uses createdAt -->
    {{#if deliveryDate}}
    <p><strong>Data de Entrega:</strong> {{formatDate deliveryDate}}</p>
    {{/if}}
    {{#if dueDate}}
    <p><strong>Vencimento:</strong> {{formatDate dueDate}}</p>
    {{/if}}
  </div>

  {{#if client}}
  <div class="client-info">
    <h3>Cliente / Faturar a:</h3>
    <p><strong>{{client.name}}</strong><br>
    {{#if client.contactPerson}}{{client.contactPerson}}<br>{{/if}}
    {{#if client.billingAddress}}
      {{client.billingAddress.street}}<br>
      {{client.billingAddress.city}}, {{client.billingAddress.state}} {{client.billingAddress.zipCode}}<br>
    {{else if client.address}}
      {{client.address.street}}<br>
      {{client.address.city}}, {{client.address.state}} {{client.address.zipCode}}<br>
    {{/if}}
    {{#if client.email}}{{client.email}}<br>{{/if}}
    {{#if client.phone}}Tel: {{client.phone}}{{/if}}</p>
  </div>
  {{/if}}

  <table class="items-table">
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:center">Qtd</th>
        <th style="text-align:right">Preço Unitário</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each lineItems}}
      <tr>
        <td>{{description}}</td>
        <td style="text-align:center">{{quantity}}</td>
        <td style="text-align:right">{{formatCurrency unitPrice ../currency}}</td>
        <td style="text-align:right">{{formatCurrency (multiply quantity unitPrice) ../currency}}</td>
      </tr>
      {{else}}
      <tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum item encontrado</td></tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>{{formatCurrency subtotal currency}}</span>
    </div>
    {{#if discountAmount}}
    <div class="total-row">
      <span>Desconto:</span>
      <span>-{{formatCurrency discountAmount currency}}</span>
    </div>
    {{/if}}
    {{#if taxAmount}}
    <div class="total-row">
      <span>IVA:</span>
      <span>{{formatCurrency taxAmount currency}}</span>
    </div>
    {{/if}}
    <div class="total-row final">
      <span>Total:</span>
      <span>{{formatCurrency total currency}}</span>
    </div>
  </div>

  {{#if notes}}
  <div class="notes">
    <h4>Observações / Notas:</h4>
    <p>{{notes}}</p>
  </div>
  {{/if}}

  {{#if terms}}
  <div class="terms">
    <h4>Termos e Condições:</h4>
    <p>{{terms}}</p>
  </div>
  {{/if}}

</body>
</html>`;
  };

  const getDefaultCssTemplate = () => {
    return `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 20px;
  color: #333;
  line-height: 1.6;
}

.header {
  border-bottom: 3px solid #3B82F6;
  padding-bottom: 20px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.company-info h1 {
  margin: 0;
  color: #3B82F6;
  font-size: 28px;
}

.logo {
  max-width: 150px;
  max-height: 80px;
}

.document-info {
  background: #F8FAFC;
  padding: 20px;
  margin: 20px 0;
  border-radius: 8px;
}

.client-info, .supplier-info {
  margin: 20px 0;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.items-table th,
.items-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.items-table th {
  background: #F8FAFC;
  font-weight: 600;
}

.totals {
  float: right;
  width: 300px;
  margin-top: 20px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.total-row.final {
  font-weight: bold;
  font-size: 18px;
  color: #3B82F6;
  border-top: 2px solid #3B82F6;
  margin-top: 10px;
  padding-top: 10px;
}

.notes, .terms {
  margin-top: 40px;
  clear: both;
}

.notes h4, .terms h4 {
  color: #374151;
  margin-bottom: 10px;
}`;
  };

  const documentTypeOptions = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'quotation', label: 'Quotation' },
    { value: 'worksheet', label: 'Worksheet' },
    { value: 'purchase_order', label: 'Purchase Order' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
  {/* Navegação Breadcrumb */}
  <button
    onClick={() => navigate('/templates')}
    className="group flex items-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors w-fit"
  >
    <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
    Voltar para Templates
  </button>

  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
    {/* Título e Descrição */}
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
        {isEdit ? 'Editar Template' : 'Novo Template'}
      </h1>
      <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-md">
        {isEdit ? 'Atualize o design e estrutura do seu documento.' : 'Crie um modelo personalizado para os seus documentos.'}
      </p>
    </div>
    
    {/* Grupo de Ações - Lado a lado no Mobile */}
    <div className="grid grid-cols-2 md:flex items-center gap-3 w-full md:w-auto">
  {/* Botão de Visualização */}
  <button
    onClick={handlePreview}
    className="col-span-1 md:flex-none flex items-center justify-center px-4 py-3.5 md:py-2.5 bg-white border border-gray-200 rounded-2xl md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-gray-500 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/50 transition-all active:scale-95 shadow-sm"
  >
    <Eye className="h-4 w-4 mr-2 shrink-0" />
    <span className="truncate">Visualizar</span>
  </button>

  {/* Botão de Ação: No mobile ocupa o resto do grid ou pode ser ajustado */}
  <button
    onClick={handleSubmit}
    disabled={loading}
    className="col-span-1 md:flex-none flex items-center justify-center px-6 py-3.5 md:py-2.5 bg-blue-600 text-white rounded-2xl md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.15em] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-blue-900/10 border border-blue-500/10"
  >
    {loading ? (
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="hidden xs:inline animate-pulse">Processando...</span>
      </div>
    ) : (
      <>
        <Save className="h-4 w-4 mr-2 shrink-0" />
        <span className="truncate">
          {isEdit ? 'Atualizar' : 'Criar'}
        </span>
      </>
    )}
  </button>
</div>
  </div>
</div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <FileTemplate className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Template Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter template name"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the template"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Document Types <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {documentTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      id={option.value}
                      checked={formData.documentTypes.includes(option.value)}
                      onChange={(e) => handleDocumentTypeChange(option.value, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={option.value} className="ml-2 block text-sm text-gray-700">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  Set as default template for selected document types
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                  Make this template public (available to anyone)
                </label>
              </div>

              {formData.isPublic && (
                <div className="mt-4 pl-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access</label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="publicAccess"
                        checked={!formData.isPaid}
                        onChange={() => setFormData({ ...formData, isPaid: false, price: 0 })}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Free</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="publicAccess"
                        checked={!!formData.isPaid}
                        onChange={() => setFormData({ ...formData, isPaid: true })}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Paid</span>
                    </label>
                  </div>

                  {formData.isPaid && (
                    <div className="mt-3">
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (unique)</label>
                      <input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-48 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter price"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Template Code */}
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
                  name="htmlContent"
                  required
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  rows={20}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter HTML template code..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Use Handlebars syntax for dynamic content. Available variables: company, client, supplier, lineItems, etc.
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
                  name="cssContent"
                  value={formData.cssContent}
                  onChange={(e) => setFormData({ ...formData, cssContent: e.target.value })}
                  rows={20}
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

        {/* Template Variables Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Available Template Variables</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Company</h4>
              <ul className="space-y-1 text-blue-700">
                <li>`{`company.name`}`</li>
                <li>`{`company.email`}`</li>
                <li>`{`company.phone`}`</li>
                <li>`{`company.address.street`}`</li>
                <li>`{`company.logo`}`</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Document</h4>
              <ul className="space-y-1 text-blue-700">
                <li>`{`number`}`</li>
                <li>`{`documentType`}`</li>
                <li>`{`status`}`</li>
                <li>`{`issueDate`}`</li>
                <li>`{`dueDate`}`</li>
                <li>`{`total`}`</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Client/Supplier</h4>
              <ul className="space-y-1 text-blue-700">
                <li>`{`client.name`}`</li>
                <li>`{`client.email`}`</li>
                <li>`{`supplier.name`}`</li>
                <li>`{`supplier.email`}`</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Helper Functions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                `{`formatDate(date)`}` - Format dates
              </div>
              <div>
                `{`formatCurrency(amount, currency)`}` - Format currency
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setPreviewOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto" style={{ maxHeight: '90vh', zIndex: 60 }}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Template Preview</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{companyCurrency ? companyCurrency : ''}</span>
                <button onClick={() => setPreviewOpen(false)} className="p-2 hover:bg-gray-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div
                className="border rounded overflow-hidden"
                style={{ minHeight: 300 }}
              >
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