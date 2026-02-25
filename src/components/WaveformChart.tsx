import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface WaveformChartProps {
  time: number[];
  original: number[];
  faulted: number[];
  showOriginal: boolean;
}

const WaveformChart = ({ time, original, faulted, showOriginal }: WaveformChartProps) => {
  const data = useMemo(() => {
    // Downsample for performance
    const maxPoints = 800;
    const step = Math.max(1, Math.floor(time.length / maxPoints));
    return time
      .filter((_, i) => i % step === 0)
      .map((t, idx) => {
        const i = idx * step;
        return {
          t: parseFloat(t.toFixed(5)),
          original: original[i],
          faulted: isNaN(faulted[i]) ? null : faulted[i],
        };
      });
  }, [time, original, faulted]);

  return (
    <div className="oscilloscope-display p-2 h-full flex flex-col">
      <div className="section-title mb-1 px-2">Waveform</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="rgba(0,230,180,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#8fa3b0' }}
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <YAxis
              stroke="#5a6f7a"
              tick={{ fontSize: 9, fill: '#8fa3b0' }}
              label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', offset: 5, fontSize: 10, fill: '#8fa3b0' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(220 20% 8% / 0.95)', border: '1px solid hsl(170 40% 18%)', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              labelStyle={{ color: '#8fa3b0' }}
              itemStyle={{ color: 'hsl(170 100% 45%)' }}
              labelFormatter={(v: number) => `t = ${v.toFixed(4)}s`}
            />
            {showOriginal && (
              <Line type="monotone" dataKey="original" stroke="rgba(0,230,180,0.3)" strokeWidth={1} dot={false} name="Original" />
            )}
            <Line type="monotone" dataKey="faulted" stroke="hsl(170 100% 45%)" strokeWidth={1.5} dot={false} name="Signal" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WaveformChart;
