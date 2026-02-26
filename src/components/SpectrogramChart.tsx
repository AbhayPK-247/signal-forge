import { useRef, useEffect, forwardRef } from 'react';

interface SpectrogramChartProps {
  times: number[];
  frequencies: number[];
  power: number[][];
  f1?: number;  // First formant frequency
  f2?: number;  // Second formant frequency
  sampleRate?: number;
}

// Forward ref to allow parent to access the underlying canvas (for export, etc.)
const SpectrogramChart = forwardRef<HTMLCanvasElement, SpectrogramChartProps>(
  ({ times, frequencies, power, f1, f2, sampleRate }, ref) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || power.length === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);

      const numTimes = power.length;
      const numFreqs = power[0]?.length ?? 0;
      if (numFreqs === 0) return;

      // Normalize
      let maxPow = 0;
      for (const row of power) {
        for (const v of row) {
          if (v > maxPow) maxPow = v;
        }
      }
      if (maxPow === 0) maxPow = 1;

      const cellW = width / numTimes;
      const cellH = height / numFreqs;

      for (let t = 0; t < numTimes; t++) {
        for (let f = 0; f < numFreqs; f++) {
          const val = power[t][f] / maxPow;
          const logVal = Math.log10(1 + val * 9); // 0–1 log scale
          const h = 180 - logVal * 180;
          const s = 80 + logVal * 20;
          const l = 5 + logVal * 50;
          ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
          ctx.fillRect(
            t * cellW,
            height - (f + 1) * cellH,
            Math.ceil(cellW) + 1,
            Math.ceil(cellH) + 1
          );
        }
      }

      // Axis labels
      ctx.fillStyle = '#8fa3b0';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'center';

      // Time labels (bottom)
      const tStep = Math.max(1, Math.floor(numTimes / 5));
      for (let t = 0; t < numTimes; t += tStep) {
        ctx.fillText(times[t].toFixed(2) + 's', t * cellW + cellW / 2, height - 2);
      }

      // Freq labels (left)
      ctx.textAlign = 'left';
      const fStep = Math.max(1, Math.floor(numFreqs / 4));
      for (let f = 0; f < numFreqs; f += fStep) {
        ctx.fillText(frequencies[f].toFixed(0) + 'Hz', 2, height - f * cellH - cellH / 2 + 3);
      }

      // Draw formant markers
      if (f1 && f2 && sampleRate) {
        const maxFreq = frequencies[frequencies.length - 1] || sampleRate / 2;
        
        // F1 marker
        const f1Y = height * (1 - Math.min(f1, maxFreq) / maxFreq);
        ctx.strokeStyle = '#ff6b6b';
        ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width - 10, f1Y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // F2 marker
        const f2Y = height * (1 - Math.min(f2, maxFreq) / maxFreq);
        ctx.strokeStyle = '#4dabf7';
        ctx.fillStyle = 'rgba(77, 171, 247, 0.4)';
        ctx.beginPath();
        ctx.arc(width - 10, f2Y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Labels
        ctx.font = '10px JetBrains Mono';
        ctx.fillStyle = '#ff6b6b';
        ctx.textAlign = 'right';
        ctx.fillText(`F1: ${f1.toFixed(0)}Hz`, width - 20, f1Y - 10);

        ctx.fillStyle = '#4dabf7';
        ctx.fillText(`F2: ${f2.toFixed(0)}Hz`, width - 20, f2Y + 15);
      }
    }, [times, frequencies, power, f1, f2, sampleRate, canvasRef]);

    return (
      <div className="oscilloscope-display p-2 h-full flex flex-col">
        <div className="section-title mb-1 px-2">Spectrogram</div>
        <div className="flex-1 min-h-0">
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    );
  }
);

export default SpectrogramChart;

