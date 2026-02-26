// ─── Modulation Engine ────────────────────────────────────────────────────
// Mathematically correct modulation, demodulation, and analysis formulas.

export type AnalogModType = 'AM' | 'FM' | 'PM' | 'DSB-SC' | 'SSB';
export type DigitalModType = 'ASK' | 'FSK' | 'PSK' | 'QPSK';
export type ModType = AnalogModType | DigitalModType;

export const ANALOG_MOD_TYPES: AnalogModType[] = ['AM', 'FM', 'PM', 'DSB-SC', 'SSB'];
export const DIGITAL_MOD_TYPES: DigitalModType[] = ['ASK', 'FSK', 'PSK', 'QPSK'];

export interface ModParams {
  Ac: number;   // Carrier amplitude
  Fc: number;   // Carrier frequency (Hz)
  Am: number;   // Message amplitude
  Fm: number;   // Message frequency (Hz)
  Fs: number;   // Sampling rate (Hz)
  T: number;   // Duration (s)
  // Analog extras
  ka: number; // AM modulation index
  beta: number; // FM modulation index (β)
  kp: number; // PM phase sensitivity
  // Digital extras
  bitRate: number;   // bits per second
  bits: number[]; // binary sequence (0s and 1s)
  F1: number;   // FSK frequency for bit=1
  F0: number;   // FSK frequency for bit=0
}

export const DEFAULT_MOD_PARAMS: ModParams = {
  Ac: 1, Fc: 100, Am: 0.5, Fm: 10, Fs: 5000, T: 0.2,
  ka: 0.5, beta: 2, kp: 1,
  bitRate: 20, bits: [1, 0, 1, 1, 0, 1, 0, 0],
  F1: 150, F0: 50,
};

// ─── Time Vector ──────────────────────────────────────────────────────────
export function generateModTimeVector(Fs: number, T: number): number[] {
  const N = Math.floor(Fs * T);
  const dt = 1 / Fs;
  return Array.from({ length: N }, (_, i) => i * dt);
}

// ─── Hilbert Transform (DFT-based) ────────────────────────────────────────
// ─── Fast Fourier Transform (Cooley-Tukey) ────────────────────────────────
function fft_radix2(re: Float64Array, im: Float64Array) {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT length must be a power of 2');

  // Bit-reversal permutation
  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (2 * Math.PI) / len;
    const wlen_re = Math.cos(angle);
    const wlen_im = -Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let w_re = 1;
      let w_im = 0;
      for (let j = 0; j < len / 2; j++) {
        const u_re = re[i + j];
        const u_im = im[i + j];
        const v_re = re[i + j + len / 2] * w_re - im[i + j + len / 2] * w_im;
        const v_im = re[i + j + len / 2] * w_im + im[i + j + len / 2] * w_re;
        re[i + j] = u_re + v_re;
        im[i + j] = u_im + v_im;
        re[i + j + len / 2] = u_re - v_re;
        im[i + j + len / 2] = u_im - v_im;
        const tmp_re = w_re * wlen_re - w_im * wlen_im;
        w_im = w_re * wlen_im + w_im * wlen_re;
        w_re = tmp_re;
      }
    }
  }
}

function ifft_radix2(re: Float64Array, im: Float64Array) {
  const n = re.length;
  // Conjugate → FFT → Conjugate → Normalize
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft_radix2(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

export function hilbert(x: number[]): { re: number[]; im: number[] } {
  let N = x.length;
  let M = 1;
  while (M < N) M <<= 1; // Round up to power of 2

  const re = new Float64Array(M);
  const im = new Float64Array(M);
  for (let i = 0; i < N; i++) re[i] = x[i];

  fft_radix2(re, im);

  const h = new Float64Array(M);
  if (M > 0) h[0] = 1;
  if (M > 1) {
    if (M % 2 === 0) {
      h[M / 2] = 1;
      for (let i = 1; i < M / 2; i++) h[i] = 2;
    } else {
      for (let i = 1; i <= Math.floor(M / 2); i++) h[i] = 2;
    }
  }

  for (let i = 0; i < M; i++) {
    re[i] *= h[i];
    im[i] *= h[i];
  }

  ifft_radix2(re, im);

  // Return original length
  return {
    re: Array.from(re.slice(0, N)),
    im: Array.from(im.slice(0, N))
  };
}

// Efficient envelope via rectification + smoothing
function envelopeDetect(signal: number[]): number[] {
  const N = signal.length;
  const abs = new Float64Array(N);
  for (let i = 0; i < N; i++) abs[i] = Math.abs(signal[i]);

  // Moving average smoothing (window of 10)
  const win = 10;
  const result = new Array<number>(N);
  let currentSum = 0;
  for (let i = 0; i < N; i++) {
    currentSum += abs[i];
    if (i >= win) currentSum -= abs[i - win];
    result[i] = currentSum / Math.min(i + 1, win);
  }
  return result;
}

// ─── Message and Carrier ──────────────────────────────────────────────────
export function generateMessage(t: number[], Am: number, Fm: number): number[] {
  return t.map(ti => Am * Math.sin(2 * Math.PI * Fm * ti));
}

export function generateCarrier(t: number[], Ac: number, Fc: number): number[] {
  return t.map(ti => Ac * Math.sin(2 * Math.PI * Fc * ti));
}

// ─── Analog Modulation ────────────────────────────────────────────────────
export function modulateAM(t: number[], p: ModParams, customMessage?: number[]): number[] {
  const { Ac, Fc, Am, Fm, ka } = p;
  return t.map((ti, i) => {
    const m = customMessage ? customMessage[i] : Am * Math.sin(2 * Math.PI * Fm * ti);
    return Ac * (1 + ka * m) * Math.sin(2 * Math.PI * Fc * ti);
  });
}

export function modulateFM(t: number[], p: ModParams, customMessage?: number[]): number[] {
  const { Ac, Fc, Am, Fm, beta } = p;
  if (customMessage) {
    // For FM, we need integral of message. For simplicity, assume message is narrow-band
    // or just apply beta * m(t) directly as phase deviation (simplified)
    return t.map((ti, i) => Ac * Math.sin(2 * Math.PI * Fc * ti + beta * customMessage[i]));
  }
  return t.map(ti => Ac * Math.sin(2 * Math.PI * Fc * ti + beta * Math.sin(2 * Math.PI * Fm * ti)));
}

export function modulatePM(t: number[], p: ModParams, customMessage?: number[]): number[] {
  const { Ac, Fc, Am, Fm, kp } = p;
  return t.map((ti, i) => {
    const m = customMessage ? customMessage[i] : Am * Math.sin(2 * Math.PI * Fm * ti);
    return Ac * Math.sin(2 * Math.PI * Fc * ti + kp * m);
  });
}

export function modulateDSBSC(t: number[], p: ModParams, customMessage?: number[]): number[] {
  const { Ac, Fc, Am, Fm } = p;
  return t.map((ti, i) => {
    const m = customMessage ? customMessage[i] : (Am * Math.sin(2 * Math.PI * Fm * ti));
    return Ac * m * Math.sin(2 * Math.PI * Fc * ti);
  });
}

export function modulateSSB(t: number[], p: ModParams): number[] {
  const { Ac, Fc, Am, Fm } = p;
  // SSB-USB: s(t) = Am/2 * cos(2π(Fc-Fm)t) equivalent (analytic approach):
  // s(t) = Am*cos(2πFm*t)*cos(2πFc*t) - Am*sin(2πFm*t)*sin(2πFc*t)
  // For USB: s(t) = m(t)·cos(2πFct) - m_hat(t)·sin(2πFct)
  const m = t.map(ti => Am * Math.sin(2 * Math.PI * Fm * ti));
  // Hilbert of m: m_hat(t) = -Am·cos(2πFmt) for pure sine
  const mHat = t.map(ti => -Am * Math.cos(2 * Math.PI * Fm * ti));
  return t.map((ti, i) =>
    Ac * (m[i] * Math.cos(2 * Math.PI * Fc * ti) - mHat[i] * Math.sin(2 * Math.PI * Fc * ti))
  );
}

// ─── Digital Modulation ───────────────────────────────────────────────────
function bitIndex(t: number, bitRate: number): number {
  return Math.floor(t * bitRate);
}

function getBit(bits: number[], idx: number): number {
  if (bits.length === 0) return 0;
  return bits[idx % bits.length];
}

export function modulateASK(t: number[], p: ModParams): number[] {
  const { Ac, Fc, bits, bitRate } = p;
  return t.map(ti => {
    const bit = getBit(bits, bitIndex(ti, bitRate));
    return Ac * bit * Math.sin(2 * Math.PI * Fc * ti);
  });
}

export function modulateFSK(t: number[], p: ModParams): number[] {
  const { Ac, F1, F0, bits, bitRate } = p;
  return t.map(ti => {
    const bit = getBit(bits, bitIndex(ti, bitRate));
    const freq = bit === 1 ? F1 : F0;
    return Ac * Math.sin(2 * Math.PI * freq * ti);
  });
}

export function modulatePSK(t: number[], p: ModParams): number[] {
  const { Ac, Fc, bits, bitRate } = p;
  return t.map(ti => {
    const bit = getBit(bits, bitIndex(ti, bitRate));
    const phase = bit === 1 ? 0 : Math.PI;
    return Ac * Math.sin(2 * Math.PI * Fc * ti + phase);
  });
}

export function modulateQPSK(t: number[], p: ModParams): number[] {
  const { Ac, Fc, bits, bitRate } = p;
  const symRate = bitRate / 2; // 2 bits per symbol
  // Map pairs: 00→0°, 01→90°, 10→180°, 11→270°
  const PHASES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  return t.map(ti => {
    const symIdx = Math.floor(ti * symRate);
    const bitIdx0 = symIdx * 2;
    const b0 = getBit(bits, bitIdx0);
    const b1 = getBit(bits, bitIdx0 + 1);
    const phaseIdx = b0 * 2 + b1;
    return Ac * Math.sin(2 * Math.PI * Fc * ti + PHASES[phaseIdx]);
  });
}

// ─── Modulation Dispatch ─────────────────────────────────────────────────
export function modulate(type: ModType, t: number[], p: ModParams, customMessage?: number[]): number[] {
  switch (type) {
    case 'AM': return modulateAM(t, p, customMessage);
    case 'FM': return modulateFM(t, p, customMessage);
    case 'PM': return modulatePM(t, p, customMessage);
    case 'DSB-SC': return modulateDSBSC(t, p, customMessage);
    case 'SSB': return modulateSSB(t, p); // SSB is complex, skip custom for now
    case 'ASK': return modulateASK(t, p);
    case 'FSK': return modulateFSK(t, p);
    case 'PSK': return modulatePSK(t, p);
    case 'QPSK': return modulateQPSK(t, p);
    default: return t.map(() => 0);
  }
}

// ─── Demodulation ─────────────────────────────────────────────────────────
export function demodulateAM(signal: number[]): number[] {
  return envelopeDetect(signal);
}

export function demodulateFM(signal: number[], Fs: number): number[] {
  // Instantaneous frequency via phase derivative
  // Phase = atan2(imag, real) of analytic signal
  // For performance on large arrays, use a simpler zero-crossing method
  const N = signal.length;
  const result = new Array<number>(N).fill(0);
  for (let i = 1; i < N; i++) {
    // Differential demodulation approximation
    result[i] = signal[i] * signal[i - 1] > 0 ? signal[i] - signal[i - 1] : 0;
  }
  // Smooth
  const win = 5;
  return result.map((_, i) => {
    const s = Math.max(0, i - win);
    const e = Math.min(N, i + win + 1);
    const sl = result.slice(s, e);
    return sl.reduce((a, b) => a + b, 0) / sl.length;
  });
}

export function demodulateASK(signal: number[], threshold = 0.3): number[] {
  const env = envelopeDetect(signal);
  return env.map(v => (v > threshold ? 1 : 0));
}

export function demodulateFSK(signal: number[], t: number[], F1: number, F0: number): number[] {
  // Correlate each sample window with reference tones
  const winSamples = Math.max(10, Math.floor(t.length / 20));
  return t.map((_, i) => {
    const s = Math.max(0, i - winSamples);
    const e = Math.min(t.length, i + winSamples + 1);
    let c1 = 0, c0 = 0;
    for (let j = s; j < e; j++) {
      c1 += signal[j] * Math.cos(2 * Math.PI * F1 * t[j]);
      c0 += signal[j] * Math.cos(2 * Math.PI * F0 * t[j]);
    }
    return Math.abs(c1) > Math.abs(c0) ? 1 : 0;
  });
}

export function demodulatePSK(signal: number[], t: number[], Fc: number): number[] {
  // Coherent detection: multiply by reference, low-pass filter
  const N = signal.length;
  const baseband = signal.map((x, i) => x * Math.sin(2 * Math.PI * Fc * t[i]));
  // Moving average low-pass
  const win = Math.max(5, Math.floor(N / 50));
  return baseband.map((_, i) => {
    const s = Math.max(0, i - win);
    const e = Math.min(N, i + win + 1);
    const sl = baseband.slice(s, e);
    const avg = sl.reduce((a, b) => a + b, 0) / sl.length;
    return avg >= 0 ? 1 : 0;
  });
}

export function demodulate(type: ModType, signal: number[], t: number[], p: ModParams): number[] | null {
  switch (type) {
    case 'AM':
    case 'DSB-SC':
    case 'SSB': return demodulateAM(signal);
    case 'FM': return demodulateFM(signal, p.Fs);
    case 'PM': return demodulateAM(signal); // envelope-like
    case 'ASK': return demodulateASK(signal);
    case 'FSK': return demodulateFSK(signal, t, p.F1, p.F0);
    case 'PSK':
    case 'QPSK': return demodulatePSK(signal, t, p.Fc);
    default: return null;
  }
}

// ─── Constellation Diagram ────────────────────────────────────────────────
export interface ConstellationPoint { I: number; Q: number; label: string }

export function computeConstellation(t: number[], signal: number[], p: ModParams, type: ModType): ConstellationPoint[] {
  const { Fc, bits, bitRate } = p;
  const points: ConstellationPoint[] = [];

  if (type === 'PSK') {
    // 2-PSK: 2 clusters
    const samplesPerBit = Math.floor(p.Fs / bitRate);
    const numBits = bits.length;
    for (let b = 0; b < numBits; b++) {
      const start = b * samplesPerBit;
      const end = Math.min(start + samplesPerBit, t.length);
      if (start >= t.length) break;
      let I = 0, Q = 0;
      let count = 0;
      for (let i = start; i < end; i++) {
        I += signal[i] * Math.cos(2 * Math.PI * Fc * t[i]);
        Q += signal[i] * Math.sin(2 * Math.PI * Fc * t[i]);
        count++;
      }
      if (count > 0) {
        points.push({ I: I / count, Q: Q / count, label: `${bits[b]}` });
      }
    }
  } else if (type === 'QPSK') {
    const symRate = bitRate / 2;
    const samplesPerSym = Math.floor(p.Fs / symRate);
    const numSyms = Math.floor(bits.length / 2);
    for (let s = 0; s < numSyms; s++) {
      const start = s * samplesPerSym;
      const end = Math.min(start + samplesPerSym, t.length);
      if (start >= t.length) break;
      let I = 0, Q = 0;
      let count = 0;
      for (let i = start; i < end; i++) {
        I += signal[i] * Math.cos(2 * Math.PI * Fc * t[i]);
        Q += signal[i] * Math.sin(2 * Math.PI * Fc * t[i]);
        count++;
      }
      const b0 = bits[s * 2] ?? 0;
      const b1 = bits[s * 2 + 1] ?? 0;
      if (count > 0) {
        points.push({ I: I / count, Q: Q / count, label: `${b0}${b1}` });
      }
    }
  }
  return points;
}

// ─── Feature Extraction ───────────────────────────────────────────────────
export interface ModFeatures {
  bandwidth: number | null;
  power: number;
  snr: number | null;
}

export function computeModFeatures(
  signal: number[],
  originalSignal: number[] | null,
  frequencies: number[],
  magnitudes: number[]
): ModFeatures {
  // Signal power
  const clean = signal.filter(x => !isNaN(x));
  const power = clean.length > 0 ? clean.reduce((a, x) => a + x * x, 0) / clean.length : 0;

  // 3dB Bandwidth
  let bandwidth: number | null = null;
  if (magnitudes.length > 0 && frequencies.length > 0) {
    const maxMag = Math.max(...magnitudes);
    const threshold = maxMag / Math.SQRT2; // -3dB
    const passband = frequencies.filter((_, i) => magnitudes[i] >= threshold);
    if (passband.length >= 2) {
      bandwidth = passband[passband.length - 1] - passband[0];
    }
  }

  // SNR (if original provided, compute noise power)
  let snr: number | null = null;
  if (originalSignal && originalSignal.length > 0) {
    const sigPow = originalSignal.reduce((a, x) => a + x * x, 0) / originalSignal.length;
    const noise = clean.map((x, i) => x - (originalSignal[i] ?? 0));
    const noisePow = noise.reduce((a, x) => a + x * x, 0) / noise.length;
    if (noisePow > 0) snr = 10 * Math.log10(sigPow / noisePow);
  }

  return { bandwidth, power, snr };
}

// ─── FFT for modulated signal ─────────────────────────────────────────────
export function computeModFFT(signal: number[], Fs: number, maxPoints = 2048): { frequencies: number[]; magnitudes: number[] } {
  const nRaw = signal.length;
  const nProc = Math.min(nRaw, maxPoints);

  // Power of 2 padding
  let N = 1;
  while (N < nProc) N <<= 1;

  const re = new Float64Array(N);
  const im = new Float64Array(N);

  for (let i = 0; i < nProc; i++) {
    re[i] = isNaN(signal[i]) ? 0 : signal[i];
  }

  fft_radix2(re, im);

  const halfN = N / 2;
  const magnitudes: number[] = [];
  const frequencies: number[] = [];

  for (let k = 0; k < halfN; k++) {
    magnitudes.push(Math.sqrt(re[k] * re[k] + im[k] * im[k]) / N);
    frequencies.push((k * Fs) / N);
  }

  return { frequencies, magnitudes };
}

// ─── Auto bit-sequence generator ──────────────────────────────────────────
export function generateRandomBits(count: number): number[] {
  return Array.from({ length: count }, () => (Math.random() > 0.5 ? 1 : 0));
}
