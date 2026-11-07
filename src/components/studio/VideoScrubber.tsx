import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Compass } from 'lucide-react';

interface VideoScrubberProps {
  videoElement: HTMLVideoElement | null;
  isProtractorActive: boolean;
  onToggleProtractor: () => void;
  onClearProtractor: () => void;
}

export const VideoScrubber: React.FC<VideoScrubberProps> = ({
  videoElement,
  isProtractorActive,
  onToggleProtractor,
  onClearProtractor,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  useEffect(() => {
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [videoElement]);

  // Keyboard navigation: Left/Right arrows for frame step, Space for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoElement) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoElement.paused) videoElement.play();
        else videoElement.pause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        videoElement.currentTime = Math.min(videoElement.duration, videoElement.currentTime + 0.033);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoElement]);

  const togglePlay = () => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoElement) return;
    const time = parseFloat(e.target.value);
    videoElement.currentTime = time;
    setCurrentTime(time);
  };

  const stepFrame = (deltaSeconds: number) => {
    if (!videoElement) return;
    videoElement.pause();
    videoElement.currentTime = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + deltaSeconds));
  };

  const changeRate = (rate: number) => {
    if (!videoElement) return;
    videoElement.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3 shadow-xl space-y-2.5">
      {/* Scrubber Timeline Bar */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-slate-400 w-14">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <span className="text-[11px] font-mono text-slate-500 w-14 text-right">
          {formatTime(duration)}
        </span>
      </div>

      {/* Playback Controls & Protractor Tool */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          {/* Step Back 1 Frame */}
          <button
            onClick={() => stepFrame(-0.033)}
            title="Step Back 1 Frame (Left Arrow)"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-md transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Step Forward 1 Frame */}
          <button
            onClick={() => stepFrame(0.033)}
            title="Step Forward 1 Frame (Right Arrow)"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 ml-2 bg-[#141b2d] px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
            {[0.25, 0.5, 1.0].map(rate => (
              <button
                key={rate}
                onClick={() => changeRate(rate)}
                className={`px-1.5 py-0.5 rounded ${
                  playbackRate === rate
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Custom Angle Protractor Tool */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleProtractor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isProtractorActive
                ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-sm ring-1 ring-rose-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isProtractorActive ? 'Protractor Active' : 'Measure 3-Point Angle'}</span>
          </button>

          {isProtractorActive && (
            <button
              onClick={onClearProtractor}
              className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
