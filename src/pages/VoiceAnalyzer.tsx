import { useState, useRef, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import RealSignalCharts from '@/components/RealSignalCharts';
import SpectrogramChart from '@/components/SpectrogramChart';
import { useRecorder } from '@/hooks/useRecorder';
import { computeFFT, computeSTFT } from '@/lib/signalEngine';
import { parseWAV } from '@/lib/realSignalEngine';
import { encodeWAV } from '@/lib/recordingEngine';
import { VowelDetector, extractFormants } from '@/lib/vowelEngine';
import VowelDetectionPanel from '@/components/VowelDetectionPanel';
import { toast } from 'sonner';

const SAMPLE_RATE = 44100;
const MAX_HISTORY_SECONDS = 5; // keep last 5 seconds for STFT/waveform
const MAX_HISTORY_SAMPLES = SAMPLE_RATE * MAX_HISTORY_SECONDS;

const WINDOW_SIZES = [256, 512, 1024, 2048] as const;
const OVERLAPS = [0.25, 0.5, 0.75] as const;
const FFT_SIZES = [512, 1024, 2048] as const;

const VoiceAnalyzer = () => {
    // recorder hook with chunk callback
    const audioBufRef = useRef<number[]>([]); // rolling buffer of latest samples
    const [renderTick, setRenderTick] = useState(0);

    const recordBufRef = useRef<number[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const onChunk = useCallback((chunk: Float32Array) => {
        // append to history
        const arr = audioBufRef.current;
        arr.push(...Array.from(chunk));
        if (arr.length > MAX_HISTORY_SAMPLES) {
            arr.splice(0, arr.length - MAX_HISTORY_SAMPLES);
        }
        if (isRecording) {
            recordBufRef.current.push(...Array.from(chunk));
        }
        setRenderTick(t => t + 1);
    }, [isRecording]);

    const {
        status: recorderStatus,
        buffer,
        getCurrentChunk,
        getFrequencyData,
        start: micStart,
        stop: micStop,
        clear: micClear,
    } = useRecorder(5, onChunk);

    // Map RecorderStatus to expected micStatus type
    const status: 'idle' | 'requesting' | 'live' | 'error' | 'stopped' =
        recorderStatus === 'recording' ? 'live' :
        recorderStatus === 'error' ? 'error' :
        recorderStatus === 'replaying' ? 'live' :
        'idle';

    const micRef = useRef<HTMLButtonElement>(null);
    const spectroCanvasRef = useRef<HTMLCanvasElement>(null);
    const vowelDetectorRef = useRef(new VowelDetector(5));

    const [vowelResult, setVowelResult] = useState<any>(null);
    const [vowelHistory, setVowelHistory] = useState<string[]>([]);

    // controls
    const [windowSize, setWindowSize] = useState<number>(512);
    const [overlap, setOverlap] = useState<number>(0.5);
    const [fftSize, setFftSize] = useState<number>(1024);

    const hopSize = Math.floor(windowSize * (1 - overlap));

    // calculated data
    const [spectrogram, setSpectrogram] = useState<{ times: number[]; frequencies: number[]; power: number[][] }>({ times: [], frequencies: [], power: [] });
    const [peakFreq, setPeakFreq] = useState<number>(0);
    const [signalPower, setSignalPower] = useState<number>(0);
    const [rms, setRms] = useState<number>(0);

    // file handling
    const [fileLabel, setFileLabel] = useState<string | null>(null);
    const [parsedFile, setParsedFile] = useState<any>(null); // using ParsedSignal shape

    // update analytics when buffer or settings change
    useEffect(() => {
        const samples = audioBufRef.current.slice();
        if (samples.length === 0) {
            setSpectrogram({ times: [], frequencies: [], power: [] });
            setPeakFreq(0);
            setSignalPower(0);
            setRms(0);
            return;
        }

        const sigArr = samples;
        // compute features from recent data
        const n = sigArr.length;
        let powerAcc = 0;
        for (let i = 0; i < n; i++) powerAcc += sigArr[i] * sigArr[i];
        const avgPower = n > 0 ? powerAcc / n : 0;
        setSignalPower(avgPower);
        setRms(Math.sqrt(avgPower));

        // compute FFT on last fftSize samples
        const last = sigArr.slice(-fftSize);
        if (last.length > 0) {
            const { frequencies, magnitudes } = computeFFT(last, SAMPLE_RATE);
            let maxIdx = 0;
            for (let i = 1; i < magnitudes.length; i++) {
                if (magnitudes[i] > magnitudes[maxIdx]) maxIdx = i;
            }
            setPeakFreq(frequencies[maxIdx] || 0);

            // Detect vowel from formants
            const formants = extractFormants(magnitudes, SAMPLE_RATE);
            const detected = vowelDetectorRef.current.update(formants);
            setVowelResult(detected);

            // Update history
            if (detected.vowel && detected.confidence > 0.3) {
                setVowelHistory(prev => {
                    const newHist = [...prev];
                    // Don't duplicate the last vowel
                    if (newHist[newHist.length - 1] !== detected.vowel) {
                        newHist.push(detected.vowel);
                    }
                    // Keep last 20 detections
                    return newHist.slice(-20);
                });
            }
        }

        // compute STFT for display
        const stftRes = computeSTFT(sigArr, SAMPLE_RATE, windowSize, hopSize);
        setSpectrogram(stftRes);

    }, [renderTick, windowSize, hopSize, fftSize]);

    // when parsed file changes we feed its data into audio buffer for display
    useEffect(() => {
        if (parsedFile) {
            audioBufRef.current = [...parsedFile.signal];
            setRenderTick(t => t + 1);
        }
    }, [parsedFile]);

    const handleStartMic = useCallback(async () => {
        setFileLabel(null);
        setParsedFile(null);
        audioBufRef.current = [];
        await micStart();
    }, [micStart]);

    const handleStopMic = useCallback(() => {
        micStop();
    }, [micStop]);

    const handleRecord = () => {
        recordBufRef.current = [];
        setIsRecording(true);
    };
    const handleStopRecord = () => {
        setIsRecording(false);
        // optionally make buffer available
    };

    const handleSaveAudio = () => {
        const arr = new Float32Array(recordBufRef.current);
        const blob = encodeWAV(arr, SAMPLE_RATE);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voice_recording.wav';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveSpectrogram = () => {
        const canvas = spectroCanvasRef.current;
        if (!canvas) return;
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'spectrogram.png';
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            if (file.name.toLowerCase().endsWith('.wav') || file.name.toLowerCase().endsWith('.mp3')) {
                const buf = await file.arrayBuffer();
                const parsed = await parseWAV(buf, file.name);
                setParsedFile(parsed);
                setFileLabel(parsed.label);
            } else {
                toast.error('Unsupported file type');
            }
        } catch (err) {
            toast.error('Failed to load file');
        }
        e.target.value = '';
    };

    return (
        <MainLayout activeLab="voice">
            <div className="flex h-full">
                <aside className="w-72 border-r border-border bg-black/20 p-3 flex flex-col gap-3 overflow-y-auto">
                    <div className="section-title">Microphone</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider">
                            ● {recorderStatus}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={handleStartMic}
                                disabled={recorderStatus === 'recording'}
                                className="action-button text-[10px] disabled:opacity-40"
                            >
                                ▶ Start Microphone
                            </button>
                            <button
                                onClick={handleStopMic}
                                disabled={recorderStatus !== 'recording'}
                                className="signal-button text-[10px] disabled:opacity-40"
                            >
                                ■ Stop
                            </button>
                        </div>
                    </div>

                    <div className="section-title">Recording</div>
                    <div className="flex gap-1">
                        {isRecording ? (
                            <button
                                onClick={handleStopRecord}
                                className="signal-button text-[10px] bg-red-500/10 border-red-500/30 text-red-500"
                            >
                                ■ Stop Recording
                            </button>
                        ) : (
                            <button
                                onClick={handleRecord}
                                disabled={recorderStatus !== 'recording'}
                                className="action-button text-[10px] disabled:opacity-40"
                            >
                                ● Record Audio
                            </button>
                        )}
                        {recordBufRef.current.length > 0 && (
                            <button
                                onClick={handleSaveAudio}
                                className="signal-button text-[10px]"
                            >
                                💾 Save WAV
                            </button>
                        )}
                    </div>

                    <div className="section-title">Spectrogram</div>
                    <div className="flex gap-1">
                        <button onClick={handleSaveSpectrogram} className="signal-button text-[10px]">
                            📷 Save Image
                        </button>
                    </div>

                    <div className="section-title">File Input</div>
                    <input type="file" accept="audio/*" onChange={handleFileChange} className="control-input text-xs" />
                    {fileLabel && (
                        <div className="text-[10px] truncate font-mono text-primary">{fileLabel}</div>
                    )}

                    <div className="section-title">Controls</div>
                    <div className="space-y-2">
                        <div>
                            <span className="label-text">Window size</span>
                            <select
                                value={windowSize}
                                onChange={e => setWindowSize(parseInt(e.target.value))}
                                className="control-input w-full text-xs"
                            >
                                {WINDOW_SIZES.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className="label-text">Overlap</span>
                            <select
                                value={overlap}
                                onChange={e => setOverlap(parseFloat(e.target.value))}
                                className="control-input w-full text-xs"
                            >
                                {OVERLAPS.map(p => (
                                    <option key={p} value={p}>{p * 100}%</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className="label-text">FFT size</span>
                            <select
                                value={fftSize}
                                onChange={e => setFftSize(parseInt(e.target.value))}
                                className="control-input w-full text-xs"
                            >
                                {FFT_SIZES.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="section-title">Features</div>
                    <div className="space-y-1 text-[10px]">
                        <div>Peak Freq: {peakFreq.toFixed(0)} Hz</div>
                        <div>Power: {signalPower.toFixed(6)}</div>
                        <div>RMS: {rms.toFixed(6)}</div>
                    </div>

                    <VowelDetectionPanel result={vowelResult} vowelHistory={vowelHistory} />
                </aside>

                <main className="flex-1 flex flex-col p-3 overflow-hidden">
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex-1 bg-black/20 border border-white/5 rounded-xl p-2">
                            <RealSignalCharts
                                source={recorderStatus === 'recording' ? 'microphone' : parsedFile ? 'file' : 'microphone'}
                                micStatus={status}
                                getSamples={getCurrentChunk}
                                getFreqData={getFrequencyData}
                                micSampleRate={SAMPLE_RATE}
                                fftSize={fftSize}
                                parsedFile={parsedFile}
                                faultedSignal={null}
                                idealTime={[]}
                                idealSignal={[]}
                                showFaulted={false}
                            />
                        </div>
                    </div>
                    {/* spectrogram always visible */}
                    <div className="h-64 bg-black/20 border border-white/5 rounded-xl p-2 mt-2">
                        <SpectrogramChart
                            ref={spectroCanvasRef}
                            times={spectrogram.times}
                            frequencies={spectrogram.frequencies}
                            power={spectrogram.power}
                            f1={vowelResult?.formants.f1}
                            f2={vowelResult?.formants.f2}
                            sampleRate={SAMPLE_RATE}
                        />
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default VoiceAnalyzer;
