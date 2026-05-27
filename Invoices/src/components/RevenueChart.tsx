import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semesterly' | 'yearly';
type ChartType = 'line' | 'pie' | 'funnel';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface RevenueChartProps {
  series?: Array<{ date: string; total: number; count: number }>;
  title?: string;
  height?: number;
  metric?: 'revenue' | 'count';
  chartType?: ChartType;
  data?: ChartDataPoint[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  series = [],
  title = 'Receita ao Longo do Tempo',
  height = 400,
  metric = 'revenue',
  chartType = 'line',
  data = [],
}) => {
  const [granularity, setGranularity] = useState<TimeGranularity>('daily');

  // Agregação dinâmica dos dados conforme granularidade selecionada
  const chartData = useMemo(() => {
    if (chartType !== 'line') return data;

    const map = new Map<string, { total: number; count: number; sortKey: number }>();

    series.forEach((item) => {
      const date = new Date(item.date);
      let key: string;
      let sortKey: number = date.getTime();

      switch (granularity) {
        case 'daily':
          key = format(date, 'yyyy-MM-dd');
          break;
        case 'weekly':
          key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          sortKey = startOfWeek(date, { weekStartsOn: 1 }).getTime();
          break;
        case 'monthly':
          key = format(startOfMonth(date), 'yyyy-MM');
          sortKey = startOfMonth(date).getTime();
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          sortKey = startOfQuarter(date).getTime();
          break;
        case 'semesterly':
          const half = date.getMonth() < 6 ? 'H1' : 'H2';
          key = `${date.getFullYear()}-${half}`;
          sortKey = date.getFullYear() * 10000 + (half === 'H1' ? 1 : 6) * 100;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          sortKey = date.getFullYear() * 10000;
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }

      const existing = map.get(key) || { total: 0, count: 0, sortKey };
      map.set(key, {
        total: existing.total + item.total,
        count: existing.count + item.count,
        sortKey: Math.min(existing.sortKey, sortKey),
      });
    });

    return Array.from(map.entries())
      .map(([key, value]) => ({
        name: key,
        value: metric === 'revenue' ? value.total : value.count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [series, granularity, metric, chartType, data]);

  const getXAxisType = () => {
    if (['daily', 'weekly'].includes(granularity)) return 'time';
    if (['monthly', 'quarterly', 'semesterly', 'yearly'].includes(granularity)) return 'category';
    return 'time';
  };

  // Opções para gráfico de linha
  const lineChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: { backgroundColor: '#6a7985' },
      },
      formatter: (params: any) => {
        const p = params[0];
        const val = metric === 'revenue' 
          ? `MZN ${p.value.toLocaleString()}`
          : `${p.value} vendas`;
        return `${p.axisValueLabel}<br/>${p.seriesName}: ${val}`;
      },
    },
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: 'none' },
        restore: {},
        saveAsImage: {},
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: getXAxisType(),
      boundaryGap: false,
      axisLabel: {
        formatter: (value: string | number) => {
          if (typeof value === 'number') {
            return format(new Date(value), 'dd MMM');
          }
          return value;
        },
      },
    },
    yAxis: {
      type: 'value',
      name: metric === 'revenue' ? 'Receita (MZN)' : 'Nº de Vendas',
      axisLabel: {
        formatter: metric === 'revenue' 
          ? '{value} MZN'
          : '{value}',
      },
    },
    series: [
      {
        name: metric === 'revenue' ? 'Receita' : 'Vendas',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          opacity: 0.3,
        },
        lineStyle: {
          width: 2,
        },
        itemStyle: {
          color: '#6366f1',
        },
        emphasis: {
          focus: 'series',
        },
        data: chartData.map((d) => [d.name, d.value]),
      },
    ],
  };

  // Opções para gráfico de pizza
  const pieChartOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    toolbox: {
      feature: {
        saveAsImage: {},
      },
    },
    legend: {
      orient: 'vertical' as const,
      left: 'left',
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: chartData,
        color: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'],
      },
    ],
  };

  // Opções para gráfico de funil com formato fixo
const funnelChartOption = {
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => {
      // Usamos params.data.realValue para mostrar o dado real no tooltip
      const realValue = params.data.realValue;
      const firstValue = chartData[0]?.value || 1;
      const percentage = Math.round((realValue / firstValue) * 100);
      return `${params.name}<br/>Quantidade: ${realValue}<br/>Conversão: ${percentage}%`;
    },
  },
  toolbox: {
    feature: {
      saveAsImage: {},
    },
  },
  legend: {
    data: chartData.map((d) => d.name),
    bottom: 10,
  },
  series: [
    {
      name: title,
      type: 'funnel',
      left: '10%',
      right: '25%', // Espaço para os labels à direita
      top: 30,
      bottom: 60,
      width: '60%',
      
      // CONFIGURAÇÕES PARA FORMATO FIXO:
      minSize: '0%',    // Garante que a ponta chegue a zero se necessário
      maxSize: '100%',
      sort: 'none',     // Mantém a ordem exata do array de dados
      funnelAlign: 'center',
      
      label: {
        show: true,
        position: 'inside', // 'inside' centraliza o texto como na imagem
        formatter: (params: any) => {
          return params.name; // Apenas o nome dentro da fatia, como na imagem
        },
        fontSize: 12,
        color: '#fff',
      },
      // Label externo para os dados (opcional, se quiser mostrar números fora)
      labelLine: { show: false },
      
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
      },
      
      // MAPEAR DADOS: 
      // Criamos uma progressão aritmética (ex: 100, 80, 60...) para o 'value' 
      // e guardamos o valor verdadeiro em 'realValue'
      data: chartData.map((item, index) => ({
        name: item.name,
        // O valor visual diminui fixamente para manter o formato de triângulo
        value: chartData.length - index, 
        realValue: item.value, // Guardamos o valor real aqui
        itemStyle: {
           // Se quiser cores específicas como na imagem, pode definir por item
        }
      })),
      // Cores seguindo a paleta da imagem (opcional)
      color: ['#5B9BD5', '#FFC000', '#008000', '#FFB6C1', '#7030A0', '#ED7D31'],
    },
  ],
};

  const getOption = () => {
    switch (chartType) {
      case 'pie':
        return pieChartOption;
      case 'funnel':
        return funnelChartOption;
      case 'line':
      default:
        return lineChartOption;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-wrap lg:flex-row lg:items-center sm:justify-between mb-6 gap-4">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        
        {chartType === 'line' && (
          <div className="flex items-center gap-3">
            <label htmlFor="granularity" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Granularidade:
            </label>
            <select
              id="granularity"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as TimeGranularity)}
              className="
                block w-36 rounded-lg border border-gray-300 
                bg-white py-2 pl-3 pr-8 text-sm 
                focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 
                shadow-sm hover:border-gray-400 transition-colors
                cursor-pointer appearance-none
              "
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="semesterly">Semestral</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
        )}
      </div>

      <ReactECharts
        option={getOption()}
        style={{ height, width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};