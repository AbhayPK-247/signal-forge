import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface HistogramChartProps {
  signal: number[];
}

const HistogramChart = ({ signal }: HistogramChartProps) => {
  const data = useMemo(() => {
    const clean = signal.filter(x => !isNaN(x));
    if (clean.length === 0) return [];
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const range = max - min || 1;
    const nBins = 30;
    const binWidth = range / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      value: parseFloat((min + (i + 0.5) * binWidth).toFixed(3)),
      count: 0,
    }));
    clean.forEach(v => {
      const idx = Math.min(nBins - 1, Math.floor((v - min) / binWidth));
      bins[idx].count++;
    });
    return bins;
  }, [signal]);

  return (
    <div className="oscilloscope-display p-2 h-full flex flex-col">
      <div className="section-title mb-1 px-2">Histogram</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="rgba(0,230,180,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="value"
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Value', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#8fa3b0' }}
              type="number"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 5, fontSize: 9, fill: '#8fa3b0' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(220 20% 8% / 0.95)', border: '1px solid hsl(170 40% 18%)', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              labelStyle={{ color: '#8fa3b0' }}
            />
            <Bar dataKey="count" fill="rgba(0,230,180,0.5)" stroke="hsl(170 100% 45%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HistogramChart;
