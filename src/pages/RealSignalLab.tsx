import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import MainLayout from '@/components/MainLayout';

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
    <div className="flex flex-col gap-0.5 border-b border-white/5 pb-1">
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{label}</span>
        <span className="font-mono text-[10px] text-primary">{value}</span>
    </div>
);

const RealSignalLab = () => {
    const [source, setSource] = useState<SignalSource>('file');
    const [fftSize, setFftSize] = useState(2048);
    const [parsedFile, setParsedFile] = useState<ParsedSignal | null>(null);
    const [faultConfig, setFaultConfig] = useState<MultiFaultConfig>(createDefaultMultiFaultConfig());
    const [showFaulted, setShowFaulted] = useState(false);
    const [idealParams, setIdealParams] = useState<IdealParams>(DEFAULT_IDEAL);

    const { state: micState, getSamples, getFreqData, start: micStart, stop: micStop } = useMicrophone(fftSize);
    const { playSignal, stop: audioStop, isPlaying } = useAudioPlayer();

    const hasFaults = useMemo(() => hasActiveFaults(faultConfig), [faultConfig]);

    const faultedSignal = useMemo(() => {
        if (!parsedFile || !showFaulted || !hasFaults) return null;
        return applyMultiFault(parsedFile.signal, parsedFile.time, faultConfig);
    }, [parsedFile, showFaulted, hasFaults, faultConfig]);

    const { time: idealTime, signal: idealSignal } = useMemo(() => {
        if (source !== 'comparison') return { time: [], signal: [] };
        return generateIdealSignal(idealParams);
    }, [source, idealParams]);

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

        sessionStorage.setItem('bridge_signal', JSON.stringify(signalToMod));
        sessionStorage.setItem('bridge_fs', Fs.toString());
        window.location.href = '/modulation?source=real';
    }, [source, getSamples, micState.sampleRate, parsedFile, showFaulted, faultedSignal]);

    const specRef = useRef<HTMLCanvasElement>(null);

    return (
        <MainLayout activeLab="real-signal">
            <div className="flex h-full">
                <aside className="w-[260px] shrink-0 border-r border-border/50 overflow-y-auto p-3 space-y-3 bg-black/10">
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

                <main className="flex-1 flex flex-col p-3 gap-3 min-w-0 bg-black/5">
                    <div className="flex-1 bg-black/20 rounded-lg border border-border/30 overflow-hidden">
                        <RealSignalCharts
                            source={source}
                            micStatus={micState.status}
                            getSamples={getSamples}
                            getFreqData={getFreqData}
                            micSampleRate={micState.sampleRate}
                            fftSize={fftSize}
                            spectrogramCanvasRef={specRef}
                            parsedFile={parsedFile}
                            faultedSignal={faultedSignal}
                            idealTime={idealTime}
                            idealSignal={idealSignal}
                            showFaulted={showFaulted}
                        />
                    </div>
                </main>

                {stats && (
                    <aside className="w-[180px] shrink-0 border-l border-border/50 overflow-y-auto p-3 space-y-3 bg-black/20">
                        <div className="glass-panel p-3 space-y-3">
                            <div className="section-title uppercase tracking-widest">Signal Stats</div>
                            <div className="space-y-2.5">
                                <StatRow label="Samples" value={stats.sampleCount.toLocaleString()} />
                                <StatRow label="Mean" value={fmt(stats.mean, 4, ' V')} />
                                <StatRow label="RMS" value={fmt(stats.rms, 4, ' V')} />
                                <StatRow label="P-to-P" value={fmt(stats.peakToPeak, 4, ' V')} />
                                <StatRow label="Skew" value={fmt(stats.skewness)} />
                                <StatRow label="Kurtosis" value={fmt(stats.kurtosis)} />
                                {stats.snr !== null && (
                                    <StatRow label="SNR" value={fmt(stats.snr, 2, ' dB')} />
                                )}
                            </div>
                        </div>

                        {parsedFile && (
                            <div className="glass-panel p-3 space-y-2">
                                <div className="section-title uppercase tracking-widest">Source Info</div>
                                <div className="space-y-2">
                                    <StatRow label="Fs" value={`${parsedFile.sampleRate} Hz`} />
                                    <StatRow label="Length" value={`${(parsedFile.time[parsedFile.time.length - 1] ?? 0).toFixed(3)} s`} />
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        </MainLayout>
    );
};

export default RealSignalLab;
