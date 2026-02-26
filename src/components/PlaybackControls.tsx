import React from 'react';
import { Play, Pause, Square, FastForward, Rewind } from 'lucide-react';
import { Button } from './ui/button';

interface PlaybackControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    onStop: () => void;
    speed: number;
    onSpeedChange: (speed: number) => void;
}

const PlaybackControls = ({ isPlaying, onTogglePlay, onStop, speed, onSpeedChange }: PlaybackControlsProps) => {
    return (
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 backdrop-blur-sm self-center">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-white"
                onClick={onStop}
            >
                <Square className="h-3.5 w-3.5 fill-current" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${isPlaying ? 'text-primary' : 'text-primary/70'} hover:text-primary hover:bg-primary/10`}
                onClick={onTogglePlay}
            >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </Button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <div className="flex gap-1">
                {[0.5, 1, 2].map(s => (
                    <button
                        key={s}
                        onClick={() => onSpeedChange(s)}
                        className={`
              px-2 py-1 rounded text-[9px] font-mono font-bold transition-colors
              ${speed === s ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-white'}
            `}
                    >
                        {s}x
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PlaybackControls;
