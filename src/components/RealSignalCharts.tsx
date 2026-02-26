import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { SignalSource } from '@/components/RealSignalControls';
import type { ParsedSignal } from '@/lib/realSignalEngine';

const FONT_COLOR = '#94a3b8';
const COLORS = {
    real: '#22d3ee',   // cyan
    faulted: '#f59e0b',   // amber
    ideal: '#a78bfa',   // violet
    fft: '#f472b6',   // pink
    hist: '#34d399',   // emerald
};

function baseLayout(title: string): Partial<Plotly.Layout> {
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 10, t: 30, b: 40 },
        font: { color: FONT_COLOR, size: 10, family: 'monospace' },
        title: { text: title, font: { size: 11, color: FONT_COLOR } },
        xaxis: { gridcolor: 'rgba(148,163,184,0.1)', zerolinecolor: 'rgba(148,163,184,0.2)', tickcolor: '#475569' },
        yaxis: { gridcolor: 'rgba(148,163,184,0.1)', zerolinecolor: 'rgba(148,163,184,0.2)', tickcolor: '#475569' },
        legend: { font: { size: 9 }, bgcolor: 'rgba(0,0,0,0)' },
        showlegend: true,
    };
}

const CFG: Partial<Plotly.Config> = { displayModeBar: false, responsive: true };

type ChartTab = 'oscilloscope' | 'fft' | 'histogram' | 'comparison';

interface RealSignalChartsProps {
    source: SignalSource;
    // Mic
    micStatus: 'idle' | 'requesting' | 'live' | 'error' | 'stopped';
    getSamples: () => Float32Array;
    getFreqData: () => Float32Array;
    micSampleRate: number;
    fftSize: number;
    // File / comparison
    parsedFile: ParsedSignal | null;
    faultedSignal: number[] | null;
    idealTime: number[];
    idealSignal: number[];
    showFaulted: boolean;
}

// ── Live Oscilloscope ────────────────────────────────────────────────────────
const LiveOscilloscope = ({
    getSamples, getFreqData, sampleRate, fftSize, tab,
}: {
    getSamples: () => Float32Array;
    getFreqData: () => Float32Array;
    sampleRate: number;
    fftSize: number;
    tab: ChartTab;
}) => {
    const [timeSeries, setTimeSeries] = useState<number[]>([]);
    const [freqMags, setFreqMags] = useState<number[]>([]);
    const [freqBins, setFreqBins] = useState<number[]>([]);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const loop = () => {
            const td = getSamples();
            setTimeSeries(Array.from(td));

            const fd = getFreqData();
            // Convert dBFS to linear magnitude
            const mags = Array.from(fd).map(db => Math.pow(10, db / 20));
            const bins = Array.from({ length: fd.length }, (_, k) => (k * sampleRate) / (fd.length * 2));
            setFreqMags(mags);
            setFreqBins(bins);

            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [getSamples, getFreqData, sampleRate]);

    const tAxis = useMemo(() => Array.from({ length: timeSeries.length }, (_, i) => i / sampleRate), [timeSeries.length, sampleRate]);

    if (tab === 'oscilloscope') {
        return (
            <Plot
                data={[{
                    x: tAxis, y: timeSeries,
                    type: 'scatter' as const, mode: 'lines' as const,
                    name: 'Microphone', line: { color: COLORS.real, width: 1 },
                }]}
                layout={{
                    ...baseLayout('Live Oscilloscope — Microphone'),
                    xaxis: { ...baseLayout('').xaxis, title: { text: 'Time (s)' } },
                    yaxis: { ...baseLayout('').yaxis, title: { text: 'Amplitude' }, autorange: true },
                }}
                config={CFG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
            />
        );
    }

    if (tab === 'fft') {
        return (
            <Plot
                data={[{
                    x: freqBins, y: freqMags,
                    type: 'scatter' as const, mode: 'lines' as const,
                    name: 'FFT (live)', fill: 'tozeroy' as const,
                    line: { color: COLORS.fft, width: 1.5 },
                    fillcolor: `${COLORS.fft}22`,
                }]}
                layout={{
                    ...baseLayout('Live FFT Spectrum'),
                    xaxis: { ...baseLayout('').xaxis, title: { text: 'Frequency (Hz)' } },
                    yaxis: { ...baseLayout('').yaxis, title: { text: 'Magnitude' } },
                }}
                config={CFG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
            />
        );
    }

    return (
        <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-xs">Switch to Oscilloscope or FFT tab for live data</p>
        </div>
    );
};

// ── Static plots for uploaded file ──────────────────────────────────────────
const StaticCharts = ({
    tab, parsedFile, faultedSignal, idealTime, idealSignal, showFaulted,
}: {
    tab: ChartTab;
    parsedFile: ParsedSignal;
    faultedSignal: number[] | null;
    idealTime: number[];
    idealSignal: number[];
    showFaulted: boolean;
}) => {
    const { time, signal, sampleRate } = parsedFile;

    // FFT memoized
    const [fftData, setFftData] = useState<{ frequencies: number[]; magnitudes: number[] } | null>(null);
    useEffect(() => {
        import('@/lib/realSignalEngine').then(({ computeRealFFT, downsample }) => {
            const ds = downsample(time, signal, 4096);
            setFftData(computeRealFFT(ds.signal, sampleRate, 2048));
        });
    }, [signal, sampleRate, time]);

    // Downsampled signal for rendering
    const [dsTime, setDsTime] = useState<number[]>([]);
    const [dsSignal, setDsSignal] = useState<number[]>([]);
    const [dsFaulted, setDsFaulted] = useState<number[]>([]);

    useEffect(() => {
        import('@/lib/realSignalEngine').then(({ downsample }) => {
            const ds = downsample(time, signal, 4096);
            setDsTime(ds.time);
            setDsSignal(ds.signal);
            if (faultedSignal) {
                const dsF = downsample(time, faultedSignal, 4096);
                setDsFaulted(dsF.signal);
            }
        });
    }, [time, signal, faultedSignal]);

    if (tab === 'oscilloscope') {
        const traces: Plotly.Data[] = [{
            x: dsTime, y: dsSignal, type: 'scatter' as const, mode: 'lines' as const,
            name: parsedFile.label, line: { color: COLORS.real, width: 1.5 },
        }];
        if (showFaulted && dsFaulted.length > 0) {
            traces.push({
                x: dsTime, y: dsFaulted, type: 'scatter' as const, mode: 'lines' as const,
                name: 'Faulted', line: { color: COLORS.faulted, width: 1.5, dash: 'dot' as const },
            });
        }
        return (
            <Plot
                data={traces}
                layout={{
                    ...baseLayout('Signal Waveform'),
                    xaxis: { ...baseLayout('').xaxis, title: { text: 'Time (s)' } },
                    yaxis: { ...baseLayout('').yaxis, title: { text: 'Amplitude' } },
                }}
                config={CFG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
            />
        );
    }

    if (tab === 'fft') {
        const f = fftData;
        if (!f) return <div className="h-full flex items-center justify-center"><p className="text-muted-foreground text-xs">Computing FFT…</p></div>;
        return (
            <Plot
                data={[{
                    x: f.frequencies, y: f.magnitudes, type: 'scatter' as const, mode: 'lines' as const,
                    name: 'FFT Magnitude', fill: 'tozeroy' as const,
                    line: { color: COLORS.fft, width: 1.5 }, fillcolor: `${COLORS.fft}22`,
                }]}
                layout={{
                    ...baseLayout('FFT Spectrum'),
                    xaxis: { ...baseLayout('').xaxis, title: { text: 'Frequency (Hz)' } },
                    yaxis: { ...baseLayout('').yaxis, title: { text: 'Magnitude' } },
                }}
                config={CFG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
            />
        );
    }

    if (tab === 'histogram') {
        return (
            <Plot
                data={[({
                    x: signal.slice(0, 4096),
                    type: 'histogram' as const,
                    nbinsx: 50,
                    marker: { color: COLORS.hist, line: { color: `${COLORS.hist}88`, width: 0.5 } },
                    name: 'Amplitude Dist.',
                } as any)]}
                layout={{
                    ...baseLayout('Amplitude Histogram'),
                    xaxis: { ...baseLayout('').xaxis, title: { text: 'Amplitude' } },
                    yaxis: { ...baseLayout('').yaxis, title: { text: 'Count' } },
                }}
                config={CFG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
            />
        );
    }

    if (tab === 'comparison') {
        const traces: Plotly.Data[] = [{
            x: dsTime, y: dsSignal, type: 'scatter' as const, mode: 'lines' as const,
            name: 'Real', line: { color: COLORS.real, width: 1.5 },
        }];
        if (idealTime.length > 0 && idealSignal.length > 0) {
            traces.push({
                x: idealTime, y: idealSignal, type: 'scatter' as const, mode: 'lines' as const,
                name: 'Ideal', line: { color: COLORS.ideal, width: 1.5, dash: 'dash' as const },
            });
        }
        if (showFaulted && dsFaulted.length > 0) {
            traces.push({
                x: dsTime, y: dsFaulted, type: 'scatter' as const, mode: 'lines' as const,
                name: 'Faulted', line: { color: COLORS.faulted, width: 1, dash: 'dot' as const },
            });
        }
        return (
            <Plot
                data={traces}
                layout={{
                    ...baseLayout('Comparison: Ideal vs Real vs Faulted'),
                    xaxis: { ...baseLayout('').xaxis, title: { text: 'Time (s)' } },
                    yaxis: { ...baseLayout('').yaxis, title: { text: 'Amplitude' } },
                }}
                config={CFG}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler
            />
        );
    }

    return null;
};

// ── Main component ────────────────────────────────────────────────────────────
const RealSignalCharts = ({
    source, micStatus, getSamples, getFreqData, micSampleRate, fftSize,
    parsedFile, faultedSignal, idealTime, idealSignal, showFaulted,
}: RealSignalChartsProps) => {
    const [tab, setTab] = useState<ChartTab>('oscilloscope');
    const isLive = source === 'microphone' && micStatus === 'live';
    const hasFile = parsedFile !== null;

    const TABS: { key: ChartTab; label: string; show: boolean }[] = [
        { key: 'oscilloscope', label: 'Oscilloscope', show: true },
        { key: 'fft', label: 'FFT Spectrum', show: true },
        { key: 'histogram', label: 'Histogram', show: hasFile || !isLive },
        { key: 'comparison', label: 'Comparison', show: source === 'comparison' },
    ];

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Sub-tabs */}
            <div className="flex gap-1 shrink-0 flex-wrap">
                {TABS.filter(t => t.show).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`signal-button text-[10px] ${tab === t.key ? 'signal-button-active' : ''}`}
                    >
                        {t.label}
                    </button>
                ))}
                {isLive && (
                    <span className="ml-auto text-[9px] text-primary animate-pulse font-mono self-center">● LIVE</span>
                )}
            </div>

            {/* Empty state */}
            {!isLive && !hasFile ? (
                <div className="flex-1 oscilloscope-display flex items-center justify-center">
                    <div className="text-center space-y-2 px-6">
                        <div className="font-display text-xl font-bold neon-text tracking-wider">REAL SIGNAL LAB</div>
                        <p className="text-muted-foreground text-xs">
                            {source === 'microphone'
                                ? 'Click Start to capture microphone input'
                                : 'Upload a CSV, TXT, or WAV file to begin'}
                        </p>
                        <div className="flex gap-1 justify-center">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-1 h-5 bg-primary/30 rounded-full" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 oscilloscope-display">
                    {isLive ? (
                        <LiveOscilloscope
                            getSamples={getSamples}
                            getFreqData={getFreqData}
                            sampleRate={micSampleRate}
                            fftSize={fftSize}
                            tab={tab}
                        />
                    ) : hasFile ? (
                        <StaticCharts
                            tab={tab}
                            parsedFile={parsedFile!}
                            faultedSignal={faultedSignal}
                            idealTime={idealTime}
                            idealSignal={idealSignal}
                            showFaulted={showFaulted}
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default RealSignalCharts;
