import { useState, useEffect, useRef, useMemo } from 'react';
import Plot from 'react-plotly.js';

const FONT_COLOR = '#94a3b8';
const COLORS = {
    wave: '#22d3ee', // cyan
    fft: '#f472b6',  // pink
    grid: 'rgba(148,163,184,0.1)',
};

function baseLayout(title: string): Partial<Plotly.Layout> {
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 10, t: 30, b: 40 },
        font: { color: FONT_COLOR, size: 10, family: 'monospace' },
        title: { text: title, font: { size: 11, color: FONT_COLOR } },
        xaxis: { gridcolor: COLORS.grid, zerolinecolor: 'rgba(148,163,184,0.2)', tickcolor: '#475569' },
        yaxis: { gridcolor: COLORS.grid, zerolinecolor: 'rgba(148,163,184,0.2)', tickcolor: '#475569' },
        showlegend: false,
    };
}

const CFG: Partial<Plotly.Config> = { displayModeBar: false, responsive: true };

interface RecordingDisplayProps {
    getCurrentChunk: () => Float32Array;
    getFrequencyData: () => Float32Array;
    isLive: boolean;
}

const RecordingDisplay = ({ getCurrentChunk, getFrequencyData, isLive }: RecordingDisplayProps) => {
    const [tab, setTab] = useState<'oscilloscope' | 'fft'>('oscilloscope');
    const [timeData, setTimeData] = useState<number[]>([]);
    const [freqMags, setFreqMags] = useState<number[]>([]);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const loop = () => {
            const chunk = getCurrentChunk();
            if (chunk && chunk.length > 0) {
                setTimeData(Array.from(chunk));
            }

            const freqArr = getFrequencyData();
            if (freqArr && freqArr.length > 0) {
                // Convert dB to linear for better viz
                const mags = Array.from(freqArr).map(db => Math.pow(10, db / 20));
                setFreqMags(mags);
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [getCurrentChunk, getFrequencyData]);

    const xTime = useMemo(() => Array.from({ length: timeData.length }, (_, i) => i / 44100), [timeData.length]);
    const xFreq = useMemo(() => Array.from({ length: freqMags.length }, (_, i) => (i * 44100) / (freqMags.length * 2)), [freqMags.length]);

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex gap-1 shrink-0">
                <button
                    onClick={() => setTab('oscilloscope')}
                    className={`signal-button text-[10px] ${tab === 'oscilloscope' ? 'signal-button-active' : ''}`}
                >
                    Oscilloscope
                </button>
                <button
                    onClick={() => setTab('fft')}
                    className={`signal-button text-[10px] ${tab === 'fft' ? 'signal-button-active' : ''}`}
                >
                    FFT Spectrum
                </button>
                {isLive && (
                    <span className="ml-auto text-[10px] text-red-500 animate-pulse font-mono self-center border border-red-500/30 px-2 rounded-full">
                        ● RECORDING
                    </span>
                )}
            </div>

            <div className="flex-1 min-h-0 oscilloscope-display">
                {tab === 'oscilloscope' ? (
                    <Plot
                        data={[{
                            x: xTime, y: timeData,
                            type: 'scatter' as const, mode: 'lines' as const,
                            line: { color: COLORS.wave, width: 1.5 },
                            name: 'Recorded Wave'
                        }]}
                        layout={{
                            ...baseLayout('Scrolling Waveform View'),
                            xaxis: { ...baseLayout('').xaxis, title: { text: 'Time Offset (s)' }, range: [0, 2048 / 44100] },
                            yaxis: { ...baseLayout('').yaxis, title: { text: 'Amplitude' }, range: [-1, 1] },
                        }}
                        config={CFG}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                    />
                ) : (
                    <Plot
                        data={[{
                            x: xFreq, y: freqMags,
                            type: 'scatter' as const, mode: 'lines' as const,
                            fill: 'tozeroy' as const,
                            line: { color: COLORS.fft, width: 1.5 },
                            fillcolor: `${COLORS.fft}22`,
                            name: 'FFT Magnitude'
                        }]}
                        layout={{
                            ...baseLayout('Frequency Distribution'),
                            xaxis: { ...baseLayout('').xaxis, title: { text: 'Frequency (Hz)' }, range: [0, 10000] },
                            yaxis: { ...baseLayout('').yaxis, title: { text: 'Magnitude' }, autorange: true },
                        }}
                        config={CFG}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                    />
                )}
            </div>

            {/* Grid Scales Info */}
            <div className="flex justify-between px-2 text-[9px] text-slate-500 font-mono">
                <span>Scale: 1.0V/div</span>
                <span>Time: {(2048 / 44100 * 1000).toFixed(1)}ms Window</span>
                <span>Rate: 44.1 kS/s</span>
            </div>
        </div>
    );
};

export default RecordingDisplay;
