// src/templates/public-portal/variants/DefaultPortal.tsx
import React, { useState, useEffect } from 'react';
import { Service, api } from '../../../services/api'; // ajuste o caminho relativo
import {
  User, Package, Trash2, Plus, CreditCard, Info, ArrowRight, CheckCircle
} from 'lucide-react';

const LOCAL_SERVER = import.meta.env.VITE_API_BASE_URL || '';
function getImageUrl(path: string | undefined) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${LOCAL_SERVER}${path}`;
}
import toast from 'react-hot-toast';

interface DefaultPortalProps {
  company?: { logo?: string; name?: string; [key: string]: unknown };
  companyId?: string;
  services?: Service[];
}

const MinimalPortal: React.FC<DefaultPortalProps> = ({ company, companyId, services: initialServices = [] }) => {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    client: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      taxId: '',
      billingAddress: { street: '', city: '', country: '' }
    },
    items: [{ serviceId: '', quantity: 1 }],
    requestedInstallments: 1,
    deliveryDate: '',
    notes: ''
  });

  const [totals, setTotals] = useState({ subtotal: 0, penalty: 0, grandTotal: 0 });

  // Carregar serviços públicos com base no companyId (já obtido)
  useEffect(() => {
    const loadServices = async () => {
      try {
        // Endpoint público que você já tem ou deve criar: /services/public/:companyId
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/public/${companyId}`);
        if (!res.ok) throw new Error('Falha ao carregar serviços');
        const data = await res.json();
        setServices(data);
      } catch (err: unknown) {
        console.error(err);
        toast.error('Não foi possível carregar os serviços');
      } finally {
        setLoading(false);
      }
    };

    if (companyId) loadServices();
  }, [companyId]);

  // Cálculo de totais (mantido igual)
  useEffect(() => {
    let subtotal = 0;
    let minAllowed = 99;
    let maxPenaltyPct = 0;

    formData.items.forEach(item => {
      const service = services.find(s => s._id === item.serviceId);
      if (service) {
        subtotal += service.basePrice * item.quantity;
        minAllowed = Math.min(minAllowed, service.allowedInstallments);
        maxPenaltyPct = Math.max(maxPenaltyPct, service.penaltyPercentagePerInstallment);
      }
    });

    let penalty = 0;
    const installments = formData.requestedInstallments;
    if (installments > minAllowed) {
      const extra = installments - minAllowed;
      penalty = subtotal * (extra * (maxPenaltyPct / 100));
    }

    setTotals({ subtotal, penalty, grandTotal: subtotal + penalty });
  }, [formData.items, formData.requestedInstallments, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      toast.error('Empresa não identificada');
      return;
    }

    // Validação básica
    if (!formData.client.name.trim() || !formData.client.email.trim()) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    if (formData.items.every(i => !i.serviceId)) {
      toast.error('Adicione pelo menos um serviço');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        companyId,
        clientData: { ...formData.client, origin: 'external' },
        requisitionData: {
          items: formData.items,
          requestedInstallments: formData.requestedInstallments,
          deliveryDate: formData.deliveryDate,
          notes: formData.notes
        }
      };

      await api.requisitions.submitPublic(payload); // ← usa o endpoint público existente

      setSubmitted(true);
      toast.success('Requisição enviada com sucesso!');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao enviar a requisição');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando serviços...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10 text-center">
          {company?.logo && (
            <img
              src={getImageUrl(company.logo)}
              alt="Logo"
              className="h-20 mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Solicitação de Serviço / Orçamento
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Preencha os dados abaixo e envie sua solicitação
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          {/* Left side - Inputs */}
          <div className="space-y-10">
            {/* Client Info */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Seus Dados
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Empresa *
                  </label>
                  <input
                    required
                    value={formData.client.name}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      client: { ...prev.client, name: e.target.value }
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Contato
                  </label>
                  <input
                    value={formData.client.contactPerson}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      client: { ...prev.client, contactPerson: e.target.value }
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.client.email}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      client: { ...prev.client, email: e.target.value }
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Serviços Solicitados
              </h3>

              {formData.items.map((item, index) => (
                <div key={index} className="flex items-end gap-4 border-b pb-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                    <select
                      value={item.serviceId}
                      onChange={e => {
                        const newItems = [...formData.items];
                        newItems[index].serviceId = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {services.map(s => (
                        <option key={s._id} value={s._id}>
                          {s.name} – ${s.basePrice.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => {
                        const qty = Math.max(1, Number(e.target.value));
                        const newItems = [...formData.items];
                        newItems[index].quantity = qty;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newItems = formData.items.filter((_, i) => i !== index);
                      setFormData(prev => ({
                        ...prev,
                        items: newItems.length ? newItems : [{ serviceId: '', quantity: 1 }]
                      }));
                    }}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  items: [...prev.items, { serviceId: '', quantity: 1 }]
                }))}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
              >
                <Plus size={18} /> Adicionar serviço
              </button>
            </section>

            {/* Notes */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold mb-4">Observações</h3>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </section>
          </div>

          {/* Right side – Sticky summary */}
              <div className="space-y-6 md:sticky md:top-8 self-start">
                      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl">
                        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-blue-400" />
                          Resumo do Pagamento
                        </h4>
          
                        <div className="space-y-4 mb-8">
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase opacity-70">Parcelamento</label>
                            <select
                              value={formData.requestedInstallments}
                              onChange={e => setFormData(prev => ({ ...prev, requestedInstallments: Number(e.target.value) }))}
                              className="w-full bg-slate-800 border-0 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="1">1× sem juros</option>
                              <option value="2">2× parcelas</option>
                              <option value="3">3× parcelas</option>
                              <option value="4">4× parcelas</option>
                              <option value="5">5× parcelas</option>
                              <option value="6">6× parcelas</option>
                              <option value="12">12× parcelas</option>
                            </select>
                          </div>
          
                          <div className="pt-4 border-t border-slate-700 space-y-2">
                            <div className="flex justify-between text-sm opacity-80">
                              <span>Subtotal</span>
                              <span>${totals.subtotal.toFixed(2)}</span>
                            </div>
          
                            {totals.penalty > 0 && (
                              <div className="flex justify-between text-xs text-orange-400 font-medium items-center gap-1">
                                <span className="flex items-center gap-1">
                                  <Info size={12} /> Taxa de parcelamento
                                </span>
                                <span>+${totals.penalty.toFixed(2)}</span>
                              </div>
                            )}
          
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-lg font-bold">Total</span>
                              <span className="text-3xl font-black text-blue-400">
                                ${totals.grandTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
          
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase opacity-70">Previsão de Entrega</label>
                            <input
                              type="date"
                              required
                              value={formData.deliveryDate}
                              onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                              className="w-full bg-slate-800 border-0 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
          
                          <button
                            type="submit"
                            disabled={submitting || loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                          >
                            {submitting ? (
                              'Enviando...'
                            ) : (
                              <>
                                Enviar Requisição <ArrowRight size={18} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
        </form>

        {submitted && (
          <div className="mt-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold mt-4">Enviado com sucesso!</h2>
            <p className="text-gray-600 mt-2">Obrigado! Entraremos em contacto brevemente.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default MinimalPortal;