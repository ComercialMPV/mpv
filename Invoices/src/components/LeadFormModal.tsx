import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Lead, leadsApi, LeadStage } from '../services/api';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Lead; // Dados para edição (opcional)
}

export const LeadFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    isPublic: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!initialData;

  // Atualiza formData quando initialData mudar (importante para edição)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        notes: initialData.notes || '',
        isPublic: initialData.isPublic || false,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
        isPublic: false,
      });
    }
  }, [initialData, isOpen]);

  // Foco automático no primeiro input ao abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        document.querySelector('input[name="name"]')?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.name?.trim() || !formData.email?.trim()) {
    toast.error('Nome e Email são obrigatórios');
    return;
  }

  setIsSubmitting(true);

  try {
    if (isEdit && initialData?._id) {
      await leadsApi.update(initialData._id, formData);
      toast.success('Lead atualizado com sucesso!');
    } else {
      await leadsApi.create({
        ...formData,
        stage: 'new' as LeadStage,
      });
      toast.success('Lead criado com sucesso!');
      
      // RESETAR O FORMULÁRIO AQUI (apenas para novas criações)
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
        isPublic: false,
      });
    }

    onSuccess();
    onClose();
  } catch (err: any) {
    console.error('Erro ao salvar lead:', err);
    toast.error(err.message || 'Erro ao guardar lead. Tente novamente.');
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEdit ? 'Editar Lead' : 'Novo Lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
              placeholder="Nome completo do lead"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
              placeholder="exemplo@dominio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              name="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="+258 84 XXX XXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas / Observações
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Informações adicionais sobre o lead..."
            />
          </div>
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm font-medium text-gray-700 cursor-pointer">
              Tornar este lead visível para toda a equipa
            </label>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isSubmitting ? 'A guardar...' : isEdit ? 'Atualizar Lead' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};