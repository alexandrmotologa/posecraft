# Exercise Catalog: 6 Suites and 28 Modules

PoseCraft includes 28 biomechanical modules organized into 6 functional suites.

## Suite 1: Calisthenics & Bodyweight

1. **Pull-Ups (`pull_ups`)**
   - Camera: Sagittal (side profile) or 45-degree angle
   - Criteria: Dead hang elbow angle greater than 160 degrees; chin clears bar height by at least 0.15 of torso length
   - Faults: Kipping via knee swing exceeding 20 degrees; incomplete dead hang extension
   - Output: Total valid reps, dead hang adherence percentage, concentric velocity

2. **Push-Ups (`push_ups`)**
   - Camera: Sagittal (side profile)
   - Criteria: Elbow extension at apex above 165 degrees; bottom chest depth with elbow angle at or below 90 degrees
   - Faults: Lumbar sag or hip pike (hip deviation greater than 15 degrees from ankle-shoulder axis)
   - Output: Rep count, average bottom depth angle, trunk collinearity score

3. **Dips (`dips`)**
   - Camera: Sagittal (side profile)
   - Criteria: Elbow angle 90 degrees or lower at bottom; top lockout above 165 degrees
   - Faults: Excessive anterior shoulder tilt (dumping forward past 35 degrees)
   - Output: Depth compliance, lockout consistency

4. **Plank (`plank`)**
   - Camera: Sagittal (side profile)
   - Criteria: Ankle-knee-hip-shoulder collinearity within 180 +/- 8 degrees
   - Faults: Hip sag (hips drop below threshold) or hip pike (buttocks rise)
   - Output: Smart timer active duration (pauses instantly during form breakdown)

5. **L-Sit & Leg Raises (`l_sit`)**
   - Camera: Sagittal (side profile)
   - Criteria: Hip flexion angle at or below 90 degrees; knee extension maintained above 170 degrees
   - Faults: Knee flexion compensation; hip angle opening above 105 degrees
   - Output: Continuous hold duration, average hip flexion angle

6. **Handstand Hold (`handstand`)**
   - Camera: Sagittal (side profile)
   - Criteria: Vertical alignment vector across wrist, shoulder, hip, and ankle within 180 +/- 6 degrees
   - Faults: Excessive lumbar hyperextension (banana back); shoulder angle under-opening
   - Output: Hold time, alignment variance in degrees

## Suite 2: Barbell & Gym Hypertrophy

7. **Back Squat (`back_squat`)**
   - Camera: Frontal (knee valgus) or Sagittal (depth and bar path)
   - Criteria: Femur drops below horizontal (hip crease below knee top); vertical bar path
   - Faults: Knee valgus collapse (valgus ratio under 0.82); excessive forward torso collapse
   - Output: Rep count, bottom depth angle, knee valgus index

8. **Deadlift (`deadlift`)**
   - Camera: Sagittal (side profile)
   - Criteria: Full hip lockout at apex; vertical bar path over midfoot
   - Faults: Lumbar flexion rounding exceeding 20 degrees from setup baseline
   - Output: Rep count, peak spinal curvature deviation, bar path horizontal drift in centimeters

9. **Bench Press (`bench_press`)**
   - Camera: 45-degree angle or frontal
   - Criteria: Elbow angle lockout at apex; touch at lower sternum
   - Faults: Excessive elbow flare exceeding 75 degrees; asymmetrical press timing
   - Output: Rep count, left versus right press symmetry percentage, touch point consistency

10. **Overhead Press (`overhead_press`)**
    - Camera: Frontal or Sagittal
    - Criteria: Elbow lockout at 180 degrees; head clears window at apex
    - Faults: Lumbar hyperextension to compensate for thoracic or shoulder mobility
    - Output: Rep count, vertical bar trajectory, lumbar extension angle

11. **Barbell Row (`barbell_row`)**
    - Camera: Sagittal (side profile)
    - Criteria: Torso angle maintained between 15 and 45 degrees relative to floor; elbows drive past ribcage
    - Faults: Upright momentum cheat (torso standing up during pull phase)
    - Output: Rep count, torso angle drift per repetition

12. **Bicep Curls (`bicep_curls`)**
    - Camera: Sagittal (side profile)
    - Criteria: Full extension below 160 degrees; peak elbow flexion under 50 degrees
    - Faults: Cheating via forward elbow drift exceeding 8 cm; backward torso swing
    - Output: Strict rep count, cheating penalty count, concentric tempo

13. **Lateral Raises (`lateral_raises`)**
    - Camera: Frontal (facing camera)
    - Criteria: Dumbbells reach horizontal plane (80 to 90 degrees abduction)
    - Faults: Trapezius shrugging (shoulder elevation greater than 10% torso length); torso rocking
    - Output: Peak abduction angle per arm, shrugging detection flag

## Suite 3: Unilateral & Lower Body Symmetry

14. **Walking & Reverse Lunges (`walking_lunges`)**
    - Camera: Sagittal (side profile)
    - Criteria: Front knee at 90 degrees; back knee approaches 90 degrees with floor clearance
    - Faults: Front knee caving inward; front knee traveling excessively beyond toes
    - Output: Rep count per leg, depth balance

15. **Bulgarian Split Squat (`bulgarian_squat`)**
    - Camera: Sagittal or Frontal
    - Criteria: Rear foot elevated; front thigh parallel to floor at bottom
    - Faults: Front knee valgus; torso excessive forward lean
    - Output: Left versus right ROM symmetry matrix, per-side tempo ratio

16. **Single-Leg Romanian Deadlift (`single_leg_rdl`)**
    - Camera: Sagittal or Frontal
    - Criteria: Hip hinge with standing knee slightly flexed; trailing leg in line with torso
    - Faults: Pelvic rotation (hips opening outward instead of remaining level to floor)
    - Output: Pelvic tilt angle deviation, balance score

17. **Standing Calf Raises (`calf_raises`)**
    - Camera: Sagittal or Frontal
    - Criteria: Ankle plantarflexion lift; 1.0 second isometric pause at top
    - Faults: Knee flexion bounce (cheating movement using quad recoil)
    - Output: Elevation displacement relative to ankle baseline, top pause duration

## Suite 4: Conditioning & Functional Fitness

18. **Kettlebell Swings (`kettlebell_swing`)**
    - Camera: Sagittal (side profile)
    - Criteria: Hip hinge pattern (hip displacement exceeds knee displacement); explosive hip lockout
    - Faults: Squat pattern swing (knee displacement exceeds hip displacement); arm-lifting weight
    - Output: Rep count, hinge classification ratio, cycle tempo

19. **Burpees (`burpees`)**
    - Camera: 45-degree angle or Sagittal
    - Criteria: Chest touches floor; complete vertical jump with hands overhead
    - Faults: Incomplete chest floor contact; incomplete hip opening during jump
    - Output: Rep count, ground contact time, jump cycle frequency

20. **Jump Rope (`jump_rope`)**
    - Camera: Frontal
    - Criteria: Vertical rhythm consistency; rapid floor rebound
    - Faults: Asymmetric foot landing; knee tucking or leg piking
    - Output: Cadence (RPM), ground contact time in milliseconds, vertical symmetry index

21. **Boxing Shadow & Guard (`boxing_shadow`)**
    - Camera: Frontal or 45-degree angle
    - Criteria: Guard maintenance (hands at chin level); full punch extension on jab/cross
    - Faults: Dropping rear hand during lead punch; forward overreach past center of gravity
    - Output: Punch count, guard compliance percentage, punch extension velocity

## Suite 5: Athletic Performance & Power

22. **Countermovement Vertical Jump (`vertical_jump`)**
    - Camera: Sagittal or Frontal
    - Criteria: Triple extension (hip, knee, ankle); flight duration tracking
    - Formula: $h = \frac{1}{8} g \cdot t_{\text{air}}^2$
    - Output: Jump height in centimeters, takeoff velocity, landing flexion absorption

23. **Running Gait Cadence (`running_gait`)**
    - Camera: Sagittal (treadmill or track)
    - Criteria: Foot strike position relative to center of mass; step frequency
    - Faults: Overstriding (foot landing ahead of knee line); vertical bounce excess
    - Output: Cadence (steps per minute), knee strike angle, vertical oscillation

24. **Standing Broad Jump (`broad_jump`)**
    - Camera: Sagittal (side profile)
    - Criteria: Horizontal takeoff angle near 45 degrees; knee flexion landing shock absorption
    - Faults: Stiff-legged landing; balance loss on contact
    - Output: Estimated horizontal distance ratio, takeoff launch angle, landing knee flexion angle

## Suite 6: Kinetotherapy, Mobility & Ergonomics

25. **FMS Overhead Squat (`fms_overhead_squat`)**
    - Camera: Frontal or Sagittal
    - Criteria: Dowel/arms held overhead parallel to torso; thighs break parallel; heels on floor
    - Faults: Arms falling forward; heels lifting; knee valgus
    - Output: Clinical FMS score (0 to 3), ankle dorsiflexion deficit indicator

26. **Shoulder Mobility Apley Test (`shoulder_mobility`)**
    - Camera: Posterior (back facing camera)
    - Criteria: Measure distance between closest points of both fists behind spine
    - Output: Distance normalized by hand length, mobility tier (Tier 1: under 1 hand length, Tier 2: 1 to 1.5 hand lengths, Tier 3: greater than 1.5 hand lengths)

27. **Desk Posture Sentinel (`desk_posture`)**
    - Camera: Sagittal (side profile from laptop or webcam)
    - Criteria: Continuous tracking of Craniovertebral Angle (CVA) between ear tragus and C7 vertebra
    - Faults: Forward head slump under 48 degrees persisting for more than 30 seconds
    - Output: Real-time CVA angle, slouch duration timer, screen notification alert

28. **30-Second Sit-to-Stand Test (`sit_to_stand`)**
    - Camera: Sagittal (side profile)
    - Criteria: Complete standing lockouts and complete seated contacts within 30 seconds
    - Clinical Value: Functional lower extremity strength and fall risk assessment
    - Output: Total completed cycles, cycle rate, bilateral push symmetry
