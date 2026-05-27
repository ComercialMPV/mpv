// src/pages/Settings.tsx
import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, DollarSign, Save } from 'lucide-react';
import { companyApi, subscriptionsApi } from '../services/api';
import toast from 'react-hot-toast';
import { SubscriptionsSection } from '../components/SubscriptionsSection';
import  UsageLimits  from './UsageLimits';

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    currency: 'MT',
    taxRate: 0,
    paymentTerms: 'Net 30',
    invoiceNumberPrefix: 'INV-',
    quotationNumberPrefix: 'QUO-',
    worksheetNumberPrefix: 'WS-',
    purchaseOrderNumberPrefix: 'PO-',
    menuVisibility: {} as Record<string, string[]>,
  });

  // Carregar configurações gerais
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await companyApi.getSettings();

        setFormData({
          currency: settings.currency || 'MT',
          taxRate: settings.taxRate || 0,
          paymentTerms: settings.paymentTerms || 'Net 30',
          invoiceNumberPrefix: settings.invoiceNumberPrefix || 'INV-',
          quotationNumberPrefix: settings.quotationNumberPrefix || 'QUO-',
          worksheetNumberPrefix: settings.worksheetNumberPrefix || 'WS-',
          purchaseOrderNumberPrefix: settings.purchaseOrderNumberPrefix || 'PO-',
          menuVisibility: settings.menuVisibility || {},
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Falha ao carregar configurações gerais');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = { ...formData };
      if (payload.menuVisibility instanceof Map) {
        payload.menuVisibility = Object.fromEntries(payload.menuVisibility);
      }

      await companyApi.updateSettings(payload);
      toast.success('Configurações gerais salvas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <SettingsIcon className="w-9 h-9 text-indigo-600" />
            Configurações da Empresa
          </h1>
          <p className="text-gray-600 mt-2">Gerencie preferências, finanças e subscrição</p>
        </div>
      </div>

      {/* Configurações Financeiras */}
      <form onSubmit={handleGeneralSubmit} className="bg-white rounded-2xl shadow border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          <h2 className="text-2xl font-semibold">Configurações Financeiras</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Moeda Principal</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="MT">MT - Metical Moçambicano</option>
              <option value="USD">USD - Dólar Americano</option>
              <option value="EUR">EUR - Euro</option>
              <option value="ZAR">ZAR - Rand Sul-Africano</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Taxa de IVA (%)</label>
            <input
              type="number"
              value={formData.taxRate}
              onChange={(e) => setFormData(prev => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
              min="0"
              max="100"
              step="0.1"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Termos de Pagamento</label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              placeholder="Net 30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prefixo Fatura</label>
            <input
              type="text"
              value={formData.invoiceNumberPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumberPrefix: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prefixo Cotação</label>
            <input
              type="text"
              value={formData.quotationNumberPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, quotationNumberPrefix: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prefixo Folha de Obra</label>
            <input
              type="text"
              value={formData.worksheetNumberPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, worksheetNumberPrefix: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prefixo Ordem de Compra</label>
            <input
              type="text"
              value={formData.purchaseOrderNumberPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseOrderNumberPrefix: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-10">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 disabled:opacity-70 transition"
          >
            <Save size={20} />
            {loading ? 'Guardando...' : 'Salvar Configurações Financeiras'}
          </button>
        </div>
      </form>

      {/* Seção de Subscrição */}
      <SubscriptionsSection />

      {/* Seção de Limites de Uso */}
      <UsageLimits />
    </div>
  );
};

export default Settings;