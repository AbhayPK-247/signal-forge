import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    type SweepParams,
    type SweepTypeBase,
    generateTimeVector,
    generateSweepSignal,
    computeFFT,
    computeSTFT,
    computePSD,
    DEFAULT_PARAMS,
    applyMultiFault,
    createDefaultMultiFaultConfig
} from '@/lib/signalEngine';
import WaveformChart from '@/components/WaveformChart';
import FFTChart from '@/components/FFTChart';
import SpectrogramChart from '@/components/SpectrogramChart';
import PSDChart from '@/components/PSDChart';
import MainLayout from '@/components/MainLayout';
import SweepControls from '@/components/SweepControls';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const SweepLab = () => {
    const [params, setParams] = useState<SweepParams>({
        enabled: false,
        type: 'linear',
        fStart: 10,
        fStop: 100,
        aStart: 1.0,
        aStop: 1.0,
        pStart: 0,
        pStop: 0,
        duration: 5
    });

    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [faultConfig, setFaultConfig] = useState(createDefaultMultiFaultConfig());

    // Real-time state
    const [currentTime, setCurrentTime] = useState(0);
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();

    const animate = useCallback((time: number) => {
        if (lastTimeRef.current !== undefined) {
            const deltaTime = (time - lastTimeRef.current) / 1000;
            setCurrentTime(prev => {
                const next = prev + deltaTime * speed;
                if (next >= params.duration) {
                    return 0; // Loop or stop? Let's loop for visual feedback
                }
                return next;
            });
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [params.duration, speed]);

    useEffect(() => {
        if (isRunning) {
            lastTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isRunning, animate]);

    // Generate data for charts
    // For the "live" feel, we show a sliding window of the sweep
    const { time, signal, instFreq } = useMemo(() => {
        const fs = 1000;
        const windowDuration = 0.5; // 500ms window
        const N = fs * windowDuration;
        const t = Array.from({ length: N }, (_, i) => currentTime + (i / fs));

        const { signal: sig, instFreq: freq } = generateSweepSignal(params, t);

        const noisy = applyMultiFault(sig, t, faultConfig);

        return {
            time: t,
            signal: noisy,
            instFreq: freq
        };
    }, [params, currentTime, faultConfig]);

    const fft = useMemo(() => computeFFT(signal, 1000), [signal]);
    const psd = useMemo(() => computePSD(signal, 1000), [signal]);
    const stft = useMemo(() => computeSTFT(signal, 1000, 128, 64), [signal]);

    // Freq vs Time data
    const freqTimeData = useMemo(() => {
        return time.map((t, i) => ({ t: t.toFixed(2), f: instFreq[i] }));
    }, [time, instFreq]);

    const exportCSV = useCallback(() => {
        const header = 'Time,Frequency,Signal\n';
        const rows = time.map((t, i) => `${t},${instFreq[i]},${signal[i]}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sweep_${params.type}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [time, instFreq, signal, params.type]);

    return (
        <MainLayout activeLab="sweep">
            <div className="flex h-full">
                <aside className="w-[300px] shrink-0 border-r border-border/50 overflow-y-auto p-4 bg-black/10">
                    <SweepControls
                        params={params}
                        onChange={setParams}
                        isRunning={isRunning}
                        onStart={() => setIsRunning(true)}
                        onStop={() => setIsRunning(false)}
                        speed={speed}
                        onSpeedChange={setSpeed}
                    />
                    <div className="mt-4 pt-4 border-t border-white/5 px-2">
                        <button
                            onClick={exportCSV}
                            className="signal-button w-full text-[10px] h-8"
                        >
                            Export Sweep CSV
                        </button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-black/5">
                    <div className="grid grid-cols-2 grid-rows-2 flex-1 gap-4 overflow-hidden">
                        <div className="bg-black/20 rounded-lg border border-border/30 relative overflow-hidden">
                            <div className="absolute top-2 left-4 z-10 text-[10px] uppercase font-bold text-primary/70">Sweep Waveform (Live Window)</div>
                            <WaveformChart time={time} original={signal} faulted={signal} showOriginal={true} />
                        </div>

                        <div className="bg-black/20 rounded-lg border border-border/30 p-2 flex flex-col">
                            <div className="text-[10px] uppercase font-bold text-cyan-400 mb-2 px-2">Instantaneous Spectrum</div>
                            <FFTChart frequencies={fft.frequencies} magnitudes={fft.magnitudes} />
                        </div>

                        <div className="bg-black/20 rounded-lg border border-border/30 flex flex-col overflow-hidden">
                            <div className="text-[10px] uppercase font-bold text-purple-400 p-2 border-b border-white/5">Spectrogram Analysis</div>
                            <div className="flex-1 min-h-0">
                                <SpectrogramChart times={stft.times} frequencies={stft.frequencies} power={stft.power} />
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-lg border border-border/30 p-2 flex flex-col">
                            <div className="text-[10px] uppercase font-bold text-amber-400 mb-2 px-2">Frequency vs Time</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={freqTimeData}>
                                    <XAxis dataKey="t" stroke="#444" fontSize={10} hide />
                                    <YAxis stroke="#444" fontSize={10} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '4px', fontSize: '10px' }}
                                        itemStyle={{ color: '#fbbf24' }}
                                    />
                                    <Line type="monotone" dataKey="f" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="h-[200px] glass-panel p-2">
                        <div className="text-[10px] font-bold text-muted-foreground mb-2 px-2 uppercase tracking-widest">Power Spectral Density</div>
                        <PSDChart frequencies={psd.frequencies} power={psd.power} />
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default SweepLab;
