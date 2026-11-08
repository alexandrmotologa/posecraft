/**
 * Training Center XML (.TCX) Exporter for PoseCraft.
 * Produces valid Garmin, Strava, and TrainingPeaks compatible activity XML files
 * with per-repetition trackpoints, calculated power output (Watts), and cadence.
 */
import { SavedWorkoutSession } from '../components/export/SessionHistoryModal';

export function generateTcxXml(session: SavedWorkoutSession): string {
  const sessionStartMs = new Date(session.timestamp).getTime();
  const startTimeIso = new Date(session.timestamp).toISOString();
  const totalDurationMs = session.reps.reduce((acc, r) => acc + (r.durationMs || 2500), 0) || (session.totalReps * 2500);
  const totalSeconds = Math.max(1, Math.round(totalDurationMs / 1000));
  const caloriesBurned = Math.round(session.totalReps * 4.2);

  // Compute average cadence (reps per minute)
  const avgCadenceRpm = totalSeconds > 0
    ? Math.round((session.totalReps / (totalSeconds / 60)))
    : 20;

  // Trackpoints for each completed repetition
  const trackpointsXml = session.reps.map((rep, idx) => {
    const repTime = new Date(sessionStartMs + idx * (rep.durationMs || 2500)).toISOString();
    // Estimate power output based on ROM and speed: P ~ 9.81 * (romScore/100) * 220
    const watts = Math.round(180 + (rep.romScore / 100) * 120);

    return `        <Trackpoint>
          <Time>${repTime}</Time>
          <Cadence>${avgCadenceRpm}</Cadence>
          <Extensions>
            <TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
              <Watts>${watts}</Watts>
            </TPX>
          </Extensions>
        </Trackpoint>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="Other">
      <Id>${startTimeIso}</Id>
      <Lap StartTime="${startTimeIso}">
        <TotalTimeSeconds>${totalSeconds}</TotalTimeSeconds>
        <DistanceMeters>0</DistanceMeters>
        <Calories>${caloriesBurned}</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${trackpointsXml}
        </Track>
        <Notes>PoseCraft Biomechanical Movement Session: ${session.exerciseName}. Valid Reps: ${session.validReps}/${session.totalReps}. Avg ROM: ${session.averageRom}°.</Notes>
      </Lap>
      <Creator xsi:type="Device_t">
        <Name>PoseCraft Biomechanical Lab</Name>
        <UnitId>3301</UnitId>
        <ProductID>1</ProductID>
        <Version>
          <VersionMajor>1</VersionMajor>
          <VersionMinor>0</VersionMinor>
        </Version>
      </Creator>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
}

export function downloadTcxFile(session: SavedWorkoutSession): void {
  const xml = generateTcxXml(session);
  const blob = new Blob([xml], { type: 'application/vnd.garmin.tcx+xml' });
  const url = URL.createObjectURL(blob);
  const safeName = session.exerciseName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `posecraft_${safeName}_${session.id.slice(0, 8)}.tcx`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
