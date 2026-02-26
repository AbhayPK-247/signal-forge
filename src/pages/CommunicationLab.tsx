import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    generateRandomBits,
    calculateBER,
    getConstellationPoints,
    getEyeDiagramSegments,
    type SignalParams,
    DEFAULT_PARAMS,
    generateTimeVector,
    generateSignal,
    applyMultiFault,
    createDefaultMultiFaultConfig
} from '@/lib/signalEngine';
import WaveformChart from '@/components/WaveformChart';
import ConstellationChart from '@/components/ConstellationChart';
import EyeDiagramChart from '@/components/EyeDiagramChart';
import SignalControls from '@/components/SignalControls';
import FaultControls from '@/components/FaultControls';
import MainLayout from '@/components/MainLayout';

const CommunicationLab = () => {
    const [modType, setModType] = useState<'ASK' | 'FSK' | 'PSK' | 'QPSK'>('PSK');
    const [params, setParams] = useState<SignalParams>({ ...DEFAULT_PARAMS, samplingRate: 2000, duration: 0.5 });
    const [faultConfig, setFaultConfig] = useState(createDefaultMultiFaultConfig());
    const [numBits, setNumBits] = useState(100);

    const [txBits, setTxBits] = useState<number[]>([]);
    const [rxBits, setRxBits] = useState<number[]>([]);
    const [time, setTime] = useState<number[]>([]);
    const [signal, setSignal] = useState<number[]>([]);
    const [noisySignal, setNoisySignal] = useState<number[]>([]);

    const generate = useCallback(() => {
        const bits = generateRandomBits(numBits);
        setTxBits(bits);

        // Simple modulation mock (using existing signal types as base)
        const t = generateTimeVector(params);
        const baseSig = generateSignal('sine', params, t);

        // Apply bit-based modulation (simplified logic)
        const samplesPerSymbol = Math.floor(t.length / bits.length);
        const modulated = baseSig.map((val, i) => {
            const bitIdx = Math.floor(i / samplesPerSymbol);
            const bit = bits[bitIdx] || 0;
            return bit === 1 ? val : (modType === 'FSK' ? val * 0.5 : 0);
        });

        const noisy = applyMultiFault(modulated, t, faultConfig);

        // Simple demodulation mock
        const demodulated = bits.map((_, bIdx) => {
            const start = bIdx * samplesPerSymbol;
            const avg = noisy.slice(start, start + samplesPerSymbol).reduce((a, b) => a + Math.abs(b), 0) / samplesPerSymbol;
            return avg > 0.3 ? 1 : 0;
        });

        setRxBits(demodulated);
        setTime(t);
        setSignal(modulated);
        setNoisySignal(noisy);
    }, [modType, params, faultConfig, numBits]);

    useEffect(() => {
        generate();
    }, [generate]);

    const ber = useMemo(() => calculateBER(txBits, rxBits), [txBits, rxBits]);
    const constellation = useMemo(() => {
        const sps = Math.floor(time.length / txBits.length);
        return getConstellationPoints(noisySignal, sps, modType);
    }, [noisySignal, time.length, txBits.length, modType]);

    const eye = useMemo(() => {
        const sps = Math.floor(time.length / txBits.length);
        return getEyeDiagramSegments(noisySignal, sps, 40);
    }, [noisySignal, time.length, txBits.length]);

    return (
        <MainLayout activeLab="communication">
            <div className="flex h-full">
                <aside className="w-[280px] shrink-0 border-r border-border/50 overflow-y-auto p-4 space-y-6 bg-black/10">
                    <div className="glass-panel p-3 space-y-3">
                        <div className="section-title">Modulation</div>
                        <div className="grid grid-cols-2 gap-2">
                            {(['ASK', 'FSK', 'PSK', 'QPSK'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setModType(m)}
                                    className={`signal-button text-[10px] h-8 ${modType === m ? 'signal-button-active' : ''}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SignalControls
                        signalType="sine"
                        params={params}
                        onSignalTypeChange={() => { }}
                        onParamsChange={setParams}
                        onGenerate={generate}
                        onReset={() => setParams(DEFAULT_PARAMS)}
                    />

                    <FaultControls config={faultConfig} onChange={setFaultConfig} />

                    <div className="glass-panel p-4 text-center border-primary/20 bg-primary/5">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Current BER</div>
                        <div className={`text-2xl font-bold font-mono ${ber > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                            {(ber * 100).toFixed(2)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Bit Error Rate Analysis</div>
                    </div>
                </aside>

                <main className="flex-1 grid grid-cols-2 grid-rows-2 p-4 gap-4 overflow-hidden bg-black/5">
                    <div className="col-span-2 bg-black/20 rounded-lg border border-border/30">
                        <WaveformChart
                            time={time}
                            original={signal}
                            faulted={noisySignal}
                            showOriginal={true}
                        />
                    </div>
                    <div className="bg-black/20 rounded-lg border border-border/30">
                        <ConstellationChart points={constellation} />
                    </div>
                    <div className="bg-black/20 rounded-lg border border-border/30">
                        <EyeDiagramChart segments={eye} />
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default CommunicationLab;
