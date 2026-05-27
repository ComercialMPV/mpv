import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { goalsApi } from '../services/api';

interface PeriodOption {
  value: 'monthly' | 'quarterly' | 'semester' | 'annual';
  label: string;
  divisor: number;
  maxDays: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'monthly', label: 'Mensal', divisor: 12, maxDays: 31 },
  { value: 'quarterly', label: 'Trimestral', divisor: 4, maxDays: 122 },
  { value: 'semester', label: 'Semestre', divisor: 2, maxDays: 183 },
  { value: 'annual', label: 'Anual', divisor: 1, maxDays: 365 },
];

interface GoalSetupFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    _id?: string;                                     // id para edição
    period?: 'monthly' | 'quarterly' | 'semester' | 'annual';
    startDate?: string;
    endDate?: string;
    financialTarget?: number;
    year: number;
    annualTarget: number;
    monthlyTarget: number;
    quarterlyTarget: number;
    semesterTarget: number;
    achievementStrategy: 'products' | 'services' | 'combos' | 'mixed';
    contingencyMargin: number;
    breakdown?: Array<{ itemType: 'Product' | 'Service' | 'Combo'; percentage: number }>;
    notes?: string;
    status?: 'draft' | 'active' | 'completed' | 'archived';
  };
  isEdit?: boolean;
}

export default function GoalSetupForm({
  onClose,
  onSuccess,
  initialData,
  isEdit = false,
}: GoalSetupFormProps) {
  // ao abrir em edição usamos o período guardado, senão 'monthly'
  const selectedPeriod =
    PERIOD_OPTIONS.find((p) => p.value === (initialData?.period ?? 'monthly')) ||
    PERIOD_OPTIONS[0];
  // base para o campo "Financial Target"
  const initialFinancialTarget = initialData?.financialTarget ?? 0;

  const [formData, setFormData] = useState({
    year: initialData?.year || new Date().getFullYear(),
    annualTarget: initialData?.annualTarget || 0,
    achievementStrategy: initialData?.achievementStrategy || 'mixed' as const,
    contingencyMargin: initialData?.contingencyMargin || 0.1,
    breakdown: initialData?.breakdown || [
      { itemType: 'Product' as const, percentage: 0 },
      { itemType: 'Service' as const, percentage: 0 },
      { itemType: 'Combo' as const, percentage: 0 },
    ],
    notes: initialData?.notes || '',
    period: initialData?.period || 'monthly',
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    endDate:
      initialData?.endDate ||
      new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    financialTarget: initialFinancialTarget,
  });

    // se o componente for reaberto com outros dados, repopulamos
  useEffect(() => {
    if (initialData) {
      setFormData((f) => ({
        ...f,
        year: initialData.year,
        annualTarget: initialData.annualTarget,
        achievementStrategy: initialData.achievementStrategy,
        contingencyMargin: initialData.contingencyMargin,
        breakdown: initialData.breakdown || f.breakdown,
        notes: initialData.notes || '',
        period: initialData.period || f.period,
        startDate: initialData.startDate || f.startDate,
        endDate: initialData.endDate || f.endDate,
        financialTarget: initialData.financialTarget ?? f.financialTarget,
      }));
    }
  }, [initialData]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  

  // Calculate derived values
  const selectedPeriodObj = PERIOD_OPTIONS.find(p => p.value === formData.period) || PERIOD_OPTIONS[0];
  const annualTarget = formData.financialTarget * selectedPeriodObj.divisor;
  const monthlyTarget = annualTarget / 12;
  const semesterTarget = annualTarget / 2;
  const breakdownTotal = formData.breakdown.reduce((sum, item) => sum + item.percentage, 0);

  const handleAnnualTargetChange = (value: string) => {
    const num = parseFloat(value) || 0;
    setFormData({ ...formData, annualTarget: num });
  };

  const handleContingencyChange = (value: string) => {
    const num = parseFloat(value) || 0.1;
    setFormData({ ...formData, contingencyMargin: Math.min(1, Math.max(0, num)) });
  };

  const handleBreakdownChange = (
    index: number,
    field: 'percentage',
    value: string
  ) => {
    const newBreakdown = [...formData.breakdown];
    newBreakdown[index] = {
      ...newBreakdown[index],
      [field]: parseFloat(value) || 0,
    };
    setFormData({ ...formData, breakdown: newBreakdown });
  };

  const handlePeriodChange = (value: PeriodOption['value']) => {
    setFormData({ ...formData, period: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.year || formData.year < 2020 || formData.year > 2100) {
      setError('Year must be between 2020 and 2100');
      return;
    }

    if (formData.financialTarget <= 0) {
      setError('Financial target must be greater than 0');
      return;
    }

    const { daysDiff } = calculateTargetsByPeriod();
    if (daysDiff > selectedPeriodObj.maxDays) {
      setError(`Date range exceeds maximum days for ${selectedPeriodObj.label} period (${selectedPeriodObj.maxDays} days)`);
      return;
    }

    if (formData.achievementStrategy === 'mixed' && breakdownTotal !== 100) {
      setError(`Breakdown percentages must sum to 100% (currently ${breakdownTotal}%)`);
      return;
    }

    try {
      setLoading(true);

     const payload = {
        period: formData.period,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        financialTarget: formData.financialTarget,
        year: formData.year,
        annualTarget,
        monthlyTarget,
        semesterTarget,
        achievementStrategy: formData.achievementStrategy,
        contingencyMargin: formData.contingencyMargin,
        breakdown:
          formData.achievementStrategy === 'mixed'
            ? formData.breakdown.map((item) => ({
                itemType: item.itemType,
                percentage: item.percentage,
                targetAmount: (annualTarget * item.percentage) / 100,
              }))
            : [],
        status: isEdit ? initialData?.status || 'draft' : 'draft',
        notes: formData.notes,
      };

      if (isEdit && initialData?._id) {
        await goalsApi.update(initialData._id, payload);
      } else {
        await goalsApi.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  // Calculate targets based on selected period and date range
  const calculateTargetsByPeriod = () => {
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return { daysDiff };
  };

  const { daysDiff } = calculateTargetsByPeriod();
  const dailyTarget = formData.financialTarget / daysDiff;
  const weeklyTarget = formData.financialTarget / (daysDiff / 7);
  const monthlyTargetPeriod = formData.financialTarget / (daysDiff / 31);
  const quarterlyTarget = formData.financialTarget / (daysDiff / 90);
  const semesterTargetPeriod = formData.financialTarget / (daysDiff / 180);
  const annualTargetPeriod = formData.financialTarget / (daysDiff / 365);

  const renderCalculatedValues = () => {
    switch (formData.period) {
      case 'monthly':
        return (
          <>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Mennsal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{formData.financialTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Diário:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{dailyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
          </>
        );
      case 'quarterly':
        return (
          <>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Trimestral:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{formData.financialTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Mensal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{monthlyTargetPeriod.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Semanal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{weeklyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Diário:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{dailyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
          </>
        );
      case 'semester':
        return (
          <>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo do Semestre:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{formData.financialTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Mensal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{monthlyTargetPeriod.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Semanal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{weeklyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Diário:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{dailyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
          </>
        );
      case 'annual':
        return (
          <>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Anual:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{formData.financialTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo do Semestre:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{semesterTargetPeriod.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Mensal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{monthlyTargetPeriod.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Semanal:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{weeklyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-700">Objectivo Diário:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT{dailyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{isEdit ? 'Actualizar Objectivo' : 'Criar novo Objectivo'}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-800 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Row 1: Period Type & Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Perido *</label>
              <select
                value={formData.period}
                onChange={(e) => handlePeriodChange(e.target.value as PeriodOption['value'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Inicio *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Término *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Financial Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objectivo Financeiro (MT) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.financialTarget}
              onChange={(e) => setFormData({ ...formData, financialTarget: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Objectivo para o periodo selecionado</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Calculated Values Display */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2">
            {renderCalculatedValues()}
          </div>

          {/* Row 2: Strategy & Contingency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estratégia de Realização
              </label>
              <select
                value={formData.achievementStrategy}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    achievementStrategy: e.target.value as
                      | 'products'
                      | 'services'
                      | 'combos'
                      | 'mixed',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="products">Produtos</option>
                <option value="services">Serviços</option>
                <option value="combos">Combos</option>
                <option value="mixed">Misturado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margem de Contigência ({(formData.contingencyMargin * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={formData.contingencyMargin}
                onChange={(e) => handleContingencyChange(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Reserva para eventos inesperados (0-50%)
              </p>
            </div>
          </div>

          {/* Breakdown for Mixed Strategy */}
          {formData.achievementStrategy === 'mixed' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Divisão do Objectivo por Tipo</h3>
              <div className="space-y-3">
                {formData.breakdown.map((item, index) => (
                  <div key={item.itemType} className="flex items-center gap-4">
                    <label className="w-24 font-medium text-gray-700">{item.itemType}</label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={item.percentage}
                        onChange={(e) =>
                          handleBreakdownChange(index, 'percentage', e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="w-12 text-right text-gray-600">%</span>
                      <span className="w-28 text-right text-sm text-gray-500">
                        $
                        {(
                          (annualTarget * item.percentage) /
                          100
                        ).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Breakdown Total */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total</span>
                <span
                  className={`font-bold text-lg ${
                    breakdownTotal === 100
                      ? 'text-green-600'
                      : breakdownTotal > 100
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {breakdownTotal}%
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
            >
              {loading ? 'Salvando...' : isEdit ? 'Actualizar Objectivo' : 'Criar Objectivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}