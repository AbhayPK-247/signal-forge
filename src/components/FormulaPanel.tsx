import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { SignalType, SignalParams, MultiFaultConfig } from '@/lib/signalEngine';
import { ModType, ModParams } from '@/lib/modulationEngine';

interface FormulaPanelProps {
    type: 'generator' | 'modulation';
    signalType?: SignalType;
    params?: SignalParams;
    faultConfig?: MultiFaultConfig;
    modType?: ModType;
    modParams?: ModParams;
    useSweepMessage?: boolean;
}

const FormulaPanel: React.FC<FormulaPanelProps> = ({
    type,
    signalType,
    params,
    faultConfig,
    modType,
    modParams,
    useSweepMessage
}) => {
    const getGeneratorFormula = () => {
        if (!params) return '';
        const { amplitude: A, frequency: f, phase: phi, dcOffset: dc } = params;

        let base = '';
        switch (signalType) {
            case 'sine':
                base = `${A} \\sin(2\\pi ${f}t + ${phi})`;
                break;
            case 'square':
                base = `${A} \\operatorname{sign}(\\sin(2\\pi ${f}t))`;
                break;
            case 'triangle':
                base = `\\frac{2${A}}{\\pi} \\arcsin(\\sin(2\\pi ${f}t))`;
                break;
            case 'sawtooth':
                base = `2${A} (\\frac{t}{T} - \\lfloor 0.5 + \\frac{t}{T} \\rfloor)`;
                break;
            case 'noise':
                base = `N(t, \\sigma=${A})`;
                break;
            case 'impulse':
                base = `${A} \\delta(t)`;
                break;
            case 'step':
                base = `${A} u(t)`;
                break;
            default:
                base = 'x(t)';
        }

        let formula = base;
        if (dc !== 0) formula += ` + ${dc}`;

        // Apply Faults
        if (faultConfig) {
            if (faultConfig.ground_fault.enabled) formula = '0 \\text{ (Ground Fault)}';
            if (faultConfig.signal_clipping.enabled) {
                const v = faultConfig.signal_clipping.severity;
                formula = `\\begin{cases} ${v} & \\text{if } x(t) > ${v} \\\\ -${v} & \\text{if } x(t) < -${v} \\\\ x(t) & \\text{otherwise} \\end{cases}`;
            }
            if (faultConfig.noise_injection.enabled) formula = `${formula} + n(t)`;
            if (faultConfig.sensor_offset.enabled || faultConfig.sensor_drift.enabled) formula = `${formula} + \\Delta_{offset}`;
        }

        return `x(t) = ${formula}`;
    };

    const getModulationFormula = () => {
        if (!modParams) return '';
        const { Ac, Fc, Am, Fm, ka, beta, kp } = modParams;

        let formula = '';
        const m_t = useSweepMessage ? 'm_{sweep}(t)' : `${Am} \\sin(2\\pi ${Fm}t)`;

        switch (modType) {
            case 'AM':
                formula = `${Ac} (1 + ${ka} ${m_t}) \\sin(2\\pi ${Fc}t)`;
                break;
            case 'FM':
                formula = `${Ac} \\sin(2\\pi ${Fc}t + ${beta} \\int ${m_t} dt)`;
                break;
            case 'PM':
                formula = `${Ac} \\sin(2\\pi ${Fc}t + ${kp} ${m_t})`;
                break;
            case 'DSB-SC':
                formula = `${Ac} ${m_t} \\sin(2\\pi ${Fc}t)`;
                break;
            case 'ASK':
                formula = `${Ac} \\cdot \\text{bit}(t) \\cdot \\sin(2\\pi ${Fc}t)`;
                break;
            case 'FSK':
                formula = `${Ac} \\sin(2\\pi f_{bit}(t) t)`;
                break;
            case 'PSK':
                formula = `${Ac} \\sin(2\\pi ${Fc}t + \\phi_{bit}(t))`;
                break;
            case 'QPSK':
                formula = `${Ac} \\sin(2\\pi ${Fc}t + \\frac{\\pi}{4}(2n+1))`;
                break;
            default:
                formula = 's(t)';
        }

        return `s(t) = ${formula}`;
    };

    const formula = type === 'generator' ? getGeneratorFormula() : getModulationFormula();

    return (
        <div className="glass-panel p-4 space-y-3 bg-black/40 backdrop-blur-md border-primary/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Signal Equation Panel</h3>
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="py-4 overflow-x-auto min-h-[80px] flex items-center justify-center bg-black/20 rounded border border-white/5">
                <div className="text-primary/90 text-sm">
                    {formula ? <BlockMath math={formula} /> : <span className="text-muted-foreground italic text-[10px]">No signal data available</span>}
                </div>
            </div>
            <div className="flex justify-between items-center text-[8px] text-muted-foreground uppercase font-bold tracking-widest pt-2 border-t border-white/5">
                <span>Domain: Time (t)</span>
                <span>Rendering: KaTeX/LaTeX</span>
            </div>
        </div>
    );
};

export default FormulaPanel;
