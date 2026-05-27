import React from 'react';
import ReactECharts from 'echarts-for-react';

interface PieChartProps {
  title: string;
  data: { name: string; value: number; }[];
  height?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ title, data, height = 340 }) => {
  const option = {
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: { bottom: 10, left: 'center' },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 13, fontWeight: '500' },
        emphasis: { label: { fontSize: 16, fontWeight: 'bold' } },
        data: data,
      },
    ],
  };

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">{title}</h3>
      <ReactECharts option={option} style={{ height, width: '100%' }} />
    </div>
  );
};