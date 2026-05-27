import React from 'react';
import { Eye, Download, TrendingUp, Info } from 'lucide-react';

interface SaleItem {
  name: string;
  quantity: number;
  priceAtSale: number;
}

interface Sale {
  _id: string;
  customer: {
    name: string;
    phone?: string;
  };
  items: SaleItem[];
  total: number;
  commissionValue?: number;     // opcional, pode não existir em todas vendas
  commissionRate?: number;      // opcional
  status: string;
  createdAt: string;
}

interface PartnerStats {
  totalSales: number;
  totalCommission: number;
  activeClients: number;
  commissionRate: number;
}

interface PartnerSalesTableProps {
  sales: Sale[];
}

export const PartnerSalesTable = ({ sales }: PartnerSalesTableProps) => {
  console.log('Vendas recebidas na tabela:', sales?.length ?? 0, 'itens');

  const safeSales = Array.isArray(sales) ? sales : [];

  // Log de debug (mantém para testar)
  if (safeSales.length > 0) {
    console.log('Primeira venda exemplo:', {
      id: safeSales[0]._id,
      total: safeSales[0].total,
      commissionRate: safeSales[0].commissionRate,
      commissionValue: safeSales[0].commissionValue,
      calculated: safeSales[0].total * (safeSales[0].commissionRate / 100),
    });
  }

  if (safeSales.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
        <TrendingUp size={40} className="mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">Nenhuma venda encontrada</p>
        <p className="text-sm mt-2">As vendas associadas a si aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
      <table className="w-full text-left min-w-[800px]">
        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500">
          <tr>
            <th className="px-6 py-4">Cliente</th>
            <th className="px-6 py-4 text-right">Valor Bruto</th>
            <th className="px-6 py-4 text-right">Taxa Comissão</th>
            <th className="px-6 py-4 text-right">Comissão Recebida</th>
            <th className="px-6 py-4 text-right">Ganho Líquido</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {safeSales.map((sale) => {
            const commissionRate = Number(sale.commissionRate) || 0;
            let commissionValue = Number(sale.commissionValue) || 0;

            // Fallback (já tens, mas reforçado)
            if (commissionValue <= 0 && commissionRate > 0 && Number(sale.total) > 0) {
              commissionValue = Number(sale.total) * (commissionRate / 100);
            }

            const netGain = commissionValue;

            const hasCommission = commissionValue > 0;

            return (
              <tr key={sale._id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {sale.customer?.name || 'Consumidor Final'}
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  MT {(Number(sale.total) || 0).toLocaleString('pt-MZ')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className={`font-medium ${hasCommission ? 'text-green-700' : 'text-gray-400'}`}>
                      {commissionRate.toFixed(1)}%
                    </span>
                    {commissionRate === 0 && (
                      <Info size={14} className="text-gray-400 opacity-60" title="Sem comissão registada" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-bold">
                  <span className={hasCommission ? 'text-green-600' : 'text-gray-400'}>
                    MT {commissionValue.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold">
                  <span className={hasCommission ? 'text-emerald-600' : 'text-gray-400'}>
                    MT {netGain.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      sale.status === 'Pago 100%' ? 'bg-green-100 text-green-700' :
                      sale.status === 'Cancelada' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {sale.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};