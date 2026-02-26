import { type RecorderStatus } from '@/hooks/useRecorder';

interface RecordingControlsProps {
    status: RecorderStatus;
    duration: number;
    replaySpeed: number;
    onStart: () => Promise<void>;
    onStop: () => void;
    onClear: () => void;
    onReplay: (speed: number) => Promise<void>;
    onPause: () => void;
    onSpeedChange: (speed: number) => void;
    onSave: (format: 'wav' | 'csv') => void;
    onGenerateDataset: () => void;
}

const RecordingControls = ({
    status, duration, replaySpeed,
    onStart, onStop, onClear, onReplay, onPause, onSpeedChange, onSave, onGenerateDataset
}: RecordingControlsProps) => {
    return (
        <div className="glass-panel p-4 space-y-4 animate-fade-in text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="section-title text-primary">Recording Controls</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Duration</span>
                    <span className="text-sm font-mono text-primary">{duration.toFixed(1)}s</span>
                </div>
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
                {status !== 'recording' ? (
                    <button
                        onClick={onStart}
                        className="action-button bg-red-500/20 hover:bg-red-500/40 text-red-500 border-red-500/50 py-2.5"
                    >
                        <span className="mr-2">●</span> Start Record
                    </button>
                ) : (
                    <button
                        onClick={onStop}
                        className="action-button bg-white/10 hover:bg-white/20 text-white border-white/50 py-2.5 animate-pulse"
                    >
                        <span className="mr-2">■</span> Stop Record
                    </button>
                )}

                <button
                    onClick={onClear}
                    className="signal-button py-2.5"
                >
                    Clear
                </button>
            </div>

            {/* Replay Section */}
            <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Replay System</span>
                    <div className="flex gap-1">
                        {[0.5, 1, 2].map(s => (
                            <button
                                key={s}
                                onClick={() => onSpeedChange(s)}
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${replaySpeed === s ? 'bg-primary/20 border-primary text-primary' : 'border-white/10 hover:bg-white/5'}`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    {status === 'replaying' ? (
                        <button
                            onClick={onPause}
                            className="signal-button flex-1 py-1.5"
                        >
                            Pause
                        </button>
                    ) : (
                        <button
                            onClick={() => onReplay(replaySpeed)}
                            disabled={duration === 0 || status === 'recording'}
                            className="signal-button flex-1 py-1.5 disabled:opacity-30"
                        >
                            Replay
                        </button>
                    )}
                </div>
            </div>

            {/* Export Section */}
            <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Export & Data</span>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onSave('wav')}
                        disabled={duration === 0}
                        className="signal-button text-[10px] py-1.5 disabled:opacity-30"
                    >
                        Save WAV
                    </button>
                    <button
                        onClick={() => onSave('csv')}
                        disabled={duration === 0}
                        className="signal-button text-[10px] py-1.5 disabled:opacity-30"
                    >
                        Save CSV
                    </button>
                </div>
                <button
                    onClick={onGenerateDataset}
                    disabled={duration === 0}
                    className="action-button w-full text-[10px] py-2 mt-1 bg-accent/20 border-accent/50 text-accent hover:bg-accent/40 disabled:opacity-30"
                >
                    Generate Fault Dataset
                </button>
            </div>

            {status === 'recording' && (
                <div className="flex items-center gap-2 pt-2 justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest">Live Recording</span>
                </div>
            )}
        </div>
    );
};

export default RecordingControls;
