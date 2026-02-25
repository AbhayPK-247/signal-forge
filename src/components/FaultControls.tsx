import {
  type FaultTypeKey,
  type MultiFaultConfig,
  FAULT_TYPE_KEYS,
  FAULT_LABELS,
  SEVERITY_LABELS,
  PERIODIC_FAULTS,
} from '@/lib/signalEngine';

interface FaultControlsProps {
  config: MultiFaultConfig;
  onChange: (config: MultiFaultConfig) => void;
}

const FaultControls = ({ config, onChange }: FaultControlsProps) => {
  const toggleFault = (key: FaultTypeKey) => {
    onChange({
      ...config,
      [key]: { ...config[key], enabled: !config[key].enabled },
    });
  };

  const setSeverity = (key: FaultTypeKey, severity: number) => {
    onChange({
      ...config,
      [key]: { ...config[key], severity },
    });
  };

  const setFrequency = (key: FaultTypeKey, frequency: number) => {
    onChange({
      ...config,
      [key]: { ...config[key], frequency },
    });
  };

  const activeCount = Object.values(config).filter(c => c.enabled).length;

  return (
    <div className="glass-panel p-3 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="section-title">Fault Injection</div>
        {activeCount > 0 && (
          <span className="text-[10px] font-mono text-neon-warning">
            {activeCount} active
          </span>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
        {FAULT_TYPE_KEYS.map(key => {
          const fault = config[key];
          return (
            <div key={key} className={`rounded border transition-all duration-200 ${fault.enabled ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-transparent'}`}>
              {/* Checkbox + Label */}
              <button
                onClick={() => toggleFault(key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
              >
                <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${fault.enabled ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {fault.enabled && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${fault.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                  {FAULT_LABELS[key]}
                </span>
              </button>

              {/* Severity + Frequency (when enabled) */}
              {fault.enabled && (
                <div className="px-2 pb-2 space-y-1.5">
                  {/* Severity slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-10 shrink-0">Level</span>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={fault.severity}
                      onChange={e => setSeverity(key, parseInt(e.target.value))}
                      className="flex-1 accent-primary h-1"
                    />
                    <span className={`text-[9px] w-14 text-right font-mono ${fault.severity >= 4 ? 'text-destructive' : fault.severity >= 2 ? 'text-neon-warning' : 'text-muted-foreground'}`}>
                      {SEVERITY_LABELS[fault.severity]}
                    </span>
                  </div>

                  {/* Frequency (periodic faults only) */}
                  {PERIODIC_FAULTS.has(key) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-10 shrink-0">Freq</span>
                      <input
                        type="number"
                        value={fault.frequency}
                        onChange={e => setFrequency(key, parseFloat(e.target.value) || 50)}
                        className="control-input flex-1 min-w-0 text-[10px] py-0.5"
                        step={10}
                        min={1}
                      />
                      <span className="text-[9px] text-muted-foreground w-6 text-right">Hz</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FaultControls;
