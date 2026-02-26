import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    type ModType,
    type ModParams,
    type ConstellationPoint,
    DEFAULT_MOD_PARAMS,
    generateModTimeVector,
    generateMessage,
    generateCarrier,
    modulate,
    demodulate,
    computeConstellation,
    computeModFFT,
    computeModFeatures,
} from '@/lib/modulationEngine';
import {
    type MultiFaultConfig,
    createDefaultMultiFaultConfig,
    applyMultiFault,
    generateSweepSignal,
    hasActiveFaults,
} from '@/lib/signalEngine';
import ModulationControls from '@/components/ModulationControls';
import ModulationCharts from '@/components/ModulationCharts';
import MainLayout from '@/components/MainLayout';
import FormulaPanel from '@/components/FormulaPanel';

const fmt = (v: number | null, decimals = 3, unit = '') =>
    v === null || !isFinite(v) ? '—' : `${v.toFixed(decimals)}${unit}`;

const StatRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5 border-b border-white/5 pb-1">
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{label}</span>
        <span className="font-mono text-[10px] text-primary">{value}</span>
    </div>
);

const ModulationLab = () => {
    const [modType, setModType] = useState<ModType>('AM');
    const [params, setParams] = useState<ModParams>(DEFAULT_MOD_PARAMS);
    const [faultConfig, setFaultConfig] = useState<MultiFaultConfig>(createDefaultMultiFaultConfig());
    const [showDemod, setShowDemod] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [isRealSource, setIsRealSource] = useState(false);

    const [t, setT] = useState<number[]>([]);
    const [message, setMessage] = useState<number[]>([]);
    const [carrier, setCarrier] = useState<number[]>([]);
    const [modulated, setModulated] = useState<number[]>([]);
    const [faultedModulated, setFaultedModulated] = useState<number[]>([]);
    const [demodulated, setDemodulated] = useState<number[] | null>(null);
    const [constellation, setConstellation] = useState<ConstellationPoint[]>([]);

    const [useSweepMessage, setUseSweepMessage] = useState(false);
    const [sweepParams, setSweepParams] = useState({
        type: 'linear' as any,
        fStart: 1,
        fStop: 100,
        aStart: 0.5,
        aStop: 0.5,
        pStart: 0,
        pStop: 0,
        duration: DEFAULT_MOD_PARAMS.T
    });

    const hasFaults = useMemo(() => hasActiveFaults(faultConfig), [faultConfig]);

    // Bridge from Real Signal Lab
    useEffect(() => {
        const search = window.location.search;
        if (search.includes('source=real')) {
            const raw = sessionStorage.getItem('bridge_signal');
            const fs = sessionStorage.getItem('bridge_fs');
            if (raw && fs) {
                const signal = JSON.parse(raw);
                const sampleRate = parseInt(fs);

                setIsRealSource(true);
                setT(Array.from({ length: signal.length }, (_, i) => i / sampleRate));
                setMessage(signal);
                setParams(p => ({ ...p, Fs: sampleRate, T: signal.length / sampleRate }));

                setGenerated(true);
            }
        }
    }, [setParams]);

    const generate = useCallback(() => {
        if (isRealSource) {
            const carrSig = generateCarrier(t, params.Ac, params.Fc);
            const modSig = modulate(modType, t, params, message);
            const faulted = applyMultiFault(modSig, t, faultConfig);
            const demod = showDemod ? demodulate(modType, faulted, t, params) : null;
            const const_ = computeConstellation(t, faulted, params, modType);

            setCarrier(carrSig);
            setModulated(modSig);
            setFaultedModulated(faulted);
            setDemodulated(demod);
            setConstellation(const_);
            return;
        }

        const timeVec = generateModTimeVector(params.Fs, params.T);
        let msgSig: number[];

        if (useSweepMessage) {
            const { signal } = generateSweepSignal({ ...sweepParams, duration: params.T, enabled: true }, timeVec);
            msgSig = signal;
        } else {
            msgSig = generateMessage(timeVec, params.Am, params.Fm);
        }

        const carrSig = generateCarrier(timeVec, params.Ac, params.Fc);
        const modSig = modulate(modType, timeVec, params, msgSig);
        const faulted = applyMultiFault(modSig, timeVec, faultConfig);
        const demod = showDemod ? demodulate(modType, faulted, timeVec, params) : null;
        const const_ = computeConstellation(timeVec, faulted, params, modType);

        setT(timeVec);
        setMessage(msgSig);
        setCarrier(carrSig);
        setModulated(modSig);
        setFaultedModulated(faulted);
        setDemodulated(demod);
        setConstellation(const_);
        setGenerated(true);
    }, [modType, params, faultConfig, showDemod, isRealSource, t, message, useSweepMessage, sweepParams]);

    const handleFaultChange = useCallback(
        (config: MultiFaultConfig) => {
            setFaultConfig(config);
            if (modulated.length > 0) {
                const faulted = applyMultiFault(modulated, t, config);
                setFaultedModulated(faulted);
                if (showDemod) {
                    setDemodulated(demodulate(modType, faulted, t, params));
                }
            }
        },
        [modulated, t, showDemod, modType, params]
    );

    const reset = useCallback(() => {
        setModType('AM');
        setParams(DEFAULT_MOD_PARAMS);
        setFaultConfig(createDefaultMultiFaultConfig());
        setShowDemod(false);
        setGenerated(false);
        setT([]); setMessage([]); setCarrier([]);
        setModulated([]); setFaultedModulated([]);
        setDemodulated(null); setConstellation([]);
    }, []);

    const exportCSV = useCallback(() => {
        if (!generated) return;
        const header = 'Time,Message,Carrier,Modulated,Faulted' + (demodulated ? ',Demodulated' : '') + '\n';
        const rows = t.map((ti, i) =>
            [ti, message[i], carrier[i], modulated[i], faultedModulated[i], demodulated?.[i] ?? ''].filter(v => v !== '').join(',')
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modulation_${modType}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [generated, t, message, carrier, modulated, faultedModulated, demodulated, modType]);

    const fft = useMemo(() => {
        if (!generated || faultedModulated.length === 0) return { frequencies: [], magnitudes: [] };
        return computeModFFT(faultedModulated, params.Fs, 1024);
    }, [faultedModulated, params.Fs, generated]);

    const features = useMemo(() => {
        if (!generated) return null;
        return computeModFeatures(
            faultedModulated,
            hasFaults ? modulated : null,
            fft.frequencies,
            fft.magnitudes
        );
    }, [faultedModulated, modulated, hasFaults, fft, generated]);

    const displaySignal = hasFaults ? faultedModulated : modulated;

    return (
        <MainLayout activeLab="modulation">
            <div className="flex h-full">
                {/* Left Sidebar */}
                <aside className="w-[260px] shrink-0 border-r border-border/50 overflow-y-auto p-3 space-y-3 bg-black/10">
                    <ModulationControls
                        modType={modType}
                        params={params}
                        showDemod={showDemod}
                        faultConfig={faultConfig}
                        onModTypeChange={setModType}
                        onParamsChange={setParams}
                        onDemodToggle={setShowDemod}
                        onFaultChange={handleFaultChange}
                        onGenerate={generate}
                        onReset={reset}
                        onExport={exportCSV}
                        isRealSource={isRealSource}
                    />

                    <div className="glass-panel p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="section-title uppercase tracking-widest text-[10px]">Sweep Message</div>
                            <button
                                onClick={() => setUseSweepMessage(!useSweepMessage)}
                                className={`signal-button text-[9px] h-6 px-3 ${useSweepMessage ? 'signal-button-active' : ''}`}
                            >
                                {useSweepMessage ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        {useSweepMessage && (
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <div className="space-y-1">
                                    <span className="text-[9px] text-muted-foreground uppercase">Freq: {sweepParams.fStart}Hz → {sweepParams.fStop}Hz</span>
                                    <div className="grid grid-cols-2 gap-1 text-[8px]">
                                        <button onClick={() => setSweepParams({ ...sweepParams, type: 'linear' })} className={`signal-button h-6 ${sweepParams.type === 'linear' ? 'signal-button-active' : ''}`}>LIN</button>
                                        <button onClick={() => setSweepParams({ ...sweepParams, type: 'logarithmic' })} className={`signal-button h-6 ${sweepParams.type === 'logarithmic' ? 'signal-button-active' : ''}`}>LOG</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Center - Charts */}
                <main className="flex-1 flex flex-col p-3 gap-3 min-w-0 bg-black/5">
                    <div className="flex-1 bg-black/20 rounded-lg border border-border/30 overflow-hidden">
                        <ModulationCharts
                            t={t}
                            message={message}
                            carrier={carrier}
                            modulated={displaySignal}
                            demodulated={demodulated}
                            frequencies={fft.frequencies}
                            magnitudes={fft.magnitudes}
                            constellation={constellation}
                            modType={modType}
                            showDemod={showDemod}
                        />
                    </div>
                </main>

                {/* Right Sidebar - Feature Stats */}
                {generated && features && (
                    <aside className="w-[220px] shrink-0 border-l border-border/50 overflow-y-auto p-3 space-y-3 bg-black/20">
                        <FormulaPanel
                            type="modulation"
                            modType={modType}
                            modParams={params}
                            useSweepMessage={useSweepMessage}
                        />

                        <div className="glass-panel p-3 space-y-3">
                            <div className="section-title uppercase tracking-widest">Signal Features</div>
                            <div className="space-y-2.5">
                                <StatRow label="RMS Power" value={fmt(features.power, 4, ' W')} />
                                <StatRow label="Estimated BW" value={features.bandwidth !== null ? fmt(features.bandwidth, 1, ' Hz') : '—'} />
                                <StatRow label="System SNR" value={features.snr !== null ? fmt(features.snr, 2, ' dB') : '—'} />
                            </div>
                        </div>

                        <div className="glass-panel p-3 space-y-3">
                            <div className="section-title uppercase tracking-widest">Active State</div>
                            <div className="space-y-2.5">
                                <StatRow label="Scheme" value={modType} />
                                <StatRow label="Carrier" value={`${params.Fc} Hz`} />
                                <StatRow label="Samplerate" value={`${params.Fs} S/s`} />
                            </div>
                        </div>

                        {hasFaults && (
                            <div className="glass-panel p-3 border-destructive/30 bg-destructive/5">
                                <div className="text-[9px] font-bold text-destructive uppercase tracking-widest mb-1">Fault Alert</div>
                                <p className="text-[10px] text-muted-foreground leading-tight">Injection active on modulated carrier signal.</p>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        </MainLayout>
    );
};

export default ModulationLab;
