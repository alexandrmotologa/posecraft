import { useState, useCallback, useEffect } from 'react';
import {
  ExerciseCategory,
  FrameMetrics,
  RepetitionEvent,
  SafetyAlert,
} from '../engine/types';
import { audioEngine } from '../engine/audio';
import { voiceCoach } from '../engine/voice_coach';
import { SavedWorkoutSession } from '../components/export/SessionHistoryModal';

const STORAGE_KEY = 'posecraft_saved_sessions_v1';

export function useWorkoutStore() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('back_squat');
  const [activeSuite, setActiveSuite] = useState<ExerciseCategory>('barbell');
  const [inputSource, setInputSource] = useState<'synthetic' | 'webcam' | 'upload'>('synthetic');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVoiceCoachEnabled, setIsVoiceCoachEnabled] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [repHistory, setRepHistory] = useState<RepetitionEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SafetyAlert[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [syntheticFaultMode, setSyntheticFaultMode] = useState<'none' | 'valgus' | 'rounding' | 'kipping' | 'sag'>('none');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [savedSessions, setSavedSessions] = useState<SavedWorkoutSession[]>([]);

  // Load saved sessions on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSavedSessions(JSON.parse(raw));
      }
    } catch {
      // Ignored
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  const toggleVoiceCoach = useCallback(() => {
    setIsVoiceCoachEnabled(prev => {
      const next = !prev;
      voiceCoach.setEnabled(next);
      return next;
    });
  }, []);

  const addRepEvent = useCallback((event: RepetitionEvent) => {
    setRepHistory(prev => [event, ...prev]);
    audioEngine.playRepDing();
    voiceCoach.speakRep(event.repNumber);
  }, []);

  const saveCurrentSession = useCallback((exerciseName: string) => {
    if (repHistory.length === 0) return;

    const validReps = repHistory.filter(r => r.passed).length;
    const avgRom = Math.round(
      repHistory.reduce((acc, r) => acc + r.peakRom, 0) / repHistory.length
    );
    const avgScore = Math.round(
      repHistory.reduce((acc, r) => acc + r.romScore, 0) / repHistory.length
    );

    const newSession: SavedWorkoutSession = {
      id: `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
      exerciseId: selectedExerciseId,
      exerciseName,
      totalReps: repHistory.length,
      validReps,
      averageRom: avgRom,
      averageFormScore: avgScore,
      reps: [...repHistory],
    };

    setSavedSessions(prev => {
      const updated = [newSession, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignored
      }
      return updated;
    });
  }, [repHistory, selectedExerciseId]);

  const clearSessionHistory = useCallback(() => {
    setSavedSessions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored
    }
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
    isVoiceCoachEnabled,
    toggleVoiceCoach,
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
    savedSessions,
    saveCurrentSession,
    clearSessionHistory,
    resetWorkout,
  };
}
