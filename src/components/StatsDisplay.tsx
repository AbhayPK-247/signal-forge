import type { SignalStats } from '@/lib/signalEngine';

interface StatsDisplayProps {
  stats: SignalStats;
  label?: string;
}

const StatItem = ({ name, value }: { name: string; value: string }) => (
  <div className="flex justify-between items-center py-1 border-b border-border/30 last:border-b-0">
    <span className="label-text">{name}</span>
    <span className="stat-value text-sm">{value}</span>
  </div>
);

const fmt = (n: number) => {
  if (isNaN(n)) return '—';
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(3);
  return n.toFixed(4);
};

const StatsDisplay = ({ stats, label }: StatsDisplayProps) => {
  return (
    <div className="glass-panel p-3 animate-fade-in">
      <div className="section-title mb-2">{label ?? 'Statistics'}</div>
      <div className="space-y-0.5">
        <StatItem name="Mean" value={fmt(stats.mean)} />
        <StatItem name="Std Dev" value={fmt(stats.stdDev)} />
        <StatItem name="RMS" value={fmt(stats.rms)} />
        <StatItem name="Min" value={fmt(stats.min)} />
        <StatItem name="Max" value={fmt(stats.max)} />
        <StatItem name="P-P" value={fmt(stats.peakToPeak)} />
        <StatItem name="Variance" value={fmt(stats.variance)} />
        <StatItem name="Skewness" value={fmt(stats.skewness)} />
        <StatItem name="Kurtosis" value={fmt(stats.kurtosis)} />
        {stats.snr !== null && (
          <StatItem name="SNR (dB)" value={fmt(stats.snr)} />
        )}
      </div>
    </div>
  );
};

export default StatsDisplay;
