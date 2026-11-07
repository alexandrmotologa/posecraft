import React, { useState, useEffect } from 'react';
import { tempoMetronome, TempoPhase } from '../../engine/metronome';
import { Timer, Play, Square } from 'lucide-react';

export const TempoPacer: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [phase, setPhase] = useState<TempoPhase>('eccentric');
  const [secondsLeft, setSecondsLeft] = useState<number>(3);
  const [preset, setPreset] = useState<string>('3-1-1-0');

  useEffect(() => {
    tempoMetronome.setOnTick((newPhase, newSeconds) => {
      setPhase(newPhase);
      setSecondsLeft(newSeconds);
    });

    return () => {
      tempoMetronome.stop();
    };
  }, []);

  const handleToggle = () => {
    if (isRunning) {
      tempoMetronome.stop();
      setIsRunning(false);
    } else {
      tempoMetronome.start();
      setIsRunning(true);
    }
  };

  const handleSelectPreset = (p: string) => {
    setPreset(p);
    const [ecc, pBot, conc, pTop] = p.split('-').map(Number);
    tempoMetronome.setConfig({
      eccentricSeconds: ecc,
      pauseBottomSeconds: pBot,
      concentricSeconds: conc,
      pauseTopSeconds: pTop,
    });
    setPhase('eccentric');
    setSecondsLeft(ecc);
  };

  const phaseColors: Record<TempoPhase, string> = {
    eccentric: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    pause_bottom: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    concentric: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    pause_top: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  const phaseLabels: Record<TempoPhase, string> = {
    eccentric: 'Eccentric (Lowering)',
    pause_bottom: 'Isometric Pause (Hold)',
    concentric: 'Concentric (Explosive Drive)',
    pause_top: 'Lockout Pause',
  };

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3.5 shadow-xl flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Audio Metronome & Tempo Pacer
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Presets */}
        <div className="flex items-center gap-1 bg-[#141b2d] px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
          {['3-1-1-0', '2-0-2-0', '1-0-1-0'].map(p => (
            <button
              key={p}
              onClick={() => handleSelectPreset(p)}
              className={`px-1.5 py-0.5 rounded ${
                preset === p
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Live Phase & Countdown (when running) */}
        {isRunning && (
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2 ${phaseColors[phase]}`}>
            <span>{phaseLabels[phase]}</span>
            <span className="text-sm font-bold">{secondsLeft}s</span>
          </div>
        )}

        {/* Start / Stop Button */}
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isRunning
              ? 'bg-red-600/80 hover:bg-red-600 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Stop Pacer' : 'Start Pacer'}</span>
        </button>
      </div>
    </div>
  );
};
