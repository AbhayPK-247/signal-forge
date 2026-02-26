import { useState } from 'react';
import Plot from 'react-plotly.js';
import type { ConstellationPoint, ModType } from '@/lib/modulationEngine';

interface ModulationChartsProps {
    t: number[];
    message: number[];
    carrier: number[];
    modulated: number[];
    demodulated: number[] | null;
    frequencies: number[];
    magnitudes: number[];
    constellation: ConstellationPoint[];
    modType: ModType;
    showDemod: boolean;
}

const COLORS = {
    message: '#22d3ee',
    carrier: '#a78bfa',
    modulated: '#34d399',
    demodulated: '#f59e0b',
    fft: '#f472b6',
    constellation: '#22d3ee',
};

const FONT_COLOR = '#94a3b8';

function baseLayout(title: string): Partial<Plotly.Layout> {
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 45, r: 10, t: 30, b: 35 },
        font: { color: FONT_COLOR, size: 10, family: 'monospace' },
        title: { text: title, font: { size: 11, color: FONT_COLOR } },
        xaxis: {
            gridcolor: 'rgba(148,163,184,0.1)',
            zerolinecolor: 'rgba(148,163,184,0.2)',
            tickcolor: '#475569',
        },
        yaxis: {
            gridcolor: 'rgba(148,163,184,0.1)',
            zerolinecolor: 'rgba(148,163,184,0.2)',
            tickcolor: '#475569',
        },
        legend: { font: { size: 9 }, bgcolor: 'rgba(0,0,0,0)' },
        showlegend: true,
    };
}

const CFG: Partial<Plotly.Config> = { displayModeBar: false, responsive: true };

type LabTab = 'time' | 'fft' | 'constellation';

interface SignalPlotProps {
    t: number[];
    y: number[];
    color: string;
    title: string;
    name: string;
    xLabel?: string;
    yLabel?: string;
    maxPoints?: number;
}

function downsample(t: number[], y: number[], maxPoints: number) {
    if (y.length <= maxPoints) return { t, y };
    const factor = Math.ceil(y.length / maxPoints);
    const resultT: number[] = [];
    const resultY: number[] = [];
    for (let i = 0; i < y.length; i += factor) {
        resultT.push(t[i]);
        resultY.push(y[i]);
    }
    return { t: resultT, y: resultY };
}

const SignalPlot = ({ t, y, color, title, name, xLabel = 'Time (s)', yLabel = 'Amplitude', maxPoints = 5000 }: SignalPlotProps) => {
    const { t: dsT, y: dsY } = downsample(t, y, maxPoints);
    return (
        <Plot
            data={[{
                x: dsT, y: dsY,
                type: 'scatter' as const,
                mode: 'lines' as const,
                name,
                line: { color, width: 1.5 },
            }]}
            layout={{
                ...baseLayout(title),
                xaxis: { ...baseLayout(title).xaxis, title: { text: xLabel } },
                yaxis: { ...baseLayout(title).yaxis, title: { text: yLabel } },
            }}
            config={CFG}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
        />
    );
};

const ModulationCharts = ({
    t, message, carrier, modulated, demodulated,
    frequencies, magnitudes, constellation,
    modType, showDemod,
}: ModulationChartsProps) => {
    const [tab, setTab] = useState<LabTab>('time');
    const hasData = modulated.length > 0;
    const canShowConst = (modType === 'PSK' || modType === 'QPSK') && constellation.length > 0;

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Sub-tabs */}
            <div className="flex gap-1 shrink-0">
                {(['time', 'fft', 'constellation'] as LabTab[]).map(k => (
                    <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={`signal-button text-[10px] ${tab === k ? 'signal-button-active' : ''}`}
                    >
                        {k === 'time' ? 'Time Domain' : k === 'fft' ? 'FFT Spectrum' : 'Constellation'}
                    </button>
                ))}
            </div>

            {!hasData ? (
                <div className="flex-1 oscilloscope-display flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <div className="font-display text-xl font-bold neon-text tracking-wider">MODULATION LAB</div>
                        <p className="text-muted-foreground text-xs">Configure parameters and click Generate</p>
                        <div className="flex gap-1 justify-center">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-1 h-5 bg-primary/30 rounded-full" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                    {/* ── Time Domain ── */}
                    {tab === 'time' && (
                        <div className="h-full flex flex-col gap-2">
                            {/* Row 1: Message + Carrier */}
                            <div className="flex gap-2" style={{ flex: '1 1 0', minHeight: 0 }}>
                                <div className="flex-1 oscilloscope-display min-h-0">
                                    <SignalPlot t={t} y={message} color={COLORS.message} title="Message m(t)" name="m(t)" />
                                </div>
                                <div className="flex-1 oscilloscope-display min-h-0">
                                    <SignalPlot t={t} y={carrier} color={COLORS.carrier} title="Carrier c(t)" name="c(t)" />
                                </div>
                            </div>
                            {/* Row 2: Modulated + (optional) Demodulated */}
                            <div className="flex gap-2" style={{ flex: '1 1 0', minHeight: 0 }}>
                                <div className="flex-1 oscilloscope-display min-h-0">
                                    <SignalPlot t={t} y={modulated} color={COLORS.modulated} title={`${modType} Modulated`} name={modType} />
                                </div>
                                {showDemod && demodulated && (
                                    <div className="flex-1 oscilloscope-display min-h-0">
                                        <SignalPlot t={t} y={demodulated} color={COLORS.demodulated} title="Demodulated" name="Demod" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── FFT Spectrum ── */}
                    {tab === 'fft' && (
                        <div className="h-full oscilloscope-display">
                            <Plot
                                data={[{
                                    x: frequencies,
                                    y: magnitudes,
                                    type: 'scatter' as const,
                                    mode: 'lines' as const,
                                    name: 'FFT Magnitude',
                                    fill: 'tozeroy' as const,
                                    line: { color: COLORS.fft, width: 1.5 },
                                    fillcolor: `${COLORS.fft}22`,
                                }]}
                                layout={{
                                    ...baseLayout('FFT Spectrum'),
                                    xaxis: { ...baseLayout('FFT Spectrum').xaxis, title: { text: 'Frequency (Hz)' } },
                                    yaxis: { ...baseLayout('FFT Spectrum').yaxis, title: { text: 'Magnitude' } },
                                }}
                                config={CFG}
                                style={{ width: '100%', height: '100%' }}
                                useResizeHandler
                            />
                        </div>
                    )}

                    {/* ── Constellation ── */}
                    {tab === 'constellation' && (
                        <div className="h-full oscilloscope-display flex items-center justify-center">
                            {!canShowConst ? (
                                <p className="text-muted-foreground text-xs text-center px-4">
                                    Constellation diagram is available for{' '}
                                    <span className="text-primary">PSK</span> and{' '}
                                    <span className="text-primary">QPSK</span> only
                                </p>
                            ) : (
                                <Plot
                                    data={[{
                                        x: constellation.map(p => p.I),
                                        y: constellation.map(p => p.Q),
                                        text: constellation.map(p => p.label),
                                        type: 'scatter' as const,
                                        mode: 'markers+text' as Plotly.PlotData['mode'],
                                        textposition: 'top center' as const,
                                        marker: { color: COLORS.constellation, size: 10, symbol: 'circle' as const },
                                        name: 'Symbols',
                                    }]}
                                    layout={{
                                        ...baseLayout('Constellation Diagram'),
                                        xaxis: {
                                            ...baseLayout('Constellation Diagram').xaxis,
                                            title: { text: 'I (In-Phase)' },
                                            zeroline: true,
                                            zerolinecolor: 'rgba(148,163,184,0.3)',
                                        },
                                        yaxis: {
                                            ...baseLayout('Constellation Diagram').yaxis,
                                            title: { text: 'Q (Quadrature)' },
                                            zeroline: true,
                                            zerolinecolor: 'rgba(148,163,184,0.3)',
                                        },
                                        shapes: [{
                                            type: 'circle' as const,
                                            xref: 'x' as const,
                                            yref: 'y' as const,
                                            x0: -1, y0: -1, x1: 1, y1: 1,
                                            line: { color: 'rgba(148,163,184,0.15)', width: 1 },
                                        }],
                                    }}
                                    config={CFG}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler
                                />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModulationCharts;
