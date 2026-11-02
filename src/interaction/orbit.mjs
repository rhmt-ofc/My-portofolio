/** Two well-spaced moving lanes plus one empty silver accent rail. */
export const ORBIT_LANES = [
  { count: 9, rx: .275, ry: .26, speed: .09, phase: .2, tilt: -.2 },
  { count: 14, rx: .495, ry: .475, speed: -.042, phase: .7, tilt: .18 },
  { count: 0, rx: .415, ry: .235, speed: .067, phase: .35, tilt: -.38 },
];
export function orbitPoint(lane, angle) {
  const x = Math.cos(angle) * lane.rx, y = Math.sin(angle) * lane.ry;
  const c = Math.cos(lane.tilt), s = Math.sin(lane.tilt);
  return { x: .5 + x * c - y * s, y: .5 + x * s + y * c, z: Math.sin(angle + .5) };
}
export function orbitLayout(time = 0, rotation = 0) {
  const points = [];
  ORBIT_LANES.forEach((lane, ring) => {
    for (let node = 0; node < lane.count; node++) {
      const angle = node / lane.count * Math.PI * 2 + lane.phase + time * lane.speed + rotation;
      points.push({ ...orbitPoint(lane, angle), ring, angle });
    }
  });
  return points;
}
export function orbitPath(lane) {
  return Array.from({length:97},(_,i)=>{ const p=orbitPoint(lane,i/96*Math.PI*2); return `${i?'L':'M'}${(p.x*1000).toFixed(2)},${(p.y*1000).toFixed(2)}`; }).join(' ')+' Z';
}
export function advanceOrbit(state, delta) {
  const dt=Math.max(0,Math.min(.08,delta));const decay=Math.exp(-5*dt);
  return {time:state.time+dt,rotation:state.rotation+state.momentum*(1-decay)/5,momentum:state.momentum*decay};
}
export function shouldAnimateOrbit({visible,hidden,paused,reduced,selected,interacting,blocked}) {
  return visible&&!hidden&&!paused&&!reduced&&!selected&&!interacting&&!blocked;
}
