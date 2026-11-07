/**
 * Center of Mass (CoM) & Ground Reaction Force Projection Engine.
 * Calculates whole-body 2D Center of Mass using segmental Dempster/Winter anthropometric mass models.
 */
import { Landmark, LandmarkIndex, Point2D } from './types';

export interface CenterOfMassResult {
  com: Point2D;
  baseOfSupport: {
    heelCenter: Point2D;
    toeCenter: Point2D;
    midfootCenter: Point2D;
    supportWidth: number;
  };
  balanceOffsetNormalized: number; // -1.0 (excessive heel) to 0.0 (optimal midfoot) to +1.0 (excessive toe)
  balanceStatus: 'optimal' | 'heel_heavy' | 'toe_heavy';
}

export class CenterOfMassEngine {
  /**
   * Calculates Whole-Body Center of Mass using Dempster segmental percentages.
   */
  public calculateCoM(landmarks: Landmark[]): CenterOfMassResult | null {
    if (!landmarks || landmarks.length < 33) return null;

    // Helper for segment center
    const mid = (idxA: LandmarkIndex, idxB: LandmarkIndex): Point2D => ({
      x: (landmarks[idxA].x + landmarks[idxB].x) / 2,
      y: (landmarks[idxA].y + landmarks[idxB].y) / 2,
    });

    const l = landmarks;

    // 1. Head & Neck (~8.1% of body mass)
    const headX = (l[LandmarkIndex.NOSE].x + l[LandmarkIndex.LEFT_EAR].x + l[LandmarkIndex.RIGHT_EAR].x) / 3;
    const headY = (l[LandmarkIndex.NOSE].y + l[LandmarkIndex.LEFT_EAR].y + l[LandmarkIndex.RIGHT_EAR].y) / 3;

    // 2. Torso / Trunk (~49.7% of body mass) - midpoint between shoulder center and hip center
    const shoulderCenter = mid(LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER);
    const hipCenter = mid(LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP);
    const trunkX = (shoulderCenter.x + hipCenter.x) / 2;
    const trunkY = (shoulderCenter.y + hipCenter.y) / 2;

    // 3. Upper Arms (2 x 2.8% = 5.6%)
    const leftUpperArm = mid(LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW);
    const rightUpperArm = mid(LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW);

    // 4. Forearms & Hands (2 x 2.2% = 4.4%)
    const leftForearm = mid(LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST);
    const rightForearm = mid(LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST);

    // 5. Thighs (2 x 10.0% = 20.0%)
    const leftThigh = mid(LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE);
    const rightThigh = mid(LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE);

    // 6. Shanks & Feet (2 x 6.1% = 12.2%)
    const leftShank = mid(LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE);
    const rightShank = mid(LandmarkIndex.RIGHT_KNEE, LandmarkIndex.RIGHT_ANKLE);

    // Weighted average
    const comX =
      headX * 0.081 +
      trunkX * 0.497 +
      (leftUpperArm.x + rightUpperArm.x) * 0.028 +
      (leftForearm.x + rightForearm.x) * 0.022 +
      (leftThigh.x + rightThigh.x) * 0.100 +
      (leftShank.x + rightShank.x) * 0.061;

    const comY =
      headY * 0.081 +
      trunkY * 0.497 +
      (leftUpperArm.y + rightUpperArm.y) * 0.028 +
      (leftForearm.y + rightForearm.y) * 0.022 +
      (leftThigh.y + rightThigh.y) * 0.100 +
      (leftShank.y + rightShank.y) * 0.061;

    // Base of Support (BoS)
    const heelCenter = mid(LandmarkIndex.LEFT_HEEL, LandmarkIndex.RIGHT_HEEL);
    const toeCenter = mid(LandmarkIndex.LEFT_FOOT_INDEX, LandmarkIndex.RIGHT_FOOT_INDEX);
    const midfootCenter = {
      x: (heelCenter.x + toeCenter.x) / 2,
      y: (heelCenter.y + toeCenter.y) / 2,
    };

    const footLength = Math.max(0.04, Math.abs(toeCenter.x - heelCenter.x));
    const offset = (comX - midfootCenter.x) / footLength;
    const balanceOffsetNormalized = Math.max(-1.0, Math.min(1.0, offset));

    let balanceStatus: 'optimal' | 'heel_heavy' | 'toe_heavy' = 'optimal';
    if (balanceOffsetNormalized < -0.35) {
      balanceStatus = 'heel_heavy';
    } else if (balanceOffsetNormalized > 0.35) {
      balanceStatus = 'toe_heavy';
    }

    return {
      com: { x: comX, y: comY },
      baseOfSupport: {
        heelCenter,
        toeCenter,
        midfootCenter,
        supportWidth: Math.abs(l[LandmarkIndex.RIGHT_ANKLE].x - l[LandmarkIndex.LEFT_ANKLE].x),
      },
      balanceOffsetNormalized,
      balanceStatus,
    };
  }

  /**
   * Renders the CoM Crosshair and Vertical Ground Projection on Canvas.
   */
  public renderCoM(
    ctx: CanvasRenderingContext2D,
    result: CenterOfMassResult,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const x = result.com.x * canvasWidth;
    const y = result.com.y * canvasHeight;
    const groundY = result.baseOfSupport.midfootCenter.y * canvasHeight;

    ctx.save();

    // 1. Vertical Ground Projection Line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = result.balanceStatus === 'optimal'
      ? 'rgba(56, 189, 248, 0.75)'
      : 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Base of Support Foot Marker
    ctx.fillStyle = result.balanceStatus === 'optimal' ? '#38bdf8' : '#ef4444';
    ctx.beginPath();
    ctx.arc(x, groundY, 4.5, 0, 2 * Math.PI);
    ctx.fill();

    // 3. Center of Mass Reticle
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.stroke();

    // Reticle crosshair arms
    ctx.beginPath();
    ctx.moveTo(x - 11, y);
    ctx.lineTo(x + 11, y);
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x, y + 11);
    ctx.stroke();

    // CoM Label badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x + 10, y - 18, 48, 16);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.strokeRect(x + 10, y - 18, 48, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('CoM', x + 15, y - 6);

    ctx.restore();
  }
}

export const centerOfMassEngine = new CenterOfMassEngine();
