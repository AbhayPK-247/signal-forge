import { useRef, useState, useCallback, useEffect } from 'react';

export type MicStatus = 'idle' | 'requesting' | 'live' | 'error' | 'stopped';

export interface MicState {
    status: MicStatus;
    error: string | null;
    sampleRate: number;
}

interface UseMicrophoneResult {
    state: MicState;
    /** Latest time-domain samples from the analyser (Float32Array, length = fftSize) */
    getSamples: () => Float32Array;
    /** Latest frequency-domain data (magnitude in dB, length = fftSize/2) */
    getFreqData: () => Float32Array;
    start: () => Promise<void>;
    stop: () => void;
}

/**
 * useMicrophone — encapsulates Web Audio API microphone capture.
 * Uses AnalyserNode to expose real-time time-domain and frequency data.
 * @param fftSize Power-of-2 FFT size for AnalyserNode (default 2048)
 */
export function useMicrophone(fftSize: number = 2048): UseMicrophoneResult {
    const [state, setState] = useState<MicState>({
        status: 'idle',
        error: null,
        sampleRate: 44100,
    });

    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const timeBufRef = useRef(new Float32Array(fftSize));
    const freqBufRef = useRef(new Float32Array(fftSize / 2));

    // Keep fftSize-sized buffers up to date if fftSize changes
    useEffect(() => {
        timeBufRef.current = new Float32Array(fftSize);
        freqBufRef.current = new Float32Array(fftSize / 2);
    }, [fftSize]);

    const getSamples = useCallback((): Float32Array => {
        if (analyserRef.current) {
            analyserRef.current.getFloatTimeDomainData(timeBufRef.current);
        }
        return timeBufRef.current;
    }, []);

    const getFreqData = useCallback((): Float32Array => {
        if (analyserRef.current) {
            analyserRef.current.getFloatFrequencyData(freqBufRef.current);
        }
        return freqBufRef.current;
    }, []);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        sourceRef.current?.disconnect();
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        streamRef.current = null;
        sourceRef.current = null;
        setState(s => ({ ...s, status: 'stopped', error: null }));
    }, []);

    const start = useCallback(async () => {
        // Stop any existing session first
        stop();

        setState({ status: 'requesting', error: null, sampleRate: 44100 });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                },
            });

            const ctx = new AudioContext({ sampleRate: 44100 });
            const analyser = ctx.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = 0.3;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            // Do NOT connect to destination — avoids mic feedback loop

            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
            streamRef.current = stream;
            sourceRef.current = source;

            // Re-allocate buffers for the actual fftSize
            timeBufRef.current = new Float32Array(fftSize);
            freqBufRef.current = new Float32Array(fftSize / 2);

            setState({
                status: 'live',
                error: null,
                sampleRate: ctx.sampleRate,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Microphone access denied';
            setState({ status: 'error', error: msg, sampleRate: 44100 });
        }
    }, [fftSize, stop]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            audioCtxRef.current?.close();
        };
    }, []);

    return { state, getSamples, getFreqData, start, stop };
}
