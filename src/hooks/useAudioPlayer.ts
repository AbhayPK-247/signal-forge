import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useAudioPlayer - Lightweight hook to play numeric arrays as audio.
 */
export function useAudioPlayer() {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const stop = useCallback(() => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            } catch (e) {
                // Ignore if already stopped
            }
            sourceNodeRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const playSignal = useCallback(async (samples: number[] | Float32Array, sampleRate: number) => {
        stop();

        if (samples.length === 0) return;

        // Ensure we don't have too many samples to crash the browser
        // 10 seconds at 44.1k is ~441k samples, which is safe.
        // If it's millions, we might want to slice it for preview.
        const maxPlaybackSamples = sampleRate * 30; // 30 seconds max preview
        const data = samples instanceof Float32Array
            ? samples.subarray(0, maxPlaybackSamples)
            : new Float32Array(samples.slice(0, maxPlaybackSamples));

        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContext({ sampleRate });
        } else if (audioCtxRef.current.sampleRate !== sampleRate) {
            await audioCtxRef.current.close();
            audioCtxRef.current = new AudioContext({ sampleRate });
        }

        const ctx = audioCtxRef.current;
        const audioBuffer = ctx.createBuffer(1, data.length, sampleRate);
        audioBuffer.getChannelData(0).set(data);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        source.onended = () => {
            setIsPlaying(false);
            sourceNodeRef.current = null;
        };

        source.start();
        sourceNodeRef.current = source;
        setIsPlaying(true);
    }, [stop]);

    useEffect(() => {
        return () => {
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, []);

    return { playSignal, stop, isPlaying };
}
