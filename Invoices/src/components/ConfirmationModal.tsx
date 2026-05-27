// ConfirmationModal.tsx
import React, { useState } from 'react';
import { CheckCircle2, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConfirmationModalProps {
  showConfirmModal: boolean;
  setShowConfirmModal: (show: boolean) => void;
  saleStatus: string;
  total: number;
  useWallet: boolean;
  actualWalletDeduction: number;
  amountPaid: number;
  handleCheckout: () => Promise<void>;   // ← Mudado para Promise
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  showConfirmModal,
  setShowConfirmModal,
  saleStatus,
  total,
  useWallet,
  actualWalletDeduction,
  amountPaid,
  handleCheckout,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!showConfirmModal) return null;

  const getMessage = () => {
    if (saleStatus === 'Pago 100%') {
      return {
        title: 'Finalizar Venda',
        description: 'Tem CERTEZA que deseja finalizar esta venda agora?',
        confirmText: 'Sim, Finalizar Venda',
      };
    }
    if (saleStatus === 'Pago 50%' || saleStatus === 'Reserva') {
      return {
        title: 'Registar Pagamento Parcial',
        description: 'O cliente ainda tem valor em falta. Deseja registar esta transação?',
        confirmText: 'Sim, Registar',
      };
    }
    return {
      title: 'Confirmar Registo',
      description: 'Deseja registar esta transação pendente?',
      confirmText: 'Sim, Registar',
    };
  };

  const { title, description, confirmText } = getMessage();

// Altere a função handleConfirm no ConfirmationModal.tsx
// ConfirmationModal.tsx

const handleConfirm = async () => {
  try {
    setIsLoading(true);
    await handleCheckout();     // this will call finalizeSaleVisuals which closes the modal
  } catch (err) {
    console.error("Erro no fluxo do modal:", err);
    toast.error("Erro ao processar a venda.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5">
          <p className="text-gray-600 leading-relaxed">{description}</p>

          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900">
                {Number(total).toLocaleString('pt-MZ')} MT
              </span>
            </div>
            {saleStatus !== 'Pago 100%' && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Pago agora:</span>
                <span className="font-bold text-green-700">
                  {(useWallet ? actualWalletDeduction : amountPaid).toLocaleString('pt-MZ')} MT
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="px-6 py-5 bg-gray-50 flex gap-3 justify-end border-t border-gray-100">
          <button
            onClick={() => setShowConfirmModal(false)}
            disabled={isLoading}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
           
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={18} />
                Processando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};