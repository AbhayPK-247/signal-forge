import React, { useState, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { TransferFunction, computeBodePlot } from '@/lib/signalEngine';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Input } from '@/components/ui/input';
import { Activity, Info } from 'lucide-react';
import FormulaPanel from '@/components/FormulaPanel';

const BodeLab = () => {
    const [numStr, setNumStr] = useState('1');
    const [denStr, setDenStr] = useState('1, 1');
    const [fStart, setFStart] = useState(0.1);
    const [fStop, setFStop] = useState(1000);

    const tf: TransferFunction = useMemo(() => {
        const num = numStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        const den = denStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        return { num: num.length ? num : [1], den: den.length ? den : [1] };
    }, [numStr, denStr]);

    const data = useMemo(() => {
        return computeBodePlot(tf, fStart, fStop, 400);
    }, [tf, fStart, fStop]);

    const formatX = (tick: number) => {
        return tick >= 1 ? `${tick}` : tick.toFixed(1);
    };

    return (
        <MainLayout activeLab="bode">
            <div className="h-full flex flex-col p-4 space-y-4 overflow-hidden bg-black/5">
                {/* Header Area */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-display font-black tracking-tight text-white uppercase">Bode Plot Lab</h1>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Frequency Domain Analysis</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="glass-panel px-4 py-2 flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Range:</span>
                            <div className="flex items-center gap-2">
                                <Input
                                    className="h-7 w-20 bg-black/40 border-primary/20 text-[10px] font-mono"
                                    value={fStart}
                                    onChange={(e) => setFStart(parseFloat(e.target.value) || 0.1)}
                                />
                                <span className="text-muted-foreground">→</span>
                                <Input
                                    className="h-7 w-20 bg-black/40 border-primary/20 text-[10px] font-mono"
                                    value={fStop}
                                    onChange={(e) => setFStop(parseFloat(e.target.value) || 1000)}
                                />
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Hz</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* Controls Sidebar */}
                    <aside className="w-[300px] flex flex-col gap-4">
                        <div className="glass-panel p-4 space-y-4">
                            <div className="section-title">Transfer Function H(s)</div>
                            <div className="bg-primary/5 p-3 rounded border border-primary/20 text-center flex items-center justify-center">
                                <span className="text-xs text-primary font-mono tracking-widest italic">
                                    H(s) = {'\\frac{num}{den}'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Numerator Coefficients (b_n, ..., b_0)</label>
                                    <Input
                                        value={numStr}
                                        onChange={(e) => setNumStr(e.target.value)}
                                        placeholder="e.g. 1, 0 (for s)"
                                        className="bg-black/40 border-border/50 font-mono text-xs"
                                    />
                                    <p className="text-[8px] text-muted-foreground">Comma-separated: [s^1 coeff, s^0 coeff]</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Denominator Coefficients (a_n, ..., a_0)</label>
                                    <Input
                                        value={denStr}
                                        onChange={(e) => setDenStr(e.target.value)}
                                        placeholder="e.g. 1, 1 (for s+1)"
                                        className="bg-black/40 border-border/50 font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg space-y-2 border border-white/5">
                                <div className="flex items-center gap-2 text-primary">
                                    <Info className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Example TFs</span>
                                </div>
                                <ul className="text-[9px] text-muted-foreground space-y-1">
                                    <li>• Low-pass (1st Order): Num=1, Den=1, 1</li>
                                    <li>• Band-pass: Num=1, 0, Den=1, 1, 100</li>
                                    <li>• High-pass: Num=1, 0, 0, Den=1, 1, 1</li>
                                </ul>
                            </div>
                        </div>
                    </aside>

                    {/* Charts Area */}
                    <main className="flex-1 flex flex-col gap-4 min-w-0">
                        {/* Magnitude Plot */}
                        <div className="flex-1 bg-black/40 rounded-lg border border-border/30 p-4 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Magnitude Response (dB)</span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="frequency"
                                            scale="log"
                                            domain={[fStart, fStop]}
                                            type="number"
                                            stroke="#666"
                                            fontSize={9}
                                            tickFormatter={formatX}
                                            label={{ value: 'Frequency (Hz)', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#666' }}
                                        />
                                        <YAxis
                                            stroke="#666"
                                            fontSize={9}
                                            domain={['auto', 'auto']}
                                            label={{ value: 'Gain (dB)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#666' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                            itemStyle={{ color: 'var(--primary)' }}
                                            formatter={(v: number) => [`${v.toFixed(2)} dB`, 'Gain']}
                                            labelFormatter={(f: number) => `Freq: ${f.toFixed(2)} Hz`}
                                        />
                                        <Line type="monotone" dataKey="magnitude" stroke="var(--primary)" strokeWidth={2} dot={false} animationDuration={0} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Phase Plot */}
                        <div className="flex-1 bg-black/40 rounded-lg border border-border/30 p-4 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Phase Response (deg)</span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="frequency"
                                            scale="log"
                                            domain={[fStart, fStop]}
                                            type="number"
                                            stroke="#666"
                                            fontSize={9}
                                            tickFormatter={formatX}
                                        />
                                        <YAxis
                                            stroke="#666"
                                            fontSize={9}
                                            domain={['auto', 'auto']}
                                            label={{ value: 'Phase (°)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#666' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                            itemStyle={{ color: 'var(--accent)' }}
                                            formatter={(v: number) => [`${v.toFixed(2)}°`, 'Phase']}
                                            labelFormatter={(f: number) => `Freq: ${f.toFixed(2)} Hz`}
                                        />
                                        <Line type="monotone" dataKey="phase" stroke="var(--accent)" strokeWidth={2} dot={false} animationDuration={0} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </MainLayout>
    );
};

export default BodeLab;
