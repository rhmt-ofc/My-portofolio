import { Mark } from './Primitives';

type Props = {
  progress: number;
};

export default function ElectricSpinnerMark({ progress }: Props) {
  const isResolved = progress >= 100;

  return (
    <div className={`electric-spinner-stage ${isResolved ? 'is-resolved' : 'is-charging'}`}>
      {/* SVG Gooey Filter definitions - lightweight, strictly bounded */}
      <svg className="electric-filter-def" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="electricGooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 18 -8"
              result="gooey"
            />
            <feBlend in="SourceGraphic" in2="gooey" />
          </filter>
        </defs>
      </svg>

      {/* GPU-composited 3D electric gooey rings */}
      <div className="electric-rings-cluster" aria-hidden="true">
        <div className="electric-ring-orbit orbit-primary" />
        <div className="electric-ring-orbit orbit-secondary" />
        <div className="electric-ring-orbit orbit-tertiary" />
      </div>

      {/* Center PP Dev Icon */}
      <div className="electric-core">
        <Mark className="electric-avatar" />
      </div>

      {/* Reticle / HUD lock accent */}
      <div className="electric-reticle" aria-hidden="true" />
    </div>
  );
}
