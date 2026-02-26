import React from 'react';
import { type SweepParams, type SweepTypeBase } from '@/lib/signalEngine';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Square, FastForward } from 'lucide-react';

interface SweepControlsProps {
    params: SweepParams;
    onChange: (params: SweepParams) => void;
    onStart: () => void;
    onStop: () => void;
    isRunning: boolean;
    speed: number;
    onSpeedChange: (speed: number) => void;
}

const SweepControls = ({
    params,
    onChange,
    onStart,
    onStop,
    isRunning,
    speed,
    onSpeedChange
}: SweepControlsProps) => {
    const updateParams = (updates: Partial<SweepParams>) => {
        onChange({ ...params, ...updates });
    };

    return (
        <div className="space-y-6">
            <div className="glass-panel p-4 space-y-4">
                <div className="section-title">Execution</div>
                <div className="flex gap-2">
                    {!isRunning ? (
                        <Button onClick={onStart} className="flex-1 bg-primary hover:bg-primary/80 text-black font-bold h-10">
                            <Play className="w-4 h-4 mr-2 capitalize" /> Start Sweep
                        </Button>
                    ) : (
                        <Button onClick={onStop} variant="destructive" className="flex-1 h-10">
                            <Square className="w-4 h-4 mr-2" /> Stop
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sweep Speed ({speed}x)</label>
                    <div className="grid grid-cols-4 gap-1">
                        {[0.5, 1, 2, 5].map(s => (
                            <button
                                key={s}
                                onClick={() => onSpeedChange(s)}
                                className={`signal-button text-[9px] h-7 ${speed === s ? 'signal-button-active' : ''}`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 space-y-4">
                <div className="section-title">Frequency Sweep</div>

                <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Sweep Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['linear', 'logarithmic'] as SweepTypeBase[]).map(t => (
                            <button
                                key={t}
                                onClick={() => updateParams({ type: t })}
                                className={`signal-button text-[10px] h-8 ${params.type === t ? 'signal-button-active' : ''}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                            <span>Start: {params.fStart}Hz</span>
                        </div>
                        <Slider
                            value={[params.fStart]}
                            min={1} max={500} step={1}
                            onValueChange={([v]) => updateParams({ fStart: v })}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                            <span>Stop: {params.fStop}Hz</span>
                        </div>
                        <Slider
                            value={[params.fStop]}
                            min={1} max={500} step={1}
                            onValueChange={([v]) => updateParams({ fStop: v })}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                            <span>Time: {params.duration}s</span>
                        </div>
                        <Slider
                            value={[params.duration]}
                            min={0.5} max={10} step={0.5}
                            onValueChange={([v]) => updateParams({ duration: v })}
                        />
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 space-y-4">
                <div className="section-title">Amplitude & Phase</div>
                <div className="space-y-4 border-t border-white/5 pt-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                            <span>Amp: {params.aStart.toFixed(1)}V → {params.aStop.toFixed(1)}V</span>
                        </div>
                        <Slider
                            value={[params.aStart, params.aStop]}
                            min={0} max={2} step={0.1}
                            onValueChange={([s, e]) => updateParams({ aStart: s, aStop: e })}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                            <span>Phase: {Math.round(params.pStart * 180 / Math.PI)}° → {Math.round(params.pStop * 180 / Math.PI)}°</span>
                        </div>
                        <Slider
                            value={[params.pStart * 180 / Math.PI, params.pStop * 180 / Math.PI]}
                            min={0} max={360} step={15}
                            onValueChange={([s, e]) => updateParams({ pStart: s * Math.PI / 180, pStop: e * Math.PI / 180 })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SweepControls;
