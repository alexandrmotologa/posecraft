import React, { useState } from 'react';
import { Columns, Play, Pause, RotateCcw, X, CheckCircle, Activity, Sparkles } from 'lucide-react';
import { RepetitionEvent } from '../../engine/types';

interface DualViewComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  currentRep?: RepetitionEvent | null;
  exerciseName: string;
}

export const DualViewComparison: React.FC<DualViewComparisonProps> = ({
  isOpen,
  onClose,
  currentRep,
  exerciseName,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scrubPercent, setScrubPercent] = useState<number>(50);

  if (!isOpen) return null;

  // Benchmark reference values for this exercise
  const benchmarkRom = 78;
  const benchmarkConcentricMs = 820;
  const benchmarkEccentricMs = 1600;

  const currentRom = currentRep ? currentRep.peakRom : 82;
  const currentConcentric = currentRep ? currentRep.concentricMs : 950;
  const currentEccentric = currentRep ? currentRep.eccentricMs : 1450;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-950/80 border border-indigo-800/60 rounded-lg text-indigo-400">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Dual-View Biomechanical Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Synchronous side-by-side kinematic matching: Current Athlete vs Benchmark Gold Standard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panel 1: Current Athlete Set */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-white">Active Set Performance</h3>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">
                    Rep #{currentRep?.repNumber || 1}
                  </span>
                </div>

                {/* Simulated Wireframe Canvas Projection */}
                <div className="relative w-full aspect-video bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                  <div className="text-center p-4">
                    <Activity className="w-8 h-8 mx-auto text-cyan-400 mb-2 opacity-80" />
                    <p className="text-xs font-medium text-slate-300">{exerciseName}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Peak Depth: <strong className="text-white">{currentRom}°</strong> • Concentric:{' '}
                      <strong className="text-white">{(currentConcentric / 1000).toFixed(2)}s</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics table */}
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Depth</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{currentRom}°</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Concentric</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">
                    {(currentConcentric / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Eccentric</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">
                    {(currentEccentric / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Score</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {currentRep?.romScore || 94}%
                  </span>
                </div>
              </div>
            </div>

            {/* Panel 2: Gold-Standard Clinical Benchmark */}
            <div className="rounded-xl border border-indigo-900/40 bg-slate-950/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-900/40">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-300">Gold Standard Benchmark</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                    Clinical Ref
                  </span>
                </div>

                <div className="relative w-full aspect-video bg-indigo-950/20 rounded-lg border border-indigo-900/30 overflow-hidden flex items-center justify-center">
                  <div className="text-center p-4">
                    <CheckCircle className="w-8 h-8 mx-auto text-indigo-400 mb-2 opacity-80" />
                    <p className="text-xs font-medium text-slate-300">Biomechanical Optimal Model</p>
                    <p className="text-[11px] font-mono text-indigo-300 mt-1">
                      Optimal Depth: <strong className="text-white">{benchmarkRom}°</strong> • Target
                      Tempo: <strong className="text-white">2-1-1-0</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics table */}
              <div className="mt-4 pt-3 border-t border-indigo-900/40 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                  <span className="text-[10px] text-indigo-300 block">Target Depth</span>
                  <span className="font-mono font-bold text-indigo-400 text-sm">{benchmarkRom}°</span>
                </div>
                <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                  <span className="text-[10px] text-indigo-300 block">Target Up</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">
                    {(benchmarkConcentricMs / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                  <span className="text-[10px] text-indigo-300 block">Target Down</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">
                    {(benchmarkEccentricMs / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                  <span className="text-[10px] text-indigo-300 block">Target Score</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Synchronous Phase Scrubber */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title={isPlaying ? 'Pause Scrubber' : 'Play Scrubber'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setScrubPercent(0)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  title="Reset to 0%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-400 font-medium flex items-center gap-1.5 ml-1">
                  <Columns className="w-3.5 h-3.5 text-cyan-400" />
                  Synchronous Repetition Scrubber
                </span>
              </div>
              <span className="font-mono text-cyan-400">Cycle Phase: {scrubPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={scrubPercent}
              onChange={(e) => setScrubPercent(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% (Lockout Start)</span>
              <span>50% (Peak Eccentric Inflection)</span>
              <span>100% (Concentric Finish)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
