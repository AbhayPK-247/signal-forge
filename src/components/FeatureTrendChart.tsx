import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { WindowedStat } from '@/lib/signalEngine';

interface FeatureTrendChartProps {
  stats: WindowedStat[];
}

const FeatureTrendChart = ({ stats }: FeatureTrendChartProps) => {
  const data = useMemo(() => {
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(stats.length / maxPoints));
    return stats
      .filter((_, i) => i % step === 0)
      .map(s => ({
        t: parseFloat(s.time.toFixed(4)),
        Mean: parseFloat(s.mean.toFixed(4)),
        RMS: parseFloat(s.rms.toFixed(4)),
        Variance: parseFloat(s.variance.toFixed(4)),
      }));
  }, [stats]);

  if (data.length === 0) return null;

  return (
    <div className="oscilloscope-display p-2 h-full flex flex-col">
      <div className="section-title mb-1 px-2">Feature Trends</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="rgba(0,230,180,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#8fa3b0' }}
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <YAxis
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(220 20% 8% / 0.95)', border: '1px solid hsl(170 40% 18%)', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              labelStyle={{ color: '#8fa3b0' }}
              labelFormatter={(v: number) => `t = ${v.toFixed(4)}s`}
            />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
            <Line type="monotone" dataKey="Mean" stroke="hsl(170 100% 45%)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="RMS" stroke="hsl(280 100% 65%)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Variance" stroke="hsl(45 100% 55%)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FeatureTrendChart;
