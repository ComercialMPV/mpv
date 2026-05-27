import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { goalsApi, GoalDistribution, Goal, rolesApi } from '../services/api';
import toast from 'react-hot-toast';

interface GoalDistributionFormProps {
  goalId: string;
  goalPeriod: Goal['period'];
  goalFinancialTarget: number;
  goalAnnualTarget: number;
  existingDistributions?: GoalDistribution[];
  initialData?: GoalDistribution;    // novo
  isEdit?: boolean;                  // novo
  onClose: () => void;
  onSuccess: () => void;
}



const PERIOD_LABELS: Record<Goal['period'], string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semester: 'Semestral',
  annual: 'Anual',
};

// Quantos "períodos base" (meses) existem em cada período
const PERIOD_MONTHS: Record<Goal['period'], number> = {
  monthly: 1,
  quarterly: 3,
  semester: 6,
  annual: 12,
};

// Multiplicador para converter de período para anual
const PERIOD_MULTIPLIERS: Record<Goal['period'], number> = {
  monthly: 12,
  quarterly: 4,
  semester: 2,
  annual: 1,
};

// Rótulos para os meses dentro de cada período
const MONTH_LABELS = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez'
];

const getMonthLabelsForPeriod = (period: Goal['period'], startMonth: number = 1): string[] => {
  const monthCount = PERIOD_MONTHS[period];
  const labels: string[] = [];

  for (let i = 0; i < monthCount; i++) {
    const monthIndex = (startMonth + i - 1) % 12; // -1 porque MONTH_LABELS é 0-based
    labels.push(MONTH_LABELS[monthIndex]);
  }
  return labels;
};

export default function GoalDistributionForm({
  goalId,
  goalPeriod,
  goalFinancialTarget,
  goalAnnualTarget,
  existingDistributions = [],
  initialData,
  isEdit = false,
  onClose,
  onSuccess,
}: GoalDistributionFormProps) {
  const monthsInPeriod = PERIOD_MONTHS[goalPeriod];
  const multiplier = PERIOD_MULTIPLIERS[goalPeriod];
  const startMonth = 1; 
  const monthLabels = getMonthLabelsForPeriod(goalPeriod, startMonth);

   // Estado para armazenar os roles buscados da base de dados
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);



  // Inicializar estado com dados de edição se disponível
   const [formData, setFormData] = useState(() => {
    if (initialData && isEdit) {
      const periodTarget = initialData.annualTarget / multiplier;
      const breakdown = Array(monthsInPeriod).fill(0);
      if (initialData.monthlyBreakdown && Array.isArray(initialData.monthlyBreakdown)) {
        initialData.monthlyBreakdown.forEach((item: any, idx: number) => {
          if (idx < monthsInPeriod) {
            breakdown[idx] = item.target || 0;
          }
        });
      }

      const itemTypeTargets = [
        { itemType: 'Product', percentage: 0 },
        { itemType: 'Service', percentage: 0 },
        { itemType: 'Combo', percentage: 0 },
      ];

      if (initialData.itemTypeTargets && Array.isArray(initialData.itemTypeTargets)) {
        initialData.itemTypeTargets.forEach((item: any) => {
          const idx = itemTypeTargets.findIndex(it => it.itemType === item.itemType);
          if (idx !== -1) {
            const percentage = (item.target / initialData.annualTarget) * 100;
            itemTypeTargets[idx] = { ...itemTypeTargets[idx], percentage };
          }
        });
      }

      return {
        role: initialData.role || '',
        periodTarget,
        monthlyBreakdown: breakdown,
        itemTypeTargets,
      };
    }
    // Valores padrão para novo registo
  return {
      role: '' as string,
      periodTarget: 0,
      monthlyBreakdown: Array(monthsInPeriod).fill(0),
      itemTypeTargets: [
        { itemType: 'Product', percentage: 0 },
        { itemType: 'Service', percentage: 0 },
        { itemType: 'Combo', percentage: 0 },
      ],
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMonthlyGrid, setShowMonthlyGrid] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [monthlyEdited, setMonthlyEdited] = useState(false);

   // Função para buscar roles da base de dados
  const fetchRoles = async () => {
  try {
    setLoadingRoles(true);
    const data = await rolesApi.getAll();
    console.log('Roles API Response:', data); // Log para verificar a estrutura da resposta
    const formattedRoles = data.roles.map((role: any) => ({
  value: role._id,
  label: role.roleName,
}));
    setRoles(formattedRoles);
  } catch (err) {
    console.error('Erro ao buscar roles:', err);
    toast.error('Não foi possível carregar os cargos.');
  } finally {
    setLoadingRoles(false);
  }
};

   useEffect(() => {
    fetchRoles();
  }, []);

   const handleRoleChange = (role: string) => {
    setFormData({ ...formData, role });
  };

  // Calcular capacidade (excluindo o item actual em edição)
  const distributedAmount = existingDistributions
    .filter(dist => !(isEdit && dist._id === initialData?._id))
    .reduce((sum, dist) => sum + (dist?.annualTarget || 0), 0);

  const remainingCapacityAnnual = goalAnnualTarget - distributedAmount;
  const remainingCapacityPeriod = remainingCapacityAnnual / multiplier;
  const distributedPeriod = distributedAmount / multiplier;
  const breakdownTotal = formData.itemTypeTargets.reduce((sum, item) => sum + item.percentage, 0);

  const computeMonthlyBreakdown = (periodTarget: number): number[] => {
    const cents = Math.round((periodTarget || 0) * 100);
    if (cents === 0) return Array(monthsInPeriod).fill(0);
    
    const base = Math.floor(cents / monthsInPeriod);
    const remainder = cents - base * monthsInPeriod;
    const arr = Array(monthsInPeriod).fill(base);
    
    for (let i = 0; i < remainder; i++) arr[i] += 1;
    
    return arr.map((c) => c / 100);
  };

  useEffect(() => {
    // Quando o alvo do período muda, recalculamos a divisão mensal
    if (formData.periodTarget > 0 && !monthlyEdited) {
      setFormData((prev) => ({
        ...prev,
        monthlyBreakdown: computeMonthlyBreakdown(formData.periodTarget),
      }));
    }
  }, [formData.periodTarget, monthlyEdited, monthsInPeriod]);

  // Se o período da meta mudar, reiniciamos
  useEffect(() => {
    setFormData((f) => ({
      ...f,
      monthlyBreakdown: Array(monthsInPeriod).fill(0),
    }));
    setMonthlyEdited(false);
  }, [monthsInPeriod]);

  

  const handlePeriodTargetChange = (value: string) => {
    const num = parseFloat(value) || 0;
    const annualVal = num * multiplier;
    if (annualVal <= remainingCapacityAnnual) {
      setFormData({ ...formData, periodTarget: num });
    }
  };

  const handleMonthlyChange = (idx: number, value: string) => {
    const num = parseFloat(value) || 0;
    const newArr = [...formData.monthlyBreakdown];
    newArr[idx] = num;
    setMonthlyEdited(true);
    setFormData({ ...formData, monthlyBreakdown: newArr });
  };

  const handleBreakdownChange = (index: number, value: string) => {
    const num = parseFloat(value) || 0;
    const newBreakdown = [...formData.itemTypeTargets];
    newBreakdown[index] = { ...newBreakdown[index], percentage: num };
    setFormData({ ...formData, itemTypeTargets: newBreakdown });
  };

  const monthlySum = formData.monthlyBreakdown.reduce((sum, m) => sum + m, 0);
  const dailyTarget = monthlySum > 0 ? monthlySum / 30 : 0;

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Validation
  if (!formData.role) {
      setError('Por favor, selecione um cargo.');
      return;
    }

  if (formData.periodTarget <= 0) {
    setError(`${PERIOD_LABELS[goalPeriod]} target must be greater than 0`);
    return;
  }

  if (formData.periodTarget * multiplier > remainingCapacityAnnual) {
    setError(
      `${PERIOD_LABELS[goalPeriod]} target cannot exceed remaining capacity (MT${remainingCapacityPeriod.toFixed(
        2
      )})`
    );
    return;
  }

  if (
    Math.abs(monthlySum - formData.periodTarget) > 0.01 &&
    formData.monthlyBreakdown.some((m) => m !== 0)
  ) {
    setError(
      `${PERIOD_LABELS[goalPeriod]} breakdown must sum to period target (MT${formData.periodTarget.toFixed(
        2
      )}, currently MT${monthlySum.toFixed(2)})`
    );
    return;
  }

  if (breakdownTotal !== 100 && breakdownTotal !== 0) {
    setError(`Item type breakdown must sum to 100% (currently ${breakdownTotal}%)`);
    return;
  }

  try {
    setLoading(true);

    const annualVal = formData.periodTarget * multiplier;

    // Sempre converter para 12 meses para manter compatibilidade com backend
    const expandedMonthly = (() => {
      if (monthsInPeriod === 12) {
        return formData.monthlyBreakdown.map((value, index) => ({
          month: index + 1,
          target: value,
        }));
      }

      const repetitions = 12 / monthsInPeriod;
      const arr: { month: number; target: number }[] = [];

      for (let rep = 0; rep < repetitions; rep++) {
        formData.monthlyBreakdown.forEach((value, monthIdx) => {
          const month = rep * monthsInPeriod + monthIdx + 1;
          arr.push({ month, target: value });
        });
      }

      return arr;
    })();

    const payload = {
      role: formData.role,
      annualTarget: annualVal,
      monthlyBreakdown: expandedMonthly,
      itemTypeTargets: formData.itemTypeTargets
        .filter(item => item.percentage > 0)
        .map((item) => ({
          itemType: item.itemType,
          target: (annualVal * item.percentage) / 100,
        })),
    };

    if (isEdit && initialData?._id) {
      // Actualizar distribuição existente
      const distId = typeof initialData._id === 'string' 
        ? initialData._id 
        : String(initialData._id);
      
      // Passar AMBOS goalId e distId
      await goalsApi.updateDistribution(goalId, distId, payload);
      toast.success('Distribuição actualizada com sucesso');
    } else {
      // Criar nova distribuição
      await goalsApi.createDistribution(goalId, payload);
      toast.success('Distribuição criada com sucesso');
    }

    onSuccess();
    onClose();
  } catch (err) {
    console.error('Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to save distribution';
    setError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {isEdit ? 'Editar Distribuição' : 'Criar Distribuição'}
          </h2>
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

          {/* Capacity Info */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Objectivo {PERIOD_LABELS[goalPeriod]} Almejado:</span>
              <span className="text-blue-700 font-bold ml-2">
                MT
                {goalFinancialTarget.toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Distribuído:</span>
              <span className="text-orange-700 font-bold ml-2">
                MT{distributedPeriod.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Capacidade restante:</span>
              <span
                className={`font-bold ml-2 ${
                  remainingCapacityPeriod > 0 ? 'text-blue-700' : 'text-red-700'
                }`}
              >
                MT{remainingCapacityPeriod.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          {/* Row 1: Role & Period Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cargo *</label>
            <select
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingRoles}
            >
              <option value="">Selecione um cargo</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {loadingRoles && <p className="text-sm text-gray-500 mt-1">Carregando cargos...</p>}
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {PERIOD_LABELS[goalPeriod]} Distribution (MT) *
              </label>
              <input
                type="number"
                min="0"
                max={remainingCapacityPeriod}
                step="0.01"
                value={formData.periodTarget}
                onChange={(e) => handlePeriodTargetChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: MT{remainingCapacityPeriod.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Toggle */}
       {/* Monthly Breakdown Toggle */}
<div className="border border-gray-200 rounded-lg p-4">
  <button
    type="button"
    onClick={() => setShowMonthlyGrid(!showMonthlyGrid)}
    className="flex items-center justify-between w-full font-semibold text-gray-900"
  >
    <span>
      Distribuição por Mês ({PERIOD_LABELS[goalPeriod]})
    </span>
    <span className="text-sm text-gray-600">
      {showMonthlyGrid ? '▼' : '▶'} MT{monthlySum.toFixed(2)} / MT{formData.periodTarget.toFixed(2)}
    </span>
  </button>

  {showMonthlyGrid && (
    <div className="mt-4 space-y-4">
      {/* Grid de meses - respeitando apenas os meses do período */}
      <div
        className={`grid gap-3 ${
          monthsInPeriod === 1
            ? 'grid-cols-1'
            : monthsInPeriod <= 3
            ? 'grid-cols-3'
            : monthsInPeriod === 6
            ? 'grid-cols-2 md:grid-cols-6'
            : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
        }`}
      >
        {formData.monthlyBreakdown.map((value, idx) => (
          <div key={idx}>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              {monthLabels[idx]}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => handleMonthlyChange(idx, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Total do Período</p>
          <p className="font-semibold text-gray-900">
            MT{monthlySum.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Aproximação Diária</p>
          <p className="font-semibold text-blue-700">
            MT{dailyTarget.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {Math.abs(monthlySum - formData.periodTarget) > 0.01 && monthlySum > 0 && (
        <p className="text-amber-600 text-xs mt-2">
          ⚠️ A soma dos meses (MT{monthlySum.toFixed(2)}) não corresponde ao alvo do período (MT{formData.periodTarget.toFixed(2)}).
        </p>
      )}
    </div>
  )}
</div>

          {/* Item Type Targets Toggle */}
          <div className="border border-gray-200 rounded-lg p-4">
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full font-semibold text-gray-900"
            >
              <span>Item Type Targets (Optional)</span>
              <span className="text-sm text-gray-600">
                {showBreakdown ? '▼' : '▶'} {breakdownTotal}%
              </span>
            </button>

            {showBreakdown && (
              <div className="mt-4 space-y-3">
                {formData.itemTypeTargets.map((item, index) => (
                  <div key={item.itemType} className="flex items-center gap-4">
                    <label className="w-24 font-medium text-gray-700">{item.itemType}</label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={item.percentage}
                        onChange={(e) => handleBreakdownChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="w-12 text-right text-gray-600">%</span>
                      <span className="w-32 text-right text-sm text-gray-500">
                        MT{(formData.periodTarget * multiplier * item.percentage / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span
                    className={`font-bold text-lg ${
                      breakdownTotal === 100 || breakdownTotal === 0
                        ? 'text-blue-600'
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
          </div>

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
              {loading ? 'A guardar...' : isEdit ? 'Actualizar Distribuição' : 'Criar Distribuição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}