import { Mark } from './Primitives';

type Props = {
  progress: number;
};

export default function ElectricSpinnerMark({ progress }: Props) {
  const isResolved = progress >= 100;

  return (
    <div className={`electric-spinner-stage ${isResolved ? 'is-resolved' : 'is-charging'}`}>
      {/* Center PP Dev Icon - rendered underneath */}
      <div className="electric-core">
        <Mark className="electric-avatar" />
      </div>

      {/* GPU-composited 3D electric plasma rings - 100% compositor, zero SVG raster cost */}
      <div className="electric-rings-cluster" aria-hidden="true">
        <div className="electric-ring-orbit orbit-primary" />
        <div className="electric-ring-orbit orbit-secondary" />
        <div className="electric-ring-orbit orbit-tertiary" />
      </div>

      {/* Reticle / HUD lock accent */}
      <div className="electric-reticle" aria-hidden="true" />
    </div>
  );
}
