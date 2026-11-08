import React, { useState } from 'react';
import {
  customExerciseManager,
  CustomExerciseDefinition,
} from '../../engine/custom_exercise';
import { ExerciseCategory, LandmarkIndex } from '../../engine/types';
import { Wrench, Plus, Trash2, Download, Upload, Check, X, ShieldAlert } from 'lucide-react';

interface CustomExerciseStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (id: string, category: ExerciseCategory) => void;
}

const JOINT_PRESETS = [
  {
    name: 'Knee Flexion (Squat / Lunge / Leg Press)',
    primaryJointName: 'Knee Flexion',
    proximal: LandmarkIndex.LEFT_HIP,
    vertex: LandmarkIndex.LEFT_KNEE,
    distal: LandmarkIndex.LEFT_ANKLE,
    startAngle: 165,
    inflectionAngle: 140,
    peakAngle: 80,
    isDescendingPhase: true,
  },
  {
    name: 'Elbow Flexion (Bicep Curl / Arm Flex)',
    primaryJointName: 'Elbow Angle',
    proximal: LandmarkIndex.LEFT_SHOULDER,
    vertex: LandmarkIndex.LEFT_ELBOW,
    distal: LandmarkIndex.LEFT_WRIST,
    startAngle: 160,
    inflectionAngle: 130,
    peakAngle: 60,
    isDescendingPhase: true,
  },
  {
    name: 'Hip Hinge (RDL / Good Morning / Deadlift)',
    primaryJointName: 'Hip Hinge',
    proximal: LandmarkIndex.LEFT_SHOULDER,
    vertex: LandmarkIndex.LEFT_HIP,
    distal: LandmarkIndex.LEFT_KNEE,
    startAngle: 170,
    inflectionAngle: 145,
    peakAngle: 95,
    isDescendingPhase: true,
  },
  {
    name: 'Shoulder Abduction (Lateral Raise / Overhead)',
    primaryJointName: 'Shoulder Angle',
    proximal: LandmarkIndex.LEFT_HIP,
    vertex: LandmarkIndex.LEFT_SHOULDER,
    distal: LandmarkIndex.LEFT_ELBOW,
    startAngle: 25,
    inflectionAngle: 50,
    peakAngle: 95,
    isDescendingPhase: false, // ascending
  },
];

export const CustomExerciseStudio: React.FC<CustomExerciseStudioProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
}) => {
  const [exercises, setExercises] = useState<CustomExerciseDefinition[]>(() =>
    customExerciseManager.getAll()
  );
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form fields
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<ExerciseCategory>('barbell');
  const [description, setDescription] = useState<string>('');
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [startAngle, setStartAngle] = useState<number>(165);
  const [inflectionAngle, setInflectionAngle] = useState<number>(140);
  const [peakAngle, setPeakAngle] = useState<number>(80);
  const [isDescendingPhase, setIsDescendingPhase] = useState<boolean>(true);
  const [checkValgus, setCheckValgus] = useState<boolean>(true);
  const [checkSpine, setCheckSpine] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSelectPreset = (idx: number) => {
    setPresetIndex(idx);
    const p = JOINT_PRESETS[idx];
    setStartAngle(p.startAngle);
    setInflectionAngle(p.inflectionAngle);
    setPeakAngle(p.peakAngle);
    setIsDescendingPhase(p.isDescendingPhase);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const p = JOINT_PRESETS[presetIndex];
    const newDef: CustomExerciseDefinition = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      category,
      description: description.trim() || `User-defined ${p.primaryJointName} protocol`,
      primaryJointName: p.primaryJointName,
      proximalLandmark: p.proximal,
      vertexLandmark: p.vertex,
      distalLandmark: p.distal,
      startAngle,
      inflectionAngle,
      peakAngle,
      isDescendingPhase,
      safetyChecks: {
        checkValgus,
        checkSpine,
      },
      createdAt: Date.now(),
    };

    customExerciseManager.save(newDef);
    setExercises(customExerciseManager.getAll());
    setIsCreating(false);
    setName('');
    setDescription('');
  };

  const handleDelete = (id: string) => {
    customExerciseManager.delete(id);
    setExercises(customExerciseManager.getAll());
  };

  const handleExport = () => {
    const jsonStr = customExerciseManager.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posecraft_custom_exercises_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const count = customExerciseManager.importJson(content);
        if (count > 0) {
          setExercises(customExerciseManager.getAll());
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/80 border border-cyan-800/60 rounded-lg text-cyan-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Custom Exercise Studio
              </h2>
              <p className="text-xs text-slate-400">
                Visual no-code kinematic rule editor and joint range-of-motion architect
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isCreating ? (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Registered Custom Protocols ({exercises.length})
                </span>
                <div className="flex items-center gap-2">
                  <label className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                  <button
                    onClick={handleExport}
                    disabled={exercises.length === 0}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Protocol</span>
                  </button>
                </div>
              </div>

              {/* List */}
              {exercises.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No custom exercises defined yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click &ldquo;Create Protocol&rdquo; to build your own kinematic movement rule.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {exercises.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 flex items-center justify-between gap-4 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{item.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-cyan-400 mt-2">
                          <span>Joint: {item.primaryJointName}</span>
                          <span>•</span>
                          <span>Start: {item.startAngle}°</span>
                          <span>•</span>
                          <span>Peak Target: {item.peakAngle}°</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectExercise(item.id, item.category);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
                        >
                          Train Now
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Builder Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">New Kinematic Rule</span>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zercher Squat or Incline DB Press"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Suite Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="barbell">Barbell & Hypertrophy</option>
                    <option value="calisthenics">Calisthenics & Bodyweight</option>
                    <option value="unilateral">Unilateral & Symmetry</option>
                    <option value="conditioning">Conditioning & Functional</option>
                    <option value="athletic">Athletic Power</option>
                    <option value="rehab">Kinetotherapy & Rehab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Joint Kinematic Model
                  </label>
                  <select
                    value={presetIndex}
                    onChange={(e) => handleSelectPreset(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {JOINT_PRESETS.map((p, idx) => (
                      <option key={p.name} value={idx}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Angles Configuration */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                <span className="text-xs font-semibold text-slate-200">
                  Dual-Threshold Angle Parameters
                </span>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Starting Lockout Angle</span>
                    <span className="font-mono text-cyan-400">{startAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    value={startAngle}
                    onChange={(e) => setStartAngle(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Hysteresis Inflection Threshold</span>
                    <span className="font-mono text-cyan-400">{inflectionAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    value={inflectionAngle}
                    onChange={(e) => setInflectionAngle(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Target Peak ROM (Rep Depth)</span>
                    <span className="font-mono text-cyan-400">{peakAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    value={peakAngle}
                    onChange={(e) => setPeakAngle(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* Safety checks */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Active Biomechanical Safety Guards
                </span>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkValgus}
                    onChange={(e) => setCheckValgus(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Monitor Frontal Knee Valgus Collapse (&lt;0.82 ratio)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSpine}
                    onChange={(e) => setCheckSpine(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Monitor Lumbar Spinal Flexion Rounding (&gt;22° deviation)</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Register Exercise</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
