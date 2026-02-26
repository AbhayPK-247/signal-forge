// ─── Real Signal Engine ────────────────────────────────────────────────────
// Parsing, statistics, and FFT utilities for real-world signals.
// No React dependencies — pure TypeScript.

// ─── Parsing ──────────────────────────────────────────────────────────────

export interface ParsedSignal {
    time: number[];
    signal: number[];
    sampleRate: number; // Hz, estimated or from file header
    label: string;
}

/** Parse CSV or TXT file content.
 *  Accepts: "time,amplitude" rows OR single "amplitude" column.
 *  Skips comment/header lines starting with # or non-numeric text.
 */
export function parseTextSignal(text: string, filename = 'signal'): ParsedSignal {
    const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));

    const pairs: [number, number][] = [];
    for (const line of lines) {
        const parts = line.split(/[,\t ]+/);
        const nums = parts.map(p => parseFloat(p)).filter(n => !isNaN(n));
        if (nums.length === 0) continue;
        if (nums.length >= 2) {
            pairs.push([nums[0], nums[1]]);
        } else {
            pairs.push([pairs.length, nums[0]]);
        }
    }

    if (pairs.length === 0) throw new Error('No numeric data found in file');

    const hasTimes = pairs[0][0] !== 0 || (pairs.length > 1 && pairs[1][0] !== 1);
    const time = pairs.map(p => p[0]);
    const signal = pairs.map(p => p[1]);

    // Estimate sample rate from time deltas
    let sampleRate = 1000;
    if (hasTimes && pairs.length >= 2) {
        const dt = time[1] - time[0];
        if (dt > 0) sampleRate = Math.round(1 / dt);
    }

    // If time is just indices, build from sample rate
    const finalTime = hasTimes
        ? time
        : Array.from({ length: signal.length }, (_, i) => i / sampleRate);

    return { time: finalTime, signal, sampleRate, label: filename };
}

/** Decode a WAV ArrayBuffer using the browser's AudioContext */
export async function parseWAV(buffer: ArrayBuffer, filename = 'signal.wav'): Promise<ParsedSignal> {
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(buffer);
    const channel0 = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const signal = Array.from(channel0);
    const time = signal.map((_, i) => i / sampleRate);
    await ctx.close();
    return { time, signal, sampleRate, label: filename };
}

// ─── Downsampling ──────────────────────────────────────────────────────────

/** Downsample signal by taking every `factor`-th sample */
export function downsample(
    time: number[],
    signal: number[],
    maxSamples: number
): { time: number[]; signal: number[] } {
    if (signal.length <= maxSamples) return { time, signal };
    const factor = Math.ceil(signal.length / maxSamples);
    const t: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < signal.length; i += factor) {
        t.push(time[i]);
        s.push(signal[i]);
    }
    return { time: t, signal: s };
}

// ─── Statistics ────────────────────────────────────────────────────────────

export interface RealSignalStats {
    mean: number;
    variance: number;
    stdDev: number;
    rms: number;
    peak: number;       // max absolute value
    peakToPeak: number;
    min: number;
    max: number;
    skewness: number;
    kurtosis: number;
    snr: number | null; // dB — only if reference provided
    sampleCount: number;
}

export function computeRealStats(
    signal: number[],
    reference?: number[]
): RealSignalStats {
    const clean = signal.filter(x => !isNaN(x) && isFinite(x));
    const N = clean.length;

    if (N === 0) {
        return {
            mean: 0, variance: 0, stdDev: 0, rms: 0,
            peak: 0, peakToPeak: 0, min: 0, max: 0,
            skewness: 0, kurtosis: 0, snr: null, sampleCount: 0,
        };
    }

    const mean = clean.reduce((a, b) => a + b, 0) / N;
    const variance = clean.reduce((a, x) => a + (x - mean) ** 2, 0) / N;
    const stdDev = Math.sqrt(variance);
    const rms = Math.sqrt(clean.reduce((a, x) => a + x * x, 0) / N);
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const peak = Math.max(Math.abs(min), Math.abs(max));
    const peakToPeak = max - min;

    const m3 = stdDev > 0 ? clean.reduce((a, x) => a + ((x - mean) / stdDev) ** 3, 0) / N : 0;
    const m4 = stdDev > 0 ? clean.reduce((a, x) => a + ((x - mean) / stdDev) ** 4, 0) / N : 0;

    let snr: number | null = null;
    if (reference && reference.length > 0) {
        const refClean = reference.filter(x => !isNaN(x) && isFinite(x));
        const sigPow = refClean.reduce((a, x) => a + x * x, 0) / refClean.length;
        const len = Math.min(clean.length, refClean.length);
        let noisePow = 0;
        for (let i = 0; i < len; i++) {
            const diff = clean[i] - refClean[i];
            noisePow += diff * diff;
        }
        noisePow /= len;
        if (noisePow > 0) snr = 10 * Math.log10(sigPow / noisePow);
    }

    return { mean, variance, stdDev, rms, peak, peakToPeak, min, max, skewness: m3, kurtosis: m4, snr, sampleCount: N };
}

// ─── FFT ───────────────────────────────────────────────────────────────────

export function computeRealFFT(
    signal: number[],
    sampleRate: number,
    maxN = 4096
): { frequencies: number[]; magnitudes: number[] } {
    const src = signal.slice(0, Math.min(signal.length, maxN)).map(x => (isNaN(x) || !isFinite(x) ? 0 : x));
    let N = 1;
    while (N < src.length) N *= 2;
    const padded = [...src, ...new Array(N - src.length).fill(0)];
    const halfN = Math.floor(N / 2);
    const magnitudes: number[] = [];
    const frequencies: number[] = [];

    // Apply Hann window
    const windowed = padded.map((x, n) =>
        n < src.length ? x * 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1))) : 0
    );

    for (let k = 0; k < halfN; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) {
            const angle = (2 * Math.PI * k * n) / N;
            re += windowed[n] * Math.cos(angle);
            im -= windowed[n] * Math.sin(angle);
        }
        magnitudes.push((2 * Math.sqrt(re * re + im * im)) / N);
        frequencies.push((k * sampleRate) / N);
    }

    return { frequencies, magnitudes };
}

// ─── Ideal signal generator (for comparison) ──────────────────────────────

export type IdealType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface IdealParams {
    type: IdealType;
    amplitude: number;
    frequency: number;
    sampleRate: number;
    duration: number;
}

export function generateIdealSignal(p: IdealParams): { time: number[]; signal: number[] } {
    const N = Math.floor(p.sampleRate * p.duration);
    const dt = 1 / p.sampleRate;
    const time = Array.from({ length: N }, (_, i) => i * dt);
    const signal = time.map(ti => {
        const phase = 2 * Math.PI * p.frequency * ti;
        switch (p.type) {
            case 'sine': return p.amplitude * Math.sin(phase);
            case 'square': return p.amplitude * Math.sign(Math.sin(phase));
            case 'triangle': return (2 * p.amplitude / Math.PI) * Math.asin(Math.sin(phase));
            case 'sawtooth': {
                const T = 1 / p.frequency;
                return 2 * p.amplitude * (ti / T - Math.floor(0.5 + ti / T));
            }
            default: return 0;
        }
    });
    return { time, signal };
}

// ─── Built-in Signal Library ───────────────────────────────────────────

export const BUILTIN_SIGNALS: Record<string, () => ParsedSignal> = {
    'Speech (Simulated)': () => {
        const sr = 16000;
        const dur = 1;
        const t = Array.from({ length: sr * dur }, (_, i) => i / sr);
        // Sum of varied sines to mock speech formants
        const signal = t.map(ti => (
            Math.sin(2 * Math.PI * 440 * ti) * 0.4 +
            Math.sin(2 * Math.PI * 880 * ti) * 0.2 +
            Math.sin(2 * Math.PI * 1320 * ti) * 0.1 +
            (Math.random() - 0.5) * 0.05
        ));
        return { time: t, signal, sampleRate: sr, label: 'Speech (Simulated)' };
    },
    'Industrial Vibration': () => {
        const sr = 5000;
        const dur = 1;
        const t = Array.from({ length: sr * dur }, (_, i) => i / sr);
        // Bearing fault mock: 50Hz shaft + 320Hz bearing rattle
        const signal = t.map(ti => (
            Math.sin(2 * Math.PI * 50 * ti) * 0.5 +
            Math.sin(2 * Math.PI * 320 * ti) * (0.2 * Math.sin(2 * Math.PI * 5 * ti)) +
            (Math.random() - 0.5) * 0.1
        ));
        return { time: t, signal, sampleRate: sr, label: 'Industrial Vibration' };
    },
    'Power Line Noise': () => {
        const sr = 1000;
        const dur = 1;
        const t = Array.from({ length: sr * dur }, (_, i) => i / sr);
        const signal = t.map(ti => (
            Math.sin(2 * Math.PI * 50 * ti) +
            Math.sin(2 * Math.PI * 150 * ti) * 0.2 + // 3rd harmonic
            (Math.random() - 0.5) * 0.05
        ));
        return { time: t, signal, sampleRate: sr, label: 'Power Line Noise' };
    },
    'Noisy Sensor Drift': () => {
        const sr = 500;
        const dur = 2;
        const t = Array.from({ length: sr * dur }, (_, i) => i / sr);
        const signal = t.map(ti => (
            0.5 * ti + // linear drift
            0.2 * Math.sin(2 * Math.PI * 0.2 * ti) + // slow oscillation
            (Math.random() - 0.5) * 0.3
        ));
        return { time: t, signal, sampleRate: sr, label: 'Noisy Sensor Drift' };
    }
};
