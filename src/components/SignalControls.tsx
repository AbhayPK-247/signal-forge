import { type SignalParams, type SignalType, SIGNAL_LABELS } from '@/lib/signalEngine';

interface SignalControlsProps {
  signalType: SignalType;
  params: SignalParams;
  onSignalTypeChange: (type: SignalType) => void;
  onParamsChange: (params: SignalParams) => void;
  onGenerate: () => void;
  onReset: () => void;
}

const SIGNAL_TYPES: SignalType[] = ['sine', 'square', 'triangle', 'sawtooth', 'impulse', 'step', 'noise', 'harmonics'];

const ParamInput = ({
  label,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
}) => (
  <div className="flex items-center gap-2">
    <label className="label-text w-16 shrink-0">{label}</label>
    <input
      type="number"
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      step={step}
      min={min}
      className="control-input flex-1 min-w-0"
    />
    {unit && <span className="label-text w-6 text-right">{unit}</span>}
  </div>
);

const SignalControls = ({
  signalType,
  params,
  onSignalTypeChange,
  onParamsChange,
  onGenerate,
  onReset,
}: SignalControlsProps) => {
  const updateParam = (key: keyof SignalParams, value: any) => {
    onParamsChange({ ...params, [key]: value });
  };

  const updateHarmonic = (index: number, value: number) => {
    const harms = [...(params.harmonics || [0, 0, 0, 0])];
    harms[index] = value;
    updateParam('harmonics', harms);
  };

  return (
    <div className="glass-panel p-3 space-y-3 animate-fade-in">
      <div className="section-title">Signal Type</div>
      <div className="grid grid-cols-2 gap-1.5">
        {SIGNAL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => onSignalTypeChange(type)}
            className={`signal-button text-[10px] ${signalType === type ? 'signal-button-active' : ''}`}
          >
            {SIGNAL_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="section-title pt-2">Parameters</div>
      <div className="space-y-2">
        <ParamInput label="Amp" value={params.amplitude} onChange={v => updateParam('amplitude', v)} unit="V" />
        <ParamInput label="Freq" value={params.frequency} onChange={v => updateParam('frequency', v)} unit="Hz" step={1} min={0.1} />
        <ParamInput label="Phase" value={params.phase} onChange={v => updateParam('phase', v)} unit="rad" step={0.1} />
        <ParamInput label="DC" value={params.dcOffset} onChange={v => updateParam('dcOffset', v)} unit="V" />
        <ParamInput label="Fs" value={params.samplingRate} onChange={v => updateParam('samplingRate', v)} unit="S/s" step={100} min={10} />
        <ParamInput label="Dur" value={params.duration} onChange={v => updateParam('duration', v)} unit="s" step={0.1} min={0.01} />

        {signalType === 'harmonics' && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Harmonics</div>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] text-muted-foreground">H{i + 2} ({((i + 2) * params.frequency).toFixed(0)}Hz)</span>
                  <span className="text-[9px] text-primary">{(params.harmonics?.[i] || 0).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={params.harmonics?.[i] || 0}
                  onChange={(e) => updateHarmonic(i, parseFloat(e.target.value))}
                  className="w-full accent-primary h-1"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onGenerate} className="action-button flex-1 text-xs">
          Generate
        </button>
        <button onClick={onReset} className="signal-button flex-1">
          Reset
        </button>
      </div>
    </div>
  );
};

export default SignalControls;
