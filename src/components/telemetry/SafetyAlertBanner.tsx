import React from 'react';
import { SafetyAlert } from '../../engine/types';
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';

interface SafetyAlertBannerProps {
  alerts: SafetyAlert[];
}

export const SafetyAlertBanner: React.FC<SafetyAlertBannerProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Biomechanical Form Optimal: Joints aligned within safe physiological tolerances.</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400/80">Zero Critical Hazards</span>
      </div>
    );
  }

  const primaryAlert = alerts[0];
  const isDanger = primaryAlert.level === 'danger';

  return (
    <div
      className={`rounded-xl px-4 py-3 flex items-start gap-3 border shadow-lg transition-all animate-pulse ${
        isDanger
          ? 'bg-red-950/40 border-red-500/60 text-red-200'
          : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
      }`}
    >
      {isDanger ? (
        <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <span>{primaryAlert.name}</span>
            {primaryAlert.currentValue !== undefined && primaryAlert.thresholdValue !== undefined && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40">
                {primaryAlert.currentValue} (Limit: {primaryAlert.thresholdValue})
              </span>
            )}
          </h4>
          <span className="text-[10px] font-mono opacity-80 uppercase font-semibold">
            {primaryAlert.level}
          </span>
        </div>
        <p className="text-xs mt-0.5 opacity-90 leading-relaxed font-sans">{primaryAlert.message}</p>
      </div>
    </div>
  );
};
