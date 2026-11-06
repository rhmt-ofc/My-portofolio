import React from 'react';

export type QuantumVariant = 'gold' | 'cyan' | 'amethyst' | 'emerald';
export type QuantumSize = 'xs' | 'sm' | 'md' | 'lg';

interface QuantumAtomProps {
  variant?: QuantumVariant;
  size?: QuantumSize;
  className?: string;
  label?: string;
  noHalo?: boolean;
}

/**
 * Luminous 3D Atomic Orbital Component inspired by @alterebro (abZzNRo)
 * Combines 3 intersecting elliptical electron orbits + pulsing nucleus + SVG compass halo.
 * Automatically adapts glow intensity and chromatic contrast between Dark & Light mode.
 */
export function QuantumAtom({
  variant = 'cyan',
  size = 'md',
  className = '',
  label,
  noHalo = false
}: QuantumAtomProps) {
  return (
    <div
      className={`quantum-atom-stage quantum-atom-${size} quantum-atom-${variant} ${className}`}
      aria-hidden="true"
    >
      {!noHalo && (
        <svg className="quantum-atom-halo" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="54" className="qa-compass-ring" />
          <circle cx="60" cy="60" r="44" className="qa-compass-inner" />
          <line x1="60" y1="0" x2="60" y2="10" className="qa-compass-tick" />
          <line x1="60" y1="110" x2="60" y2="120" className="qa-compass-tick" />
          <line x1="0" y1="60" x2="10" y2="60" className="qa-compass-tick" />
          <line x1="110" y1="60" x2="120" y2="60" className="qa-compass-tick" />
          <polygon points="60,3 63.5,6.5 60,10 56.5,6.5" className="qa-compass-diamond" />
          <polygon points="60,110 63.5,113.5 60,117 56.5,113.5" className="qa-compass-diamond" />
          <polygon points="3,60 6.5,56.5 10,60 6.5,63.5" className="qa-compass-diamond" />
          <polygon points="110,60 113.5,56.5 117,60 113.5,63.5" className="qa-compass-diamond" />
        </svg>
      )}
      <div className="alterebro-atom">
        <div className="electron" />
        <div className="electron-alpha" />
        <div className="electron-omega" />
      </div>
      <span className="alterebro-atom-shadow" />
      {label && <span className="quantum-atom-tag">{label}</span>}
    </div>
  );
}

interface RhombusWingsProps {
  variant?: QuantumVariant;
  index?: number;
  className?: string;
}

/**
 * Dual Counter-Rotating Rhombus (Belah Ketupat) Glass Wings + Corner HUD Reticles.
 * Left & right diamond assemblies spin in opposite directions (clockwise vs counter-clockwise)
 * and accelerate on card hover/touch or scroll.
 */
export function RhombusWings({
  variant = 'gold',
  index = 1,
  className = ''
}: RhombusWingsProps) {
  const code = `Q.${String(index).padStart(2, '0')}`;
  return (
    <div className={`rhombus-wings-hud rhombus-${variant} ${className}`} aria-hidden="true">
      {/* Left Counter-Rotating Diamond Wing */}
      <div className="rhombus-wing rhombus-wing-left">
        <svg className="rhombus-wing-svg" viewBox="0 0 36 88" fill="none">
          <line x1="18" y1="2" x2="18" y2="24" className="rw-conduit" />
          <line x1="14" y1="12" x2="22" y2="12" className="rw-tick" />
          {/* Outer Clockwise Rhombus */}
          <g className="rw-diamond-cw">
            <rect x="8" y="34" width="20" height="20" rx="1.5" transform="rotate(45 18 44)" className="rw-rhombus-outer" />
          </g>
          {/* Inner Counter-Clockwise Rhombus */}
          <g className="rw-diamond-ccw">
            <rect x="11.5" y="37.5" width="13" height="13" rx="1" transform="rotate(45 18 44)" className="rw-rhombus-inner" />
          </g>
          {/* Glowing Nucleus Core */}
          <circle cx="18" cy="44" r="2.4" className="rw-core-dot" />
          <line x1="18" y1="64" x2="18" y2="86" className="rw-conduit" />
          <line x1="14" y1="76" x2="22" y2="76" className="rw-tick" />
        </svg>
      </div>

      {/* Right Counter-Rotating Diamond Wing */}
      <div className="rhombus-wing rhombus-wing-right">
        <svg className="rhombus-wing-svg" viewBox="0 0 36 88" fill="none">
          <line x1="18" y1="2" x2="18" y2="24" className="rw-conduit" />
          <line x1="14" y1="12" x2="22" y2="12" className="rw-tick" />
          {/* Outer Counter-Clockwise Rhombus (opposite of left wing) */}
          <g className="rw-diamond-ccw">
            <rect x="8" y="34" width="20" height="20" rx="1.5" transform="rotate(45 18 44)" className="rw-rhombus-outer" />
          </g>
          {/* Inner Clockwise Rhombus */}
          <g className="rw-diamond-cw">
            <rect x="11.5" y="37.5" width="13" height="13" rx="1" transform="rotate(45 18 44)" className="rw-rhombus-inner" />
          </g>
          {/* Glowing Nucleus Core */}
          <circle cx="18" cy="44" r="2.4" className="rw-core-dot" />
          <line x1="18" y1="64" x2="18" y2="86" className="rw-conduit" />
          <line x1="14" y1="76" x2="22" y2="76" className="rw-tick" />
        </svg>
      </div>

      {/* 4 Glass Corner HUD Brackets & Micro Status Node */}
      <svg className="rhombus-corner-svg rc-tl" viewBox="0 0 18 18" fill="none">
        <path d="M1 13V2.5C1 1.67 1.67 1 2.5 1H13" className="rc-bracket" />
        <circle cx="4.5" cy="4.5" r="1.3" className="rc-dot" />
      </svg>
      <svg className="rhombus-corner-svg rc-tr" viewBox="0 0 18 18" fill="none">
        <path d="M17 13V2.5C17 1.67 16.33 1 15.5 1H5" className="rc-bracket" />
        <circle cx="13.5" cy="4.5" r="1.3" className="rc-dot" />
      </svg>
      <svg className="rhombus-corner-svg rc-bl" viewBox="0 0 18 18" fill="none">
        <path d="M1 5V15.5C1 16.33 1.67 17 2.5 17H13" className="rc-bracket" />
      </svg>
      <svg className="rhombus-corner-svg rc-br" viewBox="0 0 18 18" fill="none">
        <path d="M17 5V15.5C17 16.33 16.33 17 15.5 17H5" className="rc-bracket" />
      </svg>
      <span className="rhombus-hud-code">{code}</span>
    </div>
  );
}

/**
 * Miniature SVG Atomic Gyroscope for Chapter Badges & Section Headers
 */
export function MiniAtomGyro({ variant = 'gold' }: { variant?: QuantumVariant }) {
  return (
    <span className={`mini-atom-gyro mini-atom-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none" className="mini-atom-svg">
        <ellipse cx="14" cy="14" rx="11.5" ry="4.8" transform="rotate(30 14 14)" className="mag-orbit mag-orbit-1" />
        <ellipse cx="14" cy="14" rx="11.5" ry="4.8" transform="rotate(-30 14 14)" className="mag-orbit mag-orbit-2" />
        <ellipse cx="14" cy="14" rx="11.5" ry="4.8" transform="rotate(90 14 14)" className="mag-orbit mag-orbit-3" />
        <circle cx="14" cy="14" r="2.6" className="mag-nucleus" />
      </svg>
    </span>
  );
}

/**
 * Floating Quantum Cluster Banner — combines a luminous @alterebro Atom with
 * an interactive SVG orbital telemetry readout bar for key sections.
 */
export function QuantumClusterBadge({
  variant = 'cyan',
  title = 'QUANTUM ORBITAL CORE',
  subtitle = 'ACTIVE ATOMIC TELEMETRY',
  coords = 'SYS // ATOM.03'
}: {
  variant?: QuantumVariant;
  title?: string;
  subtitle?: string;
  coords?: string;
}) {
  return (
    <div className={`quantum-cluster-badge quantum-cluster-${variant}`} aria-hidden="true">
      <QuantumAtom variant={variant} size="sm" />
      <div className="qcb-meta">
        <div className="qcb-top">
          <span className="qcb-dot" />
          <span className="qcb-coords">{coords}</span>
        </div>
        <strong className="qcb-title">{title}</strong>
        <span className="qcb-sub">{subtitle}</span>
      </div>
      <div className="qcb-rhombus-pair">
        <svg viewBox="0 0 44 44" fill="none" className="qcb-rhombus-svg">
          <g className="rw-diamond-cw">
            <rect x="9" y="9" width="26" height="26" rx="2" transform="rotate(45 22 22)" className="rw-rhombus-outer" />
          </g>
          <g className="rw-diamond-ccw">
            <rect x="14" y="14" width="16" height="16" rx="1.5" transform="rotate(45 22 22)" className="rw-rhombus-inner" />
          </g>
          <circle cx="22" cy="22" r="2.8" className="rw-core-dot" />
        </svg>
      </div>
    </div>
  );
}
