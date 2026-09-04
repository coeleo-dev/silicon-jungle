/**
 * Shadow flag de InstancedMesh: arbustos só projetam se quality.bushCastShadow.
 */
export function instanceShouldCastShadow(castShadow, isBush, bushCastShadow) {
  return !!castShadow && (!isBush || !!bushCastShadow);
}
