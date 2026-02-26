import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'replaying' | 'paused' | 'error';

interface UseRecorderResult {
    status: RecorderStatus;
    buffer: Float32Array; // Complete recorded buffer
    isRecording: boolean;
    duration: number;
    start: () => Promise<void>;
    stop: () => void;
    clear: () => void;
    replay: (speed: number) => Promise<void>;
    pause: () => void;
    /** For real-time visualization */
    getCurrentChunk: () => Float32Array;
    getFrequencyData: () => Float32Array;
}

/**
 * useRecorder - High-performance audio capture/replay using Web Audio API.
 * Uses a large internal buffer (Float32Array) to handle up to 5-min sessions.
 */
export function useRecorder(maxMinutes: number = 5): UseRecorderResult {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [duration, setDuration] = useState(0);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);

    // The master buffer
    const maxSamples = 44100 * 60 * maxMinutes;
    const masterBufferRef = useRef<Float32Array>(new Float32Array(maxSamples));
    const writePosRef = useRef(0);

    // Visual data buffers
    const timeChunkRef = useRef<Float32Array>(new Float32Array(2048));
    const freqBufRef = useRef<Float32Array>(new Float32Array(1024));

    // Replay state
    const playPosRef = useRef(0);
    const playTimerRef = useRef<number | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const playStartTimeRef = useRef(0);

    const clear = useCallback(() => {
        writePosRef.current = 0;
        setDuration(0);
        setStatus('idle');
    }, []);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        processorRef.current?.disconnect();

        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }

        audioCtxRef.current?.close();
        audioCtxRef.current = null;

        if (playTimerRef.current) {
            cancelAnimationFrame(playTimerRef.current);
            playTimerRef.current = null;
        }

        setStatus('idle');
    }, []);

    const start = useCallback(async () => {
        clear();
        setStatus('recording');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ctx = new AudioContext({ sampleRate: 44100 });
            const source = ctx.createMediaStreamSource(stream);

            const analyzer = ctx.createAnalyser();
            analyzer.fftSize = 2048;

            // ScriptProcessor for continuous capture
            const processor = ctx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);

                // Store in master buffer
                if (writePosRef.current + input.length < maxSamples) {
                    masterBufferRef.current.set(input, writePosRef.current);
                    writePosRef.current += input.length;

                    // Update visual chunk
                    timeChunkRef.current.set(input.slice(0, 2048));
                    setDuration(writePosRef.current / 44100);
                } else {
                    // Buffer full
                    stop();
                }
            };

            source.connect(analyzer);
            analyzer.connect(processor);
            processor.connect(ctx.destination); // Required but often silenced by browser if not careful

            audioCtxRef.current = ctx;
            streamRef.current = stream;
            processorRef.current = processor;
            analyzerRef.current = analyzer;
        } catch (err) {
            console.error('Recording fail:', err);
            setStatus('error');
        }
    }, [clear, maxSamples, stop]);

    const pause = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }

        if (playTimerRef.current) {
            cancelAnimationFrame(playTimerRef.current);
            playTimerRef.current = null;
        }
        setStatus('paused');
    }, []);

    const replay = useCallback(async (speed: number = 1.0) => {
        if (writePosRef.current === 0) return;

        // Stop any existing playback and close context
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        if (audioCtxRef.current) {
            await audioCtxRef.current.close();
        }

        const ctx = new AudioContext({ sampleRate: 44100 });
        audioCtxRef.current = ctx;
        setStatus('replaying');

        // Prepare the buffer
        const audioBuffer = ctx.createBuffer(1, writePosRef.current, 44100);
        audioBuffer.getChannelData(0).set(masterBufferRef.current.subarray(0, writePosRef.current));

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = speed;
        source.connect(ctx.destination);

        // Prepare analyzer for visual feedback during replay
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 2048;
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        let offset = playPosRef.current / 44100;
        if (offset >= audioBuffer.duration) {
            offset = 0;
            playPosRef.current = 0;
        }

        source.start(0, offset);
        sourceNodeRef.current = source;
        playStartTimeRef.current = ctx.currentTime;
        const initialPlayPos = playPosRef.current;

        source.onended = () => {
            // Check if we reached the end naturally
            if (playPosRef.current >= writePosRef.current - 1000) {
                playPosRef.current = 0;
                setStatus('idle');
            }
        };

        const loop = () => {
            const elapsed = ctx.currentTime - playStartTimeRef.current;
            playPosRef.current = initialPlayPos + (elapsed * 44100 * speed);

            if (playPosRef.current >= writePosRef.current) {
                return;
            }

            const chunk = masterBufferRef.current.slice(
                Math.floor(playPosRef.current),
                Math.floor(playPosRef.current) + 2048
            );
            timeChunkRef.current.set(chunk);

            playTimerRef.current = requestAnimationFrame(loop);
        };

        playTimerRef.current = requestAnimationFrame(loop);
    }, []);

    const getCurrentChunk = useCallback(() => timeChunkRef.current, []);

    const getFrequencyData = useCallback(() => {
        if (analyzerRef.current && status === 'recording') {
            analyzerRef.current.getFloatFrequencyData(freqBufRef.current as any);
        }
        return freqBufRef.current;
    }, [status]);

    useEffect(() => {
        return () => {
            stop();
            if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current);
        };
    }, [stop]);

    // Only slice the full buffer when it actually changes (e.g. at the end of recording)
    // and keep it stable between renders
    const stableBuffer = useMemo(() => {
        if (status === 'recording') return new Float32Array(0);
        return masterBufferRef.current.slice(0, writePosRef.current);
    }, [status, duration === 0]); // Use duration change as a trigger for new buffer availability

    return {
        status,
        buffer: stableBuffer,
        isRecording: status === 'recording',
        duration,
        start,
        stop,
        clear,
        replay,
        pause,
        getCurrentChunk,
        getFrequencyData
    };
}
