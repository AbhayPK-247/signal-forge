import { useState } from 'react';
import {
    type ModType,
    type ModParams,
    ANALOG_MOD_TYPES,
    DIGITAL_MOD_TYPES,
    DEFAULT_MOD_PARAMS,
    generateRandomBits,
} from '@/lib/modulationEngine';
import type { MultiFaultConfig } from '@/lib/signalEngine';
import FaultControls from '@/components/FaultControls';

interface ModulationControlsProps {
    modType: ModType;
    params: ModParams;
    showDemod: boolean;
    faultConfig: MultiFaultConfig;
    onModTypeChange: (t: ModType) => void;
    onParamsChange: (p: ModParams) => void;
    onDemodToggle: (v: boolean) => void;
    onFaultChange: (c: MultiFaultConfig) => void;
    onGenerate: () => void;
    onReset: () => void;
    onExport: () => void;
    isRealSource?: boolean;
}

const Row = ({
    label, children,
}: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
        <label className="label-text w-16 shrink-0">{label}</label>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);

const NumInput = ({
    value, onChange, step = 0.1, min, max,
}: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) => (
    <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="control-input w-full"
    />
);

const ModulationControls = ({
    modType, params, showDemod, faultConfig,
    onModTypeChange, onParamsChange, onDemodToggle,
    onFaultChange, onGenerate, onReset, onExport,
    isRealSource = false,
}: ModulationControlsProps) => {
    const [bitsText, setBitsText] = useState(params.bits.join(''));
    const update = (key: keyof ModParams, value: unknown) =>
        onParamsChange({ ...params, [key]: value });

    const isDigital = (DIGITAL_MOD_TYPES as ModType[]).includes(modType);

    const handleBitsChange = (text: string) => {
        setBitsText(text);
        const bits = text.trim().split('').filter(c => c === '0' || c === '1').map(Number);
        update('bits', bits.length > 0 ? bits : DEFAULT_MOD_PARAMS.bits);
    };

    const handleAutoGenBits = () => {
        const bits = generateRandomBits(8);
        setBitsText(bits.join(''));
        update('bits', bits);
    };

    return (
        <div className="glass-panel p-3 space-y-3 animate-fade-in">
            {/* Modulation type */}
            <div className="section-title">Analog Modulation</div>
            <div className="grid grid-cols-3 gap-1">
                {ANALOG_MOD_TYPES.map(t => (
                    <button
                        key={t}
                        onClick={() => onModTypeChange(t)}
                        className={`signal-button text-[9px] ${modType === t ? 'signal-button-active' : ''}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="section-title pt-1">Digital Modulation</div>
            <div className="grid grid-cols-2 gap-1">
                {DIGITAL_MOD_TYPES.map(t => (
                    <button
                        key={t}
                        onClick={() => onModTypeChange(t)}
                        className={`signal-button text-[9px] ${modType === t ? 'signal-button-active' : ''}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Common Params */}
            <div className="section-title pt-1">Carrier</div>
            <div className="space-y-1.5">
                <Row label="Ac (V)"><NumInput value={params.Ac} onChange={v => update('Ac', v)} min={0} /></Row>
                <Row label="Fc (Hz)"><NumInput value={params.Fc} onChange={v => update('Fc', v)} step={10} min={1} /></Row>
            </div>

            <div className="section-title pt-1 flex items-center justify-between">
                <span>Message</span>
                {isRealSource && <span className="text-[9px] bg-primary/20 text-primary px-1.5 rounded uppercase font-bold tracking-tighter">Real Signal</span>}
            </div>
            <div className={`space-y-1.5 ${isRealSource ? 'opacity-50 pointer-events-none' : ''}`}>
                <Row label="Am (V)"><NumInput value={params.Am} onChange={v => update('Am', v)} min={0} /></Row>
                <Row label="Fm (Hz)"><NumInput value={params.Fm} onChange={v => update('Fm', v)} step={1} min={0.1} /></Row>
            </div>

            <div className="section-title pt-1">Sampling</div>
            <div className="space-y-1.5">
                <Row label="Fs (S/s)"><NumInput value={params.Fs} onChange={v => update('Fs', v)} step={500} min={100} /></Row>
                <Row label="T (s)"><NumInput value={params.T} onChange={v => update('T', v)} step={0.05} min={0.01} /></Row>
            </div>

            {/* Analog-specific */}
            {modType === 'AM' && (
                <>
                    <div className="section-title pt-1">AM Index (ka)</div>
                    <div className="flex items-center gap-2">
                        <input
                            type="range" min={0} max={1.5} step={0.05}
                            value={params.ka}
                            onChange={e => update('ka', parseFloat(e.target.value))}
                            className="flex-1"
                        />
                        <span className="label-text w-8 text-right">{params.ka.toFixed(2)}</span>
                    </div>
                </>
            )}
            {modType === 'FM' && (
                <div className="space-y-1.5">
                    <div className="section-title pt-1">FM Index (β)</div>
                    <Row label="β"><NumInput value={params.beta} onChange={v => update('beta', v)} step={0.5} min={0} /></Row>
                </div>
            )}
            {modType === 'PM' && (
                <div className="space-y-1.5">
                    <div className="section-title pt-1">Phase Sensitivity (kp)</div>
                    <Row label="kp"><NumInput value={params.kp} onChange={v => update('kp', v)} step={0.1} min={0} /></Row>
                </div>
            )}

            {/* Digital-specific */}
            {isDigital && (
                <>
                    <div className="section-title pt-1">Digital Params</div>
                    <div className="space-y-1.5">
                        <Row label="Bit Rate"><NumInput value={params.bitRate} onChange={v => update('bitRate', v)} step={5} min={1} /></Row>
                        {modType === 'FSK' && (
                            <>
                                <Row label="F1 (Hz)"><NumInput value={params.F1} onChange={v => update('F1', v)} step={10} min={1} /></Row>
                                <Row label="F0 (Hz)"><NumInput value={params.F0} onChange={v => update('F0', v)} step={10} min={1} /></Row>
                            </>
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="label-text flex-1">Bit Sequence</span>
                            <button onClick={handleAutoGenBits} className="signal-button text-[9px]">Auto</button>
                        </div>
                        <input
                            type="text"
                            value={bitsText}
                            onChange={e => handleBitsChange(e.target.value)}
                            placeholder="e.g. 10110100"
                            className="control-input w-full font-mono text-xs"
                            maxLength={32}
                        />
                        <p className="text-[10px] text-muted-foreground">Only 0s and 1s</p>
                    </div>
                </>
            )}

            {/* Demodulation */}
            <div className="section-title pt-1">Demodulation</div>
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={showDemod}
                    onChange={e => onDemodToggle(e.target.checked)}
                    className="accent-primary w-3 h-3"
                />
                <span className="label-text">Show Demodulated Signal</span>
            </label>

            {/* Fault Controls */}
            <FaultControls config={faultConfig} onChange={onFaultChange} />

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button onClick={onGenerate} className="action-button flex-1 text-xs">Generate</button>
                <button onClick={onReset} className="signal-button flex-1 text-[10px]">Reset</button>
            </div>
            <button onClick={onExport} className="signal-button w-full text-[10px]">Export CSV</button>
        </div>
    );
};

export default ModulationControls;
