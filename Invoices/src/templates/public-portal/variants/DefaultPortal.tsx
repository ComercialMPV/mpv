// src/templates/public-portal/variants/DefaultPortal.tsx
import React, { useState, useEffect } from 'react';
import { Service, Company } from '../../../services/api'; // ajuste o caminho se necessário
import {
  Send, User, FileText, Mail, Phone, Package, Plus, Trash2,
  CheckCircle, Building2, Info, ArrowRight, CreditCard
} from 'lucide-react';

// helper to build absolute URL for images (same logic used in ModernPortal)
const LOCAL_SERVER = import.meta.env.VITE_API_BASE_URL || '';
function getImageUrl(path: string | undefined) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${LOCAL_SERVER}${path}`;
}
import toast from 'react-hot-toast';
import { api } from '../../../services/api'; // ajuste o caminho

interface DefaultPortalProps {
  company: Company;
  slug: string;
  services: Service[];
  products?: any[];
  bundles?: any[];
}

const DefaultPortal: React.FC<DefaultPortalProps> = ({ company, slug, services, products = [], bundles = [] }) => {
  const initialFormData = {
    client: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      taxId: '',
      vatNumber: '',
      billingAddress: { street: '', city: '', country: 'Portugal' }
    },
    items: [{ serviceId: '', quantity: 1 }],
    requestedInstallments: 1,
    deliveryDate: '',
    requestIntent: 'quotation',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [totals, setTotals] = useState({ subtotal: 0, penalty: 0, grandTotal: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
 const isServiceAlreadyAdded = (serviceId: string, excludeIndex?: number) => {
  return formData.items.some((item, idx) => 
    item.serviceId === serviceId && idx !== excludeIndex
  );
};

  // Cálculo de totais
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

   // Filtra apenas itens com serviço selecionado
  const validItems = formData.items.filter(
    item => item.serviceId && item.serviceId.trim() !== '' && item.quantity >= 1
  );

  if (validItems.length === 0) {
    toast.error('Selecione pelo menos um serviço válido antes de enviar.');
    console.warn('Nenhum item válido encontrado:', formData.items);
    return;
  }

    setSubmitting(true);

    try {
  const payload = {
      companyId: company._id,
      clientData: { ...formData.client, origin: 'external' },
      requisitionData: {
        items: formData.items
          .filter(item => item.serviceId && item.serviceId.trim() !== '')
          .map(item => ({
            service: item.serviceId,     // ← certifique-se que é "service" aqui
            quantity: item.quantity
          })),
        requestedInstallments: formData.requestedInstallments,
        deliveryDate: formData.deliveryDate,
        requestIntent: formData.requestIntent,
        notes: formData.notes
      }
    };

     // ← logs aqui (como no ponto 1)
    console.log('Payload final:', JSON.stringify(payload, null, 2));

      await api.requisitions.submitPublic(payload);

      setFormData(initialFormData);           // ← limpa o form
      setShowSuccessModal(true);              // ← abre o modal
      toast.success('Requisição enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao submeter requisição pública:', err);
      const msg = err.message || 'Falha ao enviar a requisição';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };
       const hasValidItems = formData.items.some(
  item => item.serviceId && item.serviceId.trim() !== ''
);
// Função para fechar o modal
  const closeModal = () => {
    setShowSuccessModal(false);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10 text-center">
          {company.logo && (
            <img
              src={getImageUrl(company.logo)}
              alt="Logo"
              className="h-20 mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {company.name} – Solicitação de Serviço / Orçamento
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Preencha os dados abaixo e envie sua solicitação
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          {/* Esquerda - Campos de entrada */}
          <div className="space-y-10">
            {/* Dados do Cliente */}
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.client.phone}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      client: { ...prev.client, phone: e.target.value }
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIF / Tax ID
                  </label>
                  <input
                    value={formData.client.taxId}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      client: { ...prev.client, taxId: e.target.value }
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nº Contribuinte (VAT/NIF)
                  </label>
                  <input
                    value={formData.client.vatNumber}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      client: { ...prev.client, vatNumber: e.target.value }
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
<section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
    <FileText className="h-5 w-5 text-blue-600" /> {/* importa FileText do lucide-react */}
    Tipo de Solicitação
  </h3>
  
  <div className="space-y-4">
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="requestIntent"
        value="quotation"
        checked={formData.requestIntent === 'quotation'}
        onChange={() => setFormData(prev => ({ ...prev, requestIntent: 'quotation' }))}
        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <p className="font-medium">Quero uma cotação / orçamento</p>
        <p className="text-sm text-gray-500">Receber proposta detalhada sem compromisso de pagamento</p>
      </div>
    </label>

    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="requestIntent"
        value="invoice"
        checked={formData.requestIntent === 'invoice'}
        onChange={() => setFormData(prev => ({ ...prev, requestIntent: 'invoice' }))}
        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <p className="font-medium">Quero fatura / prosseguir para pagamento</p>
        <p className="text-sm text-gray-500">Pretendo confirmar e pagar o serviço agora</p>
      </div>
    </label>
  </div>
</section>
            {/* Serviços */}
           <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
    <Package className="h-5 w-5 text-blue-600" />
    Serviços Solicitados
  </h3>

  {formData.items.map((item, index) => (
    <div 
      key={index} 
      className="flex flex-col sm:flex-row items-end gap-4 border-b pb-5 mb-5 last:border-b-0 last:pb-0 last:mb-0"
    >
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
        <select
          value={item.serviceId}
          onChange={(e) => {
            const newServiceId = e.target.value;
            
            // Bloqueia se o serviço já estiver noutra linha
            if (isServiceAlreadyAdded(newServiceId, index)) {
              toast.error('Este serviço já foi adicionado à requisição.');
              return;
            }

            const newItems = [...formData.items];
            newItems[index].serviceId = newServiceId;
            setFormData({ ...formData, items: newItems });
          }}
          className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Selecione um serviço...</option>
          {services.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} – {s.basePrice.toFixed(2)} {company.currency || '€'} / {s.unit}
            </option>
          ))}
        </select>
      </div>

      <div className="w-24 sm:w-28">
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => {
            const qty = Math.max(1, Number(e.target.value));
            const newItems = [...formData.items];
            newItems[index].quantity = qty;
            setFormData({ ...formData, items: newItems });
          }}
          className="w-full px-3 py-2.5 border rounded-lg text-center focus:ring-2 focus:ring-blue-500"
          required
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
        className="text-red-600 hover:text-red-800 p-2 mt-6 sm:mt-0"
        title="Remover este item"
      >
        <Trash2 size={22} />
      </button>
    </div>
  ))}

  <button
    type="button"
    onClick={() => {
      // Verifica se ainda há serviços disponíveis para adicionar
      const usedIds = new Set(formData.items.map(i => i.serviceId).filter(Boolean));
      const available = services.filter(s => !usedIds.has(s._id));

      if (available.length === 0) {
        toast.error('Todos os serviços disponíveis já foram adicionados.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { serviceId: '', quantity: 1 }]
      }));
    }}
    disabled={formData.items.length >= services.length}
    className={`
      mt-4 font-medium flex items-center gap-2
      ${formData.items.length >= services.length 
        ? 'text-gray-400 cursor-not-allowed' 
        : 'text-blue-600 hover:text-blue-800'}
    `}
  >
    <Plus size={18} /> Adicionar outro serviço
  </button>

  {formData.items.length >= services.length && services.length > 0 && (
    <p className="mt-2 text-sm text-amber-700">
      Limite atingido: todos os serviços foram adicionados.
    </p>
  )}
</section>

            {/* Observações */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold mb-4">Observações / Notas Adicionais</h3>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Quaisquer detalhes importantes, preferências, endereço de entrega diferente, etc."
              />
            </section>
          </div>

        {/* Direita – Resumo fixo */}
<div className="space-y-6 md:sticky md:top-10 self-start">
  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl shadow-2xl border border-slate-700/50">
    <h4 className="text-xl font-bold mb-7 flex items-center gap-3">
      <CreditCard className="h-6 w-6 text-blue-400" />
      Resumo do Pedido
    </h4>

    <div className="space-y-5 mb-9">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide opacity-70">
          Parcelamento pretendido
        </label>

        {/* Cálculo dinâmico do limite máximo permitido */}
        {(() => {
          let minAllowed = Infinity;
          let hasServices = false;

          formData.items.forEach(item => {
            if (item.serviceId) {
              hasServices = true;
              const service = services.find(s => s._id === item.serviceId);
              if (service) {
                minAllowed = Math.min(minAllowed, service.allowedInstallments);
              }
            }
          });

          // Se não houver serviços selecionados → permite até 12 (fallback)
          const maxAllowed = hasServices ? Math.max(1, minAllowed) : 12;

          return (
            <select
              value={formData.requestedInstallments}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value > maxAllowed) {
                  toast.error(
                    `O número máximo de parcelas permitido para os serviços selecionados é ${maxAllowed}×`
                  );
                  return;
                }
                setFormData(prev => ({ ...prev, requestedInstallments: value }));
              }}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              {Array.from({ length: maxAllowed }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {n}× {n === 1 ? '(sem acréscimo)' : 'parcelas'}
                </option>
              ))}
            </select>
          );
        })()}

        {/* Aviso quando o limite é restritivo */}
        {formData.items.some(item => item.serviceId) && (
          <p className="text-xs text-slate-400 mt-1">
            Limite definido pelo serviço mais restritivo ({/* pode mostrar o número exato se quiseres */})
          </p>
        )}
      </div>

      <div className="pt-5 border-t border-slate-700 space-y-3 text-sm">
        <div className="flex justify-between opacity-90">
          <span>Subtotal</span>
          <span>{totals.subtotal.toFixed(2)} {company.currency || 'MT'}</span>
        </div>

        {totals.penalty > 0 && (
          <div className="flex justify-between items-center text-orange-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Info size={14} /> Acréscimo por prestações extras
            </span>
            <span>+{totals.penalty.toFixed(2)} {company.currency || 'MT'}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 text-lg border-t border-slate-600/70">
          <span className="font-semibold">Total a pagar</span>
          <span className="text-3xl font-black text-blue-400">
            {totals.grandTotal.toFixed(2)} {company.currency || 'MT'}
          </span>
        </div>
      </div>
    </div>

    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide opacity-70">
          Previsão de entrega pretendida
        </label>
        <input
          type="date"
          required
          value={formData.deliveryDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>



<button
  type="submit"
  disabled={submitting || !hasValidItems}
  className={`
    w-full ... 
    ${!hasValidItems ? 'opacity-50 cursor-not-allowed bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}
  `}
>
  {submitting 
    ? 'A enviar...' 
    : hasValidItems 
      ? 'Enviar Pedido' 
      : 'Selecione pelo menos 1 serviço'}
</button>
    </div>
  </div>
</div>
        </form>
{/* Modal de sucesso */}
        {showSuccessModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeModal}           // fecha ao clicar fora
          >
            <div
              className={`
                bg-white rounded-2xl shadow-2xl max-w-md w-11/12 sm:w-[420px] p-8 text-center
                transform transition-all duration-300 scale-95 opacity-0
                ${showSuccessModal ? 'scale-100 opacity-100' : ''}
              `}
              onClick={(e) => e.stopPropagation()} // impede fechar ao clicar dentro
            >
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                Enviado com sucesso!
              </h2>

              <p className="text-base sm:text-lg text-gray-600 mb-8">
                Obrigado pela sua solicitação.<br />
                Entraremos em contacto em breve.
              </p>

              <button
                onClick={closeModal}
                className="bg-green-600 hover:bg-green-700 text-white font-medium 
                         px-8 py-3 rounded-xl transition shadow-md w-full sm:w-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
    
      </div>
    </div>
  );
};
export default DefaultPortal;