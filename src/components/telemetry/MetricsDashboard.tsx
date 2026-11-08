import React from 'react';
import { FrameMetrics, ExerciseRule } from '../../engine/types';
import { VbtRepetitionData } from '../../engine/vbt';
import { ShieldAlert, Zap, Clock, TrendingUp, Gauge, Compass } from 'lucide-react';

interface MetricsDashboardProps {
  metrics: FrameMetrics | null;
  rule: ExerciseRule;
  fps: number;
  vbtData?: VbtRepetitionData | null;
  comBalanceStatus?: 'optimal' | 'heel_heavy' | 'toe_heavy' | null;
  comOffset?: number;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  rule,
  fps,
  vbtData,
  comBalanceStatus = 'optimal',
  comOffset = 0,
}) => {
  const repCount = metrics?.repCount ?? 0;
  const primaryVal = metrics?.primaryMetric ?? 0;
  const formScore = metrics?.formScore ?? 100;
  const repState = metrics?.repState ?? 'IDLE';

  // Status color based on form score
  let scoreColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
  let scoreLabel = 'Optimal Biomechanics';
  if (formScore < 70) {
    scoreColor = 'text-red-400 border-red-500/40 bg-red-950/20';
    scoreLabel = 'Form Fault Detected';
  } else if (formScore < 85) {
    scoreColor = 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    scoreLabel = 'Moderate Form Drift';
  }

  // State badge styling
  const stateBadgeColors: Record<string, string> = {
    IDLE: 'bg-slate-800 text-slate-400 border-slate-700',
    ARMED: 'bg-cyan-950/60 text-cyan-400 border-cyan-800',
    CONCENTRIC: 'bg-blue-950/60 text-blue-400 border-blue-800',
    PEAK: 'bg-purple-950/60 text-purple-300 border-purple-800',
    ECCENTRIC: 'bg-amber-950/60 text-amber-400 border-amber-800',
    COMPLETED: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* 1. Repetition Counter */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Reps
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              stateBadgeColors[repState] || stateBadgeColors.IDLE
            }`}
          >
            {repState}
          </span>
        </div>
        <div className="text-3xl font-extrabold font-mono text-cyan-300 tracking-tight">
          {repCount}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex justify-between items-center">
          <span>Dual-Threshold Hysteresis</span>
          <span className="text-cyan-400 font-bold">{fps} FPS</span>
        </div>
      </div>

      {/* 2. Primary Joint Metric */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] truncate flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            {rule.primaryMetricLabel}
          </span>
          <span className="text-[10px] font-mono text-slate-500">{rule.primaryMetricUnit}</span>
        </div>
        <div className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
          {primaryVal}
          <span className="text-sm font-normal text-slate-400 ml-1">{rule.primaryMetricUnit}</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
          Target: {rule.primaryMetricLabel}
        </div>
      </div>

      {/* 3. Real-Time Form Score */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> Form Score
          </span>
          <span className="text-[10px] font-mono text-slate-500">100 max</span>
        </div>
        <div className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
          {formScore}
          <span className="text-sm font-normal text-slate-400 ml-1">%</span>
        </div>
        <div className="mt-0.5">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${scoreColor}`}>
            {scoreLabel}
          </span>
        </div>
      </div>

      {/* 4. Velocity-Based Training (VBT) Mean Velocity */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-pink-400" /> VBT Velocity
          </span>
          <span className="text-[10px] font-mono text-slate-500">m/s</span>
        </div>
        <div className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight flex items-baseline gap-2 flex-wrap">
          <span>{vbtData ? vbtData.meanConcentricVelocity : '0.65'}</span>
          <span className="text-xs font-normal text-slate-400">m/s</span>
          {vbtData && vbtData.velocityLossPercent > 0 && (
            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
              vbtData.fatigueWarning
                ? 'bg-red-950/60 border-red-500 text-red-300'
                : 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
            }`}>
              -{vbtData.velocityLossPercent}% drop
            </span>
          )}
          {vbtData && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/80 text-indigo-300">
              RPE {vbtData.estimatedRpe} ({vbtData.repsInReserve} RIR)
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex justify-between items-center truncate">
          <span>{vbtData ? vbtData.zone.replace(/_/g, ' ').toUpperCase() : 'OPTIMAL HYPERTROPHY ZONE'}</span>
          {vbtData?.estimated1RmKg && (
            <span className="text-emerald-400 font-bold">1RM: {vbtData.estimated1RmKg} kg</span>
          )}
        </div>
      </div>

      {/* 5. Center of Mass & Ground Balance */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" /> CoM Balance
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
            comBalanceStatus === 'optimal'
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
              : 'bg-amber-950 text-amber-400 border-amber-800'
          }`}>
            {(comBalanceStatus || 'optimal').replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        {/* Balance spectrum bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full mt-2 relative overflow-hidden border border-slate-800">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-500 z-10"></div>
          <div
            className="absolute top-0 bottom-0 w-3 bg-cyan-400 rounded-full shadow-sm transition-all"
            style={{ left: `${Math.max(5, Math.min(95, 50 + comOffset * 40))}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
          <span>Heel</span>
          <span className="text-emerald-400 font-bold">Midfoot Center</span>
          <span>Toe</span>
        </div>
      </div>

      {/* 6. Active Biomechanical Telemetry */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Kinematic Telemetry
          </span>
          <span className="text-[10px] font-mono text-cyan-400">Scale-Invariant</span>
        </div>
        <div className="space-y-1 mt-1 text-[11px] font-mono">
          {metrics &&
            Object.entries(metrics.telemetry)
              .slice(0, 2)
              .map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-semibold text-cyan-200">{String(val)}</span>
                </div>
              ))}
          {(!metrics || Object.keys(metrics.telemetry).length === 0) && (
            <div className="text-slate-500 text-[11px] italic">Calibrating anatomical vectors...</div>
          )}
        </div>
      </div>
    </div>
  );
};
