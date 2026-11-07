import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ExerciseRule,
  FrameMetrics,
  Landmark,
  LandmarkIndex,
  RepetitionEvent,
  SafetyAlert,
  Skeleton,
} from '../engine/types';
import { createExerciseRule } from '../exercises/registry';
import { LandmarkKalmanFilter } from '../engine/kalman';
import { generateKinematicSkeleton, MediaPipePoseDetector } from '../engine/detector';
import { renderSkeletonHUD } from '../components/canvas/SkeletonPainter';
import { renderAngleDial } from '../components/canvas/AngleDial';
import { PathTracer } from '../components/canvas/PathTracer';
import { CustomProtractor } from '../components/canvas/CustomProtractor';
import { audioEngine } from '../engine/audio';
import { voiceCoach } from '../engine/voice_coach';
import { centerOfMassEngine, CenterOfMassResult } from '../engine/com';

function renderGhostOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
  ctx.fillStyle = 'rgba(192, 132, 252, 0.60)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  const BONE_PAIRS: [number, number][] = [
    [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER],
    [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW],
    [LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST],
    [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW],
    [LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST],
    [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP],
    [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP],
    [LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP],
    [LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE],
    [LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE],
    [LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE],
    [LandmarkIndex.RIGHT_KNEE, LandmarkIndex.RIGHT_ANKLE],
  ];

  BONE_PAIRS.forEach(([i, j]) => {
    const a = landmarks[i];
    const b = landmarks[j];
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    }
  });

  ctx.restore();
}

export interface UsePoseEngineProps {
  exerciseId: string;
  inputSource: 'synthetic' | 'webcam' | 'upload';
  isAnalyzing: boolean;
  syntheticFaultMode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag';
  playbackSpeed: number;
  showCenterOfMass?: boolean;
  showGhostOverlay?: boolean;
  bestRepLandmarks?: Landmark[] | null;
  onRepetitionCompleted: (event: RepetitionEvent, landmarks?: Landmark[]) => void;
  onMetricsUpdated: (metrics: FrameMetrics) => void;
  onAlertsUpdated: (alerts: SafetyAlert[]) => void;
  onComUpdated?: (com: CenterOfMassResult) => void;
}

export function usePoseEngine({
  exerciseId,
  inputSource,
  isAnalyzing,
  syntheticFaultMode,
  playbackSpeed,
  showCenterOfMass = true,
  showGhostOverlay = false,
  bestRepLandmarks = null,
  onRepetitionCompleted,
  onMetricsUpdated,
  onAlertsUpdated,
  onComUpdated,
}: UsePoseEngineProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ruleRef = useRef<ExerciseRule>(createExerciseRule(exerciseId));
  const kalmanRef = useRef<LandmarkKalmanFilter>(new LandmarkKalmanFilter());
  const detectorRef = useRef<MediaPipePoseDetector>(new MediaPipePoseDetector());
  const pathTracerRef = useRef<PathTracer>(new PathTracer(80));
  const protractorRef = useRef<CustomProtractor>(new CustomProtractor());

  // Persistent animation and callback refs to prevent effect recreation on render
  const syntheticProgressRef = useRef<number>(0);
  const lastRepCountRef = useRef<number>(0);
  const lastRepTimeRef = useRef<number>(performance.now());

  const onRepetitionCompletedRef = useRef(onRepetitionCompleted);
  onRepetitionCompletedRef.current = onRepetitionCompleted;

  const onMetricsUpdatedRef = useRef(onMetricsUpdated);
  onMetricsUpdatedRef.current = onMetricsUpdated;

  const onAlertsUpdatedRef = useRef(onAlertsUpdated);
  onAlertsUpdatedRef.current = onAlertsUpdated;

  const onComUpdatedRef = useRef(onComUpdated);
  onComUpdatedRef.current = onComUpdated;

  const showCenterOfMassRef = useRef(showCenterOfMass);
  showCenterOfMassRef.current = showCenterOfMass;

  const showGhostOverlayRef = useRef(showGhostOverlay);
  showGhostOverlayRef.current = showGhostOverlay;

  const bestRepLandmarksRef = useRef(bestRepLandmarks);
  bestRepLandmarksRef.current = bestRepLandmarks;

  const [fps, setFps] = useState<number>(60);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [isProtractorActive, setIsProtractorActive] = useState<boolean>(false);

  // Switch exercise rule on ID change
  useEffect(() => {
    ruleRef.current = createExerciseRule(exerciseId);
    syntheticProgressRef.current = 0;
    lastRepCountRef.current = 0;
    pathTracerRef.current.clear();
    kalmanRef.current.reset();
  }, [exerciseId]);

  // Handle canvas click for interactive protractor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      if (!protractorRef.current.isActive) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      protractorRef.current.addPoint({ x, y });
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, []);

  const toggleProtractor = useCallback(() => {
    setIsProtractorActive(prev => {
      const next = !prev;
      protractorRef.current.isActive = next;
      return next;
    });
  }, []);

  const clearProtractor = useCallback(() => {
    protractorRef.current.clear();
  }, []);

  // Handle webcam stream & video model initialization
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (inputSource === 'webcam') {
      setModelLoading(true);
      navigator.mediaDevices
        ?.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
          audio: false,
        })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setCameraActive(true);
          }
          return detectorRef.current.initialize();
        })
        .then(() => {
          setModelLoading(false);
        })
        .catch(() => {
          setCameraActive(false);
          setModelLoading(false);
        });
    } else if (inputSource === 'upload') {
      // In upload mode, initialize the neural pose detector for video frames
      setModelLoading(true);
      detectorRef.current.initialize()
        .then(() => {
          setModelLoading(false);
        })
        .catch(() => {
          setModelLoading(false);
        });

      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [inputSource]);

  // Main 60 FPS requestAnimationFrame Loop
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const loop = (currentTime: number) => {
      const rawDeltaMs = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      // Cap deltaMs to 40ms to prevent large simulation jumps during capture or frame spikes
      const deltaMs = Math.min(rawDeltaMs, 40);

      // Update FPS counter every 500ms
      frameCount++;
      if (currentTime - lastFpsUpdate >= 500) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx && isAnalyzing) {
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        let skeleton: Skeleton | null = null;

        if (inputSource === 'synthetic') {
          // Advance synthetic movement waveform smoothly: ~2.8s per realistic repetition cycle
          const cycleRate = 0.00038 * playbackSpeed * deltaMs;
          syntheticProgressRef.current = (syntheticProgressRef.current + cycleRate) % 1.0;

          skeleton = generateKinematicSkeleton(
            exerciseId,
            syntheticProgressRef.current,
            currentTime,
            syntheticFaultMode
          );
        } else if (inputSource === 'webcam' || inputSource === 'upload') {
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            // Draw video frame to canvas underlay if uploading
            if (inputSource === 'upload') {
              ctx.drawImage(video, 0, 0, width, height);
            }
            skeleton = detectorRef.current.detectForVideo(video, currentTime);
          }
        }

        if (skeleton && skeleton.landmarks && skeleton.landmarks.length >= 33) {
          // Apply Kalman filter smoothing
          const filteredLandmarks = kalmanRef.current.filter(skeleton.landmarks);
          const smoothedSkeleton: Skeleton = {
            ...skeleton,
            landmarks: filteredLandmarks,
          };

          const rule = ruleRef.current;
          const baseline = rule.calibrate(smoothedSkeleton);
          const metrics = rule.evaluateFrame(smoothedSkeleton, baseline, currentTime);

          onMetricsUpdatedRef.current(metrics);
          onAlertsUpdatedRef.current(metrics.activeAlerts);

          // Check if repetition completed
          if (metrics.repCount > lastRepCountRef.current) {
            lastRepCountRef.current = metrics.repCount;

            // Fetch true repetition telemetry calculated by the dual-threshold hysteresis engine
            const stateMachineInstance = (rule as unknown as { stateMachine?: { getLastRepetition?: () => RepetitionEvent | null } }).stateMachine;
            const measuredRep = rule.getLastRepetition?.() || stateMachineInstance?.getLastRepetition?.() || metrics.completedRep;

            if (measuredRep) {
              onRepetitionCompletedRef.current(measuredRep, filteredLandmarks);
              audioEngine.playRepDing();
              voiceCoach.speakRep(measuredRep.repNumber);
            } else {
              const repDuration = Math.max(600, currentTime - lastRepTimeRef.current);
              lastRepTimeRef.current = currentTime;
              const concentric = Math.round(repDuration * 0.52);
              const eccentric = repDuration - concentric;

              onRepetitionCompletedRef.current({
                repNumber: metrics.repCount,
                startTimeMs: currentTime - repDuration,
                peakTimeMs: currentTime - eccentric,
                endTimeMs: currentTime,
                durationMs: repDuration,
                concentricMs: concentric,
                eccentricMs: eccentric,
                peakRom: Math.round(metrics.primaryMetric),
                romScore: metrics.formScore,
                faults: metrics.activeAlerts.map(a => a.name),
                passed: metrics.activeAlerts.length === 0,
                tempoString: `${(concentric / 1000).toFixed(1)}s / ${(eccentric / 1000).toFixed(1)}s`,
              }, filteredLandmarks);
              audioEngine.playRepDing();
              voiceCoach.speakRep(metrics.repCount);
            }
          }

          // Trigger audio and voice coaching for safety alerts
          if (metrics.activeAlerts.length > 0) {
            const dangerAlert = metrics.activeAlerts.find(a => a.level === 'danger') || metrics.activeAlerts[0];
            if (dangerAlert.level === 'danger') {
              audioEngine.playWarningAlert();
            }
            voiceCoach.speakAlert(dangerAlert.id);
          }

          // Compute target depth guideline if applicable
          let targetDepthY: number | undefined;
          if (exerciseId === 'back_squat' || exerciseId === 'bulgarian_squat') {
            const knee = filteredLandmarks[LandmarkIndex.LEFT_KNEE];
            if (knee) targetDepthY = knee.y + 0.03; // hip crease breaks knee line
          } else if (exerciseId === 'pull_ups') {
            const wrist = filteredLandmarks[LandmarkIndex.LEFT_WRIST];
            if (wrist) targetDepthY = wrist.y; // chin must pass wrist line
          }

          // 1. Render Ghost Overlay (Translucent comparison with best rep) if active
          if (showGhostOverlayRef.current && bestRepLandmarksRef.current) {
            renderGhostOverlay(ctx, bestRepLandmarksRef.current, width, height);
          }

          // 2. Render skeleton HUD with isolated bone segment stress coloring
          renderSkeletonHUD(ctx, filteredLandmarks, width, height, metrics.activeAlerts, targetDepthY);

          // 3. Calculate and Render Whole-Body Center of Mass (CoM) & Ground Projection
          const comResult = centerOfMassEngine.calculateCoM(filteredLandmarks);
          if (comResult) {
            onComUpdatedRef.current?.(comResult);
            if (showCenterOfMassRef.current) {
              centerOfMassEngine.renderCoM(ctx, comResult, width, height);
            }
          }

          // Draw joint angle dials for relevant exercise joints
          if (metrics.angles.kneeAngle !== undefined && filteredLandmarks[LandmarkIndex.LEFT_KNEE]) {
            renderAngleDial(
              ctx,
              {
                vertex: filteredLandmarks[LandmarkIndex.LEFT_KNEE],
                pointA: filteredLandmarks[LandmarkIndex.LEFT_HIP],
                pointC: filteredLandmarks[LandmarkIndex.LEFT_ANKLE],
                angleDegrees: metrics.angles.kneeAngle,
                label: 'Knee',
                targetRange: [80, 95],
              },
              width,
              height
            );
          }

          if (metrics.angles.elbowAngle !== undefined && filteredLandmarks[LandmarkIndex.LEFT_ELBOW]) {
            renderAngleDial(
              ctx,
              {
                vertex: filteredLandmarks[LandmarkIndex.LEFT_ELBOW],
                pointA: filteredLandmarks[LandmarkIndex.LEFT_SHOULDER],
                pointC: filteredLandmarks[LandmarkIndex.LEFT_WRIST],
                angleDegrees: metrics.angles.elbowAngle,
                label: 'Elbow',
                targetRange: [45, 90],
              },
              width,
              height
            );
          }

          // Update and render Bar path / wrist tracer with vertical corridor
          const isBarbellExercise = [
            'back_squat',
            'deadlift',
            'bench_press',
            'overhead_press',
            'barbell_row',
          ].includes(exerciseId);

          const trackPoint = isBarbellExercise
            ? filteredLandmarks[LandmarkIndex.LEFT_WRIST]
            : filteredLandmarks[LandmarkIndex.LEFT_WRIST];

          if (trackPoint) {
            pathTracerRef.current.addPoint({ x: trackPoint.x, y: trackPoint.y }, currentTime);
            pathTracerRef.current.render(ctx, width, height, '#ec4899', isBarbellExercise);
          }

          // Render interactive protractor if active
          if (protractorRef.current.isActive) {
            protractorRef.current.render(ctx, width, height);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    exerciseId,
    inputSource,
    isAnalyzing,
    syntheticFaultMode,
    playbackSpeed,
  ]);

  const resetEngine = useCallback(() => {
    syntheticProgressRef.current = 0;
    lastRepCountRef.current = 0;
    ruleRef.current.reset();
    kalmanRef.current.reset();
    pathTracerRef.current.clear();
    protractorRef.current.clear();
  }, []);

  return {
    videoRef,
    canvasRef,
    fps,
    cameraActive,
    modelLoading,
    isProtractorActive,
    toggleProtractor,
    clearProtractor,
    resetEngine,
  };
}
