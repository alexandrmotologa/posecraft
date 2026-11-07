import React, { useState } from 'react';
import { EXERCISE_SUITES, createExerciseRule } from '../../exercises/registry';
import { ExerciseCategory } from '../../engine/types';
import { Search, Camera, Activity, CheckCircle2 } from 'lucide-react';

interface ExerciseSelectorProps {
  selectedExerciseId: string;
  onSelectExercise: (id: string, suite: ExerciseCategory) => void;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  selectedExerciseId,
  onSelectExercise,
}) => {
  const [activeSuiteId, setActiveSuiteId] = useState<ExerciseCategory>('barbell');
  const [searchQuery, setSearchQuery] = useState('');

  const currentSuite = EXERCISE_SUITES.find(s => s.id === activeSuiteId) || EXERCISE_SUITES[0];

  const filteredModuleIds = currentSuite.moduleIds.filter(id => {
    if (!searchQuery) return true;
    const rule = createExerciseRule(id);
    return (
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header & Suite Tabs */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            Biomechanical Exercise Catalog
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            28 Modules
          </span>
        </div>

        {/* Search */}
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#141b2d] border border-slate-700/60 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Suite Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5 mb-4">
        {EXERCISE_SUITES.map(suite => {
          const isActive = suite.id === activeSuiteId;
          return (
            <button
              key={suite.id}
              onClick={() => setActiveSuiteId(suite.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-cyan-500/15 border border-cyan-500/50 text-cyan-200 shadow-sm'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className="text-sm">{suite.icon}</span>
              <div className="truncate">
                <div className="truncate">{suite.name.split(' ')[0]}</div>
                <div className="text-[10px] text-slate-500 font-mono">{suite.badge}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredModuleIds.map(moduleId => {
          const rule = createExerciseRule(moduleId);
          const isSelected = moduleId === selectedExerciseId;

          const perspectiveLabel =
            rule.cameraPerspective === 'side_profile'
              ? 'Sagittal (Side)'
              : rule.cameraPerspective === 'front_facing'
              ? 'Frontal'
              : 'Any Perspective';

          return (
            <button
              key={moduleId}
              onClick={() => onSelectExercise(moduleId, currentSuite.id)}
              className={`relative p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-gradient-to-br from-cyan-950/40 to-slate-900/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-[#121826]/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-semibold text-xs text-slate-200 truncate">{rule.name}</h3>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                {rule.description}
              </p>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800/50 pt-2">
                <span className="flex items-center gap-1 text-slate-400">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  {perspectiveLabel}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold">
                  {rule.primaryMetricLabel} ({rule.primaryMetricUnit})
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
