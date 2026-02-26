import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import {
    type ParsedSignal,
    type IdealParams,
    type IdealType,
    computeRealStats,
    generateIdealSignal,
} from '@/lib/realSignalEngine';
import { encodeWAV } from '@/lib/recordingEngine';
import {
    type MultiFaultConfig,
    createDefaultMultiFaultConfig,
    applyMultiFault,
    hasActiveFaults,
} from '@/lib/signalEngine';
import RealSignalControls, { type SignalSource } from '@/components/RealSignalControls';
import RealSignalCharts from '@/components/RealSignalCharts';

const DEFAULT_IDEAL: IdealParams = {
    type: 'sine' as IdealType,
    amplitude: 1,
    frequency: 50,
    sampleRate: 1000,
    duration: 1,
};

const fmt = (v: number | null, d = 4, unit = '') =>
    v === null || !isFinite(v) ? '—' : `${v.toFixed(d)}${unit}`;

const StatRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
        <span className="label-text text-[9px] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs text-primary">{value}</span>
    </div>
);

const RealSignalLab = () => {
    const [source, setSource] = useState<SignalSource>('file');
    const [fftSize, setFftSize] = useState(2048);
    const [parsedFile, setParsedFile] = useState<ParsedSignal | null>(null);
    const [faultConfig, setFaultConfig] = useState<MultiFaultConfig>(createDefaultMultiFaultConfig());
    const [showFaulted, setShowFaulted] = useState(false);
    const [idealParams, setIdealParams] = useState<IdealParams>(DEFAULT_IDEAL);

    // Microphone
    const { state: micState, getSamples, getFreqData, start: micStart, stop: micStop } = useMicrophone(fftSize);

    // Audio Player
    const { playSignal, stop: audioStop, isPlaying } = useAudioPlayer();

    const hasFaults = useMemo(() => hasActiveFaults(faultConfig), [faultConfig]);

    // Apply fault to file signal
    const faultedSignal = useMemo(() => {
        if (!parsedFile || !showFaulted || !hasFaults) return null;
        return applyMultiFault(parsedFile.signal, parsedFile.time, faultConfig);
    }, [parsedFile, showFaulted, hasFaults, faultConfig]);

    // Ideal signal for comparison
    const { time: idealTime, signal: idealSignal } = useMemo(() => {
        if (source !== 'comparison') return { time: [], signal: [] };
        return generateIdealSignal(idealParams);
    }, [source, idealParams]);

    // Live Stats for Microphone
    const [liveStats, setLiveStats] = useState<any>(null);
    useEffect(() => {
        if (source !== 'microphone' || micState.status !== 'live') {
            setLiveStats(null);
            return;
        }
        const interval = setInterval(() => {
            const samples = Array.from(getSamples());
            setLiveStats(computeRealStats(samples));
        }, 200);
        return () => clearInterval(interval);
    }, [source, micState.status, getSamples]);

    // Stats on the current signal
    const stats = useMemo(() => {
        if (source === 'microphone') return liveStats;
        if (!parsedFile) return null;
        const sig = (showFaulted && faultedSignal) ? faultedSignal : parsedFile.signal;
        const ref = (showFaulted && faultedSignal) ? parsedFile.signal : undefined;
        return computeRealStats(sig, ref);
    }, [source, liveStats, parsedFile, faultedSignal, showFaulted]);

    const handleFileLoaded = useCallback((signal: ParsedSignal) => {
        setParsedFile(signal);
        setShowFaulted(false);
        setFaultConfig(createDefaultMultiFaultConfig());
    }, []);

    const handleFaultChange = useCallback((config: MultiFaultConfig) => {
        setFaultConfig(config);
    }, []);

    const handleSourceChange = useCallback((s: SignalSource) => {
        setSource(s);
        // Stop mic when switching away
        if (s !== 'microphone') micStop();
        audioStop();
    }, [micStop, audioStop]);

    const handleClear = useCallback(() => {
        setParsedFile(null);
        setShowFaulted(false);
        setFaultConfig(createDefaultMultiFaultConfig());
        micStop();
        audioStop();
    }, [micStop, audioStop]);

    const handlePlay = useCallback((playFaulted: boolean) => {
        if (!parsedFile) return;
        const sig = (playFaulted && faultedSignal) ? faultedSignal : parsedFile.signal;
        playSignal(sig, parsedFile.sampleRate);
    }, [parsedFile, faultedSignal, playSignal]);

    const handleExport = useCallback((format: 'wav' | 'csv') => {
        if (!parsedFile) return;
        const sig = (showFaulted && faultedSignal) ? faultedSignal : parsedFile.signal;

        let blob: Blob;
        if (format === 'wav') {
            blob = encodeWAV(sig instanceof Float32Array ? sig : new Float32Array(sig), parsedFile.sampleRate);
        } else {
            const header = 'Time,Signal' + (showFaulted && faultedSignal ? ',Faulted' : '') + '\n';
            const rows = parsedFile.time.map((t, i) =>
                [t, parsedFile.signal[i], showFaulted && faultedSignal ? faultedSignal[i] : null]
                    .filter(v => v !== null)
                    .join(',')
            ).join('\n');
            blob = new Blob([header + rows], { type: 'text/csv' });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `real_signal_${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }, [parsedFile, faultedSignal, showFaulted]);

    const handleModulateReal = useCallback(() => {
        let signalToMod: number[] = [];
        let Fs = 44100;

        if (source === 'microphone') {
            signalToMod = Array.from(getSamples());
            Fs = micState.sampleRate;
        } else if (parsedFile) {
            signalToMod = (showFaulted && faultedSignal) ? faultedSignal : parsedFile.signal;
            Fs = parsedFile.sampleRate;
        }

        if (signalToMod.length === 0) return;

        // Store in sessionStorage to bridge to ModulationLab
        sessionStorage.setItem('bridge_signal', JSON.stringify(signalToMod));
        sessionStorage.setItem('bridge_fs', Fs.toString());
        window.location.href = '/modulation?source=real';
    }, [source, getSamples, micState.sampleRate, parsedFile, showFaulted, faultedSignal]);

    return (
        <div className="min-h-screen bg-background grid-background">
            {/* Header */}
            <header className="border-b border-border/50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse-neon" style={{ boxShadow: '0 0 8px hsl(var(--accent))' }} />
                    <h1 className="font-display text-sm font-bold tracking-wider" style={{ color: 'hsl(var(--accent))', textShadow: '0 0 10px hsl(var(--accent)/0.5)' }}>
                        REAL SIGNAL LAB
                    </h1>
                    <span className="text-[10px] text-muted-foreground tracking-wider">v1.0</span>
                </div>
                <div className="flex items-center gap-2">
                    {micState.status === 'live' && (
                        <span className="text-[9px] text-primary animate-pulse font-mono">● LIVE 44.1kHz</span>
                    )}
                    <Link to="/" className="signal-button text-[10px]">Signal Gen</Link>
                    <Link to="/modulation" className="signal-button text-[10px]">Modulation Lab</Link>
                    <Link to="/recording" className="signal-button text-[10px]">Recording Lab</Link>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex h-[calc(100vh-41px)]">
                {/* Left Sidebar */}
                <aside className="w-[260px] shrink-0 border-r border-border/50 overflow-y-auto p-3 space-y-3">
                    <RealSignalControls
                        source={source}
                        micStatus={micState.status}
                        micError={micState.error}
                        parsedFile={parsedFile}
                        fftSize={fftSize}
                        idealParams={idealParams}
                        faultConfig={faultConfig}
                        showFaulted={showFaulted}
                        onSourceChange={handleSourceChange}
                        onMicStart={micStart}
                        onMicStop={micStop}
                        onFileLoaded={handleFileLoaded}
                        onFftSizeChange={setFftSize}
                        onIdealParamsChange={setIdealParams}
                        onFaultChange={handleFaultChange}
                        onShowFaultedToggle={setShowFaulted}
                        onSave={handleExport}
                        onClear={handleClear}
                        onModulate={handleModulateReal}
                        onPlay={handlePlay}
                        onStopAudio={audioStop}
                        isPlaying={isPlaying}
                        hasSignal={parsedFile !== null || (source === 'microphone' && micState.status === 'live')}
                    />
                </aside>

                {/* Center */}
                <main className="flex-1 flex flex-col p-3 gap-3 min-w-0">
                    <RealSignalCharts
                        source={source}
                        micStatus={micState.status}
                        getSamples={getSamples}
                        getFreqData={getFreqData}
                        micSampleRate={micState.sampleRate}
                        fftSize={fftSize}
                        parsedFile={parsedFile}
                        faultedSignal={faultedSignal}
                        idealTime={idealTime}
                        idealSignal={idealSignal}
                        showFaulted={showFaulted}
                    />
                </main>

                {/* Right Sidebar — Stats */}
                {stats && (
                    <aside className="w-[180px] shrink-0 border-l border-border/50 overflow-y-auto p-3 space-y-3">
                        <div className="glass-panel p-3 space-y-3">
                            <div className="section-title">Signal Stats</div>
                            <div className="space-y-2.5">
                                <StatRow label="Samples" value={stats.sampleCount.toLocaleString()} />
                                <StatRow label="Mean" value={fmt(stats.mean, 4, ' V')} />
                                <StatRow label="Variance" value={fmt(stats.variance)} />
                                <StatRow label="Std Dev" value={fmt(stats.stdDev, 4, ' V')} />
                                <StatRow label="RMS" value={fmt(stats.rms, 4, ' V')} />
                                <StatRow label="Peak" value={fmt(stats.peak, 4, ' V')} />
                                <StatRow label="P-to-P" value={fmt(stats.peakToPeak, 4, ' V')} />
                                <StatRow label="Min" value={fmt(stats.min, 4, ' V')} />
                                <StatRow label="Max" value={fmt(stats.max, 4, ' V')} />
                                <StatRow label="Skewness" value={fmt(stats.skewness)} />
                                <StatRow label="Kurtosis" value={fmt(stats.kurtosis)} />
                                {stats.snr !== null && (
                                    <StatRow label="SNR" value={fmt(stats.snr, 2, ' dB')} />
                                )}
                            </div>
                        </div>

                        {parsedFile && (
                            <div className="glass-panel p-3 space-y-2">
                                <div className="section-title">Source Info</div>
                                <div className="space-y-2">
                                    <StatRow label="File" value={parsedFile.label.split('/').pop() ?? parsedFile.label} />
                                    <StatRow label="Fs" value={`${parsedFile.sampleRate} Hz`} />
                                    <StatRow label="Length" value={`${(parsedFile.time[parsedFile.time.length - 1] ?? 0).toFixed(3)} s`} />
                                </div>
                            </div>
                        )}

                        {showFaulted && hasFaults && (
                            <div className="glass-panel p-3">
                                <div className="section-title mb-2">Fault Active</div>
                                <p className="text-[10px] text-destructive">Fault injection applied to real signal</p>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
};

export default RealSignalLab;
