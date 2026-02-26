import { useMemo, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import OscilloscopeCursors from './OscilloscopeCursors';
import { Button } from './ui/button';
import { MousePointer2, X } from 'lucide-react';

interface WaveformChartProps {
  time: number[];
  original: number[];
  faulted: number[];
  showOriginal: boolean;
}

const WaveformChart = ({ time, original, faulted, showOriginal }: WaveformChartProps) => {
  const [cursor1, setCursor1] = useState<{ time: number; amplitude: number } | null>(null);
  const [cursor2, setCursor2] = useState<{ time: number; amplitude: number } | null>(null);
  const [cursorMode, setCursorMode] = useState(false);

  const handleChartClick = useCallback((state: any) => {
    if (!cursorMode || !state?.activePayload) return;

    const { t, faulted: amp } = state.activePayload[0].payload;
    const newData = { time: t, amplitude: amp };

    if (!cursor1 || (cursor1 && cursor2)) {
      setCursor1(newData);
      if (cursor1 && cursor2) setCursor2(null);
    } else {
      setCursor2(newData);
    }
  }, [cursorMode, cursor1, cursor2]);

  const clearCursors = () => {
    setCursor1(null);
    setCursor2(null);
  };
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
    <div className="oscilloscope-display p-2 h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-1 px-2">
        <div className="section-title">Waveform</div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${cursorMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setCursorMode(!cursorMode)}
            title="Toggle Cursors"
          >
            <MousePointer2 className="h-3 w-3" />
          </Button>
          {(cursor1 || cursor2) && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={clearCursors}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="absolute top-12 right-4 z-10 pointer-events-none">
        <OscilloscopeCursors cursor1={cursor1} cursor2={cursor2} />
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, bottom: 20, left: 10 }}
            onClick={handleChartClick}
            style={{ cursor: cursorMode ? 'crosshair' : 'default' }}
          >
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

            {cursor1 && (
              <ReferenceLine x={cursor1.time} stroke="hsl(170 100% 45%)" strokeDasharray="3 3" label={{ value: 'C1', position: 'top', fill: 'hsl(170 100% 45%)', fontSize: 10 }} />
            )}
            {cursor2 && (
              <ReferenceLine x={cursor2.time} stroke="hsl(190 100% 45%)" strokeDasharray="3 3" label={{ value: 'C2', position: 'top', fill: 'hsl(190 100% 45%)', fontSize: 10 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WaveformChart;
