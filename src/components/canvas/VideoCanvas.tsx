import React, { useState, useRef, useEffect } from 'react';
import { CameraPerspective } from '../../engine/types';
import { Camera, AlertCircle, Video, Download, Maximize2, Minimize2, Mic } from 'lucide-react';

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  exerciseName: string;
  cameraPerspective: CameraPerspective;
  detectedPerspective: CameraPerspective;
  inputSource: 'synthetic' | 'webcam' | 'upload';
  cameraActive: boolean;
  modelLoading: boolean;
  videoUrl: string | null;
  countdownSeconds?: number;
  isCountdownActive?: boolean;
  lastVoiceCommand?: string | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  videoRef,
  canvasRef,
  exerciseName,
  cameraPerspective,
  detectedPerspective,
  inputSource,
  cameraActive,
  modelLoading,
  videoUrl,
  countdownSeconds = 0,
  isCountdownActive = false,
  lastVoiceCommand = null,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationSeconds, setRecordDurationSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Elapsed recording timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDurationSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordDurationSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Check perspective alignment
  const isPerspectiveMismatch =
    cameraPerspective !== 'any' &&
    detectedPerspective !== 'any' &&
    detectedPerspective !== cameraPerspective;

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recordedChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `posecraft_${exerciseName.toLowerCase().replace(/\s+/g, '_')}_hud.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // MediaRecorder fallback
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div
      className={`relative w-full aspect-video bg-[#05070c] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none aspect-auto h-screen' : ''
      }`}
    >
      {/* Hidden/Underlay Video Tag */}
      <video
        ref={videoRef}
        playsInline
        muted
        loop
        autoPlay
        src={videoUrl || undefined}
        className={`absolute inset-0 w-full h-full object-cover ${
          inputSource === 'webcam' ? 'block' : 'hidden'
        }`}
      />

      {/* 60 FPS Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="absolute inset-0 w-full h-full object-contain z-10"
      />

      {/* Hands-Free Pre-Set Countdown Visual Overlay */}
      {isCountdownActive && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <div className="w-24 h-24 rounded-full border-4 border-cyan-400 bg-slate-950/80 flex items-center justify-center text-5xl font-mono font-extrabold text-cyan-300 shadow-2xl shadow-cyan-500/50 animate-bounce">
            {countdownSeconds}
          </div>
          <div className="mt-3 text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 bg-slate-900/90 px-3 py-1 rounded-full border border-cyan-800">
            Assume Starting Position
          </div>
        </div>
      )}

      {/* Voice Commander Recognition Feedback Pill */}
      {lastVoiceCommand && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-25 bg-rose-950/90 border border-rose-500/80 text-rose-200 px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 shadow-xl animate-bounce">
          <Mic className="w-3.5 h-3.5 text-rose-400" />
          <span>Voice: "{lastVoiceCommand}"</span>
        </div>
      )}

      {/* Model Loading State */}
      {modelLoading && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs font-mono text-cyan-300">
            Initializing WebGPU Pose Neural Runtime...
          </div>
        </div>
      )}

      {/* Perspective Sentinel Warning */}
      {isPerspectiveMismatch && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-950/80 border border-amber-500/60 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs text-amber-200 shadow-lg">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>
            Camera Angle Advisory: {exerciseName} recommends{' '}
            <strong className="underline">{cameraPerspective}</strong> view.
          </span>
        </div>
      )}

      {/* Top HUD Badges */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="bg-black/60 backdrop-blur-md border border-slate-800/80 rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-medium text-slate-200">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{exerciseName}</span>
        </div>

        <div className="bg-black/60 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <Camera className={`w-3 h-3 ${cameraActive ? 'text-emerald-400' : 'text-cyan-400'}`} />
          <span className="capitalize">{inputSource} Feed</span>
        </div>

        {/* Live Recording Timer */}
        {isRecording && (
          <div className="bg-red-950/80 backdrop-blur-md border border-red-500/80 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-mono text-red-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>REC {Math.floor(recordDurationSeconds / 60)}:{String(recordDurationSeconds % 60).padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {/* Top-Right HUD Controls (Fullscreen) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Workout HUD'}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white transition-all shadow-md"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
          </button>
        )}
      </div>

      {/* Bottom HUD Controls (Record Video) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium shadow-md transition-all"
          >
            <Video className="w-3.5 h-3.5 text-red-500" />
            <span>Record HUD Video</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-md animate-pulse transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Stop & Export Video</span>
          </button>
        )}
      </div>
    </div>
  );
};
