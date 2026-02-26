import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    type SignalType,
    type SignalParams,
    type FilterParams,
    type FilterType,
    DEFAULT_PARAMS,
    generateTimeVector,
    generateSignal,
    applyFilter,
    computeFFT
} from '@/lib/signalEngine';
import WaveformChart from '@/components/WaveformChart';
import FFTChart from '@/components/FFTChart';
import SignalControls from '@/components/SignalControls';
import MainLayout from '@/components/MainLayout';
import { Slider } from '@/components/ui/slider';

const FilterLab = () => {
    const [signalType, setSignalType] = useState<SignalType>('noise');
    const [params, setParams] = useState<SignalParams>({ ...DEFAULT_PARAMS, amplitude: 0.5 });
    const [filterParams, setFilterParams] = useState<FilterParams>({
        type: 'lowpass',
        cutoff: 10,
        cutoffHigh: 50,
        order: 1,
        samplingRate: DEFAULT_PARAMS.samplingRate
    });

    const [time, setTime] = useState<number[]>([]);
    const [original, setOriginal] = useState<number[]>([]);
    const [filtered, setFiltered] = useState<number[]>([]);

    const generate = useCallback(() => {
        const t = generateTimeVector(params);
        const sig = generateSignal(signalType, params, t);
        const fSig = applyFilter(sig, { ...filterParams, samplingRate: params.samplingRate });
        setTime(t);
        setOriginal(sig);
        setFiltered(fSig);
    }, [signalType, params, filterParams]);

    useEffect(() => {
        generate();
    }, [generate]);

    const fftOrig = useMemo(() => {
        if (original.length === 0) return null;
        return computeFFT(original.slice(0, 1024), params.samplingRate);
    }, [original, params.samplingRate]);

    const fftFilt = useMemo(() => {
        if (filtered.length === 0) return null;
        return computeFFT(filtered.slice(0, 1024), params.samplingRate);
    }, [filtered, params.samplingRate]);

    return (
        <MainLayout activeLab="filters">
            <div className="flex h-full">
                <aside className="w-[280px] shrink-0 border-r border-border/50 overflow-y-auto p-4 space-y-6 bg-black/10">
                    <SignalControls
                        signalType={signalType}
                        params={params}
                        onSignalTypeChange={setSignalType}
                        onParamsChange={setParams}
                        onGenerate={generate}
                        onReset={() => setParams(DEFAULT_PARAMS)}
                    />

                    <div className="glass-panel p-4 space-y-4">
                        <div className="section-title">Filter Config</div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold">Filter Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['lowpass', 'highpass', 'bandpass', 'bandstop'] as FilterType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterParams({ ...filterParams, type: t })}
                                        className={`signal-button text-[10px] h-8 ${filterParams.type === t ? 'signal-button-active' : ''}`}
                                    >
                                        {t.replace('pass', ' Pass').replace('stop', ' Stop')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Cutoff (f1): {filterParams.cutoff}Hz</span>
                                </div>
                                <Slider
                                    value={[filterParams.cutoff]}
                                    min={1}
                                    max={200}
                                    step={1}
                                    onValueChange={([v]) => setFilterParams({ ...filterParams, cutoff: v })}
                                />
                            </div>

                            {(filterParams.type === 'bandpass' || filterParams.type === 'bandstop') && (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Cutoff (f2): {filterParams.cutoffHigh}Hz</span>
                                    </div>
                                    <Slider
                                        value={[filterParams.cutoffHigh || 50]}
                                        min={filterParams.cutoff + 1}
                                        max={400}
                                        step={1}
                                        onValueChange={([v]) => setFilterParams({ ...filterParams, cutoffHigh: v })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-black/5">
                    <div className="flex-1 min-h-0 bg-black/20 rounded-lg border border-border/30">
                        <WaveformChart
                            time={time}
                            original={original}
                            faulted={filtered}
                            showOriginal={true}
                        />
                    </div>
                    <div className="h-[300px] flex gap-4">
                        <div className="flex-1 glass-panel p-2">
                            <div className="text-[10px] font-bold text-muted-foreground mb-2 px-2 uppercase tracking-widest">Original Spectrum</div>
                            {fftOrig && <FFTChart frequencies={fftOrig.frequencies} magnitudes={fftOrig.magnitudes} />}
                        </div>
                        <div className="flex-1 glass-panel p-2">
                            <div className="text-[10px] font-bold text-muted-foreground mb-2 px-2 uppercase tracking-widest">Filtered Spectrum</div>
                            {fftFilt && <FFTChart frequencies={fftFilt.frequencies} magnitudes={fftFilt.magnitudes} />}
                        </div>
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default FilterLab;
