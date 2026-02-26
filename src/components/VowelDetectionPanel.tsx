import { memo } from 'react';
import type { VowelResult } from '@/lib/vowelEngine';

interface VowelDetectionPanelProps {
  result: VowelResult | null;
  vowelHistory: string[];
}

const VOWEL_COLORS: Record<string, string> = {
  A: 'hsl(0, 100%, 60%)',    // Red
  E: 'hsl(40, 100%, 60%)',   // Orange
  I: 'hsl(120, 100%, 60%)',  // Green
  O: 'hsl(200, 100%, 60%)',  // Cyan
  U: 'hsl(280, 100%, 60%)',  // Magenta
};

const VowelDetectionPanel = memo(({ result, vowelHistory }: VowelDetectionPanelProps) => {
  const vowel = result?.vowel;
  const confidence = result?.confidence ?? 0;
  const { f1, f2 } = result?.formants ?? { f1: 0, f2: 0 };

  const color = vowel ? VOWEL_COLORS[vowel] : '#666';
  const glowColor = vowel ? `${color}80` : 'transparent';

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="section-title">Vowel Detection</div>

      {/* Large vowel display */}
      <div className="flex items-center gap-4">
        <div
          className="w-24 h-24 rounded-lg flex items-center justify-center font-display font-black text-4xl transition-all duration-100"
          style={{
            background: glowColor,
            color: color,
            boxShadow: vowel ? `0 0 20px ${color}` : 'none',
            border: vowel ? `2px solid ${color}` : '2px solid #666',
          }}
        >
          {vowel ?? '—'}
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <span className="label-text">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="label-text">F1</span>
              <div className="font-mono text-primary">{f1.toFixed(0)} Hz</div>
            </div>
            <div>
              <span className="label-text">F2</span>
              <div className="font-mono text-primary">{f2.toFixed(0)} Hz</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vowel history */}
      {vowelHistory.length > 0 && (
        <div className="pt-2 border-t border-border/30">
          <span className="label-text block mb-1">History</span>
          <div className="flex gap-1 flex-wrap">
            {vowelHistory.map((v, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: VOWEL_COLORS[v],
                  opacity: 0.3 + (i / vowelHistory.length) * 0.7, // Fade older entries
                  color: VOWEL_COLORS[v],
                }}
              >
                {v}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {!vowel && (
        <div className="text-[10px] text-muted-foreground text-center py-2">
          Waiting for clear vowel detection...
        </div>
      )}
    </div>
  );
});

VowelDetectionPanel.displayName = 'VowelDetectionPanel';

export default VowelDetectionPanel;
