// src/components/DocumentForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, FileText } from 'lucide-react';
import { 
  documentsApi, 
  clientsApi, 
  suppliersApi, 
  templatesApi, 
  api, 
  Client, 
  Supplier, 
  Template, 
  LineItem, 
  Requisition, 
  Product, 
  Bundle, 
  Service
} from '../services/api';
import toast from 'react-hot-toast';

export const DocumentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<Service[]>([]);

  const [formData, setFormData] = useState({
    type: 'invoice' as 'invoice' | 'quotation' | 'worksheet' | 'purchase_order',
    client: '',
    supplier: '',
    requisition: '',
    dueDate: '',
    validUntil: '',
    currency: 'MT',
    paymentTerms: 'Net 30',
    notes: '',
    terms: '',
    template: '',
    lineItems: [] as LineItem[],
  });

 // ==================== CARREGAR REQUISIÇÃO PARA CONVERSÃO ====================
const loadAndPopulateFromRequisition = async (reqId: string) => {
  try {
    setLoading(true);
    const req = await api.requisitions.getById(reqId);

    if (!req) {
      toast.error('Requisição não encontrada');
      return;
    }

    console.log('Requisição completa recebida:', JSON.stringify(req, null, 2)); // ← DEBUG IMPORTANTE

    const mappedItems = (req.items || []).map((item: any) => {
      // 1. Normaliza o tipo
      let itemType = (item.itemType || 'service').toLowerCase().trim();
      if (['bundle', 'combo', 'subscription'].includes(itemType)) {
        itemType = 'bundle';
      }

      // 2. Extração MUITO mais robusta do ID e do item já populado
      let itemId = '';
      let resolvedItem: any = null;

      // Prioridade 1: Se o backend já populou o item completo
      if (item.item && typeof item.item === 'object' && item.item._id) {
        resolvedItem = item.item;
        itemId = item.item._id.toString();
      } 
      // Prioridade 2: ID direto (caso não tenha sido populado)
      else if (item.item) {
        itemId = typeof item.item === 'string' ? item.item : item.item.toString();
      } 
      else if (item._id) {
        itemId = item._id.toString(); // fallback raro
      }

      // 3. Se não veio populado, tenta encontrar no catálogo local (último recurso)
      if (!resolvedItem && itemId) {
        if (itemType === 'service') {
          resolvedItem = servicesCatalog.find((s: any) => s._id === itemId);
        } else if (itemType === 'product') {
          resolvedItem = products.find((p: any) => p._id === itemId);
        } else if (itemType === 'bundle') {
          resolvedItem = bundles.find((b: any) => b._id === itemId);
        }
      }

      // 4. Nome e preço
      const itemName = resolvedItem?.name || 
                      resolvedItem?.title || 
                      item.description || 
                      'Item sem nome';

      let unitPrice = Number(item.priceAtTime) || 0;

      if (resolvedItem) {
        if (itemType === 'bundle') {
          unitPrice = resolvedItem.type === 'Subscription' 
            ? (resolvedItem.billingPricePerCycle || resolvedItem.price || unitPrice)
            : (resolvedItem.price || unitPrice);
        } else {
          unitPrice = resolvedItem.basePrice || resolvedItem.price || unitPrice;
        }
      }

      return {
        description: itemName,
        quantity: Number(item.quantity) || 1,
        unitPrice,
        taxRate: item.taxRate ?? 0,
        discount: item.discount ?? 0,
        itemType: itemType as any,
        itemId: itemId,
      } as LineItem;
    });

    setFormData(prev => ({
      ...prev,
      requisition: req._id || '',
      client: typeof req.client === 'string' 
        ? req.client 
        : (req.client as any)?._id || prev.client,
      currency: req.currency || prev.currency || 'MT',
      notes: (prev.notes ? prev.notes + '\n\n' : '') + (req.notes || ''),
      lineItems: mappedItems,
    }));

    toast.success(`Requisição carregada com ${mappedItems.length} itens`);
  } catch (err: any) {
    console.error('Erro ao carregar requisição:', err);
    toast.error('Erro ao carregar dados da requisição');
  } finally {
    setLoading(false);
  }
};

  // ==================== CARREGAR DADOS INICIAIS ====================
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [clientsRes, suppliersRes, templatesRes, reqsRes, prodRes, bundRes, servRes] = 
        await Promise.all([
          clientsApi.getAll({ active: true }),
          suppliersApi.getAll({ active: true }),
          templatesApi.getAll(),
          api.requisitions.getAll(),
          api.products.getAll(),
          api.bundles.getAll(),
          api.services.getAll(),
        ]);

      setClients(clientsRes.clients || []);
      setSuppliers(suppliersRes.suppliers || []);
      setTemplates(templatesRes);
      setProducts(prodRes);
      setBundles(bundRes);
      setServicesCatalog(servRes);

      const approvedReqs = reqsRes.filter((req: Requisition) =>
        ['approved', 'quotation_requested', 'invoice_requested'].includes(req.status)
      );
      setRequisitions(approvedReqs);

      // Carregar requisição da URL (conversão)
      if (!isEdit) {
        const params = new URLSearchParams(location.search);
        const reqId = params.get('req');
        if (reqId) await loadAndPopulateFromRequisition(reqId);
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setLoading(false);
    }
  };

  // ==================== CARREGAR DOCUMENTO EM EDIÇÃO ====================
  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await documentsApi.getById(id!);

      setFormData({
        type: doc.type,
        client: (doc.client as any)?._id || '',
        supplier: (doc.supplier as any)?._id || '',
        requisition: (doc.requisition as any)?._id || '',
        dueDate: doc.dueDate ? doc.dueDate.split('T')[0] : '',
        validUntil: doc.validUntil ? doc.validUntil.split('T')[0] : '',
        currency: doc.currency || 'MT',
        paymentTerms: doc.paymentTerms || 'Net 30',
        notes: doc.notes || '',
        terms: doc.terms || '',
        template: (doc.template as any)?._id || '',
        lineItems: (doc.lineItems || []).map((li: any) => ({
          ...li,
          itemId: (li.itemId || li.service || li.product || li.bundle || '').toString(),
          itemType: (li.itemType || 'service').toLowerCase(),
        })),
      });
    } catch (error) {
      console.error('Erro ao carregar documento:', error);
      toast.error('Erro ao carregar documento');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  // Inicialização
  useEffect(() => {
    loadInitialData();
    if (isEdit && id) loadDocument();
  }, [isEdit, id]);

  // Atualiza tipo via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docType = params.get('type') as any;
    if (docType && ['quotation', 'invoice', 'worksheet', 'purchase_order'].includes(docType)) {
      setFormData(prev => ({ ...prev, type: docType }));
    }
  }, [location.search]);

  // ==================== HANDLERS ====================
  const handleRequisitionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      await loadAndPopulateFromRequisition(value);
    } else {
      setFormData(prev => ({ ...prev, requisition: '', lineItems: [] }));
    }
  };

  const handleLineItemTypeChange = (index: number, type: 'service' | 'product' | 'bundle') => {
    const updated = [...formData.lineItems];
    updated[index].itemType = type;
    updated[index].itemId = '';
    setFormData({ ...formData, lineItems: updated });
  };

  const handleLineItemSelect = (index: number, itemId: string) => {
    const updated = [...formData.lineItems];
    updated[index].itemId = itemId;

    const type = updated[index].itemType || 'service';
    let found: any = null;

    if (type === 'service') found = servicesCatalog.find(s => s._id === itemId);
    else if (type === 'product') found = products.find(p => p._id === itemId);
    else if (type === 'bundle') found = bundles.find(b => b._id === itemId);

    if (found) {
      updated[index].description = found.name || found.title || updated[index].description;
      updated[index].unitPrice = found.basePrice ?? 
                                (found.type === 'Subscription' ? found.billingPricePerCycle : found.price) ?? 
                                updated[index].unitPrice;
    }

    setFormData({ ...formData, lineItems: updated });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { 
        description: '', 
        quantity: 1, 
        unitPrice: 0, 
        taxRate: 0, 
        discount: 0, 
        itemType: 'service', 
        itemId: '' 
      }]
    });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, lineItems: updated });
  };

  const removeLineItem = (index: number) => {
    setFormData({ ...formData, lineItems: formData.lineItems.filter((_, i) => i !== index) });
  };

  const calculateTotals = () => {
    return formData.lineItems.reduce((acc, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const disc = (lineTotal * (item.discount || 0)) / 100;
      const tax = ((lineTotal - disc) * (item.taxRate || 0)) / 100;
      acc.subtotal += (lineTotal - disc);
      acc.tax += tax;
      acc.discount += disc;
      acc.total += (lineTotal - disc + tax);
      return acc;
    }, { subtotal: 0, tax: 0, discount: 0, total: 0 });
  };

  const totals = calculateTotals();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.lineItems.length) return toast.error('Adicione pelo menos um item');

  try {
    setLoading(true);

    // Normalização forte do itemType
    const normalizedLineItems = formData.lineItems.map(item => {
      let normalizedType = item.itemType || 'Service';

      // Mapeamento seguro
      if (normalizedType.toLowerCase() === 'bundle' || 
          normalizedType.toLowerCase() === 'combo') {
        normalizedType = 'Bundle';
      } else if (normalizedType.toLowerCase() === 'subscription') {
        normalizedType = 'Subscription';
      } else {
        normalizedType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1).toLowerCase();
      }

      return {
        ...item,
        itemType: normalizedType,
        itemId: item.itemId || null,
      };
    });

    const dataToSend = {
      ...formData,
      lineItems: normalizedLineItems,
      client: formData.client?.trim() || null,
      supplier: formData.supplier?.trim() || null,
      requisition: formData.requisition?.trim() || null,
      template: formData.template?.trim() || null,
    };

    if (isEdit) {
      await documentsApi.update(id!, dataToSend);
      toast.success('Documento atualizado com sucesso!');
    } else {
      await documentsApi.create(dataToSend);
      toast.success('Documento criado com sucesso!');
    }

    navigate('/documents');
  } catch (err: any) {
    console.error('Save document error:', err);
    toast.error(err.response?.data?.message || err.message || 'Erro ao salvar documento');
  } finally {
    setLoading(false);
  }
};

  if (loading && isEdit) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  return (
    <div className="min-h-screen bg-gray-50 p-2 lg:p-6 md:p-4 sm:p-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/documents')}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Edit' : 'New'} {formData.type.replace('_', ' ')}
              </h1>
              <p className="text-gray-600">Create or update your document</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Document Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="invoice">Invoice</option>
                  <option value="quotation">Quotation</option>
                  <option value="worksheet">Worksheet</option>
                  <option value="purchase_order">Purchase Order</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Default Template</option>
                  {templates.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client/Supplier/Requisition Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'purchase_order' ? 'Supplier' : 'Client'} *
                </label>
                <select
                  value={formData[formData.type === 'purchase_order' ? 'supplier' : 'client']}
                  onChange={(e) => setFormData({ ...formData, [formData.type === 'purchase_order' ? 'supplier' : 'client']: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select {formData.type === 'purchase_order' ? 'Supplier' : 'Client'}</option>
                  {(formData.type === 'purchase_order' ? suppliers : clients).map((entity: Client | Supplier) => (
                    <option key={entity._id} value={entity._id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* NEW: Source Requisition Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Requisition (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={formData.requisition}
                    onChange={handleRequisitionChange}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No requisition (manual entry)</option>
                    {requisitions.map((req) => (
                      <option key={req._id} value={req._id}>
                        REQ-{req.number} - {(req.client as any)?.name} ({req.items?.length || 0} services)
                      </option>
                    ))}
                  </select>
                </div>
                {formData.requisition && (
                  <p className="text-xs text-gray-500 mt-1">Line items will be auto-populated from this requisition.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MT">MT</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'quotation' ? 'Valid Until' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={formData.type === 'quotation' ? formData.validUntil : formData.dueDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [formData.type === 'quotation' ? 'validUntil' : 'dueDate']: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Net 30"
                />
              </div>
            </div>

            {/* Line Items */}
            {/* Line Items */}
<div className="bg-gray-50 rounded-lg lg:p-6 md:p-4 sm:p-2">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
    <button
      type="button"
      onClick={addLineItem}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      <Plus className="h-4 w-4" />
      Add Item
    </button>
  </div>

  {formData.lineItems.length > 0 && (
    <div className="mt-6">
      {/* ====================== DESKTOP TABLE ====================== */}
      <div className="hidden lg:block overflow-x-auto border border-gray-100 rounded-md">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item / Descrição</th>
              <th className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Qtd</th>
              <th className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Preço Unit.</th>
              <th className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">IVA %</th>
              <th className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Desc %</th>
              <th className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Total</th>
              <th className="py-4 px-4 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {formData.lineItems.map((item, index) => {
              // === LÓGICA DE PREÇO INTELIGENTE ===
              let unitPrice = item.unitPrice || 0;
              const currentItemType = (item.itemType || 'service').toLowerCase();
              const currentItemId = item.itemId || '';
              
              const resolvedItem = 
                currentItemType === 'service' ? servicesCatalog.find(s => s._id === currentItemId) :
                currentItemType === 'product' ? products.find(p => p._id === currentItemId) :
                currentItemType === 'bundle' ? bundles.find(b => b._id === currentItemId) : null;

              if (resolvedItem) {
                if (currentItemType === 'bundle') {
                  unitPrice = resolvedItem.type === 'Subscription' 
                    ? (resolvedItem.billingPricePerCycle || resolvedItem.price || unitPrice)
                    : (resolvedItem.price || unitPrice);
                } else {
                  unitPrice = resolvedItem.basePrice || resolvedItem.price || unitPrice;
                }
              }

              const lineTotal = item.quantity * unitPrice;
              const lineDiscount = (lineTotal * (item.discount || 0)) / 100;
              const lineSubtotal = lineTotal - lineDiscount;
              const lineTax = (lineSubtotal * (item.taxRate || 0)) / 100;
              const finalAmount = lineSubtotal + lineTax;

              const currentItemName = item.description || 
                (resolvedItem?.name || resolvedItem?.title || 'Item da requisição');

              return (
                <tr key={index} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <select 
                          value={currentItemType} 
                          onChange={e => handleLineItemTypeChange(index, e.target.value as any)}
                          className="text-[10px] bg-gray-100 rounded px-1"
                        >
                          <option value="service">Serviço</option>
                          <option value="product">Produto</option>
                          <option value="bundle">Combo</option>
                        </select>

                        <select
                          value={currentItemId}
                          onChange={(e) => handleLineItemSelect(index, e.target.value)}
                          className="flex-1 bg-transparent border-b border-gray-200 focus:border-blue-500 py-1 text-sm font-medium outline-none"
                        >
                          <option value="">Selecionar item...</option>
                          {currentItemId && currentItemName && (
                            <option value={currentItemId}>{currentItemName}</option>
                          )}
                          {currentItemType === 'service' && servicesCatalog.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                          {currentItemType === 'product' && products.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                          ))}
                          {currentItemType === 'bundle' && bundles.map(b => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="w-full bg-transparent text-xs text-gray-500 placeholder:text-gray-300 border-none focus:ring-0 p-0"
                        placeholder="Adicionar nota ou descrição detalhada..."
                      />
                    </div>
                  </td>

                  <td className="py-4 px-2">
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)} 
                      className="w-full bg-gray-50 border-none rounded-lg px-2 py-2 text-sm font-bold" 
                    />
                  </td>
                  <td className="py-4 px-2">
                    <input 
                      type="number" 
                      value={unitPrice} 
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} 
                      className="w-full bg-gray-50 border-none rounded-lg px-2 py-2 text-sm font-bold" 
                    />
                  </td>
                  <td className="py-4 px-2">
                    <input type="number" value={item.taxRate} onChange={(e) => updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)} className="w-full bg-gray-50 border-none rounded-lg px-2 py-2 text-sm" />
                  </td>
                  <td className="py-4 px-2">
                    <input type="number" value={item.discount} onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)} className="w-full bg-gray-50 border-none rounded-lg px-2 py-2 text-sm" />
                  </td>
                  <td className="py-4 px-2 font-black text-gray-900 text-sm whitespace-nowrap">
                    MT {finalAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button onClick={() => removeLineItem(index)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ====================== MOBILE CARDS ====================== */}
      <div className="lg:hidden space-y-4">
        {formData.lineItems.map((item, index) => {
          // Mesma lógica de preço do desktop
          let unitPrice = item.unitPrice || 0;
          const currentItemType = (item.itemType || 'service').toLowerCase();
          const currentItemId = item.itemId || '';

          const resolvedItem = 
            currentItemType === 'service' ? servicesCatalog.find(s => s._id === currentItemId) :
            currentItemType === 'product' ? products.find(p => p._id === currentItemId) :
            currentItemType === 'bundle' ? bundles.find(b => b._id === currentItemId) : null;

          if (resolvedItem) {
            if (currentItemType === 'bundle') {
              unitPrice = resolvedItem.type === 'Subscription' 
                ? (resolvedItem.billingPricePerCycle || resolvedItem.price || unitPrice)
                : (resolvedItem.price || unitPrice);
            } else {
              unitPrice = resolvedItem.basePrice || resolvedItem.price || unitPrice;
            }
          }

          const lineTotal = item.quantity * unitPrice;
          const lineDiscount = (lineTotal * (item.discount || 0)) / 100;
          const lineSubtotal = lineTotal - lineDiscount;
          const lineTax = (lineSubtotal * (item.taxRate || 0)) / 100;
          const finalAmount = lineSubtotal + lineTax;

          const currentItemName = item.description || 
            (resolvedItem?.name || resolvedItem?.title || 'Item da requisição');

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
              {/* ... cabeçalho com tipo e delete ... */}
              <div className="flex justify-between items-start gap-2">
                <select
                  value={currentItemType}
                  onChange={(e) => handleLineItemTypeChange(index, e.target.value as any)}
                  className="bg-gray-50 border-none text-[10px] font-bold uppercase rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="service">Serviço</option>
                  <option value="product">Produto</option>
                  <option value="bundle">Combo</option>
                </select>
                <button onClick={() => removeLineItem(index)} className="p-2 text-red-500 bg-red-50 rounded-xl">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={currentItemId}
                  onChange={(e) => handleLineItemSelect(index, e.target.value)}
                  className="flex-1 bg-transparent border-b border-gray-200 focus:border-blue-500 py-1 text-sm font-medium outline-none"
                >
                  <option value="">Selecionar item...</option>
                  {currentItemId && currentItemName && (
                    <option value={currentItemId}>{currentItemName}</option>
                  )}
                  {/* catálogo normal */}
                  {currentItemType === 'service' && servicesCatalog.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                  {currentItemType === 'product' && products.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                  {currentItemType === 'bundle' && bundles.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>

                <textarea
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-500 border border-gray-100 rounded-xl px-4 py-2 focus:ring-1 focus:ring-gray-200"
                  placeholder="Notas adicionais..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Qtd</label>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)} 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço (MT)</label>
                  <input 
                    type="number" 
                    value={unitPrice} 
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-2xl text-white">
                <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase">
                  <span>IVA: {item.taxRate}%</span>
                  <span>Desc: {item.discount}%</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest leading-none mb-1">Total Linha</p>
                  <p className="text-lg font-black tracking-tight">MT {finalAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

              {formData.lineItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No line items added. Click "Add Item" to get started.
                </div>
              )}

              {/* Totals */}
              {formData.lineItems.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">MT{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-${totals.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">MT{totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-200 pt-2">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-gray-900">MT{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes and Terms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any additional notes or comments..."
                />
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add terms and conditions..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? 'Update Document' : 'Create Document'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};