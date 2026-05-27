import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Loader2, 
  AlertCircle, 
  Download, 
  Printer,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { shareApi } from '../services/api';
import html2pdf from 'html2pdf.js';

export const ShareDocumentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [documentData, setDocumentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) loadDocument();
  }, [token]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shareApi.getSharedProposal(token!);
      if (!data) throw new Error('Documento não encontrado.');
      setDocumentData(data);
    } catch (err: any) {
      console.error('Erro ao carregar documento:', err);
      setError(err.message || 'Esta ligação não é válida.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current) return;
    const opt = {
      margin: 0,
      filename: `proposta-${token?.slice(-6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(contentRef.current).save();
  };

  // Helper para formatar endereço (evita erro de renderização de objeto)
  const formatAddress = (address: any) => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    const { street, city, state, country } = address;
    return [street, city, state, country].filter(Boolean).join(', ');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  if (error || !documentData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{error}</p>
      </div>
    </div>
  );

  // --- LÓGICA DE CÁLCULOS COM IVA ---
  const items = documentData.items || [];
  const taxRate = Number(documentData.company?.taxRate) || 0; // Ex: 17 para 17%
  
  const subtotal = items.reduce((acc: number, item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || Number(item.price) || 0;
    return acc + (qty * price);
  }, 0);

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Navbar de Ações */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">MPV</div>
            <span className="font-bold text-gray-900 hidden sm:block">Visualização de Proposta</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition">
              <Printer size={20}/>
            </button>
            <button onClick={handleDownloadPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition text-sm">
              <Download size={18}/> Descarregar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Folha A4 */}
        <div ref={contentRef} className="bg-white shadow-2xl rounded-sm overflow-hidden min-h-[297mm]">
          
          {/* Cabeçalho Profissional */}
          <div className="p-12 ">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Proposta Comercial</h1>
                <div className="flex items-center gap-2 mt-1">
                   <Calendar size={14} className="text-gray-400" />
                   <p className="text-gray-400 font-medium text-xs uppercase tracking-widest">
                     Expira em: {new Date(documentData.expiresAt).toLocaleDateString('pt-MZ')}
                   </p>
                </div>
              </div>
              {documentData.company?.logo && (
                <img src={documentData.company.logo} className="h-16 object-contain" alt="Logo" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-10 text-sm">
              <div>
                <p className="font-black text-indigo-600 uppercase text-[10px] mb-2 tracking-widest text-opacity-70">Emitido por:</p>
                <p className="font-bold text-gray-900 text-lg">{documentData.company?.name}</p>
                <p className="text-gray-500 leading-relaxed">{formatAddress(documentData.company?.address)}</p>
                <p className="text-gray-500 font-medium mt-1">{documentData.company?.email}</p>
              </div>
              <div>
                <p className="font-black text-indigo-600 uppercase text-[10px] mb-2 tracking-widest text-opacity-70">Para:</p>
                <p className="font-bold text-gray-900 text-lg">{documentData.client?.name || documentData.recipients?.[0]?.name}</p>
                <p className="text-gray-500">{documentData.client?.email || documentData.recipients?.[0]?.email}</p>
              </div>
            </div>
          </div>

          <div className="p-12">
            {/* Tabela de Itens */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 text-left">
                  <th className="py-4 font-black uppercase text-[11px] tracking-widest">Descrição do Item/Serviço</th>
                  <th className="py-4 font-black uppercase text-[11px] tracking-widest text-center w-20">Qtd</th>
                  <th className="py-4 font-black uppercase text-[11px] tracking-widest text-right w-32">Unitário</th>
                  <th className="py-4 font-black uppercase text-[11px] tracking-widest text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any, idx: number) => {
                  const qty = Number(item.quantity) || 1;
                  const price = Number(item.unitPrice || item.price) || 0;
                  return (
                    <tr key={idx} className="group">
                      <td className="py-5">
                        <span className="block font-bold text-gray-900">{item.description || item.name}</span>
                      </td>
                      <td className="py-5 text-center text-gray-600 font-medium">{qty}</td>
                      <td className="py-5 text-right text-gray-600">{price.toLocaleString('pt-MZ')}</td>
                      <td className="py-5 text-right font-bold text-gray-900">{(qty * price).toLocaleString('pt-MZ')} MT</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Resumo Financeiro com IVA */}
            <div className="mt-10 flex justify-end">
              <div className="w-72 space-y-3">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('pt-MZ')} MT</span>
                </div>
                
                {taxRate > 0 && (
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>IVA ({taxRate}%)</span>
                    <span>{taxAmount.toLocaleString('pt-MZ')} MT</span>
                  </div>
                )}

                <div className="flex justify-between text-2xl font-black border-t-4 border-gray-900 pt-4 mt-2">
                  <span>TOTAL</span>
                  <span className="text-indigo-600">{total.toLocaleString('pt-MZ')} MT</span>
                </div>
              </div>
            </div>

            {/* Mensagem e Notas */}
            {documentData.message && (
              <div className="mt-20">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Notas e Condições</h4>
                <div className="p-6 bg-gray-50 rounded-2xl border-l-4 border-indigo-600">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap italic text-sm">
                    {documentData.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Externo */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
            <ExternalLink size={12} />
            Documento Seguro • Gerado por Meu Ponto de Venda
          </p>
        </div>
      </div>
    </div>
  );
};