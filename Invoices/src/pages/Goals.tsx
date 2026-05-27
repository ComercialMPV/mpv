import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Target,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2, 
} from 'lucide-react';
import { GoalsProbabilities } from '../components/GoalsProbabilities';

import { goalsApi, Goal, GoalDistribution } from '../services/api';
import GoalSetupForm from '../components/GoalSetupForm';
import GoalDistributionForm from '../components/GoalDistributionForm';
import toast from 'react-hot-toast';

const PERIOD_LABELS: Record<Goal['period'], string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semester: 'Semestral',
  annual: 'Anual',
};

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDistributionForm, setShowDistributionForm] = useState(false);
  const [distributions, setDistributions] = useState<GoalDistribution[]>([]);
  const [performanceData, setPerformanceData] = useState<GoalDistribution[]>([]);
  const [selectedDistribution, setSelectedDistribution] = useState<GoalDistribution | null>(null);


  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (selectedGoal) {
      loadDistributions(selectedGoal._id!);
      loadPerformance(selectedGoal._id!);
    }
  }, [selectedGoal]);

  const loadGoals = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const data = await goalsApi.getAll(currentYear);
      setGoals(data);
      if (data.length > 0) {
        setSelectedGoal(data[0]);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const loadDistributions = async (goalId: string) => {
    try {
      const data = await goalsApi.getDistributions(goalId);
      setDistributions(data);
    } catch (error) {
      console.error('Error loading distributions:', error);
    }
  };

  const loadPerformance = async (goalId: string) => {
    try {
      const data = await goalsApi.getPerformance(goalId);
      setPerformanceData(data);
    } catch (error) {
      console.error('Error loading performance:', error);
    }
  };

  const handleDeleteDistribution = async (distId: string) => {
  if (!window.confirm('Tem a certeza que deseja eliminar esta distribuição?')) return;
  try {
    await goalsApi.deleteDistribution(distId, selectedGoal!._id!);
    toast.success('Distribuição eliminada com sucesso');
    loadDistributions(selectedGoal!._id!);
  } catch (err) {
    toast.error('Erro ao eliminar distribuição');
  }
};

const handleEditDistribution = (dist: GoalDistribution) => {
  setSelectedDistribution(dist);
  setShowDistributionForm(true);
};

  const handleOpenCreate = () => {
    setFormMode('create');
    setShowSetupForm(true);
  };

  const handleOpenEdit = () => {
    if (!selectedGoal) return;
    setFormMode('edit');
    setShowSetupForm(true);
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'at-risk':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasCritical = performanceData.some(p => p.healthStatus === 'critical');
  const hasAtRisk = performanceData.some(p => p.healthStatus === 'at-risk');

  return (
    <div className="space-y-8">
      {(hasCritical || hasAtRisk) && (
        <div className={`p-4 rounded ${hasCritical ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {hasCritical
            ? 'Alerta: distribuições em estado crítico! Tome ações imediatas.'
            : 'Aviso: algumas distribuições estão em risco. Monitore de perto.'}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            Metas Financeiras
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Defina, distribua e acompanhe metas financeiras da empresa
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 md:gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 text-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2 shrink-0" />
            <span className="whitespace-nowrap">Nova Meta</span>
          </button>

          {selectedGoal && (
            <button
              onClick={handleOpenEdit}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all active:scale-95 text-sm font-medium whitespace-nowrap"
            >
              <Edit2 className="h-5 w-5 mr-2 shrink-0" />
              Editar Meta
            </button>
          )}

          {selectedGoal && (
            <Link
              to={`/goals/${selectedGoal._id}/breakdown`}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all active:scale-95 text-sm font-medium whitespace-nowrap"
            >
              Detalhes
            </Link>
          )}
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Metas Financeiras</h2>
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600">Nenhuma meta definida. Comece criando uma nova.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <div
                key={goal._id}
                onClick={() => setSelectedGoal(goal)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedGoal?._id === goal._id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{goal.year}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      MT{(goal.financialTarget || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">{PERIOD_LABELS[goal.period]}</p>
                    <p className="text-xs text-gray-600 mt-1">{goal.achievementStrategy}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      goal.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : goal.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {goal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    {/* Selected Goal Detail */}
{selectedGoal && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Distributions */}
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Distribuição por Colaborador
        </h2>
        <button
          onClick={() => {
            setSelectedDistribution(null);
            setShowDistributionForm(true);
          }}
          className="flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors gap-1"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {distributions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhuma distribuição criada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-3 font-semibold text-gray-700">Papel</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-700">Meta Anual</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-700">Meta Período</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-700">Realizado</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-700">Progresso</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700">Estado</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700">Acções</th>
              </tr>
            </thead>
  <tbody>
  {distributions.map((dist) => {
    const periodMultiplier = {
      monthly: 12,
      quarterly: 4,
      semester: 2,
      annual: 1,
    }[selectedGoal.period];

    const periodTarget = dist.annualTarget / periodMultiplier;
    const progress = ((dist.actualRevenue / dist.annualTarget) * 100).toFixed(1);

    return (
      <tr key={dist._id} className="border-b border-gray-100 hover:bg-gray-50 transition">
        <td className="py-3 px-3">
          <div>
            <p className="font-medium text-gray-900">
              {/* Verificar se o role é um objeto ou uma string */}
              {typeof dist.role === 'object' && dist.role !== null
                ? dist.role.roleName // Exibir o nome do cargo se for um objeto
                : typeof dist.role === 'string'
                ? dist.role // Exibir o ID do cargo se for uma string
                : 'Utilizador Específico'} {/* Exibir um valor padrão */}
            </p>
            <p className="text-xs text-gray-500 mt-1">ID: {dist._id}</p>
          </div>
        </td>
        <td className="text-right py-3 px-3">
          <p className="font-semibold text-gray-900">
            MT{((dist.annualTarget || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }))}
          </p>
        </td>
        <td className="text-right py-3 px-3">
          <p className="text-gray-700">
            MT{((periodTarget || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }))}
          </p>
          <p className="text-xs text-gray-500">{PERIOD_LABELS[selectedGoal.period]}</p>
        </td>
        <td className="text-right py-3 px-3">
          <p className="font-medium text-gray-900">
            MT{((dist.actualRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }))}
          </p>
        </td>
        <td className="text-right py-3 px-3">
          <div className="flex items-center justify-end gap-2">
            <div>
              <p className="font-semibold text-gray-900">{progress}%</p>
              <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    parseFloat(progress) >= 100
                      ? 'bg-green-500'
                      : parseFloat(progress) >= 75
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(parseFloat(progress), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </td>
        <td className="text-center py-3 px-3">
          {getHealthIcon(dist.healthStatus)}
        </td>
        <td className="text-center py-3 px-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleEditDistribution(dist)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar distribuição"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteDistribution(dist._id!)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Eliminar distribuição"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  })}
</tbody>
          </table>

          {/* Resumo de distribuições */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Distribuído (Anual)</p>
                <p className="text-lg font-bold text-gray-900">
                  MT{distributions.reduce((sum, d) => sum + d.annualTarget, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Distribuído ({PERIOD_LABELS[selectedGoal.period]})</p>
                <p className="text-lg font-bold text-gray-900">
                  MT{(distributions.reduce((sum, d) => sum + d.annualTarget, 0) / {
                    monthly: 12,
                    quarterly: 4,
                    semester: 2,
                    annual: 1,
                  }[selectedGoal.period]).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Realizado</p>
                <p className="text-lg font-bold text-gray-900">
                  MT{distributions.reduce((sum, d) => sum + d.actualRevenue, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Progresso Geral</p>
                <p className="text-lg font-bold text-gray-900">
                  {(
                    (distributions.reduce((sum, d) => sum + d.actualRevenue, 0) /
                      distributions.reduce((sum, d) => sum + d.annualTarget, 0)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Performance Summary */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
        <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
        Performance Geral
      </h2>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Meta Anual</p>
          <p className="text-2xl font-bold text-gray-900">MT{selectedGoal.annualTarget.toLocaleString()}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Meta {PERIOD_LABELS[selectedGoal.period]}</p>
          <p className="text-2xl font-bold text-gray-900">
            MT{(selectedGoal.annualTarget / {
              monthly: 12,
              quarterly: 4,
              semester: 2,
              annual: 1,
            }[selectedGoal.period]).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Contingência</p>
          <p className="text-2xl font-bold text-gray-900">{(selectedGoal.contingencyMargin * 100).toFixed(0)}%</p>
        </div>

        <div className="pt-4 border-t text-sm text-gray-600 space-y-1">
          <p>Período: <span className="font-semibold">{PERIOD_LABELS[selectedGoal.period]}</span></p>
          <p>
            Intervalo:{' '}
            <span className="font-semibold">
              {new Date(selectedGoal.startDate).toLocaleDateString()} –{' '}
              {new Date(selectedGoal.endDate).toLocaleDateString()}
            </span>
          </p>
          <p>Valor base: <span className="font-semibold">MT{(selectedGoal.financialTarget || 0).toLocaleString()}</span></p>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500 mb-2">Estratégia:</p>
          <div className="flex gap-2 flex-wrap">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              {selectedGoal.achievementStrategy}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Setup Form Modal */}
      {showSetupForm && (
        <GoalSetupForm
          onClose={() => setShowSetupForm(false)}
          onSuccess={() => {
            loadGoals();
            setShowSetupForm(false);
            toast.success(formMode === 'edit' ? 'Meta atualizada com sucesso' : 'Meta criada com sucesso');
          }}
          initialData={formMode === 'edit' ? selectedGoal ?? undefined : undefined}
          isEdit={formMode === 'edit'}
        />
      )}
{/* Distribution Form Modal */}
{showDistributionForm && selectedGoal && (
  <GoalDistributionForm
    goalId={selectedGoal._id!}
    goalPeriod={selectedGoal.period}
    goalFinancialTarget={selectedGoal.financialTarget}
    goalAnnualTarget={selectedGoal.annualTarget}
    existingDistributions={distributions}
    initialData={selectedDistribution ?? undefined}
    isEdit={!!selectedDistribution}
    onClose={() => {
      setShowDistributionForm(false);
      setSelectedDistribution(null);
    }}
    onSuccess={() => {
      loadDistributions(selectedGoal._id!);
      setShowDistributionForm(false);
      setSelectedDistribution(null);
      toast.success(selectedDistribution ? 'Distribuição actualizada com sucesso' : 'Distribuição criada com sucesso');
    }}
  />
)}
        {selectedGoal && (
          <GoalsProbabilities 
            goalId={selectedGoal._id!}
            goal={selectedGoal}
            distributions={distributions}
          />
        )}

      {!selectedGoal && goals.length > 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-gray-500">Selecione uma meta acima para ver as probabilidades de venda</p>
        </div>
      )}
    </div>
  );
};