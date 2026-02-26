import { useEffect, useRef } from 'react';

interface FormantOverlayProps {
  canvas: HTMLCanvasElement | null;
  f1: number;
  f2: number;
  sampleRate: number;
  frequencies: number[];
  times: number[];
}

/**
 * Draws formant markers on a canvas overlay above the spectrogram.
 */
export function drawFormantOverlay({
  canvas,
  f1,
  f2,
  sampleRate,
  frequencies,
  times,
}: FormantOverlayProps) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Don't draw if formants are zero
  if (f1 === 0 && f2 === 0) return;

  // Find max frequency in display
  const maxFreq = frequencies[frequencies.length - 1] || sampleRate / 2;

  // Calculate pixel positions
  const timeIdx = times.length - 1; // rightmost time
  const f1Freq = Math.min(f1, maxFreq);
  const f2Freq = Math.min(f2, maxFreq);

  const f1Y = height * (1 - f1Freq / maxFreq);
  const f2Y = height * (1 - f2Freq / maxFreq);
  const xPos = width; // rightmost edge

  // Draw F1 marker
  ctx.strokeStyle = '#ff6b6b';
  ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(xPos - 8, f1Y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw F2 marker
  ctx.strokeStyle = '#4dabf7';
  ctx.fillStyle = 'rgba(77, 171, 247, 0.3)';
  ctx.beginPath();
  ctx.arc(xPos - 8, f2Y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw labels
  ctx.font = '10px JetBrains Mono';
  ctx.fillStyle = '#ff6b6b';
  ctx.textAlign = 'right';
  ctx.fillText(`F1: ${f1.toFixed(0)}Hz`, xPos - 20, f1Y - 10);

  ctx.fillStyle = '#4dabf7';
  ctx.fillText(`F2: ${f2.toFixed(0)}Hz`, xPos - 20, f2Y + 15);
}
