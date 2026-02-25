import { type FaultType, type FaultParams, FAULT_LABELS } from '@/lib/signalEngine';

interface FaultControlsProps {
  faultType: FaultType;
  faultParams: FaultParams;
  onFaultTypeChange: (type: FaultType) => void;
  onFaultParamsChange: (params: FaultParams) => void;
}

const FAULT_TYPES: FaultType[] = [
  'none', 'ground_fault', 'ground_loop', 'floating_ground', 'emi_rfi',
  'open_circuit', 'short_circuit', 'cable_attenuation', 'impedance_mismatch',
  'noise_injection', 'power_line', 'signal_clipping', 'signal_distortion',
  'sensor_offset', 'sensor_drift', 'sensor_saturation', 'gain_error',
  'quantization_error', 'aliasing', 'timing_jitter', 'sample_loss',
  'power_supply_ripple',
];

const FaultControls = ({
  faultType,
  faultParams,
  onFaultTypeChange,
  onFaultParamsChange,
}: FaultControlsProps) => {
  return (
    <div className="glass-panel p-3 space-y-3 animate-fade-in">
      <div className="section-title">Fault Simulation</div>

      <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1">
        {FAULT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => onFaultTypeChange(type)}
            className={`signal-button w-full text-left text-[10px] ${faultType === type ? 'signal-button-active' : ''}`}
          >
            {FAULT_LABELS[type]}
          </button>
        ))}
      </div>

      {faultType !== 'none' && (
        <div className="space-y-2 pt-2">
          <div className="section-title">Fault Parameters</div>
          <div className="flex items-center gap-2">
            <label className="label-text w-16 shrink-0">Level</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={faultParams.magnitude}
              onChange={e => onFaultParamsChange({ ...faultParams, magnitude: parseFloat(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="label-text w-10 text-right">{faultParams.magnitude.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="label-text w-16 shrink-0">Freq</label>
            <input
              type="number"
              value={faultParams.frequency}
              onChange={e => onFaultParamsChange({ ...faultParams, frequency: parseFloat(e.target.value) || 50 })}
              className="control-input flex-1 min-w-0"
              step={10}
              min={1}
            />
            <span className="label-text w-6 text-right">Hz</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaultControls;
