import { useEffect, useRef, useState, useCallback } from 'react';

type Props = {
  progress: number;
};

type Particle = {
  // Target position on canvas
  targetX: number;
  targetY: number;
  // Shattered/scattered starting position
  startX: number;
  startY: number;
  char: string;
  // Sampled image pixel color
  color: string;
  delay: number; // Stagger factor (0..0.4)
};

export default function BinaryDevMark({ progress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const buildParticles = useCallback((img: HTMLImageElement, size: number) => {
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d');
    if (!ctx) return [];

    // Draw circular image into offscreen canvas
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, size, size);
    ctx.restore();

    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, size, size);
    } catch {
      return [];
    }

    const data = imgData.data;
    const particles: Particle[] = [];
    const step = 6; // Grid density (6px per binary digit for crisp representation in 78px circle)
    const centerX = size / 2;
    const centerY = size / 2;
    const radiusSq = (size / 2) * (size / 2);

    for (let y = step / 2; y < size; y += step) {
      for (let x = step / 2; x < size; x += step) {
        const dx = x - centerX;
        const dy = y - centerY;
        // Keep strictly inside circular bounds
        if (dx * dx + dy * dy > radiusSq - 4) continue;

        const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
        const a = data[idx + 3] / 255;
        if (a < 0.2) continue;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Dispersed scattered angle and distance
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
        const dist = 40 + Math.random() * 75; // Fly out beyond the 78px circle
        const startX = centerX + Math.cos(angle) * dist;
        const startY = centerY + Math.sin(angle) * dist;

        particles.push({
          targetX: x,
          targetY: y,
          startX,
          startY,
          char: Math.random() > 0.5 ? '1' : '0',
          color: `rgba(${r},${g},${b},${a.toFixed(2)})`,
          delay: Math.random() * 0.35
        });
      }
    }
    return particles;
  }, []);

  // Pre-sample image particles
  useEffect(() => {
    if (isReduced) {
      setImgLoaded(true);
      return;
    }

    const img = new Image();
    img.src = '/images/pp-dev-icon.webp';
    img.onload = () => {
      const size = 156; // 78px * 2 (Retina 2x DPR)
      const particles = buildParticles(img, size);
      particlesRef.current = particles;
      setImgLoaded(true);
    };
  }, [isReduced, buildParticles]);

  // Render on canvas driven directly by progress (1% -> 100%)
  useEffect(() => {
    if (isReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // When 100% complete, fade canvas out so real sharp image shows
    if (progress >= 100) return;

    const particles = particlesRef.current;
    if (particles.length === 0) return;

    const normalizedProgress = Math.max(0, Math.min(1, progress / 100));

    // Dynamic text size
    ctx.font = '600 7px "Space", "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isLight = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Eased progress per particle with staggered delay
      const t = Math.max(0, Math.min(1, (normalizedProgress - p.delay) / (1 - p.delay + 0.0001)));
      // Quintic ease out: snappy assembly
      const ease = 1 - Math.pow(1 - t, 3.5);

      const curX = p.startX + (p.targetX - p.startX) * ease;
      const curY = p.startY + (p.targetY - p.startY) * ease;

      // Theme-aligned palette:
      // While dispersed: muted warm platinum/gold or steel accent
      // As they assemble (> 70% ease): gradually adopt real pixel color
      if (ease < 0.75) {
        if (i % 3 === 0) {
          ctx.fillStyle = isLight ? '#b45309' : '#d8bb92'; // Theme Gold / Bronze
        } else if (i % 3 === 1) {
          ctx.fillStyle = isLight ? '#1e293b' : '#f1f3f6'; // Clean Ink White / Slate
        } else {
          ctx.fillStyle = isLight ? '#64748b' : '#8390a1'; // Muted Quiet Silver
        }
        ctx.shadowColor = isLight ? 'rgba(180, 83, 9, 0.2)' : 'rgba(216, 187, 146, 0.4)';
        ctx.shadowBlur = 3;
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 0;
      }

      ctx.fillText(p.char, curX, curY);
    }
  }, [progress, isReduced, imgLoaded]);

  return (
    <div className={`binary-devmark-wrap ${progress >= 100 ? 'is-assembled' : 'is-synthesizing'}`}>
      <img
        src="/images/pp-dev-icon.webp"
        width="78"
        height="78"
        className={`identity-mark binary-devmark-img ${progress >= 100 ? 'visible' : 'hidden'}`}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
      />
      <canvas
        ref={canvasRef}
        width={156}
        height={156}
        className={`binary-devmark-canvas ${progress >= 100 ? 'hidden' : 'visible'}`}
        aria-hidden="true"
      />
      <div className="binary-devmark-ring" aria-hidden="true" />
    </div>
  );
}
