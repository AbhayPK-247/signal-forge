import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface EyeDiagramChartProps {
    segments: number[][];
}

const EyeDiagramChart = ({ segments }: EyeDiagramChartProps) => {
    const dataLength = segments[0]?.length || 0;

    // Transform segments into Recharts format: each point has an index and multiple segment values
    const data = Array.from({ length: dataLength }, (_, i) => {
        const entry: any = { name: i };
        segments.forEach((seg, sIdx) => {
            entry[`s${sIdx}`] = seg[i];
        });
        return entry;
    });

    return (
        <div className="oscilloscope-display p-2 h-full flex flex-col">
            <div className="section-title mb-1 px-2">Eye Diagram</div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <XAxis hide type="number" dataKey="name" domain={[0, dataLength - 1]} />
                        <YAxis hide domain={[-2, 2]} />
                        {segments.map((_, i) => (
                            <Line
                                key={i}
                                type="monotone"
                                dataKey={`s${i}`}
                                stroke="hsl(170 100% 45%)"
                                strokeWidth={0.5}
                                dot={false}
                                isAnimationActive={false}
                                className="opacity-20"
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EyeDiagramChart;
