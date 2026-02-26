import { useRef } from 'react';
import type { ParsedSignal, IdealType, IdealParams } from '@/lib/realSignalEngine';
import type { MultiFaultConfig } from '@/lib/signalEngine';
import FaultControls from '@/components/FaultControls';

export type SignalSource = 'microphone' | 'file' | 'comparison';

export interface RealSignalControlsProps {
    source: SignalSource;
    micStatus: 'idle' | 'requesting' | 'live' | 'error' | 'stopped';
    micError: string | null;
    parsedFile: ParsedSignal | null;
    fftSize: number;
    idealParams: IdealParams;
    faultConfig: MultiFaultConfig;
    showFaulted: boolean;
    onSourceChange: (s: SignalSource) => void;
    onMicStart: () => void;
    onMicStop: () => void;
    onFileLoaded: (signal: ParsedSignal) => void;
    onFftSizeChange: (n: number) => void;
    onIdealParamsChange: (p: IdealParams) => void;
    onFaultChange: (c: MultiFaultConfig) => void;
    onShowFaultedToggle: (v: boolean) => void;
    onSave: (format: 'wav' | 'csv') => void;
    onClear: () => void;
    onModulate: () => void;
    onPlay: (faulted: boolean) => void;
    onStopAudio: () => void;
    isPlaying: boolean;
    hasSignal: boolean;
}

const FFT_SIZES = [512, 1024, 2048, 4096] as const;

const IDEAL_TYPES: IdealType[] = ['sine', 'square', 'triangle', 'sawtooth'];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
        <label className="label-text w-16 shrink-0">{label}</label>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);

const NumIn = ({
    value, onChange, step = 1, min, max,
}: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) => (
    <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="control-input w-full"
    />
);

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        idle: 'text-muted-foreground',
        requesting: 'text-yellow-400 animate-pulse',
        live: 'text-primary animate-pulse',
        error: 'text-destructive',
        stopped: 'text-muted-foreground',
    };
    return (
        <span className={`text-[10px] font-mono uppercase tracking-wider ${colors[status] ?? 'text-muted-foreground'}`}>
            ● {status}
        </span>
    );
};

const RealSignalControls = ({
    source, micStatus, micError, parsedFile, fftSize,
    idealParams, faultConfig, showFaulted,
    onSourceChange, onMicStart, onMicStop, onFileLoaded,
    onFftSizeChange, onIdealParamsChange, onFaultChange,
    onShowFaultedToggle, onSave, onClear, onModulate,
    onPlay, onStopAudio, isPlaying, hasSignal,
}: RealSignalControlsProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { parseTextSignal, parseWAV } = await import('@/lib/realSignalEngine');
            if (file.name.toLowerCase().endsWith('.wav')) {
                const buf = await file.arrayBuffer();
                const parsed = await parseWAV(buf, file.name);
                onFileLoaded(parsed);
            } else {
                const text = await file.text();
                const parsed = parseTextSignal(text, file.name);
                onFileLoaded(parsed);
            }
        } catch (err) {
            alert(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        // Reset so same file can be re-loaded
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
    };

    const updateIdeal = (key: keyof IdealParams, value: unknown) =>
        onIdealParamsChange({ ...idealParams, [key]: value });

    return (
        <div className="glass-panel p-3 space-y-3 animate-fade-in">
            {/* Source Selector */}
            <div className="section-title">Signal Source</div>
            <select
                value={source}
                onChange={e => onSourceChange(e.target.value as SignalSource)}
                className="control-input w-full text-xs"
            >
                <option value="microphone">🎤 Microphone Input</option>
                <option value="file">📁 File Upload (CSV / TXT / WAV)</option>
                <option value="comparison">📊 Comparison Mode</option>
            </select>

            {/* ── Microphone Panel ── */}
            {source === 'microphone' && (
                <div className="space-y-2">
                    <div className="section-title pt-1">Microphone</div>
                    <div className="flex items-center justify-between">
                        <StatusBadge status={micStatus} />
                    </div>
                    {micError && (
                        <p className="text-[10px] text-destructive font-mono break-words">{micError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            onClick={onMicStart}
                            disabled={micStatus === 'live' || micStatus === 'requesting'}
                            className="action-button text-[10px] disabled:opacity-40"
                        >
                            {micStatus === 'requesting' ? 'Connecting…' : '▶ Start'}
                        </button>
                        <button
                            onClick={onMicStop}
                            disabled={micStatus !== 'live'}
                            className="signal-button text-[10px] disabled:opacity-40"
                        >
                            ■ Stop
                        </button>
                    </div>
                    <div className="space-y-1">
                        <span className="label-text">FFT Buffer Size</span>
                        <div className="grid grid-cols-4 gap-1">
                            {FFT_SIZES.map(n => (
                                <button
                                    key={n}
                                    onClick={() => onFftSizeChange(n)}
                                    className={`signal-button text-[9px] ${fftSize === n ? 'signal-button-active' : ''}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── File Upload Panel ── */}
            {source === 'file' && (
                <div className="space-y-2">
                    <div className="section-title pt-1">File Upload</div>
                    <div
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-4 text-center cursor-pointer transition-colors"
                    >
                        <p className="text-[10px] text-muted-foreground">
                            Drop CSV / TXT / WAV here<br />or click to browse
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.wav"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {parsedFile && (
                        <div className="glass-panel p-2 space-y-1">
                            <p className="text-[10px] text-primary truncate font-mono">{parsedFile.label}</p>
                            <p className="text-[9px] text-muted-foreground">{parsedFile.signal.length.toLocaleString()} samples · {parsedFile.sampleRate} Hz</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Comparison Panel ── */}
            {source === 'comparison' && (
                <div className="space-y-2">
                    <div className="section-title pt-1">Real Signal (Compare)</div>
                    <div
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-3 text-center cursor-pointer transition-colors"
                    >
                        <p className="text-[10px] text-muted-foreground">Drop / click to load real signal</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.wav"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {parsedFile && (
                        <p className="text-[10px] text-primary font-mono truncate">{parsedFile.label} ({parsedFile.signal.length.toLocaleString()} samp)</p>
                    )}

                    <div className="section-title pt-1">Ideal Signal</div>
                    <div className="grid grid-cols-4 gap-1">
                        {IDEAL_TYPES.map(t => (
                            <button
                                key={t}
                                onClick={() => updateIdeal('type', t)}
                                className={`signal-button text-[9px] ${idealParams.type === t ? 'signal-button-active' : ''}`}
                            >
                                {t.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-1.5">
                        <Row label="Amp (V)"><NumIn value={idealParams.amplitude} onChange={v => updateIdeal('amplitude', v)} step={0.1} min={0} /></Row>
                        <Row label="Freq(Hz)"><NumIn value={idealParams.frequency} onChange={v => updateIdeal('frequency', v)} step={10} min={1} /></Row>
                        <Row label="Fs (S/s)"><NumIn value={idealParams.sampleRate} onChange={v => updateIdeal('sampleRate', v)} step={1000} min={100} /></Row>
                        <Row label="Dur (s)"><NumIn value={idealParams.duration} onChange={v => updateIdeal('duration', v)} step={0.1} min={0.01} /></Row>
                    </div>
                </div>
            )}

            {/* Fault Injection on real signal */}
            {(source === 'file' || source === 'comparison') && parsedFile && (
                <>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={showFaulted}
                            onChange={e => onShowFaultedToggle(e.target.checked)}
                            className="accent-primary w-3 h-3"
                        />
                        <span className="label-text">Show Faulted Overlay</span>
                    </label>
                    {showFaulted && <FaultControls config={faultConfig} onChange={onFaultChange} />}
                </>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1 border-t border-border/30 mt-2">
                {hasSignal && (
                    <div className="grid grid-cols-2 gap-2">
                        {isPlaying ? (
                            <button
                                onClick={onStopAudio}
                                className="signal-button text-[10px] bg-red-500/10 border-red-500/30 text-red-500"
                            >
                                ⏹ Stop Audio
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => onPlay(false)}
                                    className="signal-button text-[10px] bg-primary/10 border-primary/30"
                                >
                                    ▶ Play Original
                                </button>
                                {showFaulted && (
                                    <button
                                        onClick={() => onPlay(true)}
                                        className="signal-button text-[10px] bg-accent/10 border-accent/30 text-accent font-bold"
                                    >
                                        🔊 Play Faulted
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
                <div className="flex gap-2">
                    <button onClick={() => onSave('csv')} className="signal-button flex-1 text-[10px]">Export CSV</button>
                    <button onClick={onClear} className="signal-button flex-1 text-[10px]">Clear</button>
                </div>
                <button
                    onClick={onModulate}
                    disabled={!hasSignal}
                    className="action-button w-full text-[10px] py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}
                >
                    Modulate this Signal →
                </button>
            </div>
        </div>
    );
};

export default RealSignalControls;
