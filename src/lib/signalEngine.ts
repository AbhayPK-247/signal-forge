// Signal Generation Engine
// Mathematically correct signal processing formulas

export type SignalType = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'impulse' | 'step' | 'noise' | 'harmonics';

export interface SignalParams {
  amplitude: number;
  frequency: number;
  phase: number;
  dcOffset: number;
  samplingRate: number;
  duration: number;
  harmonics?: number[]; // Harmonic amplitudes
}

export type SweepTypeBase = 'linear' | 'logarithmic';

export interface SweepParams {
  enabled: boolean;
  type: SweepTypeBase;
  fStart: number;
  fStop: number;
  aStart: number;
  aStop: number;
  pStart: number;
  pStop: number;
  duration: number;
}

export interface HarmonicParams {
  fundamentalFreq: number;
  amplitudes: number[]; // Index 0 is fundamental, 1 is 2nd harmonic, etc.
  phases: number[];
}

/** 
 * Transfer Function H(s) = Num(s) / Den(s)
 * Coefficients in descending order of s: [b_n, ..., b_0] / [a_n, ..., a_0]
 */
export interface TransferFunction {
  num: number[];
  den: number[];
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'bandstop';

export interface FilterParams {
  type: FilterType;
  cutoff: number; // Hz
  cutoffHigh?: number; // For BPF/BSF
  order: number;
  samplingRate: number;
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

    case 'harmonics': {
      return generateHarmonicSignal({
        fundamentalFreq: f,
        amplitudes: [A, ...(params.harmonics || [])],
        phases: [phi],
      }, t, DC);
    }

    default:
      return t.map(() => 0);
  }
}

export function generateHarmonicSignal(
  params: HarmonicParams,
  t: number[],
  dcOffset: number = 0
): number[] {
  return t.map(ti => {
    let value = dcOffset;
    params.amplitudes.forEach((amp, i) => {
      const freq = params.fundamentalFreq * (i + 1);
      const phase = params.phases[i] || 0;
      value += amp * Math.sin(2 * Math.PI * freq * ti + phase);
    });
    return value;
  });
}

export function mixSignals(sigA: number[], sigB: number[], ratio: number = 0.5): number[] {
  const len = Math.max(sigA.length, sigB.length);
  const mixed: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    const valA = sigA[i] || 0;
    const valB = sigB[i] || 0;
    mixed[i] = valA * (1 - ratio) + valB * ratio;
  }
  return mixed;
}

export function generateSweepSignal(params: SweepParams, t: number[]): { signal: number[], instFreq: number[] } {
  const { fStart, fStop, aStart, aStop, pStart, pStop, duration: Ts, type } = params;
  const signal: number[] = new Array(t.length);
  const instFreq: number[] = new Array(t.length);

  if (type === 'linear') {
    const kf = (fStop - fStart) / Ts;
    const ka = (aStop - aStart) / Ts;
    const kp = (pStop - pStart) / Ts;

    for (let i = 0; i < t.length; i++) {
      const ti = t[i];
      const f_t = fStart + kf * ti;
      const a_t = aStart + ka * ti;
      const p_t = pStart + kp * ti;

      instFreq[i] = f_t;
      // Phase is integral of freq: phi(t) = 2pi * (fStart*t + 0.5*kf*t^2)
      const phase = 2 * Math.PI * (fStart * ti + 0.5 * kf * ti * ti) + p_t;
      signal[i] = a_t * Math.sin(phase);
    }
  } else {
    // Logarithmic Freq Sweep
    const r = fStop / fStart;
    const ka = (aStop - aStart) / Ts;
    const kp = (pStop - pStart) / Ts;

    if (Math.abs(fStart - fStop) < 0.001 || r <= 1.0) {
      // Degenerate to linear if frequencies are too close
      const kf = (fStop - fStart) / Ts;
      for (let i = 0; i < t.length; i++) {
        const ti = t[i];
        const f_t = fStart + kf * ti;
        const a_t = aStart + ka * ti;
        const p_t = pStart + kp * ti;
        instFreq[i] = f_t;
        const phase = 2 * Math.PI * (fStart * ti + 0.5 * kf * ti * ti) + p_t;
        signal[i] = a_t * Math.sin(phase);
      }
    } else {
      const lnR = Math.log(r);
      for (let i = 0; i < t.length; i++) {
        const ti = t[i];
        const f_t = fStart * Math.pow(r, ti / Ts);
        const a_t = aStart + ka * ti;
        const p_t = pStart + kp * ti;
        instFreq[i] = f_t;
        // Phase integral: 2pi * fStart * Ts / ln(r) * (r^(t/Ts) - 1)
        const phase = 2 * Math.PI * fStart * (Ts / lnR) * (Math.pow(r, ti / Ts) - 1) + p_t;
        signal[i] = a_t * Math.sin(phase);
      }
    }
  }

  return { signal, instFreq };
}

export function generateChirpSignal(
  fStart: number,
  fStop: number,
  duration: number,
  amplitude: number,
  t: number[]
): number[] {
  const k = (fStop - fStart) / duration;
  return t.map(ti => amplitude * Math.sin(2 * Math.PI * (fStart * ti + (k / 2) * ti * ti)));
}

// Digital Filter Implementation (Simple IIR approach)
export function applyFilter(signal: number[], params: FilterParams): number[] {
  const { type, cutoff, cutoffHigh, order, samplingRate } = params;
  const dt = 1 / samplingRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = dt / (rc + dt);

  const result = new Array(signal.length).fill(0);

  if (type === 'lowpass') {
    let yPrev = signal[0] || 0;
    for (let i = 0; i < signal.length; i++) {
      const x = signal[i] || 0;
      const y = alpha * x + (1 - alpha) * yPrev;
      result[i] = y;
      yPrev = y;
    }
  } else if (type === 'highpass') {
    let yPrev = 0;
    let xPrev = signal[0] || 0;
    for (let i = 0; i < signal.length; i++) {
      const x = signal[i] || 0;
      const y = (1 - alpha) * (yPrev + x - xPrev);
      result[i] = y;
      yPrev = y;
      xPrev = x;
    }
  } else if (type === 'bandpass' || type === 'bandstop') {
    // Basic approximation: Chain LPF and HPF for BPF
    // For BSF: Original - BPF
    const low = applyFilter(signal, { ...params, type: 'lowpass', cutoff: cutoffHigh || cutoff * 2 });
    const band = applyFilter(low, { ...params, type: 'highpass', cutoff: cutoff });

    if (type === 'bandpass') return band;
    return signal.map((x, i) => x - (band[i] || 0));
  }

  return result;
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
  harmonics: 'Harmonic Gen',
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

// ─── Multi-Fault Configuration ────────────────────────────────────────

export type FaultTypeKey = Exclude<FaultType, 'none'>;

export interface FaultConfig {
  enabled: boolean;
  severity: number; // 0–5
  frequency: number;
}

export type MultiFaultConfig = Record<FaultTypeKey, FaultConfig>;

export const SEVERITY_LABELS = ['Off', 'Very Low', 'Low', 'Medium', 'High', 'Severe'];

export const FAULT_TYPE_KEYS: FaultTypeKey[] = [
  'ground_fault', 'ground_loop', 'floating_ground', 'emi_rfi',
  'open_circuit', 'short_circuit', 'cable_attenuation', 'impedance_mismatch',
  'noise_injection', 'power_line', 'signal_clipping', 'signal_distortion',
  'sensor_offset', 'sensor_drift', 'sensor_saturation', 'gain_error',
  'quantization_error', 'aliasing', 'timing_jitter', 'sample_loss',
  'power_supply_ripple',
];

/** Faults that use a configurable frequency parameter */
export const PERIODIC_FAULTS: Set<FaultTypeKey> = new Set([
  'ground_loop', 'emi_rfi', 'power_supply_ripple',
]);

export function createDefaultMultiFaultConfig(): MultiFaultConfig {
  const config = {} as MultiFaultConfig;
  for (const key of FAULT_TYPE_KEYS) {
    config[key] = { enabled: false, severity: 3, frequency: 50 };
  }
  return config;
}

export function applyMultiFault(signal: number[], t: number[], config: MultiFaultConfig): number[] {
  let result = [...signal];
  for (const [type, cfg] of Object.entries(config) as [FaultTypeKey, FaultConfig][]) {
    if (cfg.enabled && cfg.severity > 0) {
      const magnitude = cfg.severity * 0.4; // severity 5 → magnitude 2.0
      result = applyFault(result, t, type, { magnitude, frequency: cfg.frequency });
    }
  }
  return result;
}

export function hasActiveFaults(config: MultiFaultConfig): boolean {
  return Object.values(config).some(c => c.enabled && c.severity > 0);
}

// ─── Power Spectral Density ───────────────────────────────────────────

export function computePSD(signal: number[], samplingRate: number) {
  const fftResult = computeFFT(signal, samplingRate);
  return {
    frequencies: fftResult.frequencies,
    power: fftResult.magnitudes.map(m => m * m),
  };
}

// ─── Short-Time Fourier Transform (Spectrogram) ──────────────────────

export function computeSTFT(
  signal: number[],
  samplingRate: number,
  windowSize = 256,
  hopSize = 128
): { times: number[]; frequencies: number[]; power: number[][] } {
  const clean = signal.map(x => (isNaN(x) ? 0 : x));
  const maxWindows = 80;
  const numWindows = Math.min(maxWindows, Math.max(0, Math.floor((clean.length - windowSize) / hopSize) + 1));
  if (numWindows <= 0) return { times: [], frequencies: [], power: [] };

  const freqBins = Math.floor(windowSize / 2);
  const times: number[] = [];
  const frequencies: number[] = Array.from({ length: freqBins }, (_, k) => (k * samplingRate) / windowSize);
  const power: number[][] = [];

  for (let w = 0; w < numWindows; w++) {
    const start = w * hopSize;
    times.push(start / samplingRate);
    const seg = clean.slice(start, start + windowSize);
    // Hann window
    const windowed = seg.map((x, n) => x * 0.5 * (1 - Math.cos((2 * Math.PI * n) / (windowSize - 1))));

    const mags: number[] = [];
    for (let k = 0; k < freqBins; k++) {
      let re = 0,
        im = 0;
      for (let n = 0; n < windowSize; n++) {
        const angle = (2 * Math.PI * k * n) / windowSize;
        re += windowed[n] * Math.cos(angle);
        im -= windowed[n] * Math.sin(angle);
      }
      mags.push((re * re + im * im) / (windowSize * windowSize));
    }
    power.push(mags);
  }

  return { times, frequencies, power };
}

// ─── Windowed Statistics (Feature Trends) ─────────────────────────────

export interface WindowedStat {
  time: number;
  mean: number;
  rms: number;
  variance: number;
}

export function computeWindowedStats(signal: number[], t: number[], windowSize: number): WindowedStat[] {
  const results: WindowedStat[] = [];
  for (let i = 0; i + windowSize <= signal.length; i += windowSize) {
    const win = signal.slice(i, i + windowSize).filter(x => !isNaN(x));
    if (win.length === 0) continue;
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const variance = win.reduce((a, x) => a + (x - mean) ** 2, 0) / win.length;
    const rms = Math.sqrt(win.reduce((a, x) => a + x * x, 0) / win.length);
    results.push({
      time: t[i + Math.floor(windowSize / 2)] ?? t[i],
      mean,
      rms,
      variance,
    });
  }
  return results;
}

// ─── Digital Communication Analysis ───────────────────────────────────

export interface ConstellationPoint {
  i: number;
  q: number;
}

export function calculateBER(txBits: number[], rxBits: number[]): number {
  if (txBits.length === 0) return 0;
  let errors = 0;
  const len = Math.min(txBits.length, rxBits.length);
  for (let i = 0; i < len; i++) {
    if (txBits[i] !== rxBits[i]) errors++;
  }
  return errors / len;
}

export function getConstellationPoints(
  signal: number[],
  samplesPerSymbol: number,
  type: 'ASK' | 'FSK' | 'PSK' | 'QPSK'
): ConstellationPoint[] {
  const points: ConstellationPoint[] = [];
  // Sample at the middle of each symbol
  for (let i = Math.floor(samplesPerSymbol / 2); i < signal.length; i += samplesPerSymbol) {
    if (type === 'QPSK') {
      const ph = Math.atan2(signal[i], signal[i - 1] || 0);
      points.push({ i: Math.cos(ph), q: Math.sin(ph) });
    } else {
      points.push({ i: signal[i], q: 0 });
    }
  }
  return points;
}

export function getEyeDiagramSegments(
  signal: number[],
  samplesPerSymbol: number,
  numSegments: number = 50
): number[][] {
  const segments: number[][] = [];
  const segmentLength = samplesPerSymbol * 2;
  for (let i = 0; i < signal.length - segmentLength && segments.length < numSegments; i += samplesPerSymbol) {
    segments.push(signal.slice(i, i + segmentLength));
  }
  return segments;
}

export function generateRandomBits(count: number): number[] {
  return Array.from({ length: count }, () => Math.round(Math.random()));
}

// ─── LTI Systems & Bode Plots ─────────────────────────────────────────

export interface BodePoint {
  frequency: number;
  magnitude: number; // in dB
  phase: number;     // in degrees
}

/** Evaluates H(s) at a specific complex value s */
function evaluateTF(tf: TransferFunction, s: { re: number, im: number }) {
  const evalPoly = (coeffs: number[], s: { re: number, im: number }) => {
    let resRe = 0;
    let resIm = 0;
    // Horner's method for complex polynomial
    for (const c of coeffs) {
      // res = res * s + c
      const nextRe = resRe * s.re - resIm * s.im + c;
      const nextIm = resRe * s.im + resIm * s.re;
      resRe = nextRe;
      resIm = nextIm;
    }
    return { re: resRe, im: resIm };
  };

  const n = evalPoly(tf.num, s);
  const d = evalPoly(tf.den, s);

  // complex division: (nRe + jnIm) / (dRe + jdIm)
  const denSq = d.re * d.re + d.im * d.im;
  if (denSq === 0) return { re: Infinity, im: 0 };

  return {
    re: (n.re * d.re + n.im * d.im) / denSq,
    im: (n.im * d.re - n.re * d.im) / denSq
  };
}

export function computeBodePlot(tf: TransferFunction, startFreq: number, stopFreq: number, points: number = 200): BodePoint[] {
  const bode: BodePoint[] = [];
  const logStart = Math.log10(startFreq);
  const logStop = Math.log10(stopFreq);
  const step = (logStop - logStart) / (points - 1);

  for (let i = 0; i < points; i++) {
    const freq = Math.pow(10, logStart + i * step);
    const omega = 2 * Math.PI * freq;
    // s = jw
    const s = { re: 0, im: omega };
    const h = evaluateTF(tf, s);

    const magnitude = Math.sqrt(h.re * h.re + h.im * h.im);
    const magDb = 20 * Math.log10(magnitude || 1e-12);
    let phaseDeg = (Math.atan2(h.im, h.re) * 180) / Math.PI;

    // Unwrap phase if needed (simple)
    if (bode.length > 0) {
      const lastPhase = bode[bode.length - 1].phase;
      while (phaseDeg - lastPhase > 180) phaseDeg -= 360;
      while (phaseDeg - lastPhase < -180) phaseDeg += 360;
    }

    bode.push({ frequency: freq, magnitude: magDb, phase: phaseDeg });
  }
  return bode;
}

/** 
 * Simulates a continuous LTI system using a robust discrete filter.
 * Note: fs must be significantly higher than system dynamics.
 */
export function simulateSystem(tf: TransferFunction, input: number[], fs: number): number[] {
  const b = tf.num;
  const a = tf.den;
  const output = new Array(input.length).fill(0);

  const x = new Array(b.length).fill(0);
  const y = new Array(a.length).fill(0);

  for (let i = 0; i < input.length; i++) {
    for (let j = x.length - 1; j > 0; j--) x[j] = x[j - 1];
    x[0] = input[i];

    let out = 0;
    for (let j = 0; j < b.length; j++) {
      out += b[j] * x[j];
    }
    for (let j = 1; j < a.length; j++) {
      out -= a[j] * y[j];
    }

    out /= a[0];

    for (let j = y.length - 1; j > 0; j--) y[j] = y[j - 1];
    y[0] = out;

    output[i] = out;
  }

  return output;
}

/**
 * Exports data to a CSV file and triggers a browser download.
 */
export function exportToCSV(data: { [key: string]: number[] }, filename: string) {
  const keys = Object.keys(data);
  const rows = data[keys[0]].length;
  let csvContent = keys.join(',') + '\n';

  for (let i = 0; i < rows; i++) {
    const row = keys.map(k => data[k][i]);
    csvContent += row.join(',') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
