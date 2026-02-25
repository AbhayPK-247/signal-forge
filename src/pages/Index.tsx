import { useState, useCallback, useMemo } from 'react';
import {
  type SignalType,
  type SignalParams,
  type MultiFaultConfig,
  DEFAULT_PARAMS,
  createDefaultMultiFaultConfig,
  generateTimeVector,
  generateSignal,
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

type AnalysisTab = 'waveform' | 'spectral' | 'advanced';

const Index = () => {
  const [signalType, setSignalType] = useState<SignalType>('sine');
  const [params, setParams] = useState<SignalParams>(DEFAULT_PARAMS);
  const [faultConfig, setFaultConfig] = useState<MultiFaultConfig>(createDefaultMultiFaultConfig());
  const [showOriginal, setShowOriginal] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('waveform');

  const [time, setTime] = useState<number[]>([]);
  const [original, setOriginal] = useState<number[]>([]);
  const [faulted, setFaulted] = useState<number[]>([]);

  const hasFaults = useMemo(() => hasActiveFaults(faultConfig), [faultConfig]);

  const generate = useCallback(() => {
    const t = generateTimeVector(params);
    const sig = generateSignal(signalType, params, t);
    const fSig = applyMultiFault(sig, t, faultConfig);
    setTime(t);
    setOriginal(sig);
    setFaulted(fSig);
    setGenerated(true);
  }, [signalType, params, faultConfig]);

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
    <div className="min-h-screen bg-background grid-background">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-neon" />
          <h1 className="font-display text-sm font-bold tracking-wider neon-text">
            SIGNAL GENERATOR
          </h1>
          <span className="text-[10px] text-muted-foreground tracking-wider">v2.0</span>
        </div>
        <div className="flex items-center gap-2">
          {generated && (
            <>
              <button onClick={exportCSV} className="signal-button text-[10px]">
                Export CSV
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOriginal}
                  onChange={e => setShowOriginal(e.target.checked)}
                  className="accent-primary w-3 h-3"
                />
                <span className="label-text">Compare</span>
              </label>
            </>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-41px)]">
        {/* Left Sidebar */}
        <aside className="w-[260px] shrink-0 border-r border-border/50 overflow-y-auto p-3 space-y-3">
          <SignalControls
            signalType={signalType}
            params={params}
            onSignalTypeChange={setSignalType}
            onParamsChange={setParams}
            onGenerate={generate}
            onReset={reset}
          />
          <FaultControls config={faultConfig} onChange={handleFaultConfigChange} />
        </aside>

        {/* Center - Charts */}
        <main className="flex-1 flex flex-col p-3 gap-3 min-w-0">
          {!generated ? (
            <div className="flex-1 flex items-center justify-center oscilloscope-display">
              <div className="text-center space-y-3">
                <div className="font-display text-2xl font-bold neon-text tracking-wider">READY</div>
                <p className="text-muted-foreground text-sm">
                  Select a signal type, configure faults, and click Generate
                </p>
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-1 h-6 bg-primary/30 rounded-full"
                      style={{ animationDelay: `${i * 0.15}s` }}
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
                    className={`signal-button text-[10px] ${activeTab === tab.key ? 'signal-button-active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'waveform' && (
                <>
                  <div className="flex-1 min-h-0" style={{ flex: '2 1 0' }}>
                    <WaveformChart
                      time={time}
                      original={original}
                      faulted={faulted}
                      showOriginal={showOriginal && hasFaults}
                    />
                  </div>
                  <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0' }}>
                    <div className="flex-1">
                      {fft && <FFTChart frequencies={fft.frequencies} magnitudes={fft.magnitudes} />}
                    </div>
                    <div className="flex-1">
                      <HistogramChart signal={faulted} />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'spectral' && (
                <>
                  <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0' }}>
                    <div className="flex-1">
                      {psd && <PSDChart frequencies={psd.frequencies} power={psd.power} />}
                    </div>
                    <div className="flex-1">
                      {fft && <FFTChart frequencies={fft.frequencies} magnitudes={fft.magnitudes} />}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0" style={{ flex: '1 1 0' }}>
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
                  <div className="flex-1 min-h-0" style={{ flex: '1 1 0' }}>
                    {windowedStats && windowedStats.length > 0 && (
                      <FeatureTrendChart stats={windowedStats} />
                    )}
                  </div>
                  <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0' }}>
                    <div className="flex-1">
                      <HistogramChart signal={faulted} />
                    </div>
                    <div className="flex-1">
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
          <aside className="w-[200px] shrink-0 border-l border-border/50 overflow-y-auto p-3">
            <StatsDisplay stats={stats} label={hasFaults ? 'Faulted Stats' : 'Signal Stats'} />
          </aside>
        )}
      </div>
    </div>
  );
};

export default Index;
