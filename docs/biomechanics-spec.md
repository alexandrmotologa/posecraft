# Biomechanical Verification Specifications

This document defines the mathematical foundations and biomechanical thresholds implemented across PoseCraft exercise modules.

## Mathematical Formulations

### 1. Vector Joint Angle Calculation
Given three landmarks $A$, $B$, and $C$, where $B$ represents the joint vertex (for example, Shoulder $A$, Elbow $B$, and Wrist $C$):

$$\mathbf{u} = A - B = (x_A - x_B, y_A - y_B)$$
$$\mathbf{v} = C - B = (x_C - x_B, y_C - y_B)$$
$$\theta = \arccos\left(\frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}\right) \times \frac{180^\circ}{\pi}$$

In three-dimensional space, the z-coordinate is factored into the Euclidean norm:
$$\|\mathbf{u}\| = \sqrt{(x_A - x_B)^2 + (y_A - y_B)^2 + (z_A - z_B)^2}$$

### 2. Anatomical Scale Normalization
To decouple measurement from camera distance, optical zoom, and subject body height, all linear displacements are divided by the subject torso length $L_{\text{torso}}$:

$$M_{\text{shoulder}} = \frac{S_L + S_R}{2}$$
$$M_{\text{hip}} = \frac{H_L + H_R}{2}$$
$$L_{\text{torso}} = \|M_{\text{shoulder}} - M_{\text{hip}}\|$$

A vertical chin clearance $y_{\text{chin}}$ over a pull-up bar $y_{\text{bar}}$ is evaluated as:
$$\text{Clearance}_{\text{norm}} = \frac{y_{\text{bar}} - y_{\text{chin}}}{L_{\text{torso}}}$$

### 3. Spinal Curvature and Neutrality
Spinal alignment is assessed using three spinal landmarks: cervical vertebra base (neck midpoint), mid-thoracic point, and sacrum (hip midpoint).

Let $\mathbf{s}_1$ be the upper spine segment vector and $\mathbf{s}_2$ be the lower spine segment vector:
$$\Delta\theta_{\text{spine}} = |180^\circ - \text{Angle}(\mathbf{s}_1, \mathbf{s}_2)|$$

Classification brackets:
- Safe (Neutral): $\Delta\theta_{\text{spine}} < 12^\circ$
- Warning (Mild Flexion): $12^\circ \le \Delta\theta_{\text{spine}} \le 22^\circ$
- Critical Hazard (Severe Lumbar Rounding): $\Delta\theta_{\text{spine}} > 22^\circ$

### 4. Frontal Plane Knee Valgus
During bilateral and unilateral squatting movements, medial knee displacement relative to the hip-ankle axis indicates knee valgus collapse:

$$\text{ValgusIndex} = \frac{x_{\text{knee}} - x_{\text{ankle}}}{x_{\text{hip}} - x_{\text{ankle}}}$$

When $\text{ValgusIndex} < 0.82$, an internal collapse alert is dispatched.

### 5. Vertical Jump Height via Flight Time
For countermovement jumps (CMJ), jump height $h$ is derived from airborne duration $t_{\text{air}}$ (elapsed seconds from toe takeoff to ground contact):

$$h = \frac{1}{8} g \cdot t_{\text{air}}^2 = \frac{9.80665}{8} \cdot t_{\text{air}}^2 \approx 1.2258 \cdot t_{\text{air}}^2 \text{ (meters)}$$

This kinematic formula assumes equal takeoff and landing center-of-mass positions.

### 6. Craniovertebral Angle (CVA) for Posture Screening
The Craniovertebral Angle assesses forward head posture:
- Vertex: C7 vertebra (cervical spine base)
- Line 1: Horizontal reference vector through C7
- Line 2: Vector from C7 to the tragus of the ear

Normal alignment measures $50^\circ$ to $55^\circ$. Angles under $48^\circ$ indicate forward head posture (tech neck).
