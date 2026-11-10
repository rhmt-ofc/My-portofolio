import { useEffect, useRef, useState, useCallback } from 'react';

type BinaryPhotoProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'eager' | 'lazy';
  isActiveSlot?: boolean;
};

type Particle = {
  originX: number; // Target pixel coordinate on canvas
  originY: number;
  startX: number;  // Dispersed/shattered starting point
  startY: number;
  char: string;    // '0' or '1'
  color: string;   // Sampled image pixel color or matrix cyan/emerald
  alpha: number;
  delay: number;   // Stagger factor
  speed: number;   // Interpolation speed
};

export default function BinaryPhoto({
  src,
  alt,
  width,
  height,
  fetchPriority = 'auto',
  loading = 'lazy',
  isActiveSlot = true
}: BinaryPhotoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [assembled, setAssembled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const progressRef = useRef<number>(0); // 0 = shattered, 1 = fully assembled
  const targetProgressRef = useRef<number>(0);
  const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize particles from image data
  const buildParticles = useCallback((img: HTMLImageElement, w: number, h: number) => {
    // Hidden offscreen canvas to sample colors
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    if (!ctx) return [];

    // Calculate aspect ratio / cover alignment like .portrait-original img
    // .portrait-original img styling: position:absolute; width:282%; height:auto; left:-176%; top:-28%;
    // We sample the visual frame that matches the container display
    ctx.drawImage(img, 0, 0, w, h);
    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, w, h);
    } catch {
      return [];
    }

    const data = imgData.data;
    const particles: Particle[] = [];
    const step = 8; // Grid spacing for binary glyphs (approx 8px step)
    const centerX = w / 2;
    const centerY = h / 2;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3] / 255;

        // Skip completely transparent pixels
        if (a < 0.15) continue;

        // Angle and burst distance for shattered state
        const angle = Math.atan2(y - centerY, x - centerX) + (Math.random() - 0.5) * 1.2;
        const burstDist = 60 + Math.random() * 140;
        const startX = x + Math.cos(angle) * burstDist;
        const startY = y + Math.sin(angle) * burstDist;

        // Binary glyph selection
        const char = Math.random() > 0.5 ? '1' : '0';

        particles.push({
          originX: x,
          originY: y,
          startX,
          startY,
          char,
          color: `rgba(${r},${g},${b},${a.toFixed(2)})`,
          alpha: a,
          delay: Math.random() * 0.35,
          speed: 0.045 + Math.random() * 0.035
        });
      }
    }
    return particles;
  }, []);

  useEffect(() => {
    if (isReduced) {
      setAssembled(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Load image for sampling
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    let destroyed = false;

    img.onload = () => {
      if (destroyed) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width || 250);
      const h = Math.round(rect.height || 360);

      canvas.width = w * dpr;
      canvas.height = h * dpr;

      const particles = buildParticles(img, canvas.width, canvas.height);
      particlesRef.current = particles;

      // Start in shattered state (0), target assembled (1)
      progressRef.current = 0;
      targetProgressRef.current = 1;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
        if (destroyed) return;

        // Smoothly interpolate progress toward target
        const diff = targetProgressRef.current - progressRef.current;
        if (Math.abs(diff) > 0.002) {
          progressRef.current += diff * 0.08;
        } else {
          progressRef.current = targetProgressRef.current;
        }

        const currentProg = progressRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render binary particles
        const fontSize = Math.max(9, Math.round(9 * (canvas.width / 250)));
        ctx.font = `600 ${fontSize}px "Space", "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const pLen = particles.length;
        for (let i = 0; i < pLen; i++) {
          const p = particles[i];

          // Compute individual particle eased progress with delay
          const t = Math.max(0, Math.min(1, (currentProg - p.delay) / (1 - p.delay + 0.0001)));
          // Quintic ease-out for snapping motion
          const ease = 1 - Math.pow(1 - t, 4);

          const curX = p.startX + (p.originX - p.startX) * ease;
          const curY = p.startY + (p.originY - p.startY) * ease;

          // While moving, glow matrix cyan/emerald; as it locks in, adopt actual image pixel color
          if (t < 0.85) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(52, 211, 153, 0.85)';
            ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
            ctx.shadowBlur = 4;
          } else {
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 0;
          }

          ctx.fillText(p.char, curX, curY);
        }

        // When nearly 100% assembled, reveal the underlying razor-sharp photo and fade canvas
        if (currentProg >= 0.99 && !isHovered) {
          setAssembled(true);
        } else {
          setAssembled(false);
        }

        animFrameRef.current = requestAnimationFrame(render);
      };

      animFrameRef.current = requestAnimationFrame(render);
    };

    return () => {
      destroyed = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [src, isReduced, buildParticles, isHovered]);

  // Hover interaction: disperse back to shattered binary, then re-assemble
  const handleMouseEnter = () => {
    if (isReduced) return;
    setIsHovered(true);
    targetProgressRef.current = 0.15; // Shatter outwards
  };

  const handleMouseLeave = () => {
    if (isReduced) return;
    setIsHovered(false);
    targetProgressRef.current = 1.0; // Re-assemble into photo
  };

  return (
    <div
      ref={containerRef}
      className={`binary-photo-wrap ${assembled ? 'is-assembled' : 'is-synthesizing'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        fetchPriority={fetchPriority}
        loading={loading}
        className={`binary-real-img ${assembled ? 'visible' : 'hidden'}`}
      />
      <canvas
        ref={canvasRef}
        className={`binary-photo-canvas ${assembled && !isHovered ? 'canvas-fade' : ''}`}
        aria-hidden="true"
      />
      <div className="binary-photo-hud" aria-hidden="true">
        <span>{assembled && !isHovered ? 'RECONSTRUCTED · 100%' : 'BINARY ASSEMBLY'}</span>
      </div>
    </div>
  );
}
