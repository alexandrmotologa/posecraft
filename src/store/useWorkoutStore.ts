import { useState, useCallback } from 'react';
import {
  ExerciseCategory,
  FrameMetrics,
  RepetitionEvent,
  SafetyAlert,
} from '../engine/types';
import { audioEngine } from '../engine/audio';

export interface WorkoutStoreState {
  selectedExerciseId: string;
  activeSuite: ExerciseCategory;
  inputSource: 'synthetic' | 'webcam' | 'upload';
  isAnalyzing: boolean;
  isMuted: boolean;
  metrics: FrameMetrics | null;
  repHistory: RepetitionEvent[];
  activeAlerts: SafetyAlert[];
  videoFile: File | null;
  videoUrl: string | null;
  syntheticFaultMode: 'none' | 'valgus' | 'rounding' | 'kipping' | 'sag';
  playbackSpeed: number;
}

export function useWorkoutStore() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('back_squat');
  const [activeSuite, setActiveSuite] = useState<ExerciseCategory>('barbell');
  const [inputSource, setInputSource] = useState<'synthetic' | 'webcam' | 'upload'>('synthetic');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [repHistory, setRepHistory] = useState<RepetitionEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SafetyAlert[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [syntheticFaultMode, setSyntheticFaultMode] = useState<'none' | 'valgus' | 'rounding' | 'kipping' | 'sag'>('none');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  const addRepEvent = useCallback((event: RepetitionEvent) => {
    setRepHistory(prev => [event, ...prev]);
    audioEngine.playRepDing();
  }, []);

  const resetWorkout = useCallback(() => {
    setRepHistory([]);
    setActiveAlerts([]);
    setMetrics(null);
  }, []);

  return {
    selectedExerciseId,
    setSelectedExerciseId,
    activeSuite,
    setActiveSuite,
    inputSource,
    setInputSource,
    isAnalyzing,
    setIsAnalyzing,
    isMuted,
    toggleMute,
    metrics,
    setMetrics,
    repHistory,
    addRepEvent,
    activeAlerts,
    setActiveAlerts,
    videoFile,
    setVideoFile,
    videoUrl,
    setVideoUrl,
    syntheticFaultMode,
    setSyntheticFaultMode,
    playbackSpeed,
    setPlaybackSpeed,
    resetWorkout,
  };
}
