// src/pages/OrderSuccess.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Home, ArrowLeft, Receipt } from 'lucide-react';
import { api, transactionsApi, pdfApi } from '../services/api';
import toast from 'react-hot-toast';

interface Transaction {
  _id: string;
  externalRef: string;
  amount: number;
  status: string;
  paymentMethod: string;
  customerName?: string;
  createdAt: string;
  metadata?: any;
}

export const OrderSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const externalRef = searchParams.get('ref');
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  

  const finalizeCheckout = useCallback(async (ref: string) => {
    try {
      const res = await api.checkout.finalize(ref);
      return res;
    } catch (err) {
      console.error('Erro ao finalizar checkout:', err);
      return null;
    }
  }, []);

  useEffect(() => {
   if (!externalRef) {
     toast.error("Referência não encontrada");
     navigate('/');
     return;
   }

   let interval: NodeJS.Timeout | null = null;
   let attempts = 0;
   const MAX_ATTEMPTS = 25; // ~2 minutos (polling a cada 5s)

   const loadTransaction = async () => {
     try {
       // Tenta finalizar (para VISA: cria Transaction; para M-Pesa/E-Mola: webhook já pode ter criado)
       const result = await finalizeCheckout(externalRef!);
       
       if (result?.found && result?.transaction) {
         const tx = result.transaction;
         setTransaction(tx);

         if (tx.status === 'success' || tx.status === 'failed') {
           if (interval) clearInterval(interval);
           if (tx.status === 'failed') {
             toast.error("Pagamento não foi confirmado.");
             setTimeout(() => navigate(`/order-failed?ref=${externalRef}`), 1500);
           }
         }
         // Se ainda 'pending', continua polling
       } else {
         // Fallback inicial
         setTransaction({
           _id: 'unknown',
           externalRef,
           amount: 0,
           status: 'pending',
           paymentMethod: 'mobile',
           customerName: 'Cliente',
           createdAt: new Date().toISOString(),
         });
       }
     } catch (error) {
       console.error('Erro ao buscar transação:', error);
     } finally {
       setLoading(false);
     }
   };

   loadTransaction();

   interval = setInterval(() => {
     attempts++;
     loadTransaction();

     if (attempts >= MAX_ATTEMPTS) {
       if (interval) clearInterval(interval);
       toast.info("A confirmação pode demorar mais alguns segundos.", { duration: 4000 });
     }
   }, 5000);

   return () => {
     if (interval) clearInterval(interval);
   };
 }, [externalRef, navigate, finalizeCheckout]);

  const handleDownloadReceipt = async () => {
    if (!transaction) return;

    setDownloading(true);
    try {
      toast.loading("Gerando recibo...", { id: 'download' });

      // Tenta primeiro via Transaction (se tiver saleId no metadata)
      const saleId = transaction.metadata?.saleId || transaction._id;

      const result = await pdfApi.generateAndDownload(saleId);

      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Recibo_${transaction.externalRef}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Recibo descarregado com sucesso!", { id: 'download' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível gerar o recibo. Tente novamente.", { id: 'download' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">A verificar o seu pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Cabeçalho de Sucesso */}
          <div className="bg-emerald-600 text-white py-16 px-8 text-center">
            <CheckCircle className="w-24 h-24 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-3">Pagamento Confirmado!</h1>
            <p className="text-emerald-100 text-lg">
              Obrigado pela sua compra. O pagamento foi processado com sucesso.
            </p>
          </div>

          <div className="p-10 space-y-8">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">REFERÊNCIA DO PEDIDO</p>
              <p className="font-mono text-2xl font-semibold text-gray-900 tracking-wider">
                {transaction?.externalRef}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="text-sm text-gray-500 mb-1">VALOR PAGO</p>
                <p className="text-4xl font-bold text-emerald-600">
                  {(transaction?.amount || 0).toLocaleString()} MT
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="text-sm text-gray-500 mb-1">MÉTODO DE PAGAMENTO</p>
                <p className="text-2xl font-semibold capitalize">
                  {transaction?.paymentMethod === 'emola' ? 'E-Mola' :
                   transaction?.paymentMethod === 'mpesa' ? 'M-Pesa' : 
                   transaction?.paymentMethod || 'Carteira Móvel'}
                </p>
              </div>
            </div>

            {transaction?.customerName && (
              <div>
                <p className="text-sm text-gray-500 mb-1">CLIENTE</p>
                <p className="text-xl font-medium">{transaction.customerName}</p>
              </div>
            )}

            <div className="pt-6 border-t text-center text-emerald-600 font-medium">
              Uma confirmação foi enviada para o seu email.
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="border-t p-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownloadReceipt}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-semibold transition disabled:opacity-70"
            >
              <Download size={20} />
              {downloading ? 'Gerando PDF...' : 'Baixar Recibo'}
            </button>

            <Link
              to="/"
              className="flex-1 flex items-center justify-center gap-3 border border-gray-300 py-4 rounded-2xl hover:bg-gray-50 font-semibold transition"
            >
              <Home size={20} />
              Voltar ao Início
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          Qualquer dúvida? Contacte-nos através do suporte da empresa.
        </p>
      </div>
    </div>
  );
};

export default OrderSuccess;