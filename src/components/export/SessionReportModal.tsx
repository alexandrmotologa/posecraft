import React from 'react';
import { ExerciseSummary, RepetitionEvent } from '../../engine/types';
import { X, Printer, Download, Award, CheckCircle, ShieldAlert, FileCode } from 'lucide-react';
import { downloadTcxFile } from '../../engine/tcx_exporter';

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ExerciseSummary;
  repHistory: RepetitionEvent[];
}

export const SessionReportModal: React.FC<SessionReportModalProps> = ({
  isOpen,
  onClose,
  summary,
  repHistory,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      summary,
      reps: repHistory,
      exportedAt: new Date().toISOString(),
      engine: 'PoseCraft 1.0 (WebGPU / WebAssembly)',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posecraft_report_${summary.exerciseId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTcx = () => {
    downloadTcxFile({
      id: `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
      exerciseId: summary.exerciseId,
      exerciseName: summary.exerciseName,
      totalReps: summary.totalReps,
      validReps: summary.validReps,
      averageRom: summary.averageRom,
      averageFormScore: summary.averageFormScore,
      reps: repHistory,
    });
  };

  const complianceRate =
    summary.totalReps > 0 ? Math.round((summary.validReps / summary.totalReps) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e1322] print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-sm tracking-wide uppercase text-slate-200">
              Biomechanical Athlete Assessment Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Assessment Card */}
        <div className="p-6 space-y-6">
          {/* Header Banner */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-extrabold text-cyan-400 tracking-tight">
                  PoseCraft Biomechanical Movement Studio
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Client-side computer vision motion lab (WebGPU / MediaPipe Pose 33-Keypoints)
                </p>
              </div>
              <div className="text-right text-xs font-mono text-slate-400">
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Status: <span className="text-emerald-400 font-semibold">Verified</span></div>
              </div>
            </div>
          </div>

          {/* Exercise Info & Primary Score */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#121826] p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Movement</div>
              <div className="text-sm font-bold text-white mt-1 truncate">{summary.exerciseName}</div>
            </div>

            <div className="bg-[#121826] p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Valid Reps</div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                {summary.validReps} / {summary.totalReps}
              </div>
            </div>

            <div className="bg-[#121826] p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] uppercase font-semibold text-slate-400">ROM Compliance</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {complianceRate}%
              </div>
            </div>

            <div className="bg-[#121826] p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Average ROM</div>
              <div className="text-xl font-bold font-mono text-blue-300 mt-1">
                {summary.averageRom}°
              </div>
            </div>
          </div>

          {/* Biomechanical Faults Breakdown */}
          <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Safety & Fault Audit
            </h3>
            {Object.keys(summary.faultCounts).length === 0 ||
            Object.values(summary.faultCounts).every(v => v === 0) ? (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Zero physiological faults logged throughout this set. Clean execution.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs font-mono">
                {Object.entries(summary.faultCounts).map(([fault, count]) => (
                  <div key={fault} className="flex justify-between items-center text-slate-300">
                    <span className="capitalize">{fault.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-red-400">{count} incident(s)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repetition Log Table */}
          {repHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Detailed Repetition Sequence
              </h3>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-[#141b2d] text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2">Rep #</th>
                      <th className="p-2">Peak Depth</th>
                      <th className="p-2">Concentric / Eccentric</th>
                      <th className="p-2">Score</th>
                      <th className="p-2 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {repHistory.slice(0, 8).map(rep => (
                      <tr key={rep.repNumber}>
                        <td className="p-2 font-bold text-cyan-400">#{rep.repNumber}</td>
                        <td className="p-2">{rep.peakRom}°</td>
                        <td className="p-2 text-slate-400">{rep.tempoString}</td>
                        <td className="p-2">{rep.romScore}%</td>
                        <td className="p-2 text-right">
                          <span
                            className={rep.passed ? 'text-emerald-400' : 'text-amber-400'}
                          >
                            {rep.passed ? 'Pass' : 'Fault'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-800 bg-[#0e1322] print:hidden">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleExportTcx}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-orange-400 hover:text-orange-300 text-xs font-medium transition-colors"
            title="Export Strava & Garmin Training Center XML"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Garmin .TCX</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Assessment Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
