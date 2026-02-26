import { useState, useCallback } from 'react';
import {
    type SignalType,
    type SignalParams,
    DEFAULT_PARAMS,
    createDefaultMultiFaultConfig,
    generateTimeVector,
    generateSignal,
    applyMultiFault,
    computeStats,
} from '@/lib/signalEngine';
import { BUILTIN_SIGNALS } from '@/lib/realSignalEngine';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MainLayout from '@/components/MainLayout';

interface DatasetItem {
    id: string;
    type: string;
    fault: string;
    rms: number;
    peakToPeak: number;
    snr: number | null;
}

const DatasetLab = () => {
    const [dataset, setDataset] = useState<DatasetItem[]>([]);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const generateBulk = useCallback(async () => {
        setGenerating(true);
        setProgress(0);
        const newDataset: DatasetItem[] = [];
        const count = 50;

        for (let i = 0; i < count; i++) {
            const type = (['sine', 'square', 'triangle', 'noise'] as SignalType[])[i % 4];
            const params = { ...DEFAULT_PARAMS, amplitude: 0.5 + Math.random() };
            const t = generateTimeVector(params);
            const sig = generateSignal(type, params, t);

            const config = createDefaultMultiFaultConfig();
            // Randomly enable a fault
            const faultKeys = Object.keys(config);
            const randomFault = faultKeys[Math.floor(Math.random() * faultKeys.length)];
            (config as any)[randomFault].enabled = Math.random() > 0.5;
            (config as any)[randomFault].severity = Math.floor(Math.random() * 5) + 1;

            const faulted = applyMultiFault(sig, t, config);
            const stats = computeStats(faulted, sig);

            newDataset.push({
                id: `SIG_${i.toString().padStart(3, '0')}`,
                type: type,
                fault: (config as any)[randomFault].enabled ? randomFault : 'none',
                rms: stats.rms,
                peakToPeak: stats.peakToPeak,
                snr: stats.snr
            });

            if (i % 5 === 0) {
                setProgress((i / count) * 100);
                await new Promise(r => setTimeout(r, 10)); // Yield for UI
            }
        }

        setDataset(newDataset);
        setGenerating(false);
        setProgress(100);
    }, []);

    const exportCSV = () => {
        const header = 'ID,Type,Fault,RMS,PeakToPeak,SNR\n';
        const rows = dataset.map(d => `${d.id},${d.type},${d.fault},${d.rms.toFixed(4)},${d.peakToPeak.toFixed(4)},${d.snr?.toFixed(2) || 'N/A'}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signal_dataset.csv';
        a.click();
    };

    return (
        <MainLayout activeLab="datasets">
            <div className="h-full overflow-y-auto bg-black/5">
                <div className="p-6 max-w-5xl mx-auto space-y-6">
                    <div className="glass-panel p-8 text-center space-y-6 bg-black/20 border-white/10">
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold tracking-tight uppercase neon-text shadow-sm">Automated Dataset Generator</h2>
                            <p className="text-muted-foreground text-xs uppercase tracking-widest opacity-60 max-w-md mx-auto">
                                Bulk generate high-fidelity signals with randomized fault injection and automatic feature extraction.
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button
                                onClick={generateBulk}
                                disabled={generating}
                                className="bg-primary hover:bg-primary/80 text-black font-bold h-10 px-8 rounded-none transition-all uppercase tracking-widest"
                            >
                                {generating ? 'Processing...' : 'Execute Bulk Generation'}
                            </Button>
                            {dataset.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={exportCSV}
                                    className="h-10 border-primary/50 text-primary hover:bg-primary/10 rounded-none uppercase tracking-widest text-[10px]"
                                >
                                    Download CSV Package
                                </Button>
                            )}
                        </div>

                        {generating && (
                            <div className="space-y-2 max-w-sm mx-auto">
                                <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
                                    <span>Synthesis Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className="h-1 bg-white/5" />
                            </div>
                        )}
                    </div>

                    {dataset.length > 0 && (
                        <div className="glass-panel overflow-hidden bg-black/40 border-white/10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[10px]">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Sample ID</th>
                                            <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Base Type</th>
                                            <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Fault Injection</th>
                                            <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">RMS</th>
                                            <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">SNR (dB)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {dataset.map(item => (
                                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-3 text-primary font-bold">{item.id}</td>
                                                <td className="p-3 uppercase tracking-tighter">{item.type}</td>
                                                <td className="p-3 text-red-400 font-bold uppercase">{item.fault === 'none' ? 'CLEAN' : item.fault}</td>
                                                <td className="p-3 text-cyan-400">{item.rms.toFixed(5)}</td>
                                                <td className="p-3 text-muted-foreground">{item.snr?.toFixed(2) || '---'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6 pb-6">
                        <div className="glass-panel p-4 space-y-3 bg-black/20">
                            <div className="section-title uppercase tracking-[0.2em] text-[10px]">Built-in Signal Library</div>
                            <div className="space-y-2">
                                {Object.keys(BUILTIN_SIGNALS).map(name => (
                                    <div key={name} className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{name}</span>
                                        <button className="signal-button text-[9px] h-6 px-3">Import →</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-panel p-4 space-y-3 bg-black/20">
                            <div className="section-title uppercase tracking-[0.2em] text-[10px]">Synthesis Controls</div>
                            <p className="text-[9px] text-muted-foreground uppercase leading-relaxed tracking-wider">
                                Synthesize complex interference patterns by mixing fundamental signals with industrial noise or power line harmonics.
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 h-14 rounded bg-primary/5 border border-primary/20 flex items-center justify-center text-[9px] text-primary font-bold uppercase tracking-widest">Channel Alpha</div>
                                <div className="flex items-center text-muted-foreground font-bold">+</div>
                                <div className="flex-1 h-14 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Library Node</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default DatasetLab;
