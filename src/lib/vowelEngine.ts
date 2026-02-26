// ─── Vowel Detection Engine ──────────────────────────────────────────────────
// Analyzes formant frequencies to detect spoken vowels in real-time.

export interface VowelFormants {
  f1: number; // First formant (Hz)
  f2: number; // Second formant (Hz)
}

export interface VowelResult {
  vowel: 'A' | 'E' | 'I' | 'O' | 'U' | null;
  confidence: number; // 0–1
  formants: VowelFormants;
}

// Typical vowel formant ranges (in Hz)
const VOWEL_RANGES: Record<string, { f1: [number, number]; f2: [number, number] }> = {
  A: { f1: [700, 900], f2: [1100, 1300] },
  E: { f1: [400, 600], f2: [1700, 2300] },
  I: { f1: [200, 400], f2: [2000, 3000] },
  O: { f1: [400, 600], f2: [800, 1200] },
  U: { f1: [200, 400], f2: [600, 1000] },
};

/**
 * Find peaks in a frequency spectrum.
 * Returns indices of local maxima.
 */
function findPeaks(spectrum: number[], minDistance: number = 5): number[] {
  const peaks: number[] = [];
  for (let i = minDistance; i < spectrum.length - minDistance; i++) {
    let isPeak = true;
    for (let j = i - minDistance; j <= i + minDistance; j++) {
      if (j !== i && spectrum[j] > spectrum[i]) {
        isPeak = false;
        break;
      }
    }
    if (isPeak) peaks.push(i);
  }
  return peaks;
}

/**
 * Extract F1 and F2 formants from FFT magnitude spectrum.
 * @param magnitudes FFT magnitudes (linear scale)
 * @param sampleRate Sampling rate (Hz)
 * @returns F1 and F2 frequencies
 */
export function extractFormants(
  magnitudes: number[],
  sampleRate: number
): VowelFormants {
  // Limit search range: F1 typically 200–900 Hz, F2 typically 600–3000 Hz
  const nyquist = sampleRate / 2;
  const f1MaxIdx = Math.floor((900 / nyquist) * magnitudes.length);
  const f2MaxIdx = Math.floor((3000 / nyquist) * magnitudes.length);

  // Extract prominent peaks
  const peaks = findPeaks(magnitudes.slice(0, f2MaxIdx), 3);
  if (peaks.length < 2) {
    return { f1: 0, f2: 0 };
  }

  // Sort peaks by magnitude
  const sortedPeaks = peaks
    .map(idx => ({ idx, mag: magnitudes[idx] }))
    .sort((a, b) => b.mag - a.mag);

  // F1 is typically the strongest peak in the lower frequency range
  let f1Idx = sortedPeaks.find(p => p.idx < f1MaxIdx)?.idx ?? sortedPeaks[0].idx;

  // F2 is typically a strong peak above F1
  let f2Idx = sortedPeaks.find(p => p.idx > f1Idx && p.idx < f2MaxIdx)?.idx ?? 
              sortedPeaks.find(p => p.idx > f1Idx)?.idx ?? 
              sortedPeaks[1]?.idx ?? f1Idx + 50;

  // Ensure F1 < F2
  if (f1Idx > f2Idx) {
    [f1Idx, f2Idx] = [f2Idx, f1Idx];
  }

  // Convert indices to frequencies
  const f1 = (f1Idx * sampleRate) / (magnitudes.length * 2);
  const f2 = (f2Idx * sampleRate) / (magnitudes.length * 2);

  return { f1, f2 };
}

/**
 * Calculate distance from point to vowel range in 2D formant space.
 * Uses Euclidean distance with normalized coordinates.
 */
function distanceToVowel(f1: number, f2: number, vowelRange: { f1: [number, number]; f2: [number, number] }): number {
  const f1Center = (vowelRange.f1[0] + vowelRange.f1[1]) / 2;
  const f2Center = (vowelRange.f2[0] + vowelRange.f2[1]) / 2;

  // Normalize by range width to give equal weight to both formants
  const f1Width = vowelRange.f1[1] - vowelRange.f1[0];
  const f2Width = vowelRange.f2[1] - vowelRange.f2[0];

  const f1Diff = (f1 - f1Center) / (f1Width || 100);
  const f2Diff = (f2 - f2Center) / (f2Width || 100);

  return Math.sqrt(f1Diff * f1Diff + f2Diff * f2Diff);
}

/**
 * Classify vowel based on formant frequencies.
 * @param formants F1 and F2 frequencies
 * @returns Detected vowel and confidence score
 */
export function classifyVowel(formants: VowelFormants): VowelResult {
  const { f1, f2 } = formants;

  // Skip if formants are too low (silence or noise)
  if (f1 < 50 || f2 < 100) {
    return { vowel: null, confidence: 0, formants };
  }

  // Calculate distance to each vowel
  const distances = Object.entries(VOWEL_RANGES).map(([vowel, range]) => ({
    vowel,
    distance: distanceToVowel(f1, f2, range),
  }));

  // Find closest match
  const closest = distances.reduce((a, b) => (a.distance < b.distance ? a : b));

  // Confidence: inverse of normalized distance
  // distance < 1 means within vowel range
  const confidence = Math.max(0, 1 - closest.distance / 2);

  return {
    vowel: (closest.vowel as 'A' | 'E' | 'I' | 'O' | 'U'),
    confidence,
    formants,
  };
}

/**
 * Apply smoothing over multiple frames to stabilize vowel detection.
 * Keeps a sliding window of recent detections.
 */
export class VowelDetector {
  private history: VowelResult[] = [];
  private windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }

  /**
   * Update detector with new formants and get smoothed vowel.
   */
  update(formants: VowelFormants): VowelResult {
    const current = classifyVowel(formants);
    this.history.push(current);

    // Keep only recent history
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // Average confidence across window
    const avgConfidence = this.history.reduce((sum, v) => sum + v.confidence, 0) / this.history.length;

    // Majority vote for vowel
    const vowelCounts: Record<string, number> = {};
    for (const result of this.history) {
      if (result.vowel) {
        vowelCounts[result.vowel] = (vowelCounts[result.vowel] ?? 0) + 1;
      }
    }

    let bestVowel: 'A' | 'E' | 'I' | 'O' | 'U' | null = null;
    let bestCount = 0;
    for (const [vowel, count] of Object.entries(vowelCounts)) {
      if (count > bestCount) {
        bestCount = count;
        bestVowel = vowel as 'A' | 'E' | 'I' | 'O' | 'U';
      }
    }

    return {
      vowel: bestVowel,
      confidence: avgConfidence,
      formants: current.formants,
    };
  }

  clear() {
    this.history = [];
  }
}
