import React from 'react';
import { RepetitionEvent } from '../../engine/types';
import { CheckCircle2, XCircle, ListFilter } from 'lucide-react';

interface RepTrackerTableProps {
  repHistory: RepetitionEvent[];
  primaryMetricLabel: string;
  primaryMetricUnit: string;
}

export const RepTrackerTable: React.FC<RepTrackerTableProps> = ({
  repHistory,
  primaryMetricLabel,
  primaryMetricUnit,
}) => {
  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Repetition Log & Tempo Telemetry
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Total Completed: <strong className="text-cyan-300">{repHistory.length}</strong>
        </span>
      </div>

      {repHistory.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs font-mono">
          No repetitions logged yet. Begin movement to activate real-time telemetry.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141b2d] text-slate-400 sticky top-0 z-10 text-[10px] uppercase">
              <tr>
                <th className="py-2 px-3">Rep #</th>
                <th className="py-2 px-3">Peak {primaryMetricLabel}</th>
                <th className="py-2 px-3">Concentric / Eccentric</th>
                <th className="py-2 px-3">Form Score</th>
                <th className="py-2 px-3">Biomechanical Faults</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {repHistory.map(rep => (
                <tr key={rep.repNumber} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-cyan-400">#{rep.repNumber}</td>
                  <td className="py-2 px-3">
                    {rep.peakRom}
                    <span className="text-[10px] text-slate-500 ml-0.5">{primaryMetricUnit}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{rep.tempoString}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`font-semibold ${
                        rep.romScore >= 85
                          ? 'text-emerald-400'
                          : rep.romScore >= 70
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {rep.romScore}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px]">
                    {rep.faults.length > 0 ? (
                      <span className="text-red-400 font-sans">{rep.faults.join(', ')}</span>
                    ) : (
                      <span className="text-slate-500 italic">None (Clean)</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {rep.passed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> Faulted
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
