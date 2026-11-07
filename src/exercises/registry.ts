import { ExerciseCategory, ExerciseRule } from '../engine/types';

// Suite 1: Calisthenics & Bodyweight
import { PullUpsRule } from './calisthenics/pull_ups';
import { PushUpsRule } from './calisthenics/push_ups';
import { DipsRule } from './calisthenics/dips';
import { PlankRule } from './calisthenics/plank';
import { LSitRule } from './calisthenics/l_sit';
import { HandstandRule } from './calisthenics/handstand';

// Suite 2: Barbell & Gym Hypertrophy
import { BackSquatRule } from './barbell/back_squat';
import { DeadliftRule } from './barbell/deadlift';
import { BenchPressRule } from './barbell/bench_press';
import { OverheadPressRule } from './barbell/overhead_press';
import { BarbellRowRule } from './barbell/barbell_row';
import { BicepCurlsRule } from './barbell/bicep_curls';
import { LateralRaisesRule } from './barbell/lateral_raises';

// Suite 3: Unilateral & Lower Body Symmetry
import { WalkingLungesRule } from './unilateral/walking_lunges';
import { BulgarianSquatRule } from './unilateral/bulgarian_squat';
import { SingleLegRdlRule } from './unilateral/single_leg_rdl';
import { CalfRaisesRule } from './unilateral/calf_raises';

// Suite 4: Conditioning & Functional Fitness
import { KettlebellSwingRule } from './conditioning/kettlebell_swing';
import { BurpeesRule } from './conditioning/burpees';
import { JumpRopeRule } from './conditioning/jump_rope';
import { BoxingShadowRule } from './conditioning/boxing_shadow';

// Suite 5: Athletic Performance & Power
import { VerticalJumpRule } from './athletic/vertical_jump';
import { RunningGaitRule } from './athletic/running_gait';
import { BroadJumpRule } from './athletic/broad_jump';

// Suite 6: Kinetotherapy, Mobility & Ergonomics
import { FmsOverheadSquatRule } from './rehab/fms_overhead_squat';
import { ShoulderMobilityRule } from './rehab/shoulder_mobility';
import { DeskPostureRule } from './rehab/desk_posture';
import { SitToStandRule } from './rehab/sit_to_stand';

export interface ExerciseSuiteMetadata {
  id: ExerciseCategory;
  name: string;
  icon: string;
  badge: string;
  description: string;
  moduleIds: string[];
}

export const EXERCISE_SUITES: ExerciseSuiteMetadata[] = [
  {
    id: 'calisthenics',
    name: 'Calisthenics & Bodyweight',
    icon: '🧗',
    badge: '6 Modules',
    description: 'Lockout angles, chin bar clearances, kipping detection, and smart isometric hold timers.',
    moduleIds: ['pull_ups', 'push_ups', 'dips', 'plank', 'l_sit', 'handstand'],
  },
  {
    id: 'barbell',
    name: 'Barbell & Hypertrophy',
    icon: '🏋️',
    badge: '7 Modules',
    description: 'Vertical bar path tracers, lumbar curvature alarms, elbow flare protection, and cheating detectors.',
    moduleIds: [
      'back_squat',
      'deadlift',
      'bench_press',
      'overhead_press',
      'barbell_row',
      'bicep_curls',
      'lateral_raises',
    ],
  },
  {
    id: 'unilateral',
    name: 'Unilateral & Symmetry',
    icon: '🦵',
    badge: '4 Modules',
    description: 'Left versus right ROM symmetry matrix, knee valgus collapse alerts, and pelvic rotation tracking.',
    moduleIds: ['walking_lunges', 'bulgarian_squat', 'single_leg_rdl', 'calf_raises'],
  },
  {
    id: 'conditioning',
    name: 'Conditioning & Functional',
    icon: '🥊',
    badge: '4 Modules',
    description: 'Hip hinge vs squat classifiers, chest-to-deck burpees, cadence RPM, and boxing guard checks.',
    moduleIds: ['kettlebell_swing', 'burpees', 'jump_rope', 'boxing_shadow'],
  },
  {
    id: 'athletic',
    name: 'Athletic Power & Gait',
    icon: '⚡',
    badge: '3 Modules',
    description: 'Airborne flight time jump height calculation, running cadence (SPM), and broad jump takeoff angles.',
    moduleIds: ['vertical_jump', 'running_gait', 'broad_jump'],
  },
  {
    id: 'rehab',
    name: 'Kinetotherapy & Ergonomics',
    icon: '🩺',
    badge: '4 Modules',
    description: 'Clinical FMS screening, Apley scratch reach, tech neck craniovertebral angle, and 30s chair stands.',
    moduleIds: ['fms_overhead_squat', 'shoulder_mobility', 'desk_posture', 'sit_to_stand'],
  },
];

export function createExerciseRule(id: string): ExerciseRule {
  switch (id) {
    // Calisthenics
    case 'pull_ups':
      return new PullUpsRule();
    case 'push_ups':
      return new PushUpsRule();
    case 'dips':
      return new DipsRule();
    case 'plank':
      return new PlankRule();
    case 'l_sit':
      return new LSitRule();
    case 'handstand':
      return new HandstandRule();

    // Barbell
    case 'back_squat':
      return new BackSquatRule();
    case 'deadlift':
      return new DeadliftRule();
    case 'bench_press':
      return new BenchPressRule();
    case 'overhead_press':
      return new OverheadPressRule();
    case 'barbell_row':
      return new BarbellRowRule();
    case 'bicep_curls':
      return new BicepCurlsRule();
    case 'lateral_raises':
      return new LateralRaisesRule();

    // Unilateral
    case 'walking_lunges':
      return new WalkingLungesRule();
    case 'bulgarian_squat':
      return new BulgarianSquatRule();
    case 'single_leg_rdl':
      return new SingleLegRdlRule();
    case 'calf_raises':
      return new CalfRaisesRule();

    // Conditioning
    case 'kettlebell_swing':
      return new KettlebellSwingRule();
    case 'burpees':
      return new BurpeesRule();
    case 'jump_rope':
      return new JumpRopeRule();
    case 'boxing_shadow':
      return new BoxingShadowRule();

    // Athletic
    case 'vertical_jump':
      return new VerticalJumpRule();
    case 'running_gait':
      return new RunningGaitRule();
    case 'broad_jump':
      return new BroadJumpRule();

    // Rehab
    case 'fms_overhead_squat':
      return new FmsOverheadSquatRule();
    case 'shoulder_mobility':
      return new ShoulderMobilityRule();
    case 'desk_posture':
      return new DeskPostureRule();
    case 'sit_to_stand':
      return new SitToStandRule();

    default:
      return new BackSquatRule();
  }
}

export const ALL_EXERCISE_IDS = [
  'pull_ups',
  'push_ups',
  'dips',
  'plank',
  'l_sit',
  'handstand',
  'back_squat',
  'deadlift',
  'bench_press',
  'overhead_press',
  'barbell_row',
  'bicep_curls',
  'lateral_raises',
  'walking_lunges',
  'bulgarian_squat',
  'single_leg_rdl',
  'calf_raises',
  'kettlebell_swing',
  'burpees',
  'jump_rope',
  'boxing_shadow',
  'vertical_jump',
  'running_gait',
  'broad_jump',
  'fms_overhead_squat',
  'shoulder_mobility',
  'desk_posture',
  'sit_to_stand',
];
