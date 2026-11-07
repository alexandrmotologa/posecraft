import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ExerciseRule,
  FrameMetrics,
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
import { audioEngine } from '../engine/audio';

export interface UsePoseEngineProps {
  exerciseId: string;
  inputSource: 'synthetic' | 'webcam' | 'upload';
  isAnalyzing: boolean;
  syntheticFaultMode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag';
  playbackSpeed: number;
  onRepetitionCompleted: (event: RepetitionEvent) => void;
  onMetricsUpdated: (metrics: FrameMetrics) => void;
  onAlertsUpdated: (alerts: SafetyAlert[]) => void;
}

export function usePoseEngine({
  exerciseId,
  inputSource,
  isAnalyzing,
  syntheticFaultMode,
  playbackSpeed,
  onRepetitionCompleted,
  onMetricsUpdated,
  onAlertsUpdated,
}: UsePoseEngineProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ruleRef = useRef<ExerciseRule>(createExerciseRule(exerciseId));
  const kalmanRef = useRef<LandmarkKalmanFilter>(new LandmarkKalmanFilter());
  const detectorRef = useRef<MediaPipePoseDetector>(new MediaPipePoseDetector());
  const pathTracerRef = useRef<PathTracer>(new PathTracer(80));

  const [fps, setFps] = useState<number>(60);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);

  // Switch exercise rule on ID change
  useEffect(() => {
    ruleRef.current = createExerciseRule(exerciseId);
    pathTracerRef.current.clear();
    kalmanRef.current.reset();
  }, [exerciseId]);

  // Handle webcam stream initialization
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
    let syntheticProgress = 0;
    let lastRepCount = 0;

    const loop = (currentTime: number) => {
      const deltaMs = currentTime - lastFrameTime;
      lastFrameTime = currentTime;

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
          // Advance synthetic movement waveform: 0 -> 1 -> 0
          const cycleRate = (0.0006 * playbackSpeed * deltaMs);
          syntheticProgress = (syntheticProgress + cycleRate) % 1.0;

          skeleton = generateKinematicSkeleton(
            exerciseId,
            syntheticProgress,
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

          onMetricsUpdated(metrics);
          onAlertsUpdated(metrics.activeAlerts);

          // Check if repetition completed
          if (metrics.repCount > lastRepCount) {
            lastRepCount = metrics.repCount;
            onRepetitionCompleted({
              repNumber: metrics.repCount,
              startTimeMs: currentTime - 1500,
              peakTimeMs: currentTime - 800,
              endTimeMs: currentTime,
              durationMs: 1500,
              concentricMs: 800,
              eccentricMs: 700,
              peakRom: metrics.primaryMetric,
              romScore: metrics.formScore,
              faults: metrics.activeAlerts.map(a => a.name),
              passed: metrics.activeAlerts.length === 0,
              tempoString: '1.2s / 0.9s',
            });
            audioEngine.playRepDing();
          }

          // Trigger audio for new safety danger alert
          if (metrics.activeAlerts.some(a => a.level === 'danger')) {
            audioEngine.playWarningAlert();
          }

          // Draw skeleton HUD
          const safetyLevel = metrics.activeAlerts.some(a => a.level === 'danger')
            ? 'danger'
            : metrics.activeAlerts.length > 0
            ? 'warning'
            : 'safe';

          renderSkeletonHUD(ctx, filteredLandmarks, width, height, safetyLevel);

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

          // Update and render Bar path / wrist tracer
          const wrist = filteredLandmarks[LandmarkIndex.LEFT_WRIST];
          if (wrist) {
            pathTracerRef.current.addPoint({ x: wrist.x, y: wrist.y }, currentTime);
            pathTracerRef.current.render(ctx, width, height);
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
    onRepetitionCompleted,
    onMetricsUpdated,
    onAlertsUpdated,
  ]);

  const resetEngine = useCallback(() => {
    ruleRef.current.reset();
    kalmanRef.current.reset();
    pathTracerRef.current.clear();
  }, []);

  return {
    videoRef,
    canvasRef,
    fps,
    cameraActive,
    modelLoading,
    resetEngine,
  };
}
