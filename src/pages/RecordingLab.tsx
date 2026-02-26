import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import MainLayout from '@/components/MainLayout';
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
    const prevStatus = useRef(status);

    useEffect(() => {
        if (prevStatus.current === 'recording' && (status === 'idle' || status === 'error')) {
            if (buffer && buffer.length > 0) {
                const newRec: StoredRecording = {
                    id: crypto.randomUUID(),
                    label: `Recording ${recordings.length + 1}`,
                    timestamp: Date.now(),
                    sampleRate: 44100,
                    samples: new Float32Array(buffer),
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
            toast.error('Export failed');
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
            const segments = generateDataset(activeRecording, 0.5);
            const folder = zip.folder(`${activeRecording.label.replace(/\s+/g, '_')}_dataset`);
            if (!folder) throw new Error('Could not create folder in ZIP');

            segments.forEach((seg, i) => {
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
            toast.dismiss(t);
            toast.error('Failed to generate ZIP dataset');
        }
    }, [activeRecording]);

    const handleModulate = useCallback(() => {
        if (!activeRecording) return;
        sessionStorage.setItem('bridge_signal', JSON.stringify(Array.from(activeRecording.samples.slice(0, 50000))));
        sessionStorage.setItem('bridge_fs', activeRecording.sampleRate.toString());
        navigate('/modulation?source=real');
    }, [activeRecording, navigate]);

    return (
        <MainLayout activeLab="recording">
            <div className="flex h-full overflow-hidden">
                <aside className="w-72 border-r border-white/5 flex flex-col overflow-y-auto bg-black/20">
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
                                className="signal-button w-full text-[10px] py-3 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                            >
                                Send to Modulation Lab →
                            </button>
                        </div>
                    )}

                    {activeRecording && <RecordingAnalysis samples={activeRecording.samples} />}
                </aside>

                <main className="flex-1 flex flex-col p-4 overflow-hidden relative bg-black/5">
                    <div className="flex-1 min-h-0 bg-black/40 border border-white/5 rounded-xl p-4 shadow-2xl relative">
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
        </MainLayout>
    );
};

export default RecordingLab;
