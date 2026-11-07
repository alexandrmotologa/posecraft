/**
 * Multi-Exercise Routine & Workout Plan Engine.
 * Manages structured exercise circuits, target sets, reps, and inter-set rest intervals.
 */

export interface RoutineExerciseItem {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  restSecondsBetweenSets: number;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  description: string;
  exercises: RoutineExerciseItem[];
}

export const PRESET_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'lower_body_hypertrophy',
    title: 'Lower Body Strength & Symmetry',
    description: '3-station protocol targeting bilateral depth, unilateral valgus control, and calf power.',
    exercises: [
      { exerciseId: 'back_squat', exerciseName: 'Barbell Back Squat', targetSets: 3, targetReps: 5, restSecondsBetweenSets: 90 },
      { exerciseId: 'bulgarian_squat', exerciseName: 'Bulgarian Split Squat', targetSets: 3, targetReps: 8, restSecondsBetweenSets: 60 },
      { exerciseId: 'calf_raises', exerciseName: 'Standing Calf Raises', targetSets: 3, targetReps: 12, restSecondsBetweenSets: 45 },
    ],
  },
  {
    id: 'calisthenics_foundations',
    title: 'Calisthenics Upper Body Foundations',
    description: 'Vertical pulling and horizontal pushing chain with isometric core integration.',
    exercises: [
      { exerciseId: 'pull_ups', exerciseName: 'Strict Pull-Ups', targetSets: 4, targetReps: 6, restSecondsBetweenSets: 90 },
      { exerciseId: 'dips', exerciseName: 'Parallel Bar Dips', targetSets: 3, targetReps: 8, restSecondsBetweenSets: 75 },
      { exerciseId: 'push_ups', exerciseName: 'Strict Push-Ups', targetSets: 3, targetReps: 12, restSecondsBetweenSets: 60 },
      { exerciseId: 'plank', exerciseName: 'Smart Isometric Plank', targetSets: 3, targetReps: 45, restSecondsBetweenSets: 45 },
    ],
  },
  {
    id: 'fms_clinical_assessment',
    title: 'Functional Movement Clinical Battery',
    description: 'Standard clinical screening battery assessing ankle mobility, thoracic spine, and sit-to-stand.',
    exercises: [
      { exerciseId: 'fms_overhead_squat', exerciseName: 'FMS Deep Overhead Squat', targetSets: 3, targetReps: 3, restSecondsBetweenSets: 30 },
      { exerciseId: 'shoulder_mobility', exerciseName: 'Apley Shoulder Scratch Test', targetSets: 2, targetReps: 1, restSecondsBetweenSets: 20 },
      { exerciseId: 'sit_to_stand', exerciseName: '30-Second Chair Stand Test', targetSets: 1, targetReps: 15, restSecondsBetweenSets: 60 },
    ],
  },
];
