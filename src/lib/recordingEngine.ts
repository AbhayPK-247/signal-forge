// ─── Recording Engine ────────────────────────────────────────────────────────
// Logic for handling large sample arrays, WAV encoding, and dataset generation.

export interface StoredRecording {
    id: string;
    label: string;
    timestamp: number;
    sampleRate: number;
    samples: Float32Array;
    duration: number;
}

/**
 * Encodes a Float32Array into a WAV file blob.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF identifier
    writeString(0, 'RIFF');
    // file length
    view.setUint32(4, 32 + samples.length * 2, true);
    // RIFF type
    writeString(8, 'WAVE');
    // format chunk identifier
    writeString(12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

export function generateRecordingCSV(samples: Float32Array, sampleRate: number): string {
    const lines = ['time,amplitude'];
    const dt = 1 / sampleRate;
    for (let i = 0; i < samples.length; i++) {
        lines.push(`${(i * dt).toFixed(6)},${samples[i].toFixed(6)}`);
    }
    return lines.join('\n');
}

/**
 * Dataset Gen: Splits signal into fixed-length segments.
 */
export function generateDataset(
    recording: StoredRecording,
    segmentSeconds: number = 0.5
): { label: string; samples: Float32Array }[] {
    const segmentLen = Math.floor(recording.sampleRate * segmentSeconds);
    const segments: { label: string; samples: Float32Array }[] = [];

    for (let i = 0; i < recording.samples.length; i += segmentLen) {
        const end = Math.min(i + segmentLen, recording.samples.length);
        if (end - i < segmentLen * 0.5) break; // Skip tiny trailing segments

        segments.push({
            label: `Segment_${segments.length + 1}`,
            samples: recording.samples.slice(i, end)
        });
    }

    return segments;
}

/**
 * Computes stats on a window of samples.
 */
export function computeWindowStats(samples: Float32Array) {
    if (samples.length === 0) return null;
    let sum = 0;
    let sumSq = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < samples.length; i++) {
        const v = samples[i];
        sum += v;
        sumSq += v * v;
        if (v < min) min = v;
        if (v > max) max = v;
    }

    const mean = sum / samples.length;
    const rms = Math.sqrt(sumSq / samples.length);

    return {
        mean,
        rms,
        peak: Math.max(Math.abs(min), Math.abs(max)),
        peakToPeak: max - min,
        min,
        max,
        sampleCount: samples.length
    };
}
