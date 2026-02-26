import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ZAxis } from 'recharts';
import { type ConstellationPoint } from '@/lib/signalEngine';

interface ConstellationChartProps {
    points: ConstellationPoint[];
}

const ConstellationChart = ({ points }: ConstellationChartProps) => {
    return (
        <div className="oscilloscope-display p-2 h-full flex flex-col">
            <div className="section-title mb-1 px-2">Constellation Diagram (IQ)</div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            type="number"
                            dataKey="i"
                            name="In-phase"
                            domain={[-2, 2]}
                            stroke="#5a6f7a"
                            tick={{ fontSize: 9 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="q"
                            name="Quadrature"
                            domain={[-2, 2]}
                            stroke="#5a6f7a"
                            tick={{ fontSize: 9 }}
                        />
                        <ZAxis type="number" range={[10, 10]} />
                        <Scatter
                            name="Points"
                            data={points}
                            fill="hsl(170 100% 45%)"
                            line={false}
                            shape="circle"
                            className="opacity-60"
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ConstellationChart;
