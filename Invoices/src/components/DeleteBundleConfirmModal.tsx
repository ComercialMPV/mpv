// src/components/DeleteBundleConfirmModal.tsx
import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteBundleConfirmModalProps {
  bundle: any;  // Bundle type – ajuste conforme tua interface Bundle
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function DeleteBundleConfirmModal({
  bundle,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteBundleConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-red-50 px-6 py-5 border-b border-red-100 flex items-center gap-3">
          <div className="bg-red-100 p-2.5 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-800">
            Confirmar Eliminação
          </h2>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5">
          <p className="text-gray-700 font-medium">
            Tem a certeza que deseja eliminar permanentemente este pacote/plano?
          </p>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <div className="font-bold text-gray-900 text-lg mb-1">
              {bundle.name}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                bundle.type === 'Subscription' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {bundle.type === 'Subscription' ? 'Subscrição' : 'Combo'}
              </span>
              • {bundle.items?.length || 0} item{bundle.items?.length !== 1 ? 's' : ''}
            </div>
            {bundle.price && (
              <div className="mt-2 text-sm font-medium text-green-700">
                {Number(bundle.price).toLocaleString('pt-MZ')} MZN
              </div>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <p>
                Esta ação é <strong>irreversível</strong>. O pacote será removido do sistema e não poderá ser recuperado.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isDeleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>A eliminar...</span>
              </>
            ) : (
              <>
                <Trash2 size={18} />
                <span>Eliminar Pacote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}