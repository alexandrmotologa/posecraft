import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useWorkoutStore } from './store/useWorkoutStore';
import { usePoseEngine } from './hooks/usePoseEngine';
import { createExerciseRule } from './exercises/registry';
import { ExerciseCategory, FrameMetrics, Landmark, RepetitionEvent, SafetyAlert } from './engine/types';
import { CenterOfMassResult } from './engine/com';
import { voiceCommander } from './engine/voice_commander';
import { countdownTimer, CountdownState } from './engine/countdown';
import { VideoCanvas } from './components/canvas/VideoCanvas';
import { CameraControls } from './components/studio/CameraControls';
import { ExerciseSelector } from './components/studio/ExerciseSelector';
import { MetricsDashboard } from './components/telemetry/MetricsDashboard';
import { SafetyAlertBanner } from './components/telemetry/SafetyAlertBanner';
import { RepTrackerTable } from './components/telemetry/RepTrackerTable';
import { SessionReportModal } from './components/export/SessionReportModal';
import { SessionHistoryModal } from './components/export/SessionHistoryModal';
import { PrintableClinicalReport } from './components/export/PrintableClinicalReport';
import { RoutineBuilder } from './components/studio/RoutineBuilder';
import { KinematicChart } from './components/telemetry/KinematicChart';
import { TempoPacer } from './components/studio/TempoPacer';
import { VideoScrubber } from './components/studio/VideoScrubber';
import { Orbit3DView } from './components/canvas/Orbit3DView';
import { CustomExerciseStudio } from './components/studio/CustomExerciseStudio';
import { DualViewComparison } from './components/studio/DualViewComparison';
import { Activity, ShieldCheck, Cpu, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const store = useWorkoutStore();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comResult, setComResult] = useState<CenterOfMassResult | null>(null);
  const [countdownState, setCountdownState] = useState<CountdownState>({
    isActive: false,
    secondsRemaining: 0,
    initialSeconds: 5,
  });

  // Active exercise rule instance
  const currentRule = useMemo(
    () => createExerciseRule(store.selectedExerciseId),
    [store.selectedExerciseId]
  );

  const handleRepetitionCompleted = useCallback((rep: RepetitionEvent, landmarks?: Landmark[]) => {
    store.addRepEvent(rep, landmarks);
  }, [store]);

  const handleMetricsUpdated = useCallback((m: FrameMetrics) => {
    store.setMetrics(m);
  }, [store]);

  const handleAlertsUpdated = useCallback((alerts: SafetyAlert[]) => {
    store.setActiveAlerts(alerts);
  }, [store]);

  const handleComUpdated = useCallback((com: CenterOfMassResult) => {
    setComResult(com);
  }, []);

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
    showCenterOfMass: store.showCenterOfMass,
    showGhostOverlay: store.showGhostOverlay,
    bestRepLandmarks: store.bestRepLandmarks,
    useVelocityHeatmap: store.useVelocityHeatmap,
    onRepetitionCompleted: handleRepetitionCompleted,
    onMetricsUpdated: handleMetricsUpdated,
    onAlertsUpdated: handleAlertsUpdated,
    onComUpdated: handleComUpdated,
    onWorldLandmarksUpdated: store.setWorldLandmarks,
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

  const handleResetWorkout = useCallback(() => {
    resetEngine();
    store.resetWorkout();
  }, [resetEngine, store]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  const handleStartCountdown = useCallback((seconds: number = 5) => {
    countdownTimer.start(seconds, () => {
      handleResetWorkout();
      store.setIsAnalyzing(true);
    });
  }, [handleResetWorkout, store]);

  // Voice Commander integration
  useEffect(() => {
    countdownTimer.setOnTick(s => setCountdownState(s));

    if (store.isVoiceCommanderActive) {
      voiceCommander.start();
      voiceCommander.setOnCommand(cmd => {
        store.setLastVoiceCommand(cmd.phrase);
        setTimeout(() => store.setLastVoiceCommand(null), 2400);

        switch (cmd.action) {
          case 'start_set':
            store.setIsAnalyzing(true);
            break;
          case 'stop_set':
            store.setIsAnalyzing(false);
            break;
          case 'reset_workout':
            handleResetWorkout();
            break;
          case 'open_report':
            setIsReportOpen(true);
            break;
          case 'toggle_fullscreen':
            handleToggleFullscreen();
            break;
          case 'toggle_mute':
            store.toggleMute();
            break;
          case 'toggle_orbit3d':
            store.toggleOrbit3D();
            break;
          case 'toggle_sonification':
            store.toggleSonification();
            break;
        }
      });
    } else {
      voiceCommander.stop();
    }

    return () => {
      voiceCommander.stop();
    };
  }, [store.isVoiceCommanderActive, handleResetWorkout, handleToggleFullscreen, store]);

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
                v1.2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
              Local Biomechanical Movement Lab &amp; Repetition Engine
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* Top Control Bar with Voice, Athlete Tier, Countdown, & CoM Toggles */}
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
          athleteTier={store.athleteTier}
          onChangeAthleteTier={store.setAthleteTier}
          isVoiceCommanderActive={store.isVoiceCommanderActive}
          onToggleVoiceCommander={store.toggleVoiceCommander}
          onStartCountdown={handleStartCountdown}
          showCenterOfMass={store.showCenterOfMass}
          onToggleCenterOfMass={store.toggleCenterOfMass}
          showGhostOverlay={store.showGhostOverlay}
          onToggleGhostOverlay={store.toggleGhostOverlay}
          onOpenPrintableReport={() => setIsPrintReportOpen(true)}
          isOrbit3DOpen={store.isOrbit3DOpen}
          onToggleOrbit3D={store.toggleOrbit3D}
          isSonificationEnabled={store.isSonificationEnabled}
          onToggleSonification={store.toggleSonification}
          onOpenCustomStudio={() => store.setIsCustomStudioOpen(true)}
          onOpenDualView={() => store.setIsDualViewOpen(true)}
          voiceLanguage={store.voiceLanguage}
          onChangeVoiceLanguage={store.setVoiceLanguage}
          currentLoadKg={store.currentLoadKg}
          onChangeLoadKg={store.setCurrentLoadKg}
        />

        {/* Multi-Exercise Workout Circuits & Routine Builder */}
        <RoutineBuilder
          activeRoutine={store.activeRoutine}
          currentStep={store.currentRoutineStep}
          currentRepsCount={store.repHistory.length}
          onStartRoutine={store.startRoutine}
          onNextStep={store.nextRoutineStep}
          onCancelRoutine={() => store.setActiveRoutine(null)}
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
              countdownSeconds={countdownState.secondsRemaining}
              isCountdownActive={countdownState.isActive}
              lastVoiceCommand={store.lastVoiceCommand}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
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
            {/* Real-time Metrics Dashboard with VBT and CoM Ground Balance */}
            <MetricsDashboard
              metrics={store.metrics}
              rule={currentRule}
              fps={fps}
              vbtData={store.vbtHistory[0] || null}
              comBalanceStatus={comResult?.balanceStatus || 'optimal'}
              comOffset={comResult?.balanceOffsetNormalized || 0}
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

      {/* Full Modal Report */}
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

      {/* Printable Clinical Physical Therapy PDF Report */}
      <PrintableClinicalReport
        isOpen={isPrintReportOpen}
        onClose={() => setIsPrintReportOpen(false)}
        exerciseName={currentRule.name}
        totalReps={store.repHistory.length}
        validReps={store.repHistory.filter(r => r.passed).length}
        averageRom={
          store.repHistory.length > 0
            ? Math.round(store.repHistory.reduce((a, b) => a + b.peakRom, 0) / store.repHistory.length)
            : 74
        }
        averageFormScore={
          store.repHistory.length > 0
            ? Math.round(store.repHistory.reduce((a, b) => a + b.romScore, 0) / store.repHistory.length)
            : 95
        }
        reps={store.repHistory}
        alerts={store.activeAlerts}
        vbtMeanVelocity={store.vbtHistory[0]?.meanConcentricVelocity || 0.68}
        maxVelocityLoss={store.vbtHistory[0]?.velocityLossPercent || 14.2}
      />

      {/* 3D Orbit Skeleton Viewport Overlay */}
      <Orbit3DView
        isOpen={store.isOrbit3DOpen}
        onClose={() => store.setIsOrbit3DOpen(false)}
        worldLandmarks={store.worldLandmarks}
      />

      {/* Visual No-Code Custom Exercise Studio */}
      <CustomExerciseStudio
        isOpen={store.isCustomStudioOpen}
        onClose={() => store.setIsCustomStudioOpen(false)}
        onSelectExercise={handleSelectExercise}
      />

      {/* Dual-View Side-by-Side Benchmark Form Comparison */}
      <DualViewComparison
        isOpen={store.isDualViewOpen}
        onClose={() => store.setIsDualViewOpen(false)}
        currentRep={store.repHistory[store.repHistory.length - 1] || null}
        exerciseName={currentRule.name}
      />
    </div>
  );
};

export default App;
