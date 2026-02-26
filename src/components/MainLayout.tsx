import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Activity,
    Filter,
    Radio,
    Zap,
    Database,
    Waves,
    Mic,
    Monitor
} from 'lucide-react';

interface MainLayoutProps {
    children: React.ReactNode;
    activeLab: string;
}

const labs = [
    { id: 'oscilloscope', name: 'Oscilloscope', path: '/', icon: Activity },
    { id: 'sweep', name: 'Sweep Gen', path: '/sweep', icon: Zap },
    { id: 'filters', name: 'Filter Lab', path: '/filter', icon: Filter },
    { id: 'spectrum', name: 'Spectrum Lab', path: '/spectrum', icon: Waves },
    { id: 'communication', name: 'Comm Lab', path: '/communication', icon: Zap },
    { id: 'modulation', name: 'Modulation', path: '/modulation', icon: Radio },
    { id: 'real-signal', name: 'Real Signal', path: '/real-signal', icon: Zap },
    { id: 'recording', name: 'Recording', path: '/recording', icon: Mic },
    { id: 'bode', name: 'Bode Plot', path: '/bode', icon: Activity },
    { id: 'system', name: 'System Sim', path: '/system', icon: Monitor },
    { id: 'virtual', name: 'Virtual Lab', path: '/virtual', icon: Monitor },
    { id: 'datasets', name: 'Dataset Lab', path: '/dataset', icon: Database },
];

const MainLayout = ({ children, activeLab }: MainLayoutProps) => {
    return (
        <div className="min-h-screen bg-background grid-background flex flex-col overflow-hidden">
            {/* Top Professional Navigation */}
            <header className="h-14 border-b border-border/50 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                            <Activity className="w-4 h-4 text-black font-bold" />
                        </div>
                        <span className="font-display font-black tracking-tighter text-lg neon-text-cyan">SIGNAL FORGE <span className="text-muted-foreground font-light">PRO</span></span>
                    </div>

                    <nav className="flex items-center gap-1">
                        {labs.map(lab => (
                            <Link
                                key={lab.id}
                                to={lab.path}
                                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200
                  ${activeLab === lab.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'text-muted-foreground hover:text-white hover:bg-white/5'}
                `}
                            >
                                <lab.icon className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{lab.name}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">System Status</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-primary animate-pulse">● STABLE</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {/* Subtle Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                {children}
            </div>

            {/* Professional Footer Bar */}
            <footer className="h-6 border-t border-border/50 bg-black/60 backdrop-blur-md flex items-center justify-between px-4 shrink-0 pointer-events-none">
                <div className="flex gap-4">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Engine: v2.4.0-PRO</span>
                    <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Buffer: 1024KB</span>
                </div>
                <div className="flex gap-4">
                    <span className="text-[8px] text-primary/60 uppercase font-black tracking-widest">Advanced Signal Processing Suite 2024</span>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
