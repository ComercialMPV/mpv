import React, { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface CouponManagerProps {
  onApply: (discount: { code: string; value: number; type: string }) => void;
  subtotal: number;
}

export const CouponManager: React.FC<CouponManagerProps> = ({ onApply, subtotal }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await api.coupons.validate(code);
      if (res.valid) {
        onApply({ code, value: res.value, type: res.discountType });
        toast.success('Cupão aplicado!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Cupão inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input 
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código do Cupão" 
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button 
        onClick={handleValidate}
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition disabled:opacity-50"
      >
        {loading ? '...' : 'Aplicar'}
      </button>
    </div>
  );
};