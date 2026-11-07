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
} from 'lucide-react';

interface CameraControlsProps {
  inputSource: 'synthetic' | 'webcam' | 'upload';
  onChangeInputSource: (src: 'synthetic' | 'webcam' | 'upload') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  playbackSpeed: number;
  onChangeSpeed: (spd: number) => void;
  syntheticFaultMode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag';
  onChangeFaultMode: (mode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag') => void;
  onReset: () => void;
  onOpenReport: () => void;
  onUploadFile: (file: File) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  inputSource,
  onChangeInputSource,
  isMuted,
  onToggleMute,
  playbackSpeed,
  onChangeSpeed,
  syntheticFaultMode,
  onChangeFaultMode,
  onReset,
  onOpenReport,
  onUploadFile,
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
      {/* Input Source Selector */}
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

      {/* Simulator Controls (Active when in Synthetic mode) */}
      {inputSource === 'synthetic' && (
        <div className="flex items-center gap-2">
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
            className="bg-[#141b2d] border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="none">Form: Clean Technique</option>
            <option value="valgus">Inject: Knee Valgus Collapse</option>
            <option value="rounding">Inject: Lumbar Spine Rounding</option>
            <option value="kipping">Inject: Kipping Knee Swing</option>
            <option value="sag">Inject: Hip Sagging / Pike</option>
          </select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Mute Toggle */}
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

        {/* Reset Set */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Set</span>
        </button>

        {/* Generate Report */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Session Report</span>
        </button>
      </div>
    </div>
  );
};
