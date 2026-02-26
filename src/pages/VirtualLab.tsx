import React, { useState, useMemo, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import {
    SignalType,
    SignalParams,
    DEFAULT_PARAMS,
    generateSignal,
    generateTimeVector,
    computeFFT,
    computeStats,
    exportToCSV
} from '@/lib/signalEngine';
import WaveformChart from '@/components/WaveformChart';
import FFTChart from '@/components/FFTChart';
import { Slider } from '@/components/ui/slider';
import { Activity, Zap, Monitor, Settings, LineChart as LucideChart, Maximize2, Plus, Trash2 } from 'lucide-react';
import StatsDisplay from '@/components/StatsDisplay';

interface SignalLayer {
    id: string;
    type: SignalType;
    params: SignalParams;
}

const VirtualLab = () => {
    // --- Function Generator State ---
    const [layers, setLayers] = useState<SignalLayer[]>([
        {
            id: '1',
            type: 'sine',
            params: {
                ...DEFAULT_PARAMS,
                frequency: 10,
                amplitude: 1,
                samplingRate: 2000,
                duration: 0.2
            }
        }
    ]);
    const [activeLayerId, setActiveLayerId] = useState<string>('1');

    const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];

    // --- Oscilloscope State ---
    const [time, setTime] = useState<number[]>([]);
    const [signal, setSignal] = useState<number[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [fft, setFFT] = useState<{ frequencies: number[], magnitudes: number[] } | null>(null);

    // --- Simulation Loop ---
    const updateSimulation = useCallback(() => {
        if (layers.length === 0) return;

        const baseParams = layers[0].params;
        const t = generateTimeVector(baseParams);
        let compositeSignal = new Array(t.length).fill(0);

        layers.forEach(layer => {
            const sig = generateSignal(layer.type, layer.params, t);
            for (let i = 0; i < t.length; i++) {
                compositeSignal[i] += sig[i];
            }
        });

        const psd = computeFFT(compositeSignal, baseParams.samplingRate);
        const s = computeStats(compositeSignal);

        setTime(t);
        setSignal(compositeSignal);
        setStats(s);
        setFFT(psd);
    }, [layers]);

    useEffect(() => {
        updateSimulation();
    }, [updateSimulation]);

    const addLayer = () => {
        const id = Math.random().toString(36).substr(2, 9);
        setLayers([...layers, {
            id,
            type: 'sine',
            params: { ...layers[layers.length - 1].params, frequency: (layers.length + 1) * 10 }
        }]);
        setActiveLayerId(id);
    };

    const removeLayer = (id: string) => {
        if (layers.length <= 1) return;
        const newLayers = layers.filter(l => l.id !== id);
        setLayers(newLayers);
        if (activeLayerId === id) setActiveLayerId(newLayers[0].id);
    };

    const updateActiveParams = (newParams: Partial<SignalParams>) => {
        setLayers(layers.map(l => l.id === activeLayerId ? { ...l, params: { ...l.params, ...newParams } } : l));
    };

    const updateActiveType = (type: SignalType) => {
        setLayers(layers.map(l => l.id === activeLayerId ? { ...l, type } : l));
    };

    return (
        <MainLayout activeLab="virtual">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden bg-slate-950">
                {/* Workbench Header */}
                <div className="flex items-center justify-between shrink-0 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-primary/20 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Monitor className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-display font-black tracking-tight text-white uppercase italic">INTEGRATED WORKBENCH</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
                                <p className="text-[10px] text-primary/80 uppercase font-black tracking-[0.3em]">PRO SERIES v2.5</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block opacity-50">Master Clock</span>
                            <span className="text-xs font-mono text-primary">2.000 kHz INTERNAL</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="text-right">
                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block opacity-50">Data Bus</span>
                            <span className="text-xs font-mono text-primary">ACTIVE</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* LEFT: FUNCTION GENERATOR (FG) */}
                    <aside className="w-[340px] flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="glass-panel p-5 space-y-5 border-primary/20 bg-primary/5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" /> SIGNAL LAYERS
                                </span>
                                <button onClick={addLayer} className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded text-primary transition-colors border border-primary/20">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1 thin-scrollbar">
                                {layers.map((layer, idx) => (
                                    <div
                                        key={layer.id}
                                        onClick={() => setActiveLayerId(layer.id)}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${activeLayerId === layer.id ? 'bg-primary/10 border-primary/40' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Layer {idx + 1}: {layer.type}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-primary/60">{layer.params.frequency}Hz</span>
                                            {layers.length > 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                                                    className="p-1 hover:text-red-400 text-muted-foreground transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="h-[1px] bg-white/5 mx-2" />

                            <div className="grid grid-cols-3 gap-2">
                                {(['sine', 'square', 'triangle', 'sawtooth', 'noise', 'harmonics'] as SignalType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => updateActiveType(t)}
                                        className={`
                                            h-9 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all
                                            ${activeLayer.type === t
                                                ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                                                : 'bg-black/40 border-white/5 text-muted-foreground hover:bg-white/5'}
                                        `}
                                    >
                                        {t.slice(0, 4)}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-6 pt-2">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Frequency</label>
                                        <span className="text-lg font-mono text-primary leading-none">{activeLayer.params.frequency}<span className="text-[10px] ml-1 opacity-50">Hz</span></span>
                                    </div>
                                    <Slider
                                        value={[activeLayer.params.frequency]}
                                        min={1} max={100}
                                        onValueChange={([v]) => updateActiveParams({ frequency: v })}
                                        className="py-2"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Amplitude</label>
                                        <span className="text-lg font-mono text-primary leading-none">{activeLayer.params.amplitude.toFixed(2)}<span className="text-[10px] ml-1 opacity-50">V</span></span>
                                    </div>
                                    <Slider
                                        value={[activeLayer.params.amplitude]}
                                        min={0} max={5} step={0.1}
                                        onValueChange={([v]) => updateActiveParams({ amplitude: v })}
                                        className="py-2"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">DC Offset</label>
                                        <span className="text-lg font-mono text-primary leading-none">{activeLayer.params.dcOffset.toFixed(2)}<span className="text-[10px] ml-1 opacity-50">V</span></span>
                                    </div>
                                    <Slider
                                        value={[activeLayer.params.dcOffset]}
                                        min={-5} max={5} step={0.1}
                                        onValueChange={([v]) => updateActiveParams({ dcOffset: v })}
                                        className="py-2"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-5 border-accent/20 bg-accent/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5" /> LIVE MEASUREMENTS
                                </span>
                                <button
                                    onClick={() => exportToCSV({ time, signal }, 'virtual_lab_export.csv')}
                                    className="px-2 py-1 rounded bg-accent/20 text-accent text-[8px] font-black uppercase hover:bg-accent/30 transition-colors border border-accent/20"
                                >
                                    Export CSV
                                </button>
                            </div>
                            {stats && <StatsDisplay stats={stats} />}
                        </div>
                    </aside>

                    {/* RIGHT: OSCILLOSCOPE (DSO) */}
                    <main className="flex-1 flex flex-col gap-4 min-w-0">
                        {/* Time Domain View */}
                        <div className="flex-[2] flex flex-col bg-black/60 rounded-2xl border border-white/5 p-6 shadow-inner relative group">
                            <div className="flex items-center justify-between mb-6 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Digital Oscilloscope</span>
                                </div>
                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">CH1: 1.00V/DIV</span>
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase ml-2">TIME: 20ms/DIV</span>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 relative">
                                <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />
                                <WaveformChart time={time} original={[]} faulted={signal} showOriginal={false} />
                            </div>

                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Frequency Domain / Stats Row */}
                        <div className="flex-1 flex gap-4 min-h-0">
                            <div className="flex-1 bg-black/60 rounded-2xl border border-white/5 p-6 relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <LucideChart className="w-4 h-4 text-accent" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Spectral Analyzer</span>
                                </div>
                                <div className="flex-1 min-h-0">
                                    {fft && <FFTChart frequencies={fft.frequencies} magnitudes={fft.magnitudes} />}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </MainLayout>
    );
};

export default VirtualLab;
