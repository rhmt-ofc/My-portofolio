const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
/** Reversible poses from native document scroll; never integrates velocity or accumulates drift. */
export function scrollScenePose(top, height, viewport, scroll, width = 1200) {
  const progress = clamp((scroll + viewport - top) / Math.max(1, viewport + height));
  const entering = 1 - smooth(progress / .46);
  const leaving = smooth((progress - .60) / .40);
  const balance = entering - leaving;
  const spread = Math.sin(progress * Math.PI) ** 2;
  const narrow = width <= 600;
  return {
    progress, balance, spread,
    lift: balance * (narrow ? 18 : 36),
    drift: balance * (narrow ? 8 : 22),
    turn: balance * (narrow ? 3 : 7),
    yaw: balance * (narrow ? 10 : 20),
    fan: balance * (narrow ? 4 : 11),
    gap: spread * (narrow ? 14 : 26)
  };
}
