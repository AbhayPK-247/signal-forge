import { useRef, useEffect, forwardRef } from 'react';

interface SpectrogramChartProps {
  times: number[];
  frequencies: number[];
  power: number[][];
  f1?: number;  // First formant frequency
  f2?: number;  // Second formant frequency
  sampleRate?: number;
  darkMode?: boolean; // toggle white/black background
}

// Forward ref to allow parent to access the underlying canvas (for export, etc.)
const SpectrogramChart = forwardRef<HTMLCanvasElement, SpectrogramChartProps>(
  ({ times, frequencies, power, f1, f2, sampleRate, darkMode = true }, ref) => {
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
      // draw background
      ctx.fillStyle = darkMode ? '#000' : '#fff';
      ctx.fillRect(0, 0, width, height);
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

      const cellW = (width - 40) / numTimes; // leave space for colorbar
      const cellH = height / numFreqs;

      // jet colormap utility
      const jetColor = (v: number) => {
        // expects v between 0 and 1
        const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - 3)));
        const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - 2)));
        const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - 1)));
        return `rgb(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)})`;
      };

      for (let t = 0; t < numTimes; t++) {
        for (let f = 0; f < numFreqs; f++) {
          const val = power[t][f] / maxPow;
          const logVal = Math.log10(1 + val * 9); // 0–1 log scale
          const color = jetColor(logVal);
          ctx.fillStyle = color;
          ctx.fillRect(
            t * cellW,
            height - (f + 1) * cellH,
            Math.ceil(cellW) + 1,
            Math.ceil(cellH) + 1
          );
        }
      }

      // draw colorbar on right
      const barX = width - 30;
      const barW = 20;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      const steps = 50;
      for (let i = 0; i <= steps; i++) {
        const v = i / steps;
        grad.addColorStop(1 - v, jetColor(v));
      }
      ctx.fillStyle = grad;
      ctx.fillRect(barX, 0, barW, height);
      // colorbar border
      ctx.strokeStyle = '#888';
      ctx.strokeRect(barX, 0, barW, height);
      // colorbar label
      ctx.save();
      ctx.translate(barX + barW + 5, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#8fa3b0';
      ctx.textAlign = 'center';
      ctx.font = '10px Helvetica, Arial, sans-serif';
      ctx.fillText('Power/Frequency (dB/Hz)', 0, 0);
      ctx.restore();

      // Axis lines (clean style)
      ctx.strokeStyle = '#8fa3b0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(width - 40, height);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, height);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#8fa3b0';
      ctx.font = '9px Helvetica, Arial, sans-serif';
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
        ctx.font = '10px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#ff6b6b';
        ctx.textAlign = 'right';
        ctx.fillText(`F1: ${f1.toFixed(0)}Hz`, width - 20, f1Y - 10);

        ctx.fillStyle = '#4dabf7';
        ctx.fillText(`F2: ${f2.toFixed(0)}Hz`, width - 20, f2Y + 15);
      }
    }, [times, frequencies, power, f1, f2, sampleRate, darkMode, canvasRef]);

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

