import { type SignalParams, type SignalType, SIGNAL_LABELS } from '@/lib/signalEngine';

interface SignalControlsProps {
  signalType: SignalType;
  params: SignalParams;
  onSignalTypeChange: (type: SignalType) => void;
  onParamsChange: (params: SignalParams) => void;
  onGenerate: () => void;
  onReset: () => void;
}

const SIGNAL_TYPES: SignalType[] = ['sine', 'square', 'triangle', 'sawtooth', 'impulse', 'step', 'noise'];

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
  const updateParam = (key: keyof SignalParams, value: number) => {
    onParamsChange({ ...params, [key]: value });
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
