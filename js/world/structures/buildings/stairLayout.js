/**
 * Layout da escada de incêndio: patamares em U além dos lances,
 * para o player virar 180° sem os colliders do pad cobrirem o zigue-zague.
 */
export const STAIR_W = 3.2;
export const STAIR_X_FROM_EDGE = 1.4;
export const LANDING_EXTRA_W = 0.8;
export const FLIGHT_GAP = 0.4;
export const STEP_INSET = 0.4;
export const LANDING_LIP = 0.5;
export const LANDING_OVERSHOOT = 4.0;
export const STEPS_PER_FLIGHT = 10;
export const STEP_THICK = 0.35;
export const STEP_Z_OVERLAP = 0.15;
export const MAX_SPAN_Z = 12.0;
export const RAIL_THICK = 0.3;
export const RAIL_H = 1.0;
export const BACK_WALL_H = 1.2;

export function fireEscapeLayout({ width, depth, height }) {
  const innerX = width / 2 + STAIR_X_FROM_EDGE;
  const outerX = innerX + STAIR_W + FLIGHT_GAP;
  const numFlights = Math.max(1, Math.ceil(height / 3.5));
  const flightH = height / numFlights;
  const spanZ = Math.min(depth * 0.75, MAX_SPAN_Z);
  const landingW = (outerX + STAIR_W / 2) - (innerX - STAIR_W / 2);
  const flightTravel = spanZ - 2 * STEP_INSET;
  const stepRun = flightTravel / (STEPS_PER_FLIGHT - 1);
  const stepHalfZ = stepRun / 2 + STEP_Z_OVERLAP / 2;
  const stepRise = flightH / STEPS_PER_FLIGHT;

  const landings = [];
  for (let f = 0; f <= numFlights; f++) {
    const dirZ = (f % 2 === 0) ? 1 : -1;
    const meetZ = dirZ * (spanZ / 2 - STEP_INSET);
    const outerZ = dirZ * (spanZ / 2 + LANDING_OVERSHOOT);
    const innerZ = meetZ - dirZ * LANDING_LIP;
    landings.push({
      f,
      y: f * flightH,
      dirZ,
      meetZ,
      innerZ,
      outerZ,
      minZ: Math.min(innerZ, outerZ),
      maxZ: Math.max(innerZ, outerZ),
      minX: innerX - STAIR_W / 2,
      maxX: outerX + STAIR_W / 2,
      hasBackWall: f > 0
    });
  }

  const flights = [];
  for (let f = 0; f < numFlights; f++) {
    const dirZ = (f % 2 === 0) ? 1 : -1;
    const cx = (f % 2 === 0) ? innerX : outerX;
    const startZ = dirZ * (spanZ / 2 - STEP_INSET);
    const steps = [];
    for (let s = 0; s < STEPS_PER_FLIGHT; s++) {
      const stepZ = startZ - dirZ * s * stepRun;
      const stepY = f * flightH + s * stepRise;
      steps.push({
        s,
        x: cx,
        z: stepZ,
        y: stepY,
        minZ: stepZ - stepHalfZ,
        maxZ: stepZ + stepHalfZ,
        minX: cx - STAIR_W / 2,
        maxX: cx + STAIR_W / 2
      });
    }
    flights.push({ f, dirZ, cx, startZ, steps, stepRun, stepHalfZ });
  }

  return {
    stairX: innerX,
    innerX,
    outerX,
    stairW: STAIR_W,
    landingW,
    spanZ,
    numFlights,
    flightH,
    stepRun,
    stepHalfZ,
    stepRise,
    landings,
    flights
  };
}
