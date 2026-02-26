import React from 'react';

interface CursorData {
    time: number;
    amplitude: number;
}

interface OscilloscopeCursorsProps {
    cursor1: CursorData | null;
    cursor2: CursorData | null;
}

const OscilloscopeCursors = ({ cursor1, cursor2 }: OscilloscopeCursorsProps) => {
    if (!cursor1 && !cursor2) return null;

    const deltaT = cursor1 && cursor2 ? Math.abs(cursor2.time - cursor1.time) : null;
    const deltaV = cursor1 && cursor2 ? Math.abs(cursor2.amplitude - cursor1.amplitude) : null;
    const freq = deltaT && deltaT > 0 ? 1 / deltaT : null;

    return (
        <div className="bg-black/40 border border-primary/20 rounded p-2 text-[10px] font-mono space-y-1 backdrop-blur-sm">
            <div className="text-primary/70 border-b border-primary/10 pb-1 mb-1 font-bold uppercase tracking-tight">Measurements</div>

            {cursor1 && (
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">C1:</span>
                    <span className="text-primary">{cursor1.time.toFixed(4)}s | {cursor1.amplitude.toFixed(3)}V</span>
                </div>
            )}

            {cursor2 && (
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">C2:</span>
                    <span className="text-cyan-400">{cursor2.time.toFixed(4)}s | {cursor2.amplitude.toFixed(3)}V</span>
                </div>
            )}

            {deltaT !== null && (
                <div className="border-t border-primary/10 pt-1 mt-1 space-y-0.5">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Δt:</span>
                        <span className="text-amber-400">{deltaT.toFixed(5)}s</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ΔV:</span>
                        <span className="text-amber-400">{deltaV?.toFixed(3)}V</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span className="text-muted-foreground">Freq:</span>
                        <span className="text-green-400">{freq?.toFixed(2)} Hz</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OscilloscopeCursors;
