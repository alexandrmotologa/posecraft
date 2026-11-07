import { useState, useCallback, useEffect } from 'react';
import {
  ExerciseCategory,
  FrameMetrics,
  Landmark,
  RepetitionEvent,
  SafetyAlert,
} from '../engine/types';
import { audioEngine } from '../engine/audio';
import { voiceCoach } from '../engine/voice_coach';
import { vbtEngine, VbtRepetitionData } from '../engine/vbt';
import { AthleteLevelTier } from '../engine/athlete_level';
import { WorkoutRoutine } from '../engine/routine';
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
  const [vbtHistory, setVbtHistory] = useState<VbtRepetitionData[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SafetyAlert[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [syntheticFaultMode, setSyntheticFaultMode] = useState<'none' | 'valgus' | 'rounding' | 'kipping' | 'sag'>('none');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [savedSessions, setSavedSessions] = useState<SavedWorkoutSession[]>([]);

  // Advanced Biomechanical & Athletic State
  const [athleteTier, setAthleteTier] = useState<AthleteLevelTier>('intermediate');
  const [showCenterOfMass, setShowCenterOfMass] = useState<boolean>(true);
  const [showGhostOverlay, setShowGhostOverlay] = useState<boolean>(false);
  const [bestRepLandmarks, setBestRepLandmarks] = useState<Landmark[] | null>(null);
  const [isVoiceCommanderActive, setIsVoiceCommanderActive] = useState<boolean>(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<WorkoutRoutine | null>(null);
  const [currentRoutineStep, setCurrentRoutineStep] = useState<number>(0);

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

  const toggleCenterOfMass = useCallback(() => {
    setShowCenterOfMass(prev => !prev);
  }, []);

  const toggleGhostOverlay = useCallback(() => {
    setShowGhostOverlay(prev => !prev);
  }, []);

  const toggleVoiceCommander = useCallback(() => {
    setIsVoiceCommanderActive(prev => !prev);
  }, []);

  const addRepEvent = useCallback((event: RepetitionEvent, currentLandmarks?: Landmark[]) => {
    setRepHistory(prev => [event, ...prev]);

    // Calculate VBT Velocity & Power metrics
    const vbtData = vbtEngine.evaluateRepetition(event);
    setVbtHistory(prev => [vbtData, ...prev]);

    if (vbtData.fatigueWarning) {
      audioEngine.playWarningAlert();
      voiceCoach.speakAlert('fatigue_warning');
    } else {
      audioEngine.playRepDing();
      voiceCoach.speakRep(event.repNumber);
    }

    // Capture highest scoring repetition for Ghost Overlay
    if (event.romScore >= 88 && currentLandmarks) {
      setBestRepLandmarks([...currentLandmarks]);
    }
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
    vbtEngine.reset();
    setVbtHistory([]);
    setRepHistory([]);
    setActiveAlerts([]);
    setMetrics(null);
  }, []);

  const startRoutine = useCallback((routine: WorkoutRoutine) => {
    setActiveRoutine(routine);
    setCurrentRoutineStep(0);
    const first = routine.exercises[0];
    if (first) {
      setSelectedExerciseId(first.exerciseId);
    }
    resetWorkout();
  }, [resetWorkout]);

  const nextRoutineStep = useCallback(() => {
    if (!activeRoutine) return;
    const nextStep = currentRoutineStep + 1;
    if (nextStep < activeRoutine.exercises.length) {
      setCurrentRoutineStep(nextStep);
      setSelectedExerciseId(activeRoutine.exercises[nextStep].exerciseId);
      resetWorkout();
    } else {
      setActiveRoutine(null);
      setCurrentRoutineStep(0);
    }
  }, [activeRoutine, currentRoutineStep, resetWorkout]);

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
    vbtHistory,
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
    athleteTier,
    setAthleteTier,
    showCenterOfMass,
    setShowCenterOfMass,
    toggleCenterOfMass,
    showGhostOverlay,
    setShowGhostOverlay,
    toggleGhostOverlay,
    bestRepLandmarks,
    setBestRepLandmarks,
    isVoiceCommanderActive,
    setIsVoiceCommanderActive,
    toggleVoiceCommander,
    lastVoiceCommand,
    setLastVoiceCommand,
    activeRoutine,
    setActiveRoutine,
    currentRoutineStep,
    startRoutine,
    nextRoutineStep,
  };
}
