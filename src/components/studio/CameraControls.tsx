import React, { useRef } from 'react';
import {
  Camera,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  FileVideo,
  FileSpreadsheet,
  Sparkles,
  Mic,
  MicOff,
  History,
  BookmarkCheck,
  Timer,
  Compass,
  Ghost,
  Printer,
  Radio,
  Rotate3d,
  Waves,
  Wrench,
  Columns,
  Globe,
} from 'lucide-react';
import { AthleteLevelTier, ATHLETE_PROFILES } from '../../engine/athlete_level';
import { VoiceLanguage } from '../../engine/voice_commander';

interface CameraControlsProps {
  inputSource: 'synthetic' | 'webcam' | 'upload';
  onChangeInputSource: (src: 'synthetic' | 'webcam' | 'upload') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isVoiceCoachEnabled: boolean;
  onToggleVoiceCoach: () => void;
  playbackSpeed: number;
  onChangeSpeed: (spd: number) => void;
  syntheticFaultMode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag';
  onChangeFaultMode: (mode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag') => void;
  onReset: () => void;
  onOpenReport: () => void;
  onOpenHistory: () => void;
  onSaveSet: () => void;
  onUploadFile: (file: File) => void;
  hasRepsToSave: boolean;
  athleteTier: AthleteLevelTier;
  onChangeAthleteTier: (tier: AthleteLevelTier) => void;
  isVoiceCommanderActive: boolean;
  onToggleVoiceCommander: () => void;
  onStartCountdown: (seconds: number) => void;
  showCenterOfMass: boolean;
  onToggleCenterOfMass: () => void;
  showGhostOverlay: boolean;
  onToggleGhostOverlay: () => void;
  onOpenPrintableReport: () => void;
  isOrbit3DOpen: boolean;
  onToggleOrbit3D: () => void;
  isSonificationEnabled: boolean;
  onToggleSonification: () => void;
  onOpenCustomStudio: () => void;
  onOpenDualView: () => void;
  voiceLanguage: VoiceLanguage;
  onChangeVoiceLanguage: (lang: VoiceLanguage) => void;
  currentLoadKg: number;
  onChangeLoadKg: (kg: number) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  inputSource,
  onChangeInputSource,
  isMuted,
  onToggleMute,
  isVoiceCoachEnabled,
  onToggleVoiceCoach,
  playbackSpeed,
  onChangeSpeed,
  syntheticFaultMode,
  onChangeFaultMode,
  onReset,
  onOpenReport,
  onOpenHistory,
  onSaveSet,
  onUploadFile,
  hasRepsToSave,
  athleteTier,
  onChangeAthleteTier,
  isVoiceCommanderActive,
  onToggleVoiceCommander,
  onStartCountdown,
  showCenterOfMass,
  onToggleCenterOfMass,
  showGhostOverlay,
  onToggleGhostOverlay,
  onOpenPrintableReport,
  isOrbit3DOpen,
  onToggleOrbit3D,
  isSonificationEnabled,
  onToggleSonification,
  onOpenCustomStudio,
  onOpenDualView,
  voiceLanguage,
  onChangeVoiceLanguage,
  currentLoadKg,
  onChangeLoadKg,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
      onChangeInputSource('upload');
    }
  };

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
      {/* 1. Input Source & Athlete Level Tier */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[#141b2d] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onChangeInputSource('synthetic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              inputSource === 'synthetic'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kinematic Sim</span>
          </button>

          <button
            onClick={() => onChangeInputSource('webcam')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              inputSource === 'webcam'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              inputSource === 'upload'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileVideo className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Athlete Experience Tier Selector */}
        <select
          value={athleteTier}
          onChange={e => onChangeAthleteTier(e.target.value as AthleteLevelTier)}
          className="bg-[#141b2d] border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          title="Athlete Biomechanical Tolerance Tier"
        >
          {Object.values(ATHLETE_PROFILES).map(p => (
            <option key={p.id} value={p.id}>
              Tier: {p.badge} ({p.title.split(' ')[0]})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Simulator & Kinematic Overlays */}
      <div className="flex items-center gap-2 flex-wrap">
        {inputSource === 'synthetic' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-[#141b2d] px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <Play className="w-3 h-3 text-slate-400" />
              {[0.5, 1.0, 1.5].map(spd => (
                <button
                  key={spd}
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Fault Mode Selector */}
            <select
              value={syntheticFaultMode}
              onChange={e => onChangeFaultMode(e.target.value as 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag')}
              className="w-full sm:w-auto max-w-[240px] bg-[#141b2d] border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="none">Form: Clean Technique</option>
              <option value="valgus">Inject: Knee Valgus Collapse</option>
              <option value="rounding">Inject: Lumbar Spine Rounding</option>
              <option value="kipping">Inject: Kipping Knee Swing</option>
              <option value="sag">Inject: Hip Sagging / Pike</option>
            </select>
          </div>
        )}

        {/* Pre-Set Countdown Button */}
        <button
          onClick={() => onStartCountdown(5)}
          title="Trigger 5-Second Hands-Free Countdown"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141b2d] border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-all"
        >
          <Timer className="w-3.5 h-3.5 text-cyan-400" />
          <span>5s Count</span>
        </button>

        {/* Center of Mass (CoM) Toggle */}
        <button
          onClick={onToggleCenterOfMass}
          title="Toggle Dempster Center of Mass Reticle & Ground Projection"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            showCenterOfMass
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/80'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>CoM</span>
        </button>

        {/* Ghost Overlay Toggle */}
        <button
          onClick={onToggleGhostOverlay}
          title="Toggle Ghost Mode (Overlay of best repetition trajectory)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            showGhostOverlay
              ? 'bg-purple-950/60 text-purple-300 border-purple-700/80 shadow-sm'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}
        >
          <Ghost className="w-3.5 h-3.5" />
          <span>Ghost</span>
        </button>

        {/* 3D Orbit Viewport Toggle */}
        <button
          onClick={onToggleOrbit3D}
          title="Toggle 3D Orbit Skeleton Viewport (Metric 3D coordinates)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isOrbit3DOpen
              ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>3D View</span>
        </button>

        {/* Audio Sonification Biofeedback */}
        <button
          onClick={onToggleSonification}
          title={isSonificationEnabled ? 'Continuous Acoustic Biofeedback ON' : 'Enable Acoustic Biofeedback Sonification'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isSonificationEnabled
              ? 'bg-amber-950/70 text-amber-300 border-amber-500 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Sonify</span>
        </button>

        {/* Barbell Load Input (kg) */}
        <div className="flex items-center gap-1 bg-[#141b2d] px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
          <span className="text-[11px] text-slate-400">Load:</span>
          <input
            type="number"
            min="0"
            max="500"
            step="2.5"
            placeholder="0"
            value={currentLoadKg || ''}
            onChange={(e) => onChangeLoadKg(Number(e.target.value) || 0)}
            className="w-12 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-cyan-300 font-mono text-center focus:outline-none focus:border-cyan-500"
            title="Barbell or added external load in kg (used for 1RM prediction & power calculation)"
          />
          <span className="text-[11px] text-slate-400">kg</span>
        </div>
      </div>

      {/* 3. Action Buttons & Voice Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Voice Commander Language Switcher */}
        <button
          onClick={() => onChangeVoiceLanguage(voiceLanguage === 'en-US' ? 'ro-RO' : 'en-US')}
          title="Toggle Voice Command Language (English / Romanian)"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#141b2d] border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
        >
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>{voiceLanguage === 'en-US' ? 'EN' : 'RO'}</span>
        </button>

        {/* Hands-Free Voice Commander */}
        <button
          onClick={onToggleVoiceCommander}
          title={isVoiceCommanderActive ? 'Voice Commander Active (Listening...)' : 'Enable Voice Commander'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            isVoiceCommanderActive
              ? 'bg-rose-950/70 border-rose-500 text-rose-300 animate-pulse'
              : 'bg-[#141b2d] border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-rose-400" />
          <span>{isVoiceCommanderActive ? 'Voice ON' : 'Voice'}</span>
        </button>

        {/* Voice Coach Audio Toggle */}
        <button
          onClick={onToggleVoiceCoach}
          title={isVoiceCoachEnabled ? 'Voice Coach Active (Click to Mute Voice)' : 'Voice Coach Muted (Click to Enable)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isVoiceCoachEnabled
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/80'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
        >
          {isVoiceCoachEnabled ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Coach</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
          className={`p-2 rounded-lg border transition-all ${
            isMuted
              ? 'bg-slate-800 text-slate-500 border-slate-700'
              : 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 hover:bg-cyan-900/40'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Save Set */}
        {hasRepsToSave && (
          <button
            onClick={onSaveSet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/40 text-xs font-semibold shadow-sm transition-all"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save</span>
          </button>
        )}

        {/* History Modal */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-all"
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>History</span>
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset</span>
        </button>

        {/* Custom Exercise Studio */}
        <button
          onClick={onOpenCustomStudio}
          title="Open Custom Exercise Kinematic Studio (No-Code Rule Builder)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 text-xs font-medium transition-all"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Studio</span>
        </button>

        {/* Dual View Comparison */}
        <button
          onClick={onOpenDualView}
          title="Dual-View Side-by-Side Benchmark Form Comparison"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 text-xs font-medium transition-all"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dual</span>
        </button>

        {/* Clinical PDF Print Report */}
        <button
          onClick={onOpenPrintableReport}
          title="Printable Physical Therapy Clinical Report"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Full Modal Report */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>
      </div>
    </div>
  );
};
