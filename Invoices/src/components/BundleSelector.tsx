// src/pages/BundleSelector.tsx  (ou onde preferires colocar)
import React, { useState, useEffect } from 'react';
import { Plus, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, Bundle } from '../services/api';

import BundleGrid from './BundleGrid';
import BundleForm from './BundleForm';
import DeleteBundleConfirmModal from './DeleteBundleConfirmModal';

export default function BundleSelector() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBundles = async () => {
    try {
      const data = await api.bundles.getAll();
      setBundles(data.filter(b => b.isActive && !b.isArchived));
    } catch (err) {
      toast.error('Erro ao carregar pacotes');
    }
  };

  useEffect(() => {
    loadBundles();
  }, []);

 const handleOpenNew = () => {
  console.log('Abrindo formulário NOVO');
  setEditingBundle(null);
  setIsFormOpen(true);
};

const handleEdit = (bundle: Bundle) => {
  console.log('Abrindo formulário EDIÇÃO para:', bundle.name);
  setEditingBundle(bundle);
  setIsFormOpen(true);
};

const handleCloseForm = () => {
  console.log('Fechando formulário');
  setIsFormOpen(false);
  setEditingBundle(null);
};

  const handleFormSuccess = () => {
    loadBundles();
    handleCloseForm();
    toast.success(editingBundle ? 'Pacote atualizado!' : 'Pacote criado!');
  };

  const handleRequestDelete = (bundle: Bundle) => {
    setBundleToDelete(bundle);
  };

  const handleCancelDelete = () => {
    setBundleToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!bundleToDelete) return;
    setLoading(true);
    try {
      await api.bundles.delete(bundleToDelete._id);
      toast.success('Pacote eliminado');
      loadBundles();
    } catch (err) {
      toast.error('Erro ao eliminar pacote');
    } finally {
      setLoading(false);
      setBundleToDelete(null);
    }
  };

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Layers className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
              Pacotes & Planos
            </h1>
            <p className="text-sm text-gray-600">
              Combos e subscrições disponíveis para venda
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium shadow-md transition"
        >
          <Plus size={20} />
          Novo Pacote / Plano
        </button>
      </div>

      {/* Grid de pacotes */}
      <BundleGrid
        bundles={bundles}
        onEdit={handleEdit}
        onDelete={handleRequestDelete}
      />

      {/* Formulário (modal ou página) */}
      {isFormOpen && (
        <BundleForm
          initialBundle={editingBundle}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseForm}
        />
      )}

      {/* Confirmação de eliminação */}
      {bundleToDelete && (
        <DeleteBundleConfirmModal
          bundle={bundleToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={loading}
        />
      )}
    </div>
  );
}

