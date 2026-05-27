// components/ui/ConfirmDeleteModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;          // ex: "ELIMINAR"
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState('');
  const isConfirmed = inputValue.trim().toUpperCase() === confirmText.toUpperCase();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Cabeçalho vermelho para alerta */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center gap-3">
          <AlertTriangle size={24} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para confirmar, digite <strong className="text-red-600">{confirmText}</strong> abaixo:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Digite ${confirmText} aqui`}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!isConfirmed}
              className={`px-6 py-2 rounded-lg text-white flex items-center gap-2 transition-colors ${
                isConfirmed
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-400 cursor-not-allowed'
              }`}
            >
              Eliminar Permanentemente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};