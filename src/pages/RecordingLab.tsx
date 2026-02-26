import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { useRecorder } from '@/hooks/useRecorder';
import {
    type StoredRecording,
    encodeWAV,
    generateRecordingCSV,
    generateDataset
} from '@/lib/recordingEngine';
import RecordingControls from '@/components/RecordingControls';
import RecordingDisplay from '@/components/RecordingDisplay';
import RecordingLibrary from '@/components/RecordingLibrary';
import RecordingAnalysis from '@/components/RecordingAnalysis';
import { toast } from 'sonner';

const RecordingLab = () => {
    const navigate = useNavigate();
    const {
        status, buffer, duration, start, stop, clear, replay, pause,
        getCurrentChunk, getFrequencyData
    } = useRecorder();

    const [recordings, setRecordings] = useState<StoredRecording[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [speed, setSpeed] = useState(1.0);

    const activeRecording = recordings.find(r => r.id === selectedId);

    // Track status transitions to handle automatic saving safely
    const prevStatus = useRef(status);

    useEffect(() => {
        // When status changes from recording to idle/error, save the buffer
        if (prevStatus.current === 'recording' && (status === 'idle' || status === 'error')) {
            if (buffer && buffer.length > 0) {
                const newRec: StoredRecording = {
                    id: crypto.randomUUID(),
                    label: `Recording ${recordings.length + 1}`,
                    timestamp: Date.now(),
                    sampleRate: 44100,
                    samples: new Float32Array(buffer), // Ensure we have a fresh copy
                    duration: duration
                };
                setRecordings(prev => [newRec, ...prev]);
                setSelectedId(newRec.id);
                toast.success('Recording saved to library');
            }
        }
        prevStatus.current = status;
    }, [status, buffer, duration, recordings.length]);

    const handleStop = useCallback(() => {
        stop();
    }, [stop]);

    const handleDelete = useCallback((id: string) => {
        setRecordings(prev => prev.filter(r => r.id !== id));
        if (selectedId === id) setSelectedId(null);
    }, [selectedId]);

    const handleExport = useCallback((id: string, format: 'wav' | 'csv') => {
        const rec = recordings.find(r => r.id === id);
        if (!rec) return;

        try {
            const blob = format === 'wav'
                ? encodeWAV(rec.samples, rec.sampleRate)
                : new Blob([generateRecordingCSV(rec.samples, rec.sampleRate)], { type: 'text/csv' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${rec.label.replace(/\s+/g, '_')}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported as ${format.toUpperCase()}`);
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Export failed - signal might be too large for browser memory');
        }
    }, [recordings]);

    const handleGenerateDataset = useCallback(async () => {
        if (!activeRecording) {
            toast.error('Select a recording first');
            return;
        }

        const t = toast.loading('Generating dataset zip...');
        try {
            const zip = new JSZip();
            const segments = generateDataset(activeRecording, 0.5); // 0.5s segments

            const folder = zip.folder(`${activeRecording.label.replace(/\s+/g, '_')}_dataset`);
            if (!folder) throw new Error('Could not create folder in ZIP');

            segments.forEach((seg, i) => {
                // We'll export as WAV as it's more standard and compact than CSV for raw data
                const wavBlob = encodeWAV(seg.samples, activeRecording.sampleRate);
                folder.file(`${seg.label.replace(/\s+/g, '_')}_seg${i + 1}.wav`, wavBlob);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeRecording.label.replace(/\s+/g, '_')}_dataset.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.dismiss(t);
            toast.success('Dataset ZIP generated successfully');
        } catch (err) {
            console.error('ZIP generation failed:', err);
            toast.dismiss(t);
            toast.error('Failed to generate ZIP dataset');
        }
    }, [activeRecording]);

    const handleModulate = useCallback(() => {
        if (!activeRecording) return;
        // Bridge to Modulation Lab
        sessionStorage.setItem('bridge_signal', JSON.stringify(Array.from(activeRecording.samples.slice(0, 50000))));
        sessionStorage.setItem('bridge_fs', activeRecording.sampleRate.toString());
        navigate('/modulation?source=real');
    }, [activeRecording, navigate]);

    return (
        <div className="min-h-screen bg-background grid-background overflow-hidden flex flex-col">
            {/* Header */}
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-md px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-black tracking-tighter text-primary uppercase">Recording Lab v1.0</h1>
                    <nav className="flex items-center gap-1">
                        <Link to="/" className="text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-1">Signal Gen</Link>
                        <Link to="/modulation" className="text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-1">Modulation</Link>
                        <Link to="/real-signal" className="text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-1">Real Lab</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{status}</span>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Controls */}
                <aside className="w-72 border-r border-white/5 flex flex-col overflow-y-auto custom-scrollbar bg-black/20">
                    <RecordingControls
                        status={status}
                        duration={duration}
                        replaySpeed={speed}
                        onStart={start}
                        onStop={handleStop}
                        onClear={clear}
                        onReplay={replay}
                        onPause={pause}
                        onSpeedChange={setSpeed}
                        onSave={(fmt) => selectedId && handleExport(selectedId, fmt)}
                        onGenerateDataset={handleGenerateDataset}
                    />

                    {activeRecording && (
                        <div className="p-3">
                            <button
                                onClick={handleModulate}
                                className="action-button w-full text-[10px] py-2 bg-primary/20 border-primary/50 text-primary hover:bg-primary/40 shadow-lg shadow-primary/10"
                            >
                                Send to Modulation Lab →
                            </button>
                        </div>
                    )}

                    {activeRecording && <RecordingAnalysis samples={activeRecording.samples} />}
                </aside>

                {/* Main: Visualizer */}
                <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
                    <div className="flex-1 min-h-0 bg-black/40 border border-white/5 rounded-xl p-4 shadow-2xl relative">
                        {/* Oscilloscope Grid Effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }} />

                        <RecordingDisplay
                            getCurrentChunk={getCurrentChunk}
                            getFrequencyData={getFrequencyData}
                            isLive={status === 'recording'}
                        />
                    </div>
                </main>

                {/* Right Sidebar: Library */}
                <aside className="w-64 border-l border-white/5 bg-black/20 flex flex-col">
                    <RecordingLibrary
                        recordings={recordings}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onDelete={handleDelete}
                        onExport={handleExport}
                    />
                </aside>
            </div>
        </div>
    );
};

export default RecordingLab;
