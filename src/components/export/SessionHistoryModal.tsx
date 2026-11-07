import React from 'react';
import { History, X, Download, Trash2, Trophy } from 'lucide-react';
import { RepetitionEvent } from '../../engine/types';

export interface SavedWorkoutSession {
  id: string;
  timestamp: string;
  exerciseId: string;
  exerciseName: string;
  totalReps: number;
  validReps: number;
  averageRom: number;
  averageFormScore: number;
  reps: RepetitionEvent[];
}

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedWorkoutSession[];
  onClearHistory: () => void;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const exportAllToCsv = () => {
    if (sessions.length === 0) return;

    const headers = [
      'Session ID',
      'Date & Time',
      'Exercise Name',
      'Rep Number',
      'Peak ROM',
      'Concentric (ms)',
      'Eccentric (ms)',
      'Form Score (%)',
      'Faults',
      'Verdict',
    ];

    const rows: string[][] = [];

    sessions.forEach(s => {
      if (s.reps && s.reps.length > 0) {
        s.reps.forEach(r => {
          rows.push([
            s.id,
            s.timestamp,
            s.exerciseName,
            `#${r.repNumber}`,
            `${r.peakRom}`,
            `${r.concentricMs}`,
            `${r.eccentricMs}`,
            `${r.romScore}`,
            `"${r.faults.join('; ')}"`,
            r.passed ? 'PASSED' : 'FAULTED',
          ]);
        });
      } else {
        rows.push([
          s.id,
          s.timestamp,
          s.exerciseName,
          'Total Summary',
          `${s.averageRom}`,
          '0',
          '0',
          `${s.averageFormScore}`,
          'None',
          'COMPLETED',
        ]);
      }
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `posecraft_telemetry_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e1322]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-sm tracking-wide uppercase text-slate-200">
              Workout Session History & Telemetry Logs
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No previous workout sessions saved. Complete a set to log telemetry to local storage.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{s.exerciseName}</h3>
                      <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">
                        {s.validReps} / {s.totalReps} Valid Reps
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      {new Date(s.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Avg ROM</span>
                      <strong className="text-blue-300">{s.averageRom}°</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Form Score</span>
                      <strong className="text-emerald-400">{s.averageFormScore}%</strong>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>PR Set</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0e1322]">
          <button
            onClick={onClearHistory}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-950/30 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportAllToCsv}
              disabled={sessions.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Raw CSV Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
