import React, { useState, useEffect } from 'react';
import { PRESET_ROUTINES, WorkoutRoutine } from '../../engine/routine';
import { Layers, Play, ChevronRight, RotateCcw, Clock } from 'lucide-react';

interface RoutineBuilderProps {
  activeRoutine: WorkoutRoutine | null;
  currentStep: number;
  currentRepsCount: number;
  onStartRoutine: (routine: WorkoutRoutine) => void;
  onNextStep: () => void;
  onCancelRoutine: () => void;
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({
  activeRoutine,
  currentStep,
  currentRepsCount,
  onStartRoutine,
  onNextStep,
  onCancelRoutine,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);

  // Handle rest timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isResting && restSecondsLeft > 0) {
      interval = setInterval(() => {
        setRestSecondsLeft(prev => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restSecondsLeft]);

  const currentExercise = activeRoutine?.exercises[currentStep];

  // Auto trigger rest when target reps reached
  useEffect(() => {
    if (currentExercise && currentRepsCount >= currentExercise.targetReps && !isResting) {
      setIsResting(true);
      setRestSecondsLeft(currentExercise.restSecondsBetweenSets);
    }
  }, [currentRepsCount, currentExercise, isResting]);

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3 shadow-xl">
      {/* Active Routine Status Bar */}
      {activeRoutine ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121826] border border-cyan-900/40 p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 font-bold text-xs">
              {currentStep + 1}/{activeRoutine.exercises.length}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">{activeRoutine.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                  {currentExercise?.exerciseName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Target: {currentExercise?.targetReps} reps per set ({currentRepsCount}/{currentExercise?.targetReps})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isResting && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs font-mono font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>Rest: {restSecondsLeft}s</span>
              </div>
            )}

            <button
              onClick={onNextStep}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow transition-all"
            >
              <span>Next Exercise</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onCancelRoutine}
              title="Exit Routine Mode"
              className="p-1 rounded-md bg-slate-800 text-slate-400 hover:text-white transition-all text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Structured Workout Circuits & Clinical Protocols
              </span>
            </div>
            <button
              onClick={() => setIsOpen(prev => !prev)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all"
            >
              {isOpen ? 'Close Routines' : 'Browse Routines (3 Presets)'}
            </button>
          </div>

          {/* Routine List Dropdown */}
          {isOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800/80">
              {PRESET_ROUTINES.map(routine => (
                <div
                  key={routine.id}
                  className="p-3 rounded-lg bg-[#141b2d] border border-slate-800 hover:border-cyan-500/50 flex flex-col justify-between transition-all"
                >
                  <div>
                    <h3 className="font-bold text-xs text-slate-200">{routine.title}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {routine.description}
                    </p>
                    <div className="mt-2 space-y-1">
                      {routine.exercises.map((ex, i) => (
                        <div key={i} className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                          <span>{ex.exerciseName}</span>
                          <span>{ex.targetSets}x{ex.targetReps}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onStartRoutine(routine);
                      setIsOpen(false);
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800/60 font-bold text-xs transition-all"
                  >
                    <Play className="w-3 h-3" />
                    <span>Launch Protocol</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
