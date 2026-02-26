import { type StoredRecording } from '@/lib/recordingEngine';

interface RecordingLibraryProps {
    recordings: StoredRecording[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onExport: (id: string, format: 'wav' | 'csv') => void;
}

const RecordingLibrary = ({
    recordings, selectedId, onSelect, onDelete, onExport
}: RecordingLibraryProps) => {
    return (
        <div className="glass-panel p-4 flex flex-col h-full space-y-3 animate-fade-in text-slate-200">
            <h3 className="section-title text-primary border-b border-white/10 pb-2">Recording Library</h3>

            {recordings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-2 py-10">
                    <span className="text-4xl text-slate-600">🗂️</span>
                    <p className="text-xs uppercase tracking-widest">No recordings found</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {recordings.map(rec => (
                        <div
                            key={rec.id}
                            className={`p-3 rounded-lg border transition-all cursor-pointer group ${selectedId === rec.id ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                            onClick={() => onSelect(rec.id)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-bold truncate pr-2 ${selectedId === rec.id ? 'text-primary' : ''}`}>
                                    {rec.label}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                    {new Date(rec.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                <span>⏱ {rec.duration.toFixed(1)}s</span>
                                <span>Hz {rec.sampleRate}</span>
                            </div>

                            {/* Hover Actions */}
                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onExport(rec.id, 'wav'); }}
                                    className="bg-white/10 hover:bg-white/20 p-1 px-2 rounded text-[9px] uppercase font-bold"
                                >
                                    WAV
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onExport(rec.id, 'csv'); }}
                                    className="bg-white/10 hover:bg-white/20 p-1 px-2 rounded text-[9px] uppercase font-bold"
                                >
                                    CSV
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }}
                                    className="bg-red-500/10 hover:bg-red-500/30 text-red-400 p-1 px-2 rounded text-[9px] uppercase font-bold ml-auto"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-2 border-t border-white/10 text-[9px] text-slate-500 italic">
                Total Space: {(recordings.reduce((a, b) => a + b.samples.length, 0) * 4 / (1024 * 1024)).toFixed(1)} MB
            </div>
        </div>
    );
};

export default RecordingLibrary;
