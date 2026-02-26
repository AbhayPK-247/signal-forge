import React, { useState, useMemo, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { TransferFunction, simulateSystem, generateSignal, generateTimeVector, DEFAULT_PARAMS, SignalType } from '@/lib/signalEngine';
import WaveformChart from '@/components/WaveformChart';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Monitor, Play, Settings2, Info } from 'lucide-react';
import FormulaPanel from '@/components/FormulaPanel';

const SystemLab = () => {
    const [numStr, setNumStr] = useState('1');
    const [denStr, setDenStr] = useState('1, 1');
    const [inputType, setInputType] = useState<SignalType>('sine');
    const [inputFreq, setInputFreq] = useState(5);
    const [inputAmp, setInputAmp] = useState(1);

    const [generated, setGenerated] = useState(false);
    const [time, setTime] = useState<number[]>([]);
    const [inputSignal, setInputSignal] = useState<number[]>([]);
    const [outputSignal, setOutputSignal] = useState<number[]>([]);

    const tf: TransferFunction = useMemo(() => {
        const num = numStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        const den = denStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        return { num: num.length ? num : [1], den: den.length ? den : [1] };
    }, [numStr, denStr]);

    const handleSimulate = () => {
        const fs = 1000;
        const duration = 2;
        const params = { ...DEFAULT_PARAMS, frequency: inputFreq, amplitude: inputAmp, samplingRate: fs, duration };

        const t = generateTimeVector(params);
        const sigIn = generateSignal(inputType, params, t);

        const sigOut = simulateSystem(tf, sigIn, fs);

        setTime(t);
        setInputSignal(sigIn);
        setOutputSignal(sigOut);
        setGenerated(true);
    };

    // Auto-recalc on change
    useEffect(() => {
        handleSimulate();
    }, [tf, inputType, inputFreq, inputAmp]);

    return (
        <MainLayout activeLab="system">
            <div className="h-full flex flex-col p-4 space-y-4 overflow-hidden bg-black/5">
                {/* Header Area */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/20 rounded-lg">
                            <Monitor className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-lg font-display font-black tracking-tight text-white uppercase">System Simulator</h1>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">LTI Time Response Analysis</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* Controls Sidebar */}
                    <aside className="w-[300px] flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="glass-panel p-4 space-y-4">
                            <div className="section-title">System Definition H(s)</div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold text-primary">Numerator (b_n...b_0)</label>
                                    <Input
                                        value={numStr}
                                        onChange={(e) => setNumStr(e.target.value)}
                                        className="bg-black/40 border-primary/20 font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold text-primary">Denominator (a_n...a_0)</label>
                                    <Input
                                        value={denStr}
                                        onChange={(e) => setDenStr(e.target.value)}
                                        className="bg-black/40 border-primary/20 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-4 space-y-4">
                            <div className="section-title">Injected Signal</div>
                            <div className="grid grid-cols-2 gap-2">
                                {(['sine', 'square', 'sawtooth', 'noise', 'impulse', 'step'] as SignalType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setInputType(t)}
                                        className={`signal-button text-[9px] h-7 ${inputType === t ? 'signal-button-active' : ''}`}
                                    >
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] uppercase font-bold">
                                        <span className="text-muted-foreground">Frequency</span>
                                        <span className="text-accent">{inputFreq} Hz</span>
                                    </div>
                                    <Slider value={[inputFreq]} min={1} max={50} onValueChange={([v]) => setInputFreq(v)} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] uppercase font-bold">
                                        <span className="text-muted-foreground">Amplitude</span>
                                        <span className="text-accent">{inputAmp.toFixed(1)}V</span>
                                    </div>
                                    <Slider value={[inputAmp]} min={0} max={2} step={0.1} onValueChange={([v]) => setInputAmp(v)} />
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 text-primary mb-2">
                                <Info className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Simulation Info</span>
                            </div>
                            <p className="text-[8px] text-muted-foreground leading-relaxed">
                                Continuous systems are simulated using discrete-time convolution with the system impulse response. Ensure sampling rate is sufficient for the fastest system dynamics.
                            </p>
                        </div>
                    </aside>

                    {/* Main Display */}
                    <main className="flex-1 flex flex-col gap-4">
                        <div className="flex-1 bg-black/40 rounded-lg border border-border/30 p-4 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Input Signal</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">LTI Response</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
                                {generated && (
                                    <WaveformChart
                                        time={time}
                                        original={inputSignal}
                                        faulted={outputSignal}
                                        showOriginal={true}
                                    />
                                )}
                            </div>
                        </div>

                        {/* System Status / Diagram Mockup */}
                        <div className="h-32 glass-panel p-4 flex items-center justify-center gap-8 border-accent/20">
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-primary/10 border border-primary/30 rounded text-primary text-[10px] font-mono">Input</div>
                                <div className="w-12 h-[1px] bg-primary/30" />
                            </div>
                            <div className="px-6 py-3 bg-black/40 border border-accent/50 rounded-lg flex flex-col items-center">
                                <span className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] mb-1">Plant H(s)</span>
                                <span className="text-xs text-white font-mono italic">
                                    {`[${numStr}] / [${denStr}]`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-[1px] bg-accent/30" />
                                <div className="px-3 py-1 bg-accent/10 border border-accent/30 rounded text-accent text-[10px] font-mono">Output</div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </MainLayout>
    );
};

export default SystemLab;
