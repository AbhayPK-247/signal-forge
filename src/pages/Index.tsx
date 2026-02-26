import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  type SignalType,
  type SignalParams,
  type MultiFaultConfig,
  DEFAULT_PARAMS,
  createDefaultMultiFaultConfig,
  generateTimeVector,
  generateSignal,
  generateSweepSignal,
  applyMultiFault,
  hasActiveFaults,
  computeStats,
  computeFFT,
  computePSD,
  computeSTFT,
  computeWindowedStats,
} from '@/lib/signalEngine';
import SignalControls from '@/components/SignalControls';
import FaultControls from '@/components/FaultControls';
import WaveformChart from '@/components/WaveformChart';
import FFTChart from '@/components/FFTChart';
import HistogramChart from '@/components/HistogramChart';
import PSDChart from '@/components/PSDChart';
import SpectrogramChart from '@/components/SpectrogramChart';
import FeatureTrendChart from '@/components/FeatureTrendChart';
import StatsDisplay from '@/components/StatsDisplay';
import MainLayout from '@/components/MainLayout';
import PlaybackControls from '@/components/PlaybackControls';
import { Slider } from '@/components/ui/slider';
import FormulaPanel from '@/components/FormulaPanel';

type AnalysisTab = 'waveform' | 'spectral' | 'advanced';

const Index = () => {
  const [signalType, setSignalType] = useState<SignalType>('sine');
  const [params, setParams] = useState<SignalParams>(DEFAULT_PARAMS);
  const [faultConfig, setFaultConfig] = useState<MultiFaultConfig>(createDefaultMultiFaultConfig());
  const [showOriginal, setShowOriginal] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('waveform');

  // Sweep Mode state
  const [isSweepEnabled, setIsSweepEnabled] = useState(false);
  const [sweepParams, setSweepParams] = useState({
    type: 'linear' as any,
    fStart: 10,
    fStop: 100,
    aStart: 1.0,
    aStop: 1.0,
    pStart: 0,
    pStop: 0,
    duration: 5
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [phaseOffset, setPhaseOffset] = useState(0);

  const [time, setTime] = useState<number[]>([]);
  const [original, setOriginal] = useState<number[]>([]);
  const [faulted, setFaulted] = useState<number[]>([]);

  const hasFaults = useMemo(() => hasActiveFaults(faultConfig), [faultConfig]);

  const generate = useCallback((offset = 0) => {
    const t = generateTimeVector(params);
    let sig: number[];

    if (isSweepEnabled) {
      const { signal } = generateSweepSignal({ ...sweepParams, enabled: true, duration: params.duration }, t);
      sig = signal;
    } else {
      const p = { ...params, phase: params.phase + offset };
      sig = generateSignal(signalType, p, t);
    }

    const fSig = applyMultiFault(sig, t, faultConfig);
    setTime(t);
    setOriginal(sig);
    setFaulted(fSig);
    setGenerated(true);
  }, [signalType, params, faultConfig, isSweepEnabled, sweepParams]);

  // Real-time animation loop
  useEffect(() => {
    let animationId: number;
    if (isPlaying) {
      const startTime = Date.now();
      const step = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        setPhaseOffset(elapsed * params.frequency * 2 * Math.PI * playbackSpeed);
        generate(elapsed * params.frequency * 2 * Math.PI * playbackSpeed);
        animationId = requestAnimationFrame(step);
      };
      animationId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, playbackSpeed, params.frequency, generate]);

  const applyFaultLive = useCallback(
    (config: MultiFaultConfig) => {
      if (original.length === 0) return;
      setFaulted(applyMultiFault(original, time, config));
    },
    [original, time]
  );

  const handleFaultConfigChange = useCallback(
    (config: MultiFaultConfig) => {
      setFaultConfig(config);
      applyFaultLive(config);
    },
    [applyFaultLive]
  );

  const reset = useCallback(() => {
    setSignalType('sine');
    setParams(DEFAULT_PARAMS);
    setFaultConfig(createDefaultMultiFaultConfig());
    setTime([]);
    setOriginal([]);
    setFaulted([]);
    setGenerated(false);
    setActiveTab('waveform');
    setIsPlaying(false);
  }, []);

  const stats = useMemo(() => {
    if (!generated) return null;
    return computeStats(faulted, hasFaults ? original : undefined);
  }, [faulted, original, hasFaults, generated]);

  const fft = useMemo(() => {
    if (!generated || faulted.length === 0) return null;
    const maxSamples = 2048;
    const sig = faulted.length > maxSamples ? faulted.slice(0, maxSamples) : faulted;
    return computeFFT(sig, params.samplingRate);
  }, [faulted, params.samplingRate, generated]);

  const psd = useMemo(() => {
    if (!generated || faulted.length === 0) return null;
    const maxSamples = 2048;
    const sig = faulted.length > maxSamples ? faulted.slice(0, maxSamples) : faulted;
    return computePSD(sig, params.samplingRate);
  }, [faulted, params.samplingRate, generated]);

  const stft = useMemo(() => {
    if (!generated || faulted.length === 0) return null;
    return computeSTFT(faulted, params.samplingRate);
  }, [faulted, params.samplingRate, generated]);

  const windowedStats = useMemo(() => {
    if (!generated || faulted.length === 0 || time.length === 0) return null;
    const windowSize = Math.max(16, Math.floor(faulted.length / 50));
    return computeWindowedStats(faulted, time, windowSize);
  }, [faulted, time, generated]);

  const exportCSV = useCallback(() => {
    if (!generated) return;
    const header = 'Time,Original,Faulted\n';
    const rows = time.map((t, i) => `${t},${original[i]},${faulted[i]}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal_${signalType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generated, time, original, faulted, signalType]);

  const TABS: { key: AnalysisTab; label: string }[] = [
    { key: 'waveform', label: 'Waveform' },
    { key: 'spectral', label: 'Spectral' },
    { key: 'advanced', label: 'Advanced' },
  ];

  return (
    <MainLayout activeLab="oscilloscope">
      <div className="flex flex-col h-full">
        {/* Horizontal Tool Bar */}
        <div className="h-10 border-b border-border/30 bg-black/20 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <PlaybackControls
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onStop={() => setIsPlaying(false)}
              speed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>

          <div className="flex items-center gap-2">
            {generated && (
              <>
                <button onClick={exportCSV} className="signal-button text-[10px] h-7 px-3">
                  Export CSV
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOriginal}
                    onChange={e => setShowOriginal(e.target.checked)}
                    className="accent-primary w-3 h-3"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Compare Mode</span>
                </label>
              </>
            )}
          </div>
        </div>

        {/* Lab Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-[260px] shrink-0 border-r border-border/50 overflow-y-auto p-3 space-y-3 bg-black/10">
            <SignalControls
              signalType={signalType}
              params={params}
              onSignalTypeChange={setSignalType}
              onParamsChange={setParams}
              onGenerate={() => { setIsPlaying(false); generate(); }}
              onReset={reset}
            />

            <div className="glass-panel p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="section-title">Sweep Mode</div>
                <button
                  onClick={() => setIsSweepEnabled(!isSweepEnabled)}
                  className={`signal-button text-[10px] h-6 px-4 ${isSweepEnabled ? 'signal-button-active' : ''}`}
                >
                  {isSweepEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {isSweepEnabled && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-2">
                    {['linear', 'logarithmic'].map(t => (
                      <button
                        key={t}
                        onClick={() => setSweepParams({ ...sweepParams, type: t as any })}
                        className={`signal-button text-[9px] h-7 ${sweepParams.type === t ? 'signal-button-active' : ''}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
                        <span>F-Start: {sweepParams.fStart}Hz</span>
                      </div>
                      <Slider
                        value={[sweepParams.fStart]}
                        min={1} max={500}
                        onValueChange={([v]) => setSweepParams({ ...sweepParams, fStart: v })}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
                        <span>F-Stop: {sweepParams.fStop}Hz</span>
                      </div>
                      <Slider
                        value={[sweepParams.fStop]}
                        min={1} max={500}
                        onValueChange={([v]) => setSweepParams({ ...sweepParams, fStop: v })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <FaultControls config={faultConfig} onChange={handleFaultConfigChange} />
          </aside>

          {/* Center - Charts */}
          <main className="flex-1 flex flex-col p-3 gap-3 min-w-0 bg-black/5">
            {!generated ? (
              <div className="flex-1 flex items-center justify-center oscilloscope-display rounded-lg border border-border/30">
                <div className="text-center space-y-3">
                  <div className="font-display text-2xl font-bold neon-text tracking-wider">SYSTEM READY</div>
                  <p className="text-muted-foreground text-xs uppercase tracking-widest opacity-60">
                    Awaiting Signal Parameters...
                  </p>
                  <div className="flex gap-1 justify-center opacity-30">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="w-1 h-6 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Tab bar */}
                <div className="flex gap-1">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        px-4 py-1.5 rounded text-[9px] font-bold tracking-widest transition-all
                        ${activeTab === tab.key ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-transparent text-muted-foreground hover:text-white'}
                      `}
                    >
                      {tab.label.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'waveform' && (
                  <>
                    <div className="flex-1 min-h-0 bg-black/20 rounded-lg border border-border/30" style={{ flex: '2 1 0' }}>
                      <WaveformChart
                        time={time}
                        original={original}
                        faulted={faulted}
                        showOriginal={showOriginal && hasFaults}
                      />
                    </div>
                    <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0' }}>
                      <div className="flex-1 bg-black/20 rounded-lg border border-border/30">
                        {fft && <FFTChart frequencies={fft.frequencies} magnitudes={fft.magnitudes} />}
                      </div>
                      <div className="flex-1 bg-black/20 rounded-lg border border-border/30">
                        <HistogramChart signal={faulted} />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'spectral' && (
                  <>
                    <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0' }}>
                      <div className="flex-1 bg-black/20 rounded-lg border border-border/30">
                        {psd && <PSDChart frequencies={psd.frequencies} power={psd.power} />}
                      </div>
                      <div className="flex-1 bg-black/20 rounded-lg border border-border/30">
                        {fft && <FFTChart frequencies={fft.frequencies} magnitudes={fft.magnitudes} />}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 bg-black/20 rounded-lg border border-border/30" style={{ flex: '1 1 0' }}>
                      {stft && (
                        <SpectrogramChart
                          times={stft.times}
                          frequencies={stft.frequencies}
                          power={stft.power}
                        />
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'advanced' && (
                  <>
                    <div className="flex-1 min-h-0 bg-black/20 rounded-lg border border-border/30" style={{ flex: '1 1 0' }}>
                      {windowedStats && windowedStats.length > 0 && (
                        <FeatureTrendChart stats={windowedStats} />
                      )}
                    </div>
                    <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0' }}>
                      <div className="flex-1 bg-black/20 rounded-lg border border-border/30">
                        <HistogramChart signal={faulted} />
                      </div>
                      <div className="flex-1 bg-black/20 rounded-lg border border-border/30">
                        {psd && <PSDChart frequencies={psd.frequencies} power={psd.power} />}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </main>

          {/* Right Sidebar - Stats */}
          {generated && stats && (
            <aside className="w-[200px] shrink-0 border-l border-border/50 overflow-y-auto p-3 space-y-3 bg-black/20">
              <FormulaPanel
                type="generator"
                signalType={isSweepEnabled ? 'sine' : signalType}
                params={params}
                faultConfig={faultConfig}
              />
              <StatsDisplay stats={stats} label={hasFaults ? 'Faulted Stats' : 'Signal Stats'} />
            </aside>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
