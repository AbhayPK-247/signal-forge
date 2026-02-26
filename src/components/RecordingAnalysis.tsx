import { computeWindowStats } from '@/lib/recordingEngine';

interface RecordingAnalysisProps {
    samples: Float32Array;
}

const Stat = ({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) => (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">{label}</span>
        <span className="text-xs font-mono text-primary">
            {typeof value === 'number' ? value.toFixed(4) : value}
            {unit && <small className="ml-0.5 opacity-50 text-[9px]">{unit}</small>}
        </span>
    </div>
);

const RecordingAnalysis = ({ samples }: RecordingAnalysisProps) => {
    const stats = computeWindowStats(samples);

    if (!stats) return null;

    return (
        <div className="glass-panel p-4 space-y-4 animate-fade-in text-slate-200">
            <h3 className="section-title text-primary border-b border-white/10 pb-2">Feature Extraction</h3>

            <div className="space-y-1">
                <Stat label="Mean Amplitude" value={stats.mean} unit="V" />
                <Stat label="RMS Value" value={stats.rms} unit="V" />
                <Stat label="Peak Voltage" value={stats.peak} unit="V" />
                <Stat label="Peak-to-Peak" value={stats.peakToPeak} unit="V" />
                <Stat label="Min Value" value={stats.min} unit="V" />
                <Stat label="Max Value" value={stats.max} unit="V" />
                <Stat label="Sample Count" value={stats.sampleCount} />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-md p-2 mt-4">
                <p className="text-[9px] text-primary/80 leading-relaxed font-mono">
                    <span className="font-bold">ANALYSIS NOTE:</span> High Peak-to-Peak values relative to RMS may indicate transient noise. Ensure recording level is below 1.0 (0dBFS) to avoid clipping.
                </p>
            </div>

            <div className="pt-2 border-t border-white/10">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-tight mb-2">DSP Context</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white/5 p-2 rounded">
                        <span className="block text-slate-400 mb-0.5 italic">Energy</span>
                        <span className="font-mono text-primary">{(stats.rms ** 2 * 1000).toFixed(1)} mJ</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded">
                        <span className="block text-slate-400 mb-0.5 italic">Crest Factor</span>
                        <span className="font-mono text-primary">{(stats.peak / stats.rms).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecordingAnalysis;
