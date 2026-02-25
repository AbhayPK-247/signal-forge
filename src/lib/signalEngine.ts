// Signal Generation Engine
// Mathematically correct signal processing formulas

export type SignalType = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'impulse' | 'step' | 'noise';

export interface SignalParams {
  amplitude: number;
  frequency: number;
  phase: number;
  dcOffset: number;
  samplingRate: number;
  duration: number;
}

export const DEFAULT_PARAMS: SignalParams = {
  amplitude: 1,
  frequency: 5,
  phase: 0,
  dcOffset: 0,
  samplingRate: 1000,
  duration: 1,
};

export function generateTimeVector(params: SignalParams): number[] {
  const { samplingRate, duration } = params;
  const N = Math.floor(samplingRate * duration);
  const dt = 1 / samplingRate;
  return Array.from({ length: N }, (_, i) => i * dt);
}

export function generateSignal(type: SignalType, params: SignalParams, t: number[]): number[] {
  const { amplitude: A, frequency: f, phase: phi, dcOffset: DC } = params;

  switch (type) {
    case 'sine':
      return t.map(ti => A * Math.sin(2 * Math.PI * f * ti + phi) + DC);

    case 'square':
      return t.map(ti => A * Math.sign(Math.sin(2 * Math.PI * f * ti + phi)) + DC);

    case 'triangle':
      return t.map(ti => (2 * A / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * ti + phi)) + DC);

    case 'sawtooth': {
      const T = 1 / f;
      return t.map(ti => {
        const shifted = ti + phi / (2 * Math.PI * f);
        return 2 * A * (shifted / T - Math.floor(0.5 + shifted / T)) + DC;
      });
    }

    case 'impulse':
      return t.map((ti, i) => (i === 0 ? A : 0) + DC);

    case 'step':
      return t.map(() => A + DC);

    case 'noise':
      return t.map(() => {
        // Box-Muller transform for Gaussian noise
        const u1 = Math.random();
        const u2 = Math.random();
        return A * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) + DC;
      });

    default:
      return t.map(() => 0);
  }
}

// Fault Simulation
export type FaultType =
  | 'none'
  | 'ground_fault'
  | 'ground_loop'
  | 'floating_ground'
  | 'emi_rfi'
  | 'open_circuit'
  | 'short_circuit'
  | 'cable_attenuation'
  | 'impedance_mismatch'
  | 'noise_injection'
  | 'power_line'
  | 'signal_clipping'
  | 'signal_distortion'
  | 'sensor_offset'
  | 'sensor_drift'
  | 'sensor_saturation'
  | 'gain_error'
  | 'quantization_error'
  | 'aliasing'
  | 'timing_jitter'
  | 'sample_loss'
  | 'power_supply_ripple';

export interface FaultParams {
  magnitude: number; // general fault magnitude
  frequency: number; // fault frequency (for periodic faults)
}

export const DEFAULT_FAULT_PARAMS: FaultParams = {
  magnitude: 0.3,
  frequency: 50,
};

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function applyFault(
  signal: number[],
  t: number[],
  faultType: FaultType,
  fp: FaultParams
): number[] {
  const { magnitude: M, frequency: fFault } = fp;

  switch (faultType) {
    case 'none':
      return [...signal];

    case 'ground_fault':
      return signal.map(x => x + M);

    case 'ground_loop':
      return signal.map((x, i) => x + M * Math.sin(2 * Math.PI * fFault * t[i]));

    case 'floating_ground': {
      let drift = 0;
      return signal.map(x => {
        drift += gaussianRandom() * M * 0.01;
        return x + drift;
      });
    }

    case 'emi_rfi':
      return signal.map((x, i) => x + M * Math.sin(2 * Math.PI * fFault * t[i]));

    case 'open_circuit':
      return signal.map(x => (Math.random() < M * 0.3 ? 0 : x));

    case 'short_circuit':
      return signal.map(() => M);

    case 'cable_attenuation':
      return signal.map(x => (1 - M) * x);

    case 'impedance_mismatch': {
      const delay = Math.max(1, Math.floor(M * 10));
      return signal.map((x, i) => x + M * 0.5 * (signal[i - delay] ?? 0));
    }

    case 'noise_injection':
      return signal.map(x => x + M * gaussianRandom());

    case 'power_line':
      return signal.map((x, i) => x + M * Math.sin(2 * Math.PI * 50 * t[i]));

    case 'signal_clipping': {
      const vMax = M;
      const vMin = -M;
      return signal.map(x => Math.max(vMin, Math.min(vMax, x)));
    }

    case 'signal_distortion':
      return signal.map(x => x + M * x * x);

    case 'sensor_offset':
      return signal.map(x => x + M);

    case 'sensor_drift':
      return signal.map((x, i) => x + M * t[i]);

    case 'sensor_saturation': {
      const limit = Math.abs(M) || 1;
      return signal.map(x => Math.max(-limit, Math.min(limit, x)));
    }

    case 'gain_error':
      return signal.map(x => (1 + M) * x);

    case 'quantization_error': {
      const q = Math.abs(M) || 0.1;
      return signal.map(x => Math.round(x / q) * q);
    }

    case 'aliasing': {
      // Undersample then reconstruct
      const skip = Math.max(2, Math.floor(1 / (1 - M * 0.8)));
      return signal.map((_, i) => signal[Math.floor(i / skip) * skip] ?? signal[i]);
    }

    case 'timing_jitter':
      return signal.map((_, i) => {
        const jitter = Math.floor(gaussianRandom() * M * 5);
        const idx = Math.max(0, Math.min(signal.length - 1, i + jitter));
        return signal[idx];
      });

    case 'sample_loss':
      return signal.map(x => (Math.random() < M * 0.2 ? NaN : x));

    case 'power_supply_ripple':
      return signal.map((x, i) => x + M * Math.sin(2 * Math.PI * fFault * t[i]));

    default:
      return [...signal];
  }
}

// Statistics
export interface SignalStats {
  mean: number;
  variance: number;
  stdDev: number;
  rms: number;
  min: number;
  max: number;
  peakToPeak: number;
  snr: number | null;
  skewness: number;
  kurtosis: number;
}

export function computeStats(signal: number[], original?: number[]): SignalStats {
  const clean = signal.filter(x => !isNaN(x));
  const N = clean.length;
  if (N === 0) return { mean: 0, variance: 0, stdDev: 0, rms: 0, min: 0, max: 0, peakToPeak: 0, snr: null, skewness: 0, kurtosis: 0 };

  const mean = clean.reduce((a, b) => a + b, 0) / N;
  const variance = clean.reduce((a, x) => a + (x - mean) ** 2, 0) / N;
  const stdDev = Math.sqrt(variance);
  const rms = Math.sqrt(clean.reduce((a, x) => a + x * x, 0) / N);
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const peakToPeak = max - min;

  // Skewness & Kurtosis
  const m3 = clean.reduce((a, x) => a + ((x - mean) / stdDev) ** 3, 0) / N;
  const m4 = clean.reduce((a, x) => a + ((x - mean) / stdDev) ** 4, 0) / N;

  let snr: number | null = null;
  if (original) {
    const origClean = original.filter(x => !isNaN(x));
    const sigPower = origClean.reduce((a, x) => a + x * x, 0) / origClean.length;
    const noise = clean.map((x, i) => x - (origClean[i] ?? 0));
    const noisePower = noise.reduce((a, x) => a + x * x, 0) / noise.length;
    if (noisePower > 0) {
      snr = 10 * Math.log10(sigPower / noisePower);
    }
  }

  return { mean, variance, stdDev, rms, min, max, peakToPeak, snr, skewness: stdDev > 0 ? m3 : 0, kurtosis: stdDev > 0 ? m4 : 0 };
}

// Simple FFT (DFT for small sizes, or radix-2 approximation)
export function computeFFT(signal: number[], samplingRate: number): { frequencies: number[]; magnitudes: number[] } {
  const clean = signal.map(x => (isNaN(x) ? 0 : x));
  // Pad to next power of 2
  let N = 1;
  while (N < clean.length) N *= 2;
  const padded = [...clean, ...new Array(N - clean.length).fill(0)];

  // Simple DFT (limit to reasonable size)
  const halfN = Math.floor(N / 2);
  const magnitudes: number[] = [];
  const frequencies: number[] = [];

  for (let k = 0; k < halfN; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += padded[n] * Math.cos(angle);
      im -= padded[n] * Math.sin(angle);
    }
    magnitudes.push(Math.sqrt(re * re + im * im) / N);
    frequencies.push((k * samplingRate) / N);
  }

  return { frequencies, magnitudes };
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  sine: 'Sine Wave',
  square: 'Square Wave',
  triangle: 'Triangle Wave',
  sawtooth: 'Sawtooth Wave',
  impulse: 'Impulse',
  step: 'Step',
  noise: 'Gaussian Noise',
};

export const FAULT_LABELS: Record<FaultType, string> = {
  none: 'None',
  ground_fault: 'Ground Fault',
  ground_loop: 'Ground Loop',
  floating_ground: 'Floating Ground',
  emi_rfi: 'EMI / RFI',
  open_circuit: 'Open Circuit',
  short_circuit: 'Short Circuit',
  cable_attenuation: 'Cable Attenuation',
  impedance_mismatch: 'Impedance Mismatch',
  noise_injection: 'Noise Injection',
  power_line: 'Power Line (50Hz)',
  signal_clipping: 'Signal Clipping',
  signal_distortion: 'Signal Distortion',
  sensor_offset: 'Sensor Offset',
  sensor_drift: 'Sensor Drift',
  sensor_saturation: 'Sensor Saturation',
  gain_error: 'Gain Error',
  quantization_error: 'Quantization Error',
  aliasing: 'Aliasing',
  timing_jitter: 'Timing Jitter',
  sample_loss: 'Sample Loss',
  power_supply_ripple: 'Power Supply Ripple',
};
