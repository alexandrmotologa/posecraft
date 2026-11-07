import React, { useState, useMemo } from 'react';
import { useWorkoutStore } from './store/useWorkoutStore';
import { usePoseEngine } from './hooks/usePoseEngine';
import { createExerciseRule } from './exercises/registry';
import { ExerciseCategory } from './engine/types';
import { VideoCanvas } from './components/canvas/VideoCanvas';
import { CameraControls } from './components/studio/CameraControls';
import { ExerciseSelector } from './components/studio/ExerciseSelector';
import { MetricsDashboard } from './components/telemetry/MetricsDashboard';
import { SafetyAlertBanner } from './components/telemetry/SafetyAlertBanner';
import { RepTrackerTable } from './components/telemetry/RepTrackerTable';
import { SessionReportModal } from './components/export/SessionReportModal';
import { SessionHistoryModal } from './components/export/SessionHistoryModal';
import { KinematicChart } from './components/telemetry/KinematicChart';
import { TempoPacer } from './components/studio/TempoPacer';
import { VideoScrubber } from './components/studio/VideoScrubber';
import { Activity, ShieldCheck, Cpu, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const store = useWorkoutStore();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Active exercise rule instance
  const currentRule = useMemo(
    () => createExerciseRule(store.selectedExerciseId),
    [store.selectedExerciseId]
  );

  // Initialize Pose Engine
  const {
    videoRef,
    canvasRef,
    fps,
    cameraActive,
    modelLoading,
    isProtractorActive,
    toggleProtractor,
    clearProtractor,
    resetEngine,
  } = usePoseEngine({
    exerciseId: store.selectedExerciseId,
    inputSource: store.inputSource,
    isAnalyzing: store.isAnalyzing,
    syntheticFaultMode: store.syntheticFaultMode,
    playbackSpeed: store.playbackSpeed,
    onRepetitionCompleted: rep => {
      store.addRepEvent(rep);
    },
    onMetricsUpdated: m => {
      store.setMetrics(m);
    },
    onAlertsUpdated: alerts => {
      store.setActiveAlerts(alerts);
    },
  });

  const handleSelectExercise = (id: string, suite: ExerciseCategory) => {
    store.setSelectedExerciseId(id);
    store.setActiveSuite(suite);
    resetEngine();
    store.resetWorkout();
  };

  const handleUploadFile = (file: File) => {
    store.setVideoFile(file);
    const url = URL.createObjectURL(file);
    store.setVideoUrl(url);
    store.setInputSource('upload');
  };

  const handleResetWorkout = () => {
    resetEngine();
    store.resetWorkout();
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0a0d17]/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">PoseCraft</h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
              Local Biomechanical Movement Lab & Repetition Engine
            </p>
          </div>
        </div>

        {/* System Diagnostics Badges */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#121826] border border-slate-800 text-[11px] font-mono text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>WebGPU / Wasm On-Device</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#121826] border border-slate-800 text-[11px] font-mono text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Cloud Uploads</span>
          </div>

          <div className="px-2 py-1 rounded-md bg-cyan-950/40 border border-cyan-800/60 text-[11px] font-mono text-cyan-300 font-bold">
            {fps} FPS
          </div>
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Top Control Bar */}
        <CameraControls
          inputSource={store.inputSource}
          onChangeInputSource={store.setInputSource}
          isMuted={store.isMuted}
          onToggleMute={store.toggleMute}
          isVoiceCoachEnabled={store.isVoiceCoachEnabled}
          onToggleVoiceCoach={store.toggleVoiceCoach}
          playbackSpeed={store.playbackSpeed}
          onChangeSpeed={store.setPlaybackSpeed}
          syntheticFaultMode={store.syntheticFaultMode}
          onChangeFaultMode={store.setSyntheticFaultMode}
          onReset={handleResetWorkout}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onSaveSet={() => store.saveCurrentSession(currentRule.name)}
          onUploadFile={handleUploadFile}
          hasRepsToSave={store.repHistory.length > 0}
        />

        {/* Audio Metronome & Tempo Pacer */}
        <TempoPacer />

        {/* Safety Alert Banner */}
        <SafetyAlertBanner alerts={store.activeAlerts} />

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Canvas Video HUD, Kinematic Chart, & History Table */}
          <div className="lg:col-span-8 space-y-4">
            <VideoCanvas
              videoRef={videoRef}
              canvasRef={canvasRef}
              exerciseName={currentRule.name}
              cameraPerspective={currentRule.cameraPerspective}
              detectedPerspective="any"
              inputSource={store.inputSource}
              cameraActive={cameraActive}
              modelLoading={modelLoading}
              videoUrl={store.videoUrl}
            />

            {/* Video Scrubber & Frame Stepper (Upload Mode) */}
            {store.inputSource === 'upload' ? (
              <VideoScrubber
                videoElement={videoRef.current}
                isProtractorActive={isProtractorActive}
                onToggleProtractor={toggleProtractor}
                onClearProtractor={clearProtractor}
              />
            ) : (
              <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-2.5 px-4 flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-400">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Manual Angle Protractor (Click 3 points on canvas to measure joint angles)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleProtractor}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                      isProtractorActive
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 ring-1 ring-rose-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isProtractorActive ? 'Protractor Active' : 'Activate Protractor'}
                  </button>
                  {isProtractorActive && (
                    <button
                      onClick={clearProtractor}
                      className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Real-time Kinematic Velocity & Displacement Curve */}
            <KinematicChart
              currentValue={store.metrics?.primaryMetric || 0}
              timestampMs={Date.now()}
              metricLabel={currentRule.primaryMetricLabel}
              metricUnit={currentRule.primaryMetricUnit}
            />

            {/* Repetition History Table */}
            <RepTrackerTable
              repHistory={store.repHistory}
              primaryMetricLabel={currentRule.primaryMetricLabel}
              primaryMetricUnit={currentRule.primaryMetricUnit}
            />
          </div>

          {/* Right Column: Telemetry & Movement Instructions */}
          <div className="lg:col-span-4 space-y-4">
            {/* Real-time Metrics */}
            <MetricsDashboard
              metrics={store.metrics}
              rule={currentRule}
              fps={fps}
            />

            {/* Biomechanical Protocol Instructions */}
            <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-4 shadow-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-800/80 pb-2">
                Biomechanical Criteria: {currentRule.name}
              </h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                {currentRule.description}
              </p>
              <div className="space-y-1.5">
                {currentRule.instructions.map((inst, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                    <span className="font-mono text-cyan-400 font-bold">{idx + 1}.</span>
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Full 28-Module Exercise Browser */}
        <ExerciseSelector
          selectedExerciseId={store.selectedExerciseId}
          onSelectExercise={handleSelectExercise}
        />
      </main>

      {/* Printable Assessment Modal */}
      <SessionReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        summary={currentRule.getSummary()}
        repHistory={store.repHistory}
      />

      {/* Saved Workout Sessions & Telemetry Export Modal */}
      <SessionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={store.savedSessions}
        onClearHistory={store.clearSessionHistory}
      />
    </div>
  );
};

export default App;
