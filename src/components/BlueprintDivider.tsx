import React from 'react';
import { QuantumAtom, type QuantumVariant } from './QuantumSvgAccents';

interface BlueprintDividerProps {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  coordinates?: string;
  className?: string;
}

const dividerVariants: Record<string, QuantumVariant> = {
  '02': 'cyan',
  '03': 'cyan',
  '04': 'cyan',
  '05': 'amethyst',
  '06': 'emerald',
  '07': 'emerald',
  '08': 'gold',
  '09': 'gold',
  '10': 'cyan'
};

export function BlueprintDivider({
  from,
  to,
  fromLabel,
  toLabel,
  coordinates = 'SYS.TRACE // ARCHIVE_COORD',
  className = ''
}: BlueprintDividerProps) {
  const atomVariant = dividerVariants[to] || 'cyan';
  return (
    <div className={`blueprint-divider ${className}`} aria-hidden="true" data-from={from} data-to={to}>
      <div className="blueprint-meta">
        <div className="blueprint-node-tag">
          <span className="bp-num">{from}</span>
          <span className="bp-name">{fromLabel}</span>
        </div>
        <div className="blueprint-status">
          <span className="bp-pulse-dot" />
          <span className="bp-coord">{coordinates}</span>
        </div>
        <div className="blueprint-node-tag blueprint-target">
          <span className="bp-num">{to}</span>
          <span className="bp-name">{toLabel}</span>
        </div>
      </div>
      <div className="blueprint-line-wrap">
        <svg
          className="blueprint-svg"
          viewBox="0 0 1200 32"
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Base structural track */}
          <line x1="0" y1="16" x2="1200" y2="16" className="bp-track" />
          {/* Laser beam with animation */}
          <line x1="0" y1="16" x2="1200" y2="16" className="bp-beam" />
          {/* Technical engineering ticks */}
          <line x1="60" y1="10" x2="60" y2="22" className="bp-tick" />
          <line x1="120" y1="13" x2="120" y2="19" className="bp-subtick" />
          <line x1="180" y1="13" x2="180" y2="19" className="bp-subtick" />
          <line x1="240" y1="13" x2="240" y2="19" className="bp-subtick" />
          <line x1="300" y1="10" x2="300" y2="22" className="bp-tick" />
          <line x1="450" y1="13" x2="450" y2="19" className="bp-subtick" />
          <line x1="600" y1="8" x2="600" y2="24" className="bp-center-marker" />
          <line x1="750" y1="13" x2="750" y2="19" className="bp-subtick" />
          <line x1="900" y1="10" x2="900" y2="22" className="bp-tick" />
          <line x1="960" y1="13" x2="960" y2="19" className="bp-subtick" />
          <line x1="1020" y1="13" x2="1020" y2="19" className="bp-subtick" />
          <line x1="1080" y1="13" x2="1080" y2="19" className="bp-subtick" />
          <line x1="1140" y1="10" x2="1140" y2="22" className="bp-tick" />
          {/* Diamond Reticle at Center */}
          <polygon points="600,11 605,16 600,21 595,16" className="bp-reticle" />
          {/* Micro Crosshairs */}
          <path d="M 50 16 L 70 16 M 60 6 L 60 26" className="bp-cross" />
          <path d="M 1130 16 L 1150 16 M 1140 6 L 1140 26" className="bp-cross" />
        </svg>
        <div className="bp-atom-center">
          <QuantumAtom variant={atomVariant} size="xs" noHalo />
        </div>
      </div>
      <div className="blueprint-reticles">
        <span className="bp-corner bp-tl">+</span>
        <span className="bp-corner bp-tr">+</span>
      </div>
    </div>
  );
}
export default BlueprintDivider;
