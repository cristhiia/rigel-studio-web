// Preferencia del sistema "reducir movimiento". Se lee una vez por montaje:
// los efectos que la consultan se reinician en cada navegación.
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
