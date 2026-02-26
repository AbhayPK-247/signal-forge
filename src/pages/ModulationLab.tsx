import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    hasActiveFaults,
} from '@/lib/signalEngine';
import ModulationControls from '@/components/ModulationControls';
import ModulationCharts from '@/components/ModulationCharts';

const fmt = (v: number | null, decimals = 3, unit = '') =>
    v === null || !isFinite(v) ? '—' : `${v.toFixed(decimals)}${unit}`;

const StatRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
        <span className="label-text text-[9px] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs text-primary">{value}</span>
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
        const msgSig = generateMessage(timeVec, params.Am, params.Fm);
        const carrSig = generateCarrier(timeVec, params.Ac, params.Fc);
        const modSig = modulate(modType, timeVec, params);
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
    }, [modType, params, faultConfig, showDemod, isRealSource, t, message]);

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
        <div className="min-h-screen bg-background grid-background">
            {/* Header */}
            <header className="border-b border-border/50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse-neon" />
                    <h1 className="font-display text-sm font-bold tracking-wider neon-text">MODULATION LAB</h1>
                    <span className="text-[10px] text-muted-foreground tracking-wider">v1.0</span>
                    <Link to="/" className="signal-button text-[10px] ml-2">Signal Gen</Link>
                    <Link to="/real-signal" className="signal-button text-[10px]">Real Signal Lab</Link>
                    <Link to="/recording" className="signal-button text-[10px]">Recording Lab</Link>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{modType}</span>
                    {generated && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showDemod}
                                onChange={e => setShowDemod(e.target.checked)}
                                className="accent-primary w-3 h-3"
                            />
                            <span className="label-text">Show Demod</span>
                        </label>
                    )}
                    <Link to="/" className="signal-button text-[10px]">← Signal Gen</Link>
                    <Link to="/real-signal" className="signal-button text-[10px]">Real Signal Lab →</Link>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex h-[calc(100vh-41px)]">
                {/* Left Sidebar */}
                <aside className="w-[260px] shrink-0 border-r border-border/50 overflow-y-auto p-3 space-y-3">
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
                </aside>

                {/* Center - Charts */}
                <main className="flex-1 flex flex-col p-3 gap-3 min-w-0">
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
                </main>

                {/* Right Sidebar - Feature Stats */}
                {generated && features && (
                    <aside className="w-[180px] shrink-0 border-l border-border/50 overflow-y-auto p-3 space-y-3">
                        <div className="glass-panel p-3 space-y-3">
                            <div className="section-title">Signal Features</div>
                            <div className="space-y-2.5">
                                <StatRow label="Power" value={fmt(features.power, 4, ' W')} />
                                <StatRow label="Bandwidth" value={features.bandwidth !== null ? fmt(features.bandwidth, 1, ' Hz') : '—'} />
                                <StatRow label="SNR" value={features.snr !== null ? fmt(features.snr, 2, ' dB') : '—'} />
                            </div>
                        </div>

                        <div className="glass-panel p-3 space-y-3">
                            <div className="section-title">Parameters</div>
                            <div className="space-y-2.5">
                                <StatRow label="Type" value={modType} />
                                <StatRow label="Fc" value={`${params.Fc} Hz`} />
                                <StatRow label="Fm" value={`${params.Fm} Hz`} />
                                <StatRow label="Ac" value={`${params.Ac} V`} />
                                <StatRow label="Am" value={`${params.Am} V`} />
                                <StatRow label="Fs" value={`${params.Fs} S/s`} />
                                <StatRow label="T" value={`${params.T} s`} />
                                {modType === 'AM' && <StatRow label="ka" value={params.ka.toFixed(2)} />}
                                {modType === 'FM' && <StatRow label="β" value={params.beta.toString()} />}
                                {modType === 'PM' && <StatRow label="kp" value={params.kp.toString()} />}
                                {modType === 'FSK' && (
                                    <>
                                        <StatRow label="F1" value={`${params.F1} Hz`} />
                                        <StatRow label="F0" value={`${params.F0} Hz`} />
                                    </>
                                )}
                                {(['ASK', 'FSK', 'PSK', 'QPSK'] as ModType[]).includes(modType) && (
                                    <StatRow label="Bit Rate" value={`${params.bitRate} bps`} />
                                )}
                            </div>
                        </div>

                        {hasFaults && (
                            <div className="glass-panel p-3">
                                <div className="section-title mb-2">Fault Active</div>
                                <p className="text-[10px] text-destructive">Fault injection applied to modulated signal</p>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ModulationLab;
