import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    type SignalType,
    type SignalParams,
    DEFAULT_PARAMS,
    generateTimeVector,
    generateSignal,
    computeSTFT,
    computePSD
} from '@/lib/signalEngine';
import SignalControls from '@/components/SignalControls';
import SpectrogramChart from '@/components/SpectrogramChart';
import PSDChart from '@/components/PSDChart';
import MainLayout from '@/components/MainLayout';
import { Slider } from '@/components/ui/slider';

const SpectrumLab = () => {
    const [signalType, setSignalType] = useState<SignalType>('noise');
    const [params, setParams] = useState<SignalParams>({ ...DEFAULT_PARAMS, duration: 1.5 });
    const [stftConfig, setStftConfig] = useState({
        windowSize: 256,
        overlap: 128
    });

    const [time, setTime] = useState<number[]>([]);
    const [original, setOriginal] = useState<number[]>([]);

    const generate = useCallback(() => {
        const t = generateTimeVector(params);
        const sig = generateSignal(signalType, params, t);
        setTime(t);
        setOriginal(sig);
    }, [signalType, params]);

    useEffect(() => {
        generate();
    }, [generate]);

    const psd = useMemo(() => {
        if (original.length === 0) return null;
        return computePSD(original.slice(0, 2048), params.samplingRate);
    }, [original, params.samplingRate]);

    const stft = useMemo(() => {
        if (original.length === 0) return null;
        return computeSTFT(original, params.samplingRate, stftConfig.windowSize, stftConfig.overlap);
    }, [original, params.samplingRate, stftConfig]);

    return (
        <MainLayout activeLab="spectrum">
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
                        <div className="section-title">STFT Settings</div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Window Size: {stftConfig.windowSize}</span>
                                </div>
                                <Slider
                                    value={[stftConfig.windowSize]}
                                    min={64}
                                    max={1024}
                                    step={64}
                                    onValueChange={([v]) => setStftConfig({ ...stftConfig, windowSize: v })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Hop Size: {stftConfig.overlap}</span>
                                </div>
                                <Slider
                                    value={[stftConfig.overlap]}
                                    min={16}
                                    max={stftConfig.windowSize - 16}
                                    step={16}
                                    onValueChange={([v]) => setStftConfig({ ...stftConfig, overlap: v })}
                                />
                            </div>
                        </div>

                        <div className="text-[9px] text-muted-foreground italic bg-black/20 p-2 rounded border border-white/5">
                            Large window: Better frequency resolution.<br />
                            Small window: Better time resolution.
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-black/5">
                    <div className="flex-1 min-h-0 bg-black/20 rounded-lg border border-border/30 overflow-hidden">
                        {stft && (
                            <SpectrogramChart
                                times={stft.times}
                                frequencies={stft.frequencies}
                                power={stft.power}
                            />
                        )}
                    </div>
                    <div className="h-[250px] bg-black/20 rounded-lg border border-border/30">
                        {psd && <PSDChart frequencies={psd.frequencies} power={psd.power} />}
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default SpectrumLab;
