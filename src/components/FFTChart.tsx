import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface FFTChartProps {
  frequencies: number[];
  magnitudes: number[];
}

const FFTChart = ({ frequencies, magnitudes }: FFTChartProps) => {
  const data = useMemo(() => {
    const maxPoints = 400;
    const step = Math.max(1, Math.floor(frequencies.length / maxPoints));
    return frequencies
      .filter((_, i) => i % step === 0)
      .map((f, idx) => ({
        freq: parseFloat(f.toFixed(1)),
        mag: magnitudes[idx * step],
      }));
  }, [frequencies, magnitudes]);

  return (
    <div className="oscilloscope-display p-2 h-full flex flex-col">
      <div className="section-title mb-1 px-2">FFT Spectrum</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="rgba(0,230,180,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="freq"
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#8fa3b0' }}
              type="number"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', offset: 5, fontSize: 9, fill: '#8fa3b0' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(220 20% 8% / 0.95)', border: '1px solid hsl(170 40% 18%)', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              labelStyle={{ color: '#8fa3b0' }}
              labelFormatter={(v: number) => `${v.toFixed(1)} Hz`}
            />
            <Area type="monotone" dataKey="mag" stroke="hsl(170 100% 45%)" fill="rgba(0,230,180,0.1)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FFTChart;
