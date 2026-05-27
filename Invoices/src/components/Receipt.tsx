// src/components/Receipt.tsx
import React from 'react';

interface ReceiptProps {
  sale: any;
  company: any;
  items: any[];
  subtotal: number;
  discount?: number;          // desconto global
  total: number;
  taxRate?: number;           // opcional
  amountPaid: number;
  paymentMethod: string;
  saleStatus: string;
  createdBy?: string;
  dueDate?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;             // observações gerais
}

export const Receipt: React.FC<ReceiptProps> = ({
  sale,
  company,
  items,
  subtotal,
  discount = 0,
  total,
  taxRate = 16,
  amountPaid,
  paymentMethod,
  saleStatus,
  dueDate,
  customerName,
  customerPhone,
  notes,
  createdBy,
}) => {
  const date = new Date().toLocaleString('pt-MZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

 const operadorNome = (() => {
  // Caso 1: prop createdBy já veio como string
  if (typeof createdBy === 'string' && createdBy.trim()) {
    return createdBy.trim();
  }

  // Caso 2: vem o objeto populated do backend
  if (sale?.createdBy && typeof sale.createdBy === 'object' && !Array.isArray(sale.createdBy)) {
    const first = sale.createdBy.firstName || '';
    const last = sale.createdBy.lastName || '';
    const fullName = `${first} ${last}`.trim();
    return fullName || 'Não identificado';
  }

  // Caso 3: fallback
  return 'Não identificado';
})();

  const hasItemDiscount = items.some((item) => (item.discount || 0) > 0);

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: '80mm',
        margin: '0 auto',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'monospace',
        fontSize: '10px',
        lineHeight: '1.1',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>
          {company?.name || 'MINHA EMPRESA LDA'}
        </h2>
        {company?.address && <p style={{ fontSize: '12px' }}>{company.address}</p>}
        {company?.phone && <p style={{ fontSize: '12px' }}>Tel: {company.phone}</p>}
        <p style={{ fontSize: '12px', marginTop: '4px' }}>
          NUIT: {company?.taxId || company?.vatNumber || '—'}
        </p>
      </div>

      <hr style={{ border: '1px dashed #6b7280', margin: '8px 0' }} />

      {/* Informações da venda */}
      <div style={{ fontSize: '12px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Data/Hora:</span>
          <span>{date}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Recibo Nº:</span>
          <span style={{ fontWeight: 'bold' }}>{sale?._id?.toString().slice(-8) || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Operador:</span>
          <span>{operadorNome}</span>
        </div>
        {customerName && customerName !== 'Consumidor Final' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cliente:</span>
            <span>
              {customerName}
              {customerPhone ? ` • ${customerPhone}` : ''}
            </span>
          </div>
        )}
        {sale?.origin === 'pending-room' && sale?.pendingRoomId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c2410c' }}>
            <span>Origem:</span>
            <span>Room Pendência</span>
          </div>
        )}
      </div>

      <hr style={{ border: '1px dashed #6b7280', margin: '8px 0' }} />

      {/* Tabela de itens */}
      <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #9ca3af' }}>
            <th style={{ textAlign: 'left', padding: '4px 0' }}>Descrição</th>
            <th style={{ textAlign: 'center', padding: '4px 0' }}>Qtd</th>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>P. Unit.</th>
            {hasItemDiscount && <th style={{ textAlign: 'right', padding: '4px 0' }}>Desc.</th>}
            <th style={{ textAlign: 'right', padding: '4px 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const qty = item.qty || item.quantity || 1;
            const unitPrice = item.priceAtSale || item.price || item.basePrice || 0;
            const itemDiscount = item.discount || 0;
            const lineTotal = qty * unitPrice - itemDiscount;
            const showDeliveryInfo = item.deliveryDays > 0 || item.orderPrice > 0;

            return (
              <React.Fragment key={index}>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 2px 4px 0', width: '40%' }}>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                    {item.unit && item.unit !== 'unid' && (
                      <div style={{ fontSize: '8px', color: '#4b5563' }}>{item.unit}</div>
                    )}
                    {item.category && (
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>{item.category}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '4px 0' }}>{qty}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>
                    {unitPrice.toLocaleString('pt-MZ')}
                  </td>
                  {hasItemDiscount && (
                    <td style={{ textAlign: 'right', padding: '4px 0', color: '#dc2626' }}>
                      {itemDiscount > 0 ? `-${itemDiscount.toLocaleString('pt-MZ')}` : '—'}
                    </td>
                  )}
                  <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '500' }}>
                    {lineTotal.toLocaleString('pt-MZ')}
                  </td>
                </tr>

                {showDeliveryInfo && (
                  <tr>
                    <td
                      colSpan={hasItemDiscount ? 5 : 4}
                      style={{ fontSize: '8px', color: '#4b5563', padding: '0 0 4px 8px' }}
                    >
                      {item.orderPrice > 0 && (
                        <>Preço encomenda: {item.orderPrice.toLocaleString('pt-MZ')} MT • </>
                      )}
                      {item.deliveryDays > 0 && <>Entrega em {item.deliveryDays} dias</>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <hr style={{ border: '1px dashed black', margin: '8px 0' }} />

      {/* Totais */}
      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal:</span>
          <span>{subtotal.toLocaleString('pt-MZ')} MT</span>
        </div>

        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
            <span>Desconto global:</span>
            <span>-{discount.toLocaleString('pt-MZ')} MT</span>
          </div>
        )}

        {taxRate > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>IVA ({taxRate}%):</span>
            <span>
              {((total - subtotal) / (1 + taxRate / 100) * (taxRate / 100)).toFixed(2)} MT
            </span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '16px',
            borderTop: '1px dashed black',
            paddingTop: '4px',
            marginTop: '8px',
          }}
        >
          <span>Total a pagar:</span>
          <span>{total.toLocaleString('pt-MZ')} MT</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span>Valor pago:</span>
          <span>{amountPaid.toLocaleString('pt-MZ')} MT</span>
        </div>

        {total > amountPaid && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontWeight: '500' }}>
            <span>Falta receber:</span>
            <span>{(total - amountPaid).toLocaleString('pt-MZ')} MT</span>
          </div>
        )}

        {amountPaid > total && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: '500' }}>
            <span>Troco:</span>
            <span>{(amountPaid - total).toLocaleString('pt-MZ')} MT</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '8px' }}>
          <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
            {paymentMethod}
          </span>
          <span>{saleStatus}</span>
        </div>

        {dueDate && total > amountPaid && (
          <div style={{ fontSize: '9px', textAlign: 'center', marginTop: '4px', color: '#dc2626' }}>
            Pagamento final até: {new Date(dueDate).toLocaleDateString('pt-MZ')}
          </div>
        )}
      </div>

      {notes && (
        <>
          <hr style={{ border: '1px dashed #9ca3af', margin: '8px 0' }} />
          <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#374151' }}>
            <strong>Observações:</strong> {notes}
          </div>
        </>
      )}

      <hr style={{ border: '1px dashed black', margin: '12px 0' }} />

      {/* Rodapé */}
      <div style={{ textAlign: 'center', fontSize: '9px', lineHeight: '1.3' }}>
        <p>Obrigado pela preferência!</p>
        <p>Volte sempre • {company?.slogan || 'Sua satisfação é o nosso sucesso'}</p>
        <p style={{ marginTop: '8px', fontSize: '8px', color: '#4b5563' }}>
          Sistema de Gestão Comercial • {new Date().getFullYear()}
        </p>
      </div>

      {/* Linha de corte */}
      <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '10px', marginTop: '16px' }}>
        * * * * * * * * * * * * *
      </div>
    </div>
  );
};